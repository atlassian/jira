import {BlockedIpError, GithubClientError, GithubClientTimeoutError, RateLimitingError} from "./errors";
import Logger from "bunyan";
import statsd from "../../config/statsd";
import { metricError } from "../../config/metric-names";
import { AxiosResponse } from "axios";
import { extractPath } from "../../jira/client/axios";

const RESPONSE_TIME_HISTOGRAM_BUCKETS = "100_1000_2000_3000_5000_10000_30000_60000";

/**
 * Enrich the config object to include the time that the request started.
 *
 * @param {import("axios").AxiosRequestConfig} config - The Axios request configuration object.
 * @returns {import("axios").AxiosRequestConfig} The enriched config object.
 */
export const setRequestStartTime = (config) => {
	config.requestStartTime = new Date();
	return config;
};

//TODO Move to util/axios/common-middleware.ts and use with Jira Client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendResponseMetrics = (metricName: string, response?: any, status?: string | number) => {
	status = `${status || response?.status}`;
	const requestDurationMs = Number(
		Date.now() - (response?.config?.requestStartTime || 0)
	);

	// using client tag to separate GH client from Octokit
	const tags = {
		client: "axios",
		method: response?.config?.method?.toUpperCase(),
		path: extractPath(response?.config?.originalUrl),
		status: status
	};

	statsd.histogram(metricName, requestDurationMs, tags);
	tags["gsd_histogram"] = RESPONSE_TIME_HISTOGRAM_BUCKETS;
	statsd.histogram(metricName, requestDurationMs, tags);
	return response;
};


export const instrumentRequest = (metricName) =>
	(response) => {
		if (!response) {
			return;
		}
		return sendResponseMetrics(metricName, response);
	};

/**
 * Submit statsd metrics on failed requests.
 *
 * @param {import("axios").AxiosError} error - The Axios error response object.
 * @param metricName - Name for the response metric
 * @returns {Promise<Error>} a rejected promise with the error inside.
 */
export const instrumentFailedRequest = (metricName) =>
	(error) => {
		if (error instanceof RateLimitingError) {
			sendResponseMetrics(metricName, error.cause?.response, "rateLimiting");
		} else if (error instanceof BlockedIpError) {
			sendResponseMetrics(metricName, error.cause?.response, "blockedIp");
			statsd.increment(metricError.blockedByGitHubAllowlist);
		} else if (error instanceof GithubClientTimeoutError) {
			sendResponseMetrics(metricName, error.cause?.response, "timeout");
		} else if (error instanceof GithubClientError) {
			sendResponseMetrics(metricName, error.cause?.response);
		} else {
			sendResponseMetrics(metricName, error.response);
		}
		return Promise.reject(error);
	};


export const handleFailedRequest = (logger: Logger) =>
	(error) => {
		const response = error.response as AxiosResponse;

		if (response?.status === 408 || error.code === "ECONNABORTED") {
			logger.warn({ err: error }, "Request timed out");
			return Promise.reject(new GithubClientTimeoutError(error));
		}

		if (response) {
			const status = response?.status;
			const errorMessage = `Error executing Axios Request ` + error.message;

			const rateLimitRemainingHeaderValue: string = response.headers?.["x-ratelimit-remaining"];
			if (status === 403 && rateLimitRemainingHeaderValue == "0") {
				logger.warn({ err: error }, "Rate limiting error");
				return Promise.reject(new RateLimitingError(response, error));
			}

			if (status === 403 && response.data?.message?.includes("has an IP allow list enabled")) {
				logger.warn({ err: error }, "Blocked by GitHub allowlist");
				return Promise.reject(new BlockedIpError(error, status));
			}

			const isWarning = status && (status >= 300 && status < 500 && status !== 400);

			isWarning ? logger.warn(errorMessage) : logger.error({ err: error }, errorMessage);
			return Promise.reject(new GithubClientError(errorMessage, status, error));
		}

		return Promise.reject(error);
	};

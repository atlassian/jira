import Logger from "bunyan";
import { Octokit } from "@octokit/rest";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { handleFailedRequest, instrumentFailedRequest, instrumentRequest, setRequestStartTime, setRequestTimeout } from "./github-client-interceptors";
import { metricHttpRequest } from "config/metric-names";
import { getLogger } from "config/logger";
import { urlParamsMiddleware } from "utils/axios/url-params-middleware";
import {
	GITHUB_ENTERPRISE_CLOUD_ACCEPT_HEADER,
	GITHUB_ENTERPRISE_CLOUD_API_BASEURL,
	GitHubClientConfig
} from "utils/check-github-app-type";

/**
 * A GitHub client that supports authentication as a GitHub User.
 */
export class GitHubUserClient {
	private readonly axios: AxiosInstance;
	private readonly userToken: string;
	private readonly logger: Logger;
	private readonly gitHubEnterprise: GitHubClientConfig | undefined;

	constructor(userToken: string, logger: Logger = getLogger("github.user.client"), gitHubEnterprise?: GitHubClientConfig) {
		this.userToken = userToken;
		this.logger = logger;
		this.gitHubEnterprise = gitHubEnterprise;

		this.axios = axios.create({
			baseURL: this.gitHubEnterprise?.apiBaseUrl || GITHUB_ENTERPRISE_CLOUD_API_BASEURL,
			transitional: {
				clarifyTimeoutError: true
			}
		});

		this.axios.interceptors.request.use((config: AxiosRequestConfig) => {
			return {
				...config,
				headers: {
					...config.headers,
					Accept: this.gitHubEnterprise?.acceptHeader || GITHUB_ENTERPRISE_CLOUD_ACCEPT_HEADER,
					Authorization: `token ${this.userToken}`
				}
			};
		});
		this.axios.interceptors.request.use(setRequestStartTime);
		this.axios.interceptors.request.use(setRequestTimeout);
		this.axios.interceptors.request.use(urlParamsMiddleware);

		this.axios.interceptors.response.use(
			undefined,
			handleFailedRequest(this.logger)
		);

		this.axios.interceptors.response.use(
			instrumentRequest(metricHttpRequest.github),
			instrumentFailedRequest(metricHttpRequest.github)
		);
	}

	public async getUser(): Promise<AxiosResponse<Octokit.UsersGetAuthenticatedResponse>> {
		return await this.get<Octokit.UsersGetAuthenticatedResponse>("/user");
	}

	public getMembershipForOrg = async (org: string): Promise<AxiosResponse<Octokit.OrgsGetMembershipResponse>> => {
		return await this.get<Octokit.OrgsGetMembershipResponse>(`/user/memberships/orgs/{org}`, {
			urlParams: {
				org
			}
		});
	};

	public async getInstallations(): Promise<AxiosResponse<Octokit.AppsListInstallationsForAuthenticatedUserResponse>> {
		return await this.get<Octokit.AppsListInstallationsForAuthenticatedUserResponse>("/user/installations");
	}

	private async get<T>(url, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return this.axios.get<T>(url, config);
	}
}

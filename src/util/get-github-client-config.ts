import { GitHubServerApp } from "models/github-server-app";
import { GitHubInstallationClient } from "../github/client/github-installation-client";
import { getInstallationId } from "../github/client/installation-id";
import { stringFlag, StringFlags } from "config/feature-flags";
import { GitHubUserClient } from "../github/client/github-user-client";
import Logger from "bunyan";
import { GitHubAppClient } from "../github/client/github-app-client";
import { envVars } from "~/src/config/env";
import { keyLocator } from "~/src/github/client/key-locator";
import { GitHubClientApiKeyConfig, GitHubConfig, Metrics } from "~/src/github/client/github-client";
import { GitHubAnonymousClient } from "~/src/github/client/github-anonymous-client";
import { EncryptionClient } from "utils/encryption-client";
import { GITHUB_CLOUD_API_BASEURL, GITHUB_CLOUD_BASEURL, GITHUB_CLOUD_HOSTNAME } from "~/src/github/client/github-client-constants";

interface GitHubClientConfig extends GitHubConfig {
	serverId?: number;
	appId: number;
	privateKey: string;
	gitHubClientId: string;
	gitHubClientSecret: string;
}

// TODO: will go away when we remove GHE_API_KEY flag
const calculateApiKeyConfig = async (jiraHost: string, logger: Logger, apiKeyConfig?: GitHubClientApiKeyConfig): Promise<{ apiKeyConfig: GitHubClientApiKeyConfig } | undefined> => {
	if (apiKeyConfig) {
		return Promise.resolve({
			apiKeyConfig
		});
	}

	try {
		const maybeApiKey = await stringFlag(StringFlags.GHE_API_KEY, "", jiraHost);
		if (maybeApiKey) {
			logger.info("Encrypted API key found");
			const [headerName, headerEncryptedValue] = JSON.parse(maybeApiKey) as Array<string>;
			return Promise.resolve({
				apiKeyConfig: {
					headerName,
					apiKeyGenerator: () =>
						EncryptionClient.decrypt(headerEncryptedValue, {
							jiraHost
						})
				}
			});
		}
	} catch (err) {
		logger.error({ err }, "Cannot calculate API key");
	}
	return undefined;
};

const buildGitHubServerConfig = async (githubServerBaseUrl: string, jiraHost: string, logger: Logger, apiKeyConfig?: GitHubClientApiKeyConfig): Promise<GitHubConfig> => {
	return {
		hostname: githubServerBaseUrl,
		baseUrl: githubServerBaseUrl,
		apiUrl: `${githubServerBaseUrl}/api/v3`,
		graphqlUrl: `${githubServerBaseUrl}/api/graphql`,
		proxyBaseUrl: envVars.PROXY,
		... await calculateApiKeyConfig(jiraHost, logger, apiKeyConfig)
	};
};

const buildGitHubCloudConfig = async (): Promise<GitHubConfig> => {
	return {
		hostname: GITHUB_CLOUD_HOSTNAME,
		baseUrl: GITHUB_CLOUD_BASEURL,
		apiUrl: GITHUB_CLOUD_API_BASEURL,
		graphqlUrl: `${GITHUB_CLOUD_API_BASEURL}/graphql`,
		proxyBaseUrl: envVars.PROXY
	};
};

const buildGitHubClientServerConfig = async (gitHubServerApp: GitHubServerApp, jiraHost: string, logger: Logger): Promise<GitHubClientConfig> => (
	{
		...(
			await buildGitHubServerConfig(gitHubServerApp.gitHubBaseUrl, jiraHost, logger,
				gitHubServerApp.apiKeyHeaderName
					? {
						headerName: gitHubServerApp.apiKeyHeaderName,
						apiKeyGenerator: () => gitHubServerApp.getDecryptedApiKeyValue(jiraHost)
					}
					: undefined
			)
		),
		serverId: gitHubServerApp.id,
		appId: gitHubServerApp.appId,
		gitHubClientId: gitHubServerApp.gitHubClientId,
		gitHubClientSecret: await gitHubServerApp.getDecryptedGitHubClientSecret(jiraHost),
		privateKey: await gitHubServerApp.getDecryptedPrivateKey(jiraHost)
	}
);

const buildGitHubClientCloudConfig = async (jiraHost: string): Promise<GitHubClientConfig> => {
	const privateKey = await keyLocator(undefined, jiraHost);

	if (!privateKey) {
		throw new Error("Private key not found for github cloud");
	}
	return {
		...(await buildGitHubCloudConfig()),
		appId: parseInt(envVars.APP_ID),
		gitHubClientId: envVars.GITHUB_CLIENT_ID,
		gitHubClientSecret: envVars.GITHUB_CLIENT_SECRET,
		privateKey: privateKey
	};
};

// TODO: make private because it is only exported for testing (and must not be used in other places!)
export const getGitHubClientConfigFromAppId = async (gitHubAppId: number | undefined, logger: Logger, jiraHost: string): Promise<GitHubClientConfig> => {
	const gitHubServerApp = gitHubAppId && await GitHubServerApp.getForGitHubServerAppId(gitHubAppId);
	if (gitHubServerApp) {
		return buildGitHubClientServerConfig(gitHubServerApp, jiraHost, logger);
	}
	return buildGitHubClientCloudConfig(jiraHost);
};

/**
 * Factory function to create a GitHub client that authenticates as the installation of our GitHub app to
 * get all installation or get more info for the app
 */
export const createAppClient = async (logger: Logger, jiraHost: string, gitHubAppId: number | undefined, metrics: Metrics): Promise<GitHubAppClient> => {
	const gitHubClientConfig = await getGitHubClientConfigFromAppId(gitHubAppId, logger, jiraHost);
	return new GitHubAppClient(gitHubClientConfig, jiraHost, metrics, logger, gitHubClientConfig.appId.toString(), gitHubClientConfig.privateKey);
};

/**
 * Factory function to create a GitHub client that authenticates as the installation of our GitHub app to get
 * information specific to an organization.
 */
export const createInstallationClient = async (gitHubInstallationId: number, jiraHost: string, metrics: Metrics, logger: Logger, gitHubAppId: number | undefined): Promise<GitHubInstallationClient> => {
	const gitHubClientConfig = await getGitHubClientConfigFromAppId(gitHubAppId, logger, jiraHost);
	return new GitHubInstallationClient(getInstallationId(gitHubInstallationId, gitHubClientConfig.baseUrl, gitHubClientConfig.appId), gitHubClientConfig, jiraHost, metrics, logger, gitHubClientConfig.serverId);
};

/**
 * Factory function to create a GitHub client that authenticates as the user (with a user access token).
 */
export const createUserClient = async (githubToken: string, jiraHost: string, metrics: Metrics, logger: Logger, gitHubAppId: number | undefined): Promise<GitHubUserClient> => {
	const gitHubClientConfig = await getGitHubClientConfigFromAppId(gitHubAppId, logger, jiraHost);
	return new GitHubUserClient(githubToken, gitHubClientConfig, jiraHost, metrics, logger);
};

export const createAnonymousClient = async (
	gitHubBaseUrl: string,
	jiraHost: string,
	metrics: Metrics,
	logger: Logger,
	apiKeyConfig?: GitHubClientApiKeyConfig
): Promise<GitHubAnonymousClient> =>
	new GitHubAnonymousClient(await buildGitHubServerConfig(gitHubBaseUrl, jiraHost, logger, apiKeyConfig), jiraHost, metrics, logger);

export const createAnonymousClientByGitHubAppId = async (gitHubAppId: number | undefined, jiraHost: string, metrics: Metrics, logger: Logger): Promise<GitHubAnonymousClient> => {
	const config = await getGitHubClientConfigFromAppId(gitHubAppId, logger, jiraHost);
	return new GitHubAnonymousClient(config, jiraHost, metrics, logger);
};

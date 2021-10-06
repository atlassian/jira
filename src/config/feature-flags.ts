
import LaunchDarkly, { LDUser } from "launchdarkly-node-server-sdk";
import { getLogger } from "./logger";
import envVars from "./env";
import crypto from "crypto";

const logger = getLogger("feature-flags");

const launchdarklyClient = LaunchDarkly.init(envVars.LAUNCHDARKLY_KEY || "", {
	offline: !envVars.LAUNCHDARKLY_KEY,
	logger
});

export enum BooleanFlags {
	MAINTENANCE_MODE = "maintenance-mode",
	//Controls if we should check the token properly for APIs which are called from Jira Frontend. (Fixes the current state)
	FIX_IFRAME_ENDPOINTS_JWT = "fix-jwt-authentication-for-iframe-endpoints",
	//If enabled, we'll use asymmetrically signed jwt tokens for /install and /uninstall endpoints callbacks.
	USE_JWT_SIGNED_INSTALL_CALLBACKS = "use-jwt-signed-install-callbacks",
	PRIORITIZE_PUSHES = "prioritize-pushes",
	EXPOSE_QUEUE_METRICS = "expose-queue-metrics",
	PROCESS_PUSHES_IMMEDIATELY = "process-pushes-immediately",
	SIMPLER_PROCESSOR = "simpler-processor",
	CUSTOM_QUERIES_FOR_REPO_SYNC_STATE = "use-custom-queries-for-repo-sync-state",
	RETRY_WITHOUT_CHANGED_FILES = "retry-without-changed-files",
	WEBHOOK_RECEIVED_METRICS = "webhook-received-metrics",
	CONTINUE_SYNC_ON_ERROR = "continue-sync-on-error",
	NEW_GITHUB_CONFIG_PAGE = "new-github-config-page",
	NEW_GITHUB_ERROR_PAGE = "new-git-hub-error-page",
	NEW_CONNECT_AN_ORG_PAGE = "new-connect-an-org-page",
	PROPAGATE_REQUEST_ID = "propagate-request-id"
}

export enum StringFlags {
	BLOCKED_INSTALLATIONS = "blocked-installations"
}

const createLaunchdarklyUser = (jiraHost?: string): LDUser => {
	if (!jiraHost) {
		return {
			key: "global"
		};
	}

	const hash = crypto.createHash("sha1");
	hash.update(jiraHost);
	return {
		key: hash.digest("hex")
	};
};

const getLaunchDarklyValue = async (flag: BooleanFlags | StringFlags, defaultValue: boolean | string, jiraHost?: string): Promise<boolean | string> => {
	try {
		await launchdarklyClient.waitForInitialization();
		const user = createLaunchdarklyUser(jiraHost);
		return launchdarklyClient.variation(flag, user, defaultValue);
	} catch (err) {
		logger.error({ flag, err }, "Error resolving value for feature flag");
		return defaultValue;
	}
};

export const booleanFlag = async (flag: BooleanFlags, defaultValue: boolean, jiraHost?: string): Promise<boolean> =>
	Boolean(await getLaunchDarklyValue(flag, defaultValue, jiraHost));

export const stringFlag = async (flag: StringFlags, defaultValue: string, jiraHost?: string): Promise<string> =>
	String(await getLaunchDarklyValue(flag, defaultValue, jiraHost));

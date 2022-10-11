import { NextFunction, Request, Response } from "express";
import { Errors } from "config/errors";
import { Subscription } from "~/src/models/subscription";
import { GitHubServerApp } from "~/src/models/github-server-app";

export const GithubCreateBranchOptionsGet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

	const { jiraHost } = res.locals;
	const { issueKey } = req.query;
	const { githubToken } = req.session;

	if (!jiraHost) {
		return next(new Error(Errors.MISSING_JIRA_HOST));
	}

	if (!issueKey) {

		return next(new Error(Errors.MISSING_ISSUE_KEY));
	}

	const servers = await getGitHubServers(jiraHost);
	const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`);

	// Only GitHub cloud server connected
	if (githubToken && servers.hasCloudServer && servers.gheServerInfos.length == 0) {
		res.redirect(`/github/create-branch${url.search}`);
	}
	// Only single GitHub Enterprise connected
	if (githubToken && !servers.hasCloudServer && servers.gheServerInfos.length == 1) {
		res.redirect(`/github/${servers.gheServerInfos[0].uuid}/create-branch${url.search}`);
	}
	res.render("github-create-branch-options.hbs", {
		nonce: res.locals.nonce,
		servers,
		githubToken
	});

};

const getGitHubServers = async (jiraHost: string) => {
	const subscriptions = await Subscription.getAllForHost(jiraHost);
	const ghCloudSubscriptions = subscriptions.filter(subscription => !subscription.gitHubAppId);
	const gheServerSubscriptions = subscriptions.filter(subscription => subscription.gitHubAppId);

	const gheServerInfos = new Array<{ uuid: string, baseUrl: string, appName: string }>();
	for (const subscription of gheServerSubscriptions) {
		if (subscription.gitHubAppId) {
			const gitHubServerApp = await GitHubServerApp.getForGitHubServerAppId(subscription.gitHubAppId);
			if (gitHubServerApp) {
				gheServerInfos.push({
					"uuid": gitHubServerApp.uuid,
					"baseUrl": gitHubServerApp.gitHubBaseUrl,
					"appName": gitHubServerApp.gitHubAppName
				});
			}
		}
	}

	return {
		hasCloudServer: ghCloudSubscriptions.length,
		gheServerInfos
	};
};

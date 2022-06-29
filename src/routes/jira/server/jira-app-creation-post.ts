import e, { NextFunction, Request, Response } from "express";
import { GitHubServerApp } from "models/github-server-app";

export const JiraAppCreationPost = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<e.Response<number, Record<string, string>> | void> => {
	const { gheServerURL, installationId } = req.body;

	try {
		const gitHubServerApps = await GitHubServerApp.getAllForGitHubBaseUrl(gheServerURL, installationId);

		if (gitHubServerApps && gitHubServerApps?.length > 0) {
			req.log.info(`GitHub apps found for url: ${gheServerURL}. Redirecting to Jira list apps page.`);
			return res.status(200).send({ moduleKey: "github-list-apps-page" });
		} else {
			req.log.info(`No existing GitHub apps found for url: ${gheServerURL}. Redirecting to Jira app creation page.`);
			return res.status(200).send({ moduleKey: "github-app-creation-page" });
		}
	} catch (error) {
		return next(new Error(`Something went wrong when querying the GitHubServerApps: ${error}`));
	}
};

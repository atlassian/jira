import transformBranch from "../transforms/branch";
import issueKeyParser from "jira-issue-key-parser";
import { isEmpty } from "../jira/util/isEmpty";
import { calculateProcessingTimeInSeconds } from "../util/webhooks";
import { CustomContext } from "./middleware";

export const createBranch = async (context: CustomContext, jiraClient): Promise<void> => {
	const jiraPayload = await transformBranch(context);

	if (!jiraPayload) {
		context.log(
			{ noop: "no_jira_payload_create_branch" },
			"Halting further execution for createBranch since jiraPayload is empty"
		);
		return;
	}

	context.log(`Sending jira update for create branch event for hostname: ${jiraClient.baseURL}`)

	await jiraClient.devinfo.repository.update(jiraPayload);

	calculateProcessingTimeInSeconds(context.webhookReceived, context.name);
};

export const deleteBranch = async (context, jiraClient): Promise<void> => {
	const issueKeys = issueKeyParser().parse(context.payload.ref);

	if (isEmpty(issueKeys)) {
		context.log(
			{ noop: "no_issue_keys" },
			"Halting further execution for deleteBranch since issueKeys is empty"
		);
		return undefined;
	}

	context.log(`Deleting branch for repo ${context.payload.repository?.id} with ref ${context.payload.ref}`)

	const webhook = await jiraClient.devinfo.branch.delete(
		context.payload.repository?.id,
		context.payload.ref
	);

	calculateProcessingTimeInSeconds(context.webhookReceived, context.name, webhook?.status)
};

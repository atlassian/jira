import JiraClient from "../models/jira-client";
import { emitWebhookProcessingTimeMetrics } from "../util/webhooks";
import { CustomContext } from "./middleware";
import { booleanFlag, BooleanFlags } from "../config/feature-flags";

export default async (
	context: CustomContext,
	_: JiraClient,
	util
): Promise<void> => {
	const { comment } = context.payload;
	let linkifiedBody;

	try {
		linkifiedBody = await util.unfurl(comment.body);
		if (!linkifiedBody) {
			context.log.debug(
				{ noop: "no_linkified_body_issue_comment" },
				"Halting futher execution for issueComment since linkifiedBody is empty"
			);
			return;
		}
	} catch (err) {
		context.log.warn(
			{ err, linkifiedBody, body: comment.body },
			"Error while trying to find Jira keys in comment body"
		);
	}

	const editedComment = context.issue({
		body: linkifiedBody,
		comment_id: comment.id,
	});

	context.log(`Updating comment in GitHub with ID ${comment.id}`);

	const githubResponse = await context.github.issues.updateComment(
		editedComment
	);
	const { webhookReceived, name, log } = context;

	if (
		(await booleanFlag(BooleanFlags.WEBHOOK_RECEIVED_METRICS, false)) &&
		webhookReceived
	) {
		emitWebhookProcessingTimeMetrics(
			webhookReceived,
			name,
			log,
			githubResponse?.status
		);
	}
};

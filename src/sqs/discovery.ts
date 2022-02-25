import { MessageHandler } from "./index";
import app from "../worker/app";
import { discovery, discoveryOctoKit } from "../sync/discovery";
import { booleanFlag, BooleanFlags } from "../config/feature-flags";

export type DiscoveryMessagePayload = {
	installationId: number,
	jiraHost: string
}

export const discoveryQueueMessageHandler : MessageHandler<DiscoveryMessagePayload> = async (context) => {
	const useNewGHClient = await booleanFlag(BooleanFlags.USE_NEW_GITHUB_CLIENT_FOR_DISCOVERY, false, context?.payload?.jiraHost);
	context.log = context.log.child({
		jiraHost: context?.payload?.jiraHost,
		installationId: context?.payload?.installationId
	})
	if(useNewGHClient) {
		await discovery(context.payload, context.log);
		return;
	}
	await discoveryOctoKit(app)({ data: context.payload }, context.log);
};

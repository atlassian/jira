import { CustomContext } from "middleware/github-webhook-middleware";

const DEFAULT_TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS) || 25000;

export const webhookTimeout = (callback: (context: CustomContext) => Promise<void>, timeout = DEFAULT_TIMEOUT) =>
	async (context: CustomContext): Promise<void> => {
		const timestamp = Date.now();
		const id = setTimeout(() => context.timedout = Date.now() - timestamp, timeout);
		try {
			await callback(context);
		} finally {
			clearTimeout(id);
		}
	}

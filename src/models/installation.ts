import crypto from "crypto";
import Sequelize from "sequelize";
import Subscription from "./subscription";
import { booleanFlag, BooleanFlags } from "../config/feature-flags";

// TODO: this should not be there.  Should only check once a function is called
if (!process.env.STORAGE_SECRET) {
	throw new Error("STORAGE_SECRET is not defined.");
}

export const getHashedKey = (clientKey: string): string => {
	const keyHash = crypto.createHmac("sha256", process.env.STORAGE_SECRET || "");
	keyHash.update(clientKey);
	return keyHash.digest("hex");
};

export const sortInstallationsByIdFlagIsOn = async (jiraHost): Promise<boolean> =>
	booleanFlag(BooleanFlags.SORT_INSTALLATIONS_BY_ID, true, jiraHost);
export default class Installation extends Sequelize.Model {
	id: number;
	jiraHost: string;
	secrets: string;
	sharedSecret: string;
	clientKey: string;

	static async getForClientKey(
		clientKey: string
	): Promise<Installation | null> {

		let payload;
		if (await sortInstallationsByIdFlagIsOn(jiraHost)) {
			payload =	{
				where: {
					clientKey: getHashedKey(clientKey),
				},
				// order: [["id", "DESC"]],
			}
		} else {
			payload =	{
				where: {
					clientKey: getHashedKey(clientKey),
				}
			}
		}

		return Installation.findOne(payload);
	}

	static async getForHost(host: string): Promise<Installation | null> {
		let payload;
		if (await sortInstallationsByIdFlagIsOn(jiraHost)) {
			payload =	{
				where: {
					jiraHost: host,
				},
				// order: [["id", "DESC"]],
			}
		} else {
			payload = {
				where: {
					jiraHost: host,
				}
			}
		}

		return Installation.findOne(payload);
	}

	static async getAllForHost(host: string): Promise<Installation[]> {
		let payload;
		if (await sortInstallationsByIdFlagIsOn(jiraHost)) {
			payload =	{
				where: {
					jiraHost: host,
				},
				// order: [["id", "DESC"]],
			}
		} else {
			payload = {
				where: {
					jiraHost: host,
				}
			}
		}

		return Installation.findAll(payload);
	}

	/**
	 * Create a new Installation object from a Jira Webhook
	 *
	 * @param {{host: string, clientKey: string, secret: string}} payload
	 * @returns {Installation}
	 */
	static async install(payload: InstallationPayload): Promise<Installation> {
		const [installation, created] = await Installation.findOrCreate({
			where: {
				clientKey: getHashedKey(payload.clientKey)
			},
			defaults: {
				jiraHost: payload.host,
				sharedSecret: payload.sharedSecret
			}
		});

		if (!created) {
			await installation
				.update({
					sharedSecret: payload.sharedSecret,
					jiraHost: payload.host
				})
				.then(async (record) => {
					const subscriptions = await Subscription.getAllForClientKey(
						record.clientKey
					);
					await Promise.all(
						subscriptions.map((subscription) =>
							subscription.update({ jiraHost: record.jiraHost })
						)
					);

					return installation;
				});
		}

		return installation;
	}

	async uninstall(): Promise<void> {
		await this.destroy();
	}

	async subscriptions(): Promise<Subscription[]> {
		return Subscription.getAllForClientKey(this.clientKey);
	}
}

export interface InstallationPayload {
	host: string;
	clientKey: string;
	// secret: string;
	sharedSecret: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Installation } from "models/installation";
import { Subscription } from "models/subscription";
import { GithubCreateBranchPost } from "./github-create-branch-post";
import { getLogger } from "config/logger";

describe("delete-github-subscription", () => {
	const gitHubInstallationId = 15;
	let req, res;

	beforeEach(async () => {
		await Subscription.create({
			gitHubInstallationId,
			jiraHost
		});

		await Installation.create({
			jiraHost,
			clientKey: "client-key",
			sharedSecret: "shared-secret"
		});

		req = {
			log: getLogger("request"),
			params: {},
			body: {
				owner: "ARC",
				repo: "cat-photos",
				sourceBranchName: "main",
				newBranchName: "chesire"
			}
		};

		res = {
			sendStatus: jest.fn(),
			status: jest.fn(),
			json: jest.fn(),
			locals: {
				jiraHost,
				githubToken: "abc-token",
				gitHubAppConfig: {}
			}
		};
	});

	it("Should succussfully run through the create branch flow", async () => {

		// Get reference
		githubNock
			.get("/repos/ARC/cat-photos/git/refs/heads/main")
			.reply(200, { object: { sha: "casd769adf" } });

		// Create Branch
		githubNock
			.post("/repos/ARC/cat-photos/git/refs",{ body:
					{
						ref: "refs/heads/chesire",
						sha: "casd769adf"
					}
			})
			.reply(200);

		await GithubCreateBranchPost(req as any, res as any);
		expect(res.sendStatus).toHaveBeenCalledWith(200);
	});

	it("Should 401 without githubToken", async () => {
		delete res.locals.githubToken;
		await GithubCreateBranchPost(req as any, res as any);
		expect(res.sendStatus).toHaveBeenCalledWith(401);
	});

	it("Should 401 without jiraHost", async () => {
		delete res.locals.githubToken;
		await GithubCreateBranchPost(req as any, res as any);
		expect(res.sendStatus).toHaveBeenCalledWith(401);
	});

	// TODO need to mock status().json
	// it.each(["owner", "repo", "sourceBranchName", "newBranchName"])("Should 400 when missing required fields", async (attribute) => {
	// 	delete req.body[attribute];
	// 	await GithubCreateBranchPost(req as any, res as any);
	// 	expect(res.status).toHaveBeenCalledWith(400);
	// });

});

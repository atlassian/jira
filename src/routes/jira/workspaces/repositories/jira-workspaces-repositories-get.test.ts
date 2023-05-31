import { getLogger } from "config/logger";
import express, { Application } from "express";
import { getFrontendApp } from "~/src/app";
import supertest from "supertest";
import { Errors } from "config/errors";
import { Subscription } from "models/subscription";
import { RepoSyncState } from "models/reposyncstate";
import { Installation } from "models/installation";
import { encodeSymmetric } from "atlassian-jwt";

describe("Workspaces Repositories Get", () => {
	let app: Application;
	let sub: Subscription;
	let installation: Installation;
	let jwt: string;
	let repo;

	beforeEach(async () => {
		installation = await Installation.install({
			host: jiraHost,
			sharedSecret: "shared-secret",
			clientKey: "jira-client-key"
		});

		sub = await Subscription.install({
			host: jiraHost,
			installationId: 1234,
			hashedClientKey: "key-123",
			gitHubAppId: undefined
		});

		jwt = encodeSymmetric({
			qsh: "context-qsh",
			iss: "jira-client-key"
		}, await installation.decrypt("encryptedSharedSecret", getLogger("test")));
	});

	it("Should return a 400 status if no repo name is provided in query params", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		await supertest(app)
			.get(`/jira/workspaces/repositories/search?workspaceId=${sub.id}`)
			.query({
				jwt
			})
			.expect(res => {
				expect(res.status).toBe(400);
				expect(res.text).toContain("Missing repo name");
			});
	});

	it("Should return a 400 status if no Subscription is found for host", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		await supertest(app)
			.get(`/jira/workspaces/repositories/search?workspaceId=${sub.id + 1}&searchQuery=new`)
			.query({
				jwt
			})
			.expect(res => {
				expect(res.status).toBe(400);
				expect(res.text).toContain(Errors.MISSING_SUBSCRIPTION);
			});
	});

	it("Should return a 400 status if no matching repo is found for orgName + subscription id", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		repo = {
			subscriptionId: sub.id,
			repoId: 1,
			repoName: "github-for-jira",
			repoOwner: "atlassian",
			repoFullName: "atlassian/github-for-jira",
			repoUrl: "github.com/atlassian/github-for-jira"
		};

		await RepoSyncState.create({
			...repo,
			subscriptionId: sub.id
		});

		await supertest(app)
			.get(`/jira/workspaces/repositories/search?workspaceId=${sub.id}&searchQuery=test-repo`)
			.query({
				jwt
			})
			.expect(res => {
				expect(res.status).toBe(400);
				expect(res.text).toContain("Repository not found");
			});
	});

	it("Should return all repos for matching Subscription ID and partial matching repo name", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		const sub2 = await Subscription.install({
			host: jiraHost,
			installationId: 2345,
			hashedClientKey: "key-123",
			gitHubAppId: undefined
		});

		const repo1 = {
			subscriptionId: sub.id,
			repoId: 1,
			repoName: "new-repo",
			repoOwner: "atlassian",
			repoFullName: "atlassian/new-repo",
			repoUrl: "github.com/atlassian/new-repo"
		};

		const repo2 = {
			subscriptionId: sub.id,
			repoId: 2,
			repoName: "another-new-repo",
			repoOwner: "atlassian",
			repoFullName: "atlassian/another-new-repo",
			repoUrl: "github.com/atlassian/another-new-repo"
		};

		const repo3 = {
			subscriptionId: sub.id,
			repoId: 3,
			repoName: "this-ones-an-oldie",
			repoOwner: "atlassian",
			repoFullName: "atlassian/this-ones-an-oldie",
			repoUrl: "github.com/atlassian/this-ones-an-oldie"
		};

		const repo4 = {
			subscriptionId: sub.id,
			repoId: 4,
			repoName: "imNew",
			repoOwner: "atlassian",
			repoFullName: "atlassian/imnew",
			repoUrl: "github.com/atlassian/imnew"
		};

		const sub2repo = {
			subscriptionId: sub2.id,
			repoId: 4,
			repoName: "newbutshouldntmatch",
			repoOwner: "atlassian",
			repoFullName: "atlassian/newbutshouldntmatch",
			repoUrl: "github.com/atlassian/newbutshouldntmatch"
		};

		const repoOne = await RepoSyncState.create({
			...repo1,
			subscriptionId: sub.id
		});

		const repoTwo = await RepoSyncState.create({
			...repo2,
			subscriptionId: sub.id
		});

		await RepoSyncState.create({
			...repo3,
			subscriptionId: sub.id
		});

		const repoFour = await RepoSyncState.create({
			...repo4,
			subscriptionId: sub.id
		});

		await RepoSyncState.create({
			...sub2repo,
			subscriptionId: sub2.id
		});

		const response = {
			success: true,
			repositories: [
				{
					id: repoOne.repoId.toString(),
					name: "new-repo",
					workspaceId: sub.id
				},
				{
					id: repoTwo.repoId.toString(),
					name: "another-new-repo",
					workspaceId: sub.id
				},
				{
					id: repoFour.repoId.toString(),
					name: "imNew",
					workspaceId: sub.id
				}
			]
		};

		await supertest(app)
			.get(`/jira/workspaces/repositories/search?workspaceId=${sub.id}&searchQuery=new`)
			.query({
				jwt
			})
			.expect(res => {
				expect(res.status).toBe(200);
				expect(res.text).toContain(JSON.stringify(response));
			});
	});

	it("Should return all repos for partial matching repo name (no workspace ID provided)", async () => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp());

		const sub2 = await Subscription.install({
			host: jiraHost,
			installationId: 2345,
			hashedClientKey: "key-123",
			gitHubAppId: undefined
		});

		const repo1 = {
			subscriptionId: sub.id,
			repoId: 1,
			repoName: "new-repo",
			repoOwner: "atlassian",
			repoFullName: "atlassian/new-repo",
			repoUrl: "github.com/atlassian/new-repo"
		};

		const repo2 = {
			subscriptionId: sub.id,
			repoId: 2,
			repoName: "another-new-repo",
			repoOwner: "atlassian",
			repoFullName: "atlassian/another-new-repo",
			repoUrl: "github.com/atlassian/another-new-repo"
		};

		const repo3 = {
			subscriptionId: sub.id,
			repoId: 3,
			repoName: "this-ones-an-oldie",
			repoOwner: "atlassian",
			repoFullName: "atlassian/this-ones-an-oldie",
			repoUrl: "github.com/atlassian/this-ones-an-oldie"
		};

		const repo4 = {
			subscriptionId: sub.id,
			repoId: 4,
			repoName: "imNew",
			repoOwner: "atlassian",
			repoFullName: "atlassian/imnew",
			repoUrl: "github.com/atlassian/imnew"
		};

		const sub2repo = {
			subscriptionId: sub2.id,
			repoId: 4,
			repoName: "newbutshouldmatch",
			repoOwner: "atlassian",
			repoFullName: "atlassian/newbutshouldmatch",
			repoUrl: "github.com/atlassian/newbutshouldmatch"
		};

		const repoOne = await RepoSyncState.create({
			...repo1,
			subscriptionId: sub.id
		});

		const repoTwo = await RepoSyncState.create({
			...repo2,
			subscriptionId: sub.id
		});

		await RepoSyncState.create({
			...repo3,
			subscriptionId: sub.id
		});

		const repoFour = await RepoSyncState.create({
			...repo4,
			subscriptionId: sub.id
		});

		await RepoSyncState.create({
			...sub2repo,
			subscriptionId: sub2.id
		});

		const response = {
			success: true,
			repositories: [
				{
					id: repoOne.repoId.toString(),
					name: "new-repo",
					workspaceId: sub.id
				},
				{
					id: repoTwo.repoId.toString(),
					name: "another-new-repo",
					workspaceId: sub.id
				},
				{
					id: repoFour.repoId.toString(),
					name: "imNew",
					workspaceId: sub.id
				},
				{
					id: sub2repo.repoId.toString(),
					name: "newbutshouldmatch",
					workspaceId: sub2.id
				}
			]
		};

		await supertest(app)
			.get(`/jira/workspaces/repositories/search?searchQuery=new`)
			.query({
				jwt
			})
			.expect(res => {
				expect(res.status).toBe(200);
				expect(res.text).toContain(JSON.stringify(response));
			});
	});
});

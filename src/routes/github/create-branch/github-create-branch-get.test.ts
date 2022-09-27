import express, { Application } from "express";
import supertest from "supertest";
import { getLogger } from "config/logger";
import { getFrontendApp } from "~/src/app";
import { getSignedCookieHeader } from "test/utils/cookies";
import { GetRepositoriesQuery } from "~/src/github/client/github-queries";

describe("GitHub Create Branch Get", () => {
	let app: Application;
	beforeEach(() => {
		app = express();
		app.use((req, _, next) => {
			req.log = getLogger("test");
			req.query = { issue_key: "1", issue_summary: "random-string" };
			req.csrfToken = jest.fn();
			next();
		});
		app.use(getFrontendApp({
			getSignedJsonWebToken: () => "",
			getInstallationAccessToken: async () => ""
		}));
	});
	describe("Testing the GET route", () => {
		it("should redirect to Github login if unauthorized", async () => {
			await supertest(app)
				.get("/github/create-branch").set(
					"Cookie",
					getSignedCookieHeader({
						jiraHost
					}))
				.expect(res => {
					expect(res.status).toBe(302);
					expect(res.headers.location).toContain("github.com/login/oauth/authorize");
				});
		});

		it("should hit the create branch on GET if authorized", async () => {
			githubNock
				.get("/")
				.matchHeader("Authorization", /^(Bearer|token) .+$/i)
				.reply(200);
			githubNock
				.post("/graphql", { query: GetRepositoriesQuery, variables: { per_page: 20 } })
				.reply(200, { data: { viewer: { repositories: { edges: [] } } } });
			githubNock
				.get("/user")
				.reply(200, { data: { login: "test-account" } });

			await supertest(app)
				.get("/github/create-branch").set(
					"Cookie",
					getSignedCookieHeader({
						jiraHost,
						githubToken: "random-token"
					}))
				.expect(res => {
					expect(res.status).toBe(200);
					expect(res.text).toContain("<div class=\"gitHubCreateBranch__header\">Create GitHub Branch</div>");
				});
		});
	});
});

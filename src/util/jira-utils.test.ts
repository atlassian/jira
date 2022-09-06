/* eslint-disable @typescript-eslint/no-explicit-any */
import { envVars } from "config/env";
import {
	getJiraAppUrl,
	getJiraMarketplaceUrl,
	isGitHubCloudApp,
	jiraIssueKeyParser
} from "./jira-utils";
import { mocked } from "ts-jest/utils";
import { GitHubServerApp } from "models/github-server-app";

jest.mock("models/github-server-app");

describe("Jira Utils", () => {
	describe("getJiraAppUrl", () => {
		let instanceName: string;
		beforeEach(() => instanceName = envVars.INSTANCE_NAME);
		afterEach(() => process.env.INSTANCE_NAME = instanceName);

		it("should return the correct default URL", () => {
			expect(getJiraAppUrl(jiraHost)).toEqual(`${jiraHost}/plugins/servlet/ac/com.github.integration.test-atlassian-instance/github-post-install-page`);
			expect(getJiraAppUrl("https://foo.com")).toEqual(`https://foo.com/plugins/servlet/ac/com.github.integration.test-atlassian-instance/github-post-install-page`);
		});

		it("should return the correct URL for different INSTANCE_NAME", () => {
			process.env.INSTANCE_NAME = "foo";
			expect(getJiraAppUrl(jiraHost)).toEqual(`${jiraHost}/plugins/servlet/ac/com.github.integration.foo/github-post-install-page`);
		});

		it("should return empty string if missing jiraHost", () => {
			expect(getJiraAppUrl("")).toEqual("");
			expect(getJiraAppUrl(undefined as any)).toEqual("");
		});
	});

	describe("getJiraMarketplaceUrl", () => {
		it("should return the correct default URL", () => {
			expect(getJiraMarketplaceUrl(jiraHost)).toEqual(`${jiraHost}/jira/marketplace/discover/app/com.github.integration.production`);
			expect(getJiraMarketplaceUrl("https://foo.com")).toEqual(`https://foo.com/jira/marketplace/discover/app/com.github.integration.production`);
		});

		it("should return empty string if missing jiraHost", () => {
			expect(getJiraMarketplaceUrl("")).toEqual("");
			expect(getJiraMarketplaceUrl(undefined as any)).toEqual("");
		});
	});

	describe("jiraIssueKeyParser", () => {
		it("should handle incorrect types and always return empty array", () => {
			[2, "", [], {}, undefined, null]
				.forEach((value: any) => expect(jiraIssueKeyParser(value)).toEqual([]));
		});

		it("should extract jira issue key with different casing", () => {
			["JRA-123", "jra-123", "jRa-123"]
				.forEach((value: any) => expect(jiraIssueKeyParser(value)).toEqual(["JRA-123"]));
		});

		it("should not extract jira issue key starting with number", () => {
			["2PAC-123", "42-123"].forEach(value => expect(jiraIssueKeyParser(value)).toEqual([]));
		});

		// unskip once FF is removed
		it.skip("should not extract jira issue key with number starting with 0", () => {
			expect(jiraIssueKeyParser("PAC-001")).toEqual([]);
		});

		it("should extract jira issue key with number(s) in it that's not the first character", () => {
			expect(jiraIssueKeyParser("J42-123")).toEqual(["J42-123"]);
			expect(jiraIssueKeyParser("b4l-123")).toEqual(["B4L-123"]);
			expect(jiraIssueKeyParser("Ja9-123")).toEqual(["JA9-123"]);
		});

		it("extracts alphanumeric issue key from a branch", () => {
			expect(jiraIssueKeyParser("feature/J3-123-my-feature")).toEqual(["J3-123"]);
		});

		it("should not extract issue key with single char project key", () => {
			expect(jiraIssueKeyParser("F-67-my-feature")).toEqual([]);
		});

		it("should not extract the same issue twice", () => {
			expect(jiraIssueKeyParser("JRA-123 with suffix spaces and JRA-123 TBD-123")).toEqual(["JRA-123", "TBD-123"]);
		});

		it("should extract issue keys wrapped in special characters", () => {
			const specialChars = ` !"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~\n\t`.split("");
			specialChars
				.forEach((char) => {
					expect(jiraIssueKeyParser(`${char}JRA-123${char}`)).toEqual(["JRA-123"]);
					const randomChar = specialChars[Math.floor(specialChars.length * Math.random())];
					expect(jiraIssueKeyParser(`${randomChar}JRA-123${char}`)).toEqual(["JRA-123"]);
					expect(jiraIssueKeyParser(`${char}JRA-123${randomChar}`)).toEqual(["JRA-123"]);
				});
		});

		// Skipping for now until we're using the correct regex or parsing API
		it.skip("should extract issue keys with unicode characters including non-latin based", () => {
			// Latin (french)
			expect(jiraIssueKeyParser("tête-123")).toEqual(["TÊTE-123"]);
			// Arabic - because of RTL, using unicode version to not change direction of text
			expect(jiraIssueKeyParser("b\u063A\u062E-123")).toEqual(["B\u063A\u062E-123"]);
			// Hebrew - because of RTL, using unicode version to not change direction of text
			expect(jiraIssueKeyParser("c\u05E7-123")).toEqual(["C\u05E7-123"]);
			// Thai
			expect(jiraIssueKeyParser("tกฒ-123")).toEqual(["Tกฒ-123"]);
			// Japanese
			expect(jiraIssueKeyParser("シtヌ-123")).toEqual(["シTヌ-123"]);
			// Chinese
			expect(jiraIssueKeyParser("r汉字-123")).toEqual(["R汉字-123"]);
			// Russian
			expect(jiraIssueKeyParser("шъ-123")).toEqual(["ШЪ-123"]);
		});

		it("should extract jira issue key when part of a longer string", () => {
			[
				"feature-branch/JRA-123",
				"prefix-kebab-JRA-123",
				"JRA-123-suffix-kebab",
				"JRA-123 with suffix spaces",
				"prefix spaces with JRA-123"
			]
				.forEach(value => expect(jiraIssueKeyParser(value)).toEqual(["JRA-123"]));
		});

		it("should extract multiple issue keys in a single string", () => {
			expect(jiraIssueKeyParser("JRA-123 Jra-456-jra-901\n[bah-321]")).toEqual(["JRA-123", "JRA-456", "JRA-901", "BAH-321"]);
		});

		it("should not extract issue keys longer than 256 characters for project key or number", () => {
			expect(jiraIssueKeyParser(`${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(10)}-1234567890`)).toEqual([]);
			// this is the exception since it'll cut off the end of the number
			expect(jiraIssueKeyParser(`ABCDEFGHIJKLMNOPQRSTUVWXYZ-${"1234567890".repeat(26)}`)).toEqual(["ABCDEFGHIJKLMNOPQRSTUVWXYZ-123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345"]);
			expect(jiraIssueKeyParser(`${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(10)}-${"1234567890".repeat(26)}`)).toEqual([]);
		});
	});

	describe("isGitHubCloudApp", () => {

		let payload;

		it("should return true if no gitHubAppId is provided", async () => {
			expect(await isGitHubCloudApp(undefined)).toBeTruthy();
		});

		it("should return true if gitHubAppId is provided but no GitHub app is found", async () => {
			expect(await isGitHubCloudApp(1)).toBeTruthy();
		});

		it("should return false if gitHubAppId is provided and a GitHub app is found", async () => {
			payload = {
				uuid: "97da6b0e-ec61-11ec-8ea0-0242ac120002",
				gitHubAppName: "My GitHub Server App",
				gitHubBaseUrl: "http://myinternalserver.com",
				gitHubClientId: "lvl.1234",
				gitHubClientSecret: "myghsecret",
				webhookSecret: "mywebhooksecret",
				privateKey: "myprivatekey",
				installationId: 2
			};

			mocked(GitHubServerApp.getForGitHubServerAppId).mockResolvedValue(payload);
			expect(await isGitHubCloudApp(1)).toBeFalsy();
		});
	});
});

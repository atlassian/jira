import { Page } from "@playwright/test";
import { GithubTestDataRoles, testData } from "test/e2e/constants";

const data = testData.github;
export const githubLogin = async (page: Page, roleName: keyof GithubTestDataRoles, saveState = false) => {
	const role = data.roles[roleName];
	if (!role.username || !role.password) {
		throw "github username or github password missing";
	}
	await page.goto(data.urls.login);
	await page.waitForLoadState();
	if (page.url().startsWith(data.urls.login)) {
		const userinput = page.locator("#login_field");
		const passinput = page.locator("#password");
		await userinput.fill(role.username);
		await userinput.press("Tab");
		await passinput.fill(role.password);
		await passinput.press("Enter");
		await page.waitForURL(data.urls.base);

		if (saveState && role.storage) {
			await page.context().storageState({ path: role.storage });
		}
	}

	return page;
};

export const githubAppInstall = async (page: Page) => {
	// TODO: add github app install
	await page.goto(data.urls.apps);
};

export const githubAppUninstall = async (page: Page) => {
	// TODO: add github app uninstall
	await page.goto(data.urls.apps);
};

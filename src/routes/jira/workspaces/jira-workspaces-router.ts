import { Router } from "express";
import { JiraWorkspacesGet } from "routes/jira/workspaces/jira-workspaces-get";
import { jiraSymmetricJwtMiddleware } from "middleware/jira-symmetric-jwt-middleware";
import { csrfMiddleware } from "middleware/csrf-middleware";
import {
	JiraWorkspacesRepositoriesRouter
} from "routes/jira/workspaces/repositories/jira-workspaces-repositories-router";

export const JiraWorkspacesRouter = Router();

JiraWorkspacesRouter.route("/search")
	.get(csrfMiddleware, jiraSymmetricJwtMiddleware, JiraWorkspacesGet);

JiraWorkspacesRouter.use("/repositories", JiraWorkspacesRepositoriesRouter);

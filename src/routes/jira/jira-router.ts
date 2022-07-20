import { Router } from "express";
import { JiraConfigurationRouter } from "./configuration/jira-configuration-router";
import { JiraSyncPost } from "./jira-sync-post";
import { JiraAtlassianConnectGet } from "./jira-atlassian-connect-get";
import { JiraEventsRouter } from "./events/jira-events-router";
import { JiraSelectVersionRouter } from "./server/jira-select-version-router";
import { JiraContextJwtTokenMiddleware, JiraJwtTokenMiddleware } from "middleware/jira-jwt-middleware";
import { JiraServerUrlRouter } from "routes/jira/server/jira-server-url-router";
import { JiraAppCreationRouter } from "./server/jira-app-creation-router";
import { csrfMiddleware } from "middleware/csrf-middleware";
import { JiraGheServers } from "routes/jira/server/jira-ghe-servers";
import { JiraManifestGet } from "~/src/routes/jira/jira-manifest-get";
import { JiraManifestCompleteGet } from "~/src/routes/jira/jira-manifest-complete-get";

export const JiraRouter = Router();

JiraRouter.get("/atlassian-connect.json", JiraAtlassianConnectGet);
JiraRouter.get("/ghe-servers", csrfMiddleware, JiraJwtTokenMiddleware, JiraGheServers);

JiraRouter.use("/configuration", JiraConfigurationRouter);
// TODO - add csrf middleware
JiraRouter.post("/sync", JiraContextJwtTokenMiddleware, JiraSyncPost);
JiraRouter.use("/events", JiraEventsRouter);
JiraRouter.use("/select-version", JiraSelectVersionRouter);
JiraRouter.use("/server-url", JiraServerUrlRouter);
JiraRouter.use("/app-creation", JiraAppCreationRouter);
JiraRouter.use("/manifest/complete/:uuid", JiraManifestCompleteGet);
JiraRouter.use("/manifest", JiraManifestGet);

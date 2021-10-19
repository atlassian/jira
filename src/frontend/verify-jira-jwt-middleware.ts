import {Installation} from "../models";
import {NextFunction, Request, Response} from "express";
import { extractJwtFromRequest, TokenType, verifyAsymmetricJwtTokenMiddleware, verifySymmetricJwtTokenMiddleware } from "../jira/util/jwt";

const verifyJiraJwtMiddleware = (tokenType: TokenType) => async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	const jiraHost = (req.query.xdm_e as string) || req.session.jiraHost || req.body?.jiraHost;
	const installation = await Installation.getForHost(jiraHost);

	if (!installation) {
		return next(new Error("Not Found"));
	}
	res.locals.installation = installation;

	req.addLogFields({
		jiraHost: installation.jiraHost,
		jiraClientKey:
			installation.clientKey && `${installation.clientKey.substr(0, 5)}***`
	});

	verifySymmetricJwtTokenMiddleware(
		installation.sharedSecret,
		tokenType,
		req,
		res,
		(...args) => {
			// set the jiraHost to session as undefined on error, or the actual host when jwt verified
			req.session.jiraHost = args.length ? undefined : jiraHost;
			req.session.jwt = args.length ? undefined : extractJwtFromRequest(req);
			next(...args);
		});
};

export const verifyJiraJwtTokenMiddleware = verifyJiraJwtMiddleware(TokenType.normal);

export const verifyJiraContextJwtTokenMiddleware = verifyJiraJwtMiddleware(TokenType.context);
export const authenticateJiraEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	verifySymmetricJwtTokenMiddleware(res.locals.installation.sharedSecret, TokenType.normal, req, res, next)
}
export const authenticateUninstallCallback = verifyAsymmetricJwtTokenMiddleware;
export const authenticateInstallCallback = verifyAsymmetricJwtTokenMiddleware;

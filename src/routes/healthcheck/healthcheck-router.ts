import IORedis from "ioredis";
import getRedisInfo from "../../config/redis-info";
import { Response, Router } from "express";
import { getLogger } from "../../config/logger";
import { sequelize } from "models/sequelize";

export const HealthcheckRouter = Router();
const cache = new IORedis(getRedisInfo("ping"));

/**
 * /deepcheck endpoint to checks to see that all our connections are OK
 *
 * It's a race between the setTimeout and our ping + authenticate.
 */
HealthcheckRouter.get("/deepcheck", async (_, res: Response) => {
	const logger = getLogger("deepcheck");
	const timeout = 5000;

	const redisPromise = cache.ping()
		.catch(() => Promise.reject("Could not connect to Redis"));
	const databasePromise = sequelize.authenticate()
		.catch(() => Promise.reject("Could not connect to postgres DB"));
	const timeoutPromise = new Promise((_, reject) =>
		setTimeout(() => reject(`deepcheck timed out after ${timeout}ms`), timeout)
	);

	try {
		await Promise.race([
			Promise.all([redisPromise, databasePromise]),
			timeoutPromise
		]);
	} catch (error) {
		logger.error({ reason: error }, "Error during /deepcheck");
		return res.status(500).send("NOT OK");
	}

	logger.debug("Successfully called /deepcheck");
	return res.status(200).send("OK");
});

/**
 * /healtcheck endpoint to check that the app started properly
 */
const healthcheckLogger = getLogger("healthcheck");
HealthcheckRouter.get("/healthcheck", async (_, res: Response) => {
	healthcheckLogger.debug("Successfully called /healthcheck.");
	return res.status(200).send("OK");
});

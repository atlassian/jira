import IORedis from "ioredis";
import { isNodeProd } from "../util/isNodeEnv";

export default (connectionName: string): IORedis.RedisOptions => ({
	port: Number(process.env.REDISX_CACHE_PORT) || 6379,
	host: process.env.REDISX_CACHE_HOST || "127.0.0.1",
	db: 0,

	// TODO find out if we still need these options
	// https://github.com/OptimalBits/bull/issues/1873#issuecomment-950873766
	maxRetriesPerRequest: null,
	enableReadyCheck: false,

	tls: isNodeProd() ? { checkServerIdentity: () => undefined } : undefined,
	connectionName
});

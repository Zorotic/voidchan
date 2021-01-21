import fastify, { FastifyInstance } from "fastify";
import { Logger } from "@ayanaware/logger";
import { APIService } from "./Router";
import { Client } from "./structs/DiscordClient";

require("dotenv").config();

process.chdir(__dirname);

const app: FastifyInstance = fastify({ logger: false, trustProxy: true });

const logger = Logger.get("Router");

app.addHook("onRequest", (req, res, next) => {
	logger.info(`(ID: ${req.id}) ${req.routerMethod} -> ${req.url} from ${req.ip}`);
	next();
});

app.register(require("point-of-view"), {
	engine: {
		ejs: require("ejs")
	}
})

const api = new APIService(app, {
	port: parseInt(process.env.PORT)
});

const client = new Client(api);

api.listen();
client.init();
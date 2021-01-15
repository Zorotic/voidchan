import { AkairoClient, ListenerHandler, CommandHandler } from "discord-akairo";
import { Logger } from "@ayanaware/logger";

import { APIService } from "../Router";

declare module "discord-akairo" {
	interface AkairoClient {
		router: APIService
	}
}

export class Client extends AkairoClient {
	private logger: Logger = Logger.get("Discord");

	public commandHandler: CommandHandler;
	public listenerHandler: ListenerHandler;

	constructor(public router: APIService) {
		super({
			ownerID: process.env.DISCORD_OWNER_ID,
			presence: {
				activity: {
					name: process.env.HOSTNAME,
					type: "WATCHING"
				}
			}
		}, {
			messageCacheMaxSize: 0,
			ws: {
				intents: [
					"GUILDS",
					"GUILD_MESSAGES",
					"GUILD_MEMBERS"
				]
			}
		});

		this.commandHandler = new CommandHandler(this, {
			directory: "./commands",
			prefix: "!",
			commandUtil: true
		});

		this.listenerHandler = new ListenerHandler(this, {
			directory: "./events"
		});
		this.commandHandler.useListenerHandler(this.listenerHandler);
	}

	public async init() {
		if (!process.env.DISCORD_TOKEN) return this.logger.info("Starting without a discord client. No token was provided!");

		this.logger.info("Registering Handlers.");
		this.listenerHandler.loadAll();
		this.commandHandler.loadAll();
		try {
			await this.login(process.env.DISCORD_TOKEN);
		} catch (e) {
			this.logger.error(e);
		}
	}
}
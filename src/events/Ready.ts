import { Listener } from "discord-akairo";
import { Logger } from "@ayanaware/logger";

const logger = Logger.get();
export default class Ready extends Listener {
	constructor() {
		super("ready", {
			emitter: "client",
			event: "ready"
		});

		logger.info("Loaded.");
	}

	public async exec() {
		logger.info(`${this.client.user.username} (${this.client.user.id}) is ready!`);
	} 
}
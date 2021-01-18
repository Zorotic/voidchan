import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class PingCommand extends Command {
	constructor() {
		super("create-account", {
			aliases: ["create"],

		});
	}

	public exec(message: Message) {
		return message.channel.send("test", { replyTo: message.id });
	}
}

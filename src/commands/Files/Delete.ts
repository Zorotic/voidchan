import { Command } from "discord-akairo";
import { Message } from "discord.js";

export default class PingCommand extends Command {
	constructor() {
		super("delete-file", {
			ownerOnly: true,
			aliases: ["delete", "del"],
			args: [
				{
					id: "id",
					type: "string",
					match: "phrase"
				}
			]
		});
	}

	public async exec(message: Message, args: any) {
		const file = await this.client.router.files.findOne({ id: args.id });

		if (!file) return message.util.send("I was unable to find the file you are looking for.", { replyTo: message.id });

		const filter = (response: Message) => {
			return response.content.toLowerCase() == "yes" ? true : false
		}

		message.util.send("Are you sure to want to delete this file? (reply `yes` or `no`)", { replyTo: message.id }).then(() => {
			message.channel.awaitMessages(filter, { max: 1, maxProcessed: 1, time: 15000, errors: ["time"] }).then(async collected => {
				if (collected.size == 0) return message.channel.send("Deletion Cancelled.", { replyTo: message.id });

				await this.client.router.files.delete({ id: args.id });
				message.util.send(`File \`${args.id}\` has been deleted!`, { replyTo: message.id });
			}).catch(() => {
				message.util.send("Prompt has timed out, Cancelling delete.", { replyTo: message.id });
			});
		});
	}
}

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

		if (!file) return message.util.send("I was unable to find the file you are looking for.");

		const filter = (response: Message) => {
			return response.content.toLowerCase() == "yes" ? true : false
		}

		message.channel.send(`Are you sure to want to delete this file?`).then(() => {
			message.channel.awaitMessages(filter, { max: 1, maxProcessed: 1, time: 15000, errors: ["time"] }).then(async collected => {
				if (collected.size == 0) return message.channel.send("Deletion Aborted.");

				await this.client.router.files.delete({ id: args.id });
				message.channel.send(`File \`${args.id}\` has been deleted.`);
			})
		})
	}
}
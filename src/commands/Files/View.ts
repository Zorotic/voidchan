import { Command } from "discord-akairo";
import { MessageAttachment } from "discord.js";
import { MessageEmbed } from "discord.js";
import { Message } from "discord.js";
import * as mime from 'mime';

export default class PingCommand extends Command {
	constructor() {
		super('view', {
			ownerOnly: true,
			aliases: ['view'],
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

		if (!file) return message.util.send("I was unable to find what file you are looking for.");

		const extension = mime.getExtension(file.mimetype);
		const embed = new MessageEmbed()
			.setColor(message.guild.me.displayColor)
			.setImage(`attachment://file.${extension}`)
			.setTimestamp(file.uploadDate)
			.setFooter(`Views: ${file.views}`);

		return message.channel.send({ embed: embed, files: [{ attachment: file.buffer, name: `file.${extension}` }] })
	}
}
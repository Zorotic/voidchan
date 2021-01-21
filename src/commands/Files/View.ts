import { Command } from "discord-akairo";
import { MessageAttachment } from "discord.js";
import { MessageEmbed } from "discord.js";
import { Message } from "discord.js";
import * as mime from 'mime';

export default class PingCommand extends Command {
	constructor() {
		super('view', {
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
		const account = await this.client.router.accounts.findOne({ user: message.author.id });
		if (!account) return message.util.send("You don't have an account! To create one please do `!create`", { replyTo: message.id });
		
		const file = await this.client.router.files.findOne({ id: args.id, uploadedBy: account.id });
		if (!file) return message.util.send("I was unable to find the file you're looking for.", { replyTo: message.id });

		const extension = mime.getExtension(file.mimetype);
		const embed = new MessageEmbed()
			.setColor(message.guild.me.displayColor)
			.setTimestamp(file.uploadDate)
			.setFooter(`Views: ${file.views}`)
			.setAuthor(message.member.displayName, message.author.displayAvatarURL({ size: 2048 }));

		if (extension === "txt") {
			embed.setDescription(`You can view the file via the attached link.\nhttp://${process.env.HOSTNAME}/u/${file.id}`);
			return message.channel.send({ embed: embed, replyTo: message.id });
		} else {
			embed.setImage(`attachment://file.${extension}`);
			return message.channel.send({ embed: embed, files: [{ attachment: file.buffer, name: `file.${extension}` }], replyTo: message.id })
		}
	}
}
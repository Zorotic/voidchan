import { Command } from "discord-akairo";
import { Message, MessageEmbed } from "discord.js";

import * as crypto from "crypto";
import { AccountEntry } from "../../entities";

export default class PingCommand extends Command {
	constructor() {
		super("create-account", {
			aliases: ["create"],
			typing: true
		});
	}

	public async exec(message: Message) {
		const account = await this.client.router.accounts.findOne({ user: message.author.id });
		if (account) return message.util.send("You already have an account!", { replyTo: message.id });

		await message.util.send("Creating account..", { replyTo: message.id });
		const newAccount = new AccountEntry();
		newAccount.user = message.author.id;
		newAccount.createdAt = new Date();
		newAccount.id = crypto.randomBytes(16).toString("hex");

		await message.util.send("Your account information has been generated! I have tried to DM you the information.", { replyTo: message.id });

		const embed = new MessageEmbed()
			.setColor(message.guild.me.displayColor)
			.setTitle("Your account information")
			.addField("Your API key", newAccount.id)
			.setDescription(`(Copy and paste to import it!) ShareX .sxcu File:\n\`\`\`json\n{
	"Version": "13.3.0",
	"Name": "VoidChan",
	"DestinationType": "ImageUploader",
	"RequestMethod": "POST",
	"RequestURL": "https://${process.env.HOSTNAME}/api/providers/sharex",
	"Headers": {
		"Authorization": "${newAccount.id}"
	},
	"Body": "MultipartFormData",
	"FileFormName": "file",
	"URL": "$json:files[0].url$"
}\`\`\``);

		try {
			await message.author.send({ embed });
		} catch (e) {
			return message.util.send("I was unable to send you a DM! Please make sure your DMs are open and try again!", { replyTo: message.id });
		}

		await this.client.router.accounts.save(newAccount);
		await message.util.send("Account has been created successfully!");
	}
}

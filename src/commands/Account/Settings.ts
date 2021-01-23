import { Command } from "discord-akairo";
import { Message, MessageEmbed } from "discord.js";
import { stripIndents } from "common-tags";

export default class PingCommand extends Command {
	constructor() {
		super("settings-account", {
			aliases: ["settings", "preferences"],
		});
	}

	public *args() {
		const key = yield {
			type: (_message: Message, key: string): string => {
				key = key.toLowerCase();
				return ["color", "username", "title"].includes(key) ? key : "default";
			}
		}

		const value = yield {
			type: (message: Message, value: string): string => {
				if (key && !value) return null;
				if (key === "color" && !/^#[0-9a-f]{3,6}$/i.test(value)) return null;
				return message.content.split(" ").slice(2).join(" ") || "default";
			},
			prompt: {
				prompt: "Please provide a new value.",
				retry: "Please provide a valid color hex."
			}
		}

		return { key, value };
	}

	public async exec(message: Message, args: any) {
		const account = await this.client.router.accounts.findOne({ user: message.author.id });
		if (!account) return message.util.send("You don't have an account! To create one please do `!create`", { replyTo: message.id });

		if (args.key == "default") {
			const embed = new MessageEmbed()
				.setColor(account.embed_color)
				.setTitle("Your embed settings.")
				.setDescription(stripIndents`
					Title: ${account.embed_title}
					Username: ${account.embed_username}
					Color: ${account.embed_color}
				`);

			return message.util.send({ embed: embed, replyTo: message.id });
		}

		account["embed_" + args.key.toLowerCase()] = args.value;

		await this.client.router.accounts.save(account);
		return message.util.send("Your preferences have been updated!", { replyTo: message.id });
	}
}

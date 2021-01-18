/**
 * Credits to Crawl for this command.
 */

import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { Message, Util } from 'discord.js';
import * as util from 'util';

const NL = '!!NL!!';
const NL_PATTERN = new RegExp(NL, 'g');

export default class EvalCommand extends Command {
	public hrStart: [number, number] | undefined;

	public lastResult = null;

	private readonly _sensitivePattern = null;

	public constructor() {
		super('eval', {
			aliases: ['e', 'eval'],
			ownerOnly: true,
			args: [
				{
					id: 'code',
					match: 'content',
					type: 'string',
					prompt: {
						start: (message: Message) => `You must supply some code for me to eval.`
					}
				}
			]
		});
	}

	public async exec(message: Message, args) {
		const code = args.code as string;
		const doReply = (val: string | Error) => {
			if (val instanceof Error) {
				message.util.send(`Callback error: \`${val}\``, { replyTo: message.id });
			} else {
				const result = this._result(val, process.hrtime(this.hrStart));
				for (const res of result) message.util.send(res);
			}
		};

		let hrDiff;
		try {
			const hrStart = process.hrtime();
			this.lastResult = eval(code);
			hrDiff = process.hrtime(hrStart);
		} catch (error) {
			return message.util.send(`Error while evaluating: \`${error}\``, { replyTo: message.id });
		}

		this.hrStart = process.hrtime();
		const result = this._result(this.lastResult, hrDiff, code);
		// @ts-ignore
		if (Array.isArray(result)) return result.map(async res => message.util.send(res, { replyTo: message.id }));
		return message.util.send(result, { replyTo: message.id });
	}

	private _result(result: string, hrDiff: [number, number], input: string | null = null) {
		const inspected = util
			.inspect(result, { depth: 0 })
			.replace(NL_PATTERN, '\n')
			.replace(this.sensitivePattern, '[REDACTED]');
		const split = inspected.split('\n');
		const last = inspected.length - 1;
		const prependPart = inspected[0] !== '{' && inspected[0] !== '[' && inspected[0] !== "'" ? split[0] : inspected[0];
		const appendPart =
			inspected[last] !== '}' && inspected[last] !== ']' && inspected[last] !== "'"
				? split[split.length - 1]
				: inspected[last];
		const prepend = `\`\`\`javascript\n${prependPart}\n`;
		const append = `\n${appendPart}\n\`\`\``;
		if (input) {
			return Util.splitMessage(
				stripIndents`
				*Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
				\`\`\`javascript
				${inspected}
				\`\`\`
			`,
				{ maxLength: 1900, prepend, append },
			);
		}

		return Util.splitMessage(
			stripIndents`
			*Callback executed after ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
			\`\`\`javascript
			${inspected}
			\`\`\`
		`,
			{ maxLength: 1900, prepend, append },
		);
	}

	private get sensitivePattern() {
		if (!this._sensitivePattern) {
			const token = this.client.token.split('').join('[^]{0,2}');
			const revToken = this.client.token.split('').reverse().join('[^]{0,2}');
			Object.defineProperty(this, '_sensitivePattern', { value: new RegExp(`${token}|${revToken}`, 'g') });
		}
		return this._sensitivePattern;
	}
}
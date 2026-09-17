const { Events } = require('discord.js');
const { prefix } = require('../config');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot || !message.content.startsWith(prefix)) return;

		const args = message.content.slice(prefix.length).trim().split(/\s+/);
		const commandName = args.shift()?.toLowerCase();

		if (!commandName) return;

		const command = message.client.prefixCommands.get(commandName);

		if (!command) return;

		try {
			await command.execute(message, args);
		}
		catch (error) {
			console.error(error);
			await message.reply('Ada error pas jalanin command ini. Coba lagi ya~');
		}
	},
};

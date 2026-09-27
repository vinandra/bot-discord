const { Events } = require('discord.js');
const { channelId } = require('../config');
const {
	generateWelcomeGreeting,
	getDefaultWelcomeGreeting,
	loadBotRules,
} = require('../utils/groq');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
		if (!channelId) {
			console.error('Missing NGBROL_CHANNEL_ID in .env');
			return;
		}

		const channel = await member.client.channels.fetch(channelId).catch(() => null);

		if (!channel || !channel.isTextBased()) {
			console.error(`Welcome channel not found or not text-based: ${channelId}`);
			return;
		}

		const displayName = member.displayName || member.user.username;
		const serverName = member.guild.name;

		let greeting;

		try {
			const botRules = loadBotRules();
			if (!botRules?.persona) {
				throw new Error('bot-rules.json persona is missing');
			}

			greeting = await generateWelcomeGreeting(displayName, serverName);
		}
		catch (error) {
			const message = error?.message || String(error);
			const isRateLimited = message.includes('429') || /rate limit/i.test(message);
			const isUnavailable =
				isRateLimited
				|| /timeout|fetch failed|ENOTFOUND|ECONNRESET|503|502/i.test(message);

			if (isUnavailable) {
				console.warn(`Welcome AI unavailable, using default message: ${message}`);
			}
			else {
				console.error(error);
			}

			greeting = getDefaultWelcomeGreeting(serverName);
		}

		await channel.send(`${member} ${greeting}`);
	},
};

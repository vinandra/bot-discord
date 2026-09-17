const { Events } = require('discord.js');
const { channelId } = require('../config');
const { generateWelcomeGreeting } = require('../utils/groq');

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

		try {
			const greeting = await generateWelcomeGreeting(
				member.displayName || member.user.username,
			);

			await channel.send(`${member} ${greeting}`);
		}
		catch (error) {
			console.error(error);
			await channel.send(
				`${member} Halo! Selamat datang di server ya, semoga betah banget di sini~`,
			);
		}
	},
};

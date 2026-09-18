const { Events } = require('discord.js');
const { channelId } = require('../config');
const { generateWelcomeGreeting } = require('../utils/groq');
const { getEmoji } = require('../utils/emojis');

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
			const serverName = member.guild.name;
			const greeting = await generateWelcomeGreeting(
				member.displayName || member.user.username,
				serverName,
			);

			await channel.send(`${member} ${greeting}`);
		}
		catch (error) {
			console.error(error);
			const smile = getEmoji('wony_smile') || getEmoji('wony_cute') || getEmoji('wony');
			await channel.send(
				`${member} Halo! Selamat datang di server **${member.guild.name}** ya, semoga betah banget di sini~ ${smile}`.trim(),
			);
		}
	},
};

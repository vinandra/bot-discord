const { Events } = require('discord.js');
const { welcomeByeChannelId } = require('../config');
const { buildByeMessage } = require('../utils/memberBanner');

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
		if (!welcomeByeChannelId) {
			console.error('Missing WELCOME_BYE_CHANNEL_ID in .env');
			return;
		}

		const channel = await member.client.channels.fetch(welcomeByeChannelId).catch(() => null);

		if (!channel || !channel.isTextBased()) {
			console.error(`Welcome/bye channel not found or not text-based: ${welcomeByeChannelId}`);
			return;
		}

		try {
			await channel.send(buildByeMessage(member));
		}
		catch (error) {
			console.error('Failed to send goodbye banner:', error);
		}
	},
};

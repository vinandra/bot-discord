const { Events } = require('discord.js');
const { prefix, presence, presenceRefreshMs } = require('../config');
const { loadBotEmojis } = require('../utils/emojis');

function applyPresence(client) {
	client.user.setPresence(presence);
}

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(readyClient) {
		applyPresence(readyClient);

		setInterval(() => {
			applyPresence(readyClient);
		}, presenceRefreshMs);

		try {
			await loadBotEmojis(readyClient);
		}
		catch (error) {
			console.error('Failed to load application emojis:', error);
		}

		console.log(`Ready! Logged in as ${readyClient.user.tag}`);
		console.log(`Prefix commands ready with prefix: ${prefix}`);
		console.log(`Presence refresh every ${presenceRefreshMs / 1000}s`);
	},
};

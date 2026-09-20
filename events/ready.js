const { Events } = require('discord.js');
const { prefix, guildId, buildPresence, presenceRefreshMs } = require('../config');
const { loadBotEmojis } = require('../utils/emojis');

function getTargetGuild(client) {
	if (guildId) {
		return client.guilds.cache.get(guildId) || null;
	}

	return client.guilds.cache.first() || null;
}

function applyPresence(client) {
	const guild = getTargetGuild(client);
	client.user.setPresence(buildPresence(guild));
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

		const guild = getTargetGuild(readyClient);
		const activityName = buildPresence(guild).activities[0].name;

		console.log(`Ready! Logged in as ${readyClient.user.tag}`);
		console.log(`Prefix commands ready with prefix: ${prefix}`);
		console.log(`Presence: Streaming ${activityName}`);
		console.log(`Presence refresh every ${presenceRefreshMs / 1000}s`);
	},
};

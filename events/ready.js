const { Events } = require('discord.js');
const { prefix, presence } = require('../config');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(readyClient) {
		readyClient.user.setPresence(presence);

		console.log(`Ready! Logged in as ${readyClient.user.tag}`);
		console.log(`Prefix commands ready with prefix: ${prefix}`);
	},
};

const { Events, ActivityType } = require('discord.js');
const {
	prefix,
	guildId,
	profileId,
	setProfileName,
	buildPresence,
	nextPresence,
	presenceRefreshMs,
} = require('../config');
function getTargetGuild(client) {
	if (guildId) {
		return client.guilds.cache.get(guildId) || null;
	}

	return client.guilds.cache.first() || null;
}

function formatActivity(activity) {
	const typeName = ActivityType[activity.type] || activity.type;
	return `${typeName} ${activity.name}`;
}

async function loadServerProfileName(client) {
	if (!profileId) {
		console.error('Missing PROFILE_ID in .env');
		return;
	}

	const guild = getTargetGuild(client);
	if (!guild) {
		console.error('Guild not found while loading server profile');
		return;
	}

	const member = await guild.members.fetch(profileId);
	setProfileName(member.nickname || member.displayName);
}

async function applyPresence(client, rotate = false) {
	try {
		await loadServerProfileName(client);
	}
	catch (error) {
		console.error('Failed to load server profile for presence:', error);
	}

	const guild = getTargetGuild(client);
	const presence = rotate ? nextPresence(guild) : buildPresence(guild);
	client.user.setPresence(presence);
	return presence;
}

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(readyClient) {
		const firstPresence = await applyPresence(readyClient, false);

		setInterval(async () => {
			const presence = await applyPresence(readyClient, true);
			console.log(
				`Presence rotated: ${formatActivity(presence.activities[0])}`,
			);
		}, presenceRefreshMs);

		console.log(`Ready! Logged in as ${readyClient.user.tag}`);
		console.log(`Prefix commands ready with prefix: ${prefix}`);
		console.log(`Presence: ${formatActivity(firstPresence.activities[0])}`);
		console.log(`Presence rotates every ${presenceRefreshMs / 1000}s`);
	},
};

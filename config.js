require('dotenv').config({ quiet: true });

const { ActivityType } = require('discord.js');

const token = process.env.TOKEN;

if (!token) {
	console.error('Missing TOKEN in .env');
	process.exit(1);
}

const streamUrl = process.env.STREAM_URL || 'https://www.twitch.tv/lofigirl';
const profileId = process.env.PROFILE_ID;

let presenceIndex = 0;
let profileName = 'user';

function setProfileName(name) {
	if (name) {
		profileName = name;
	}
}

function buildPresenceActivities(guild) {
	const serverName = guild?.name || 'server';
	const memberCount = guild?.memberCount ?? 0;

	return [
		{
			name: `with ${profileName}`,
			type: ActivityType.Streaming,
			url: streamUrl,
		},
		{
			name: `with ${serverName} ${memberCount} member!`,
			type: ActivityType.Streaming,
			url: streamUrl,
		},
		{
			name: 'm>help',
			type: ActivityType.Streaming,
			url: streamUrl,
		},
	];
}

function buildPresence(guild) {
	const activities = buildPresenceActivities(guild);
	const activity = activities[presenceIndex % activities.length];

	return {
		status: 'online',
		activities: [activity],
	};
}

function nextPresence(guild) {
	const activities = buildPresenceActivities(guild);
	presenceIndex = (presenceIndex + 1) % activities.length;
	return buildPresence(guild);
}

module.exports = {
	token,
	clientId: process.env.CLIENT_ID,
	guildId: process.env.GUILD_ID,
	channelId:
		process.env.NGBROL_CHANNEL_ID ||
		process.env.NGOBROL_CHANNEL_ID ||
		process.env.CHANNEL_ID,
	welcomeByeChannelId: process.env.WELCOME_BYE_CHANNEL_ID,
	prefix: process.env.PREFIX || 'm>',
	groqApiKey: process.env.GROQ_API_KEY,
	groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
	giphyApiKey: process.env.GIPHY_API_KEY,
	streamUrl,
	profileId,
	setProfileName,
	buildPresence,
	nextPresence,
	presenceRefreshMs: Number(process.env.PRESENCE_REFRESH_MS) || 5 * 60 * 1000,
};

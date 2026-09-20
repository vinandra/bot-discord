require('dotenv').config({ quiet: true });

const { ActivityType } = require('discord.js');

const token = process.env.TOKEN;

if (!token) {
	console.error('Missing TOKEN in .env');
	process.exit(1);
}

const streamUrl = process.env.STREAM_URL || 'https://www.twitch.tv/lofigirl';

function buildPresence(guild) {
	const serverName = guild?.name || 'santuy';
	const memberCount = guild?.memberCount ?? 0;

	return {
		status: 'online',
		activities: [
			{
				name: `with ${serverName} ${memberCount} member`,
				type: ActivityType.Streaming,
				url: streamUrl,
			},
		],
	};
}

module.exports = {
	token,
	clientId: process.env.CLIENT_ID,
	guildId: process.env.GUILD_ID,
	channelId:
		process.env.NGBROL_CHANNEL_ID ||
		process.env.NGOBROL_CHANNEL_ID ||
		process.env.CHANNEL_ID,
	prefix: process.env.PREFIX || 'w!',
	groqApiKey: process.env.GROQ_API_KEY,
	groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
	streamUrl,
	buildPresence,
	presenceRefreshMs: Number(process.env.PRESENCE_REFRESH_MS) || 5 * 60 * 1000,
};

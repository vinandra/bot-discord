require('dotenv').config({ quiet: true });

const { ActivityType } = require('discord.js');

const token = process.env.TOKEN;

if (!token) {
	console.error('Missing TOKEN in .env');
	process.exit(1);
}

module.exports = {
	token,
	clientId: process.env.CLIENT_ID,
	guildId: process.env.GUILD_ID,
	channelId:
		process.env.NGBROL_CHANNEL_ID
		|| process.env.NGOBROL_CHANNEL_ID
		|| process.env.CHANNEL_ID,

	prefix: process.env.PREFIX || 'w!',
	groqApiKey: process.env.GROQ_API_KEY,
	groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
	presence: {
		status: 'idle',
		activities: [
			{
				name: 'with santuy',
				type: ActivityType.Playing,
			},
		],
	},
};

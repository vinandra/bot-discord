const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config');
const { loadSlashCommands, loadPrefixCommands } = require('./utils/loadCommands');
const { loadEvents } = require('./utils/loadEvents');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
	],
});

const { commands } = loadSlashCommands();
client.commands = commands;
client.prefixCommands = loadPrefixCommands();

loadEvents(client);

client.login(token);

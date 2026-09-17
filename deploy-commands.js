const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config');
const { loadSlashCommands } = require('./utils/loadCommands');

if (!clientId) {
	console.error('Missing CLIENT_ID in .env');
	process.exit(1);
}

const { body: commands } = loadSlashCommands();
const rest = new REST().setToken(token);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = guildId
			? await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{ body: commands },
			)
			: await rest.put(
				Routes.applicationCommands(clientId),
				{ body: commands },
			);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	}
	catch (error) {
		console.error(error);
	}
})();

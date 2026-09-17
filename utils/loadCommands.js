const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

function loadSlashCommands(commandsRoot = path.join(__dirname, '..', 'commands', 'slash')) {
	const commands = new Collection();
	const body = [];

	if (!fs.existsSync(commandsRoot)) {
		return { commands, body };
	}

	const folders = fs.readdirSync(commandsRoot);

	for (const folder of folders) {
		const commandsPath = path.join(commandsRoot, folder);

		if (!fs.statSync(commandsPath).isDirectory()) {
			continue;
		}

		const commandFiles = fs
			.readdirSync(commandsPath)
			.filter((file) => file.endsWith('.js'));

		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);

			if ('data' in command && 'execute' in command) {
				commands.set(command.data.name, command);
				body.push(command.data.toJSON());
			}
			else {
				console.log(
					`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
				);
			}
		}
	}

	return { commands, body };
}

function loadPrefixCommands(commandsRoot = path.join(__dirname, '..', 'commands', 'prefix')) {
	const commands = new Collection();

	if (!fs.existsSync(commandsRoot)) {
		return commands;
	}

	const commandFiles = fs
		.readdirSync(commandsRoot)
		.filter((file) => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsRoot, file);
		const command = require(filePath);

		if ('name' in command && 'execute' in command) {
			commands.set(command.name, command);
		}
		else {
			console.log(
				`[WARNING] The prefix command at ${filePath} is missing a required "name" or "execute" property.`,
			);
		}
	}

	return commands;
}

module.exports = {
	loadSlashCommands,
	loadPrefixCommands,
};

const { Events, MessageFlags } = require('discord.js');

function isExpiredInteraction(error) {
	return error?.code === 10062 || error?.code === 40060;
}

async function sendCommandError(interaction) {
	const payload = {
		content: 'There was an error while executing this command!',
		flags: MessageFlags.Ephemeral,
	};

	try {
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(payload);
		}
		else {
			await interaction.reply(payload);
		}
	}
	catch (error) {
		if (!isExpiredInteraction(error)) {
			console.error('Failed to send command error reply:', error);
		}
	}
}

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}

		try {
			await command.execute(interaction);
		}
		catch (error) {
			if (isExpiredInteraction(error)) {
				console.warn(
					`Interaction expired for /${interaction.commandName} (already answered or timed out).`,
				);
				return;
			}

			console.error(error);
			await sendCommandError(interaction);
		}
	},
};

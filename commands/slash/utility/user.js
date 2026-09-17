const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Provides information about the user.'),
	async execute(interaction) {
		await interaction.reply(
			`command ini dijalankan oleh ${interaction.user.username}, yang bergabung pada ${interaction.member.joinedAt}.`,
		);
	},
};

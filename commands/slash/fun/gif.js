const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} = require('discord.js');
const { searchGif } = require('../../../utils/giphy');

const BUTTON_TIMEOUT_MS = 5 * 60 * 1000;

function isExpiredInteraction(error) {
	return error?.code === 10062 || error?.code === 40060;
}

function gifButtons(disabled = false) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('gif_approve')
			.setLabel('Sesuai')
			.setEmoji('✅')
			.setStyle(ButtonStyle.Success)
			.setDisabled(disabled),
		new ButtonBuilder()
			.setCustomId('gif_delete')
			.setLabel('Hapus')
			.setEmoji('🗑️')
			.setStyle(ButtonStyle.Danger)
			.setDisabled(disabled),
	);
}

function approvedButton() {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('gif_approved')
			.setLabel('Sesuai')
			.setEmoji('✅')
			.setStyle(ButtonStyle.Success)
			.setDisabled(true),
	);
}

function attachGifButtons(message, userId) {
	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: BUTTON_TIMEOUT_MS,
		filter: async (button) => {
			if (button.user.id === userId) {
				return true;
			}

			await button.reply({
				content: 'Tombol ini cuma buat yang menjalankan `/gif` ya.',
				flags: MessageFlags.Ephemeral,
			}).catch(() => null);

			return false;
		},
	});

	collector.on('collect', async (button) => {
		try {
			if (button.customId === 'gif_delete') {
				collector.stop('deleted');
				await button.deferUpdate();
				await button.message.delete().catch(() => null);
				return;
			}

			if (button.customId === 'gif_approve') {
				collector.stop('approved');
				await button.update({ components: [approvedButton()] });
			}
		}
		catch (error) {
			console.error('Failed to handle gif button:', error);
		}
	});

	collector.on('end', async (_collected, reason) => {
		if (reason === 'deleted' || reason === 'approved') {
			return;
		}

		await message.edit({ components: [gifButtons(true)] }).catch(() => null);
	});
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gif')
		.setDescription('Cari dan kirim GIF dari GIPHY.')
		.addStringOption((option) =>
			option
				.setName('query')
				.setDescription('Kata kunci GIF, contoh: wonyoung atau liz ive')
				.setRequired(true)
				.setMinLength(1)
				.setMaxLength(50),
		),
	async execute(interaction) {
		await interaction.deferReply();

		const query = interaction.options.getString('query', true).trim();

		if (!query) {
			await interaction.editReply('Masukkan kata kunci GIF-nya dulu ya~');
			return;
		}

		try {
			const gif = await searchGif(query);

			if (!gif) {
				await interaction.editReply(
					`Tidak ketemu GIF untuk **${query}**. Coba kata kunci lain ya~`,
				);
				return;
			}

			const embed = new EmbedBuilder()
				.setColor(0x00FF99)
				.setTitle(gif.title.slice(0, 256))
				.setURL(gif.url)
				.setImage(gif.imageUrl)
				.setFooter({
					text: `GIPHY • ${gif.username} • ${query}`,
				});

			await interaction.editReply({
				embeds: [embed],
				components: [gifButtons()],
			});

			const message = await interaction.fetchReply();
			attachGifButtons(message, interaction.user.id);
		}
		catch (error) {
			if (isExpiredInteraction(error)) {
				console.warn('GIF interaction expired before reply could be sent.');
				return;
			}

			console.error(error);

			if (interaction.deferred || interaction.replied) {
				await interaction.editReply(
					'Gagal ambil GIF sekarang. Coba lagi sebentar ya~',
				).catch(() => null);
			}
		}
	},
};

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { searchGif } = require('../../../utils/giphy');

const REACTION_APPROVE = '✅';
const REACTION_DELETE = '🗑️';
const REACTION_TIMEOUT_MS = 5 * 60 * 1000;

function isExpiredInteraction(error) {
	return error?.code === 10062 || error?.code === 40060;
}

async function attachGifReactions(message, userId) {
	await message.react(REACTION_APPROVE);
	await message.react(REACTION_DELETE);

	const collector = message.createReactionCollector({
		filter: (reaction, user) =>
			!user.bot
			&& user.id === userId
			&& [REACTION_APPROVE, REACTION_DELETE].includes(reaction.emoji.name),
		time: REACTION_TIMEOUT_MS,
	});

	collector.on('collect', async (reaction, user) => {
		try {
			if (reaction.emoji.name === REACTION_DELETE) {
				collector.stop('deleted');
				await message.delete().catch(() => null);
				return;
			}

			if (reaction.emoji.name === REACTION_APPROVE) {
				collector.stop('approved');
				await reaction.users.remove(user.id).catch(() => null);

				const trashReaction = message.reactions.cache.find(
					(item) => item.emoji.name === REACTION_DELETE,
				);

				if (trashReaction) {
					await trashReaction.remove().catch(() => null);
				}
			}
		}
		catch (error) {
			console.error('Failed to handle gif reaction:', error);
		}
	});

	collector.on('end', async (_collected, reason) => {
		if (reason === 'deleted' || reason === 'approved') {
			return;
		}

		await message.reactions.removeAll().catch(() => null);
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

			await interaction.editReply({ embeds: [embed] });

			const message = await interaction.fetchReply();
			await attachGifReactions(message, interaction.user.id);
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

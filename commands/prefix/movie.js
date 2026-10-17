const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
} = require('discord.js');
const { prefix } = require('../../config');
const {
	getTitleDetails,
	mediaKind,
	rankTitles,
	searchTitles,
	shouldAskUser,
	userMessageFor,
} = require('../../utils/tmdb');

const EMBED_COLOR = 9961727;
const BUTTON_TIMEOUT_MS = 5 * 60 * 1000;

function truncate(text, limit) {
	const value = (text || '').replace(/\s+/g, ' ').trim();

	if (value.length <= limit) {
		return value;
	}

	return `${value.slice(0, limit - 1).trim()}…`;
}

function ratingText(details) {
	if (!details.rating) {
		return 'Belum ada rating';
	}

	return `${details.rating.toFixed(1)}/10`;
}

function buildMovieEmbed(details) {
	const overview = truncate(details.overview, 700) || 'Sinopsis belum tersedia.';
	const footerParts = [
		details.year,
		...details.genres,
	].filter(Boolean);

	const embed = new EmbedBuilder()
		.setColor(EMBED_COLOR)
		.setTitle(truncate(details.title, 256))
		.setDescription([
			`**⭐ ${ratingText(details)}**`,
			'',
			overview,
			'',
			`__${details.creditLabel}__`,
			`*${details.creditNames}*`,
		].join('\n'))
		.setFooter({
			text: truncate(footerParts.join(' • '), 2048) || details.kind,
		});

	if (details.posterUrl) {
		embed.setThumbnail(details.posterUrl);
	}

	return embed;
}

function buildDetailMessage(details) {
	const cast = details.cast.length > 0
		? details.cast.join(', ')
		: 'Tidak tercantum';
	const text = [
		`**${details.title}**`,
		'',
		`**Judul asli**\n${details.originalTitle}`,
		`**Rilis**\n${details.releaseDate || details.year || 'Tidak tercantum'}`,
		`**Jenis**\n${details.kind}`,
		`**Durasi**\n${details.runtime || 'Tidak tercantum'}`,
		`**Rating**\n⭐ ${ratingText(details)} • ${details.voteCount.toLocaleString('id-ID')} suara`,
		`**Genre**\n${details.genres.join(', ') || 'Tidak tercantum'}`,
		`**Pemeran**\n${cast}`,
		'',
		`**Sinopsis**\n${truncate(details.overview, 500) || 'Sinopsis belum tersedia.'}`,
	].join('\n');

	return text.slice(0, 2000);
}

function resultButtons() {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('movie_detail')
			.setLabel('Detail')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('movie_trailer')
			.setLabel('Trailer')
			.setStyle(ButtonStyle.Secondary),
	);
}

function choiceButtons(items) {
	return new ActionRowBuilder().addComponents(
		items.slice(0, 5).map((item, index) =>
			new ButtonBuilder()
				.setCustomId(`movie_pick_${index}`)
				.setLabel(truncate(`${index + 1}. ${item.title}`, 80))
				.setStyle(ButtonStyle.Primary),
		),
	);
}

function choiceContent(items) {
	const lines = items.slice(0, 5).map((item, index) => {
		const year = item.year || '—';
		return `${index + 1}. ${item.title}\n   ${year} • ${mediaKind(item)}`;
	});

	return [
		'🌙 Movie Search',
		'',
		'Aku menemukan beberapa hasil:',
		'',
		lines.join('\n\n'),
		'',
		'Pilih yang kamu maksud.',
	].join('\n');
}

function authorOnly(userId) {
	return async (button) => {
		if (button.user.id === userId) {
			return true;
		}

		await button.reply({
			content: 'Tombol ini cuma buat yang menjalankan pencarian.',
			flags: MessageFlags.Ephemeral,
		}).catch(() => null);

		return false;
	};
}

function watchResultButtons(message, userId, details) {
	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: BUTTON_TIMEOUT_MS,
		filter: authorOnly(userId),
	});

	collector.on('collect', async (button) => {
		try {
			if (button.customId === 'movie_detail') {
				await button.reply(buildDetailMessage(details));
				return;
			}

			if (button.customId === 'movie_trailer') {
				await button.reply(
					details.trailerUrl
						? `Trailer **${details.title}**\n${details.trailerUrl}`
						: `Trailer untuk **${details.title}** belum tersedia.`,
				);
			}
		}
		catch (error) {
			console.error('Failed to handle movie button:', error);
		}
	});

	collector.on('end', async () => {
		await message.edit({ components: [] }).catch(() => null);
	});
}

async function showTitle(message, userId, item) {
	const details = await getTitleDetails(item);
	const sent = await message.reply({
		embeds: [buildMovieEmbed(details)],
		components: [resultButtons()],
	});

	watchResultButtons(sent, userId, details);
}

function watchChoices(sent, userId, choices) {
	const collector = sent.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: BUTTON_TIMEOUT_MS,
		filter: authorOnly(userId),
	});

	collector.on('collect', async (button) => {
		const index = Number(button.customId.replace('movie_pick_', ''));
		const selected = choices[index];

		if (!selected) {
			await button.reply({
				content: 'Pilihan itu tidak ada.',
				flags: MessageFlags.Ephemeral,
			}).catch(() => null);
			return;
		}

		try {
			collector.stop('picked');
			await button.deferUpdate();
			const details = await getTitleDetails(selected);
			await button.message.edit({
				content: null,
				embeds: [buildMovieEmbed(details)],
				components: [resultButtons()],
			});
			watchResultButtons(button.message, userId, details);
		}
		catch (error) {
			console.error(error);
			await button.followUp({
				content: userMessageFor(error),
				flags: MessageFlags.Ephemeral,
			}).catch(() => null);
		}
	});

	collector.on('end', async (_collected, reason) => {
		if (reason === 'picked') {
			return;
		}

		await sent.edit({ components: [] }).catch(() => null);
	});
}

module.exports = {
	name: 'movie',
	description: 'Cari film, serial, drakor, atau anime.',
	async execute(message, args) {
		const query = args.join(' ').trim();

		if (!query) {
			await message.reply(`Pakai format: \`${prefix}movie judul\``);
			return;
		}

		await message.channel.sendTyping();

		try {
			const results = await searchTitles(query);

			if (results.length === 0) {
				await message.reply(
					`Aku tidak menemukan judul yang mendekati **${query}**.`,
				);
				return;
			}

			const ranked = rankTitles(query, results).slice(0, 5);

			if (shouldAskUser(ranked)) {
				const sent = await message.reply({
					content: choiceContent(ranked),
					components: [choiceButtons(ranked)],
				});
				watchChoices(sent, message.author.id, ranked);
				return;
			}

			await showTitle(message, message.author.id, ranked[0]);
		}
		catch (error) {
			console.error(error);
			await message.reply(userMessageFor(error));
		}
	},
};

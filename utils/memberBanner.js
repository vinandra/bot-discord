const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { BYE_PATH, WELCOME_PATH, buildWelcomeImage } = require('./welcomeCard');

const EMBED_COLOR = 0xFFFFFF;

function memberLabel(member) {
	return member.displayName || member.user?.globalName || member.user?.username || 'Member';
}

function avatarUrl(member) {
	return member.user?.displayAvatarURL({
		extension: 'png',
		size: 256,
		forceStatic: true,
	});
}

async function buildWelcomeMessage(member) {
	let image = null;

	try {
		image = await buildWelcomeImage(member.user);
	}
	catch (error) {
		console.error('Failed to compose welcome image:', error);
	}

	const file = new AttachmentBuilder(image || WELCOME_PATH, { name: 'welcome.jpg' });
	const embed = new EmbedBuilder()
		.setTitle(`Welcome Into ${member.guild.name}!`)
		.setDescription(
			`Welcome ${member}!\nTempat untuk berkumpul, berbagi informasi, dan membangun komunitas bersama. Silakan kenali server, baca peraturan, dan nikmati waktumu di sini.`,
		)
		.setColor(EMBED_COLOR)
		.setImage('attachment://welcome.jpg')
		.setTimestamp();

	const thumb = avatarUrl(member);
	if (thumb) {
		embed.setThumbnail(thumb);
	}

	return {
		embeds: [embed],
		files: [file],
	};
}

function buildByeMessage(member) {
	const file = new AttachmentBuilder(BYE_PATH, { name: 'bye.jpg' });
	const embed = new EmbedBuilder()
		.setTitle(`Goodbye ${member.guild.name}!`)
		.setDescription(
			`**${memberLabel(member)}** telah meninggalkan server.\nTerima kasih telah menjadi bagian dari komunitas ini. Sampai jumpa di lain kesempatan, dan semoga harimu menyenangkan!`,
		)
		.setColor(EMBED_COLOR)
		.setImage('attachment://bye.jpg')
		.setTimestamp();

	const thumb = avatarUrl(member);
	if (thumb) {
		embed.setThumbnail(thumb);
	}

	return {
		embeds: [embed],
		files: [file],
	};
}

module.exports = {
	buildWelcomeMessage,
	buildByeMessage,
};

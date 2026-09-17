const { askGroq } = require('../../utils/groq');
const { splitMessage } = require('../../utils/splitMessage');
const { prefix } = require('../../config');

module.exports = {
	name: 'tanya',
	description: 'Tanya apa saja ke Wony (AI).',
	async execute(message, args) {
		const question = args.join(' ').trim();

		if (!question) {
			await message.reply(`Pakai format: \`${prefix}tanya pertanyaanmu\``);
			return;
		}

		await message.channel.sendTyping();

		try {
			const answer = await askGroq(question);
			const chunks = splitMessage(answer);

			await message.reply(chunks[0]);

			for (let i = 1; i < chunks.length; i++) {
				await message.channel.send(chunks[i]);
			}
		}
		catch (error) {
			console.error(error);
			await message.reply(
				'Maaf ya, lagi gagal mikir. Coba lagi sebentar lagi ya~',
			);
		}
	},
};

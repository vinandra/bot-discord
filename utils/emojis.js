let emojiListText = '';
const emojiByName = new Map();
const emojiById = new Map();

async function loadBotEmojis(client) {
	const emojis = await client.application.emojis.fetch();

	emojiByName.clear();
	emojiById.clear();

	const lines = [];

	for (const emoji of emojis.values()) {
		emojiByName.set(emoji.name, emoji);
		emojiById.set(emoji.id, emoji);
		lines.push(`{{${emoji.name}}} = ${emoji.name}`);
	}

	emojiListText = lines.join('\n');

	console.log(`Loaded ${emojiByName.size} application emojis`);

	return emojiListText;
}

function getEmojiListText() {
	return emojiListText;
}

function getEmoji(name) {
	const emoji = emojiByName.get(name);
	return emoji ? emoji.toString() : '';
}

function resolveEmoji(nameOrId) {
	return emojiByName.get(nameOrId) || emojiById.get(nameOrId) || null;
}

function toEmojiString(nameOrId) {
	const emoji = resolveEmoji(nameOrId);
	return emoji ? emoji.toString() : '';
}

function sanitizeAiText(text) {
	if (!text) {
		return text;
	}

	const slots = [];

	const park = (nameOrId) => {
		const value = toEmojiString(nameOrId);
		if (!value) {
			return '';
		}

		const index = slots.push(value) - 1;
		return `\u0000EMOJI${index}\u0000`;
	};

	let result = text;

	result = result.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, name) => park(name));

	result = result.replace(/<a?:([a-zA-Z0-9_]+):(\d+)>/g, (match, name, id) => {
		return park(name) || park(id);
	});

	result = result.replace(/<a?:([a-zA-Z0-9_]+)>/g, (match, nameOrId) => park(nameOrId));

	result = result.replace(/(?<![<{]):([a-zA-Z0-9_]+):/g, (match, name) => park(name));

	result = result.replace(/<a?:[^>\s]{0,80}>?/g, '');

	result = result.replace(/\p{Extended_Pictographic}/gu, '');
	result = result.replace(/[\uFE0F\u200D]/g, '');
	result = result.replace(/[ \t]{2,}/g, ' ');
	result = result.replace(/ *\n[ \t]+/g, '\n');

	result = result.replace(/\u0000EMOJI(\d+)\u0000/g, (match, index) => {
		return slots[Number(index)] || '';
	});

	return result.trim();
}

module.exports = {
	loadBotEmojis,
	getEmojiListText,
	getEmoji,
	sanitizeAiText,
};

const botRules = require('../data/bot-rules.json');
const { groqApiKey, groqModel } = require('../config');

function buildSystemPrompt(extraRules = []) {
	const { persona } = botRules;

	return [
		`Kamu adalah ${persona.name}, ${persona.role}.`,
		persona.description,
		`Tone: ${persona.tone}.`,
		`Bahasa: ${persona.language}.`,
		'Gaya ketikan:',
		...persona.typing_style.map((rule) => `- ${rule}`),
		'Aturan umum:',
		...persona.general_rules.map((rule) => `- ${rule}`),
		...extraRules.map((rule) => `- ${rule}`),
	].join('\n');
}

async function askGroq(question, options = {}) {
	if (!groqApiKey) {
		throw new Error('Missing GROQ_API_KEY in .env');
	}

	const response = await fetch(
		'https://api.groq.com/openai/v1/chat/completions',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${groqApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: groqModel,
				messages: [
					{
						role: 'system',
						content: buildSystemPrompt(options.extraRules || []),
					},
					{
						role: 'user',
						content: question,
					},
				],
				temperature: options.temperature ?? 0.7,
				max_tokens: options.maxTokens ?? 1024,
			}),
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Groq API error (${response.status}): ${errorText}`);
	}

	const data = await response.json();
	const answer = data.choices?.[0]?.message?.content?.trim();

	if (!answer) {
		throw new Error('Groq API returned an empty response');
	}

	return answer;
}

async function generateWelcomeGreeting(displayName) {
	return askGroq(
		`Ada member baru bernama "${displayName}" yang baru join server. Tulis sapaan selamat datang yang hangat.`,
		{
			extraRules: [
				'Kamu sedang berperan sebagai penyambut server yang ramah dan antusias.',
				'Tulis sapaan singkat 2-4 kalimat saja.',
				'Jangan gunakan mention Discord seperti <@id> atau @username.',
				'Jangan ulang nama user di awal kalimat jika tidak perlu; fokus ke sambutan yang hangat.',
				'Ajak member baru untuk kenalan dan betah di server dengan gaya naturalmu.',
			],
			temperature: 0.85,
			maxTokens: 300,
		},
	);
}

module.exports = {
	askGroq,
	generateWelcomeGreeting,
};

const fs = require('node:fs');
const path = require('node:path');
const { groqApiKey, groqModel } = require('../config');

const BOT_RULES_PATH = path.join(__dirname, '..', 'data', 'bot-rules.json');

function loadBotRules() {
	const raw = fs.readFileSync(BOT_RULES_PATH, 'utf8');
	return JSON.parse(raw);
}

function stripCustomEmoji(text) {
	return text
		.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '')
		.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '')
		.replace(/[ \t]{2,}/g, ' ')
		.trim();
}

function buildSystemPrompt(extraRules = [], botRules = loadBotRules()) {
	const { persona } = botRules;

	const lines = [
		`Kamu adalah ${persona.name}, ${persona.role}.`,
		persona.description,
		`Tone: ${persona.tone}.`,
		`Bahasa: ${persona.language}.`,
		'WAJIB ikuti seluruh aturan persona di bawah ini untuk setiap respons.',
		'Gaya ketikan:',
		...persona.typing_style.map((rule) => `- ${rule}`),
		'Aturan umum:',
		...persona.general_rules.map((rule) => `- ${rule}`),
		'Ekspresi visual memakai emoji Unicode bawaan saja, misalnya 🙂 🌙 ✨ 🤍.',
		'Jangan pernah memakai custom emoji Discord atau token {{nama}}.',
	];

	if (extraRules.length > 0) {
		lines.push('Aturan tambahan untuk tugas ini:');
		lines.push(...extraRules.map((rule) => `- ${rule}`));
	}

	return lines.join('\n');
}

async function askGroq(question, options = {}) {
	if (!groqApiKey) {
		throw new Error('Missing GROQ_API_KEY in .env');
	}

	const botRules = loadBotRules();
	const timeoutMs = options.timeoutMs ?? 12_000;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	let response;

	try {
		response = await fetch(
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
							content: buildSystemPrompt(options.extraRules || [], botRules),
						},
						{
							role: 'user',
							content: question,
						},
					],
					temperature: options.temperature ?? 0.7,
					max_tokens: options.maxTokens ?? 1024,
				}),
				signal: controller.signal,
			},
		);
	}
	catch (error) {
		if (error?.name === 'AbortError') {
			throw new Error('Groq API timeout');
		}

		throw error;
	}
	finally {
		clearTimeout(timeout);
	}

	if (!response.ok) {
		const errorText = await response.text();

		if (response.status === 429) {
			throw new Error(`Groq API rate limited (429): ${errorText}`);
		}

		throw new Error(`Groq API error (${response.status}): ${errorText}`);
	}

	const data = await response.json();
	const answer = data.choices?.[0]?.message?.content?.trim();

	if (!answer) {
		throw new Error('Groq API returned an empty response');
	}

	return stripCustomEmoji(answer);
}

function getDefaultWelcomeGreeting(serverName) {
	const botRules = loadBotRules();
	const templates = botRules.welcome?.fallback_messages || [
		'Halo! Selamat datang di **{serverName}**, semoga betah banget di sini~',
	];

	const template = templates[Math.floor(Math.random() * templates.length)];

	return template.replaceAll('{serverName}', serverName).trim();
}

async function generateWelcomeGreeting(displayName, serverName) {
	const botRules = loadBotRules();
	const welcomeRules = botRules.welcome?.rules || [];

	return askGroq(
		[
			`Tugas: sambut member baru sesuai persona di bot-rules.`,
			`Nama member: ${displayName}`,
			`Nama server: ${serverName}`,
			`Tulis sapaan selamat datang yang hangat, natural, dan tetap sebagai ${botRules.persona.name}.`,
		].join('\n'),
		{
			extraRules: [
				...welcomeRules,
				`Sebut nama server "${serverName}" secara natural di sapaan.`,
			],
			temperature: 0.85,
			maxTokens: 300,
			timeoutMs: 10_000,
		},
	);
}

module.exports = {
	askGroq,
	generateWelcomeGreeting,
	getDefaultWelcomeGreeting,
	loadBotRules,
};

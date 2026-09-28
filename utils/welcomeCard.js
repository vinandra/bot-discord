const path = require('node:path');
const sharp = require('sharp');

const WELCOME_PATH = path.join(__dirname, '..', 'public', 'welcome.jpg');
const BYE_PATH = path.join(__dirname, '..', 'public', 'bye.jpg');

function circleSvg(size, radius, stroke, strokeWidth) {
	const center = size / 2;

	return Buffer.from(
		`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
			<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
		</svg>`,
	);
}

async function fetchAvatar(user) {
	const url = user.displayAvatarURL({
		extension: 'png',
		size: 512,
		forceStatic: true,
	});
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Avatar fetch failed (${response.status})`);
	}

	return Buffer.from(await response.arrayBuffer());
}

async function roundAvatar(buffer, size) {
	const resized = await sharp(buffer)
		.resize(size, size, { fit: 'cover', position: 'centre' })
		.png()
		.toBuffer();

	const mask = Buffer.from(
		`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
			<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/>
		</svg>`,
	);

	return sharp(resized)
		.composite([{ input: mask, blend: 'dest-in' }])
		.png()
		.toBuffer();
}

async function buildWelcomeImage(user) {
	const base = sharp(WELCOME_PATH);
	const { width, height } = await base.metadata();
	const diameter = Math.round(Math.min(width, height) * 0.4);
	const left = Math.round((width - diameter) / 2);
	const top = Math.round((height - diameter) / 2);
	const ringWidth = Math.max(5, Math.round(diameter * 0.028));

	const avatarBuffer = await fetchAvatar(user);
	const rounded = await roundAvatar(avatarBuffer, diameter);
	const ring = circleSvg(
		diameter,
		(diameter / 2) - (ringWidth / 2),
		'#f4f4f4',
		ringWidth,
	);

	return base
		.composite([
			{ input: rounded, left, top },
			{ input: ring, left, top },
		])
		.jpeg({ quality: 92 })
		.toBuffer();
}

module.exports = {
	WELCOME_PATH,
	BYE_PATH,
	buildWelcomeImage,
};

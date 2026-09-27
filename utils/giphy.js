const { giphyApiKey } = require('../config');

async function searchGif(query) {
	if (!giphyApiKey) {
		throw new Error('Missing GIPHY_API_KEY in .env');
	}

	const params = new URLSearchParams({
		api_key: giphyApiKey,
		q: query.slice(0, 50),
		limit: '25',
		rating: 'pg-13',
		lang: 'en',
	});

	const response = await fetch(
		`https://api.giphy.com/v1/gifs/search?${params.toString()}`,
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`GIPHY API error (${response.status}): ${errorText}`);
	}

	const data = await response.json();
	const results = data?.data || [];

	if (results.length === 0) {
		return null;
	}

	const gif = results[Math.floor(Math.random() * results.length)];
	const imageUrl =
		gif.images?.original?.url
		|| gif.images?.downsized?.url
		|| gif.images?.fixed_height?.url;

	if (!imageUrl) {
		return null;
	}

	return {
		id: gif.id,
		title: gif.title || query,
		url: gif.url || `https://giphy.com/gifs/${gif.id}`,
		imageUrl,
		username: gif.username || 'unknown',
	};
}

module.exports = {
	searchGif,
};

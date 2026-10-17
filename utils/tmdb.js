const Fuse = require('fuse.js');
const { tmdbApiKey } = require('../config');

const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

class TmdbError extends Error {
	constructor(code, message) {
		super(message || code);
		this.code = code;
	}
}

async function tmdb(pathname, params = {}) {
	if (!tmdbApiKey) {
		throw new TmdbError('missing_key', 'Missing TMDB_API_KEY in .env');
	}

	const url = new URL(`https://api.themoviedb.org/3${pathname}`);
	url.searchParams.set('api_key', tmdbApiKey);

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== '') {
			url.searchParams.set(key, String(value));
		}
	}

	let response;

	try {
		response = await fetch(url);
	}
	catch (error) {
		throw new TmdbError('network', error.message);
	}

	if (response.status === 401) {
		throw new TmdbError('unauthorized', 'TMDB API key was rejected');
	}

	if (response.status === 429) {
		throw new TmdbError('rate_limit', 'TMDB rate limit');
	}

	if (!response.ok) {
		throw new TmdbError('http', `TMDB API error (${response.status})`);
	}

	return response.json();
}

function normalizeResult(item, fallbackType) {
	const mediaType = item.media_type || fallbackType;

	if (mediaType !== 'movie' && mediaType !== 'tv') {
		return null;
	}

	const title = item.title || item.name || 'Tanpa judul';
	const originalTitle = item.original_title || item.original_name || title;
	const date = item.release_date || item.first_air_date || '';

	return {
		id: item.id,
		mediaType,
		title,
		originalTitle,
		date,
		year: date.slice(0, 4),
		genreIds: item.genre_ids || [],
		originCountry: item.origin_country || [],
		originalLanguage: item.original_language || '',
		popularity: item.popularity || 0,
	};
}

function dedupeResults(items) {
	const seen = new Set();
	const unique = [];

	for (const item of items) {
		const key = `${item.mediaType}:${item.id}`;

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		unique.push(item);
	}

	return unique;
}

function searchVariants(query) {
	const variants = [query];
	const compact = query.replace(/\s+/g, ' ').trim();

	if (compact.length > 6) {
		variants.push(compact.slice(0, -2));
	}

	return [...new Set(variants)];
}

async function searchTitles(query) {
	const batches = await Promise.all(searchVariants(query).map(async (variant) => {
		const params = {
			query: variant,
			include_adult: 'false',
			language: 'en-US',
			page: '1',
		};

		const [multi, movies, series] = await Promise.all([
			tmdb('/search/multi', params),
			tmdb('/search/movie', params),
			tmdb('/search/tv', params),
		]);

		return [
			...(multi.results || []).map((item) => normalizeResult(item)),
			...(movies.results || []).map((item) => normalizeResult(item, 'movie')),
			...(series.results || []).map((item) => normalizeResult(item, 'tv')),
		];
	}));

	return dedupeResults(batches.flat().filter(Boolean)).slice(0, 20);
}

function rankTitles(query, items) {
	if (items.length === 0) {
		return [];
	}

	const fuse = new Fuse(items, {
		keys: [
			{ name: 'title', weight: 0.75 },
			{ name: 'originalTitle', weight: 0.25 },
		],
		includeScore: true,
		threshold: 0.5,
		ignoreLocation: true,
		minMatchCharLength: 2,
	});

	const ranked = fuse.search(query);

	if (ranked.length === 0) {
		return items.slice(0, 5).map((item) => ({
			...item,
			score: 1,
		}));
	}

	return ranked
		.map((hit) => {
			const popularityBoost = Math.log10((hit.item.popularity || 0) + 1) * 0.12;

			return {
				...hit.item,
				score: hit.score ?? 1,
				confidence: (hit.score ?? 1) - popularityBoost,
			};
		})
		.sort((left, right) => left.confidence - right.confidence);
}

function shouldAskUser(ranked) {
	if (ranked.length === 0) {
		return false;
	}

	if (ranked.length === 1) {
		return ranked[0].score > 0.4;
	}

	const best = ranked[0];
	const second = ranked[1];
	const gap = second.confidence - best.confidence;

	if (best.score > 0.35) {
		return true;
	}

	return gap < 0.08 && second.score <= 0.45;
}

function mediaKind(item) {
	if (item.mediaType === 'movie') {
		return 'Film';
	}

	const countries = item.originCountry || [];
	const genres = item.genres || item.genreIds || [];
	const genreIds = genres.map((genre) => (typeof genre === 'object' ? genre.id : genre));
	const language = item.originalLanguage || '';
	const animated = genreIds.includes(16);

	if (countries.includes('KR') || language === 'ko') {
		return 'Drakor';
	}

	if ((countries.includes('JP') || language === 'ja') && animated) {
		return 'Anime';
	}

	return 'Serial TV';
}

function pickTrailer(videos) {
	const list = videos?.results || [];
	const trailers = list.filter((video) => video.site === 'YouTube' && video.type === 'Trailer');
	const chosen = trailers.find((video) => video.official) || trailers[0];

	if (!chosen?.key) {
		return null;
	}

	return `https://www.youtube.com/watch?v=${chosen.key}`;
}

function creditsOf(data, mediaType) {
	if (mediaType === 'tv') {
		const creators = (data.created_by || []).map((person) => person.name).filter(Boolean);

		if (creators.length > 0) {
			return {
				label: 'Pembuat',
				names: [...new Set(creators)].slice(0, 3).join(', '),
			};
		}
	}

	const directors = (data.credits?.crew || [])
		.filter((person) => person.job === 'Director')
		.map((person) => person.name)
		.filter(Boolean);

	if (directors.length > 0) {
		return {
			label: 'Sutradara',
			names: [...new Set(directors)].slice(0, 3).join(', '),
		};
	}

	return null;
}

function formatDate(value) {
	if (!value) {
		return null;
	}

	const date = new Date(`${value}T00:00:00Z`);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(date);
}

function runtimeLabel(data, mediaType) {
	if (mediaType === 'movie' && data.runtime) {
		return `${data.runtime} menit`;
	}

	const parts = [];

	if (data.number_of_seasons) {
		parts.push(`${data.number_of_seasons} musim`);
	}

	if (data.number_of_episodes) {
		parts.push(`${data.number_of_episodes} episode`);
	}

	const episodeRuntime = data.episode_run_time?.[0] || data.last_episode_to_air?.runtime;

	if (episodeRuntime) {
		parts.push(`${episodeRuntime} menit/episode`);
	}

	return parts.join(' • ') || null;
}

function imageUrl(base, filePath) {
	if (!filePath) {
		return null;
	}

	return `${base}${filePath}`;
}

function toDetails(data, mediaType, trailerUrl) {
	const title = data.title || data.name || 'Tanpa judul';
	const originalTitle = data.original_title || data.original_name || title;
	const date = data.release_date || data.first_air_date || '';
	const credits = creditsOf(data, mediaType);
	const kindSource = {
		mediaType,
		originCountry: data.origin_country || [],
		originalLanguage: data.original_language || '',
		genres: data.genres || [],
	};

	return {
		id: data.id,
		mediaType,
		title,
		originalTitle,
		year: date.slice(0, 4),
		releaseDate: formatDate(date),
		kind: mediaKind(kindSource),
		genres: (data.genres || []).map((genre) => genre.name).filter(Boolean),
		rating: Number(data.vote_average || 0),
		voteCount: data.vote_count || 0,
		overview: data.overview || '',
		runtime: runtimeLabel(data, mediaType),
		creditLabel: credits?.label || 'Sutradara',
		creditNames: credits?.names || 'Tidak tercantum',
		cast: (data.credits?.cast || []).slice(0, 5).map((person) => person.name).filter(Boolean),
		posterUrl: imageUrl(IMAGE_BASE, data.poster_path),
		backdropUrl: imageUrl(BACKDROP_BASE, data.backdrop_path),
		trailerUrl,
	};
}

async function getTitleDetails(item) {
	const path = item.mediaType === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`;
	const [local, english] = await Promise.all([
		tmdb(path, {
			language: 'id-ID',
			append_to_response: 'credits,videos',
		}),
		tmdb(path, {
			language: 'en-US',
			append_to_response: 'videos',
		}),
	]);

	local.overview = local.overview || english.overview || '';
	local.genres = local.genres?.length ? local.genres : english.genres;

	const trailerUrl = pickTrailer(local.videos) || pickTrailer(english.videos);

	return toDetails(local, item.mediaType, trailerUrl);
}

function userMessageFor(error) {
	if (error instanceof TmdbError) {
		if (error.code === 'missing_key') {
			return 'TMDB_API_KEY belum diatur di `.env`.';
		}

		if (error.code === 'unauthorized') {
			return 'Kunci TMDB ditolak. Periksa `TMDB_API_KEY` di `.env`.';
		}

		if (error.code === 'rate_limit') {
			return 'TMDB sedang membatasi permintaan. Coba lagi sebentar lagi.';
		}

		if (error.code === 'network') {
			return 'Aku tidak bisa menghubungi TMDB saat ini. Coba lagi sebentar lagi.';
		}
	}

	return 'Pencarian filmnya gagal. Coba lagi sebentar lagi.';
}

module.exports = {
	TmdbError,
	searchTitles,
	rankTitles,
	shouldAskUser,
	mediaKind,
	getTitleDetails,
	userMessageFor,
};

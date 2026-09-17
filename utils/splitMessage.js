function splitMessage(content, limit = 2000) {
	if (content.length <= limit) {
		return [content];
	}

	const chunks = [];
	let remaining = content;

	while (remaining.length > limit) {
		let splitAt = remaining.lastIndexOf('\n', limit);

		if (splitAt < limit * 0.5) {
			splitAt = remaining.lastIndexOf(' ', limit);
		}

		if (splitAt < limit * 0.5) {
			splitAt = limit;
		}

		chunks.push(remaining.slice(0, splitAt).trim());
		remaining = remaining.slice(splitAt).trim();
	}

	if (remaining.length > 0) {
		chunks.push(remaining);
	}

	return chunks;
}

module.exports = {
	splitMessage,
};

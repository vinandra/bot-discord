const fs = require('node:fs');
const path = require('node:path');

function loadEvents(client, eventsPath = path.join(__dirname, '..', 'events')) {
	const eventFiles = fs
		.readdirSync(eventsPath)
		.filter((file) => file.endsWith('.js'));

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);

		if (!('name' in event) || !('execute' in event)) {
			console.log(
				`[WARNING] The event at ${filePath} is missing a required "name" or "execute" property.`,
			);
			continue;
		}

		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		}
		else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}
}

module.exports = {
	loadEvents,
};

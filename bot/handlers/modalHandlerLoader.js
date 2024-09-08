const path = require('path');
const fs = require('fs');

const modalHandlers = new Map();
const modalsPath = path.resolve(__dirname, '../modals');

try {
	const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
	for (const file of modalFiles) {
		const handler = require(path.join(modalsPath, file));
		if (!handler.data || !handler.data.id) {
			console.error(`Error in file ${file}: Missing 'data' or 'data.id'`);
			continue;
		}
		modalHandlers.set(handler.data.id, handler);
	}
	console.log(`\x1b[32m[Modal]\x1b[0m Loaded ${modalHandlers.size} modal handlers`);
}
catch (error) {
	console.error(`Error loading modal handlers: ${error.message}`);
}

module.exports = modalHandlers;
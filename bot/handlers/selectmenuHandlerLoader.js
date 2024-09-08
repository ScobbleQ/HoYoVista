const path = require('path');
const fs = require('fs');

const buttonHandlers = new Map();
const buttonsPath = path.resolve(__dirname, '../selectmenus');

try {
	const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
	for (const file of buttonFiles) {
		const handler = require(path.join(buttonsPath, file));
		if (!handler.data || !handler.data.id) {
			console.error(`Error in file ${file}: Missing 'data' or 'data.id'`);
			continue;
		}
		buttonHandlers.set(handler.data.id, handler);
	}
	console.log(`\x1b[32m[StringSelectMenu]\x1b[0m Loaded ${buttonHandlers.size} selectmenu handlers`);
}
catch (error) {
	console.error(`Error loading selectmenu handlers: ${error.message}`);
}

module.exports = buttonHandlers;
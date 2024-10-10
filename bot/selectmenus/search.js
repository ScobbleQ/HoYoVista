const SearchJS = require('../commands/search');

module.exports = {
	data: {
		id: 'search',
		description: 'Intergrates with search command',
	},
	async execute(interaction, dbClient, selection) {
		const [_, game, topic, id, select, ...args] = selection.split('_');

		SearchJS.execute(interaction, dbClient, game, topic, id, select, args, true);
	},
};
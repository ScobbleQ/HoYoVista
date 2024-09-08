const { MongoDB } = require('../class/mongo');
const settings = require('../commands/settings');

module.exports = {
	data: {
		id: 'db_auto',
		description: 'Changes auto-checkin settings in your account',
	},
	async execute(interaction, dbClient, buttonId) {
		try {
			const idParts = buttonId.replace('db_auto_', '').split('_');
			const value = idParts[1] === 'true';

			const mongo = new MongoDB(dbClient, interaction.user.id);
			await mongo.setUserPreference(`linkedGamesList.${idParts[0]}.auto_checkin`, value);

			await settings.execute(interaction, dbClient, true, 3);
		}
		catch (error) {
			throw error;
		}
	},
};
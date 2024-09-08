const { MongoDB } = require('../class/mongo');
const settings = require('../commands/settings');

module.exports = {
	data: {
		id: 'db_settings_privacy_btn',
		description: 'Change the privacy settings of your account',
	},
	async execute(interaction, dbClient) {
		const mongo = new MongoDB(dbClient, interaction.user.id);

		const currentPrivacyPreference = await mongo.getUserPreference('settings.isPrivate');
		await mongo.setUserPreference('settings.isPrivate', !currentPrivacyPreference);

		await settings.execute(interaction, dbClient, true, 2);
	},
};
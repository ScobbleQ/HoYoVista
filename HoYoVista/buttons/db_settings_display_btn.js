const { MongoDB } = require('../utils/class/mongo');
const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_settings_display_btn',
        description: 'Change the display settings of your account',
    },
    async execute(interaction, dbClient) {
        const mongo = new MongoDB(dbClient, interaction.user.id);

        const currentDisplayPreference = await mongo.getUserPreference("settings.darkMode");
        await mongo.setUserPreference("settings.darkMode", !currentDisplayPreference);

        await settings.execute(interaction, dbClient, true);
    },
}
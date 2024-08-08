const { getUserDisplayPreference, setUserDisplayPreference } = require('../utils/mongo');
const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_settings_display_btn',
        description: 'Change the display settings of your account',
    },
    async execute(interaction, dbClient) {
        const currentDisplayPreference = await getUserDisplayPreference(dbClient, interaction.user.id);
        await setUserDisplayPreference(dbClient, interaction.user.id, !currentDisplayPreference);

        await settings.execute(interaction, dbClient, true);
    },
}
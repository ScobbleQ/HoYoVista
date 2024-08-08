const { getUserPrivacyPreference, setUserPrivacyPreference } = require('../utils/mongo');
const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_settings_privacy_btn',
        description: 'Change the privacy settings of your account',
    },
    async execute(interaction, dbClient) {
        const currentPrivacyPreference = await getUserPrivacyPreference(dbClient, interaction.user.id);
        await setUserPrivacyPreference(dbClient, interaction.user.id, !currentPrivacyPreference);

        await settings.execute(interaction, dbClient, true);
    },
}
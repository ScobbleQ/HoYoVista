const { getUserNotifPreference, setUserNotifPreference } = require('../utils/mongo');
const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_settings_notif_btn',
        description: 'Change the notification settings of your account',
    },
    async execute(interaction, dbClient) {
        const currentNotifPreference = await getUserNotifPreference(dbClient, interaction.user.id);
        await setUserNotifPreference(dbClient, interaction.user.id, !currentNotifPreference);

        await settings.execute(interaction, dbClient, true);
    },
}
const { MongoDB } = require('../utils/class/mongo');
const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_settings_notif_btn',
        description: 'Change the notification settings of your account',
    },
    async execute(interaction, dbClient) {
        const mongo = new MongoDB(dbClient, interaction.user.id);

        const currentNotifPreference = await mongo.getUserPreference("settings.checkinNotif");
        await mongo.setUserPreference("settings.checkinNotif", !currentNotifPreference);

        await settings.execute(interaction, dbClient, true, 2);
    },
}
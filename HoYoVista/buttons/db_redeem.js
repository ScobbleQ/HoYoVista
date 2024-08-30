const { MongoDB } = require('../class/mongo');
const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_redeem',
        description: 'Changes auto-checkin settings in your account',
    },
    async execute(interaction, dbClient, buttonId) {
        try {
            const idParts = buttonId.replace('db_redeem_', '').split('_');
            const value = idParts[1] === 'true';

            const mongo = new MongoDB(dbClient, interaction.user.id);
            await mongo.setUserPreference(`linkedGamesList.${idParts[0]}.auto_redeem`, value);

            await settings.execute(interaction, dbClient, true, 4);
        } catch (error) {
            throw error;
        }
    },
};
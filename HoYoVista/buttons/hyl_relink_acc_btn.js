const { MongoDB } = require('../utils/class/mongo');
const { HoYoLAB } = require('../utils/class/hoyolab');
const account = require('../commands/account');

module.exports = {
    data: {
        id: 'hyl_relink_acc_btn',
        description: 'Unlinks a game account from HoYoLAB',
    },
    async execute(interaction, dbClient) {
        const mongo = new MongoDB(dbClient, interaction.user.id);
        const data = await mongo.getUserData();
        const { darkMode, isPrivate, checkinNotif } = data.settings;
        const { ltoken_v2, ltuid_v2 } = data.hoyolab;

        await Promise.all([
            mongo.deleteUser(),
            mongo.registerUser(ltoken_v2, ltuid_v2),
        ]);

        const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2);
        await hoyolab.initBasicGameData();

        await Promise.all([
            mongo.updateUserWithGameProfiles(hoyolab.basicGameData),
            mongo.setUserPreference("settings.darkMode", darkMode),
            mongo.setUserPreference("settings.isPrivate", isPrivate),
            mongo.setUserPreference("settings.checkinNotif", checkinNotif),
        ]);

        await account.execute(interaction, dbClient, true);
    },
}
const { EmbedBuilder } = require('discord.js');
const { HoYoLAB } = require('../utils/class/hoyolab');
const { MongoDB } = require('../utils/class/mongo');
const { embedColors } = require('../../config');

module.exports = {
    data: {
        id: 'hyl_add_acc_manual_cookie_modal',
        description: 'Add HoYoLAB Account (Manual) with Cookie',
    },
    async execute(interaction, dbClient) {
        const ltuid_v2 = interaction.fields.getTextInputValue('hyl_acc_cookies_ltuid_v2');
        const ltoken_v2 = interaction.fields.getTextInputValue('hyl_acc_cookies_ltoken_v2');
        const mongo = new MongoDB(dbClient, interaction.user.id);

        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor(embedColors.warning)
                .setDescription('Hang on while we process the information')
            ],
            components: []
        });

        if (await mongo.getUserData()) {
            mongo.deleteUser();
        }

        await mongo.registerUser(ltoken_v2, ltuid_v2);

        const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2);
        const data = await hoyolab.initBasicGameData();
        if (data.retcode !== 0) {
            await interaction.deleteReply();
            await mongo.deleteUser();
            return await interaction.followUp({
                embeds: [new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setDescription('Failed to fetch account data. Please try again.')
                ],
                ephemeral: true
            });
        }

        await mongo.updateUserWithGameProfiles(hoyolab.basicGameData);

        await interaction.deleteReply();
        await interaction.followUp({ 
            embeds: [new EmbedBuilder()
                .setColor(embedColors.success)
                .setTitle('Account Successfully Registered')
                .setDescription('Welcome aboard! To view and manage your account, use `/account`.')
            ], 
            ephemeral: true
        });
    },
}
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { embedColors } = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('Manage your HoYoLAB account'),
    async execute(interaction, dbClient, update = false) {
        const mongo = new MongoDB(dbClient, interaction.user.id);
        const user = await mongo.getUserData();

        if (!user) {
            const embed = new EmbedBuilder()
                .setTitle('Account Manager')
                .setDescription('You don\'t have a HoYoLAB account linked yet. Press the button below to get started.')
                .setColor(embedColors.error);

            const addButton = new ButtonBuilder()
                .setCustomId('hyl_add_acc_btn')
                .setLabel('Add HoYoLAB Account')
                .setStyle(ButtonStyle.Primary);

            return await interaction.reply({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(addButton)],
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Account Manager')
            .setDescription('The following games were fetched from your HoYoLAB account~\n`Unlink`: Deletes all your HoYoLAB data.\n`Delete Message`: Deletes this message.')
            .setColor(embedColors.default);

        const games = {
            'genshin': 'Genshin Impact',
            'honkai3rd': 'Honkai Impact 3rd',
            'hkrpg': 'Honkai: Star Rail',
            'zzz': 'Zenless Zone Zero'
        };

        for (const [gameName, gameData] of Object.entries(user.linkedGamesList)) {
            if (gameName !== 'db') {
                embed.addFields({
                    name: games[gameName],
                    value: `${gameData.nickname} | Lv. ${gameData.level}\nUID: ${gameData.uid}\n${gameData.region_name}`,
                    inline: true,
                });
            }
        }

        const unlinkButton = new ButtonBuilder()
            .setCustomId(`db_unlink_hyl_${interaction.user.id}`)
            .setLabel('Unlink')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(unlinkButton);

        if (!user.settings.isPrivate) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('delete_button')
                    .setLabel('Delete Message')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        const responseOptions = {
            embeds: [embed],
            components: [actionRow],
            ephemeral: user.settings.isPrivate,
        };

        update ? await interaction.update(responseOptions) : await interaction.reply(responseOptions);
    },
};
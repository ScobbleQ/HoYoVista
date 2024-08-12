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
            const NAF_Embed = new EmbedBuilder()
                .setTitle('Account Manager')
                .setDescription('You don\'t have a HoYoLAB account linked yet.')
                .setColor(embedColors.error);

            const addButton = new ButtonBuilder()
                .setCustomId('hyl_add_acc_btn')
                .setLabel('Add HoYoLAB Account')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(addButton);

            return interaction.reply({ embeds: [NAF_Embed], components: [row], ephemeral: true });
        }

        const games = {
            'genshin': 'Genshin Impact',
            'honkai3rd': 'Honkai Impact 3rd',
            'hkrpg': 'Honkai: Star Rail',
            'zzz': 'Zenless Zone Zero'
        };

        const embed = new EmbedBuilder()
            .setTitle('Account Manager')
            .setDescription('The following games were found linked to your HoYoLAB:\n`Relink`: Removed accounts will be added back.\n`Unlink`: Deletes all your HoYoLAB data from our database.\n`Delete Message`: Deletes this message.\n`Game Names`: Deletes specific game account from our database.')
            .setColor(embedColors.default);

        const unlinkButtons = Object.entries(user.linkedGamesList).map(([gameName, gameData]) => {
            embed.addFields({
                name: `${games[gameName]}`,
                value: `${gameData.nickname} | Lv. ${gameData.level}\n${gameData.uid}\n${gameData.region_name}`,
                inline: true
            });

            return new ButtonBuilder()
                .setCustomId(`db_unlink_hyl_${interaction.user.id}_${gameName}`)
                .setLabel(`${games[gameName]}`)
                .setStyle(ButtonStyle.Secondary);
        });

        const relinkButton = new ButtonBuilder()
            .setCustomId('hyl_relink_acc_btn')
            .setLabel('Relink')
            .setStyle(ButtonStyle.Primary);

        const unlinkButton = new ButtonBuilder()
            .setCustomId(`db_unlink_hyl_${interaction.user.id}`)
            .setLabel('Unlink')
            .setStyle(ButtonStyle.Secondary);

        const deleteButton = new ButtonBuilder()
            .setCustomId('delete_button')
            .setLabel('Delete Message')
            .setStyle(ButtonStyle.Danger);

        const rows = [
            new ActionRowBuilder().addComponents(relinkButton, unlinkButton, deleteButton),
            new ActionRowBuilder().addComponents(...unlinkButtons)
        ];

        const isPrivate = await mongo.getUserPreference("settings.isPrivate");
        const responseOptions = { embeds: [embed], components: rows, ephemeral: isPrivate };

        if (update) {
            return interaction.update(responseOptions);
        }
        await interaction.reply(responseOptions);
    },
};
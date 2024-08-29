const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { embedColors } = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('Manage your HoYoLAB account'),
    async execute(interaction, dbClient, update = false) {
        try {
            const mongo = new MongoDB(dbClient, interaction.user.id);
            const user = await mongo.getUserData();

            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setDescription('No HoYoLAB account linked. Press the button below to get started.');

                const addButton = new ButtonBuilder()
                    .setCustomId('hyl_add_acc_btn')
                    .setLabel('Add HoYoLAB Account')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:AddUser:1276998947977826365>');

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

            const relinkButton = new ButtonBuilder()
                .setCustomId('hyl_add_acc_btn')
                .setLabel('Relink Account')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<:AddLink:1277001741178503190>');

            const unlinkButton = new ButtonBuilder()
                .setCustomId(`db_unlink_hyl_${interaction.user.id}`)
                .setLabel('Unlink Account')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('<:BrokenLink:1277001253171363920>');

            const actionRow = new ActionRowBuilder().addComponents(relinkButton, unlinkButton);

            const responseOptions = {
                embeds: [embed],
                components: [actionRow],
                ephemeral: user.settings.isPrivate,
            };

            update ? await interaction.update(responseOptions) : await interaction.reply(responseOptions);
        } catch (error) {
            throw error;
        }
    },
};
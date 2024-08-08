const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { checkIfUserExists, getUserData, getUserPrivacyPreference } = require('../utils/mongo');
const { embedColors } = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('account')
		.setDescription('Manage your HoYoLAB account'),
	async execute(interaction, dbClient) {
		if (!await checkIfUserExists(dbClient, interaction.user.id)) {
            const NAF_Embed = new EmbedBuilder()
                .setTitle('Account Manager')
                .setDescription('You don\'t have a HoYoLAB account linked yet.')
                .setColor(embedColors.error);

            const addButton = new ButtonBuilder()
                .setCustomId('hyl_add_acc_btn')
                .setLabel('Add HoYoLAB Account')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(addButton);

            await interaction.reply({ embeds: [NAF_Embed], components: [row], ephemeral: true });
            return;
        }

        const user = await getUserData(dbClient, interaction.user.id);
        const games = {
            'gi': 'Genshin Impact',
            'hi3': 'Honkai Impact 3rd',
            'hsr': 'Honkai: Star Rail',
            'zzz': 'Zenless Zone Zero'
        };
        const unlinkButtons = [];

        const embed = new EmbedBuilder()
        .setTitle('Account Manager')
        .setDescription('The following game accounts are linked to your HoYoLAB account. To unlink, click the corresponding button.\nNote: Unlinking HoYoLAB account will remove all linked game accounts.')
        .setColor(embedColors.default);

        for (const [gameCode, gameName] of Object.entries(games)) {
            if (user.hoyoverse[gameCode]) {
                const gameData = user.hoyoverse[gameCode];
                embed.addFields({
                    name: `${gameName}`, 
                    value: `Nickname: ${gameData.username}\nUID: ${gameData.uid}`, 
                    inline: false
                });
        
                unlinkButtons.push(new ButtonBuilder()
                    .setCustomId(`db_unlink_hyl_${interaction.user.id}_${gameData.uid}`)
                    .setLabel(`${gameName}`)
                    .setStyle(ButtonStyle.Secondary));
            }
        };

        const relinkButton = new ButtonBuilder()
            .setCustomId('hyl_relink_acc_btn')
            .setLabel('Re-link HoYoLAB')
            .setStyle(ButtonStyle.Primary);

        const unlinkButton = new ButtonBuilder()
            .setCustomId(`db_unlink_hyl_${interaction.user.id}`)
            .setLabel('Unlink HoYoLAB')
            .setStyle(ButtonStyle.Secondary);

        const deleteButton = new ButtonBuilder()
            .setCustomId(`delete_button`)
            .setLabel('Delete Message')
            .setStyle(ButtonStyle.Danger);

        const rows = [
            new ActionRowBuilder().addComponents(relinkButton, unlinkButton, deleteButton),
            new ActionRowBuilder().addComponents(...unlinkButtons)
        ];

        // Send ephemeral if user has set their profile to private
        if (await getUserPrivacyPreference(dbClient, interaction.user.id)) {
            await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
            return;
        }

        await interaction.reply({ embeds: [embed], components: rows });
	},
};
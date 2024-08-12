const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { HoYoLAB } = require('../utils/class/hoyolab');
const { embedColors } = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-in')
        .setDescription('Daily check-in from HoYoLAB')
        .addStringOption(option => option
            .setName('game')
            .setDescription('The game to check-in for')
            .setRequired(false)
            .addChoices(
                { name: 'Every Linked Game', value: 'all' },
                { name: 'Honkai Impact 3rd', value: 'honkai3rd' },
                { name: 'Genshin Impact', value: 'genshin' },
                { name: 'Honkai: Star Rail', value: 'hkrpg' },
                { name: 'Zenless Zone Zero', value: 'zzz' }
            )),
    
    async execute(interaction, dbClient) {
        const selectedGame = interaction.options.getString('game') || 'all';
        const mongo = new MongoDB(dbClient, interaction.user.id);

        if (!await mongo.checkIfUserExists()) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setDescription('You don\'t have a HoYoLAB account linked yet.')
                ],
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        const user = await mongo.getUserData();
        const hoyolab = new HoYoLAB(user.hoyolab.ltoken_v2, user.hoyolab.ltuid_v2);

        const gamesToCheck = selectedGame === 'all'
            ? Object.keys(user.linkedGamesList)
            : [selectedGame];

        if (!await mongo.isGameLinked(gamesToCheck[0])) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(embedColors.error)
                    .setDescription('You don\'t have this game linked to your HoYoLAB account.')
                ],
                ephemeral: true,
            });
        }

        const privacy = await mongo.getUserPreference("settings.isPrivate");
        const checkinPromises = gamesToCheck.map(game => hoyolab.checkInGame(game, user, privacy));
        const checkinEmbeds = await Promise.all(checkinPromises);

        await interaction.editReply({ embeds: [checkinEmbeds.shift()] });
        for (const embed of checkinEmbeds) {
            if (embed) {
                if (interaction.inCachedGuild()) {
                    await interaction.channel.send({ embeds: [embed] });
                } else {
                    await interaction.client.users.send(interaction.user.id, { embeds: [embed] });
                }
            }
        }
    },
};
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { embedColors } = require('../../config');
const { HoYoLAB } = require('../utils/class/hoyolab');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem code(s) for selected game')
        .addStringOption(option => option
            .setName('game')
            .setDescription('The game to redeem the code for')
            .setRequired(false)
            .addChoices(
                { name: 'Every Game', value: 'all' },
                { name: 'Genshin Impact', value: 'genshin' },
                { name: 'Honkai: Star Rail', value: 'hkrpg' },
                { name: 'Zenless Zone Zero', value: 'zzz' }))
        .addStringOption(option => option
            .setName('code')
            .setDescription('The code(s) to redeem, use | to separate multiple codes')
            .setRequired(false)),
    async execute(interaction, dbClient) {
        try {
            const selectedGame = interaction.options.getString('game') || 'all';
            let code = interaction.options.getString('code') || [null];
            const mongo = new MongoDB(dbClient, interaction.user.id);
            const user = await mongo.getUserData();

            if (!user) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.error)
                        .setDescription('You don\'t have a HoYoLAB account linked yet.')
                    ],
                    ephemeral: true,
                });
            }

            await interaction.deferReply();
            const { ltoken_v2, ltuid_v2, cookie_token_v2, ltmid_v2 } = user.hoyolab;
            const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2, cookie_token_v2, ltmid_v2);

            const gamesToCheck = selectedGame === 'all'
                ? Object.keys(user.linkedGamesList).filter(game => game !== 'honkai3rd')
                : [selectedGame];

            if (!mongo.isGameLinked(gamesToCheck[0])) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.error)
                        .setDescription('You don\'t have this game linked to your HoYoLAB account.')
                    ],
                    ephemeral: true,
                });
            }

            const codes = {};
            if (code.length === 1 && code[0] === null) {
                const games = ['genshin', 'hkrpg', 'nap'];

                for (const game of games) {
                    const url = `https://hoyo-codes.seriaati.xyz/codes?game=${game}`;
                    const data = await axios.get(url);
                    const gameCodeKey = game === 'nap' ? 'zzz' : game;
                    codes[gameCodeKey] = data.data.codes.map(codeObj => codeObj.code);
                }

                for (const [game, gameData] of Object.entries(user.linkedGamesList)) {
                    if (game === 'genshin' && gameData.auto_redeem) {
                        const redeemedCodes = Array.isArray(gameData.codes) ? gameData.codes : [];
                        code = codes[game].filter(code => !redeemedCodes.includes(code));
                    }
                }
            } else {
                code = code.split('|').map(code => code.trim());
            }

            const privacy = await mongo.getUserPreference("settings.isPrivate");

            if (code.length === 0) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.error)
                        .setDescription('No codes were available to redeem.')
                    ],
                    ephemeral: privacy,
                });
            }

            const checkinPromises = gamesToCheck.map(game => hoyolab.redeemAllCodes(game, user, privacy, code));
            const checkinEmbeds = await Promise.all(checkinPromises);
            const flattenedEmbeds = checkinEmbeds.flat().filter(embed => embed.length > 0);

            await interaction.editReply({ embeds: flattenedEmbeds, ephemeral: privacy });
        } catch (error) {
            throw error;
        }
    },
}
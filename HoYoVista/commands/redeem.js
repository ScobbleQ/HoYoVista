const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoDB } = require('../utils/class/mongo');
const { HoYoLAB } = require('../utils/class/hoyolab');
const { getAvailableCodes } = require('../utils/getAvailableCodes');
const { embedColors } = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem code(s) for selected game')
        .addStringOption(option => option
            .setName('game')
            .setDescription('The game to redeem the code for')
            .setRequired(true)
            .addChoices(
                { name: 'Genshin Impact', value: 'genshin' },
                { name: 'Honkai: Star Rail', value: 'hkrpg' },
                { name: 'Zenless Zone Zero', value: 'zzz' }))
        .addStringOption(option => option
            .setName('code')
            .setDescription('The code(s) to redeem, use | to separate multiple codes')
            .setRequired(false)),
    async execute(interaction, dbClient) {
        try {
            const selectedGame = interaction.options.getString('game');
            let userCode = interaction.options.getString('code') || [null];

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

            if (!user.linkedGamesList[selectedGame]) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.error)
                        .setDescription('You don\'t have this game linked to your HoYoLAB account.')
                    ],
                    ephemeral: true,
                });
            }

            await interaction.deferReply();

            const { ltoken_v2, ltuid_v2, ltmid_v2, stoken } = user.hoyolab;
            const hoyolab = new HoYoLAB(ltoken_v2, ltuid_v2, ltmid_v2, stoken);

            if (userCode.length === 1 && userCode[0] === null) {
                userCode = await getAvailableCodes();

                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.warning)
                        .setDescription(`Hang on while we check ${userCode[selectedGame].length} code(s)`)
                    ],
                });

                const gameData = user.linkedGamesList[selectedGame];
                const redeemedCodes = Array.isArray(gameData.codes) ? gameData.codes : [];
                userCode = {
                    [selectedGame]: userCode[selectedGame].filter(code => !redeemedCodes.includes(code))
                };
            } else {
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.warning)
                        .setDescription('Hang on while we try to redeem the code(s)')
                    ],
                });

                userCode = { [selectedGame]: userCode.split('|').map(code => code.trim()) };
            }

            const privacy = await mongo.getUserPreference("settings.isPrivate");

            if (!Object.keys(userCode).length || !userCode[selectedGame].length) {
                return await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.error)
                        .setDescription('No codes were available to redeem.')
                    ],
                    ephemeral: privacy,
                });
            }

            const redeemEmbeds = (await hoyolab.redeemAllCodes(dbClient, user, privacy, userCode)).flat();

            if (redeemEmbeds.length) {
                const chunkSize = 10;
                for (let i = 0; i < redeemEmbeds.length; i += chunkSize) {
                    const chunk = redeemEmbeds.slice(i, i + chunkSize);
                    if (i === 0) {
                        await interaction.editReply({ embeds: chunk, ephemeral: privacy });
                    } else {
                        await interaction.followUp({ embeds: chunk, ephemeral: privacy });
                    }
                }
            }
        } catch (error) {
            throw error;
        }
    },
}
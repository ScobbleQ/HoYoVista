const { EmbedBuilder } = require('discord.js');
const { MongoDB } = require('../class/mongo');
const { embedColors } = require('../../config');
const account = require('../commands/account');

module.exports = {
    data: {
        id: 'db_unlink_hyl',
        description: 'Unlink your HoYoLAB account',
    },
    async execute(interaction, dbClient, buttonId) {
        try {
            const idParts = buttonId.replace('db_unlink_hyl_', '').split('_');

            if (idParts.length === 1) {
                await MongoDB.deleteUser(dbClient, idParts[0]);

                await interaction.message.edit({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.success)
                        .setTitle('HoYoLAB Data Unlinked')
                        .setDescription('Your HoYoLAB data has been successfully unlinked.')
                    ],
                    components: []
                });
            } else if (idParts.length === 2) {
                const [discordId, gameName] = idParts;
                await MongoDB.deleteGame(dbClient, discordId, gameName);

                await account.execute(interaction, dbClient, true);

                await interaction.followUp({
                    embeds: [new EmbedBuilder()
                        .setColor(embedColors.success)
                        .setTitle('Game Data Unlinked')
                        .setDescription(`Your data for \`${gameName}\` has been successfully unlinked.`)
                    ],
                    ephemeral: true
                });
            }
        } catch (error) {
            throw error;
        }
    },
};
const settings = require('../commands/settings');

module.exports = {
    data: {
        id: 'db_unlink_hyl',
        description: 'Unlink your HoYoLAB account',
    },
    async execute(interaction, dbClient, buttonId) {
        const idParts = buttonId.replace('db_unlink_hyl', '').split('_');

        if (idParts.length === 1) {
            await MongoDB.deleteUser(dbClient, idParts[0]);

            await interaction.message.edit({
                embeds: [new EmbedBuilder()
                    .setColor(config.embedColors.success)
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
                    .setColor(config.embedColors.success)
                    .setTitle('Game Data Unlinked')
                    .setDescription(`Your data for \`${gameName}\` has been successfully unlinked.`)
                ],
                ephemeral: true
            });
        }
    },
};
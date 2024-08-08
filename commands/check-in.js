const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkIfUserExists, getUserData, getSpecificProjection, getUserPrivacyPreference } = require('../utils//mongo');
const { hoyolabCheckin, checkinEveryGame, getCheckinInfo } = require('../utils//hoyolab');
const { getGameUrl } = require('../utils/getGameUrl');
const { censorUid, censorUsername } = require('../utils/censorInformation');
const { embedColors } = require('../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('check-in')
		.setDescription('Daily check-in from HoYoLAB')
        .addStringOption(option => option
            .setName('game')
            .setDescription('The game to check-in for')
            .setRequired(false)
            .addChoices(
                { name: 'Honkai Impact 3rd', value: 'hi3' },
                { name: 'Genshin Impact', value: 'gi' },
                { name: 'Honkai: Star Rail', value: 'hsr' },
                { name: 'Zenless Zone Zero', value: 'zzz' },
                { name: 'Every Linked Game', value: 'all' }
            )),
	async execute(interaction, dbClient) {
        await interaction.deferReply();

		const selectedGame = interaction.options.getString('game') || 'all';

        const gameNames = {
			hi3: 'Honkai Impact 3rd',
			gi: 'Genshin Impact',
			hsr: 'Honkai: Star Rail',
			zzz: 'Zenless Zone Zero'
		};
		
		const selectedGameName = gameNames[selectedGame] || 'all';

        if (!await checkIfUserExists(dbClient, interaction.user.id)) {
            const NAF_Embed = new EmbedBuilder()
                .setTitle('No Account Found')
                .setDescription('You don\'t have any accounts found in the database. Please register first.')
                .setColor(embedColors.error);
            await interaction.editReply({ embeds: [NAF_Embed] });
            return;
        }

        if (selectedGame === 'all') {
            await checkinEveryGame(interaction, dbClient, interaction.user.id);
            return;
        }

        const user = await getUserData(dbClient, interaction.user.id);
        const { ltoken_v2, ltuid_v2 } = user.hoyoverse.hoyolab;

        const database = await getSpecificProjection(dbClient, interaction.user.id, selectedGame.toLowerCase());
        let { username, uid } = database.hoyoverse[selectedGame.toLowerCase()];

        if (await getUserPrivacyPreference(dbClient, interaction.user.id)) {
            username = censorUsername(username);
            uid = censorUid(uid);
        }

        if (await hoyolabCheckin(selectedGameName, ltoken_v2, ltuid_v2) === 0) {
            const { award } = await getCheckinInfo(selectedGameName, ltoken_v2, ltuid_v2);

            const checkinEmbed = new EmbedBuilder()
                .setColor(embedColors.default)
                .setTitle('Daily Check-in Reward Claimed')
                .setAuthor({ name: `${username} (${uid})`, iconURL: await getGameUrl(selectedGameName).logo })
                .setDescription(`${award.name} x${award.cnt}`)
                .setThumbnail(award.icon);

            await interaction.editReply({ embeds: [checkinEmbed] });
        } else {
            const checkinEmbed = new EmbedBuilder()
                .setColor(embedColors.error)
                .setTitle('Daily Check-in Failed')
                .setAuthor({ name: `${username} (${uid})`, iconURL: await getGameUrl(selectedGameName).logo })
                .setDescription('You have already claimed your daily check-in reward for today.');

            await interaction.editReply({ embeds: [checkinEmbed] });
        }
	},
};
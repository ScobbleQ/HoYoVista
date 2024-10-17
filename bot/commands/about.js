const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, userMention } = require('discord.js');
const config = require('../../config');
const package = require('../../package');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setDescription('Shows information on the bot')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	async execute(interaction) {
		try {
			const [guildCounts, nodeVersion, memoryUsage, cpuUsage, apiLatency] = await Promise.all([
				interaction.client.shard.fetchClientValues('guilds.cache.size').then(results => results.reduce((acc, guildCount) => acc + guildCount, 0)),
				process.versions.node,
				(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
				(process.cpuUsage().system / 1000).toFixed(2),
				Date.now() - interaction.createdTimestamp,
			]);

			const botRuntime = formatSeconds(interaction.client.uptime / 1000);

			const aboutEmbed = new EmbedBuilder()
				.setColor(config.embedColors.default)
				.setTitle(`${interaction.client.user.username} Information`)
				.setDescription(`${package.description}\n${formatCode(`Name: ${interaction.client.user.tag} [${interaction.client.user.id}]\nAPI: ${interaction.client.ws.ping}ms\nRuntime: ${botRuntime}`)}`)
				.addFields(
					{
						name: 'Bot Stats',
						value: formatCode(`Guilds: ${guildCounts}\nNodeJS: v${nodeVersion}\n${package.name}: v${package.version}`),
						inline: true,
					},
					{
						name: 'Resource Stats',
						value: formatCode(`Memory: ${memoryUsage} MB\nCPU: ${cpuUsage}%\nLatency: ${apiLatency}ms`),
						inline: true,
					},
					{
						name: 'Acknowledgement/Credits',
						value: `This bot could not be made possible without the following recourses:\n- ${userMention('410036441129943050')}'s code API: https://github.com/seriaati/hoyo-codes\n- Hakush.in API: https://hakush.in\n- KQM Guides: https://discord.gg/keqing`,
						inline: false,
					},
				);

			const directory = new ButtonBuilder()
				.setLabel('Directory')
				.setURL(`https://discord.com/application-directory/${interaction.client.user.id}`)
				.setStyle(ButtonStyle.Link);
			const github = new ButtonBuilder()
				.setLabel('GitHub')
				.setURL('https://github.com/ScobbleQ/HoYoVista')
				.setStyle(ButtonStyle.Link);
			const docu = new ButtonBuilder()
				.setLabel('Docs')
				.setURL('https://xentriom.gitbook.io/hoyovista/')
				.setStyle(ButtonStyle.Link);
			const inv = new ButtonBuilder()
				.setLabel('Server')
				.setURL('https://discord.gg/WATyv9tkFC')
				.setStyle(ButtonStyle.Link);
			const row = new ActionRowBuilder().addComponents(directory, github, docu, inv);

			await interaction.reply({ embeds: [aboutEmbed], components: [row] });
		}
		catch (error) {
			throw error;
		}
	},
};

function formatCode(text) {
	return `\`\`\`yml\n${text}\`\`\``;
}

function formatSeconds(n) {
	const days = Math.floor(n / 86400);
	const hours = Math.floor(n % 86400 / 3600);
	const minutes = Math.floor(n % 3600 / 60);
	const seconds = Math.floor(n % 60);

	if (days === 0 && hours === 0 && minutes === 0) return `${seconds} Secs`;
	if (days === 0 && hours === 0) return `${minutes} Mins • ${seconds} Secs`;
	if (days === 0) return `${hours} Hrs • ${minutes} Mins • ${seconds} Secs`;
	return `${days} Days • ${hours} Hrs • ${minutes} Mins • ${seconds} Secs`;
}
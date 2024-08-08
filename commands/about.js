const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const os = require('os');
const config = require('../config');
const package = require('../package.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Shows information on the bot'),
    async execute(interaction) {
        try {
            const botRuntime = formatSeconds(interaction.client.uptime / 1000);
            const guilds = interaction.client.guilds.cache.size;
            const nodeVersion = process.versions.node;
            const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const cpuUsage = (process.cpuUsage().system / 1000).toFixed(2);
            const apiLatency = Date.now() - interaction.createdTimestamp;
            const platform = os.platform() + " " + os.release();
            const cpuInfo = `${os.cpus().length}x ${os.cpus()[0].model} @ ${os.cpus()[0].speed}MHz`;
            const systemUptime = formatSeconds(os.uptime());

            const aboutEmbed = new EmbedBuilder()
                .setColor(config.embedColors.default)
                .setTitle(`${interaction.client.user.username} Information`)
                .setDescription(`${package.description}\n${formatCode(`Name: ${interaction.client.user.tag} [${interaction.client.user.id}]\nAPI: ${interaction.client.ws.ping}ms\nRuntime: ${botRuntime}`)}`)
                .addFields(
                    {
                        name: "Bot Stats",
                        value: formatCode(`Guilds: ${guilds}\nNodeJS: v${nodeVersion}\n${package.name}: v${package.version}`),
                        inline: true
                    },
                    {
                        name: "Resource Stats",
                        value: formatCode(`Memory: ${memoryUsage} MB\nCPU: ${cpuUsage}%\nLatency: ${apiLatency}ms`),
                        inline: true
                    },
                    {
                        name: "System Stats",
                        value: formatCode(`Operating System: ${platform}\nCPU Info: ${cpuInfo}\nUptime: ${systemUptime}`),
                        inline: false
                    }
                );

            const docu = new ButtonBuilder()
                .setLabel('Documentation')
                .setURL('https://xentriom.gitbook.io/hoyovista/')
                .setStyle(ButtonStyle.Link);
            const inv = new ButtonBuilder()
                .setLabel('Server')
                .setURL('https://discord.gg/WATyv9tkFC')
                .setStyle(ButtonStyle.Link);
            const row = new ActionRowBuilder().addComponents(docu, inv);

            await interaction.reply({ embeds: [aboutEmbed], components: [row] });
        }
        catch (error) {
            console.error(`\x1b[31m[ERROR]\x1b[0m ${error} @ ${interaction.commandName}.js`);
            return;
        }
    },
}

function formatCode(text) {
    return `\`\`\`yml\n${text}\`\`\``;
}

function formatSeconds(n) {
    let days = Math.floor(n / 86400);
    let hours = Math.floor(n % 86400 / 3600);
    let minutes = Math.floor(n % 3600 / 60);
    let seconds = Math.floor(n % 60);

    if (days === 0 && hours === 0 && minutes === 0) return `${seconds} Secs`;
    if (days === 0 && hours === 0) return `${minutes} Mins • ${seconds} Secs`;
    if (days === 0) return `${hours} Hrs • ${minutes} Mins • ${seconds} Secs`;
    return `${days} Days • ${hours} Hrs • ${minutes} Mins • ${seconds} Secs`;
}
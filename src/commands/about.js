import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { readFileSync } from 'node:fs';
import { primaryEmbed } from '../utils/embedTemplates.js';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));

export default {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Learn more about the bot and its features')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async execute(interaction) {
        const embed = primaryEmbed({
            title: 'About HoYoVista',
            message:
                'HoYoVista is a multipurpose Discord bot designed to enhance your gaming experience across various HoYoverse titles.',
            fields: [
                {
                    name: 'Guild Count',
                    value: `${await interaction.client.shard.fetchClientValues('guilds.cache.size').then((results) => results.reduce((acc, guildCount) => acc + guildCount, 0))}`,
                    inline: true,
                },
                { name: 'Developer', value: packageJson.author, inline: true },
                { name: 'Version', value: packageJson.version, inline: true },
                { name: 'Node.js', value: process.version, inline: true },
                { name: 'Discord.js', value: packageJson.dependencies['discord.js'], inline: true },
                {
                    name: 'Uptime',
                    value: `<t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`,
                    inline: true,
                },
            ],
        });

        const directory = new ButtonBuilder()
            .setLabel('Directory')
            .setURL(`https://discord.com/application-directory/${interaction.client.user.id}`)
            .setStyle(ButtonStyle.Link);
        const github = new ButtonBuilder()
            .setLabel('GitHub')
            .setURL(packageJson.repository.url)
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

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    },
};

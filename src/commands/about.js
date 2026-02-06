import { readFileSync } from 'node:fs';
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js';

const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
);

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Learn more about the bot and its features')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const guildCountPromise =
      await interaction.client.shard?.fetchClientValues('guilds.cache.size');
    const guildCount = guildCountPromise
      ? guildCountPromise.reduce((acc, guildCount) => Number(acc) + Number(guildCount), 0)
      : interaction.client.guilds.cache.size;

    const container = new ContainerBuilder();

    const aboutTextDisplay = new TextDisplayBuilder().setContent(
      [
        '## About HoYoVista',
        'HoYoVista is a multipurpose Discord bot designed to enhance your gaming experience across various HoYoverse titles.',
      ].join('\n')
    );
    container.addTextDisplayComponents(aboutTextDisplay);

    container.addSeparatorComponents((separator) => separator);

    const fields = [
      {
        name: 'Guild Count',
        value: `${guildCount}`,
      },
      {
        name: 'Developer',
        value: packageJson.author,
      },
      {
        name: 'Version',
        value: packageJson.version,
      },
      {
        name: 'Node.js',
        value: process.version,
      },
      {
        name: 'Discord.js',
        value: packageJson.dependencies['discord.js'],
      },
      {
        name: 'Uptime',
        value: `<t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`,
      },
    ];

    for (const field of fields) {
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent([`### ${field.name}`, `${field.value}`].join('\n'))
      );
    }

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

    container.addActionRowComponents((row) => row.addComponents(directory, github, docu, inv));

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
};

import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { addEvent, addGame, deleteUser, getCookies, getUser, setCookies } from '../db/queries.js';
import { fetchGameRecord } from '../hoyo/api/gameRecord.js';
import { IdToAbbr } from '../hoyo/utils/constants.js';
import { parseCookies } from '../hoyo/utils/parseCookies.js';

export default {
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName('hoyolink')
    .setDescription('Link your HoYoLAB account.')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const user = await getUser(interaction.user.id);
    if (!user) {
      const unregisteredContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          'You are not registered. Please use the `/register` command to create an account.'
        )
      );

      await interaction.editReply({
        components: [unregisteredContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (user.collectData) {
      await addEvent(interaction.user.id, {
        game: 'discord',
        type: 'interaction',
        metadata: {
          command: 'hoyolink',
        },
      });
    }

    // Get the user's cookies
    const hoyoCookies = await getCookies(interaction.user.id);
    if (hoyoCookies) {
      const unlinkContainer = new ContainerBuilder();

      // Unlink text display
      const unlinkTextDisplay = new TextDisplayBuilder().setContent(
        [
          'Your HoYoLAB account is **already linked**.',
          'If you wish to unlink it, press the button below.',
        ].join('\n')
      );
      unlinkContainer.addTextDisplayComponents(unlinkTextDisplay);

      // Unlink button
      const unlinkButton = new ButtonBuilder()
        .setCustomId('hoyolink-unlink')
        .setLabel('Unlink HoYoLAB Account')
        .setStyle(ButtonStyle.Danger);
      unlinkContainer.addActionRowComponents((row) => row.addComponents(unlinkButton));

      await interaction.editReply({
        components: [unlinkContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const addContainer = new ContainerBuilder();

    // Add text display
    const addTextDisplay = new TextDisplayBuilder().setContent(
      'No HoYoLAB account linked. Press the button below to get started.'
    );
    addContainer.addTextDisplayComponents(addTextDisplay);

    // Add button
    const addButton = new ButtonBuilder()
      .setCustomId('hoyolink-add')
      .setLabel('Add HoYoLAB Account')
      .setStyle(ButtonStyle.Primary);

    // Guide button
    const guideButton = new ButtonBuilder()
      .setCustomId('hoyolink-guide')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('<:Info:1277007040803242075>');

    addContainer.addActionRowComponents((row) => row.addComponents(addButton, guideButton));

    await interaction.editReply({
      components: [addContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
  /**
   * @param {import("discord.js").ButtonInteraction} interaction
   * @returns {Promise<void>}
   */
  async handleButtonClick(interaction) {
    const button = interaction.customId.split('-')[1];

    if (button === 'add') {
      const modal = new ModalBuilder().setCustomId('hoyolink').setTitle('Enter Cookies');

      const cookieInput = new TextInputBuilder()
        .setCustomId('cookies')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter your cookies here');

      const cookieLabel = new LabelBuilder()
        .setLabel('HoYoLAB Cookies')
        .setDescription('HoYoLAB cookies are required for the bot to function properly.')
        .setTextInputComponent(cookieInput);

      modal.addLabelComponents(cookieLabel);
      await interaction.showModal(modal);
    } else if (button === 'guide') {
      const guideContainer = new ContainerBuilder();

      const guideTextDisplay = new TextDisplayBuilder().setContent(
        [
          '## Getting your HoYoLAB cookies',
          '1. Go to the [HoYoLAB](https://www.hoyolab.com/home) website and log in to your account.',
          '2. Click on your profile picture and select **”Personal Homepage”**.',
          "3. Open your browser's developer tools ([How to open DevTools](https://balsamiq.com/support/faqs/browserconsole/)).",
          '4. Navigate to the **“Network”** tab in DevTools, then refresh the page (Ctrl+R or Cmd+R).',
          '5. In the filter box, type **“getGame”** and click on the result labeled **“getGameRecordCard”**.',
          '6. Under the **“Request Headers“** section, locate the `Cookie` field and copy everything after the word **“Cookie:”**.',
          '7. Click **“Add HoYoLAB Account“**, and paste the cookies into the text field provided.',
        ].join('\n')
      );
      guideContainer.addTextDisplayComponents(guideTextDisplay);

      const sampleButton = new ButtonBuilder()
        .setCustomId('hoyolink-sample')
        .setLabel('Show sample cookies')
        .setStyle(ButtonStyle.Secondary);
      guideContainer.addActionRowComponents((row) => row.addComponents(sampleButton));

      await interaction.reply({
        components: [guideContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    } else if (button === 'sample') {
      const sampleContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          '```json\n' +
            'ltmid_v2=____; ltoken_v2=v2____; ltuid_v2=____; DEVICEFP=____; HYV_LOGIN_PLATFORM_LIFECYCLE_ID={}; HYV_LOGIN_PLATFORM_LOAD_TIMEOUT={}; HYV_LOGIN_PLATFORM_TRACKING_MAP={}; _HYVUUID=____; _MHYUUID=____; mi18nLang=en-us; account_id_v2=____; account_mid_v2=____; cookie_token_v2=v2____; HYV_LOGIN_PLATFORM_OPTIONAL_AGREEMENT={}\n' +
            '```'
        )
      );

      await interaction.reply({
        components: [sampleContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
    } else if (button === 'unlink') {
      const unlinkContainer = new ContainerBuilder();

      const unlinkTextDisplay = new TextDisplayBuilder().setContent(
        'This action is destructive and cannot be reversed, continue?'
      );
      unlinkContainer.addTextDisplayComponents(unlinkTextDisplay);

      const unlinkButton = new ButtonBuilder()
        .setCustomId('hoyolink-confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);
      unlinkContainer.addActionRowComponents((row) => row.addComponents(unlinkButton));

      await interaction.update({
        components: [unlinkContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    } else if (button === 'confirm') {
      await deleteUser(interaction.user.id);

      const successContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Your HoYoLAB account has been successfully unlinked.')
      );

      await interaction.update({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }
  },
  /**
   * @param {import("discord.js").ModalSubmitInteraction} interaction
   * @returns {Promise<void>}
   */
  async handleModalSubmit(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Get and parse the cookies
    const cookies = interaction.fields.getTextInputValue('cookies');
    const parsedCookies = parseCookies(cookies);

    // Check if all required cookies are present
    const requiredCookies = ['ltmidV2', 'ltokenV2', 'ltuidV2'];
    const missingCookies = requiredCookies.filter(
      (c) => !parsedCookies[/** @type {keyof typeof parsedCookies} */ (c)]
    );

    // If any required cookies are missing, show an error message
    if (missingCookies.length > 0) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            'The cookies provided are **invalid** or **incomplete**.',
            `The following required cookies are missing: ${missingCookies.map((c) => `\`${c}\``).join(', ')}.`,
            'Please copy everything and try again.',
          ].join('\n')
        )
      );

      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Fetch game records using cookies, exit if fail
    const gameRecord = await fetchGameRecord({ cookies: parsedCookies });
    if (gameRecord.retcode === -1) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          'An error occurred while fetching your game data. Please try again later.'
        )
      );
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Check if the user has any linked games
    const gameList = gameRecord.data?.data?.list;
    if (!Array.isArray(gameList) || gameList.length === 0) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          'No games found linked to this account. Please ensure your account has valid game data.'
        )
      );
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Add each game to the user's data
    for (const game of gameList) {
      await addGame(interaction.user.id, {
        game: IdToAbbr[String(game.game_id)],
        gameId: String(game.game_id),
        gameRoleId: String(game.game_role_id),
        region: String(game.region),
        regionName: String(game.region_name),
      });
    }

    // Set user cookies
    await setCookies(interaction.user.id, { hoyolabCookies: parsedCookies });

    // List of commands to show after registration
    const commands = [
      '- `/profile` - View statics for the selected game.',
      '- `/income` - View income for the selected month.',
      '- `/roadmap` - View planned improvements and features.',
      '- `/settings` - Access and modify your account settings.',
    ].join('\n');

    const successContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          "## You're all set~",
          'Welcome to HoYoVista! Here are some commands you can use to get started:',
          commands,
        ].join('\n')
      )
    );

    await interaction.editReply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

import {
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
  codeBlock,
} from 'discord.js';
import { addEvent, getCookies, getEvents, getUser, getUserLinkedGames } from '../db/queries.js';
import { createTextContainer } from '../utils/containerBuilder.js';

export default {
  cooldown: 300, // 5 minutes
  data: new SlashCommandBuilder()
    .setName('data')
    .setDescription('Retrieve and view your account data.')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await getUser(interaction.user.id);
    if (!user) {
      const container = createTextContainer(
        'You are not registered. Please use the `/register` command to create an account.'
      );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (user.collectData) {
      await addEvent(interaction.user.id, {
        game: 'discord',
        type: 'interaction',
        metadata: {
          command: 'data',
        },
      });
    }

    const container = new ContainerBuilder();

    const dataTextDisplay = new TextDisplayBuilder().setContent(
      `### User Data\n${codeBlock('json', JSON.stringify(user, null, 2))}`
    );
    container.addTextDisplayComponents(dataTextDisplay);

    const [cookiePromise, linkedGamesPromise] = await Promise.allSettled([
      getCookies(interaction.user.id),
      getUserLinkedGames(interaction.user.id),
    ]);

    if (cookiePromise.status === 'rejected' || linkedGamesPromise.status === 'rejected') {
      // They havent linked their account yet, return base container
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Hoyolab Cookies
    const hoyoCookies = cookiePromise.value;
    const cookiesTextDisplay = new TextDisplayBuilder().setContent(
      `### Hoyolab Cookies\n${codeBlock('json', JSON.stringify(hoyoCookies, null, 2))}`
    );
    container.addTextDisplayComponents(cookiesTextDisplay);

    // Linked Games
    const linkedGames = linkedGamesPromise.value;
    const linkedGamesTextDisplay = new TextDisplayBuilder().setContent(
      `### Linked Games\n${codeBlock('json', JSON.stringify(linkedGames, null, 2))}`
    );
    container.addTextDisplayComponents(linkedGamesTextDisplay);

    // Latest 5 events
    const events = await getEvents(interaction.user.id, 2);
    if (events.length > 0) {
      const eventsTextDisplay = new TextDisplayBuilder().setContent(
        `### Recent Events (Latest 2)\n${codeBlock('json', JSON.stringify(events, null, 2))}`
      );
      container.addTextDisplayComponents(eventsTextDisplay);
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

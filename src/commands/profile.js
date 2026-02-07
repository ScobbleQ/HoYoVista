import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { addEvent, getCookies, getUser, getUserLinkedGames } from '../db/queries.js';
import { fetchGameIndex } from '../hoyo/api/gameIndex.js';
import { Games } from '../hoyo/utils/constants.js';
import { fetchLinkedAccounts } from '../hoyo/utils/fetchLinkedAccounts.js';
import { createTextContainer } from '../utils/containerBuilder.js';
import { StygianDifficulty } from '../utils/emojis.js';

/** @typedef {import("../utils/typedef.js").GameID} GameID */

export default {
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('view game profile')
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to view the profile for.')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   * @param {import("discord.js").AutocompleteInteraction} interaction
   * @returns {Promise<void>}
   */
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const { retcode, data } = await fetchLinkedAccounts(interaction.user.id, {
      exclude: [Games.STARRAIL, Games.HONKAI],
    });

    if (focusedOption.name === 'account') {
      if (retcode !== 1 || !data) {
        return await interaction.respond([
          { name: 'No supported linked games found', value: '-1' },
        ]);
      }

      const filtered = data.filter((choice) =>
        choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
      );

      await interaction.respond(
        filtered.map((choice) => ({
          name: choice.name,
          value: choice.gameId,
        }))
      );
    }
  },
  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // fetch gameId and send initial feedback message
    const gameId = interaction.options.getString('account');
    const fetchingContainer = createTextContainer('Retrieving your data. Please wait...');
    await interaction.reply({
      components: [fetchingContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // Fetch user data
    const startUserFetchTime = Date.now();
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

    // increment command usage count
    if (user.collectData) {
      await addEvent(interaction.user.id, {
        game: 'discord',
        type: 'interaction',
        metadata: {
          command: 'profile',
          gameId: gameId,
        },
      });
    }

    const [cookiePromise, linkedGamesPromise] = await Promise.allSettled([
      getCookies(interaction.user.id),
      getUserLinkedGames(interaction.user.id),
    ]);

    if (cookiePromise.status === 'rejected' || linkedGamesPromise.status === 'rejected') {
      const errorContainer = createTextContainer(
        'An error occurred while fetching your data. Please try again later.'
      );
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const hoyoCookies = cookiePromise.value;
    const linkedGames = linkedGamesPromise.value;
    const gameKey = linkedGames.find((g) => g.gameId === gameId);

    if (!hoyoCookies || !gameKey) {
      const errorContainer = createTextContainer(
        'An error occurred while fetching your data. Please try again later.'
      );
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const userFetchTime = Date.now() - startUserFetchTime;
    const queryingContainer = createTextContainer(
      `Account successfully retrieved in ${userFetchTime}ms.\nFetching profile from HoYoverse...`
    );
    await interaction.editReply({
      components: [queryingContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    const indexStartTime = Date.now();

    // Fetch game index
    const { retcode, data: gameIndex } = await fetchGameIndex(
      /** @type {GameID} */ (gameKey.gameId),
      { gameRoleId: gameKey.gameRoleId, region: gameKey.region, cookies: hoyoCookies }
    );

    if (retcode !== 1 || !gameIndex) {
      const errorContainer = createTextContainer(
        'An error occurred while fetching your data. Please try again later.'
      );
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const indexFetchTime = Date.now() - indexStartTime;
    const preparingContainer = createTextContainer(
      `Profile retrieved in ${indexFetchTime}ms.\nPreparing your data...`
    );
    await interaction.editReply({
      components: [preparingContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    let enkaData = null;
    const container = new ContainerBuilder();

    if (gameId === Games.GENSHIN) {
      const res = await fetch(`https://enka.network/api/uid/${gameKey.gameRoleId}`, {
        headers: {
          'User-Agent': 'ScobbleQ',
        },
      });

      enkaData = await res.json();
      const { playerInfo } = enkaData;
      const { role, stats } = gameIndex;

      const namecardRes = await fetch(
        `https://raw.githubusercontent.com/EnkaNetwork/API-docs/refs/heads/master/store/gi/namecards.json`
      );
      const namecards = await namecardRes.json();
      const namecardUrl = `https://enka.network/${namecards[playerInfo.nameCardId].Icon}`;

      const banner = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
        mediaGalleryItem.setURL(namecardUrl)
      );

      container.addMediaGalleryComponents(banner);

      const info = new SectionBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              `# ${role.nickname}`,
              `-# \`AR ${role.level} | ${gameKey.regionName} | ${gameKey.gameRoleId}\``,
              `${playerInfo.signature}`,
            ].join('\n')
          )
        )
        .setThumbnailAccessory((thumbnail) => thumbnail.setURL(role.game_head_icon));

      container.addSectionComponents(info);

      container.addSeparatorComponents((separator) => separator);

      const statDisplay = new TextDisplayBuilder().setContent(
        [
          `Total Achievements: ${stats.achievement_number || '0'}`,
          `Max Friendships: ${stats.full_fetter_avatar_num || '0'}`,
          `Spiral Abyss: ${playerInfo.towerFloorIndex ? `${playerInfo.towerFloorIndex}-${playerInfo.towerLevelIndex}${playerInfo.towerStarIndex ? ` | ${playerInfo.towerStarIndex}` : ''}` : 'Not yet attempted'}`,
          `Imaginarium Theater: ${playerInfo.theaterActIndex ? `Act ${playerInfo.theaterActIndex} | ${playerInfo.theaterStarIndex}` : 'Not yet attempted'}`,
          `Stygian Onslaught: ${playerInfo.stygianIndex ? `${StygianDifficulty[/** @type {keyof typeof StygianDifficulty} */ (playerInfo.stygianIndex)]} ${playerInfo.stygianSeconds}s` : 'Not yet attempted'}`,
        ].join('\n')
      );

      container.addTextDisplayComponents(statDisplay);
    } else if (gameId === Games.ZZZ) {
      const res = await fetch(`https://enka.network/api/zzz/uid/${gameKey.gameRoleId}`, {
        headers: {
          'User-Agent': 'ScobbleQ',
        },
      });

      enkaData = (await res.json()).PlayerInfo;
      const { SocialDetail } = enkaData;

      const banner = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
        mediaGalleryItem.setURL(gameIndex.game_data_show.card_url)
      );

      container.addMediaGalleryComponents(banner);

      const info = new SectionBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            [
              `# ${SocialDetail.ProfileDetail.Nickname}`,
              `-# \`Lv.${SocialDetail.ProfileDetail.Level} | ${gameKey.regionName} | ${gameKey.gameRoleId}\``,
              `${SocialDetail.Desc || "There's nothing here at all..."}`,
            ].join('\n')
          )
        )
        .setThumbnailAccessory((thumbnail) => thumbnail.setURL(gameIndex.cur_head_icon_url));

      container.addSectionComponents(info);

      container.addSeparatorComponents((separator) => separator);

      const statDisplay = new TextDisplayBuilder().setContent(
        [
          `${gameIndex.game_data_show.personal_title}`,
          `Active Days: ${gameIndex.stats.active_days}`,
          `Achievements: ${gameIndex.stats.achievement_count}`,
          `Simulated Battle Trial: ${gameIndex.stats.climbing_tower_layer}`,
          `Battle Trial: The Last Stand: ${gameIndex.stats.climbing_tower_s2.climbing_tower_layer}`,
        ].join('\n')
      );

      container.addTextDisplayComponents(statDisplay);
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

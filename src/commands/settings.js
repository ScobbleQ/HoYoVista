/**
 * Settings command for the bot, utilizes caching to reduce queries when browsing through settings.
 * Cache is deleted when a user updates their settings.
 */
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { createCache, getOrSet } from '../class/cache.js';
import { createRateLimiter } from '../class/rateLimiter.js';
import {
  addEvent,
  getUser,
  getUserLinkedGames,
  resetUserSettings,
  updateGame,
  updateUser,
} from '../db/queries.js';
import { IdToFull } from '../hoyo/utils/constants.js';
import { GameIcons } from '../utils/emojis.js';

/** @typedef {import("../utils/typedef.js").User} User */
/** @typedef {import("../utils/typedef.js").GameID} GameID */
/** @typedef {import("../utils/typedef.js").Game} Game */

// Constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 30 * 1000; // 30 seconds

// Cache instances
/** @type {import("../class/cache.js").Cache<User>} */
const userCache = createCache(CACHE_DURATION);

/** @type {import("../class/cache.js").Cache<Game[]>} */
const linkedGamesCache = createCache(CACHE_DURATION);

// Rate limiter instance
/** @type {import("../class/rateLimiter.js").RateLimiter} */
const settingsRateLimiter = createRateLimiter(RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS);

/** @enum {number} */
const SETTINGS_PAGE = {
  RESET: 0,
  GENERAL: 1,
  CHECKIN: 2,
  REDEEM: 3,
};

/** @type {Record<number, { label: string, value: string }>} */
const PAGE_CONFIG = {
  [SETTINGS_PAGE.GENERAL]: { label: 'General Settings', value: 'settings-1' },
  [SETTINGS_PAGE.CHECKIN]: { label: 'Check-in Settings', value: 'settings-2' },
  [SETTINGS_PAGE.REDEEM]: { label: 'Code Redemption Settings', value: 'settings-3' },
  [SETTINGS_PAGE.RESET]: { label: 'Reset Settings', value: 'settings-0' },
};

// Helper functions
/**
 * Toggle a boolean value from string representation
 * @param {string} value - String representation of boolean ('true' or 'false')
 * @returns {boolean}
 */
function toggleBoolean(value) {
  return value !== 'true';
}

/**
 * Create a text container with the given content
 * @param {string} content - The text content
 * @returns {ContainerBuilder}
 */
function createTextContainer(content) {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(content)
  );
}

/**
 * Check if user is the original interaction owner
 * @param {import("discord.js").ButtonInteraction | import("discord.js").StringSelectMenuInteraction} interaction
 * @returns {boolean}
 */
function isOriginalOwner(interaction) {
  return interaction.user.id === interaction.message?.interactionMetadata?.user?.id;
}

/**
 * Handle rate limit exceeded response
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {number} resetIn - Seconds until rate limit resets
 * @returns {Promise<void>}
 */
async function handleRateLimit(interaction, resetIn) {
  const content = `⏱️ Whoa, you're updating settings too quickly!\nPlease wait ${resetIn} second${resetIn !== 1 ? 's' : ''} before trying again.`;
  const container = createTextContainer(content);

  try {
    await interaction.update({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  } catch {
    // If update fails (already replied), use followUp instead
    await interaction.followUp({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  }
}

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure your user settings')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /**
   *
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   * @param {boolean} update
   * @param {number} page
   * @returns {Promise<void>}
   */
  async execute(interaction, update = false, page = SETTINGS_PAGE.GENERAL) {
    const user = await getUserFromCache(interaction.user.id);
    if (!user) {
      const container = createTextContainer(
        'You are not registered. Please use the `/register` command to create an account.'
      );
      await interaction.reply({
        components: [container],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    // Track analytics if enabled and not updating
    if (user.collectData && !update) {
      await addEvent(interaction.user.id, {
        game: 'discord',
        type: 'interaction',
        metadata: { command: 'settings' },
      });
    }

    const container = await this.renderPage(page, interaction.user.id);
    if (!container) return;

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
  /**
   * Create the page menu for the settings command
   * @param {number} currentPage
   * @returns {StringSelectMenuBuilder}
   */
  createPageMenu(currentPage) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('settings-category')
      .setPlaceholder('Select a category');

    for (const [pageNum, config] of Object.entries(PAGE_CONFIG)) {
      menu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(config.label)
          .setValue(config.value)
          .setDefault(currentPage === Number(pageNum))
      );
    }

    return menu;
  },
  /**
   * Render the appropriate page based on page number
   * @param {number} page - The page number to render
   * @param {string} discordId - The Discord ID of the user
   * @returns {Promise<ContainerBuilder | null>}
   */
  async renderPage(page, discordId) {
    switch (page) {
      case SETTINGS_PAGE.GENERAL:
        return this.renderGeneralSettings(page, discordId);
      case SETTINGS_PAGE.CHECKIN:
        return this.renderAutoSettings(page, 'checkin', discordId);
      case SETTINGS_PAGE.REDEEM:
        return this.renderAutoSettings(page, 'redeem', discordId);
      case SETTINGS_PAGE.RESET:
        return this.renderResetSettings();
      default:
        return this.renderGeneralSettings(SETTINGS_PAGE.GENERAL, discordId);
    }
  },
  /**
   * Render the general settings page
   * @param {number} currentPage - The current page of the settings command
   * @param {string} discordId - The Discord ID of the user
   * @returns {Promise<ContainerBuilder | null>}
   */
  async renderGeneralSettings(currentPage, discordId) {
    const user = await getUserFromCache(discordId);
    if (!user) return null;

    const config = {
      subscribed: {
        label: 'Update Notifications',
        description:
          'When enabled, you will receive updates and alerts from the bot. This includes new features, bug fixes, and other important announcements.',
      },
      private: {
        label: 'Privacy Blur',
        description:
          'When enabled, sensitive information such as UIDs will be hidden from other users in responses. This adds an extra layer of privacy protection beyond default settings.',
      },
      collectData: {
        label: 'Collect Analytics Data',
        description:
          'When enabled, anonymized usage data will be collected to help improve the bot by identifying bugs, usage patterns, and feature requests. This data also allows us to generate your personalized end-of-year wrapped, similar to Spotify Wrapped.',
      },
    };

    const generalSettingsContainer = new ContainerBuilder();

    // Title and description of this settings page
    const generalSettingsTextDisplay = new TextDisplayBuilder().setContent(
      '## General Settings\nCustomize your notification preferences, data collection, and privacy settings.'
    );
    generalSettingsContainer.addTextDisplayComponents(generalSettingsTextDisplay);
    generalSettingsContainer.addSeparatorComponents((separator) => separator);

    // Add sections for each setting
    for (const [settingKey, settingConfig] of Object.entries(config)) {
      const isEnabled = /** @type {boolean} */ (user[/** @type {keyof User} */ (settingKey)]);
      const statusText = isEnabled ? 'Enabled' : 'Disabled';

      const section = new SectionBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### ${settingConfig.label}\n-# ${settingConfig.description}\nCurrently \`${statusText}\``
          )
        )
        .setButtonAccessory((button) =>
          button
            .setCustomId(`settings-general-${isEnabled}-${settingKey}`)
            .setLabel(isEnabled ? 'Disable' : 'Enable')
            .setStyle(ButtonStyle.Primary)
        );

      generalSettingsContainer.addSectionComponents(section);
      generalSettingsContainer.addSeparatorComponents((separator) => separator);
    }

    // Render the select menu
    generalSettingsContainer.addActionRowComponents((row) =>
      row.addComponents(this.createPageMenu(currentPage))
    );

    return generalSettingsContainer;
  },
  /**
   * Render the auto settings page
   * @param {number} currentPage - The current page of the settings command
   * @param {"checkin" | "redeem"} type - The type of auto settings to render (checkin or redeem)
   * @param {string} discordId - The Discord ID of the user
   * @returns {Promise<ContainerBuilder | null>}
   */
  async renderAutoSettings(currentPage, type, discordId) {
    const user = await getUserFromCache(discordId);
    if (!user) return null;

    const config = {
      checkin: {
        notificationField: 'notifyCheckin',
        autoField: 'autoCheckin',
        label: 'Check-in',
        description:
          'When enabled, the bot will automatically check-in for your supported and allowed games. Check-ins occur automatically each day between <t:1735751100:t> and <t:1735754400:t>.',
      },
      redeem: {
        notificationField: 'notifyRedeem',
        autoField: 'autoRedeem',
        label: 'Redemption',
        description:
          'When enabled, the bot will automatically redeem codes for your supported and allowed games. Available codes are fetched from an external API by seria_ati.',
      },
    };

    const { notificationField, autoField, label, description } = config[type];

    /**
     * @param {boolean} isEnabled
     * @returns {string}
     */
    const getStatusText = (isEnabled) => (isEnabled ? 'Enabled' : 'Disabled');
    const isNotificationEnabled = /** @type {boolean} */ (
      user[/** @type {keyof User} */ (notificationField)]
    );
    const notificationStatus = getStatusText(isNotificationEnabled);

    const autoSettingsContainer = new ContainerBuilder();

    // Title and description of this settings page
    const autoSettingsTextDisplay = new TextDisplayBuilder().setContent(
      `## ${label} Settings\n${description}`
    );
    autoSettingsContainer.addTextDisplayComponents(autoSettingsTextDisplay);
    autoSettingsContainer.addSeparatorComponents((separator) => separator);

    // Add notification section
    const notificationSection = new SectionBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `### DM Notifications\n-# When enabled, you will receive DMs from the bot when a ${label.toLowerCase()} happens.\n-# Requires Discord DMs to be enabled.\nNotifications are currently \`${notificationStatus}\``
        )
      )
      .setButtonAccessory((button) =>
        button
          .setCustomId(`settings-notify-${isNotificationEnabled}-${type}`)
          .setLabel(isNotificationEnabled ? 'Disable' : 'Enable')
          .setStyle(ButtonStyle.Primary)
      );
    autoSettingsContainer.addSectionComponents(notificationSection);
    autoSettingsContainer.addSeparatorComponents((separator) => separator);

    // Add sections for each linked game
    const linkedGames = await getUserLinkedGamesFromCache(discordId);
    if (!linkedGames) return null;

    for (const game of linkedGames) {
      const isGameAutoEnabled = /** @type {boolean} */ (
        game[/** @type {keyof Game} */ (autoField)]
      );
      const gameStatus = getStatusText(isGameAutoEnabled);

      const section = new SectionBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `**${GameIcons[/** @type {GameID} */ (game.gameId)]} ${IdToFull[/** @type {GameID} */ (game.gameId)]} (${game.gameRoleId})**\n${label}s are currently \`${gameStatus}\``
          )
        )
        .setButtonAccessory((button) =>
          button
            .setCustomId(`settings-${type}-${isGameAutoEnabled}-${game.gameId}`)
            .setLabel(isGameAutoEnabled ? 'Disable' : 'Enable')
            .setStyle(ButtonStyle.Primary)
        );

      autoSettingsContainer.addSectionComponents(section);
      autoSettingsContainer.addSeparatorComponents((separator) => separator);
    }

    // Render the select menu
    autoSettingsContainer.addActionRowComponents((row) =>
      row.addComponents(this.createPageMenu(currentPage))
    );

    return autoSettingsContainer;
  },
  renderResetSettings() {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        '## Reset Settings\nAre you sure you want to reset your settings?\n**This action cannot be reversed.**'
      )
    );

    const resetButton = new ButtonBuilder()
      .setCustomId('settings-reset-confirmed')
      .setLabel('Confirm Reset')
      .setStyle(ButtonStyle.Danger);
    container.addActionRowComponents((row) => row.addComponents(resetButton));

    return container;
  },
  /**
   *
   * @param {import("discord.js").StringSelectMenuInteraction} interaction
   * @returns {Promise<void>}
   */
  async handleSelectMenu(interaction) {
    if (!isOriginalOwner(interaction)) return;

    const selectedValue = interaction.values[0];
    const pageMatch = selectedValue.match(/settings-(\d+)/);
    if (!pageMatch) {
      await interaction.deferUpdate();
      return;
    }

    const page = Number(pageMatch[1]);
    const container = await this.renderPage(page, interaction.user.id);
    if (!container) {
      await interaction.deferUpdate();
      return;
    }

    await interaction.update({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
  /**
   *
   * @param {import("discord.js").ButtonInteraction} interaction
   * @returns {Promise<void>}
   */
  async handleButtonClick(interaction) {
    if (!isOriginalOwner(interaction)) return;

    const customIdParts = interaction.customId.split('-');
    if (customIdParts.length < 4) {
      await interaction.deferUpdate();
      return;
    }

    const [, action, currentValue, id] = customIdParts;

    // Check rate limit (skip for reset confirmation)
    const isResetConfirmation = action === 'reset' && currentValue === 'confirmed';
    if (!isResetConfirmation) {
      const rateLimitResult = settingsRateLimiter.attempt(interaction.user.id);
      if (!rateLimitResult.allowed) {
        const resetIn = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
        await handleRateLimit(interaction, resetIn);
        return;
      }
    }

    try {
      await this.handleSettingUpdate(interaction, action, currentValue, id);
    } catch (error) {
      const container = createTextContainer(
        'An error occurred while updating your settings. Please try again.'
      );
      await interaction.update({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
      });
      throw error;
    }
  },

  /**
   * Handle setting update based on action type
   * @param {import("discord.js").ButtonInteraction} interaction
   * @param {string} action
   * @param {string} currentValue
   * @param {string} id
   * @returns {Promise<void>}
   */
  async handleSettingUpdate(interaction, action, currentValue, id) {
    if (action === 'reset' && currentValue === 'confirmed') {
      await resetUserSettings(interaction.user.id);
      invalidateUserCache(interaction.user.id);
      invalidateLinkedGamesCache(interaction.user.id);

      const container = createTextContainer(
        'Your settings have been successfully reset to default values.'
      );
      await interaction.update({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (action === 'general') {
      invalidateUserCache(interaction.user.id);
      await updateUser(interaction.user.id, {
        field: id,
        value: toggleBoolean(currentValue),
      });

      const container = await this.renderGeneralSettings(
        SETTINGS_PAGE.GENERAL,
        interaction.user.id
      );
      if (!container) return;

      await interaction.update({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (action === 'notify') {
      invalidateUserCache(interaction.user.id);
      const page = id === 'checkin' ? SETTINGS_PAGE.CHECKIN : SETTINGS_PAGE.REDEEM;
      const type = id === 'checkin' ? 'checkin' : 'redeem';

      await updateUser(interaction.user.id, {
        field: id === 'checkin' ? 'notifyCheckin' : 'notifyRedeem',
        value: toggleBoolean(currentValue),
      });

      const container = await this.renderAutoSettings(page, type, interaction.user.id);
      if (!container) return;

      await interaction.update({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (action === 'checkin' || action === 'redeem') {
      invalidateLinkedGamesCache(interaction.user.id);
      const page = action === 'checkin' ? SETTINGS_PAGE.CHECKIN : SETTINGS_PAGE.REDEEM;

      await updateGame(interaction.user.id, {
        gameId: /** @type {GameID} */ (id),
        field: action === 'checkin' ? 'autoCheckin' : 'autoRedeem',
        value: toggleBoolean(currentValue),
      });

      const container = await this.renderAutoSettings(page, action, interaction.user.id);
      if (!container) return;

      await interaction.update({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
      });
    }
  },
};

/**
 * Get a user from the cache, fetching from database if not cached
 * @param {string} discordId - The Discord ID of the user
 * @returns {Promise<User | null>}
 */
async function getUserFromCache(discordId) {
  const userCacheKey = `user:${discordId}`;
  return getOrSet(userCache, userCacheKey, async () => {
    return await getUser(discordId);
  });
}

/**
 * Get linked games from the cache, fetching from database if not cached
 * @param {string} discordId - Discord ID (same as uid in database)
 * @returns {Promise<Game[] | null>}
 */
async function getUserLinkedGamesFromCache(discordId) {
  const linkedGamesCacheKey = `linked_games:${discordId}`;
  const result = await getOrSet(linkedGamesCache, linkedGamesCacheKey, async () => {
    return await getUserLinkedGames(discordId);
  });
  return /** @type {Game[] | null} */ (result);
}

/**
 * Invalidate user cache for a given Discord ID
 * @param {string} discordId
 */
function invalidateUserCache(discordId) {
  userCache.delete(`user:${discordId}`);
}

/**
 * Invalidate linked games cache for a given Discord ID
 * @param {string} discordId
 */
function invalidateLinkedGamesCache(discordId) {
  linkedGamesCache.delete(`linked_games:${discordId}`);
}

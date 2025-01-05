import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
} from 'discord.js';
import { MongoDB } from '../class/mongo.js';
import { IdToFull, IdToAbbr, IdToShort } from '../hoyolab/constants.js';
import { createEmbed } from '../utils/createEmbed.js';
import { Toggles } from '../utils/emojis.js';
import { embedColors } from '../../config.js';

const Actions = {
    RESET: 'reset',
    SUBSCRIBE: 'subscribe',
    DATA: 'data',
    PRIVACY: 'privacy',
    CHECKIN: 'auto_checkin',
    REDEEM: 'auto_redeem',
};

const Description = {
    updateNotifications:
        '**Update Notifications:** {status}\nReceive important updates and alerts directly, ensuring you stay informed about the latest features and improvements.',
    analytics:
        '**Collect Analytics Data:** {status}\nEnhance our service by allowing the collection of usage data, helping us optimize performance and user experience.',
    privacyBlur:
        '**Privacy Blur:** {status}\nEnable to hide sensitive information, ensuring an additional layer of privacy during interactions.',
};

export default {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure your user settings')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async execute(interaction, update = false, page = 1) {
        const mongo = MongoDB.getInstance();
        const { retcode, data } = await mongo.getUserData(interaction.user.id);

        // Check if the user is not registered
        if (retcode === -1) {
            const embed = createEmbed(
                'You are not registered. Please use the `/register` command to create an account.'
            );
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        // increment on first usage
        if (data.settings.collect_data && update === false) {
            mongo.increment(interaction.user.id, { field: 'stats.command_used', value: 1 });
        }

        if (!data.linked_games) {
            const response = this.renderGeneralSettings(data, page);
            return interaction.reply(response);
        }

        const settingsHandlers = {
            0: this.renderResetSettings.bind(this),
            1: this.renderGeneralSettings.bind(this, data, page),
            2: this.renderAutoSettings.bind(this, data, 'checkin', page),
            3: this.renderAutoSettings.bind(this, data, 'redeem', page),
        };

        const handler = settingsHandlers[page] || settingsHandlers[1];
        const response = handler();

        update ? await interaction.update(response) : await interaction.reply({ ...response });

        setTimeout(
            async () => {
                try {
                    await interaction.editReply({
                        embeds: response.embeds,
                        components: [],
                    });
                } catch {
                    // ignore
                }
            },
            5 * 60 * 1000
        ); // 5 minutes
    },
    createPageMenu(currentPage) {
        return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('settings-category')
                .setPlaceholder('Select a category')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('General Settings')
                        .setValue('settings-1')
                        .setDefault(currentPage === 1),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Auto Check-in Settings')
                        .setValue('settings-2')
                        .setDefault(currentPage === 2),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Auto Code Redeem Settings')
                        .setValue('settings-3')
                        .setDefault(currentPage === 3),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Reset Settings')
                        .setValue('settings-0')
                        .setDefault(currentPage === 0)
                )
        );
    },
    renderGeneralSettings(data, page) {
        const descriptions = {
            updateNotifications: Description.updateNotifications.replace(
                '{status}',
                data.settings.subscribed ? 'Enabled' : 'Disabled'
            ),
            analytics: Description.analytics.replace('{status}', data.settings.collect_data ? 'Allow' : 'Deny'),
            privacyBlur: Description.privacyBlur.replace('{status}', data.settings.is_private ? 'Enabled' : 'Disabled'),
        };

        const embed = new EmbedBuilder()
            .setColor(embedColors.primary)
            .setDescription(
                `${descriptions.updateNotifications}\n\n${descriptions.analytics}\n\n${descriptions.privacyBlur}`
            );

        const buttonsConfig = [
            { id: 'subscribe', label: 'Toggle Updates', field: 'subscribed' },
            { id: 'data', label: 'Toggle Analytics', field: 'collect_data' },
            { id: 'privacy', label: 'Toggle Privacy', field: 'is_private' },
        ];

        const buttons = new ActionRowBuilder().addComponents(
            buttonsConfig.map(({ id, label, field }) =>
                new ButtonBuilder()
                    .setCustomId(`settings-${id}-${data.settings[field]}`)
                    .setLabel(label)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        const menu = this.createPageMenu(page);
        return {
            embeds: [embed],
            components: [menu, buttons],
            ephemeral: data.settings.is_private,
        };
    },
    renderAutoSettings(data, type, page) {
        const typeKey = type === 'checkin' ? 'to_notify_checkin' : 'to_notify_redeem';
        const typeValue = type === 'checkin' ? 'auto_checkin' : 'auto_redeem';
        const typeLabel = type === 'checkin' ? 'Check-in Notifications' : 'Redeem Notifications';

        const status = data.settings[typeKey] ? 'Enabled' : 'Disabled';
        let description = `${typeLabel}: ${status}\n\nAllow auto ${type} for:\n`;

        const toggles = Object.values(data.linked_games).map((game) => {
            description += `- ${IdToFull[game.game_id]}: ${game[`auto_${type}`] ? 'Yes' : 'No'}\n`;
            return new ButtonBuilder()
                .setCustomId(`settings-${typeValue}-${game[typeValue]}-${game.game_id}`)
                .setLabel(IdToShort[game.game_id])
                .setStyle(ButtonStyle.Primary)
                .setEmoji(Toggles[game[`auto_${type}`]]);
        });

        const embed = new EmbedBuilder().setColor(embedColors.primary).setDescription(description);

        const toggleRow = new ActionRowBuilder().addComponents(toggles);
        const menu = this.createPageMenu(page);
        return { embeds: [embed], components: [menu, toggleRow] };
    },
    renderResetSettings() {
        const embed = createEmbed(
            'Are you sure you want to reset your settings?\n\nThis action cannot be reversed.',
            embedColors.warning
        );

        const confirmButton = new ButtonBuilder()
            .setCustomId('settings-reset-confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Danger);
        const cancelButton = new ButtonBuilder()
            .setCustomId('settings-reset-cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);
        const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        return { embeds: [embed], components: [actionRow] };
    },
    async handleSelectMenu(interaction) {
        // ensure original owner is the one interacting
        if (interaction.user.id !== interaction.message.interaction.user.id) return;

        const page = interaction.values[0].split('-')[1];
        await this.execute(interaction, true, Number(page));
    },
    async handleButtonClick(interaction) {
        // ensure original owner is the one interacting
        if (interaction.user.id !== interaction.message.interaction.user.id) return;

        const [, action, curValue, id] = interaction.customId.split('-');
        const mongo = MongoDB.getInstance();

        switch (action) {
            case Actions.RESET:
                if (curValue === 'confirm') {
                    const defaultUpdates = [
                        { field: 'stats.command_used', value: 0 },
                        { field: 'stats.total_checkin', value: 0 },
                        { field: 'stats.total_redeem', value: 0 },
                        { field: 'settings.to_notify_checkin', value: true },
                        { field: 'settings.to_notify_redeem', value: true },
                    ].map((update) => mongo.set(id, update));
                    await Promise.all(defaultUpdates);

                    const embed = createEmbed('Settings resetted to default values.', embedColors.success);
                    await interaction.update({ embeds: [embed], components: [] });
                } else if (curValue === 'cancel') {
                    await interaction.message.delete();
                }
                break;
            case Actions.SUBSCRIBE:
                await mongo.set(interaction.user.id, {
                    field: 'settings.subscribed',
                    value: curValue === 'true' ? false : true,
                });
                await this.execute(interaction, true, 1);
                break;
            case Actions.DATA:
                await mongo.set(interaction.user.id, {
                    field: 'settings.collect_data',
                    value: curValue === 'true' ? false : true,
                });
                await this.execute(interaction, true, 1);
                break;
            case Actions.PRIVACY:
                await mongo.set(interaction.user.id, {
                    field: 'settings.is_private',
                    value: curValue === 'true' ? false : true,
                });
                await this.execute(interaction, true, 1);
                break;
            case Actions.CHECKIN:
                await mongo.set(interaction.user.id, {
                    field: `linked_games.${IdToAbbr[id]}.${action}`,
                    value: curValue === 'true' ? false : true,
                });
                await this.execute(interaction, true, 2);
                break;
            case Actions.REDEEM:
                await mongo.set(interaction.user.id, {
                    field: `linked_games.${IdToAbbr[id]}.${action}`,
                    value: curValue === 'true' ? false : true,
                });
                await this.execute(interaction, true, 3);
                break;
        }
    },
};

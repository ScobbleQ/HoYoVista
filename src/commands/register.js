import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from "discord.js";
import { MongoDB } from "../class/mongo.js";
import { embedColors } from "../../config.js";
import { createEmbed } from "../utils/createEmbed.js";

export default {
    data: new SlashCommandBuilder()
        .setName("register")
        .setDescription("Register your account to HoYoVista.")
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const mongo = MongoDB.getInstance();
        const user = await mongo.getUserData(interaction.user.id);

        // Already registered
        if (user.retcode === 1) {
            if (user.data.settings.collect_data) {
                mongo.increment(interaction.user.id, { field: "stats.command_used", value: 1 });
            }

            const embed = createEmbed("You are already registered your account.", embedColors.error);
            return interaction.editReply({ embeds: [embed] });
        }

        const registerEmbed = new EmbedBuilder()
            .setColor(embedColors.primary)
            .setTitle("HoYoVista Registration")
            .setDescription(
                "By registering, you agree to our [Privacy Policy](https://xentriom.gitbook.io/hoyovista/information/privacy-policy) " +
                    "and [Terms of Service](https://xentriom.gitbook.io/hoyovista/information/terms-of-service)."
            );

        const continueButton = new ButtonBuilder()
            .setCustomId("register-disclaimer")
            .setLabel("Agree and Register")
            .setStyle(ButtonStyle.Success);

        // Show the registration message
        await interaction.editReply({
            embeds: [registerEmbed],
            components: [new ActionRowBuilder().addComponents(continueButton)],
        });
    },
    async handleButtonClick(interaction) {
        const button = interaction.customId.split("-")[1];
        const mongo = MongoDB.getInstance();

        if (button === "disclaimer") {
            // Show the initial "registering" message
            const initialEmbed = new EmbedBuilder()
                .setColor(embedColors.warning)
                .setDescription("Preparing your account, this will only take a moment...");
            await interaction.update({ embeds: [initialEmbed], components: [] });

            // Register the user
            await mongo.initUser(interaction.user.id);

            // List of commands to show after registration
            const commands = [
                "- `/hoyolink` - Link your HoYoLAB account with your Discord account.",
                "- `/settings` - Access and modify your account settings.",
                "- `/data` - Manage your data, including viewing or deleting it.",
            ].join("\n");

            // Show the success message after updating
            const successEmbed = new EmbedBuilder()
                .setColor(embedColors.success)
                .setTitle("You're all set~")
                .setDescription(
                    `Welcome to HoYoVista! Here are some commands you can use to get started:\n${commands}`
                );

            await interaction.editReply({ embeds: [successEmbed] });
        }
    },
};

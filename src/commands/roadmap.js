import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { primaryEmbed } from '../utils/embedTemplates.js';

export default {
    data: new SlashCommandBuilder()
        .setName('roadmap')
        .setDescription('View upcoming features and improvements')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),
    async execute(interaction) {
        const embed = primaryEmbed({
            title: '"Celestial Codex" Version 3.0.0 Roadmap',
            fields: [
                {
                    name: 'Command Improvements',
                    value: '- ~~[/notes] Honkai: Star Rail and Honkai Impact 3rd support~~\n- [/profile] Honkai: Star Rail and Honkai Impact 3rd support\n- [/notes] Improve readability/display of information\n- [/income] Add support for Honkai: Star Rail',
                },
                {
                    name: 'New Commands/Features',
                    value: '- ~~[/account] View HoYoVista account (delete data)~~\n- ~~[/income] View income for the month (Support all games)~~\n- [/wiki] Search for information on the wiki (Support all games)\n- [/builds] View character builds (Support all games + EnkaNetwork)',
                },
            ],
            footer: { text: 'Last updated on Jan 15, 2025. Subject to change.' },
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { embedColors } from '../../config.js';

export default {
	data: new SlashCommandBuilder()
		.setName('roadmap')
		.setDescription('View upcoming features and improvements')
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(embedColors.primary)
            .setTitle('"Celestial Codex" Version 3.0.0 Roadmap')
            .addFields(
                { name: 'Command Improvements', value: '- [/notes] Honkai: Star Rail and Honkai Impact 3rd support\n- [/profile] Honkai: Star Rail and Honkai Impact 3rd support' },
                { name: 'New Commands/Features', value: '- [/account] View HoYoVista account (delete data)\n- [/income] View income for the month (Support all games)\n- [/wiki] Search for information on the wiki (Support all games)\n- [/builds] View character builds (Support all games + EnkaNetwork)' },
            )
            .setFooter({ text: 'Last updated on Jan 1, 2025. Subject to change.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};
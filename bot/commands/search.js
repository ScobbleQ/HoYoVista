const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Hakushin, LinkBuilder } = require('../class/hakushin');
const { buildGenshinCharacterReply, buildGenshinItemReply } = require('../utils/genshinSearch');
const config = require('../../config');
const { Game, Game_Category, 	 } = require('../utils/game');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search anything game related')
		.addStringOption(option => option
			.setName('game')
			.setDescription('The game to search in')
			.setRequired(true)
			.addChoices(
				{ name: 'Genshin Impact', value: Game.GENSHIN },
				{ name: 'Honkai: Star Rail', value: Game.STARRAIL },
				{ name: 'Zenless Zone Zero', value: Game.ZZZ }
			))
		.addStringOption(option => option
			.setName('category')
			.setDescription('The category to search in')
			.setRequired(true)
			.setAutocomplete(true))
		.addStringOption(option => option
			.setName('query')
			.setDescription('The query to search for')
			.setRequired(true)
			.setAutocomplete(true))
		.setIntegrationTypes([0, 1])
		.setContexts([0, 1, 2]),
	async autocomplete(interaction) {
		const game = interaction.options.getString('game');
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name === 'category') {
			const choices = await Game_Category[game];
			const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()));

			await interaction.respond(
				filtered.slice(0, 25).map(choice => ({ name: Readable_Game_Category[choice], value: choice }))
			);
		}

		if (interaction.options.getString('category') && focusedOption.name === 'query') {
			const category = interaction.options.getString('category');
			const data = await new Hakushin().fetchSortedContent(game, category);
			const filtered = data.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));

			await interaction.respond(
				filtered.slice(0, 25).map(choice => ({ name: choice.name, value: choice.id.toString() }))
			);
		}
	},
	async execute(interaction, dbClient, hoyo, topic, id, selection, args, update = false) {
		const game = hoyo || interaction.options.getString('game');
		const category = topic || interaction.options.getString('category');
		const query = id || interaction.options.getString('query');

		if (!Game_Category[game].includes(category)) {
			return await interaction.reply({
				embeds: [new EmbedBuilder()
					.setColor(config.embedColors.error)
					.setDescription(`Unable to locate ${query} in ${game} under the ${category} category.`)
				],
				ephemeral: true,
			});
		}

		if (!update) { await interaction.deferReply(); }
		const hakushin = await new Hakushin().fetchData(game, category, query);
		const { baseUrl } = new LinkBuilder(game);

		switch (game) {
			case Game.GENSHIN:
				if (category === 'character') {
					await buildGenshinCharacterReply(interaction, baseUrl, hakushin, query, selection, args, update);
				} else {
					await buildGenshinItemReply(interaction, baseUrl, hakushin, category, query);
				}
				break;
			case Game.STARRAIL:
			case Game.ZZZ:
			default:
				const embed = new EmbedBuilder()
					.setColor(config.embedColors.default)
					.setDescription('This selection is not yet available yet.');
				update ? await interaction.update({ embeds: [embed] }) : await interaction.editReply({ embeds: [embed] });
		}
	},
}
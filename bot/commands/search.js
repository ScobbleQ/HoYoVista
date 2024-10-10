const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Hakushin, LinkBuilder } = require('../class/hakushin');
const { elements, Gcg } = require('../utils/emojis');
const config = require('../../config');
const { Game, Game_Category, formatDesc, formatVision, formatWeapon, formatRegion } = require('../utils/game');

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
			.setAutocomplete(true)),
	async autocomplete(interaction) {
		const game = interaction.options.getString('game');
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name === 'category') {
			const choices = await Game_Category[game];
			const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()));

			await interaction.respond(
				filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
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
					const temp = new EmbedBuilder().setColor(config.embedColors.default).setDescription('This selection is not yet available yet.');
					update ? await interaction.update({ embeds: [temp] }) : await interaction.editReply({ embeds: [temp] });
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

async function buildGenshinCharacterReply(interaction, baseUrl, hakushin, id, selection, args, toUpdate) {
	let embed = new EmbedBuilder()
		.setColor(config.embedColors.default)
		.setAuthor({
			name: `"${hakushin.CharaInfo.Title}" ${hakushin.Name}`,
			iconURL: `${baseUrl}/UI/${hakushin.Icon}.webp`
		});
	let additionalActionRow;

	if (!selection || selection === 'overview') {
		embed = await buildGenshinOverviewEmbed(embed, hakushin, baseUrl);
	}
	else if (selection === 'talents') {
		embed = buildGenshinTalentsEmbed(embed, hakushin, baseUrl, args[0]);
		additionalActionRow = buildGenshinTalentsRow(hakushin, id, args[0]);
	}
	else if (selection === 'constellations') {
		embed = buildGenshinConstellationsEmbed(embed, hakushin, baseUrl, args[0]);
		additionalActionRow = buildGenshinConstellationRow(hakushin, id, args[0]);
	}
	else if (selection === 'ascension') {
		embed = buildGenshinAscensionEmbed(embed, hakushin);
	}

	const actionRow = buildGenshinSelectionMenu(selection, id, hakushin.Name);
	const response = {
		embeds: [embed],
		components: [actionRow, ...(additionalActionRow ? [additionalActionRow] : [])]
	};

	toUpdate ? await interaction.update(response) : await interaction.editReply(response);
}

// Overview
async function buildGenshinOverviewEmbed(embed, data, baseUrl) {
	const { hp, atk, def, ascensionStat } = await Hakushin.getCharacterMainAndSubStat(data);
	const quote = data.CharaInfo.Quotes.find(quote => quote.Title === "Hello");

	return embed.setThumbnail(baseUrl + '/UI/UI_NameCardPic_' + (data.Icon).split("_")[2] + '_P.webp')
		.setDescription(formatDesc(data.Desc) || 'No description available.')
		.addFields(
			{
				name: 'Character Information',
				value:
					`Rarity: ${'<:Star:1279903858763763732>'.repeat(data.Rarity === 'QUALITY_ORANGE' ? 5 : 4)}\n` +
					`Vision: ${formatVision(data.CharaInfo.Vision)}\n` +
					`Weapon: ${formatWeapon(data.Weapon)}\n` +
					`Region: ${formatRegion(data.CharaInfo.Region)}\n` +
					`Constellation: ${data.CharaInfo.Constellation}\n` +
					`Affiliation: ${data.CharaInfo.Native}\n` +
					`Birthday: ${(data.CharaInfo.Birth).join('/')}`,
				inline: false
			},
			{
				name: 'Base Stats (Lv.90)',
				value:
					`Base HP: ${hp}\n` +
					`Base ATK: ${atk}\n` +
					`Base DEF: ${def}\n` +
					`${ascensionStat.type}: ${ascensionStat.value}`,
				inline: false
			}
		)
		.setImage(`${baseUrl}/UI/UI_Gacha_AvatarImg_${(data.Icon).split("_")[2]}.webp`)
		.setFooter({ text: quote ? formatDesc(quote.Text, { bold: false }) : 'No quotes available.' });
}

// SSM
function buildGenshinSelectionMenu(selection, id, name) {
	const options = [
		new StringSelectMenuOptionBuilder()
			.setLabel('Overview')
			.setValue(`search_gi_character_${id}_overview`)
			.setDescription(`General information about ${name}`)
			.setDefault(!selection || selection === 'overview'),
		new StringSelectMenuOptionBuilder()
			.setLabel('Talents')
			.setValue(`search_gi_character_${id}_talents_s0`)
			.setDescription(`View ${name}'s talents [Skills and Passives]`)
			.setDefault(selection === 'talents'),
		new StringSelectMenuOptionBuilder()
			.setLabel('Constellations')
			.setValue(`search_gi_character_${id}_constellations_0`)
			.setDescription(`View ${name}'s constellations`)
			.setDefault(selection === 'constellations'),
		new StringSelectMenuOptionBuilder()
			.setLabel('Ascension')
			.setValue(`search_gi_character_${id}_ascension`)
			.setDescription(`View ${name}'s ascension materials`)
			.setDefault(selection === 'ascension')
	];

	return new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('genshin_character_select')
			.addOptions(options)
	);
}

// Talents
function buildGenshinTalentsEmbed(embed, hakushin, baseUrl, args) {
	const type = args[0];
	const index = parseInt(args.slice(1));
	const skills = hakushin.Skills;
	const passives = hakushin.Passives;

	let targetTalent = type === 's' ? skills[index] : passives[index];
	let addon = type === 's' ? '\n\n-# Multipliers for skills will be included in later updates.' : '';

	embed.setColor(config.embedColors.default)
		.setTitle(targetTalent.Name)
		.setDescription(formatDesc(targetTalent.Desc) + addon);

	if (type === 's') {
		embed.setThumbnail(`${baseUrl}/UI/${targetTalent.Promote[0].Icon}.webp`);
	}
	else if (type === 'p') {
		embed.setThumbnail(`${baseUrl}/UI/${targetTalent.Icon}.webp`);
	}

	return embed;
}

function buildGenshinTalentsRow(hakushin, id, args) {
	const skills = hakushin.Skills;
	const passives = hakushin.Passives;

	const row = new ActionRowBuilder();
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId('genshin_character_select_talents');

	[...skills, ...passives].map((item, index) => {
		const isSkill = skills.includes(item);
		const itemType = isSkill ? 's' : 'p';
		const itemIndex = isSkill ? skills.indexOf(item) : passives.indexOf(item);

		selectMenu.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(item.Name)
				.setValue(`search_gi_character_${id}_talents_${itemType}${itemIndex}`)
				.setDefault(args === itemType + itemIndex.toString())
		);
	});

	row.addComponents(selectMenu);
	return row;
}

// Cons
function buildGenshinConstellationsEmbed(embed, hakushin, baseUrl, args) {
	const constellation = hakushin.Constellations[args];
	const { Desc, Icon, Name } = constellation;

	embed.setTitle(Name)
		.setDescription(formatDesc(Desc))
		.setThumbnail(`${baseUrl}/UI/${Icon}.webp`)

	return embed;
}

function buildGenshinConstellationRow(hakushin, id, args) {
	const cons = hakushin.Constellations;
	const row = new ActionRowBuilder();
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId('genshin_character_select_constellations');

	Object.entries(cons).forEach(([index, con]) => {
		selectMenu.addOptions({
			label: `C${parseInt(index) + 1} | ${con.Name}`,
			value: `search_gi_character_${id}_constellations_${index}`,
			default: args === index
		});
	});

	row.addComponents(selectMenu);
	return row;
}

// Mats
function buildGenshinAscensionEmbed(embed, hakushin) {
	const mats = hakushin.Materials;
	const { Ascensions, Talents } = mats;

	// console.log(Ascensions, Talents);
	embed.setDescription('Materials will be added in a future update.');
	return embed;
}
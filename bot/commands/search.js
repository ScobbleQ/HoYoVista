const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Ambr } = require('../class/ambr');
const { elements, Gcg } = require('../utils/emojis');
const config = require('../../config');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search anything game related')
		.addStringOption(option => option
			.setName('game')
			.setDescription('The game to search in')
			.setRequired(true)
			.addChoices(
				{ name: 'Genshin Impact', value: 'genshin' },
				{ name: 'Honkai: Star Rail', value: 'hkrpg' },
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
		const ambr = new Ambr();
		let choices;

		if (focusedOption.name === 'category') {
			choices = await fetchCategoryChoices(game);

			const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
			await interaction.respond(
				filtered.slice(0, 10).map(choice => ({ name: choice, value: choice })),
			);
		}

		if (focusedOption.name === 'query') {
			const category = interaction.options.getString('category');

			if (game === 'genshin') {
				choices = await ambr.fetchGenshin(category, focusedOption.value);
			}
			else if (game === 'hkrpg') {
				choices = await ambr.fetchYatta(category, focusedOption.value);
			}

			await interaction.respond(
				choices.slice(0, 25).map(choice => ({ name: choice.name, value: choice.id.toString() })),
			);
		}
	},
	async execute(interaction, dbClient, hoyo, topic, id, selection, args, update = false) {
		const game = hoyo || interaction.options.getString('game');
		const category = topic || interaction.options.getString('category');
		const query = id || interaction.options.getString('query');
		const ambr = new Ambr();

		if (!update) { await interaction.deferReply(); }
		if (game === 'genshin') {
			const data = await ambr.fetchGenshinData(category, query, selection, update);

			if (!data) {
				return await interaction.editReply({
					embeds: [new EmbedBuilder()
						.setColor(config.embedColors.error)
						.setDescription(`Unable to locate ${query} under ${category} in ${game}`),
					],
				});
			}

			if (category === 'Characters') {
				await buildGenshinCharacterReply(interaction, query, data, selection, args, update);
			}
			else {
				await buildGenshinItemReply(interaction, query, category, data, selection, update);
			}
		}
		else if (game === 'hkrpg') {
			await interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.embedColors.error).setDescription('HSR is next after Genshin\'s search fully works.')], ephemeral: true });
		}
	},
};

async function fetchCategoryChoices(game) {
	const categoryData = {
		genshin: Ambr.genshinCategories,
		hkrpg: Ambr.yattaCategories,
	};

	return categoryData[game] || [];
}

async function buildGenshinCharacterReply(interaction, query, data, selection, args, update) {
	const isBeta = query.split('-')[1] === 'beta';
	const name = isBeta ? data.Name : data.name;

	let embed = new EmbedBuilder().setColor(config.embedColors.default);
	let additionalActionRow;

	if (!selection || selection === 'overview') {
		embed = await buildGenshinOverviewEmbed(embed, isBeta, data, name);
	}
	else if (selection === 'talents') {
		embed = buildGenshinTalentsEmbed(embed, isBeta, data, name, args[0]);
		additionalActionRow = buildGenshinTalentsRow(isBeta, data, selection, query, args[0]);
	}
	else if (selection === 'constellations') {
		embed = buildGenshinConstellationsEmbed(embed, isBeta, data, name, args[0]);
		additionalActionRow = buildGenshinConstellationRow(isBeta, data, selection, query, args[0]);
	}
	else if (selection === 'ascension') {
		embed = buildGenshinAscensionEmbed(embed, name);
	}
	else if (selection === 'builds') {
		embed = buildGenshinBuildsEmbed(embed, name);
	}

	const actionRow = buildGenshinSelectionMenu(query, selection, name, isBeta);
	const response = additionalActionRow ?
		{ embeds: [embed], components: [actionRow, additionalActionRow] } :
		{ embeds: [embed], components: [actionRow] };

	if (update) {
		await interaction.update(response);
	}
	else {
		await interaction.editReply(response);
	}
}

async function buildGenshinOverviewEmbed(embed, isBeta, data, name) {
	const title = isBeta ? data.CharaInfo.Title : data.fetter.title;
	const element = isBeta ? data.CharaInfo.Vision : data.element;
	const birthday = isBeta ? data.CharaInfo.Birth : data.birthday;
	const weapon = isBeta ? data.Weapon : data.weaponType;
	const rarity = isBeta ? (data.Rarity === 'QUALITY_ORANGE' ? 5 : 4) : data.rank;
	const constellation = isBeta ? data.CharaInfo.Constellation : data.fetter.constellation;
	const release = isBeta ? data.CharaInfo.ReleaseDate : `<t:${data.release}:f>`;
	const { base, max } = await Ambr.getCharacterMainAndSubStat(isBeta, isBeta ? data : data.upgrade, isBeta ? null : data.specialProp);
	const icon = isBeta ? data.Icon : data.icon;
	const detail = isBeta ? (data.Desc || 'No description available.') : data.fetter.detail;
	const baseUrl = isBeta ? 'https://api.hakush.in/gi/UI/' : Ambr.uiIcon;
	const imgType = isBeta ? '.webp' : '.png';
	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	return embed.setTitle(`${isBeta ? '[BETA] ' : ''}${name} • ${title}`)
		.setThumbnail(baseUrl + icon + imgType)
		.addFields(
			{ name: 'Rarity', value: '<:Star:1279903858763763732>'.repeat(rarity), inline: true },
			{ name: 'Element', value: element, inline: true },
			{ name: 'Weapon', value: weapon, inline: true },
			{ name: 'Constellation', value: constellation, inline: true },
			{ name: 'Birthday', value: `${months[birthday[0] - 1]} ${birthday[1]}`, inline: true },
			{ name: 'Release Date', value: release, inline: true },
			{
				name: 'Base Stats (Lv.1)',
				value: `${base.baseHp.propType} ${base.baseHp.value}\n` +
					`${base.baseAtk.propType} ${base.baseAtk.value}\n` +
					`${base.baseDef.propType} ${base.baseDef.value}\n` +
					`${base.ascensionStat.propType} ${base.ascensionStat.value}`,
				inline: true,
			},
			{
				name: 'Base Stats (Lv.90)',
				value: `${max.baseHp.propType} ${max.baseHp.value}\n` +
					`${max.baseAtk.propType} ${max.baseAtk.value}\n` +
					`${max.baseDef.propType} ${max.baseDef.value}\n` +
					`${max.ascensionStat.propType} ${max.ascensionStat.value}`,
				inline: true,
			},
		)
		.setImage(baseUrl + 'UI_Gacha_AvatarImg_' + (icon).split('_')[2] + imgType)
		.setFooter({ text: detail });
}

function buildGenshinTalentsEmbed(embed, isBeta, data, name, index) {
	const baseUrl = isBeta ? 'https://api.hakush.in/gi/UI/' : Ambr.uiIcon;
	const imgType = isBeta ? '.webp' : '.png';

	const charName = isBeta ? `[BETA] ${name}` : name;
	const charIcon = isBeta ? data.Icon : data.icon;

	const talents = isBeta ? data.Skills : data.talent;
	const talent = talents[String(index)];

	const talentName = isBeta ? talent.Name : talent.name;
	const talentDescription = isBeta ? talent.Desc : talent.description;
	const talentIcon = isBeta ? talent.Promote[0].Icon : talent.icon;

	embed.setAuthor({ name: charName, iconURL: baseUrl + charIcon + imgType })
		.setTitle(talentName)
		.setDescription(Ambr.formatBasicDescription(talentDescription))
		.setThumbnail(baseUrl + talentIcon + imgType);

	if (isBeta || talent.type === 0 || talent.type === 1) {
		let details;
		const primaryIndex = isBeta ? 9 : 10;
		const fallbackIndex = isBeta ? 0 : '1';

		if (talent[isBeta ? 'Promote' : 'promote'][primaryIndex]) {
			details = talent[isBeta ? 'Promote' : 'promote'][primaryIndex];
		}
		else if (talent[isBeta ? 'Promote' : 'promote'][fallbackIndex]) {
			details = talent[isBeta ? 'Promote' : 'promote'][fallbackIndex];
		}

		function formatSkillAttributes(description, params) {
			return description.map(desc => {
				const formattedDesc = desc.replace(/{param(\d+):([PFI\d]+)}/g, (match, paramIndex, format) => {
					const index = parseInt(paramIndex, 10) - 1;
					const value = params[index];

					if (format === 'P') {
						return `${(value * 100).toFixed(0)}%`;
					}
					else if (format === 'F1') {
						return `${Math.round(value)}`;
					}
					else if (format === 'F1P') {
						return `${(value * 100).toFixed(1)}%`;
					}
					else {
						return value;
					}
				});

				return formattedDesc.replace(/\|/, ': ');
			}).join('\n');
		}

		const desc = isBeta ? details.Desc : details.description;
		const params = isBeta ? details.Param : details.params;
		const descriptionText = formatSkillAttributes(desc, params);

		embed.addFields({
			name: 'Skill Attributes (Lv. 10)',
			value: descriptionText,
		});
	}

	return embed;
}

function buildGenshinTalentsRow(isBeta, data, selection, query, args) {
	const id = isBeta ? query.split('-')[0] : query;
	const talents = isBeta ? data.Skills : data.talent;

	const row = new ActionRowBuilder();
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId('genshin_character_select_talents');

	Object.entries(talents).map(([index, talent]) => {
		const talentName = isBeta ? talent.Name : talent.name;
		const characterId = isBeta ? `${id}-beta` : id;

		selectMenu.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(talentName)
				.setValue(`search_genshin_Characters_${characterId}_${selection}_${index}`)
				.setDefault(args === index.toString()),
		);
	});

	row.addComponents(selectMenu);
	return row;
}

function buildGenshinConstellationsEmbed(embed, isBeta, data, name, args) {
	const baseUrl = isBeta ? 'https://api.hakush.in/gi/UI/' : Ambr.uiIcon;
	const imgType = isBeta ? '.webp' : '.png';

	const charName = isBeta ? `[BETA] ${name}` : name;
	const charIcon = isBeta ? data.Icon : data.icon;

	const cons = isBeta ? data.Constellations : data.constellation;
	const con = cons[args];

	const conName = isBeta ? con.Name : con.name;
	const conDescription = isBeta ? con.Desc : con.description;
	const conIcon = isBeta ? con.Icon : con.icon;

	embed.setAuthor({ name: charName, iconURL: baseUrl + charIcon + imgType })
		.setTitle(conName)
		.setDescription(Ambr.formatBasicDescription(conDescription))
		.setThumbnail(baseUrl + conIcon + imgType);

	return embed;
}

function buildGenshinConstellationRow(isBeta, data, selection, query, args) {
	const id = isBeta ? query.split('-')[0] : query;
	const cons = isBeta ? data.Constellations : data.constellation;

	const row = new ActionRowBuilder();
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId('genshin_character_select_constellations');

	Object.entries(cons).map(([index, con]) => {
		const conName = isBeta ? con.Name : con.name;
		const characterId = isBeta ? `${id}-beta` : id;

		selectMenu.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(`${parseInt(index) + 1}. ${conName}`)
				.setValue(`search_genshin_Characters_${characterId}_${selection}_${index}`)
				.setDefault(args === index),
		);
	});

	row.addComponents(selectMenu);
	return row;
}

function buildGenshinAscensionEmbed(embed, name) {
	return embed.setTitle(`${name}'s Ascension Materials`);
}

function buildGenshinBuildsEmbed(embed, name) {
	return embed.setTitle(`${name}'s Builds`);
}

function buildGenshinSelectionMenu(query, selection, name, isBeta) {
	const options = [
		new StringSelectMenuOptionBuilder()
			.setLabel('Overview')
			.setValue(`search_genshin_Characters_${query}_overview`)
			.setDescription(`General information about ${name}`)
			.setDefault(!selection || selection === 'overview'),
		new StringSelectMenuOptionBuilder()
			.setLabel('Talents')
			.setValue(`search_genshin_Characters_${query}_talents_0`)
			.setDescription(`View ${name}'s talents [Normal, Skill, Burst, Passives]`)
			.setDefault(selection === 'talents'),
		new StringSelectMenuOptionBuilder()
			.setLabel('Constellations')
			.setValue(`search_genshin_Characters_${query}_constellations_0`)
			.setDescription(`View ${name}'s constellations`)
			.setDefault(selection === 'constellations'),
		new StringSelectMenuOptionBuilder()
			.setLabel('Ascension')
			.setValue(`search_genshin_Characters_${query}_ascension`)
			.setDescription(`View ${name}'s ascension materials`)
			.setDefault(selection === 'ascension'),
	];

	if (!isBeta) {
		options.push(
			new StringSelectMenuOptionBuilder()
				.setLabel('Builds')
				.setValue(`search_genshin_Characters_${query}_builds`)
				.setDescription(`View ${name}'s meta setups [Weapons, Artifacts, Teams]`)
				.setDefault(selection === 'builds'),
		);
	}

	return new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('genshin_character_select')
			.addOptions(options),
	);
}

async function buildGenshinItemReply(interaction, query, category, data) {
	const isBeta = query.split('-')[1] === 'beta';
	const embed = new EmbedBuilder().setColor(config.embedColors.default);

	switch (category) {
	case 'Weapons':
		const name = isBeta ? '[BETA] ' + data.Name : data.name;
		const affix = isBeta ? data.Refinement : data.affix[`1${data.id}`];
		const affixName = isBeta ? affix['1'].Name : affix.name;
		const affixDescription = Ambr.formatAffixDescription(isBeta, isBeta ? affix : affix.upgrade);
		const { mainStat, subStat } = await Ambr.getWeaponMainAndSubStat(isBeta, isBeta ? data : data.upgrade);
		const rarity = isBeta ? data.Rarity : data.rank;
		const url = isBeta ? 'https://api.hakush.in/gi/UI/' : Ambr.uiIcon;
		const icon = isBeta ? data.Icon : data.icon;
		const format = isBeta ? '.webp' : '.png';
		const description = isBeta ? (data.Desc || 'No description available.') : data.description;

		embed.setTitle(name)
			.setDescription(`**Base ATK**\n${Math.round(mainStat.value)}\n**${subStat.propType}**\n${subStat.value.toFixed(1)}%\n${'<:Star:1279903858763763732>'.repeat(rarity)}\n**${affixName}**\n${affixDescription}`)
			.setThumbnail(`${url}${icon}${format}`)
			.setFooter({ text: description });
		break;
	case 'Artifacts':
		embed.setTitle(data.name);
		embed.setThumbnail(Ambr.uiIcon + 'reliquary/' + data.icon + '.png');

		const maxLevel = Math.max(...data.levelList);
		embed.setDescription('<:Star:1279903858763763732>'.repeat(maxLevel));

		const affixKeys = Object.keys(data.affixList);
		for (let i = 0; i < affixKeys.length; i++) {
			const pieces = i === 0 ? '2-Pieces' : '4-Pieces';
			embed.addFields({
				name: `${pieces}`,
				value: data.affixList[affixKeys[i]],
			});
		}
		break;
	case 'Materials':
		embed.setTitle(data.name)
			.setAuthor({ name: data.type })
			.setThumbnail(`${Ambr.uiIcon}${data.icon}.png`)
			.setDescription(`${'<:Star:1279903858763763732>'.repeat(data.rank)}\n${data.description.replace(/\\n/g, '\n')}`);

		if (data.recipe) {
			const recipeLines = Object.values(data.recipe).map(recipeItem => {
				return Object.values(recipeItem).map(item => `${item.name} x${item.count}`).join(' and ');
			}).slice(0, 3).join('\n');

			if (recipeLines) {
				embed.addFields({ name: '**Recipe(s)**', value: recipeLines });
			}
		}

		if (data.source) {
			const sourceLines = data.source.map(src => {
				const days = src.days ? ` (${src.days})` : '';
				return `${src.name}${days}`;
			}).join('\n');

			if (sourceLines) {
				embed.addFields({ name: '**Source(s)**', value: sourceLines });
			}
		}

		if (data.recipe || data.source) {
			embed.setFooter({ text: 'Will only display up to 3 recipes/sources.' });
		}
		break;
	case 'Namecards':
		embed.setTitle(data.name)
			.setDescription(`${'<:Star:1279903858763763732>'.repeat(data.rank)}\n${data.description.replace(/\\n/g, '\n')}`)
			.setImage(`${Ambr.uiIcon}/namecard/${data.icon}.png`)
			.setFooter({ text: data.source });
		break;
	case 'Monsters':
		embed.setTitle(data.name)
			.setDescription(`${data.type}\n${data.description.replace(/\\n/g, '\n')}`)
			.setThumbnail(`${Ambr.uiIcon}/monster/${data.icon}.png`);

		const entry = Object.values(data.entries)[0];
		if (entry.reward) {
			const rewardsByRank = {};

			for (const reward of Object.values(entry.reward)) {
				const rank = reward.rank;
				if (!rewardsByRank[rank]) {
					rewardsByRank[rank] = [];
				}
				rewardsByRank[rank].push(reward.name);
			}

			let rewardString = '';
			Object.keys(rewardsByRank).sort((a, b) => b - a).forEach(rank => {
				rewardString += `**Rank ${rank}:** ${rewardsByRank[rank].join(', ')}\n`;
			});

			embed.addFields({ name: '**Rewards**', value: rewardString });
		}

		if (entry.resistance) {
			let resistanceString = '';
			for (const [key, value] of Object.entries(entry.resistance)) {
				resistanceString += `${elements[key]}: ${value * 100}%\n`;
			}

			embed.addFields({ name: '**Resistances**', value: resistanceString });
		}

		if (entry.prop) {

		}
		break;
	case 'Furniture':
		embed.setTitle(data.name)
			.setAuthor({ name: `${data.categories[0]} | ${data.types[0]}` })
			.setThumbnail(`${Ambr.uiIcon}furniture/${data.icon}.png`)
			.setFooter({ text: data.description.replace(/\\n/g, '\n') });

		let furnDesc = `${'<:Star:1279903858763763732>'.repeat(data.rank)}\nComfort: ${data.comfort}\n${data.cost ? `Load: ${data.cost}` : ''}`;

		if (data.recipe) {
			furnDesc += `\nTrust: ${data.recipe.exp}\nCreation Time: ${data.recipe.time / 3600}h`;
			let ingredients = '';
			for (const ingredient of Object.values(data.recipe.input)) {
				ingredients += `${ingredient.name} x${ingredient.count}\n`;
			}

			embed.addFields({ name: '**Ingrediens**', value: ingredients.trim() });
		}
		embed.setDescription(furnDesc);
		break;
	case 'Food':
		embed.setTitle(data.name)
			.setAuthor({ name: data.type, iconURL: `${Ambr.uiIcon}${data.recipe.effectIcon}.png` })
			.setThumbnail(`${Ambr.uiIcon}${data.icon}.png`)
			.setFooter({ text: data.description.replace(/\\n/g, '\n') });

		if (data.recipe) {
			if (data.recipe.input) {
				let ingredients = '';
				for (const ingredient of Object.values(data.recipe.input)) {
					ingredients += `${ingredient.name} x${ingredient.count}\n`;
				}

				embed.addFields({ name: '**Ingrediens**', value: ingredients.trim() });
			}

			if (data.recipe.effect) {
				let effects = '';
				for (const effect of Object.values(data.recipe.effect)) {
					const formattedEffect = effect
						.replace(/<color=[^>]+>/g, '**')
						.replace(/<\/color>/g, '**');
					effects += `${formattedEffect}\n`;
				}

				embed.setDescription(`${'<:Star:1279903858763763732>'.repeat(data.rank)}\n${effects.trim()}`);
			}
		}

		if (data.source) {
			const sourceLines = data.source.map(src => {
				return src.name;
			}).join('\n');

			if (sourceLines) {
				embed.addFields({ name: '**Source(s)**', value: sourceLines });
			}
		}
		break;
	case 'TCG':
		const tagsArray = [];
		for (const [key, value] of Object.entries(data.tags)) {
			tagsArray.push(`${Gcg[key]} ${value}`);
		}

		const props = [];
		for (const [key, value] of Object.entries(data.props)) {
			props.push(`${Gcg[key]}${value}`);
		}

		embed.setTitle(data.storyTitle)
			.setThumbnail(`${Ambr.uiIcon}gcg/${data.icon}.png`)
			.setDescription(`${tagsArray.join(' **|** ')}\n${props.join(' ')}`)
			.setFooter({ text: data.storyDetail });

		if (data.talent) {
			for (const [_, talentData] of Object.entries(data.talent)) {
				if (!talentData.name || !talentData.description) {
					continue;
				}

				const tag = Object.values(talentData.tags)[0];
				let fieldName = `[${tag}] ${talentData.name} `;

				if (talentData.cost) {
					const costArray = [];
					for (const [costKey, costValue] of Object.entries(talentData.cost)) {
						costArray.push(`${Gcg[costKey]}${costValue}`);
					}
					fieldName += costArray.join(' ');
				}

				const description = await Ambr.formatGcgTalentDescription(talentData.description, talentData.params);
				embed.addFields({ name: fieldName, value: `${description}` });
			}
		}

		if (data.source) {
			embed.addFields({ name: 'Source', value: (data.source).replace(/\\n/g, '\n') });
		}
		break;
	default:
		embed.setDescription(`Unable to locate ${query} under ${category} in Genshin Impact`);
	}

	await interaction.editReply({ embeds: [embed] });
}
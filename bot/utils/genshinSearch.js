const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');
const { Hakushin } = require('../class/hakushin');
const { formatDesc, formatVision, formatWeapon, formatRegion } = require('../utils/game');
const { elements, Gcg, Materials } = require('../utils/emojis');
const config = require('../../config');
const axios = require('axios');
const cheerio = require('cheerio');

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
		embed = buildGenshinTalentsEmbed(embed, id, hakushin, baseUrl, args[0]);
		additionalActionRow = buildGenshinTalentsRow(hakushin, id, args[0]);
	}
	else if (selection === 'constellations') {
		embed = buildGenshinConstellationsEmbed(embed, hakushin, baseUrl, args[0]);
		additionalActionRow = buildGenshinConstellationRow(hakushin, id, args[0]);
	}
	else if (selection === 'ascension') {
		embed = buildGenshinAscensionEmbed(embed, hakushin);
	}
	else if (selection === 'guide') {
		embed = await buildGenshinGuideEmbed(embed, hakushin);
	}

	const actionRow = buildGenshinSelectionMenu(selection, id, hakushin.Name);
	const response = {
		embeds: [embed],
		components: [actionRow, ...(additionalActionRow ? [additionalActionRow] : [])]
	};

	let reply;
	toUpdate ? reply = await interaction.update(response) : reply = await interaction.editReply(response);

	const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 300_000 });
	collector.on('end', (e) => {
		const disabledComponents = response.components.map(row => {
			const actionRow = row.toJSON();

			return {
				...actionRow,
				components: actionRow.components.map(component => ({
					...component,
					disabled: true
				}))
			};
		});

		reply.edit({ components: disabledComponents });
	});
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
					`Rarity: ${'<:Star:1279903858763763732>'.repeat(data.Rarity === 'QUALITY_PURPLE' ? 4 : 5)}\n` +
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
		.setFooter({ text: quote ? formatDesc(quote.Text, { bold: false, limit: true }) : 'No quotes available.' });
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
			.setDescription(`View ${name}'s combat, ascension, and passive talents`)
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
			.setDefault(selection === 'ascension'),
		new StringSelectMenuOptionBuilder()
			.setLabel('Guide')
			.setValue(`search_gi_character_${id}_guide`)
			.setDescription(`View ${name}'s guide from KQM`)
			.setDefault(selection === 'guide')
	];

	return new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('genshin_character_select')
			.addOptions(options)
	);
}

// Talents
function buildGenshinTalentsEmbed(embed, id, hakushin, baseUrl, args) {
	const [type, indexStr] = args;
	const index = parseInt(indexStr, 10);
	const { Skills: skills, Passives: passives } = hakushin;

	const targetTalent = type === 's' ? skills[index] : passives[index];
	const { Name, Icon, Desc } = targetTalent;

	embed.setColor(config.embedColors.default)
		.setTitle(Name)
		.setDescription(formatDesc(Desc));

	const setThumbnailAndImage = (icon) => {
		embed.setThumbnail(`${baseUrl}/UI/${icon}.webp`)
			.setImage(fetchCharacterGif(id, icon));
	};

	if (type === 's') {
		let talentLevel = 10;
		let promote = targetTalent.Promote[talentLevel - 1];
		if (!promote) {
			talentLevel = 1;
			promote = targetTalent.Promote[0];
		}
		const { Desc: promoteDesc, Icon: promoteIcon, Param } = promote;

		const formatSkillAttributes = (description, params) => {
			const formatHandlers = {
				'P': (value) => `${(value * 100).toFixed(0)}%`,
				'I': Math.round,
				'F1': Math.round,
				'F1P': (value) => `${(value * 100).toFixed(1)}%`,
				'F2P': (value) => `${(value * 100).toFixed(2)}%`,
				'DEFAULT': (value) => value
			};

			return description.map(desc =>
				desc.replace(/{param(\d+):([PFI\d]+)}/g, (match, paramIndex, format) => {
					const value = params[parseInt(paramIndex, 10) - 1];
					return (formatHandlers[format] || formatHandlers['DEFAULT'])(value);
				}).replace(/\|/, ': ')
			).join('\n').trim();
		};

		embed.addFields({
			name: `Skill Attributes (Lv.${talentLevel})`,
			value: formatSkillAttributes(promoteDesc, Param)
		});

		setThumbnailAndImage(promoteIcon);
	}
	else {
		setThumbnailAndImage(Icon);
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
		let descriptionText = 'Combat Talent';

		if (!isSkill) {
			descriptionText = item.Unlock === 0 ? 'Passive Talent' : `Ascension Phase ${item.Unlock} Talent`;
		}

		selectMenu.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(item.Name)
				.setValue(`search_gi_character_${id}_talents_${itemType}${itemIndex}`)
				.setDescription(descriptionText)
				.setDefault(args === itemType + itemIndex.toString())
		);
	});

	return row.addComponents(selectMenu);
}

// Cons
function buildGenshinConstellationsEmbed(embed, hakushin, baseUrl, args) {
	const constellation = hakushin.Constellations[args];
	const { Desc, Icon, Name } = constellation;

	return embed.setTitle(Name)
		.setDescription(formatDesc(Desc))
		.setThumbnail(`${baseUrl}/UI/${Icon}.webp`)
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

	return row.addComponents(selectMenu);
}

// Mats
function buildGenshinAscensionEmbed(embed, hakushin) {
	const mats = hakushin.Materials;
	const { Ascensions, Talents } = mats;

	const aggregateMats = (materialGroups) => {
		const matMap = new Map();
		let totalCost = 0;

		materialGroups.forEach(group => {
			group.forEach(entry => {
				totalCost += entry.Cost;
				entry.Mats.forEach(mat => {
					if (matMap.has(mat.Id)) {
						matMap.set(mat.Id, {
							Name: mat.Name,
							Id: mat.Id,
							Count: matMap.get(mat.Id).Count + mat.Count
						});
					} else {
						matMap.set(mat.Id, { Name: mat.Name, Id: mat.Id, Count: mat.Count });
					}
				});
			});
		});

		const materials = Array.from(matMap.entries())
			.sort(([idA], [idB]) => idA - idB)
			.map(([, mat]) => `${Materials[mat.Id]} ${mat.Name} x${mat.Count}`)
			.join('\n');

		return `${materials}\n${Materials['202']} Mora x${totalCost.toLocaleString()}`;
	}

	return embed.addFields(
		{ name: 'Ascension Materials (1-90)', value: aggregateMats([Ascensions]) },
		{ name: 'Talent Level-up Materials (1-10)', value: aggregateMats(Talents) },
	);
}

async function buildGenshinGuideEmbed(embed, hakushin) {
	const originalName = hakushin.Icon.split('_')[2].toLowerCase();

	try {
		const finalUrl = await fetchImageUrl(originalName);
		if (!finalUrl) throw new Error('Image URL not found');

		return embed.setImage(finalUrl);
	} catch (error) {
		try {
			const alternateName = hakushin.Name.toLowerCase();
			const finalUrl = await fetchImageUrl(alternateName);
			return embed.setImage(finalUrl);
		} catch (altError) {
			return embed.setDescription('Unable to find the guide for ' + originalName);
		}
	}
}

const fetchCharacterGif = (charId, abilityId) => {
	return `https://raw.githubusercontent.com/ScobbleQ/GenshinAbilityShowcase/main/${charId}/${abilityId}.gif`;
}

async function buildGenshinItemReply(interaction, baseUrl, hakushin, category, query) {
	let embed = new EmbedBuilder()
		.setColor(config.embedColors.default)
		.setThumbnail(`${baseUrl}/UI/${hakushin.Icon}.webp`);

	switch (category) {
		case 'monster':
			embed.setTitle(hakushin.Name)
				.setDescription(`${hakushin.Codex}\n${formatDesc(hakushin.Desc)}`);

			if (hakushin.Reward) {
				const rewardsByRank = {};

				for (const reward of Object.values(hakushin.Reward)) {
					const rank = reward.Rank;
					if (!rewardsByRank[rank]) {
						rewardsByRank[rank] = [];
					}
					rewardsByRank[rank].push(reward.Id);
				}

				let rewardString = '';
				Object.keys(rewardsByRank).sort((a, b) => b - a).forEach(rank => {
					rewardString += `**Rank ${rank}:** ${rewardsByRank[rank].join(', ')}\n`;
				});

				embed.addFields({ name: '**Rewards**', value: rewardString });
			}

			if (hakushin.Child) {
				const childObject = Object.entries(hakushin.Child)[0][1];
				let resistanceString = '';
				for (const [key, value] of Object.entries(childObject.SubHurt)) {
					resistanceString += `${elements[key]}: ${Math.round(value * 100)}%\n`;
				}

				embed.addFields({ name: '**Resistances**', value: resistanceString });
			}
			break;
		case 'item':
			embed.setTitle(hakushin.Name)
				.setAuthor({ name: hakushin.Type })
				.setDescription(`${'<:Star:1279903858763763732>'.repeat(hakushin.Rank ? hakushin.Rank : 1)}\n${formatDesc(hakushin.Desc)}`);

			if (hakushin.recipe) {
				const recipeLines = Object.values(hakushin.recipe).map(recipeItem => {
					return Object.values(recipeItem).map(item => `${item.name} x${item.count}`).join(' and ');
				}).slice(0, 3).join('\n');

				if (recipeLines) {
					embed.addFields({ name: '**Recipe(s)**', value: recipeLines });
				}
			}

			if (hakushin.JumpDescs.length > 0 || hakushin.SourceList.length > 0) {
				embed.addFields({
					name: '**Source**',
					value: (hakushin.JumpDescs).join('\n') + '\n' + (hakushin.SourceList).join('\n')
				});
			}

			if (hakushin.Effect) {
				embed.addFields({ name: 'Effect', value: formatDesc(hakushin.Effect) });
			}
			break;
		case 'artifact':
			const { Affix } = hakushin;

			embed.setTitle(Affix[0].Name)
				.setDescription('<:Star:1279903858763763732>'.repeat(Math.max(...hakushin.Rank)));

			const affixKeys = Object.keys(Affix);
			for (let i = 0; i < affixKeys.length; i++) {
				const pieces = i === 0 ? '2-Pieces' : '4-Pieces';
				embed.addFields({
					name: `${pieces}`,
					value: Affix[affixKeys[i]].Desc,
				});
			}
			break;
		case 'weapon':
			embed.setTitle(hakushin.Name + ' (Lv.90)')
				.setDescription(`Rarity: ${'<:Star:1279903858763763732>'.repeat(hakushin.Rarity)}
                Type: ${hakushin.WeaponType}`)
				.setFooter({ text: hakushin.Desc ? formatDesc(hakushin.Desc) : 'No description available' });

			if (Object.keys(hakushin.Refinement).length > 0) {
				embed.addFields({
					name: hakushin.Refinement['1'].Name,
					value: formatAffixDescription(hakushin.Refinement)
				})
			}

			embed.addFields({
				name: 'Acension Materials',
				value: 'Will be added in future updates'
			})
			break;
		case 'gcg':
			let tagsArray = [];
			tagsArray.push(`${hakushin.Tag}`);

			let props = [];
			props.push(`${Gcg['GCG_PROP_HP']}${hakushin.Hp}`);
			props.push(`${Gcg['GCG_PROP_ENERGY']}${hakushin.Cost}`);

			embed.setTitle(hakushin.Title)
				.setDescription(`${tagsArray.join(' **|** ')}\n${props.join(' ')}`)
				.setFooter({ text: hakushin.Desc });

			if (hakushin.Talent) {
				for (const [_, talentData] of Object.entries(hakushin.Talent)) {
					if (!talentData.Name || !talentData.Desc) {
						continue;
					}

					let fieldName = `[${adjustM(talentData.Tag)}] ${talentData.Name} `;

					if (talentData.Cost) {
						const costArray = [];
						for (const [costKey, costValue] of Object.entries(talentData.Cost)) {
							costArray.push(`${Gcg[costKey]}${costValue}`);
						}
						fieldName += costArray.join(' ');
					}

					embed.addFields({
						name: fieldName,
						value: `${formatDesc(formatDesc2(talentData.Desc, talentData.Child))}`,
					});
				}
			}

			if (hakushin.Source) {
				embed.addFields({ name: 'Source', value: formatDesc(hakushin.Source) });
			}
			break;
		case 'furniture':
			embed.setTitle(hakushin.Name)
				.setAuthor({ name: `${(hakushin.Type).join(', ')} | ${(hakushin.Type2).join(', ')}` })
				.setFooter({ text: formatDesc(hakushin.Desc) });

			let furnDesc = `${'<:Star:1279903858763763732>'.repeat(hakushin.Rank)}\nComfort: ${hakushin.Comfort}${hakushin.Cost ? `\nLoad: ${hakushin.Cost}` : ""}`;

			if (hakushin.Recipe) {
				furnDesc += `\nTrust: ${hakushin.Recipe.Exp}\nCreation Time: ${hakushin.Recipe.Time / 3600}h`;
				let ingredients = '';
				for (const ingredient of Object.values(hakushin.Recipe.Items)) {
					ingredients += `${ingredient.id} x${ingredient.count}\n`;
				}

				embed.addFields({ name: '**Ingredients**', value: ingredients.trim() });
			}

			if (hakushin.Source) {
				embed.addFields({ name: '**Source**', value: formatDesc((hakushin.Source).join('\n')) });
			}

			embed.setDescription(furnDesc);
			break;
	}

	await interaction.editReply({ embeds: [embed] });
}

function formatAffixDescription(description) {
	const regex = /<color=#99FFFFFF>(.*?)<\/color>/g;
	let affixDescription = description['1'].Desc;
	let matchesPerIndex = [];

	const processMatches = (descObj) => {
		const match = descObj.match(regex);
		if (match) {
			match.forEach((value, index) => {
				value = value.replace(/<[^>]*>/g, '');
				if (!matchesPerIndex[index]) matchesPerIndex[index] = [];
				matchesPerIndex[index].push(value);
			});
		}
	};

	for (const key in description) {
		processMatches(description[key].Desc);
	}

	const formattedValues = matchesPerIndex.map(values => {
		const isPercentage = values[0].includes('%');
		const cleanedValues = values.map(val => val.replace('%', ''));
		const joinedValues = cleanedValues.join('/');
		return `**${joinedValues}${isPercentage ? '%' : ''}**`;
	});

	affixDescription = affixDescription.replace(regex, () => formattedValues.shift());
	return affixDescription;
}

function formatDesc2(desc, childData) {
	return desc.replace(/\$\[([^\]]+)\]/g, (match, key) => {
		if (typeof childData[key] === 'object') {
			let childName = childData[key].Name ? childData[key].Name : '';
			return `${childName}`;
		} else {
			return childData[key];
		}
	});
}

function adjustM(value) {
	const e = Object.freeze({
		GCG_SKILL_TAG_A: 'Normal Attack',
		GCG_SKILL_TAG_E: 'Elemental Skill',
		GCG_SKILL_TAG_Q: 'Elemental Burst',
		GCG_SKILL_TAG_PASSIVE: 'Passive Skill',
	});

	return e[value] || value;
}

async function fetchImageUrl(name) {
	const url = `https://kqm.gg/i/${name}/`;

	const response = await axios.get(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15',
			'Referer': url
		}
	});

	const $ = cheerio.load(response.data);
	const finalUrl = $('meta[property="og:image"]').attr('content');
	return finalUrl;
}

module.exports = { buildGenshinCharacterReply, buildGenshinItemReply }
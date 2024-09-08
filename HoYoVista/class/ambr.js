const axios = require('axios');
const { Gcg } = require('../utils/emojis');

class Ambr {
    constructor() {
        this.name = 'Ambr';
    }

    async fetchGenshin(category, query) {
        const apiCategory = Ambr.genshinCategoryMapping[category.toLowerCase()];
        const url = `${Ambr.ambrLink}${apiCategory}`;
        const { data: { data: { items } } } = await axios.get(url);

        const mapItems = (item) => ({ name: item.name, id: item.id });

        let processedItems = Object.values(items).map(mapItems);

        const betaCategory = category.slice(0, -1).toLowerCase();
        const { data: betaData } = await axios.get(Ambr.genshinBeta);
        const betaIds = betaData[betaCategory] || [];

        if (betaIds.length) {
            const betaItems = await Promise.all(betaIds.map(async (id) => {
                const betaItemUrl = `${Ambr.genshinBetaInfo}${betaCategory}/${id}.json`;
                const { data: betaItemData } = await axios.get(betaItemUrl);
                return { name: betaItemData.Name, id: `${id}-beta` };
            }));

            processedItems = processedItems.concat(betaItems);
        }

        return processedItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
    }

    async fetchYatta(category, query) {
        const apiCategory = Ambr.yattaCategoryMapping[category.toLowerCase().replace(' ', '')];
        const url = Ambr.yattaLink + apiCategory;
        const { data } = await axios.get(url);
        let items = Object.values(data.data.items);

        switch (apiCategory) {
            case 'avatar':
                items = items.map(character => ({
                    name: `${character.name}`,
                    id: character.id
                }));
                break;
            case 'equipment':
                items = items.map(lightcone => ({
                    name: `${lightcone.name}`,
                    id: lightcone.id
                }));
                break;
            case 'relic':
                items = items.map(relic => ({
                    name: `${relic.name}`,
                    id: relic.id
                }));
                break;
            case 'item':
                items = items.map(item => ({
                    name: `${item.name}`,
                    id: item.id
                }));
                break;
        }

        return items.filter(item => item.name.toLowerCase().startsWith(query.toLowerCase()));
    }

    async fetchGenshinData(category, id) {
        let url;

        if (id.includes('-beta')) {
            id = id.split('-')[0];
            url = Ambr.genshinBetaInfo + category.slice(0, -1).toLowerCase() + '/' + id + '.json';
            const { data } = await axios.get(url);
            return data;
        } else {
            url = Ambr.ambrLink + Ambr.genshinCategoryMapping[category.toLowerCase()] + '/' + id;
            const { data } = await axios.get(url);
            return data.data;
        }
    }

    static formatAffixDescription(beta, description) {
        const regex = /<color=#99FFFFFF>(.*?)<\/color>/g;
        let affixDescription = beta ? description['1'].Desc : description[0];
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

        if (beta) {
            for (const key in description) {
                processMatches(description[key].Desc);
            }
        } else {
            for (let i = 0; i <= 4; i++) {
                processMatches(description[i.toString()]);
            }
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

    static formatBasicDescription(description) {
        description = description.replace(/<color=#\w+>(.*?)<\/color>/g, '**$1**'); // Bold text
        description = description.replace(/<\/?i>/gi, '*'); // Italics
        description = description.replace(/<\/?[^>]+(>|$)/g, ""); // Remove HTML tags
        description = description.replace(/\\n/g, '\n'); // New line

        return description;
    }

    static async getCharacterMainAndSubStat(beta, upgrades, specialProp) {
        const statNameResponse = await axios.get('https://api.ambr.top/v2/en/manualWeapon');
        const statData = statNameResponse.data.data;

        const getBaseStats = (baseValues, keys, baseCrit) => ({
            baseHp: {
                propType: statData[keys[0]].replace("Base", "").trim(),
                value: Math.round(baseValues[0])
            },
            baseAtk: {
                propType: statData[keys[1]].replace("Base", "").trim(),
                value: Math.round(baseValues[1])
            },
            baseDef: {
                propType: statData[keys[2]].replace("Base", "").trim(),
                value: Math.round(baseValues[2])
            },
            ascensionStat: {
                propType: statData[specialProp].replace("Base", "").trim(),
                value: baseCrit + '%'
            }
        });

        const getMaxStats = (baseValues, keys, lastKey, statModifier, baseCrit) => ({
            baseHp: {
                propType: statData[keys[0]].replace("Base", "").trim(),
                value: Math.round(lastKey[keys[0]] + baseValues[0] * (statModifier[keys[0]] || 0))
            },
            baseAtk: {
                propType: statData[keys[1]].replace("Base", "").trim(),
                value: Math.round(lastKey[keys[1]] + baseValues[1] * (statModifier[keys[1]] || 0))
            },
            baseDef: {
                propType: statData[keys[2]].replace("Base", "").trim(),
                value: Math.round(lastKey[keys[2]] + baseValues[2] * (statModifier[keys[2]] || 0))
            },
            ascensionStat: {
                propType: statData[specialProp].replace("Base", "").trim(),
                value: ((lastKey[specialProp] * 100) + baseCrit).toFixed(1) + '%'
            }
        });

        const getBaseCrit = (specialProp) => {
            if (specialProp === 'FIGHT_PROP_CRITICAL') return 5.0;
            if (specialProp === 'FIGHT_PROP_CRITICAL_HURT') return 50.0;
            return 0.0;
        };

        if (beta) {
            const keys = Object.keys(upgrades.StatsModifier.Ascension[0]);
            specialProp = keys[keys.length - 1];
            const baseCrit = getBaseCrit(specialProp);
            const lastKey = upgrades.StatsModifier.Ascension[upgrades.StatsModifier.Ascension.length - 1];

            return {
                base: getBaseStats([upgrades.BaseHP, upgrades.BaseATK, upgrades.BaseDEF], keys, baseCrit),
                max: getMaxStats([upgrades.BaseHP, upgrades.BaseATK, upgrades.BaseDEF], keys, lastKey, upgrades.StatsModifier, baseCrit)
            };
        } else {
            const characterCurveResponse = await axios.get('https://api.ambr.top/v2/static/avatarCurve');
            const maxCurveInfo = characterCurveResponse.data.data[90].curveInfos;
            const baseCrit = getBaseCrit(specialProp);

            return {
                base: getBaseStats([upgrades.prop[0].initValue, upgrades.prop[1].initValue, upgrades.prop[2].initValue], upgrades.prop.map(p => p.propType), baseCrit),
                max: getMaxStats(
                    [upgrades.prop[0].initValue, upgrades.prop[1].initValue, upgrades.prop[2].initValue],
                    upgrades.prop.map(p => p.propType),
                    upgrades.promote[upgrades.promote.length - 1].addProps,
                    maxCurveInfo,
                    baseCrit
                )
            };
        }
    }

    static async getWeaponMainAndSubStat(beta, upgrades) {
        const statName = await axios.get('https://api.ambr.top/v2/EN/manualWeapon');
        const { data: statData } = statName.data;

        if (beta) {
            let multiplier = 1;
            if (upgrades.WeaponProp[1].propType !== 'FIGHT_PROP_ELEMENT_MASTERY') { multiplier = 100; }

            return {
                mainStat: {
                    propType: statData[upgrades.WeaponProp[0].propType],
                    value: upgrades.WeaponProp[0].initValue * upgrades.StatsModifier.ATK.Levels['90'] + upgrades.Ascension['6'][upgrades.WeaponProp[0].propType]
                },
                subStat: {
                    propType: statData[upgrades.WeaponProp[1].propType],
                    value: upgrades.WeaponProp[1].initValue * upgrades.StatsModifier[upgrades.WeaponProp[1].propType].Levels['90'] * multiplier
                }
            };
        } else {
            const weaponCurve = await axios.get('https://api.ambr.top/v2/static/weaponCurve');
            const { data } = weaponCurve.data;
            const curveInfos = data[90].curveInfos;
            let multiplier = 1;
            if (upgrades.prop[1].propType !== 'FIGHT_PROP_ELEMENT_MASTERY') { multiplier = 100; }

            return {
                mainStat: {
                    propType: upgrades.prop[0].propType,
                    value: upgrades.prop[0].initValue * curveInfos[upgrades.prop[0].type] + upgrades.promote[upgrades.promote.length - 1].addProps[upgrades.prop[0].propType]
                },
                subStat: {
                    propType: statData[upgrades.prop[1].propType],
                    value: (upgrades.prop[1].initValue * curveInfos[upgrades.prop[1].type]) * multiplier
                }
            }
        }
    }

    static async formatGcgTalentDescription(description, params) {
        const emojiPattern = /<:[a-zA-Z_]+:\d+>/g;
        const emojis = [];
        description = description.replace(emojiPattern, (match) => {
            emojis.push(match);
            return `{{EMOJI${emojis.length - 1}}}`;
        });

        if (params) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                description = description.replace(`$[${paramKey}]`, paramValue);
            }
        }

        description = description.replace(/\\n/g, '\n');
        description = description.replace(/<color=#\w+>(.*?)<\/color>/g, '**$1**');
        description = description.replace(/<\/?[^>]+(>|$)/g, "");
        description = description.replace(/{{EMOJI(\d+)}}/g, (_, index) => emojis[index] || '');
        description = description.replace(/\{SPRITE_PRESET#(\d+)\}/g, (_, presetId) => {
            return Gcg[`SPRITE_PRESET#${presetId}`] || `{SPRITE_PRESET#${presetId}}`;
        });

        return description;
    }

    static get ambrLink() {
        return 'https://api.ambr.top/v2/en/';
    }

    static get yattaLink() {
        return 'https://api.yatta.top/hsr/v2/en/';
    }

    static get genshinCategories() {
        return ['Characters', 'Weapons', 'Artifacts', 'Materials', 'Namecards', 'Monsters', 'Furniture', 'Food', 'TCG'];
    }

    static get yattaCategories() {
        return ['Characters', 'Light Cones', 'Relics', 'Items'];
    }

    static get genshinBeta() {
        return 'https://api.hakush.in/gi/new.json';
    }

    static get genshinBetaInfo() {
        return `https://api.hakush.in/gi/data/en/`;
    }

    static get genshinCategoryMapping() {
        return {
            characters: 'avatar',
            weapons: 'weapon',
            artifacts: 'reliquary',
            materials: 'material',
            namecards: 'namecard',
            monsters: 'monster',
            furniture: 'furniture',
            food: 'food',
            tcg: 'gcg'
        };
    }

    static get yattaCategoryMapping() {
        return {
            characters: 'avatar',
            lightcones: 'equipment',
            relics: 'relic',
            items: 'item'
        };
    }

    static get uiIcon() {
        return 'https://api.ambr.top/assets/UI/';
    }

    static get reliquaryIcon() {
        return 'https://api.ambr.top/assets/UI/reliquary/';
    }
}

module.exports = { Ambr };
const axios = require('axios');
const { Game, formatAcensionStat } = require('../utils/game');

const BASE_URL = 'https://api.hakush.in/';
const TARGET_ENDPOINT = 'data/en/';

class Hakushin {
    constructor() {

    }

    async fetchSortedContent(game, category) {
        const link = new LinkBuilder(game);

        // Helper function to extract item name based on the game type
        const getItemName = (item) => {
            switch (game) {
                case Game.GENSHIN:
                    return item.EN || item.Name || (item.set ? item.set[Object.keys(item.set)[0]].name.EN : null);
                case Game.STARRAIL:
                    return item.ItemName || item.en;
                case Game.ZZZ:
                    return item.name || item.EN.name || item.EN;
                default:
                    return null;
            }
        };

        // Fetch name and id of all released items
        const data = await link.setCategory(category).fetchUrl();
        let mappedItems = Object.keys(data).map(id => {
            const item = data[id];
            const name = getItemName(item);
            return name ? { name, id } : null;
        }).filter(item => item !== null);

        // Fetch beta content
        const betaObject = await link.setCategory('new').fetchUrl();
        const betaId = betaObject[category];

        // Fetch the queried beta content
        if (betaId && betaId.length > 0) {
            const betaItems = await Promise.all(betaId.map(async (id) => {
                const betaData = await link.setCategory(category).setQuery(id).fetchUrl();
                return { name: betaData.Name, id: String(id) };
            }));
            mappedItems = mappedItems.concat(betaItems);
        }

        // Remove duplicates by using a Map to store unique ids
        const uniqueItemsMap = new Map();
        mappedItems.forEach(item => {
            if (!uniqueItemsMap.has(item.id)) {
                uniqueItemsMap.set(item.id, item);
            }
        });

        // Convert the Map back to an array and sort by id
        const uniqueItems = Array.from(uniqueItemsMap.values());
        return uniqueItems.sort((a, b) => Number(a.id) - Number(b.id));
    }

    async fetchData(game, category, query) {
        const data = await new LinkBuilder(game)
            .setCategory(category)
            .setQuery(query)
            .fetchUrl();
        return data;
    }

    static async getCharacterMainAndSubStat(data) {
        const { BaseHP, BaseATK, BaseDEF, StatsModifier } = data;
        const { HP, ATK, DEF, Ascension } = StatsModifier;

        const AcensionModList = Ascension[Ascension.length - 1];

        const obj = StatsModifier.Ascension[StatsModifier.Ascension.length - 1];
        const keys = Object.keys(obj);

        const acensionType = keys[keys.length - 1];
        const acensionValue = obj[acensionType];
        const { type, value } = formatAcensionStat(acensionType, acensionValue);

        return {
            hp: Math.round(BaseHP * HP['90'] + AcensionModList['FIGHT_PROP_BASE_HP']),
            atk: Math.round(BaseATK * ATK['90'] + AcensionModList['FIGHT_PROP_BASE_ATTACK']),
            def: Math.round(BaseDEF * DEF['90'] + AcensionModList['FIGHT_PROP_BASE_DEFENSE']),
            ascensionStat: {
                type: type,
                value: value
            }
        };
    }
}

class LinkBuilder {
    validGames = {
        [Game.GENSHIN]: 'gi',
        [Game.STARRAIL]: 'hsr',
        [Game.ZZZ]: 'zzz'
    };

    baseUrl = '';
    category = '';
    query = '';
    game = '';

    constructor(game) {
        this.game = game;
        this.baseUrl = `${BASE_URL}${this.validGames[game]}`;
        return this;
    }

    setCategory(category) {
        this.category = category;
        return this;
    }

    setQuery(query) {
        this.query = query;
        return this;
    }

    buildUrl() {
        if (!this.category) {
            throw new Error('Category not set');
        }

        if (this.category === 'new') {
            return `${this.baseUrl}/${this.category}.json`;
        }
        else if (this.query) {
            return `${this.baseUrl}/${TARGET_ENDPOINT}${this.category}/${this.query}.json`;
        }
        else {
            return `${this.baseUrl}/data/${this.category}.json`;
        }
    }

    async fetchUrl() {
        const url = this.buildUrl();

        // base, data, v2
        const urlsToTry = [
            url,
            url.replace('data/', TARGET_ENDPOINT).replace(/\/en\/en\//g, '/en/'),
            url.replace(this.validGames[this.game], `v2/${this.validGames[this.game]}/`).replace('en/', '')
        ];

        for (const currentUrl of urlsToTry) {
            try {
                const { data } = await axios.get(currentUrl);
                return data;
            } catch (error) {
                // Try next URL
            }
        }

        throw new Error('Failed to fetch data');
    }
}

module.exports = { Hakushin, LinkBuilder };
const { elements, Gcg } = require('./emojis');

const Game = Object.freeze({
    GENSHIN: 'gi',
    STARRAIL: 'hsr',
    HONKAI: 'hi3',
    ZZZ: 'zzz',
});

const Game_Category = Object.freeze({
    [Game.GENSHIN]: ['monster', 'item', 'artifact', 'weapon', 'character', 'gcg', 'furniture'],
    [Game.STARRAIL]: ['item', 'monster', 'relicset', 'lightcone', 'character'],
    [Game.ZZZ]: ['item', 'bangboo', 'equipment', 'weapon', 'character']
});

const Readable_Game_Category = Object.freeze({
    monster: 'Enemy Creatures',
    item: 'Inventory Items',
    artifact: 'Artifacts',
    weapon: 'Weapons',
    character: 'Characters',
    gcg: 'Genius Invocation TCG',
    furniture: 'Furnishings',
    relicset: 'Relic Sets',
    lightcone: 'Lightcones',
    bangboo: 'Bangboo',
    equipment: 'W-Engine'
});

/**
 * Formats a given string by applying various text transformations based on provided options.
 * @param {string} desc - The string to be formatted.
 * @param {Object} [options={}] - An optional object to control the formatting options.
 *  - {boolean} [bold=true] - If true, replaces <color=#...>text</color> with **text** (markdown bold).
 *  - {boolean} [italics=true] - If true, replaces <i>text</i> with *text* (markdown italics).
 *  - {boolean} [removeHtml=true] - If true, strips any remaining HTML tags from the string.
 *  - {boolean} [newLines=true] - If true, replaces escaped newline characters (\\n) with actual newlines.
 *  - {boolean} [bulletPoints=true] - If true, replaces bullet points (·) with markdown list items (- ).
 *  - {boolean} [limit=false] - If true, limits the string to 150 characters and appends '....' to the end.
 * @returns {string} The formatted string with the applied transformations.
 */
const formatDesc = (desc, options = {}) => {
    const defaultOptions = { bold: true, italics: true, removeHtml: true, newLines: true, bulletPoints: true, limit: false };
    const finalOptions = { ...defaultOptions, ...options };

    const formatters = {
        bold: (text) => text.replace(/<color=#\w+>(.*?)<\/color>/g, '**$1**'),
        italics: (text) => text.replace(/<\/?i>/gi, '*'),
        removeHtml: (text) => text.replace(/<\/?[^>]+(>|$)/g, ""),
        newLines: (text) => text.replace(/\\n/g, '\n'),
        bulletPoints: (text) => text.replace(/·/g, '- '),
        limit: (text) => text.length > 150 ? text.slice(0, 150).trim() + '....' : text
    };

    for (const [key, applyFormat] of Object.entries(finalOptions)) {
        if (applyFormat && formatters[key]) {
            desc = formatters[key](desc);
        }
    }

    return desc;
};

const formatVision = (vision) => {
    const Vision_GCG = Object.freeze({
        Pyro: 'fireSubHurt',
        Hydro: 'waterSubHurt',
        Anemo: 'windSubHurt',
        Electro: 'elecSubHurt',
        Cryo: 'iceSubHurt',
        Geo: 'rockSubHurt',
        Dendro: 'grassSubHurt'
    });

    return `${elements[Vision_GCG[vision]]} ${vision}`;
}

const formatWeapon = (weapon) => {
    const Weapon_GCG = Object.freeze({
        WEAPON_SWORD_ONE_HAND: 'GCG_TAG_WEAPON_SWORD',
        WEAPON_POLE: 'GCG_TAG_WEAPON_POLEARM',
        WEAPON_CLAYMORE: 'GCG_TAG_WEAPON_CLAYMORE',
        WEAPON_CATALYST: 'GCG_TAG_WEAPON_CATALYST',
        WEAPON_BOW: 'GCG_TAG_WEAPON_BOW'
    });

    const Weapon_Readable = Object.freeze({
        WEAPON_SWORD_ONE_HAND: 'Sword',
        WEAPON_POLE: 'Polearm',
        WEAPON_CLAYMORE: 'Claymore',
        WEAPON_CATALYST: 'Catalyst',
        WEAPON_BOW: 'Bow'
    });

    return `${Gcg[Weapon_GCG[weapon]]} ${Weapon_Readable[weapon]}`;
}

const formatRegion = (region) => {
    const Region_GCG = Object.freeze({
        ASSOC_TYPE_MONDSTADT: 'GCG_TAG_NATION_MONDSTADT',
        ASSOC_TYPE_LIYUE: 'GCG_TAG_NATION_LIYUE',
        ASSOC_TYPE_INAZUMA: 'GCG_TAG_NATION_INAZUMA',
        ASSOC_TYPE_SUMERU: 'GCG_TAG_NATION_SUMERU',
        ASSOC_TYPE_FONTAINE: 'GCG_TAG_NATION_FONTAINE',
        ASSOC_TYPE_NATLAN: 'GCG_TAG_NATION_NATLAN'
    });

    const Region_Readable = Object.freeze({
        ASSOC_TYPE_MONDSTADT: 'Mondstadt',
        ASSOC_TYPE_LIYUE: 'Liyue',
        ASSOC_TYPE_INAZUMA: 'Inazuma',
        ASSOC_TYPE_SUMERU: 'Sumeru',
        ASSOC_TYPE_FONTAINE: 'Fontaine',
        ASSOC_TYPE_NATLAN: 'Natlan'
    });

    return `${Gcg[Region_GCG[region]]} ${Region_Readable[region]}`;
}

const formatAcensionStat = (main, sub) => {
    const Main_Readable = Object.freeze({
        FIGHT_PROP_HP_PERCENT: 'HP',
        FIGHT_PROP_ATTACK_PERCENT: 'ATK',
        FIGHT_PROP_DEFENSE_PERCENT: 'DEF',
        FIGHT_PROP_CHARGE_EFFICIENCY: 'Energy Recharge',
        FIGHT_PROP_HEAL_ADD: 'Healing Bonus',
        FIGHT_PROP_ELEMENT_MASTERY: 'Elemental Mastery',
        FIGHT_PROP_CRITICAL: 'CRIT Rate',
        FIGHT_PROP_CRITICAL_HURT: 'CRIT DMG',
        FIGHT_PROP_FIRE_ADD_HURT: 'Pyro DMG Bonus',
        FIGHT_PROP_GRASS_ADD_HURT: 'Dendro DMG Bonus',
        FIGHT_PROP_WATER_ADD_HURT: 'Hydro DMG Bonus',
        FIGHT_PROP_ELEC_ADD_HURT: 'Electro DMG Bonus',
        FIGHT_PROP_WIND_ADD_HURT: 'Anemo DMG Bonus',
        FIGHT_PROP_ICE_ADD_HURT: 'Cryo DMG Bonus',
        FIGHT_PROP_ROCK_ADD_HURT: 'Geo DMG Bonus'
    });

    if (main === 'FIGHT_PROP_ELEMENT_MASTERY') {
        sub = Math.round(sub);
    }
    else {
        sub = (Math.round(sub * 1000) / 10).toFixed(1) + '%';
    }

    return {
        type: Main_Readable[main],
        value: sub
    }
}

module.exports = { Game, Game_Category, Readable_Game_Category, formatDesc, formatVision, formatWeapon, formatRegion, formatAcensionStat };
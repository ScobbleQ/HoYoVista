export const Game = Object.freeze({
    GENSHIN: '2',
    STARRAIL: '6',
    HONKAI: '1',
    ZZZ: '8',
});

const games = [
    { id: Game.GENSHIN, full: 'Genshin Impact', abbr: 'genshin', short: 'Genshin' },
    { id: Game.STARRAIL, full: 'Honkai: Star Rail', abbr: 'hkrpg', short: 'StarRail' },
    { id: Game.HONKAI, full: 'Honkai Impact 3rd', abbr: 'honkai3rd', short: 'Honkai3rd' },
    { id: Game.ZZZ, full: 'Zenless Zone Zero', abbr: 'zzz', short: 'Zenless' },
];

export const FullToAbbr = Object.freeze(Object.fromEntries(games.map((game) => [game.full, game.abbr])));

export const FullToId = Object.freeze(Object.fromEntries(games.map((game) => [game.full, game.id])));

export const IdToFull = Object.freeze(Object.fromEntries(games.map((game) => [game.id, game.full])));

export const IdToAbbr = Object.freeze(Object.fromEntries(games.map((game) => [game.id, game.abbr])));

export const IdToShort = Object.freeze(Object.fromEntries(games.map((game) => [game.id, game.short])));

export const AbbrToFull = Object.freeze(Object.fromEntries(games.map((game) => [game.abbr, game.full])));

export const AbbrToId = Object.freeze(Object.fromEntries(games.map((game) => [game.abbr, game.id])));

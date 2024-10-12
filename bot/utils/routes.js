const { Game } = require('./game');

const BBS_API = 'https://bbs-api-os.hoyolab.com'
const ACCOUNT_API = 'https://api-account-os.hoyolab.com'
const HK4E_API = 'https://sg-hk4e-api.hoyolab.com'
const PUBLIC_API = 'https://sg-public-api.hoyolab.com'
const DEFAULT_REFERER = 'https://hoyolab.com'
const SG_ACT = 'https://sg-act-nap-api.hoyolab.com'

const DS_SALT = "IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2";

const ACT_IDS = Object.freeze({
    [Game.GENSHIN]: "e202102251931481",
    [Game.STARRAIL]: "e202303301540311",
    [Game.HONKAI]: "e202110291205111",
    [Game.ZZZ]: "e202406031448091",
})

const APP_KEYS = Object.freeze({
    [Game.GENSHIN]: "6a4c78fe0356ba4673b8071127b28123",
    [Game.STARRAIL]: "d74818dabd4182d4fbac7f8df1622648",
    [Game.HONKAI]: "243187699ab762b682a2a2e50ba02285",
    [Game.ZZZ]: "ff0f2776bf515d79d1f8ff1fb98b2a06",
})

const APP_IDS = Object.freeze({
    [Game.GENSHIN]: "4",
    [Game.STARRAIL]: "11",
    [Game.HONKAI]: "8",
    [Game.ZZZ]: "15",
})

const EVENTS = Object.freeze({
    [Game.GENSHIN]: "sol",
    [Game.STARRAIL]: "luna/os",
    [Game.HONKAI]: "mani",
    [Game.ZZZ]: "luna/os",
})

const GEETEST_RECORD_KEYS = Object.freeze({
    [Game.GENSHIN]: "hk4e_game_record",
    [Game.STARRAIL]: "hkrpg_game_record",
    [Game.HONKAI]: "bh3_game_record",
    [Game.ZZZ]: "nap_game_record",
})

const GAME_BIZS = Object.freeze({
    [Game.GENSHIN]: "hk4e_global",
    [Game.STARRAIL]: "hkrpg_global",
    [Game.HONKAI]: "bh3_os",
    [Game.ZZZ]: "nap_global",
})

function getEventBaseUrl(game) {
    if (game === Game.GENSHIN) {
        return HK4E_API
    }
    else if (game === Game.ZZZ) {
        return SG_ACT
    }
    else if (game === Game.HONKAI || game === Game.STARRAIL) {
        return PUBLIC_API
    }
}

/* Daily Check-In API Endpoint */
function DAILY_INFO_API(game) {
    return `${getEventBaseUrl(game)}/event/${EVENTS[game]}/info?lang=en-us&act_id=${ACT_IDS[game]}`
}

function DAILY_REWARD_API(game) {
    return `${getEventBaseUrl(game)}/event/${EVENTS[game]}/home?lang=en-us&act_id=${ACT_IDS[game]}`
}

function DAILY_CLAIM_API(game) {
    return `${getEventBaseUrl(game)}/event/${EVENTS[game]}/sign?lang=en-us&act_id=${ACT_IDS[game]}`
}

const CHECKIN_URL = (type, game) => `${getEventBaseUrl(game)}/event/${EVENTS[game]}/${type}?lang=en-us&act_id=${ACT_IDS[game]}`;

module.exports = {
    BBS_API,
    ACCOUNT_API,
    HK4E_API,
    PUBLIC_API,
    DEFAULT_REFERER,
    SG_ACT,
    DS_SALT,
    APP_KEYS,
    APP_IDS,
    ACT_IDS,
    EVENTS,
    GEETEST_RECORD_KEYS,
    GAME_BIZS,
    CHECKIN_URL,
    DAILY_INFO_API,
    DAILY_REWARD_API,
    DAILY_CLAIM_API
}
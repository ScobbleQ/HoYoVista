import { Game, IdToAbbr } from "../hoyolab/constants.js";

const BBS_API = "https://bbs-api-os.hoyolab.com";
const ACCOUNT_API = "https://api-account-os.hoyolab.com";
const HK4E_API = "https://sg-hk4e-api.hoyolab.com";
const PUBLIC_API = "https://sg-public-api.hoyolab.com";
export const DEFAULT_ORIGIN = "https://act.hoyolab.com";
export const DEFAULT_REFERER = "https://hoyolab.com/";
const SG_ACT = "https://sg-act-nap-api.hoyolab.com";

const DS_SALT = "IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2";

export const GAME_ICON_URL = Object.freeze({
    [Game.GENSHIN]:
        "https://fastcdn.hoyoverse.com/static-resource-v2/2023/11/08/9db76fb146f82c045bc276956f86e047_6878380451593228482.png",
    [Game.STARRAIL]: "https://hyl-static-res-prod.hoyolab.com/communityweb/business/starrail_hoyoverse.png",
    [Game.HONKAI]:
        "https://fastcdn.hoyoverse.com/static-resource-v2/2024/11/28/661dc2b424af6cb14b5bd675c67c2d8c_4476105097458126091.png",
    [Game.ZZZ]: "https://hyl-static-res-prod.hoyolab.com/communityweb/business/nap.png",
});

export const WEB_HEADER = ({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) => {
    const getCurrentHourMilitary = () => {
        const now = new Date();
        return now.getHours();
    };

    const header = {
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: `ltmid_v2=${ltmid_v2}; ltoken_v2=${ltoken_v2}; ltuid_v2=${ltuid_v2}; mi18nLang=${mi18nLang}; account_id_v2=${ltuid_v2}; account_mid_v2=${ltmid_v2}`,
        DS: "1734664931,tZksz2,3ff162e3af11f710d30106da9e1afa5f",
        Origin: DEFAULT_ORIGIN,
        Priority: "u=3, i",
        Referer: DEFAULT_REFERER,
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
        "x-rpc-hour": `${getCurrentHourMilitary()}`,
        "x-rpc-language": "en-us",
    };

    return header;
};

export const APP_HEADER = ({ ltmid_v2, ltoken_v2, ltuid_v2, mi18nLang }) => {
    const header = {
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBSOversea/3.3.1",
        Referer: DEFAULT_REFERER,
        Cookie: `ltmid_v2=${ltmid_v2}; ltoken_v2=${ltoken_v2}; ltuid_v2=${ltuid_v2}; mi18nLang=${mi18nLang}; account_id_v2=${ltuid_v2}; account_mid_v2=${ltmid_v2}`,
        Origin: DEFAULT_ORIGIN,
        Connection: "keep-alive",
        "Accept-Language": "en-US,en;q=0.9",
        Host: "sg-public-api.hoyolab.com",
        Accept: "application/json, text/plain, */*",
        "x-rpc-channel": "appstore",
    };

    return header;
};

export const ACT_IDS = Object.freeze({
    [Game.GENSHIN]: "e202102251931481",
    [Game.STARRAIL]: "e202303301540311",
    [Game.HONKAI]: "e202110291205111",
    [Game.ZZZ]: "e202406031448091",
});

export const APP_KEYS = Object.freeze({
    [Game.GENSHIN]: "6a4c78fe0356ba4673b8071127b28123",
    [Game.STARRAIL]: "d74818dabd4182d4fbac7f8df1622648",
    [Game.HONKAI]: "243187699ab762b682a2a2e50ba02285",
    [Game.ZZZ]: "ff0f2776bf515d79d1f8ff1fb98b2a06",
});

export const APP_IDS = Object.freeze({
    [Game.GENSHIN]: "4",
    [Game.STARRAIL]: "11",
    [Game.HONKAI]: "8",
    [Game.ZZZ]: "15",
});

export const EVENTS = Object.freeze({
    [Game.GENSHIN]: "sol",
    [Game.STARRAIL]: "luna/hkrpg/os",
    [Game.HONKAI]: "mani",
    [Game.ZZZ]: "luna/zzz/os",
});

export const GEETEST_RECORD_KEYS = Object.freeze({
    [Game.GENSHIN]: "hk4e_game_record",
    [Game.STARRAIL]: "hkrpg_game_record",
    [Game.HONKAI]: "bh3_game_record",
    [Game.ZZZ]: "nap_game_record",
});

export const GAME_BIZS = Object.freeze({
    [Game.GENSHIN]: "hk4e_global",
    [Game.STARRAIL]: "hkrpg_global",
    [Game.HONKAI]: "bh3_os",
    [Game.ZZZ]: "nap_global",
});

const getEventBaseUrl = (game) => {
    if (game === Game.GENSHIN) {
        return HK4E_API;
    } else if (game === Game.ZZZ || game === Game.HONKAI || game === Game.STARRAIL) {
        return PUBLIC_API;
    }
};

export const HOYOLAB_FULL_URL = () => `${BBS_API}/community/painter/wapi/user/full`;

/* Daily Check-In API Endpoint */
export const CHECKIN_URL = ({ type, game, lang }) => {
    let url = `${getEventBaseUrl(game)}/event/${EVENTS[game]}/${type}`;
    if (game === Game.GENSHIN || game === Game.HONKAI) {
        url += `?lang=${lang}`;
    }
    return `${getEventBaseUrl(game)}/event/${EVENTS[game]}/${type}`;
};
export const CHECKIN_DETAILS_URL = ({ type, game, lang }) =>
    `${getEventBaseUrl(game)}/event/${EVENTS[game]}/${type}?lang=${lang}&act_id=${ACT_IDS[game]}`;

export const GAME_RECORD_URL = (uid) => `${BBS_API}/game_record/card/wapi/getGameRecordCard?uid=${uid}`;

export const GAME_INDEX_URL = ({ game_id, region, game_role_id }) => {
    const game = IdToAbbr[game_id];

    if (game_id == Game.ZZZ) {
        return `${PUBLIC_API}/event/game_record_zzz/api/zzz/index?server=${region}&role_id=${game_role_id}`;
    } else if (game_id == Game.HONKAI) {
        return `${BBS_API}/game_record/honkai3rd/api/index?server=${region}&role_id=${game_role_id}`;
    } else {
        return `${PUBLIC_API}/event/game_record/${game}/api/index?server=${region}&role_id=${game_role_id}`;
    }
};
export const DAILY_NOTE_URL = ({ game_id, region, game_role_id }) => {
    switch (game_id) {
        case Game.GENSHIN:
            return `${PUBLIC_API}/event/game_record/app/genshin/api/dailyNote?server=${region}&role_id=${game_role_id}`;
        case Game.STARRAIL:
            return `${PUBLIC_API}/event/game_record/hkrpg/api/note?server=${region}&role_id=${game_role_id}`;
        case Game.HONKAI:
            return `${BBS_API}/game_record/honkai3rd/api/note?role_id=${game_role_id}&server=${region}`;
        case Game.ZZZ:
            return `${PUBLIC_API}/event/game_record_zzz/api/zzz/note?server=${region}&role_id=${game_role_id}`;
    }
};

export const REDEEM_URL = ({ game_id }) => {
    switch (game_id) {
        case Game.GENSHIN:
            return "https://sg-hk4e-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl";
        case Game.STARRAIL:
            return "https://sg-hkrpg-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl";
        case Game.ZZZ:
            return "https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkeyHyl";
    }
};

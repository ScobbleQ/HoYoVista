/**
 * Function to get the game's URLs
 * @param {string} gameName - The name of the game
 * @returns JSON object containing the game's name, logo, home, info, and checkin URLs
 */
function getGameUrl(gameName) {
    const urls = {
        Genshin_Impact: {
            name: `Genshin Impact`,
            abbreviation: `gi`,
            logo: `https://fastcdn.hoyoverse.com/static-resource-v2/2023/11/08/9db76fb146f82c045bc276956f86e047_6878380451593228482.png`,
            home: `https://sg-hk4e-api.hoyolab.com/event/sol/home?lang=en-us&act_id=e202102251931481`,
            info: `https://sg-hk4e-api.hoyolab.com/event/sol/info?lang=en-us&act_id=e202102251931481`,
            checkin: `https://sg-hk4e-api.hoyolab.com/event/sol/sign?lang=en-us&act_id=e202102251931481`
        },
        Honkai_Impact_3rd: {
            name: `Honkai Impact 3rd`,
            abbreviation: `hi3`,
            logo: `https://fastcdn.hoyoverse.com/static-resource-v2/2024/02/29/3d96534fd7a35a725f7884e6137346d1_3942255444511793944.png`,
            home: `https://sg-public-api.hoyolab.com/event/mani/home?lang=en-us&act_id=e202110291205111`,
            info: `https://sg-public-api.hoyolab.com/event/mani/info?lang=en-us&act_id=e202110291205111`,
            checkin: `https://sg-public-api.hoyolab.com/event/mani/sign?lang=en-us&act_id=e202110291205111`
        },
        Honkai_Star_Rail: {
            name: `Honkai: Star Rail`,
            abbreviation: `hsr`,
            logo: `https://hyl-static-res-prod.hoyolab.com/communityweb/business/starrail_hoyoverse.png`,
            home: `https://sg-public-api.hoyolab.com/event/luna/os/home?lang=en-us&act_id=e202303301540311`,
            info: `https://sg-public-api.hoyolab.com/event/luna/os/info?lang=en-us&act_id=e202303301540311`,
            checkin: `https://sg-public-api.hoyolab.com/event/luna/os/sign?lang=en-us&act_id=e202303301540311`
        },
        Zenless_Zone_Zero: {
            name: `Zenless Zone Zero`,
            abbreviation: `zzz`,
            logo: `https://hyl-static-res-prod.hoyolab.com/communityweb/business/nap.png`,
            home: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/home?lang=en-us&act_id=e202406031448091`,
            info: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info?lang=en-us&act_id=e202406031448091`,
            checkin: `https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?lang=en-us&act_id=e202406031448091`
        }
    };

    const gameKey = Object.keys(urls).find(key => urls[key].name === gameName);
    return urls[gameKey];
}

module.exports = { getGameUrl };
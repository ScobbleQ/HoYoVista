/**
 * Censors the UID by replacing all but the first and last 3 characters with asterisks.
 * @param {string} uid - UID to censor
 * @returns The censored UID
 */
function censorUid(uid) {
    const firstPart = uid.slice(0, 1);
    const lastPart = uid.slice(-4);
    const middlePart = uid.slice(1, -4).replace(/[0-9]/g, '*');
    return firstPart + middlePart + lastPart;
}

/**
 * Censors the username by replacing all but the first and last letters with asterisks.
 * @param {string} username - The username to be censored.
 * @returns The censored username.
 */
function censorUsername(username) {
    if (username.length <= 2) {
        return username;
    }

    const firstLetter = username.charAt(0);
    const lastLetter = username.charAt(username.length - 1);
    const middlePart = '*'.repeat(username.length - 2);
    return firstLetter + middlePart + lastLetter;
}

module.exports = { censorUid, censorUsername };
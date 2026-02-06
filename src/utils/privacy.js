/**
 * Censors the UID if the flag is true
 * @param {{ uid: string, flag: boolean }} param0
 * @returns {string}
 */
export const censorUid = ({ uid, flag }) => {
  if (!flag) return uid;

  const firstPart = uid.slice(0, 1);
  const lastPart = uid.slice(-4);
  const middlePart = uid.slice(1, -4).replace(/[0-9]/g, '*');

  return firstPart + middlePart + lastPart;
};

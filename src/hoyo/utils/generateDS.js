import crypto from 'crypto';

export function generateDS() {
  const salt = '6s25p5ox5y14umn1p61aqyyvbvvl3lrt';
  const time = Math.floor(Date.now() / 1000);
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const random = Array.from({ length: 6 }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join('');

  const hash = crypto.createHash('md5').update(`salt=${salt}&t=${time}&r=${random}`).digest('hex');

  return `${time},${random},${hash}`;
}

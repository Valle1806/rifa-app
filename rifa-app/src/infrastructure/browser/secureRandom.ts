import type { SecureRandom } from '../../application/ports';

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Dígito uniforme 0-9 descartando valores sesgados (rechazo por encima de 249). */
const randomDigit = (): number => {
  const buffer = new Uint8Array(1);
  do crypto.getRandomValues(buffer);
  while (buffer[0] >= 250);
  return buffer[0] % 10;
};

export const secureRandom: SecureRandom = {
  /** 128 bits aleatorios: imposible de adivinar, apto para enlaces privados. */
  token: () => toBase64Url(crypto.getRandomValues(new Uint8Array(16))),

  pin: (length) => Array.from({ length }, randomDigit).join(''),

  async sha256(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

export interface Buyer {
  name: string;
  phone: string;
}

export const BUYER_RULES = {
  nameMin: 3,
  nameMax: 80,
  advisorMax: 40,
  aliasMax: 30,
  noteMax: 200,
  /** Celular colombiano: 10 dígitos empezando por 3. */
  phonePattern: /^3\d{9}$/,
} as const;

export const normalizeName = (value: string): string => value.trim().replace(/\s+/g, ' ');

/** Quita espacios, guiones y el indicativo +57. */
export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits;
};

export const isValidPhone = (value: string): boolean => BUYER_RULES.phonePattern.test(normalizePhone(value));

/** "Carlos Mario Pérez" → "Carlos P." Lo que se muestra en público. */
export const toPublicAlias = (fullName: string): string => {
  const parts = normalizeName(fullName).split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  const [first] = parts;
  const alias = parts.length === 1 ? first : `${first} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  return alias.slice(0, BUYER_RULES.aliasMax);
};

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** 50000 → "$ 50.000" */
export const formatMoney = (value: number): string => cop.format(value);

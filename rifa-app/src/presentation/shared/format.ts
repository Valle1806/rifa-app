const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDateTime = (millis: number): string => dateTime.format(millis);

export const accessUrl = (token: string): string => `${window.location.origin}/mis-numeros/${token}`;

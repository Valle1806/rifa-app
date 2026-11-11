import { describe, expect, it } from 'vitest';
import { toWebFriendlyUrl } from './imageStorage';

describe('toWebFriendlyUrl', () => {
  it('entrega HEIC/HEIF como JPG', () => {
    expect(toWebFriendlyUrl('https://res.cloudinary.com/c/image/upload/v1/rifas/a/x.HEIC')).toBe(
      'https://res.cloudinary.com/c/image/upload/v1/rifas/a/x.jpg',
    );
    expect(toWebFriendlyUrl('https://res.cloudinary.com/c/image/upload/v1/x.heif')).toMatch(/x\.jpg$/);
  });

  it('no toca los formatos que ya se ven en la web', () => {
    const url = 'https://res.cloudinary.com/c/image/upload/v1/x.png';
    expect(toWebFriendlyUrl(url)).toBe(url);
  });
});

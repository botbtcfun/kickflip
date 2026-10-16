import { describe, expect, it } from 'vitest';

import { speed } from './swipe';

describe('swipe speed', () => {
  it('reads the end of the swipe, not the start', () => {
    // Slow for 300 ms, then 200 px in the last 80 ms.
    const slow = Array.from({ length: 31 }, (_, i) => ({ t: i * 10, y: 800 - i }));
    const fast = Array.from({ length: 8 }, (_, i) => ({ t: 310 + i * 10, y: 770 - (i + 1) * 25 }));
    expect(speed([...slow, ...fast])).toBeCloseTo(2500, -2);
  });

  it('reads a quick flick over all of it', () => {
    expect(speed([
      { t: 0, y: 500 },
      { t: 20, y: 400 },
      { t: 40, y: 300 },
    ])).toBe(5000);
  });

  it('reads a swipe that stopped before letting go as slow', () => {
    expect(speed([
      { t: 0, y: 500 },
      { t: 50, y: 200 },
      { t: 300, y: 200 },
    ])).toBe(0);
  });

  it('reads down as negative', () => {
    expect(speed([
      { t: 0, y: 100 },
      { t: 50, y: 300 },
    ])).toBeLessThan(0);
  });
});

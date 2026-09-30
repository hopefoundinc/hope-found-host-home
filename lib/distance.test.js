import { describe, it, expect } from 'vitest';
import { haversineMiles } from './distance.js';

describe('haversineMiles', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMiles({ lat: 38.9, lng: -77.0 }, { lat: 38.9, lng: -77.0 })).toBe(0);
  });

  it('matches the known ~69 mile length of one degree of longitude at the equator', () => {
    const miles = haversineMiles({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(miles).toBeGreaterThan(68);
    expect(miles).toBeLessThan(70);
  });

  it('computes a real-world distance within a reasonable tolerance (DC to Baltimore, ~35 miles)', () => {
    const dc = { lat: 38.9072, lng: -77.0369 };
    const baltimore = { lat: 39.2904, lng: -76.6122 };
    const miles = haversineMiles(dc, baltimore);
    expect(miles).toBeGreaterThan(30);
    expect(miles).toBeLessThan(40);
  });
});

import { coarsenCoordinate, haversineKm } from '../geo';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(48.137, 11.575, 48.137, 11.575)).toBe(0);
  });

  it('computes reasonable Munich intra-city distance', () => {
    // Maxvorstadt (48.147, 11.567) → Haidhausen (48.130, 11.600)
    const km = haversineKm(48.147, 11.567, 48.13, 11.6);
    expect(km).toBeGreaterThan(2);
    expect(km).toBeLessThan(5);
  });

  it('computes Munich → Berlin approximately correctly (~500–600 km)', () => {
    const km = haversineKm(48.137, 11.575, 52.52, 13.405);
    expect(km).toBeGreaterThan(480);
    expect(km).toBeLessThan(620);
  });

  it('handles same latitude different longitude (equatorial-ish distance)', () => {
    const km = haversineKm(0, 0, 0, 1);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });

  it('handles antipodal points (max distance ~20000 km)', () => {
    const km = haversineKm(0, 0, 0, 180);
    expect(km).toBeGreaterThan(19900);
    expect(km).toBeLessThan(20100);
  });

  it('is symmetric', () => {
    const ab = haversineKm(48.147, 11.567, 48.13, 11.6);
    const ba = haversineKm(48.13, 11.6, 48.147, 11.567);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe('coarsenCoordinate', () => {
  it('rounds to 2 decimal places (~1.1 km precision)', () => {
    expect(coarsenCoordinate(48.14753)).toBe(48.15);
    expect(coarsenCoordinate(11.56712)).toBe(11.57);
  });

  it('does not change values already at 2 decimal places', () => {
    expect(coarsenCoordinate(48.15)).toBe(48.15);
  });

  it('handles negative coordinates', () => {
    expect(coarsenCoordinate(-33.8688)).toBe(-33.87);
  });

  it('handles zero', () => {
    expect(coarsenCoordinate(0)).toBe(0);
  });
});

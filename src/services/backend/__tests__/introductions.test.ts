import { DIMENSIONS } from '@/types/domain';

import { DEMO_EMAIL } from '../seed';
import { DevBackend } from '../devBackend';

const ALREADY_INTRODUCED = new Set(['liam', 'david', 'ben']);

async function demo(backend: DevBackend): Promise<string> {
  const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
  return session.userId;
}

describe('introductions (matching pipeline integration)', () => {
  it('requests an eligible candidate the user has not already been introduced to', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const intro = await backend.requestIntroduction(userId);
    expect(intro).not.toBeNull();
    const otherId = intro!.other.userId;
    expect(otherId).not.toBe(userId);
    expect(ALREADY_INTRODUCED.has(otherId)).toBe(false);
    // Ava prefers men and has a smoking dealbreaker -> never Jonas (a smoker).
    expect(otherId).not.toBe('jonas');
  });

  it('excludes a candidate the user just rejected from the next request', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const first = await backend.requestIntroduction(userId);
    const rejectedId = first!.other.userId;
    await backend.submitDecision(userId, first!.id, 'not_for_me');

    const second = await backend.requestIntroduction(userId);
    if (second) {
      expect(second.other.userId).not.toBe(rejectedId);
    }
  });

  it('reveals only a privacy-safe projection and a grounded explanation', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const intro = await backend.getIntroduction(userId, 'intro-ava-liam');
    expect(intro).not.toBeNull();

    // Reveal-safe projection: age (not DOB), area, no coordinates.
    const other = intro!.other as unknown as Record<string, unknown>;
    expect(typeof other.age).toBe('number');
    expect(other).not.toHaveProperty('dateOfBirth');
    expect(other).not.toHaveProperty('approxLat');
    expect(other).not.toHaveProperty('approxLng');

    // Every explanation point must trace back to a real dimension (or null).
    const points = [
      ...intro!.explanation.alignment,
      ...intro!.explanation.friction,
      ...intro!.explanation.unknowns,
    ];
    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      if (point.dimension !== null) {
        expect(DIMENSIONS).toContain(point.dimension);
      }
      expect(point.text.length).toBeGreaterThan(0);
    }

    // Ava and Liam both value independence -> should surface as alignment.
    expect(intro!.explanation.alignment.some((p) => p.dimension === 'independence')).toBe(true);
  });

  it('keeps decisions double-blind (the view never carries the other side)', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);
    const intro = await backend.getIntroduction(userId, 'intro-ava-liam');
    // The view exposes only MY decision, never the counterpart's.
    expect(intro).not.toBeNull();
    expect(intro).not.toHaveProperty('otherDecision');
    expect(intro!.myDecision).toBeNull();
  });
});

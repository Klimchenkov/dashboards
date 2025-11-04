import { describe, it, expect } from 'vitest';
import { loadPct, statusByLoad } from '../lib/calc';
import { dataQualityScore } from '../lib/quality';

describe('load & status', () => {
  it('calculates load %', () => {
    expect(loadPct(80, 160)).toBeCloseTo(50);
  });
  it('status mapping', () => {
    expect(statusByLoad(50)).toBe('under');
    expect(statusByLoad(90)).toBe('ok');
    expect(statusByLoad(130)).toBe('over');
  });
});

describe('data quality', () => {
  it('weighted score within 0..1', () => {
    const s = dataQualityScore({ percentProjectsWithPlans:0.8, percentFilledFacts3d:0.7, factLagDays:2, bitrixValidity:0.9 });
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

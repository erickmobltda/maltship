import { describe, expect, it } from 'vitest';
import { encodeToFit, fitSize } from './avatarImage';

describe('fitSize', () => {
  it('fits the longer side and keeps the shape', () => {
    expect(fitSize(4000, 2000)).toEqual({ width: 512, height: 256 });
    expect(fitSize(2000, 4000)).toEqual({ width: 256, height: 512 });
  });
  it('never enlarges', () => {
    expect(fitSize(100, 50)).toEqual({ width: 100, height: 50 });
  });
});

describe('encodeToFit', () => {
  it('starts at 0.8', () => {
    const tried: number[] = [];
    encodeToFit((q) => (tried.push(q), 'x'), 10);
    expect(tried).toEqual([0.8]);
  });
  it('lowers the quality until it fits', () => {
    expect(encodeToFit((q) => 'x'.repeat(Math.round(q * 100)), 30)).toBe('x'.repeat(30));
  });
  it('gives up when nothing fits', () => {
    expect(encodeToFit(() => 'x'.repeat(50), 10)).toBeNull();
  });
});

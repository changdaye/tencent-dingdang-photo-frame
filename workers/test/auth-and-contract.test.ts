import { describe, expect, it } from 'vitest';
import { buildPasswordMarkerCandidates } from '../src/auth';

describe('password marker candidates', () => {
  it('checks folder-local marker before root marker', () => {
    expect(buildPasswordMarkerCandidates('phone', 'phone123')).toEqual(['phone/phone123.txt', 'phone123.txt']);
  });
});

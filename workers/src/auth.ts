import type { CosGateway } from './types';

export class FrameError extends Error {
  constructor(
    public readonly code: 'AUTH_FAILED' | 'NO_IMAGE' | 'REQUEST_FAILED' | 'INVALID_RESPONSE' | 'BAD_REQUEST',
    message: string,
  ) {
    super(message);
  }
}

export function buildPasswordMarkerCandidates(username: string, password: string, suffix = '.txt') {
  const normalizedSuffix = suffix.startsWith('.') ? suffix : `.${suffix}`;
  return [`${username}/${password}${normalizedSuffix}`, `${password}${normalizedSuffix}`];
}

export async function assertAuthorized(username: string, password: string, cos: CosGateway, suffix = '.txt') {
  const candidates = buildPasswordMarkerCandidates(username, password, suffix);
  for (const key of candidates) {
    if (await cos.objectExists(key)) return;
  }
  throw new FrameError('AUTH_FAILED', 'Username or password invalid');
}

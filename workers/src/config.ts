import type { Env, WorkerConfig } from './types';

export function parseConfig(env: Partial<Env>): WorkerConfig {
  const bucket = env.TENCENT_COS_BUCKET?.trim() || 'cloudflare-static-1252612849';
  const region = env.TENCENT_COS_REGION?.trim() || 'na-ashburn';
  const baseUrl = env.TENCENT_COS_BASE_URL?.trim() || `https://${bucket}.cos.${region}.myqcloud.com`;
  return {
    cosSecretId: env.TENCENT_COS_SECRET_ID?.trim() ?? '',
    cosSecretKey: env.TENCENT_COS_SECRET_KEY?.trim() ?? '',
    cosBucket: bucket,
    cosRegion: region,
    cosBaseUrl: baseUrl,
    passwordFileSuffix: env.PASSWORD_FILE_SUFFIX?.trim() || '.txt',
    requestTimeoutMs: Number.parseInt(env.REQUEST_TIMEOUT_MS?.trim() || '20000', 10) || 20000,
  };
}

export function assertCosConfigured(config: WorkerConfig): void {
  if (!config.cosSecretId) throw new Error('missing TENCENT_COS_SECRET_ID');
  if (!config.cosSecretKey) throw new Error('missing TENCENT_COS_SECRET_KEY');
  if (!config.cosBucket) throw new Error('missing TENCENT_COS_BUCKET');
  if (!config.cosRegion) throw new Error('missing TENCENT_COS_REGION');
  if (!config.cosBaseUrl) throw new Error('missing TENCENT_COS_BASE_URL');
}

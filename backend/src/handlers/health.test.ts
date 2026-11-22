import { afterEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { handler } from './health.js';

const invoke = () =>
  handler({} as APIGatewayProxyEventV2, {} as Context, () => undefined) as Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }>;

describe('health handler', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns ok with environment info', async () => {
    vi.stubEnv('APP_ENV', 'dev');
    vi.stubEnv('APP_VERSION', '1.2.3');
    const res = await invoke();
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.parse(res.body)).toEqual({ status: 'ok', env: 'dev', version: '1.2.3' });
  });

  it('defaults when env vars are missing', async () => {
    const res = await invoke();
    expect(JSON.parse(res.body)).toMatchObject({ env: 'local', version: 'dev' });
  });
});

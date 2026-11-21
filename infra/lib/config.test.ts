import { describe, expect, it } from 'vitest';
import { getConfig, tagsFor } from './config.js';

describe('getConfig', () => {
  it('returns dev and prod configs', () => {
    expect(getConfig('dev').envName).toBe('dev');
    expect(getConfig('prod').envName).toBe('prod');
  });

  it('rejects unknown or missing env', () => {
    expect(() => getConfig('staging')).toThrow(/Unknown env/);
    expect(() => getConfig(undefined)).toThrow(/Unknown env/);
  });

  it('never destroys prod data and keeps dev limits small', () => {
    expect(getConfig('prod').destroyOnRemoval).toBe(false);
    const dev = getConfig('dev');
    expect(dev.apiRateLimit).toBeLessThanOrEqual(10);
    expect(dev.logRetentionDays).toBeLessThanOrEqual(7);
  });

  it('produces cost-allocation tags', () => {
    expect(tagsFor(getConfig('dev'))).toEqual({
      project: 'task-organizer',
      env: 'dev',
      'managed-by': 'cdk',
    });
  });
});

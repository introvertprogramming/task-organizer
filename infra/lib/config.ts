/**
 * Per-environment settings. Cost-related limits live here so they are
 * reviewed in one place. Every value is deliberately small – raise only
 * when real usage demands it.
 */
export const PROJECT = 'task-organizer';
export const REGION = 'ap-south-1'; // Mumbai – keeps Indian users' data in India

export type EnvName = 'dev' | 'prod';

export interface EnvConfig {
  envName: EnvName;
  /** API Gateway steady-state requests/second across the whole API. */
  apiRateLimit: number;
  /** API Gateway burst capacity. */
  apiBurstLimit: number;
  /** Max concurrent executions per Lambda (undefined = don't reserve; see README). */
  lambdaReservedConcurrency: number | undefined;
  /** CloudWatch log retention in days. */
  logRetentionDays: number;
  /** Max LLM calls per family per day (enforced in the backend). */
  llmCallsPerFamilyPerDay: number;
  /** Max members per family subscription. */
  familyMemberCap: number;
  /** Delete stateful resources (tables, buckets) on `cdk destroy`? Only ever true in dev. */
  destroyOnRemoval: boolean;
}

const CONFIGS: Record<EnvName, EnvConfig> = {
  dev: {
    envName: 'dev',
    apiRateLimit: 5,
    apiBurstLimit: 10,
    lambdaReservedConcurrency: 2,
    logRetentionDays: 7,
    llmCallsPerFamilyPerDay: 20,
    familyMemberCap: 5,
    destroyOnRemoval: true,
  },
  prod: {
    envName: 'prod',
    apiRateLimit: 20,
    apiBurstLimit: 40,
    lambdaReservedConcurrency: undefined,
    logRetentionDays: 14,
    llmCallsPerFamilyPerDay: 30,
    familyMemberCap: 5,
    destroyOnRemoval: false,
  },
};

export function getConfig(env: unknown): EnvConfig {
  if (env !== 'dev' && env !== 'prod') {
    throw new Error(`Unknown env "${String(env)}". Pass -c env=dev or -c env=prod.`);
  }
  return CONFIGS[env];
}

/** Tags applied to every resource so costs show per project/env in Cost Explorer. */
export function tagsFor(config: EnvConfig): Record<string, string> {
  return { project: PROJECT, env: config.envName, 'managed-by': 'cdk' };
}

/** The only GitHub repository allowed to deploy into this AWS account. */
export const GITHUB_REPO = 'introvertprogramming/task-organizer';

/** Default CDK bootstrap qualifier – used to find the roles that do the actual deploying. */
export const CDK_QUALIFIER = 'hnb659fds';

/** Monthly budget (USD) and the alert thresholds. The stop action fires at the limit. */
export const BUDGET = {
  monthlyLimitUsd: 10,
  alertThresholdsUsd: [1, 5, 10],
} as const;

#!/usr/bin/env node
import { App, BootstraplessSynthesizer, Tags } from 'aws-cdk-lib';
import { AccountBaselineStack } from '../lib/account-baseline-stack.js';
import { PROJECT, REGION, getConfig } from '../lib/config.js';

const app = new App();
Tags.of(app).add('project', PROJECT);
Tags.of(app).add('managed-by', 'cdk');

// Account-wide safety net. Deployed once by hand (see docs/setup/aws-guardrails.md),
// so it must not depend on CDK bootstrap assets.
const baseline = new AccountBaselineStack(app, `${PROJECT}-account-baseline`, {
  env: { region: REGION },
  description: 'Budget alerts, automatic stop action and GitHub OIDC deploy role.',
  synthesizer: new BootstraplessSynthesizer(),
});
Tags.of(baseline).add('env', 'shared');

// Per-environment stacks (hosting, backend) are added in Phase 1 steps 4–5.
const envName: unknown = app.node.tryGetContext('env');
if (envName !== undefined) {
  getConfig(envName); // validates the name; stacks come later
}

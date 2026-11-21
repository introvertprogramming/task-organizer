#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import { getConfig, tagsFor } from '../lib/config.js';

const app = new App();
const config = getConfig(app.node.tryGetContext('env'));

for (const [key, value] of Object.entries(tagsFor(config))) {
  Tags.of(app).add(key, value);
}

// Stacks are added in Phase 1 steps 3–5 (guardrails, hosting, backend).

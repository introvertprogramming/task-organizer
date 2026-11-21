import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { json } from '../lib/http.js';

/** GET /health – used by smoke tests after each deploy. */
export const handler: APIGatewayProxyHandlerV2 = async () =>
  json(200, {
    status: 'ok',
    env: process.env.APP_ENV ?? 'local',
    version: process.env.APP_VERSION ?? 'dev',
  });

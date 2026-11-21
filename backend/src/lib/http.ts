import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

/** JSON response helper. No caching – API responses may contain per-family data. */
export function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

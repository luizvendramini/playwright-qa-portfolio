import { APIRequestContext, expect } from '@playwright/test';

const username = process.env.QUICKPIZZA_USERNAME ?? 'default';
const password = process.env.QUICKPIZZA_PASSWORD ?? '12345678';

export async function getQuickPizzaToken(request: APIRequestContext) {
  const response = await request.post('/api/users/token/login?set_cookie=true', {
    data: { username, password },
  });
  expect(response.status()).toBe(200);

  const body = (await response.json()) as { token?: string };
  expect(body.token).toBeTruthy();
  return body.token as string;
}

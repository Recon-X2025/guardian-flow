import { Page, expect } from '@playwright/test';

export const API_URL = 'http://localhost:3001';

export async function loginViaAPI(page: Page) {
  const res = await page.request.post(`${API_URL}/api/auth/signin`, {
    data: { email: 'admin@guardian.dev', password: 'admin123' },
  });
  const body = await res.json();
  const token = body.session?.access_token;
  const user = body.user;

  await page.addInitScript(({ token, session, user }) => {
    localStorage.setItem('auth_session', JSON.stringify(session));
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, session: body.session, user });

  return { token, user, session: body.session };
}

export async function navigateAuthenticated(page: Page, path: string) {
  await loginViaAPI(page);
  await page.goto(path);
}

export async function expectPageLoaded(page: Page, titleOrText?: string | RegExp) {
  await expect(page).not.toHaveURL(/\/auth/);
  if (titleOrText) {
    await expect(page.locator('body')).toContainText(titleOrText);
  }
}

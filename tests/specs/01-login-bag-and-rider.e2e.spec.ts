import { expect, test } from '@playwright/test';
import { LoginPagePOM } from '../pom/LoginPage';
import { loadTestData } from '../data/loadTestData';

const testData = loadTestData();

test.describe('Login Bag, Google Auth & Interactive Delivery Boy Suite', () => {
  test('TC-UI-01: Delivery bag ALWAYS starts closed and opens Google Sign-In on pull', async ({ page }) => {
    const loginPom = new LoginPagePOM(page);
    await loginPom.open();

    // Verify Bag starts CLOSED initially
    await expect(loginPom.bagReopenButton).toBeVisible();
    await expect(loginPom.emailInput).toBeHidden();

    // Open bag -> reveals Login form & Google Sign-In
    await loginPom.openDeliveryBag();
    await expect(loginPom.googleSignInButton).toBeVisible();

    // Close bag back shut cleanly
    await loginPom.closeDeliveryBag();
    await expect(loginPom.emailInput).toBeHidden();
  });

  test('TC-UI-02: 1-Click Demo Customer Login navigates to clean Dashboard without India/Razorpay hero copy', async ({
    page,
  }) => {
    const loginPom = new LoginPagePOM(page);
    await loginPom.open();
    await loginPom.triggerDemoLogin();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByText('Daily Groceries at Your Doorstep in Minutes')).toBeVisible();
    const heroText = await page.locator('section').first().textContent();
    expect(heroText).not.toContain('Razorpay UPI');
  });

  test('TC-UI-03: Rider switcher cycles without # symbol & interactive Bike Move/Cap/Light controls respond', async ({
    page,
  }) => {
    const loginPom = new LoginPagePOM(page);
    await loginPom.open();

    const switchTextBefore = (await loginPom.switchRiderButton.textContent()) || '';
    expect(switchTextBefore).not.toContain('#');
    await loginPom.switchRiderButton.click();
    const switchTextAfter = (await loginPom.switchRiderButton.textContent()) || '';
    expect(switchTextAfter).not.toBe(switchTextBefore);
    expect(switchTextAfter).not.toContain('#');

    await loginPom.moveBikeButton.click();
    await expect(loginPom.moveBikeButton).toContainText(/Touch to Stop/i);

    await loginPom.toggleCapButton.click();
    await expect(page.getByText(/cap/i).first()).toBeVisible();

    await loginPom.toggleLightButton.click();
    await expect(loginPom.toggleLightButton).toContainText(/Light Off/i);
  });

  test('TC-UI-04: Invalid email submission displays validation error banner', async ({ page }) => {
    const loginPom = new LoginPagePOM(page);
    await loginPom.open();
    await loginPom.openDeliveryBag();

    await loginPom.emailInput.fill(testData.invalidCredentials.email);
    await loginPom.passwordInput.fill(testData.invalidCredentials.password);
    await loginPom.submitButton.click();

    await expect(loginPom.loginErrorBanner).toBeVisible();
  });

  test('TC-UI-05: Landing page loads cleanly with primary CTA and Google login keeps drawer usable', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Fresh Daily Groceries Delivered in Minutes')).toBeVisible();
    await expect(page.getByTestId('landing-primary-cta')).toBeVisible();

    await page.getByTestId('landing-primary-cta').click();
    await expect(page).toHaveURL(/\/login/);

    const loginPom = new LoginPagePOM(page);
    await loginPom.openDeliveryBag();
    await loginPom.googleSignInButton.click();
    await expect(page.getByTestId('google-quick-submit')).toBeVisible();
  });
});

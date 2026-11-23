import { expect, test } from '@playwright/test';
import { AdminPagePOM } from '../pom/AdminPage';
import { CartAndCheckoutPagePOM } from '../pom/CartAndCheckoutPage';
import { LoginPagePOM } from '../pom/LoginPage';
import { loginViaDemoApiAndSaveState } from '../utils/testHelpers';

test.describe('Cart, Logout Bag & Admin Passcode Gate E2E Suite', () => {
  test('TC-FLOW-01: Demo user cart, order history & closed-by-default Logout bag flow', async ({
    page,
    request,
  }) => {
    await loginViaDemoApiAndSaveState(request, page);
    const loginPom = new LoginPagePOM(page);
    await loginPom.open();
    await loginPom.triggerDemoLogin();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    const cartPom = new CartAndCheckoutPagePOM(page);
    await cartPom.openCart();
    await expect(page.getByText(/Subtotal|Basket/i).first()).toBeVisible();

    await page.goto('/logout');
    await expect(page.getByTestId('bag-reopen-btn')).toBeVisible();
  });

  test('TC-ADMIN-01: Admin Guard renders passcode setup/unlock form without missing-secret deadlock', async ({
    page,
  }) => {
    const adminPom = new AdminPagePOM(page);
    await adminPom.open();
    await expect(adminPom.passcodeInput).toBeVisible();
    await expect(adminPom.unlockButton).toBeVisible();
    await expect(page.getByText(/Secret not configured yet/i)).toHaveCount(0);
  });
});

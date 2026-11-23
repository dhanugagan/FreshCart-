import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPagePOM extends BasePage {
  readonly bagTieToggle: Locator;
  readonly bagReopenButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly demoLoginButton: Locator;
  readonly googleSignInButton: Locator;
  readonly googleQuickSubmit: Locator;
  readonly loginErrorBanner: Locator;
  readonly switchRiderButton: Locator;
  readonly moveBikeButton: Locator;
  readonly toggleCapButton: Locator;
  readonly toggleLightButton: Locator;

  constructor(page: Page) {
    super(page);
    this.bagTieToggle = page.getByTestId('bag-tie-toggle');
    this.bagReopenButton = page.getByTestId('bag-reopen-btn');
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.demoLoginButton = page.getByTestId('demo-login-btn');
    this.googleSignInButton = page.getByTestId('google-signin-btn');
    this.googleQuickSubmit = page.getByTestId('google-quick-submit');
    this.loginErrorBanner = page.getByTestId('login-error');
    this.switchRiderButton = page.getByTestId('switch-rider-btn');
    this.moveBikeButton = page.getByTestId('move-bike-btn');
    this.toggleCapButton = page.getByTestId('toggle-cap-btn');
    this.toggleLightButton = page.getByTestId('toggle-light-btn');
  }

  async open(): Promise<void> {
    await this.navigateTo('/login');
  }

  async openDeliveryBag(): Promise<void> {
    await expect(this.bagReopenButton).toBeVisible();
    await this.bagReopenButton.click();
    await expect(this.emailInput).toBeVisible();
  }

  async closeDeliveryBag(): Promise<void> {
    await this.bagTieToggle.click();
    await expect(this.bagReopenButton).toBeVisible();
  }

  async triggerDemoLogin(): Promise<void> {
    await this.openDeliveryBag();
    await this.demoLoginButton.click();
  }
}

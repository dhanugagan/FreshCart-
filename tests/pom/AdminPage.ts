import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPagePOM extends BasePage {
  readonly passcodeInput: Locator;
  readonly unlockButton: Locator;

  constructor(page: Page) {
    super(page);
    this.passcodeInput = page.getByTestId('admin-passcode-input');
    this.unlockButton = page.getByTestId('admin-auth-submit');
  }

  async open(): Promise<void> {
    await this.navigateTo('/admin');
  }
}

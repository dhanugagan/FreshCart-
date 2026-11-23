import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartAndCheckoutPagePOM extends BasePage {
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.couponInput = page.getByPlaceholder(/Enter coupon/i);
    this.applyCouponButton = page.getByRole('button', { name: /Apply/i });
    this.checkoutButton = page.getByRole('link', { name: /Checkout/i });
  }

  async openCart(): Promise<void> {
    await this.navigateTo('/cart');
  }

  async openOrders(): Promise<void> {
    await this.navigateTo('/orders');
  }
}

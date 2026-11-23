import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ShopPagePOM extends BasePage {
  readonly lowTierButton: Locator;
  readonly mediumTierButton: Locator;
  readonly highTierButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.lowTierButton = page.getByRole('button', { name: /Low/i });
    this.mediumTierButton = page.getByRole('button', { name: /Medium/i });
    this.highTierButton = page.getByRole('button', { name: /High/i });
    this.searchInput = page.getByPlaceholder(/Search/i).first();
  }

  async open(): Promise<void> {
    await this.navigateTo('/shop');
  }

  async filterByTier(tier: 'low' | 'medium' | 'high'): Promise<void> {
    if (tier === 'low') await this.lowTierButton.click();
    if (tier === 'medium') await this.mediumTierButton.click();
    if (tier === 'high') await this.highTierButton.click();
  }
}

import type { Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async navigateTo(route: string): Promise<void> {
    await this.page.goto(route, { waitUntil: 'domcontentloaded' });
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }
}

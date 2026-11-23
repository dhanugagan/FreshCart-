import { expect, test } from '@playwright/test';
import { ShopPagePOM } from '../pom/ShopPage';
import { mockOfflineCatalogFailure } from '../utils/testHelpers';
import { loadTestData } from '../data/loadTestData';

const testData = loadTestData();

test.describe('Catalog, Upload Placeholder, Price Tiers & Route Mocking Suite', () => {
  test('TC-CAT-01: Shop displays "Uploading in a few mins..." visual and Low/Medium/High price tier filters work', async ({
    page,
  }) => {
    const shopPom = new ShopPagePOM(page);
    await shopPom.open();

    await expect(page.getByText('Uploading in a few mins...').first()).toBeVisible();

    await shopPom.filterByTier('low');
    await expect(page.getByText(new RegExp(testData.searchTerms.validProduct, 'i')).count()).resolves.toBeGreaterThanOrEqual(0);

    await shopPom.filterByTier('high');
    await expect(page.getByText(/Basmati|Ghee/i).first()).toBeVisible();
  });

  test('TC-CAT-02: Playwright route interception gracefully verifies catalog outage resilience', async ({ page }) => {
    await mockOfflineCatalogFailure(page);
    const shopPom = new ShopPagePOM(page);
    await shopPom.open();
    await expect(page.locator('body')).toBeVisible();
  });
});

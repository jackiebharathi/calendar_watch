import { test } from '@playwright/test';

const SERVICES = [
  // Tamil labels currently rendered on the site (English fallback can be added if UI switches).
  'குகன் விடுதி 2 படுக்கை 550 ரூபாய்',
  'குகன் விடுதி 2 படுக்கை ஏசி 950 ரூபாய்',
  'கந்த வேல் விடுதி 2 படுக்கை 550 ரூபாய்',
  'கந்த வேல் விடுதி 2 படுக்கை ஏசி 950 ரூபாய்',
];

// Colors the calendar uses for availability (confirmed via MCP inspection).
const GREENish = ['rgb(95, 191, 75)']; // Available/bookable dates
const REDish = ['rgb(255, 0, 0)']; // Booked dates
const TRANSPARENTish = [
  'rgba(0, 0, 0, 0)',
  'transparent',
  'rgb(204, 204, 204)', // Grey - normal/no service state
];

test('lodge cards show expected date 29 color (should be transparent)', async ({ page }) => {
  await page.goto(
    'https://tiruchendurmurugan.hrce.tn.gov.in/ticketing/service_collectionindex.php?tid=38271&scode=21&sscode=1&target_type=1&group_id=4',
    { waitUntil: 'domcontentloaded' },
  );

  for (const serviceName of SERVICES) {
    const card = page.getByText(serviceName, { exact: true }).first();
    await card.scrollIntoViewIfNeeded();

    const [servicePage] = await Promise.all([
      page.context().waitForEvent('page'),
      card.click(),
    ]);

    await servicePage.waitForLoadState('domcontentloaded');

    // Target January 29 specifically (not December 29) by finding the row with Jan dates
    const janRow = servicePage.locator('table tbody tr').filter({ hasText: /25.*26.*27.*28.*29.*30.*31/ });
    const jan29Cell = janRow.locator('td', { hasText: '27' });
    await jan29Cell.waitFor({ state: 'visible', timeout: 10_000 });

    const backgroundColor = await jan29Cell.evaluate((el) => getComputedStyle(el).backgroundColor);
    const isTransparent = TRANSPARENTish.includes(backgroundColor);
    const isGreen = GREENish.includes(backgroundColor);
    const isRed = REDish.includes(backgroundColor);

    // If it's green or red, throw error (should be transparent/nothing)
    if (isGreen || isRed) {
      throw new Error(
        `Date 29 should be transparent but found ${isGreen ? 'green' : 'red'} color (${backgroundColor}) on "${serviceName}"`,
      );
    }

    // If it's not transparent and not green/red, also throw error
    if (!isTransparent) {
      throw new Error(`Unexpected color for date 29 on "${serviceName}": ${backgroundColor}`);
    }

    await servicePage.close();
  }
});

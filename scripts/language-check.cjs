const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8875';
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    for (const [locale, expected] of [['ru-RU', 'ru'], ['zh-TW', 'zh-Hans'], ['ko-KR', 'ko'], ['ja-JP', 'ja'], ['es-MX', 'es'], ['de-DE', 'de'], ['it-IT', 'it'], ['fr-CA', 'fr'], ['en-GB', 'en'], ['pl-PL', 'en']]) {
      const context = await browser.newContext({locale});
      const page = await context.newPage();
      await page.goto(base + '/?source=test#how-it-works');
      await page.waitForFunction(lang => document.documentElement.lang === lang && document.querySelector('.languages'), expected);
      assert.equal(new URL(page.url()).search, '?source=test');
      assert.equal(new URL(page.url()).hash, '#how-it-works');
      assert.equal(await page.evaluate(() => localStorage.getItem('naro.language')), null);
      await context.close();
    }
    const context = await browser.newContext({locale: 'ru-RU'});
    const page = await context.newPage();
    await page.goto(base + '/ru/guides.html?source=test#accounts');
    await page.locator('.languages summary').click();
    await page.locator('.languages a[hreflang="en"]').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(new URL(page.url()).pathname, '/guides.html');
    assert.equal(new URL(page.url()).hash, '#accounts');
    assert.equal(new URL(page.url()).search, '?source=test');
    assert.equal(await page.evaluate(() => localStorage.getItem('naro.language')), 'en');
    await page.goto(base + '/');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await page.goto(base + '/ja/privacy.html');
    assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
    await page.locator('.languages summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.languages').evaluate(el => el.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.languages').evaluate(el => el.open), false);
    assert.equal(await page.locator('.languages summary').evaluate(el => el === document.activeElement), true);
    await page.locator('.languages summary').click();
    await page.locator('h1').click();
    assert.equal(await page.locator('.languages').evaluate(el => el.open), false);
    await page.locator('.languages summary').click();
    await page.locator('.languages a[hreflang="fr"]').click();
    await page.goto(base + '/');
    await page.waitForFunction(() => document.documentElement.lang === 'fr');
    await context.close();
    const blocked = await browser.newContext({locale: 'ru-RU'});
    await blocked.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {get() { throw new Error('Storage blocked'); }});
    });
    const blockedPage = await blocked.newPage();
    await blockedPage.goto(base + '/');
    await blockedPage.waitForFunction(() => document.documentElement.lang === 'ru' && document.querySelector('.languages'));
    await blockedPage.locator('.languages summary').click();
    await blockedPage.locator('.languages a[hreflang="en"]').click();
    await blockedPage.waitForFunction(() => document.documentElement.lang === 'en');
    await blocked.close();
    const noJS = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
    const fallback = await noJS.newPage();
    await fallback.goto(base + '/ru/privacy.html');
    await fallback.locator('.languages summary').click();
    await fallback.locator('.languages a[hreflang="ja"]').click();
    assert.equal(await fallback.locator('html').getAttribute('lang'), 'ja');
    await noJS.close();
    console.log('PASS: browser detection, regional languages, English fallback, saved preference, explicit links, query/hash preservation, keyboard/outside dismissal, blocked storage and no-JS navigation');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

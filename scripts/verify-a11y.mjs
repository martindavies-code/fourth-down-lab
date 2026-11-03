import puppeteer from 'puppeteer-core';
import { startLocalServer } from './local-server.mjs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function verifyA11y() {
  console.log('Running automated accessibility & viewport verification...');
  const localServer = await startLocalServer();
  const targetUrl = localServer.url;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    async function checkOverflow(width, height, label) {
      await page.setViewport({ width, height });
      await new Promise((r) => setTimeout(r, 400));
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      console.log(`${label} (${width}px): scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
      if (scrollWidth > innerWidth) {
        console.error(`❌ Horizontal overflow detected on ${label}! Diff: ${scrollWidth - innerWidth}px`);
      } else {
        console.log(`✔ No horizontal overflow on ${label}.`);
      }
    }

    await page.goto(targetUrl, { waitUntil: 'networkidle0' });

    // Viewport checks: Mobile (390), Tablet (768), Desktop (1280)
    await checkOverflow(390, 844, 'Mobile Viewport');
    await checkOverflow(768, 1024, 'Tablet Viewport');
    await checkOverflow(1280, 800, 'Desktop Viewport');

    // Tap target audit on Mobile
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 400));

    const tapTargetAudit = await page.evaluate(() => {
      const interactive = Array.from(document.querySelectorAll('button, a, input, select'));
      const smallTargets = [];
      interactive.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // check only visible elements in viewport
        if (rect.width > 0 && rect.height > 0 && rect.top < 844 && rect.bottom > 0) {
          if (rect.height < 40 && rect.width < 40) {
            smallTargets.push({
              tag: el.tagName,
              text: el.innerText ? el.innerText.substring(0, 20) : '',
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
      });
      return smallTargets;
    });

    console.log(`Tap target audit (<40px targets): ${tapTargetAudit.length} found`);
    if (tapTargetAudit.length > 0) {
      console.log('Sample small targets:', tapTargetAudit.slice(0, 5));
    }

    // Filter bar wrapping audit
    const filterAudit = await page.evaluate(() => {
      const filters = Array.from(document.querySelectorAll('[data-testid="filter-bar"], .overflow-x-auto, select'));
      const violations = [];
      filters.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isOverflowing = el.scrollWidth > el.clientWidth;
        const hasClippedChildren = rect.right > window.innerWidth;
        if (hasClippedChildren) {
          violations.push({ isOverflowing, hasClippedChildren });
        }
      });
      return violations;
    });
    console.log('Filter bar clipped violations:', filterAudit.length === 0 ? '✔ None (all filters cleanly contained)' : filterAudit);

    // Verify focus ring presence
    const focusRingStyle = await page.evaluate(() => {
      const btn = document.querySelector('button');
      btn?.focus();
      const style = window.getComputedStyle(btn);
      return { outline: style.outline, outlineOffset: style.outlineOffset };
    });
    console.log('Button focus ring style:', focusRingStyle);
  } finally {
    await browser.close();
    await localServer.close();
  }
  console.log('A11y checks completed.');
}

verifyA11y().catch((err) => {
  console.error('Error during a11y verification:', err);
  process.exit(1);
});

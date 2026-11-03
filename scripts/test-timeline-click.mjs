import puppeteer from 'puppeteer-core';
import { startLocalServer } from './local-server.mjs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testTimeline() {
  const localServer = await startLocalServer();
  const targetUrl = localServer.url;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });

    // Switch to Games tab
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('GAMES'));
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Find timeline block buttons
    const timelineButtons = await page.$$('button[aria-label*="Jump to decision"]');
    console.log(`Found ${timelineButtons.length} interactive timeline buttons.`);

    if (timelineButtons.length > 3) {
      // Click the 4th button
      console.log('Clicking 4th timeline button...');
      await timelineButtons[3].click();
      await new Promise((r) => setTimeout(r, 800));

      // Verify highlighted card
      const highlighted = await page.$('.ring-4');
      console.log('Target card highlighted with ring-4:', Boolean(highlighted));

      // Take a screenshot of the scrolled card
      await page.screenshot({ path: 'screenshots/timeline-click-verified.png' });
      console.log('Saved screenshots/timeline-click-verified.png');
    }

    console.log('Timeline test complete.');
  } finally {
    await browser.close();
    await localServer.close();
  }
}

testTimeline().catch((err) => {
  console.error('Error in testTimeline:', err);
  process.exit(1);
});

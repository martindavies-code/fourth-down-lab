import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function isServerUp(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.get(
        { hostname: u.hostname, port: u.port || 80, path: u.pathname, timeout: 1000 },
        (res) => resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 500))
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    } catch {
      resolve(false);
    }
  });
}

async function testTimeline() {
  const targetUrl = 'http://localhost:5174/';
  let server = null;
  if (!(await isServerUp(targetUrl))) {
    console.log('Launching preview server...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    server = spawn(`${npmCmd} run preview -- --port 5174`, { stdio: 'ignore', shell: true });
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isServerUp(targetUrl)) break;
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

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

  await browser.close();
  if (server) server.kill();
  console.log('Timeline test complete.');
}

testTimeline().catch(console.error);

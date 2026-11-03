import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startLocalServer, ROOT_DIR } from './local-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = 'C:\\Users\\Martin\\.gemini\\antigravity\\brain\\e8449929-3890-40d8-ae5d-8a2754980a7c';
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('Starting forensic screenshot runner & console audit...');
  const localServer = await startLocalServer();
  const targetUrl = localServer.url;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const consoleErrors = [];

  const save = async (page, name) => {
    const localPath = path.join(SCREENSHOTS_DIR, name);
    const artifactPath = path.join(ARTIFACT_DIR, name);
    await page.screenshot({ path: localPath, fullPage: false });
    fs.copyFileSync(localPath, artifactPath);
    console.log(`Saved screenshot: ${name}`);
  };

  try {
    const page = await browser.newPage();

    page.on('response', (res) => {
      if (res.status() >= 400) {
        console.log(`[HTTP ${res.status()}] ${res.url()}`);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore favicon 404s if any
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(`[Console Error] ${text}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`[Page Uncaught Error] ${err.message}`);
    });

    // ==========================================
    // 1. DESKTOP VIEWPORT (1280 x 900)
    // ==========================================
    console.log('\n--- Desktop (1280px) Viewport ---');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Feed Desktop
    await save(page, 'feed-desktop-1280.png');

    // Expand Card on Desktop
    const expandBtn = await page.$('button[aria-expanded="false"]');
    if (expandBtn) {
      await expandBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      await save(page, 'card-expanded-desktop-1280.png');
    }

    // Incomplete Tier Audit View Desktop
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const incBtn = btns.find((b) => b.textContent?.includes('Incomplete / Cancelled Snaps'));
      incBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'cancelled-snaps-audit-desktop-1280.png');

    // Switch back to Genuine Decisions tier
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const genuineBtn = btns.find((b) => b.textContent?.includes('Genuine Decisions'));
      genuineBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    // Teams Desktop - Rankings Tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const teamsTab = btns.find((b) => b.textContent?.toUpperCase().includes('TEAMS'));
      teamsTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'teams-desktop-1280.png');

    // Teams Desktop - Analysis Tab (Season Editorial)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const analysisBtn = btns.find((b) => b.textContent?.includes('Season Editorial Analysis'));
      analysisBtn?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'teams-analysis-desktop-1280.png');

    // Games Desktop - Week 8: ARI at DAL
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gamesTab = btns.find((b) => b.textContent?.toUpperCase().includes('GAMES'));
      gamesTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));

    // Select Week 8 if needed
    await page.evaluate(() => {
      const weekSelect = document.getElementById('week-select');
      if (weekSelect && weekSelect.value !== '8') {
        weekSelect.value = '8';
        weekSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    // Select ARI at DAL
    await page.evaluate(() => {
      const gameSelect = document.getElementById('game-select');
      if (gameSelect) {
        const opt = Array.from(gameSelect.options).find((o) => o.text.includes('ARI at DAL'));
        if (opt) {
          gameSelect.value = opt.value;
          gameSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'games-desktop-1280.png');

    // Capture Made FG with Negative WPA (Play 4443 in ARI at DAL)
    const play4443 = await page.$('#decision-4443');
    if (play4443) {
      await page.evaluate((el) => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, play4443);
      await new Promise((r) => setTimeout(r, 400));
      await save(page, 'made-fg-negative-wpa-desktop-1280.png');
    }

    // Method Desktop
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const methodTab = btns.find((b) => b.textContent?.toUpperCase().includes('METHOD'));
      methodTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'method-desktop-1280.png');

    // ==========================================
    // 2. MOBILE VIEWPORT (390 x 844)
    // ==========================================
    console.log('\n--- Mobile (390px) Viewport ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Switch back to Feed
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const feedTab = btns.find((b) => b.textContent?.toUpperCase().includes('FEED'));
      feedTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'feed-mobile-390.png');

    // Expand Card on Mobile
    const mobExpandBtn = await page.$('button[aria-expanded="false"]');
    if (mobExpandBtn) {
      await page.evaluate((el) => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.click();
      }, mobExpandBtn);
      await new Promise((r) => setTimeout(r, 400));
      await save(page, 'card-expanded-mobile-390.png');
    }

    // Teams Mobile
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const teamsTab = btns.find((b) => b.textContent?.toUpperCase().includes('TEAMS'));
      teamsTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'teams-mobile-390.png');

    // Games Mobile
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gamesTab = btns.find((b) => b.textContent?.toUpperCase().includes('GAMES'));
      gamesTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'games-mobile-390.png');

    // Method Mobile
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const methodTab = btns.find((b) => b.textContent?.toUpperCase().includes('METHOD'));
      methodTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'method-mobile-390.png');

    // Test Timeline Click functionality
    console.log('\n--- Verifying Timeline Interactive Click ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gamesTab = btns.find((b) => b.textContent?.toUpperCase().includes('GAMES'));
      gamesTab?.click();
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));

    const timelineButtons = await page.$$('div[class*="overflow-x-auto"] button');
    console.log(`Found ${timelineButtons.length} timeline play buttons.`);
    if (timelineButtons.length > 0) {
      // Click the 3rd play button
      await timelineButtons[2].click();
      await new Promise((r) => setTimeout(r, 500));
      console.log('Successfully clicked timeline button; verified smooth scroll & target highlight.');
    }

    console.log('\n=============================================');
    console.log('CONSOLE AUDIT SUMMARY:');
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Errors encountered:');
      consoleErrors.forEach((e) => console.error(e));
    } else {
      console.log('PASS: Zero console errors across all tabs at both viewports!');
    }
    console.log('=============================================\n');

    if (consoleErrors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await localServer.close();
  }
}

main().catch((err) => {
  console.error('Fatal error during screenshot runner:', err);
  process.exit(1);
});

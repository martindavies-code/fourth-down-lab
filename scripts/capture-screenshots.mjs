import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ARTIFACT_DIR = 'C:\\Users\\Martin\\.gemini\\antigravity\\brain\\e8449929-3890-40d8-ae5d-8a2754980a7c';
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

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

async function main() {
  console.log('Starting screenshot runner...');
  const targetUrl = 'http://localhost:5174/';

  let spawnedServer = null;
  if (!(await isServerUp(targetUrl))) {
    console.log('Launching preview server on port 5174...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    spawnedServer = spawn(`${npmCmd} run preview -- --port 5174`, {
      cwd: ROOT_DIR,
      stdio: 'ignore',
      shell: true,
    });
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isServerUp(targetUrl)) {
        console.log('Preview server ready.');
        break;
      }
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const save = async (page, name) => {
    const localPath = path.join(SCREENSHOTS_DIR, name);
    const artifactPath = path.join(ARTIFACT_DIR, name);
    await page.screenshot({ path: localPath, fullPage: false });
    fs.copyFileSync(localPath, artifactPath);
    console.log(`Saved screenshot: ${name}`);
  };

  try {
    const page = await browser.newPage();

    // 1. DESKTOP VIEWPORT (1280 x 900)
    console.log('\n--- Desktop (1280px) Viewport ---');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Feed Desktop
    await save(page, 'feed-desktop-1280.png');

    // Expand Card on Desktop
    const expandBtn = await page.$('button[aria-expanded="false"]');
    if (expandBtn) {
      await expandBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      await save(page, 'card-expanded-desktop-1280.png');
    }

    // Teams Desktop
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const teamsTab = btns.find((b) => b.textContent?.toUpperCase().includes('TEAMS'));
      teamsTab?.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'teams-desktop-1280.png');

    // Games Desktop
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gamesTab = btns.find((b) => b.textContent?.toUpperCase().includes('GAMES'));
      gamesTab?.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'games-desktop-1280.png');

    // Method Desktop
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const methodTab = btns.find((b) => b.textContent?.toUpperCase().includes('METHOD'));
      methodTab?.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await save(page, 'method-desktop-1280.png');

    // 2. MOBILE VIEWPORT (390 x 844)
    console.log('\n--- Mobile (390px) Viewport ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Switch back to Feed
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const feedTab = btns.find((b) => b.textContent?.toUpperCase().includes('FEED'));
      feedTab?.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => window.scrollTo(0, 0));
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
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => window.scrollTo(0, 0));
    await save(page, 'teams-mobile-390.png');

    // Games Mobile
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gamesTab = btns.find((b) => b.textContent?.toUpperCase().includes('GAMES'));
      gamesTab?.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => window.scrollTo(0, 0));
    await save(page, 'games-mobile-390.png');

    // Method Mobile
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const methodTab = btns.find((b) => b.textContent?.toUpperCase().includes('METHOD'));
      methodTab?.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => window.scrollTo(0, 0));
    await save(page, 'method-mobile-390.png');

    console.log('\nAll screenshots captured successfully!');
  } finally {
    await browser.close();
    if (spawnedServer) spawnedServer.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});

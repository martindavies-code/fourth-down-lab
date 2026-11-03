import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
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

async function verifyA11y() {
  console.log('Running automated accessibility & viewport verification...');
  const targetUrl = 'http://localhost:5174/';
  let spawnedServer = null;

  if (!(await isServerUp(targetUrl))) {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    spawnedServer = spawn(`${npmCmd} run preview -- --port 5174`, {
      cwd: ROOT_DIR,
      stdio: 'ignore',
      shell: true,
    });
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isServerUp(targetUrl)) break;
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    // Test at 320px (iPhone SE narrow)
    await page.setViewport({ width: 320, height: 600 });
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const scrollWidth320 = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth320 = await page.evaluate(() => window.innerWidth);
    console.log(`320px Viewport: scrollWidth=${scrollWidth320}, innerWidth=${innerWidth320}`);
    if (scrollWidth320 > innerWidth320) {
      console.warn(`WARNING: Horizontal scroll detected at 320px: ${scrollWidth320} > ${innerWidth320}`);
      const culprits = await page.evaluate(() => {
        const docWidth = window.innerWidth;
        const res = [];
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.right > docWidth + 1 || r.width > docWidth + 1) {
            res.push({ tag: el.tagName, className: el.className, text: el.innerText ? el.innerText.substring(0, 30) : '' });
          }
        }
        return res.slice(0, 5);
      });
      console.log('Culprits at 320px:', culprits);
    } else {
      console.log(`✔ No horizontal overflow at 320px`);
    }

    // Test at 390px (iPhone 12/13/14)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 400));
    const scrollWidth390 = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth390 = await page.evaluate(() => window.innerWidth);
    console.log(`390px Viewport: scrollWidth=${scrollWidth390}, innerWidth=${innerWidth390}`);
    if (scrollWidth390 > innerWidth390) {
      console.warn(`WARNING: Horizontal scroll detected at 390px: ${scrollWidth390} > ${innerWidth390}`);
    } else {
      console.log(`✔ No horizontal overflow at 390px`);
    }

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
    if (spawnedServer) spawnedServer.kill('SIGTERM');
  }
  console.log('A11y checks completed.');
}

verifyA11y().catch(console.error);

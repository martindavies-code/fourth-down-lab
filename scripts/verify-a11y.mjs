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

    async function checkOverflow(width, height, label) {
      await page.setViewport({ width, height });
      await new Promise((r) => setTimeout(r, 400));
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      console.log(`${label} (${width}px): scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
      if (scrollWidth > innerWidth) {
        console.warn(`WARNING: Horizontal scroll detected at ${width}px: ${scrollWidth} > ${innerWidth}`);
        const culprits = await page.evaluate((w) => {
          const res = [];
          for (const el of document.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.right > w + 1 || r.width > w + 1) {
              res.push({
                tag: el.tagName,
                id: el.id,
                className: typeof el.className === 'string' ? el.className.substring(0, 60) : '',
                text: el.innerText ? el.innerText.substring(0, 30).replace(/\n/g, ' ') : '',
                width: Math.round(r.width),
                right: Math.round(r.right),
              });
            }
          }
          return res.slice(0, 8);
        }, width);
        console.log(`Culprits at ${width}px:`, culprits);
      } else {
        console.log(`✔ No horizontal overflow at ${width}px`);
      }
    }

    // 1. 320px (Ultra-narrow Mobile)
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await checkOverflow(320, 600, '320px Viewport');

    // 2. 390px (Mobile Standard)
    await checkOverflow(390, 844, '390px Viewport');

    // 3. 768px (Tablet)
    await checkOverflow(768, 1024, '768px Viewport');

    // 4. 1280px (Desktop)
    await checkOverflow(1280, 900, '1280px Viewport');

    // 5. 1920px (Widescreen)
    await checkOverflow(1920, 1080, '1920px Viewport');

    // Audit Polish Dashboard Stage 5: No clipped toolbars or filter buttons on mobile
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 400));
    const filterAudit = await page.evaluate(() => {
      const toolbars = document.querySelectorAll('[role="tablist"], [role="group"], .filter-bar, section[aria-label="Filters"]');
      const violations = [];
      toolbars.forEach(tb => {
        const isOverflowing = tb.scrollWidth > tb.clientWidth;
        const hasClippedChildren = Array.from(tb.querySelectorAll('button')).some(child => {
          const r = child.getBoundingClientRect();
          return r.right > window.innerWidth || r.left < 0;
        });
        if (isOverflowing || hasClippedChildren) {
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
    if (spawnedServer) spawnedServer.kill('SIGTERM');
  }
  console.log('A11y checks completed.');
}

verifyA11y().catch(console.error);

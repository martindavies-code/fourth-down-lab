import puppeteer from 'puppeteer-core';
import { startLocalServer } from './local-server.mjs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function debugOverflow() {
  const localServer = await startLocalServer();
  const targetUrl = localServer.url;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    const overflowing = await page.evaluate(() => {
      const docWidth = window.innerWidth;
      const elements = document.querySelectorAll('*');
      const culprits = [];
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1 || rect.width > docWidth + 1) {
          culprits.push({
            tag: el.tagName,
            className: el.className,
            id: el.id,
            width: Math.round(rect.width),
            right: Math.round(rect.right),
            text: el.innerText ? el.innerText.substring(0, 30) : '',
          });
        }
      }
      return culprits.slice(0, 10);
    });

    console.log('Overflowing elements at 390px:');
    for (const c of overflowing) {
      console.log(c);
    }
  } finally {
    await browser.close();
    await localServer.close();
  }
}

debugOverflow().catch((err) => {
  console.error('Error during debugOverflow:', err);
  process.exit(1);
});

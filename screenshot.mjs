import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.argv[2];
const label = process.argv[3] || '';
const mode = process.argv[4] || 'mobile';

if (!url) {
  console.error('Usage: node screenshot.mjs <url> [label] [mobile|desktop]');
  process.exit(1);
}

const screenshotsDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const existing = fs.readdirSync(screenshotsDir).filter(f => f.startsWith('screenshot-'));
const nums = existing.map(f => {
  const m = f.match(/^screenshot-(\d+)/);
  return m ? parseInt(m[1]) : 0;
}).filter(n => !isNaN(n));
const next = (nums.length ? Math.max(...nums) : 0) + 1;

const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath = path.join(screenshotsDir, filename);

const viewport = mode === 'desktop'
  ? { width: 1280, height: 800, deviceScaleFactor: 1 }
  : { width: 390, height: 844, deviceScaleFactor: 2 };

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport(viewport);
if (mode !== 'desktop') {
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
}
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 1500));
const fullPage = !process.argv.includes('--viewport');
const scrollY = process.argv.includes('--at')
  ? parseInt(process.argv[process.argv.indexOf('--at') + 1] || '0')
  : 0;
if (scrollY) await page.evaluate(y => window.scrollTo(0, y), scrollY);
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: outPath, fullPage });
await browser.close();

console.log(`Saved: ${outPath}`);

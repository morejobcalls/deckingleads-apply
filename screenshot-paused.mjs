import puppeteer from 'puppeteer';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:3000/';
const out = process.argv[3] || '/tmp/marquee-paused.png';
const mode = process.argv[4] || 'desktop';
const offsetPx = parseInt(process.argv[5] || '0');

const viewport = mode === 'desktop'
  ? { width: 1280, height: 800, deviceScaleFactor: 1 }
  : { width: 390, height: 844, deviceScaleFactor: 2 };

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport(viewport);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
// Pause marquee animation so we can see all logos
await page.evaluate((off) => {
  document.querySelectorAll('.marquee-track').forEach(t => {
    t.style.animation = 'none';
    t.style.transform = `translateX(${-off}px)`;
  });
}, offsetPx);
await new Promise(r => setTimeout(r, 300));
// find the marquee element and screenshot just it
const el = await page.$('.marquee');
if (el) {
  const box = await el.boundingBox();
  // Capture the section around it
  const section = await page.evaluateHandle(() => document.querySelector('.marquee').closest('section'));
  await section.asElement().screenshot({ path: out });
  console.log('Saved:', out);
} else {
  await page.screenshot({ path: out, fullPage: true });
  console.log('Saved (full):', out);
}
await browser.close();

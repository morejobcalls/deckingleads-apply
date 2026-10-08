// Usage: node test_apply_perf.mjs <url> [screenshot dir]   e.g. node test_apply_perf.mjs https://apply.morejobcalls.com/ /tmp
// QA-mode walk (?qa=1 is added) of both survey paths + font / pixel-after-paint / Clarity / form_embed checks. Page-aware for /yt/ /ig/ /fb/ /25/. Added 2026-10-07 with the load-speed pass.
// Functional check of the patched apply page on the local server (QA mode: nothing is sent to GHL/Meta).
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'http://localhost:3000/';
const OUT = process.argv[3] || '.';
const IS25 = /\/25\//.test(BASE), ISTWIN = /\/(yt|ig|fb)\//.test(BASE);
const EXPECT_PIXELS = ISTWIN ? ['839107878270720'] : ['839107878270720', '1832632181230934'];
async function openSurvey(page) { if (IS25) { await page.click('a.cta'); await sleep(800); } }
const browser = await puppeteer.launch({ headless: 'new' });
const results = [];
function ok(name, cond, extra='') { results.push({ name, pass: !!cond, extra }); }

async function fresh() {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { performance.setResourceTimingBufferSize(2000); } catch (e) {} });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [], failed = [], reqs = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => failed.push(r.url() + ' ' + (r.failure()?.errorText || '')));
  page.on('request', r => reqs.push(r.url()));
  return { page, errors, failed, reqs };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 1. Load + fonts + deferred tags ──
{
  const { page, errors, failed, reqs } = await fresh();
  await page.goto(BASE + '?qa=1', { waitUntil: 'load' });
  const early = await page.evaluate(() => ({
    fbScriptAtLoad: !!document.querySelector('script[src*="fbevents.js"]'),
    fbAfterLoadEvent: (() => { const nav = performance.getEntriesByType('navigation')[0]; const fb = performance.getEntriesByType('resource').find(r => /fbevents\.js/.test(r.name)); return !!nav && !!fb && fb.startTime >= nav.loadEventStart - 5; })(),
    clarityAtLoad: !!document.querySelector('script[src*="clarity.ms/tag"]'),
    ghlAtLoad: !!document.querySelector('script[src*="form_embed.js"]'),
  }));
  await sleep(4000);
  const late = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts].filter(f => !/Fallback/.test(f.family)).map(f => `${f.family} ${f.weight} ${f.status}`);
    return {
      archivo900: document.fonts.check("900 32px 'Archivo'"),
      inter700: document.fonts.check("700 16px 'Inter'"),
      faces,
      h1Font: getComputedStyle(document.querySelector('.hero .h1')).fontFamily,
      fbScript: !!document.querySelector('script[src*="fbevents.js"]'),
      fbDebug: (() => { const nav = performance.getEntriesByType('navigation')[0]; const fb = performance.getEntriesByType('resource').find(r => /fbevents\.js/.test(r.name)); const fp = performance.getEntriesByType('paint').find(e => e.name === 'first-paint'); return { load: nav && Math.round(nav.loadEventStart), fb: fb && Math.round(fb.startTime), fp: fp && Math.round(fp.startTime), nRes: performance.getEntriesByType('resource').length }; })(),
      fbAfterLoadAndPaint: (() => { const nav = performance.getEntriesByType('navigation')[0]; const fb = performance.getEntriesByType('resource').find(r => /fbevents\.js/.test(r.name)); const fp = performance.getEntriesByType('paint').find(e => e.name === 'first-paint'); return !!nav && !!fb && fb.startTime >= nav.loadEventStart - 5 && (!fp || fb.startTime >= fp.startTime - 100); })(),  // paint entry timestamps are presentation time; observer fires a few ms earlier
      fbReal: typeof window.fbq === 'function' && typeof window.fbq.callMethod === 'function',
      clarityScript: !!document.querySelector('script[src*="clarity.ms/tag"]'),
      clarityReal: typeof window.clarity === 'function' && !!window.clarity.v,
      ghlScript: !!document.querySelector('script[src*="form_embed.js"]'),
      journey: !!window.mjcJourney,
      guar: document.getElementById('guar2-t')?.textContent,
      h1: document.querySelector('.hero .h1')?.textContent.trim().slice(0, 60),
      imgs: [...document.images].map(i => i.currentSrc || i.src).filter(u => /yt-thumbs|wins\/|proof-faces/.test(u)).length,
    };
  });
  ok('fonts: Archivo 900 available', late.archivo900, late.faces.join(' | '));
  ok('fonts: Inter 700 available', late.inter700);
  ok('fonts: all faces loaded', late.faces.every(f => /loaded$/.test(f)), late.faces.join(' | '));
  ok('h1 uses Archivo', /Archivo/.test(late.h1Font), late.h1Font);
  ok('pixel: fbevents.js requested at/after load AND first paint', late.fbAfterLoadAndPaint && late.fbScript, JSON.stringify(late.fbDebug));
  ok('pixel: real fbq loaded (callMethod present)', late.fbReal);
  ok('clarity: injected after load+idle', !early.clarityAtLoad && late.clarityScript);
  ok('clarity: real tag loaded', late.clarityReal);
  ok('ghl form_embed NOT loaded on landing', !early.ghlAtLoad && !late.ghlScript);
  ok('journey.js running', late.journey);
  ok('hero copy intact', (IS25 ? /25 Estimates/ : /Book Out Your Calendar/).test(late.h1), late.h1);
  if (!ISTWIN && !IS25) ok('guarantee copy intact', /All Three/.test(late.guar || ''), late.guar);
  ok('no console errors', errors.length === 0, errors.join(' || ').slice(0, 500));
  const realFails = failed.filter(u => !/mjc-journey.*ERR_ABORTED/.test(u));
  ok('no failed requests (journey beacon abort on close ignored)', realFails.length === 0, realFails.join(' || ').slice(0, 500));
  ok('no requests to i.ytimg.com / fonts.googleapis / fonts.gstatic', !reqs.some(u => /i\.ytimg\.com|fonts\.googleapis|fonts\.gstatic/.test(u)), reqs.filter(u => /ytimg|googleapis|gstatic/.test(u)).join(','));
  // image integrity: every lazy image that got requested must have decoded with natural size
  for (let y = 0; y < 16000; y += 500) { await page.evaluate(y => window.scrollTo(0, y), y); await sleep(100); }
  await sleep(2500);
  const imgs = await page.evaluate(() => [...document.images].filter(i => /yt-thumbs|\/wins\/|proof-faces/.test(i.src)).map(i => ({ src: i.src.replace(location.origin, ''), ok: i.complete && i.naturalWidth > 0 })));
  ok(`all ${imgs.length} local images decoded`, imgs.length >= 27 && imgs.every(i => i.ok), imgs.filter(i => !i.ok).map(i => i.src).join(','));
  await page.screenshot({ path: OUT + '/after-mobile-full.png', fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(300);
  await page.screenshot({ path: OUT + '/after-mobile-hero.png' });
  await page.close();
}

// ── 2. Survey walk, NON-ICP → GHL widget calendar path must inject form_embed.js ──
async function walk(page, revenue) {
  await openSurvey(page);
  await page.click('.qs-step[data-step="1"] .qs-opt'); await sleep(350);
  await page.click('.qs-step[data-step="2"] .qs-opt'); await sleep(350);
  await page.type('#qs-zip', '75201'); await sleep(400);
  const step3Gone = await page.evaluate(() => !document.querySelector('.qs-step[data-step="3"]').classList.contains('active'));
  if (!step3Gone) { await page.click('.qs-step[data-step="3"] [data-next]'); await sleep(350); }
  await page.click(`.qs-opt[data-value="${revenue}"]`); await sleep(600);
}
{
  const { page, errors } = await fresh();
  await page.goto(BASE + '?qa=1', { waitUntil: 'load' });
  await walk(page, '0_100k');
  const s = await page.evaluate(() => ({ ghl: !!document.querySelector('script[src*="form_embed.js"]'), calSrc: document.getElementById('mc-cal').getAttribute('src') || '', step: document.querySelector('.qs-step.active')?.dataset.step }));
  ok('non-ICP: form_embed.js injected at revenue step', s.ghl);
  ok('non-ICP: GHL calendar iframe src warmed', /^https?:\/\//.test(s.calSrc), s.calSrc.slice(0, 80));
  ok('non-ICP: on contact step', s.step === '5', s.step);
  await page.type('#qs-first', 'Qa'); await page.type('#qs-last', 'Test'); await page.type('#qs-site', 'example.com'); await page.type('#qs-phone', '5015550123'); await page.type('#qs-email', 'qa@example.com');
  await page.click('[data-next-final]'); await sleep(2500);
  const s2 = await page.evaluate(() => ({ step: document.querySelector('.qs-step.active')?.dataset.step, calVisible: getComputedStyle(document.getElementById('mc-cal-wrap')).display !== 'none', mcb: getComputedStyle(document.getElementById('mcb')).display }));
  ok('non-ICP: calendar step shown with GHL widget', s2.step === '6' && s2.calVisible, JSON.stringify(s2));
  ok('non-ICP: no console errors during walk', errors.length === 0, errors.join(' || ').slice(0, 400));
  await page.screenshot({ path: OUT + '/after-nonicp-calendar.png' });
  await page.close();
}

// ── 3. Survey walk, ICP → native picker, form_embed must NOT load ──
{
  const { page, errors } = await fresh();
  await page.goto(BASE + '?qa=1', { waitUntil: 'load' });
  await walk(page, '1m_3m');
  await page.type('#qs-first', 'Qa'); await page.type('#qs-last', 'Test'); await page.type('#qs-site', 'example.com'); await page.type('#qs-phone', '5015550123'); await page.type('#qs-email', 'qa@example.com');
  await page.click('[data-next-final]'); await sleep(3500);
  const s = await page.evaluate(() => ({ ghl: !!document.querySelector('script[src*="form_embed.js"]'), step: document.querySelector('.qs-step.active')?.dataset.step, mcb: getComputedStyle(document.getElementById('mcb')).display, live: getComputedStyle(document.getElementById('mcb-live')).display, loading: document.getElementById('mcb-loading').textContent, err: getComputedStyle(document.getElementById('mcb-error')).display }));
  ok('ICP: form_embed.js NOT injected', !s.ghl);
  ok('ICP: calendar step with native picker', s.step === '6' && s.mcb !== 'none', JSON.stringify(s));
  ok('ICP: no console errors during walk', errors.length === 0, errors.join(' || ').slice(0, 400));
  await page.screenshot({ path: OUT + '/after-icp-calendar.png' });
  await page.close();
}

// ── 4. Pixel + Clarity with QA off (local host still suppresses PageView; verify queue replay path) ──
{
  const { page } = await fresh();
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(3500);
  const s = await page.evaluate(() => ({ fbReal: typeof window.fbq?.callMethod === 'function', inits: (window.fbq?.getState ? Object.keys(window.fbq.getState().pixels || {}) : null), pixelIds: (() => { try { return window.fbq.getState().pixels.map(p => p.id); } catch (e) { return String(e); } })() }));
  ok('pixel: expected pixel IDs initialised after deferred load', Array.isArray(s.pixelIds) && EXPECT_PIXELS.every(id => s.pixelIds.includes(id)) && s.pixelIds.length === EXPECT_PIXELS.length, JSON.stringify(s.pixelIds));
  await page.close();
}

await browser.close();
let fails = 0;
for (const r of results) { if (!r.pass) fails++; console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.extra ? '  [' + r.extra + ']' : '')); }
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);

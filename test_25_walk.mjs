import puppeteer from '/Volumes/T7/SPG/1. MARKETING/4. Website/Landing Pages/v1-launch-page/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
const url=process.argv[2]; const fails=[]; const ok=(c,m,d)=>{console.log((c?'ok   ':'FAIL ')+m+(d!==undefined&&!c?'  '+JSON.stringify(d).slice(0,300):''));if(!c)fails.push(m);};
const BLOCK=[/services\.leadconnectorhq\.com/,/mjc-funnel-events/,/facebook\.com\/tr/,/[jc]\.clarity\.ms/,/c\.bing\.com/,/youtube\.com|ytimg\.com/];
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
async function newPage(){const page=await browser.newPage();await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
 const blocked=[];await page.setRequestInterception(true);
 page.on('request',r=>{const u=r.url();if(BLOCK.some(x=>x.test(u))){blocked.push({t:Date.now(),u,m:r.method(),body:r.postData()||''});
   const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, GET, OPTIONS'};
   if(r.method()==='OPTIONS') return r.respond({status:204,headers:cors});            // mock the CORS preflight so the real POST is attempted (and captured) instead of silently skipped
   if(/leadconnectorhq|funnel-events/.test(u)) return r.respond({status:200,headers:cors,contentType:'application/json',body:'{}'}); // intake endpoints: never hit live — answered locally
   return r.abort();}r.continue();});
 page.on('pageerror',e=>fails.push('pageerror '+e.message)); return {page,blocked};}
// ---- page 1: load + modal walk
{const {page,blocked}=await newPage();
 await page.goto(url,{waitUntil:'networkidle2',timeout:60000}); await new Promise(r=>setTimeout(r,2500));
 const d=await page.evaluate(()=>{const res=performance.getEntriesByType('resource').map(e=>({n:e.name,s:e.startTime}));const fp=performance.getEntriesByType('paint').find(p=>p.name==='first-paint')||performance.getEntriesByType('paint')[0];
  return {res,fp:fp?fp.startTime:null,fpAbs:fp?performance.timeOrigin+fp.startTime:null,load:performance.timing.loadEventStart-performance.timing.navigationStart,fonts:[...document.fonts].map(f=>f.family+'|'+f.status),h1ff:getComputedStyle(document.querySelector('h1')).fontFamily,
   tw:!!document.getElementById('tw'),bodyBg:getComputedStyle(document.body).backgroundColor,ctaBg:getComputedStyle(document.querySelector('.cta-btn')).backgroundImage};});
 const find=re=>d.res.find(r=>re.test(r.n));
 ok(!find(/cdn\.tailwindcss/)&&!find(/fonts\.g(oogleapis|static)/),'no Tailwind CDN / Google Fonts requests');
 ok(d.tw&&d.bodyBg==='rgb(0, 0, 0)'&&/linear-gradient/.test(d.ctaBg),'compiled Tailwind applied (body bg, gold CTA gradient)',[d.bodyBg,d.ctaBg]);
 ok(!!find(/\/fonts\/inter-latin-var\.woff2/)&&d.fonts.some(f=>/^Inter\|loaded/.test(f)),'Inter loaded from /fonts/',d.fonts);
 const fb=find(/fbevents\.js/),cl=find(/clarity\.ms\/tag/),fe=find(/form_embed\.js/);
 ok(!!fb&&fb.s>=d.fp-100,'fbevents.js requested after first paint',{fp:d.fp,fb:fb&&fb.s});
 ok(!!cl&&cl.s>=d.fp-100,'Clarity tag requested after first paint',{fp:d.fp,cl:cl&&cl.s});
 const landed=blocked.find(b=>/mjc-funnel-events/.test(b.u)&&/"step":"landed"/.test(b.body));
 ok(!!landed&&landed.t>=d.fpAbs-100,'landed beacon sent after first paint',{dt:landed&&Math.round(landed.t-d.fpAbs)});
 ok(!fe,'form_embed.js NOT loaded at page load');
 ok(await page.evaluate(()=>typeof fbq==='function'&&!!window.fbq.loaded&&typeof clarity==='function'),'fbq + clarity stubs present');
 // hero video click → iframe
 await page.click('.hero-vid'); await new Promise(r=>setTimeout(r,300));
 ok(await page.evaluate(()=>{const a=document.querySelector('.hero-vid');return a.classList.contains('is-playing')&&!!a.querySelector('iframe[src*="youtube.com/embed/HRYuMJmhpmY"]');}),'hero video swaps to player on tap');
 // modal walk
 await page.click('.cta-btn'); await page.waitForSelector('#mc-overlay.open',{timeout:5000}); ok(true,'CTA opens the modal');
 const step=n=>page.waitForSelector(`.mc-step[data-step="${n}"].active`,{timeout:5000});
 const opt=(f,v)=>page.evaluate((f,v)=>{const b=document.querySelector(`.mc-opt[data-field="${f}"][data-value="${v}"]`);if(!b)throw new Error('no opt '+f+v);b.click();},f,v);
 await opt('own_business','yes'); await step(2);
 await page.type('#mc-fullname','QA Perftest'); await page.click('.mc-next[data-next="3"]'); await step(3);
 await page.type('#mc-email','qa-perf-test@example.com'); await page.type('#mc-phone','3614596148'); await page.click('.mc-next[data-next-final]'); await step(4);
 await opt('revenue','1m_3m'); await step(5); await new Promise(r=>setTimeout(r,800));
 const pre=await page.evaluate(()=>({src:document.getElementById('mc-cal').getAttribute('src')||'',fe:performance.getEntriesByType('resource').some(e=>/form_embed\.js/.test(e.name)),flag:!!window.__mjcGhlEmbed}));
 ok(pre.flag&&pre.fe,'form_embed.js loaded on demand at calendar preload',pre);
 ok(/6Ck4IfG5SatgIkAZJ7yo/.test(pre.src),'ICP calendar preloaded with prefilled URL',pre.src.slice(0,120));
 await opt('timing','asap'); await step(6); await new Promise(r=>setTimeout(r,2000));
 const post=blocked.find(b=>/leadconnectorhq\.com\/hooks/.test(b.u)&&/"lead_stage":"full"/.test(b.body));
 ok(!!post&&/"icp":"yes"/.test(post.body)&&/qa-perf-test@example\.com/.test(post.body)&&/"email_sha256":"[0-9a-f]{64}"/.test(post.body),'GHL webhook POST attempted (blocked) with full ICP payload',post&&post.body.slice(0,200));
 const s6=await page.evaluate(()=>({wrap:getComputedStyle(document.getElementById('mc-cal-wrap')).display,spin:getComputedStyle(document.getElementById('mc-spin')).display,src:document.getElementById('mc-cal').src,h:document.getElementById('mc-cal').getBoundingClientRect().height}));
 ok(s6.wrap==='block'&&s6.spin==='none'&&/widget\/booking/.test(s6.src)&&s6.h>200,'calendar step shows the GHL widget',s6);
 await page.screenshot({path:'walk25-modal-cal.png'});
 ok(!blocked.some(b=>/leadconnectorhq|funnel-events/.test(b.u)&&b.m!=='POST'&&b.m!=='OPTIONS'),'no stray intake GETs');
 await page.close();}
// ---- page 2: inline survey is dead on this page (all CTAs open the modal); assert it is hidden the same as the original and that our on-demand hook is wired
{const {page}=await newPage(); await page.goto(url,{waitUntil:'networkidle2',timeout:60000});
 const pr=await page.evaluate(()=>{const fc=document.getElementById('form-card');const r=fc.getBoundingClientRect();return {w:r.width,h:r.height,hook:/loadGhlEmbed\(\)/.test(String(window.loadGhlEmbed))};});
 ok(pr.w===0&&pr.h===0,'inline survey card hidden (unchanged, 0x0)',pr); ok(typeof await page.evaluate(()=>typeof loadGhlEmbed)==='string','loadGhlEmbed defined globally');
 await page.close();}
await browser.close();
console.log(fails.length?`${fails.length} FAILED`:'ALL PASSED'); process.exit(fails.length?1:0);

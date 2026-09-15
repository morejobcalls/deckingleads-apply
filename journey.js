/*!
 * journey.js — MoreJobCalls first-party prospect-journey tracker (Phase 1, 2026-09-14)
 * Loaded by every page on morejobcalls.com and apply.morejobcalls.com:
 *   <script src="https://apply.morejobcalls.com/journey.js" defer></script>
 *
 * - One visitor ID (mjc_vid) shared across both sites. The two sites are different origins, so
 *   everything that must survive a homepage → apply hop (visitor, session, touch summary) lives in
 *   cookies on .morejobcalls.com, not localStorage.
 * - Logs: page views, source touches (normalized channel), YouTube / <video> plays + 25/50/75/100%,
 *   CTA clicks, scroll 50/90%, survey steps, submits, bookings.
 * - Never sends email/phone. A lead's journey joins its GHL contact later through lead_ref
 *   (= the submit's event_id, already stored on the contact) or journey_vid in the lead payload.
 * - Public API: window.mjcJourney.track(type, data), .leadFields(), .vid, .sid
 * - Test traffic: ?jtest=1 (or ?test_event_code=…) marks events is_test; ?jtest=0 clears it.
 * Every call is wrapped; a tracking failure can never break the page.
 */
(function () {
  'use strict';
  if (window.mjcJourney) return;

  var COLLECTOR = 'https://mjc-journey.spencer-80c.workers.dev/';
  var SESSION_IDLE_MS = 30 * 60 * 1000;
  var host = location.hostname;
  var onOurDomain = /(^|\.)morejobcalls\.com$/.test(host);
  var params = new URLSearchParams(location.search);

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
  function uuid() {
    return safe(function () { return crypto.randomUUID(); }) ||
      'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? safe(function () { return decodeURIComponent(m[1]); }, null) : null;
  }
  function setCookie(name, value, maxAgeSec) {
    var parts = [name + '=' + encodeURIComponent(value), 'path=/', 'max-age=' + maxAgeSec, 'SameSite=Lax'];
    if (onOurDomain) parts.push('domain=.morejobcalls.com');
    if (location.protocol === 'https:') parts.push('Secure');
    safe(function () { document.cookie = parts.join('; '); });
  }
  var YEAR = 400 * 24 * 3600;

  // ── Visitor ─────────────────────────────────────────────────────────────────
  var vid = getCookie('mjc_vid') || safe(function () { return localStorage.getItem('mjc_vid'); }, null) || uuid();
  setCookie('mjc_vid', vid, YEAR);
  safe(function () { localStorage.setItem('mjc_vid', vid); });

  // ── Session (cookie "id.lastActiveMs", shared across both sites) ────────────
  var now = Date.now();
  var sessRaw = (getCookie('mjc_s') || '').split('.');
  var sessId = sessRaw[0], sessLast = parseInt(sessRaw[1], 10) || 0;
  var newSession = !sessId || (now - sessLast) > SESSION_IDLE_MS;
  if (newSession) sessId = uuid().replace(/-/g, '').slice(0, 20);
  function bumpSession() { setCookie('mjc_s', sessId + '.' + Date.now(), 2 * 3600); }
  bumpSession();

  // Test traffic: ?jtest=1, Meta ?test_event_code=, the apply page's ?qa=1 QA mode, and ?preview= QA links.
  var isTest = params.get('jtest') === '1' || params.has('test_event_code') || params.get('qa') === '1' || params.has('preview') ||
    getCookie('mjc_jtest') === '1';
  if (params.get('jtest') === '1') setCookie('mjc_jtest', '1', 6 * 3600);
  if (params.get('jtest') === '0') { setCookie('mjc_jtest', '', 0); isTest = false; }

  // ── Device ──────────────────────────────────────────────────────────────────
  var ua = navigator.userAgent || '';
  var device = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
  var inApp = /Instagram/.test(ua) ? 'instagram' : /FBAN|FBAV|FB_IAB/.test(ua) ? 'facebook' :
    /LinkedInApp/.test(ua) ? 'linkedin' : /TikTok|musical_ly|BytedanceWebview/.test(ua) ? 'tiktok' : '';

  // ── Source of this page load ────────────────────────────────────────────────
  var refHost = safe(function () { return document.referrer ? new URL(document.referrer).hostname : ''; }, '');
  var internalRef = !!refHost && (/(^|\.)morejobcalls\.com$/.test(refHost) || refHost === host);
  var p = function (k) { return (params.get(k) || '').trim(); };
  var utm = { source: p('utm_source').toLowerCase(), medium: p('utm_medium').toLowerCase(), campaign: p('utm_campaign'), content: p('utm_content'), term: p('utm_term') };
  var clickIdType = params.get('fbclid') ? 'fbclid' : params.get('gclid') ? 'gclid' : params.get('msclkid') ? 'msclkid' : params.get('ttclid') ? 'ttclid' : params.get('li_fat_id') ? 'li_fat_id' : '';
  var adIds = { campaign_id: p('campaign_id') || p('utm_id'), adset_id: p('adset_id'), ad_id: p('ad_id'), placement: p('placement') };
  var contactRef = p('c');  // our tracked links + booking confirmations carry ?c={{contact.id}}

  var SOURCE_ALIASES = { fb: 'facebook', ig: 'instagram', insta: 'instagram', yt: 'youtube', li: 'linkedin', tw: 'x', twitter: 'x', gmb: 'google-business' };
  function normSource(s) { s = (s || '').toLowerCase(); return SOURCE_ALIASES[s] || s; }
  var LLM_REF = /(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com)$/;
  var SEARCH_REF = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|baidu\.com)$/;
  var SOCIAL_REF = { 'facebook.com': 'facebook', 'instagram.com': 'instagram', 'linkedin.com': 'linkedin', 'lnkd.in': 'linkedin', 'tiktok.com': 'tiktok', 't.co': 'x', 'x.com': 'x', 'twitter.com': 'x', 'threads.net': 'threads', 'youtube.com': 'youtube', 'youtu.be': 'youtube', 'reddit.com': 'reddit', 'pinterest.com': 'pinterest' };
  function socialFromRef(h) {
    for (var d in SOCIAL_REF) if (h === d || h.slice(-(d.length + 1)) === '.' + d) return SOCIAL_REF[d];
    return '';
  }

  function classify() {
    var src = normSource(utm.source), med = utm.medium;
    var refSocial = socialFromRef(refHost);
    var paid = /paid|cpc|ppc|ads?$|display|cpm/.test(med) || !!adIds.ad_id || !!adIds.adset_id;
    var ig = /^instagram/i.test(adIds.placement) || src === 'instagram' || refSocial === 'instagram' || inApp === 'instagram';
    if (src === 'morejobcalls.com' || src === 'morejobcalls') return { channel: 'internal', source: src };
    if (/^(email|newsletter)$/.test(med) || /flodesk|mailchimp|ghl-email|klaviyo/.test(src)) return { channel: 'email', source: src || 'email' };
    if (/^(sms|text)$/.test(med)) return { channel: 'sms', source: src || 'sms' };
    if (med === 'imessage' || src === 'imessage' || src === 'linq') return { channel: 'imessage', source: src || 'imessage' };
    if (src === 'limeberry' || /cold-?email/.test(med)) return { channel: 'limeberry', source: src || 'limeberry' };
    if (/partner|affiliate/.test(med) || src === 'partner') return { channel: 'partner', source: src };
    if (/referral/.test(med)) return { channel: 'referral', source: src };
    if ((src === 'facebook' || src === 'instagram' || src === 'meta' || clickIdType === 'fbclid') && paid) return { channel: ig ? 'meta-ig' : 'meta-fb', source: ig ? 'instagram' : 'facebook' };
    if ((src === 'google' && paid) || clickIdType === 'gclid') return { channel: 'google-ads', source: 'google' };
    if (clickIdType === 'msclkid') return { channel: 'bing-ads', source: 'bing' };
    if (src === 'youtube' || refSocial === 'youtube') return { channel: 'youtube', source: 'youtube' };
    if (src && /organic|social/.test(med)) return { channel: 'organic-social', source: src };
    if (src === 'chatgpt.com' || src === 'chatgpt' || LLM_REF.test(refHost)) return { channel: 'llm', source: src || refHost };
    if (src) return { channel: paid ? 'paid-other' : 'tagged-other', source: src };
    if (clickIdType === 'fbclid') return { channel: 'organic-social', source: refSocial || (inApp === 'instagram' ? 'instagram' : 'facebook') };
    if (refSocial) return { channel: 'organic-social', source: refSocial };
    if (SEARCH_REF.test(refHost)) return { channel: 'search', source: refHost.replace(/^www\./, '').split('.')[0] };
    if (refHost && !internalRef) return { channel: 'referral', source: refHost.replace(/^www\./, '') };
    if (inApp) return { channel: 'organic-social', source: inApp };
    return { channel: 'direct', source: '' };
  }
  var cls = classify();
  // ?c= alone (booking confirmations, redirects) is NOT a new source; Phase 3 tracked links add utm_medium=sms/email/imessage.
  var hasExternalSignal = (!!utm.source && cls.channel !== 'internal') || !!clickIdType || (!!refHost && !internalRef);

  // ── Transport (batched; beacon on page hide) ────────────────────────────────
  var queue = [], flushTimer = null;
  function send(events, useBeacon) {
    var body = JSON.stringify({ events: events });
    if (useBeacon && navigator.sendBeacon && navigator.sendBeacon(COLLECTOR, new Blob([body], { type: 'text/plain' }))) return;
    safe(function () {
      fetch(COLLECTOR, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true, mode: 'cors' }).catch(function () {});
    });
  }
  function flush(useBeacon) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    while (queue.length) send(queue.splice(0, 20), useBeacon);
  }
  function track(type, data) {
    safe(function () {
      var e = {
        vid: vid, sid: sessId, type: type, client_ts: new Date().toISOString(), host: host, path: location.pathname,
        page_title: (document.title || '').slice(0, 160), device: device, in_app: inApp, is_test: isTest
      };
      if (data) for (var k in data) if (data[k] !== undefined && data[k] !== null && data[k] !== '') e[k] = data[k];
      queue.push(e);
      bumpSession();
      if (type === 'submit' || type === 'booked' || type === 'cta_click' || type === 'video_play' || type === 'content_click') flush(false);
      else if (!flushTimer) flushTimer = setTimeout(function () { flush(false); }, 1500);
    });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
  window.addEventListener('pagehide', function () { flush(true); });

  // ── Touch summary in cookies: first touch, last non-direct touch, count, dedupe key ──
  function compact(t) { return [t.channel, t.source, (t.content || t.campaign || '').slice(0, 60), t.ts.slice(0, 10), t.ad_id || ''].join('|'); }
  var touch = {
    ts: new Date().toISOString(), channel: cls.channel, source: cls.source, medium: utm.medium, campaign: utm.campaign,
    content: utm.content, term: utm.term, campaign_id: adIds.campaign_id, adset_id: adIds.adset_id, ad_id: adIds.ad_id,
    placement: adIds.placement, click_id_type: clickIdType, click_id: clickIdType ? p(clickIdType).slice(0, 255) : ''
  };
  var key = [touch.channel, touch.source, touch.campaign, touch.content, touch.ad_id, touch.click_id.slice(0, 40)].join('|').slice(0, 300);
  var count = parseInt(getCookie('mjc_tc') || '0', 10) || 0;
  var isNewTouch = cls.channel !== 'internal' && (hasExternalSignal ? (getCookie('mjc_lk') !== key || newSession) : newSession);
  if (isNewTouch) {
    count += 1;
    setCookie('mjc_tc', String(count), YEAR);
    setCookie('mjc_lk', key, YEAR);
    if (!getCookie('mjc_ft')) setCookie('mjc_ft', compact(touch), YEAR);
    if (touch.channel !== 'direct' || !getCookie('mjc_lt')) setCookie('mjc_lt', compact(touch), YEAR);
    track('touch', {
      channel: touch.channel, source: touch.source, medium: touch.medium, campaign: touch.campaign, content: touch.content,
      term: touch.term, campaign_id: touch.campaign_id, adset_id: touch.adset_id, ad_id: touch.ad_id, placement: touch.placement,
      click_id_type: touch.click_id_type, click_id: touch.click_id, referrer_host: refHost,
      value: contactRef ? 'contact:' + contactRef : '', meta: { touch_n: count, new_session: newSession }
    });
  }
  // Page views inherit the current touch's channel (from the shared cookie) unless this load IS a new touch.
  track('page_view', { referrer_host: refHost, channel: isNewTouch ? cls.channel : (((getCookie('mjc_lt') || '').split('|')[0]) || (internalRef ? 'internal' : cls.channel)) });

  // ── Scroll depth ────────────────────────────────────────────────────────────
  var scrollMarks = {};
  window.addEventListener('scroll', function () {
    safe(function () {
      var doc = document.documentElement;
      var pct = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1) * 100;
      [50, 90].forEach(function (m) { if (pct >= m && !scrollMarks[m]) { scrollMarks[m] = 1; track('scroll', { value: String(m) }); } });
    });
  }, { passive: true });

  // ── Clicks: CTAs + outbound video links ─────────────────────────────────────
  function ytId(url) {
    var m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function labelOf(el) {
    return (el.getAttribute('aria-label') || el.getAttribute('data-cta') || el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }
  document.addEventListener('click', function (ev) {
    safe(function () {
      var el = ev.target && ev.target.closest && ev.target.closest('a,button,[data-open-apply],[data-cta]');
      if (!el) return;
      var href = el.getAttribute('href') || '';
      var id = ytId(href);
      if (id) { track('video_play', { label: labelOf(el) || ('youtube:' + id), value: 'youtube:' + id, meta: { how: 'link' } }); return; }
      var onclick = el.getAttribute('onclick') || '';
      var isCta = el.matches('[data-open-apply],[data-cta],a[href="#apply"],.mc-next,.mcb-btn,.sv-next') ||
        /openSurveyModal|svBook|__openApply/.test(onclick) ||
        /apply\.morejobcalls\.com|^\/book\/?|^#apply/.test(href) || /^(tel|sms):/.test(href);
      if (isCta) track('cta_click', { label: labelOf(el), value: (href || onclick).slice(0, 160) });
    });
  }, true);

  // ── Embedded YouTube players (progress via the iframe postMessage API; needs enablejsapi=1) ──
  var ytPlayers = {}, ytSeq = 0;
  function watchYouTube(frame) {
    safe(function () {
      var src = frame.getAttribute('src') || '';
      var id = ytId(src);
      if (!id || frame.__mjcYT === src) return;
      frame.__mjcYT = src;
      var pid = 'mjc' + (++ytSeq);
      var label = frame.getAttribute('title') || frame.getAttribute('aria-label') || ('youtube:' + id);
      ytPlayers[pid] = { id: id, label: label, played: false, marks: {} };
      var hello = function () {
        safe(function () {
          frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: pid, channel: 'widget' }), '*');
          frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: pid, channel: 'widget' }), '*');
        });
      };
      frame.addEventListener('load', hello);
      setTimeout(hello, 1500);
    });
  }
  window.addEventListener('message', function (msg) {
    safe(function () {
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(new URL(msg.origin).hostname)) return;
      var d = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
      var pl = d && d.id && ytPlayers[d.id];
      if (!pl) return;
      var info = d.info && typeof d.info === 'object' ? d.info : {};
      var state = d.event === 'onStateChange' ? d.info : info.playerState;
      if (state === 1 && !pl.played) { pl.played = true; track('video_play', { label: pl.label, value: 'youtube:' + pl.id, meta: { how: 'embed' } }); }
      if (typeof info.currentTime === 'number' && typeof info.duration === 'number' && info.duration > 0) {
        var pct = info.currentTime / info.duration * 100;
        [25, 50, 75, 95].forEach(function (m) {
          if (pct >= m && !pl.marks[m]) { pl.marks[m] = 1; track('video_progress', { label: pl.label, value: m === 95 ? '100' : String(m), meta: { video: 'youtube:' + pl.id } }); }
        });
      }
    });
  });

  // ── Native <video> elements ─────────────────────────────────────────────────
  function watchVideo(v) {
    safe(function () {
      if (v.__mjcV) return;
      v.__mjcV = true;
      var label = v.getAttribute('aria-label') || v.getAttribute('title') || (v.getAttribute('src') || '').split('/').pop();
      var marks = {}, played = false;
      v.addEventListener('play', function () { if (!played) { played = true; track('video_play', { label: label, value: 'file:' + label, meta: { how: 'native' } }); } });
      v.addEventListener('timeupdate', function () {
        if (!v.duration) return;
        var pct = v.currentTime / v.duration * 100;
        [25, 50, 75, 95].forEach(function (m) { if (pct >= m && !marks[m]) { marks[m] = 1; track('video_progress', { label: label, value: m === 95 ? '100' : String(m), meta: { video: 'file:' + label } }); } });
      });
    });
  }
  function scan(root) {
    safe(function () {
      root.querySelectorAll('iframe').forEach(watchYouTube);
      root.querySelectorAll('video').forEach(watchVideo);
    });
  }
  function startObservers() {
    scan(document);
    safe(function () {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.type === 'attributes') { if (m.target.tagName === 'IFRAME') watchYouTube(m.target); return; }
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.tagName === 'IFRAME') watchYouTube(n); else if (n.tagName === 'VIDEO') watchVideo(n); else scan(n);
          });
        });
      }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObservers); else startObservers();

  // ── Clarity: tag recordings with the visitor id so a journey links to its replays ──
  safe(function () { if (typeof window.clarity === 'function') window.clarity('set', 'mjc_vid', vid); });

  // ── Public API ──────────────────────────────────────────────────────────────
  function readable(c) { return (c || '').split('|').slice(0, 4).join(' | '); }
  window.mjcJourney = {
    vid: vid,
    sid: sessId,
    track: track,
    // Extra keys for lead-form payloads, mapped onto the GHL contact in the "1. New Lead" workflows (Phase 2).
    leadFields: function () {
      var ft = getCookie('mjc_ft') || '';
      var ftDate = ft.split('|')[3] || '';
      var days = /^\d{4}-\d{2}-\d{2}$/.test(ftDate) ? Math.max(0, Math.floor((Date.now() - Date.parse(ftDate + 'T00:00:00Z')) / 86400000)) : '';
      return {
        journey_vid: vid,
        journey_first_touch: readable(ft),
        journey_last_touch: readable(getCookie('mjc_lt')),
        journey_touch_count: parseInt(getCookie('mjc_tc') || '0', 10) || 0,
        journey_days_to_lead: days,
        journey_timeline: 'https://mjc-journey.spencer-80c.workers.dev/t/' + vid
      };
    }
  };
})();

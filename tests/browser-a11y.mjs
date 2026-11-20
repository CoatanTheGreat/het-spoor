#!/usr/bin/env node
'use strict';
/**
 * Het Spoor — Geautomatiseerde browser- & a11y-teststraat (v0.18.0, Fase H)
 * 100% zero-dependency (pure Node.js >= 22 + lokaal geïnstalleerde Chromium/Chrome via CDP).
 *
 * Controleert:
 *  1. PWA (manifest.webmanifest, 0 KB SVG-iconen, Service Worker registratie/cache/versie, update-banner)
 *     + foutloze werking via zowel HTTP als file://
 *  2. Toetsenbordnavigatie & focusbeheer (skiplink, radiogroup-pijltjes, landmarks, tabs, Enter/Spatie)
 *  3. ARIA & focus-traps (#modal Tab/Shift+Tab/Escape + focusherstel, #peek boven #modal, status/progressbar)
 *  4. WCAG AA kleurcontrast in zowel licht als donker thema (echte berekende kleuren met alpha-compositing)
 *  5. Responsieve viewports (1280x820, 768x1024 iPad staand, 640x420 200% zoom, 390x844 smal, xlarge + plain font)
 *  6. Kern-gameplayflow end-to-end (koude opening, bezoek, onderzoek, verhoor, zaakbord-notities/draadjes,
 *     Spoorboek, Verdachtenoverzicht, Spoorkaart, Save.MIGRATIONS schema 8->9 via Systeem, Zaakverslag)
 *
 * Gebruik: node tests/browser-a11y.mjs
 * Optioneel: CHROME_PATH=/pad/naar/chromium node tests/browser-a11y.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png'
};

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome']) {
    try {
      const p = execFileSync('which', [bin], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (p) return p;
    } catch (_) {}
  }
  throw new Error('Geen Chromium/Chrome gevonden. Stel CHROME_PATH in.');
}

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      let rel = decodeURIComponent(reqPath === '/' ? '/index.html' : reqPath);
      rel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
      const full = path.join(rootDir, rel);
      if (!full.startsWith(rootDir) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(full).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function launchChromium(chromeBin, userDataDir) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank'
    ];
    const proc = spawn(chromeBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Chromium startte niet op tijd:\n' + stderr));
    }, 15000);

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, wsUrl: m[1] });
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium sloot onverwacht af (code ${code}):\n${stderr}`));
    });
  });
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString('utf8'));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
      } else if (msg.method) {
        const list = this.listeners.get(msg.method) || [];
        for (const fn of list) fn(msg.params, msg.sessionId);
      }
    });
  }
  send(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
}

async function openTab(cdp, url) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p = {}) => cdp.send(m, p, sessionId);

  const errors = { page: [], console: [], network: [] };
  cdp.on('Runtime.exceptionThrown', (p, sid) => {
    if (sid !== sessionId) return;
    const d = p.exceptionDetails;
    errors.page.push((d.exception && d.exception.description) || d.text || 'Exception');
  });
  cdp.on('Runtime.consoleAPICalled', (p, sid) => {
    if (sid !== sessionId) return;
    if (p.type === 'error') {
      errors.console.push((p.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
    }
  });
  cdp.on('Network.responseReceived', (p, sid) => {
    if (sid !== sessionId) return;
    if (p.response && p.response.status >= 400) {
      errors.network.push(`HTTP ${p.response.status} ${p.response.url}`);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 820, deviceScaleFactor: 1, mobile: false
  });

  const loaded = new Promise((resolve) => {
    const handler = (_, sid) => {
      if (sid === sessionId) resolve();
    };
    cdp.on('Page.loadEventFired', handler);
  });

  await send('Page.navigate', { url });
  await loaded;

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (r.exceptionDetails) {
      const msg = (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text;
      throw new Error('Eval error: ' + msg);
    }
    return r.result ? r.result.value : undefined;
  };

  const waitFor = async (predicateExpr, timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const val = await evalJs(predicateExpr);
      if (val) return val;
      await new Promise((r) => setTimeout(r, 60));
    }
    throw new Error('Timeout waiting for: ' + predicateExpr);
  };

  const pressKey = async (key, { shift = false } = {}) => {
    const map = {
      Tab: { code: 'Tab', keyCode: 9 },
      Escape: { code: 'Escape', keyCode: 27 },
      Enter: { code: 'Enter', keyCode: 13 },
      ' ': { code: 'Space', keyCode: 32 },
      ArrowRight: { code: 'ArrowRight', keyCode: 39 },
      ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
      ArrowDown: { code: 'ArrowDown', keyCode: 40 },
      ArrowUp: { code: 'ArrowUp', keyCode: 38 }
    };
    const info = map[key] || { code: key, keyCode: key.charCodeAt(0) };
    const modifiers = shift ? 8 : 0;
    await send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key, code: info.code,
      windowsVirtualKeyCode: info.keyCode, nativeVirtualKeyCode: info.keyCode, modifiers
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp', key, code: info.code,
      windowsVirtualKeyCode: info.keyCode, nativeVirtualKeyCode: info.keyCode, modifiers
    });
    await new Promise((r) => setTimeout(r, 40));
  };

  const setViewport = async (width, height, mobile = false) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile
    });
    await new Promise((r) => setTimeout(r, 80));
  };

  const close = () => cdp.send('Target.closeTarget', { targetId });

  return { targetId, sessionId, send, evalJs, waitFor, pressKey, setViewport, errors, close };
}

// In-page WCAG 2.1 contrast calculator (alpha-composites backgrounds up the DOM tree)
const CONTRAST_HELPER = `(() => {
  function parseColor(str) {
    if (!str || str === 'transparent') return [0, 0, 0, 0];
    const m = str.match(/rgba?\\((\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?)(?:,\\s*(\\d+(?:\\.\\d+)?))?\\)/);
    if (!m) return [0, 0, 0, 0];
    return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  }
  function blend(fg, bg) {
    const a = fg[3];
    if (a >= 0.999) return [fg[0], fg[1], fg[2], 1];
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
      1
    ];
  }
  function effectiveBg(el) {
    const chain = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const bg = parseColor(getComputedStyle(cur).backgroundColor);
      if (bg[3] > 0) chain.unshift(bg);
      cur = cur.parentElement;
    }
    let acc = [255, 255, 255, 1];
    const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    if (rootBg[3] > 0) acc = blend(rootBg, acc);
    for (const c of chain) acc = blend(c, acc);
    return acc;
  }
  function lum([r, g, b]) {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function ratio(c1, c2) {
    const l1 = lum(c1), l2 = lum(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  window.__checkContrast = function(selectors) {
    const fails = [];
    let checked = 0;
    for (const sel of selectors) {
      const els = Array.from(document.querySelectorAll(sel)).filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.height > 0 && (el.textContent || '').trim().length > 0;
      });
      if (!els.length) continue;
      const el = els[0];
      const cs = getComputedStyle(el);
      const bg = effectiveBg(el);
      const fg = blend(parseColor(cs.color), bg);
      const cr = ratio(fg, bg);
      const px = parseFloat(cs.fontSize) || 16;
      const wt = parseInt(cs.fontWeight, 10) || 400;
      const large = px >= 24 || (px >= 18.66 && wt >= 700);
      const min = large ? 3.0 : 4.5;
      checked++;
      if (cr < min) {
        fails.push({ sel, cr: +cr.toFixed(2), min, fg: fg.slice(0, 3).map(Math.round), bg: bg.slice(0, 3).map(Math.round) });
      }
    }
    return { checked, fails };
  };
})()`;

async function run() {
  const results = [];
  const check = (name, ok, info = '') => {
    results.push({ name, ok: !!ok, info });
    const tag = ok ? '  OK  ' : ' FAIL ';
    console.log(`[${tag}] ${name}${info ? ' — ' + info : ''}`);
  };

  const chromeBin = findChrome();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'het-spoor-chrome-'));
  const { server, baseUrl } = await startStaticServer(ROOT);
  let proc = null;
  let ws = null;

  try {
    const launched = await launchChromium(chromeBin, userDataDir);
    proc = launched.proc;
    ws = new WebSocket(launched.wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const cdp = new CdpSession(ws);

    /* =====================================================================
       1. file:// compatibiliteit (offline lokaal bestand zonder HTTP-server)
       ===================================================================== */
    const fileUrl = pathToFileURL(path.join(ROOT, 'index.html')).href;
    const fileTab = await openTab(cdp, fileUrl);
    await fileTab.waitFor(`Boolean(document.querySelector('#app .st-title'))`);
    const fileInfo = await fileTab.evalJs(`({
      title: document.querySelector('#app .st-title').textContent,
      swStatus: UI.swStatus,
      version: APP.version,
      schema: APP.schema
    })`);
    // Check file:// opens cleanly without JS exceptions
    check(
      'file:// modus: opent zonder JS- of console-fouten en slaat Service Worker veilig over',
      fileInfo.title === 'Het Spoor' && fileInfo.swStatus === 'file' &&
      fileTab.errors.page.length === 0 && fileTab.errors.console.length === 0,
      `swStatus=${fileInfo.swStatus}, versie=${fileInfo.version}, pageErrors=${fileTab.errors.page.length}, consoleErrors=${fileTab.errors.console.length}`
    );
    await fileTab.close();

    /* =====================================================================
       2. HTTP-sessie: PWA (manifest, iconen, Service Worker, offline, update-banner)
       ===================================================================== */
    const tab = await openTab(cdp, `${baseUrl}/index.html`);
    await tab.waitFor(`Boolean(document.querySelector('#app .st-title'))`);
    await tab.evalJs(CONTRAST_HELPER);

    // Manifest & SVG icons
    const pwaAssets = await tab.evalJs(`(async () => {
      const mRes = await fetch('./manifest.webmanifest');
      const m = await mRes.json();
      const ic1 = await (await fetch('./icon.svg')).text();
      const ic2 = await (await fetch('./icon-maskable.svg')).text();
      const link = document.querySelector('link[rel="manifest"]');
      const fav = document.querySelector('link[rel="icon"]');
      return {
        mStatus: mRes.status,
        hasLink: Boolean(link && fav),
        name: m.name,
        display: m.display,
        startUrl: m.start_url,
        purposes: (m.icons || []).map((i) => i.purpose),
        ic1Ok: ic1.includes('<svg') && ic1.includes('viewBox="0 0 512 512"'),
        ic2Ok: ic2.includes('<svg') && ic2.includes('viewBox="0 0 512 512"')
      };
    })()`);
    check(
      'PWA manifest & 0 KB SVG-iconen (any + maskable) geldig en bereikbaar',
      pwaAssets.mStatus === 200 && pwaAssets.hasLink && pwaAssets.name === 'Het Spoor' &&
      pwaAssets.display === 'standalone' && pwaAssets.purposes.includes('any') &&
      pwaAssets.purposes.includes('maskable') && pwaAssets.ic1Ok && pwaAssets.ic2Ok,
      `display=${pwaAssets.display}, purposes=${pwaAssets.purposes.join('+')}`
    );

    // Service Worker registration, activation, precache & GET_VERSION messaging
    const swInfo = await tab.evalJs(`(async () => {
      const reg = await navigator.serviceWorker.ready;
      const active = reg.active;
      const ver = await new Promise((resolve) => {
        const mc = new MessageChannel();
        mc.port1.onmessage = (e) => resolve(e.data);
        active.postMessage({ type: 'GET_VERSION' }, [mc.port2]);
        setTimeout(() => resolve(null), 3000);
      });
      const cacheNames = await caches.keys();
      const cache = await caches.open('het-spoor-' + APP.version);
      const cachedKeys = (await cache.keys()).map((r) => new URL(r.url).pathname);
      return {
        state: active && active.state,
        ver,
        cacheNames,
        cachedCount: cachedKeys.length,
        hasCore: ['/index.html', '/style.css', '/content.js', '/lib.js', '/engine.js', '/views.js', '/ui.js', '/manifest.webmanifest', '/icon.svg', '/icon-maskable.svg']
          .every((p) => cachedKeys.includes(p))
      };
    })()`);
    check(
      'Service Worker actief, precacht alle kernbestanden met cache-versioning en reageert op GET_VERSION',
      swInfo.state === 'activated' && swInfo.ver && swInfo.ver.version === 'v0.18.0' &&
      swInfo.hasCore && swInfo.cacheNames.includes('het-spoor-v0.18.0'),
      `cache=${swInfo.ver && swInfo.ver.cache}, bestanden=${swInfo.cachedCount}`
    );

    // Verify real offline reload served entirely from Service Worker cache
    await tab.send('Network.emulateNetworkConditions', {
      offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0
    });
    const offlineReloaded = new Promise((resolve) => {
      const handler = (_, sid) => { if (sid === tab.sessionId) resolve(); };
      cdp.on('Page.loadEventFired', handler);
    });
    await tab.send('Page.reload', { ignoreCache: false });
    await offlineReloaded;
    await tab.waitFor(`Boolean(document.querySelector('#app .st-title'))`);
    const offlineState = await tab.evalJs(`({
      title: document.querySelector('#app .st-title').textContent,
      controlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
      swStatus: UI.swStatus
    })`);
    await tab.send('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
    });
    await tab.evalJs(CONTRAST_HELPER);
    check(
      'Offline herladen via Service Worker: app laadt volledig offline vanuit cache',
      offlineState.title === 'Het Spoor' && offlineState.controlled,
      `controlled=${offlineState.controlled}, swStatus=${offlineState.swStatus}`
    );

    // Update banner accessibility + contrast (light & dark) + Escape dismiss
    await tab.evalJs(`UI.showUpdateBanner({ postMessage() {} })`);
    await tab.evalJs(`UI.setTheme('light', true)`);
    await new Promise((r) => setTimeout(r, 120));
    const swLight = await tab.evalJs(`({
      visible: Boolean(document.querySelector('#swUpdate') && !document.querySelector('#swUpdate').hidden),
      role: document.querySelector('#swUpdate')?.getAttribute('role'),
      live: document.querySelector('#swUpdate')?.getAttribute('aria-live'),
      fails: window.__checkContrast(['#swUpdate b', '#swUpdate span', '#swUpdate .sw-go', '#swUpdate .sw-btn:not(.sw-go)']).fails
    })`);
    await tab.evalJs(`UI.setTheme('dark', true)`);
    await new Promise((r) => setTimeout(r, 120));
    const swDark = await tab.evalJs(`window.__checkContrast(['#swUpdate b', '#swUpdate span', '#swUpdate .sw-go', '#swUpdate .sw-btn:not(.sw-go)'])`);
    await tab.evalJs(`UI.setTheme('light', true)`);
    await tab.pressKey('Escape');
    const swDismissed = await tab.evalJs(`document.querySelector('#swUpdate').hidden === true`);
    check(
      'PWA update-banner (#swUpdate): toegankelijk (role=status, WCAG AA licht & donker) en sluit via Escape',
      swLight.visible && swLight.role === 'status' && swLight.live === 'polite' &&
      swLight.fails.length === 0 && swDark.fails.length === 0 && swDismissed,
      swLight.fails.length || swDark.fails.length
        ? `light=${JSON.stringify(swLight.fails)} dark=${JSON.stringify(swDark.fails)}`
        : 'licht + donker contrast & Escape OK'
    );

    /* =====================================================================
       3. Toetsenbordnavigatie op startscherm & contrast (licht + donker)
       ===================================================================== */
    const startA11y = await tab.evalJs(`(() => {
      const skip = document.querySelector('a.skip-link[href="#main"]');
      const rg = document.querySelector('#app [role="radiogroup"]');
      const radios = Array.from(document.querySelectorAll('#app [role="radio"]'));
      return {
        hasSkip: Boolean(skip),
        hasRg: Boolean(rg),
        radioCount: radios.length,
        checkedBefore: radios.find((r) => r.getAttribute('aria-checked') === 'true')?.dataset.v
      };
    })()`);
    await tab.evalJs(`document.querySelector('#app [role="radio"][aria-checked="true"]').focus()`);
    await tab.pressKey('ArrowRight');
    const afterArrow = await tab.evalJs(`({
      focused: document.activeElement?.dataset?.v,
      checked: document.querySelector('#app [role="radio"][aria-checked="true"]')?.dataset.v
    })`);
    await tab.pressKey('ArrowLeft');
    const afterLeft = await tab.evalJs(`document.querySelector('#app [role="radio"][aria-checked="true"]')?.dataset.v`);
    check(
      'Startscherm toetsenbord & ARIA: skiplink + radiogroup pijltjestoetsen behouden focus',
      startA11y.hasSkip && startA11y.hasRg && startA11y.radioCount === 3 &&
      afterArrow.checked === 'moeilijk' && afterArrow.focused === 'moeilijk' && afterLeft === 'normaal',
      `${startA11y.checkedBefore} → ${afterArrow.checked} → ${afterLeft}`
    );

    const setTheme = async (mode) => {
      await tab.evalJs(`UI.setTheme(${JSON.stringify(mode)}, true)`);
      await new Promise((r) => setTimeout(r, 220));
    };

    // Contrast check on start screen (light & dark)
    const startSelectors = ['.st-title', '.st-lead', '.st-lv b', '.st-lv span', '.st-lv small', '.st-note', '.st-go', '.st-ver'];
    await setTheme('light');
    const stLight = await tab.evalJs(`window.__checkContrast(${JSON.stringify(startSelectors)})`);
    await setTheme('dark');
    const stDark = await tab.evalJs(`window.__checkContrast(${JSON.stringify(startSelectors)})`);
    await setTheme('light');
    check(
      'Startscherm WCAG AA kleurcontrast (licht & donker)',
      stLight.checked >= 6 && stLight.fails.length === 0 && stDark.checked >= 6 && stDark.fails.length === 0,
      stLight.fails.length || stDark.fails.length
        ? `light=${JSON.stringify(stLight.fails)} dark=${JSON.stringify(stDark.fails)}`
        : `${stLight.checked} licht + ${stDark.checked} donker OK`
    );

    /* =====================================================================
       4. Kern-gameplayflow: vaste zaak, koude opening, bezoek, onderzoek, verhoor
       ===================================================================== */
    // Start fixed deterministic case via UI.newGame + show cold opening via UI flow
    await tab.evalJs(`(() => {
      UI.intro = Coach.done();
      UI.savePrefs();
      UI.s = Game.create('e2e-h1', 'normaal');
      UI.screen = 'intro';
      UI.renderScreen();
    })()`);
    await tab.waitFor(`Boolean(document.querySelector('#app .co-title'))`);
    await tab.evalJs(`document.querySelector('[data-ui="st-reveal"]').click()`);
    const introGoText = await tab.evalJs(`document.querySelector('[data-ui="st-go"]')?.textContent || ''`);
    await tab.evalJs(`document.querySelector('[data-ui="st-go"]').click()`);
    await tab.waitFor(`Boolean(document.querySelector('#app svg.tab'))`);

    // Check semantic landmarks & progressbar in visit view
    const visitA11y = await tab.evalJs(`({
      header: Boolean(document.querySelector('header.sp-head')),
      nav: Boolean(document.querySelector('nav.sp-tabs')),
      main: Boolean(document.querySelector('main#main')),
      prog: Boolean(document.querySelector('[role="progressbar"][aria-valuenow]')),
      toastStatus: document.querySelector('#toast')?.getAttribute('role') === 'status',
      ahaStatus: document.querySelector('#aha')?.getAttribute('role') === 'status',
      hotspots: document.querySelectorAll('#app svg.tab [data-hs]').length
    })`);
    check(
      'Koude opening → Logiesbezoek: landmarks (<header>, <nav>, <main>), progressbar en SVG-tableau actief',
      introGoText.includes('08:00') && visitA11y.header && visitA11y.nav && visitA11y.main &&
      visitA11y.prog && visitA11y.toastStatus && visitA11y.ahaStatus && visitA11y.hotspots >= 3,
      `hotspots=${visitA11y.hotspots}`
    );

    // Examine an object in the logies
    const examRes = await tab.evalJs(`(() => {
      const min0 = UI.s.clock.min;
      const objHs = document.querySelector('#app svg.tab .hs.obj[data-hs]');
      if (!objHs) return { ok: false };
      objHs.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const btn = document.querySelector('[data-ui="examine"]');
      if (!btn) return { ok: false };
      btn.click();
      return { ok: UI.s.clock.min > min0, min0, min1: UI.s.clock.min };
    })()`);
    check(
      'Gameplay: voorwerp onderzoeken in Tableau kost tijd en werkt klok bij',
      examRes.ok,
      `${examRes.min0} → ${examRes.min1} min`
    );

    // Force visit with a known cast member, start interrogation, check progressbar & contrast, ask alibi, end talk
    await tab.evalJs(`(() => {
      const npc = UI.s.cast[0];
      const locId = Schedule.at(UI.s, npc.id, UI.s.clock.day, UI.s.clock.part);
      Act.leave(UI.s);
      Act.force(UI.s, locId);
      Act.talkStart(UI.s, npc.id);
      UI.tab = 'visit';
      UI.render(true);
    })()`);
    await tab.waitFor(`Boolean(document.querySelector('#app .iv-frame'))`);

    const ivCheck = await tab.evalJs(`(() => {
      const qBtn = document.querySelector('#app [data-ui="topic"][data-v="alibi"]') || document.querySelector('#app [data-ui="topic"]');
      if (qBtn) qBtn.click();
      const progs = document.querySelectorAll('#app [role="progressbar"][aria-valuenow]').length;
      const lines = document.querySelectorAll('#app .iv-line').length;
      return { progs, lines };
    })()`);

    const ivSelectors = ['.iv-name', '.iv-role', '.iv-line', '.iv-qcard b', '.iv-qcard small', '.iv-ap'];
    await setTheme('light');
    const ivLight = await tab.evalJs(`window.__checkContrast(${JSON.stringify(ivSelectors)})`);
    await setTheme('dark');
    const ivDark = await tab.evalJs(`window.__checkContrast(${JSON.stringify(ivSelectors)})`);
    await setTheme('light');
    check(
      'Verhoor: dialoog, relatie-progressbars en WCAG AA contrast (licht & donker)',
      ivCheck.progs >= 2 && ivCheck.lines >= 1 && ivLight.fails.length === 0 && ivDark.fails.length === 0,
      ivLight.fails.length || ivDark.fails.length
        ? `light=${JSON.stringify(ivLight.fails)} dark=${JSON.stringify(ivDark.fails)}`
        : `progressbars=${ivCheck.progs}, regels=${ivCheck.lines}, contrast OK`
    );

    // End interrogation & leave visit to Zaakbord
    await tab.evalJs(`(() => { Act.talkEnd(UI.s); Act.leave(UI.s); UI.tab = 'board'; UI.render(true); })()`);
    await tab.waitFor(`Boolean(document.querySelector('#app .bd-grid'))`);

    /* =====================================================================
       5. Zaakbord, toetsenbord-selectie (Enter), notitie-focus, draadje, matrix, Spoorboek & kaart
       ===================================================================== */
    await tab.evalJs(`document.querySelector('#app .bc[data-card^="p:"]')?.focus()`);
    await tab.pressKey('Enter');
    const kbCardOpen = await tab.evalJs(`Boolean(UI.sel && UI.sel.startsWith('p:') && document.querySelector('#cardNote'))`);
    check('Zaakbord toetsenbordnavigatie: Enter op persoonskaart opent detailpaneel', kbCardOpen);

    const boardFlow = await tab.evalJs(`(() => {
      const pCard = document.querySelector('#app .bc[data-card^="p:"]');
      if (!pCard) return { ok: false, reason: 'geen persoonskaart' };
      const cid = pCard.dataset.card;
      if (UI.sel !== cid) pCard.click();
      const note = document.querySelector('#cardNote');
      if (!note) return { ok: false, reason: 'geen cardNote' };
      note.focus();
      note.value = 'Check alibi';
      note.dispatchEvent(new Event('input', { bubbles: true }));
      const keptFocus = document.activeElement === note;
      const markBtn = document.querySelector('[data-sp="mark"][data-v="verdacht"]');
      if (markBtn) markBtn.click();
      const marked = UI.s.player.marks[cid] === 'verdacht';
      // Draw a thread to case card
      const startLink = document.querySelector('[data-sp="linkmode"]');
      if (startLink) startLink.click();
      const caseCard = document.querySelector('#app .bc[data-card="case"]');
      if (caseCard) caseCard.click();
      const hasThread = Pins.has(UI.s, cid, 'case');
      const doneLink = document.querySelector('[data-sp="linkdone"]');
      if (doneLink) doneLink.click();
      return { ok: keptFocus && marked && hasThread, keptFocus, marked, hasThread };
    })()`);
    check(
      'Zaakbord: kaartselectie, #cardNote focusbehoud, statusmarkering en draadje trekken',
      boardFlow.ok,
      JSON.stringify(boardFlow)
    );

    // Re-select a card so drawer is also visible during contrast check
    await tab.evalJs(`document.querySelector('#app .bc[data-card^="p:"]')?.click()`);
    const boardSelectors = [
      '.sp-brand', '.sp-tabs button', '.sp-clock', '.sp-tools button',
      '.bd-mode', '.zn-lbl', '.bc b', '.bc small', '.bc p',
      '.sp-drawer h3', '.sp-drawer p', '.sp-btn'
    ];
    await setTheme('light');
    const bdLight = await tab.evalJs(`window.__checkContrast(${JSON.stringify(boardSelectors)})`);
    await setTheme('dark');
    const bdDark = await tab.evalJs(`window.__checkContrast(${JSON.stringify(boardSelectors)})`);
    await setTheme('light');
    check(
      'Zaakbord & bovenbalk WCAG AA kleurcontrast (licht & donker)',
      bdLight.checked >= 9 && bdLight.fails.length === 0 && bdDark.checked >= 9 && bdDark.fails.length === 0,
      bdLight.fails.length || bdDark.fails.length
        ? `light=${JSON.stringify(bdLight.fails)} dark=${JSON.stringify(bdDark.fails)}`
        : `${bdLight.checked} licht + ${bdDark.checked} donker OK`
    );

    // Switch to Verdachtenoverzicht and Spoorboek and verify contrast + presence
    await tab.evalJs(`document.querySelector('[data-ui="bmode"][data-v="matrix"]').click()`);
    await tab.waitFor(`Boolean(document.querySelector('#app .mx-table'))`);
    const mxSelectors = ['.mx-table th', '.mx-table td', '.mx-name-row b', '.mx-intro p'];
    await setTheme('dark');
    const mxDark = await tab.evalJs(`window.__checkContrast(${JSON.stringify(mxSelectors)})`);
    await setTheme('light');
    const mxLight = await tab.evalJs(`window.__checkContrast(${JSON.stringify(mxSelectors)})`);

    await tab.evalJs(`document.querySelector('[data-ui="bmode"][data-v="timeline"]').click()`);
    await tab.waitFor(`Boolean(document.querySelector('#app .sb-wrap'))`);
    const sbSelectors = ['.sb-intro p', '.sb-item b', '.sb-item small', '.sb-result p'];
    await setTheme('dark');
    const sbDark = await tab.evalJs(`window.__checkContrast(${JSON.stringify(sbSelectors)})`);
    await setTheme('light');
    const sbLight = await tab.evalJs(`window.__checkContrast(${JSON.stringify(sbSelectors)})`);
    check(
      'Verdachtenoverzicht & Spoorboek: weergave en WCAG AA contrast (licht & donker)',
      mxLight.checked >= 3 && mxLight.fails.length === 0 && mxDark.fails.length === 0 &&
      sbLight.checked >= 1 && sbLight.fails.length === 0 && sbDark.fails.length === 0,
      [mxLight, mxDark, sbLight, sbDark].some((x) => x.fails.length)
        ? JSON.stringify({ mxLight: mxLight.fails, mxDark: mxDark.fails, sbLight: sbLight.fails, sbDark: sbDark.fails })
        : `matrix (${mxLight.checked}) + spoorboek (${sbLight.checked}) licht & donker OK`
    );

    // Switch to Spoorkaart & select a station
    await tab.evalJs(`document.querySelector('[data-ui="tab"][data-v="map"]').click()`);
    await tab.waitFor(`Boolean(document.querySelector('#app svg[aria-label="Stadskaart"]'))`);
    const mapOk = await tab.evalJs(`(() => {
      const stn = document.querySelector('#app svg[aria-label="Stadskaart"] [data-stn]');
      if (!stn) return false;
      stn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return Boolean(document.querySelector('#app .sp-drawer:not([hidden]) h3'));
    })()`);
    check('Spoorkaart: SVG-stadskaart laadt en locatietik opent detailpaneel', mapOk);

    // Back to Zaakbord
    await tab.evalJs(`document.querySelector('[data-ui="tab"][data-v="board"]').click(); document.querySelector('[data-ui="bmode"][data-v="board"]').click();`);

    /* =====================================================================
       6. ARIA Focus-trap (#modal + #peek stapeling + Escape-prioriteit)
       ===================================================================== */
    // Open Systeem modal via trigger button
    await tab.evalJs(`(() => {
      const btn = document.querySelector('[data-ui="system"]');
      btn.focus();
      btn.click();
    })()`);
    await tab.waitFor(`!document.querySelector('#modal').hidden`);

    const modalAria = await tab.evalJs(`(() => {
      const m = document.querySelector('#modal');
      const focusables = Array.from(m.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null || el.classList.contains('sr-only'));
      const first = focusables[0], last = focusables[focusables.length - 1];
      const inModal = m.contains(document.activeElement);
      // Put focus on last element to test forward Tab wrap
      last.focus();
      return {
        role: m.getAttribute('role'),
        ariaModal: m.getAttribute('aria-modal'),
        labelledBy: m.getAttribute('aria-labelledby'),
        inModal,
        count: focusables.length,
        firstId: first.id || first.textContent.trim(),
        lastText: last.textContent.trim()
      };
    })()`);
    await tab.pressKey('Tab');
    const wrappedForward = await tab.evalJs(`(() => {
      const m = document.querySelector('#modal');
      const focusables = Array.from(m.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null || el.classList.contains('sr-only'));
      return document.activeElement === focusables[0];
    })()`);
    await tab.pressKey('Tab', { shift: true });
    const wrappedBackward = await tab.evalJs(`(() => {
      const m = document.querySelector('#modal');
      const focusables = Array.from(m.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null || el.classList.contains('sr-only'));
      return document.activeElement === focusables[focusables.length - 1];
    })()`);

    // Also check Systeem modal contrast in light & dark while open
    const sysSelectors = ['#mTitle', '.mbox h3', '.mbox .sys', '.mbox .chip:not(.dim)', '.mbox .slot'];
    await setTheme('light');
    const sysLight = await tab.evalJs(`window.__checkContrast(${JSON.stringify(sysSelectors)})`);
    await setTheme('dark');
    const sysDark = await tab.evalJs(`window.__checkContrast(${JSON.stringify(sysSelectors)})`);
    await setTheme('light');

    await tab.pressKey('Escape');
    const modalClosedFocus = await tab.evalJs(`({
      hidden: document.querySelector('#modal').hidden,
      restored: document.activeElement?.dataset?.ui === 'system'
    })`);

    check(
      'ARIA Modal (#modal): role=dialog, Tab/Shift+Tab focus-trap, Escape + focusterugkeer en contrast',
      modalAria.role === 'dialog' && modalAria.ariaModal === 'true' && modalAria.labelledBy === 'mTitle' &&
      modalAria.inModal && wrappedForward && wrappedBackward &&
      modalClosedFocus.hidden && modalClosedFocus.restored &&
      sysLight.fails.length === 0 && sysDark.fails.length === 0,
      sysLight.fails.length || sysDark.fails.length
        ? `light=${JSON.stringify(sysLight.fails)} dark=${JSON.stringify(sysDark.fails)}`
        : `trap=${wrappedForward}/${wrappedBackward}, focusRestore=${modalClosedFocus.restored}, contrast OK`
    );

    // Stacked #peek over #modal from Dagboek (Logboek tab always has location/person mentions)
    await tab.evalJs(`document.querySelector('[data-ui="journal"]').click()`);
    await tab.waitFor(`!document.querySelector('#modal').hidden`);
    await tab.evalJs(`(() => {
      const logTab = document.querySelector('#mBody [data-jtab="log"]');
      if (logTab) logTab.click();
      const mBtn = document.querySelector('#mBody [data-mention]');
      if (mBtn) { mBtn.focus(); mBtn.click(); }
    })()`);
    await tab.waitFor(`!document.querySelector('#peek').hidden`);
    const peekAria = await tab.evalJs(`(() => {
      const p = document.querySelector('#peek');
      return {
        role: p.getAttribute('role'),
        ariaModal: p.getAttribute('aria-modal'),
        inPeek: p.contains(document.activeElement),
        modalStillOpen: !document.querySelector('#modal').hidden
      };
    })()`);
    await tab.pressKey('Escape');
    const afterEsc1 = await tab.evalJs(`({
      peekClosed: document.querySelector('#peek').hidden,
      modalOpen: !document.querySelector('#modal').hidden,
      focusBackOnMention: Boolean(document.activeElement && document.activeElement.hasAttribute('data-mention'))
    })`);
    await tab.pressKey('Escape');
    const afterEsc2 = await tab.evalJs(`document.querySelector('#modal').hidden`);
    check(
      'Spiekkaart (#peek) bovenop #modal: Escape sluit eerst #peek met focusherstel, dan #modal',
      peekAria.role === 'dialog' && peekAria.ariaModal === 'true' && peekAria.inPeek &&
      peekAria.modalStillOpen && afterEsc1.peekClosed && afterEsc1.modalOpen &&
      afterEsc1.focusBackOnMention && afterEsc2,
      JSON.stringify(afterEsc1)
    );

    /* =====================================================================
       7. Save.MIGRATIONS end-to-end via Systeem-slot (schema 8 -> 9) & weigering schema 6
       ===================================================================== */
    const migE2E = await tab.evalJs(`(async () => {
      const s8 = JSON.parse(Save.pack(UI.s));
      s8.schema = 8; s8.version = 'v0.12.0';
      delete s8.player.seen; delete s8.player.seenJournal; delete s8.play.knownSched; delete s8.play.warmTip;
      await Store.put('slot1', JSON.stringify(s8));
      await UI.system();
      const slotTxt = document.querySelector('#mBody .slot')?.textContent || '';
      const loadBtn = document.querySelector('#mBody button[data-x="load"][data-v="1"]');
      loadBtn.click();
      await new Promise((r) => setTimeout(r, 120));
      const migratedSchema = UI.s.schema;
      const toastTxt = document.querySelector('#toast')?.textContent || '';
      let oldErr = '';
      try { Save.unpack(JSON.stringify(Object.assign({}, s8, { schema: 6 }))); } catch (e) { oldErr = e.message; }
      return {
        slotShowsMig: slotTxt.includes('8 → 9'),
        migratedSchema,
        toastMentionsMig: toastTxt.includes('schema 8 naar 9'),
        oldErrOk: oldErr.includes('te oud')
      };
    })()`);
    check(
      'Save-migratieketen in browser: schema-8 slot toont "8 → 9", migreert naar schema 9, en schema 6 weigert',
      migE2E.slotShowsMig && migE2E.migratedSchema === 9 && migE2E.toastMentionsMig && migE2E.oldErrOk,
      JSON.stringify(migE2E)
    );

    /* =====================================================================
       8. Zaakverslag openen & controleren
       ===================================================================== */
    const zvOk = await tab.evalJs(`(() => {
      document.querySelector('[data-ui="dossier"]').click();
      const open = !document.querySelector('#modal').hidden && document.querySelector('#mTitle').textContent.includes('Zaakverslag');
      UI.close();
      return open;
    })()`);
    check('Zaakverslag opent en sluit foutloos', zvOk);

    /* =====================================================================
       9. Responsieve viewports & leesgemak (0 horizontale overloop)
       ===================================================================== */
    const viewports = [
      { label: 'Desktop 1280×820', w: 1280, h: 820, mobile: false },
      { label: 'iPad staand 768×1024', w: 768, h: 1024, mobile: true },
      { label: '200% zoom 640×420', w: 640, h: 420, mobile: false },
      { label: 'Smal scherm 390×844', w: 390, h: 844, mobile: true }
    ];
    const overflowFails = [];
    for (const vp of viewports) {
      await tab.setViewport(vp.w, vp.h, vp.mobile);
      for (const mode of ['board', 'matrix', 'timeline']) {
        await tab.evalJs(`(() => { UI.tab = 'board'; UI.boardMode = ${JSON.stringify(mode)}; UI.render(true); })()`);
        await new Promise((r) => setTimeout(r, 60));
        const ov = await tab.evalJs(`({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })`);
        if (ov.sw > ov.iw + 1) overflowFails.push(`${vp.label}/${mode}: ${ov.sw}>${ov.iw}`);
      }
    }
    // Also verify Extra groot (20 px) + Rustig leesfont on iPad portrait
    await tab.setViewport(768, 1024, true);
    await tab.evalJs(`(() => { UI.setSize('xlarge', true); UI.setFont('plain', true); UI.tab = 'board'; UI.boardMode = 'board'; UI.render(true); })()`);
    await new Promise((r) => setTimeout(r, 60));
    const xlOv = await tab.evalJs(`({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize)
    })`);
    if (xlOv.sw > xlOv.iw + 1 || xlOv.rootPx < 19) overflowFails.push(`xlarge: sw=${xlOv.sw}/${xlOv.iw}, px=${xlOv.rootPx}`);
    await tab.evalJs(`(() => { UI.setSize('normal', true); UI.setFont('classic', true); })()`);
    check(
      'Responsieve viewports (1280×820, 768×1024, 640×420, 390×844) + Extra groot/Rustig font: 0 horizontale overloop',
      overflowFails.length === 0,
      overflowFails.length ? overflowFails.join('; ') : '4 viewports × 3 bordweergaven + xlarge OK'
    );

    /* =====================================================================
       10. Runtime/console/network error check over de volledige HTTP-sessie
       ===================================================================== */
    check(
      'Geen runtime-fouten, console-fouten of mislukte netwerkverzoeken over volledige sessie',
      tab.errors.page.length === 0 && tab.errors.console.length === 0 && tab.errors.network.length === 0,
      `page=${tab.errors.page.length}, console=${tab.errors.console.length}, net=${tab.errors.network.length}` +
      (tab.errors.page.length ? ' | ' + tab.errors.page[0] : '') +
      (tab.errors.console.length ? ' | ' + tab.errors.console[0] : '') +
      (tab.errors.network.length ? ' | ' + tab.errors.network[0] : '')
    );

    await tab.close();
  } finally {
    if (ws) try { ws.close(); } catch (_) {}
    if (proc) try { proc.kill('SIGTERM'); } catch (_) {}
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\nHet Spoor — Browser/a11y-teststraat: ${passed}/${results.length} checks geslaagd`);
  if (passed !== results.length) process.exit(1);
}

run().catch((err) => {
  console.error('Fatale fout in browser-a11y teststraat:', err);
  process.exit(1);
});

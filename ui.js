'use strict';
/* =====================================================================
   UI (v0.6.3): the paper-and-ink view is the main view.
   Tabs: Zaakbord, Spoorkaart, Bezoek (tableau with a side panel; an active conversation switches to the
   full-screen Interrogation view). Modals: Dagboek, Zaakverslag (v0.6.3), Systeem, Debug.
   Views read state; every change goes through Act. UI state (tab, selection, approach, deltas, slot) is not saved.
   v0.10.0: start screen, cold opening and coach. The intro state is kept in the prefs, never in the save.
   ===================================================================== */
const $ = (q) => document.querySelector(q);
const STYLE_REPORT = {
  gezelschap:  { badge: 'Gesloten Kring · Reconstructie', intro: 'U roept de betrokkenen bijeen om de keten van gebeurtenissen sluitend voor te leggen.' },
  procedureel: { badge: 'Proces-Verbaal van Bevindingen', intro: 'Ondergetekende legt op basis van sporen, tijdstippen en verklaringen de volgende toedracht vast.' },
  dorp:        { badge: 'Openlegging van de Zaak', intro: 'Achter de gesloten deuren en dorpsverhalen wijst het onderzoek naar één onontkoombare slotsom.' },
  psych:       { badge: 'Persoonlijk Onderzoeksverslag', intro: 'Waar motief, karakter en gelegenheid elkaar kruisen, blijft slechts één verklaring overeind.' },
  noir:        { badge: 'Dossier · Onderste Steen', intro: 'Voorbij de rookgordijnen en verhulde belangen tekent zich het werkelijke spoor af.' },
  omgekeerd:   { badge: 'Slotbewijs · De Misrekening', intro: 'Het schijnbaar waterdichte verhaal vertoont één fatale scheur zodra de stukken naast elkaar liggen.' }
};
/* ---------------- SFX: Procedurele WebAudio ("Paper, Ink & Clock" - 0 KB externe assets) ---------------- */
const SFX = {
  ctx: null, muted: false,
  _c() {
    if (this.muted || typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  },
  paper() {
    const c = this._c(); if (!c) return;
    const dur = 0.065, buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / d.length) * Math.PI);
    const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
    flt.type = 'bandpass'; flt.frequency.value = 1350; flt.Q.value = 1.1;
    g.gain.value = 0.065;
    src.buffer = buf; src.connect(flt); flt.connect(g); g.connect(c.destination); src.start();
  },
  pin() {
    const c = this._c(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.045);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.05);
  },
  type(fam) {
    const c = this._c(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    if (fam === 'oud') {
      o.type = 'sine'; o.frequency.setValueAtTime(980, t); o.frequency.exponentialRampToValueAtTime(640, t + 0.025);
      g.gain.setValueAtTime(0.022, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
    } else if (fam === 'toekomst') {
      o.type = 'sine'; o.frequency.setValueAtTime(1480, t); o.frequency.exponentialRampToValueAtTime(1180, t + 0.022);
      g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    } else {
      o.type = 'square'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.022);
      g.gain.setValueAtTime(0.028, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.024);
    }
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.03);
  },
  bell(harbor) {
    const c = this._c(); if (!c) return;
    const t = c.currentTime, base = harbor ? 440 : 220;
    [1, 2.02, 2.98].forEach((m, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(base * m, t);
      g.gain.setValueAtTime(0.06 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0008, t + (harbor ? 0.9 : 1.35));
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 1.4);
    });
  },
  seal() {
    const c = this._c(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.16);
  }
};
const UI = {
  s: null, screen: null, intro: null, introT: null, level: 'normaal', tab: 'board', boardMode: 'board', threadKind: 'verband', sel: null, link: null, stn: null, hot: null, approach: 'reserved', deltas: {}, showEv: false, zvSlot: 'suspectId', jTab: 'overzicht', jQuery: '', hintTier: 1, hintTurn: -1, lastFocus: null, peekFocus: null, typeTimer: null, feed: [], theme: 'auto', size: 'normal', font: 'classic', oldRaw: null, taps: 0, tt: null, bound: false,
  _shell: null, _headHtml: null, _stageKey: null, _drawerHtml: null, _drawerId: null, _coachHtml: null, _boardLayout: null, _boardRO: null, _rafThreads: 0, _noteSaveT: null,
  btn: (label, data, cls) => '<button type="button" class="chip ' + (cls || '') + '" ' + Object.keys(data).map((k) => 'data-' + k + '="' + U.esc(data[k]) + '"').join(' ') + '>' + label + '</button>',

  async init() {
    window.addEventListener('error', (e) => this.toast('Fout: ' + (e.message || 'onbekend') + '. Meld dit met een schermafbeelding.', 8000));
    this.bind();
    $('#mClose').onclick = () => this.close();
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.close(); });
    const pc = $('#pClose'), pk = $('#peek');
    if (pc) pc.onclick = () => this.closePeek();
    if (pk) pk.addEventListener('click', (e) => { if (e.target.id === 'peek') this.closePeek(); });
    await Store.open();
    Content.init();
    const pack = await Store.get('contentPack');
    if (pack) { const r = Content.importPack(pack); if (!r.ok) this.toast('Contentpakket niet geladen: ' + r.rep.errors[0]); }
    let theme = 'auto', size = 'normal', font = 'classic', parsed = {};
    try {
      const prefs = await Store.get('prefs'); parsed = prefs ? JSON.parse(prefs) : {};
      theme = parsed.theme || 'auto';
      size = ['normal', 'large', 'xlarge'].indexOf(parsed.size) >= 0 ? parsed.size : 'normal';
      font = ['classic', 'plain'].indexOf(parsed.font) >= 0 ? parsed.font : 'classic';
      SFX.muted = !!parsed.muted;
      if (LEVELS[parsed.level]) this.level = parsed.level;
    } catch (e) { theme = 'auto'; size = 'normal'; font = 'classic'; parsed = {}; }
    this.setTheme(theme, true);
    this.setSize(size, true);
    this.setFont(font, true);
    this.oldRaw = await Store.get('oldAuto');
    const saved = await Store.get('auto');
    // v0.10.0 (voorstel 10): the intro state lives in the prefs; someone who already played skips the guided visit
    this.intro = parsed.intro && typeof parsed.intro === 'object' ? parsed.intro : saved ? Coach.done() : Coach.fresh();
    if (!parsed.intro) this.savePrefs();
    if (saved) {
      try { this.load(Save.unpack(saved)); this.toast('Je verhaal is hervat.'); return; }
      catch (e) { await Store.put('oldAuto', saved); this.oldRaw = saved; this.showStart(); this.toast(e.message, 12000); return; }
    }
    this.showStart();
  },
  load(s) {
    clearTimeout(this.typeTimer);
    this.closePeek();
    this.s = s; this.sel = null; this.link = null; this.stn = null; this.hot = null; this.deltas = {}; this.showEv = false; this.feed = [];
    this.boardMode = 'board'; this.threadKind = 'verband'; this.hintTier = 1; this.hintTurn = -1;
    this.tab = s.visit ? 'visit' : 'board';
    this._stageKey = null; this._headHtml = null; this._drawerHtml = null; this._coachHtml = null;
    $('#app').hidden = false; this.after();
    const cm = s.meta.content; if (cm && cm.sig !== Content.sig) setTimeout(() => this.toast('Let op: dit spel is gestart met contentpakket "' + cm.name + '". Nu actief: "' + Content.cur.name + '". Nieuwe zinnen komen uit het actieve pakket.', 6000), 3500);
  },
  newGame(seed, level) {
    this.screen = null; clearTimeout(this.introT);
    if (LEVELS[level]) { this.level = level; this.savePrefs(); }
    const s = Game.create(seed || 'spoor-' + Date.now().toString(36), this.level); this.close(); this.load(s);
    this.feed = s.log.map((e) => this.line(s, e)); this.render();
  },
  // In UI.line(s, e): ondersteun e.k === 'q' (jouw uitgesproken vraag):
  line(s, e) {
    return {
      k: e.k,
      who: e.k === 'p' ? World.npc(s, e.npc).name : e.k === 'q' ? U.first(s.protagonist) : e.k === 'c' ? e.name + ' (' + e.role + ')' : null,
      text: e.text
    };
  },
  // run an action; its fresh log lines become the feed
  run(fn) {
    const s = this.s; if (!s) return;
    const prev = s.play.logN || 0, r = fn(s);
    const fresh = s.log.filter((e) => e.i && e.i > prev);
    if (fresh.length) this.feed = fresh.map((e) => this.line(s, e));
    this.after(); return r;
  },
  // run an action inside an interrogation; tracks relation deltas and triggers line-by-line pacing (display only)
  runConv(fn) {
    const s = this.s; if (!s) return;
    const npcId = s.visit && s.visit.conv;
    const before = npcId && s.relations[npcId] ? Object.assign({}, s.relations[npcId]) : null;
    const prev = s.play.logN || 0, r = fn(s);
    const fresh = s.log.filter((e) => e.i && e.i > prev);
    if (fresh.length) this.feed = fresh.map((e) => this.line(s, e));
    this.deltas = {};
    const curId = (s.visit && s.visit.conv) || npcId;
    if (before && curId && s.relations[curId]) {
      ['trust', 'affection', 'resentment', 'suspicion'].forEach((k) => {
        const d = s.relations[curId][k] - before[k];
        if (d !== 0) this.deltas[k] = d;
      });
    }
    this.after();
    const npc = curId && World.npc(s, curId);
    if (npc && s.visit && s.visit.conv) this.animateTranscript(npc);
    return r;
  },
  // reveals the latest speaker strip line by line at the NPC's public voice pace
  animateTranscript(npc) {
    clearTimeout(this.typeTimer);
    if (typeof Interrogation === 'undefined') return;
    const lastStrip = $('#app .iv-strip[data-last="1"]');
    if (!lastStrip) return;
    const lines = Array.from(lastStrip.querySelectorAll('.iv-line'));
    const fam = this.s ? famOf(this.s) : 'klassiek';
    if (this.reduced()) {
      const log = $('#app .iv-log');
      if (log) log.scrollTop = log.scrollHeight;
      return;
    }
    SFX.type(fam);
    if (lines.length <= 1) return;
    const pace = Interrogation.pace(npc);
    lines.forEach((p, i) => { if (i > 0) p.classList.add('iv-hidden'); });
    let idx = 1;
    const step = () => {
      if (idx >= lines.length) return;
      lines[idx].classList.remove('iv-hidden');
      SFX.type(fam);
      const len = (lines[idx].textContent || '').length;
      idx++;
      const log = $('#app .iv-log');
      if (log) log.scrollTop = log.scrollHeight;
      if (idx < lines.length) {
        this.typeTimer = setTimeout(step, Math.min(1400, len * pace.ms + pace.pause));
      }
    };
    const firstLen = (lines[0].textContent || '').length;
    this.typeTimer = setTimeout(step, Math.min(1200, firstLen * pace.ms + pace.pause));
  },
  skipTranscript() {
    clearTimeout(this.typeTimer);
    document.querySelectorAll('#app .iv-line.iv-hidden').forEach((el) => el.classList.remove('iv-hidden'));
    const log = $('#app .iv-log');
    if (log) log.scrollTop = log.scrollHeight;
  },
  after() {
    const s = this.s; Store.put('auto', Save.pack(s));
    if (this.tab === 'visit' && !s.visit) { this.tab = 'board'; this.hot = null; this.deltas = {}; this.showEv = false; }
    if (s.turn > 0 && s.turn % 40 === 0) this.toast('Tip: maak af en toe een export via Systeem.');
    this.render(true);
    if (s.play.ended && !s.play.endingShown) { s.play.endingShown = true; Store.put('auto', Save.pack(s)); this.ending(); }
  },
  map() { return Travel.map(this.s); },
  savePrefs() { Store.put('prefs', JSON.stringify({ theme: this.theme, size: this.size, font: this.font, muted: SFX.muted, level: this.level, intro: this.intro })); },
  setTheme(t, quiet) { this.theme = t; document.documentElement.dataset.theme = t; if (!quiet) this.savePrefs(); },
  setSize(sz, quiet) { this.size = ['normal', 'large', 'xlarge'].indexOf(sz) >= 0 ? sz : 'normal'; document.documentElement.dataset.size = this.size; if (!quiet) this.savePrefs(); },
  setFont(fn, quiet) { this.font = ['classic', 'plain'].indexOf(fn) >= 0 ? fn : 'classic'; document.documentElement.dataset.font = this.font; if (!quiet) this.savePrefs(); },
  toggleMute() { SFX.muted = !SFX.muted; this.savePrefs(); if (!SFX.muted) SFX.pin(); this.render(true); },
  // v0.7.0: switching the level of the running game only changes the help, never the case itself
  setLevel(lv) { if (!LEVELS[lv]) return; this.level = lv; this.savePrefs(); if (this.s) { this.s.settings = this.s.settings || {}; this.s.settings.level = lv; Store.put('auto', Save.pack(this.s)); this.render(); } },
  toast(t, ms) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(this.toastT); this.toastT = setTimeout(() => { el.hidden = true; }, ms || 3800); },

  /* ----- v0.10.0 (voorstel 10): start screen, cold opening and coach ----- */
  LV_START: {
    makkelijk: 'Het bord trekt de draadjes voor je, en de beste toon krijgt een ster.',
    normaal: 'Je trekt de draadjes zelf en controleert alibi\'s bij de metgezel.',
    moeilijk: 'Geen vraagtekens, geen labels en geen hints. Alleen je dagboek helpt.'
  },
  reduced: () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  showStart() { clearTimeout(this.typeTimer); clearTimeout(this.introT); this.closePeek(); this.close(); this.screen = 'start'; $('#app').hidden = false; this.renderScreen(); },
  renderScreen(focusRadio) {
    const root = $('#app'); clearTimeout(this.introT);
    this.stopBoardObserver();
    this._shell = null; this._headHtml = null; this._stageKey = null; this._drawerHtml = null; this._coachHtml = null;
    delete root.dataset.part;
    root.innerHTML = this.screen === 'intro' && this.s ? this.introHtml() : this.startHtml();
    if (this.screen === 'intro') this.revealIntro();
    if (focusRadio) {
      const rEl = root.querySelector(`[data-ui="st-level"][data-v="${focusRadio}"]`);
      if (rEl) rEl.focus({ preventScroll: true });
    } else {
      const first = root.querySelector('.st-go, .st-resume');
      if (first) first.focus({ preventScroll: true });
    }
  },
  startHtml() {
    const s = this.s, live = s && !s.play.ended;
    const cards = Object.keys(LEVELS).map((k) => `<button type="button" class="st-lv${this.level === k ? ' on' : ''}" role="radio" aria-checked="${this.level === k}" tabindex="${this.level === k ? '0' : '-1'}" data-ui="st-level" data-v="${k}"><span class="pin" aria-hidden="true"></span>` +
      `<b>${LEVELS[k].label}</b><span>${U.esc(this.LV_START[k])}</span><small>Onderzoeken ${Math.round(15 * LEVELS[k].speed / 5) * 5} min · verhoren ${Math.round(30 * LEVELS[k].speed / 5) * 5} min</small></button>`).join('');
    return `<main id="main" class="start"><div class="st-folder">` +
      (live ? `<button type="button" class="st-resume" data-ui="st-resume"><b>Verder met ${U.esc(s.meta.title)}</b><small>Dag ${s.clock.day}, ${PARTS[Math.min(s.clock.part, 2)]} · ${U.esc(s.meta.eraLabel)}, ${U.esc(s.world.city.name)}</small></button>` : '') +
      `<h1 class="st-title">Het Spoor</h1><p class="st-lead">Een stad, een voorval en vier dagen om te bewijzen wie het deed. Elke zaak is nieuw.</p>` +
      `<div class="st-lvs" role="radiogroup" aria-label="Niveau">${cards}</div>` +
      `<div class="st-foot"><p class="st-note">Het niveau en de weergave wissel je altijd via Systeem.</p><button type="button" class="st-go" data-ui="st-begin">${live ? 'Begin een nieuwe zaak' : 'Begin de zaak'}</button></div>` +
      `<small class="st-ver">${APP.version}</small></div></main>`;
  },
  // short paragraphs from the case itself: who you are, the town, what happened, where you stay
  introText(s) {
    const n = s.log.filter((e) => e.k === 'n').map((e) => e.text).slice(1, 5);
    if (n.length) n[n.length - 1] += ' Het is de ochtend van dag 1.';
    return n;
  },
  introHtml() {
    const s = this.s, start = World.loc(s, s.startLoc), canGo = start && World.openAt(start, s.clock.part) && !s.visit;
    const paras = this.introText(s).map((x, i) => `<p class="co-line${i < (this.introN || 1) ? '' : ' co-hide'}">${U.esc(x)}</p>`).join('');
    return `<main id="main" class="start"><div class="st-folder co"><div class="co-top"><div><h1 class="co-title">${U.esc(s.meta.title)}</h1><p class="co-sub">${U.esc(s.meta.eraLabel)}, ${U.esc(s.world.city.name)} · Niveau: ${U.esc(Level.get(s).label)}</p></div><button type="button" class="co-skip-btn" data-ui="st-reveal">Toon hele tekst</button></div>` +
      `<div class="co-text" data-ui="st-reveal">${paras}</div>` +
      `<p class="co-tip">Tip: onderzoek voorwerpen en spreek aanwezigen aan — je eerste spoor ligt klaar. Tik overal op onderstreepte namen of plaatsen voor een snelle spiekkaart.</p>` +
      `<div class="co-acts">` +
      (canGo ? `<button type="button" class="st-go" data-ui="st-go">Begin direct in ${U.esc(start.name)} (${U.hm(Clock.norm(s))})</button>` : '') +
      `<button type="button" class="st-sec${canGo ? '' : ' st-go'}" data-ui="st-board">${canGo ? 'Eerst naar het zaakbord' : 'Naar het zaakbord'}</button></div></div></main>`;
  },
  revealIntro() {
    const lines = Array.from(document.querySelectorAll('#app .co-line'));
    if (this.reduced()) { lines.forEach((p) => p.classList.remove('co-hide')); this.introN = lines.length; return; }
    const step = () => { const next = lines.find((p) => p.classList.contains('co-hide')); if (!next) return; next.classList.remove('co-hide'); SFX.type(famOf(this.s)); this.introN = lines.indexOf(next) + 1; this.introT = setTimeout(step, 1200); };
    this.introT = setTimeout(step, 1050);
  },
  beginCase() {
    const s = Game.create('spoor-' + Date.now().toString(36), this.level);
    this.screen = 'intro'; this.introN = 1; this.close(); this.load(s); this.feed = s.log.map((e) => this.line(s, e));
  },
  // buttons of the start screen, the cold opening and the coach bubble; true when handled
  screenAct(el) {
    const d = el.dataset, u = d.ui;
    switch (u) {
      case 'st-level': if (!LEVELS[d.v]) return true; SFX.pin(); this.level = d.v; this.savePrefs(); this.renderScreen(d.v); return true;
      case 'st-begin': SFX.paper(); this.beginCase(); return true;
      case 'st-resume': SFX.paper(); this.screen = null; this.render(); return true;
      case 'st-reveal': clearTimeout(this.introT); document.querySelectorAll('#app .co-line').forEach((p) => p.classList.remove('co-hide')); this.introN = 9; return true;
      case 'st-board': SFX.paper(); clearTimeout(this.introT); this.screen = null; this.tab = 'board'; this.render(); return true;
      case 'st-go': clearTimeout(this.introT); this.screen = null; this.render(); this.startVisit(this.s.startLoc); return true;
      case 'coach-next': SFX.pin(); this.intro = Coach.answer(this.intro || Coach.fresh(), d.v); this.savePrefs(); this.render(true); return true;
      case 'coach-skip': SFX.pin(); this.intro = Coach.answer(this.intro || Coach.fresh(), d.v, true); this.savePrefs(); this.toast('De uitleg staat uit. Via Systeem zet je hem terug.'); this.render(true); return true;
    }
    return false;
  },
  coachPick() { return this.s && !this.screen && this.intro ? Coach.pick(this.s, this.intro, { tab: this.tab }) : null; },
  coachHtml(c) {
    return `<div class="coach" role="dialog" aria-live="polite" aria-label="${U.esc(c.title)}" data-coach="${c.id}">` + (c.guided ? `<small>Stap ${c.n} van 3</small>` : '') +
      `<b>${U.esc(c.title)}</b><p>${U.esc(c.text)}</p><div class="coach-acts"><button type="button" class="coach-go" data-ui="coach-next" data-v="${c.id}">${c.btn}</button>` +
      (c.guided ? `<button type="button" class="coach-skip" data-ui="coach-skip" data-v="${c.id}">Uitleg overslaan</button>` : '') + '</div></div>';
  },
  // the bubble sits next to the element it explains; without one it takes the top right corner below the header
  placeCoach(c) {
    const root = $('#app'), el = root.querySelector('.coach'); if (!el) return;
    const tgt = c.sel.map((q) => root.querySelector(q)).find(Boolean), W = window.innerWidth, H = window.innerHeight, bw = el.offsetWidth, bh = el.offsetHeight;
    let top, left;
    if (tgt) {
      tgt.classList.add('coach-on'); const r = tgt.getBoundingClientRect();
      top = r.bottom + 12; if (top + bh > H - 12) top = r.top - bh - 12; if (top < 12) top = Math.max(12, Math.min(H - bh - 12, r.top + 12));
      left = r.left + r.width / 2 - bw / 2;
    } else { const bar = root.querySelector('.sp-head, .sp-bar'); top = (bar ? bar.getBoundingClientRect().bottom : 72) + 12; left = W - bw - 24; }
    el.style.top = Math.round(top) + 'px'; el.style.left = Math.round(Math.max(12, Math.min(W - bw - 12, left))) + 'px'; el.style.visibility = 'visible';
  },

  /* ----- main view (v0.14.0: persistent shell + targeted DOM partial renders) ----- */
  ensureShell() {
    const root = $('#app');
    if (this._shell && this._shell.main && root.contains(this._shell.main)) return this._shell;
    root.innerHTML = `<header class="sp-head" data-shell="head"></header>` +
      `<main id="main" class="sp-main" data-shell="main"><div class="sp-stage" data-shell="stage"></div><aside class="sp-drawer" data-shell="drawer" hidden></aside></main>` +
      `<div class="sp-coach-layer" data-shell="coach"></div>`;
    this._shell = {
      head: root.querySelector('[data-shell="head"]'),
      main: root.querySelector('[data-shell="main"]'),
      stage: root.querySelector('[data-shell="stage"]'),
      drawer: root.querySelector('[data-shell="drawer"]'),
      coach: root.querySelector('[data-shell="coach"]')
    };
    this._headHtml = null; this._stageKey = null; this._drawerHtml = null; this._drawerId = null; this._coachHtml = null;
    return this._shell;
  },
  captureFocus() {
    const root = $('#app'), ae = document.activeElement;
    if (!ae || !root || !root.contains(ae)) return null;
    if (ae.dataset.card) return `[data-card="${ae.dataset.card}"]`;
    if (ae.dataset.stn) return `[data-stn="${ae.dataset.stn}"]`;
    if (ae.dataset.hs) return `[data-hs="${ae.dataset.hs}"]`;
    if (ae.id) return '#' + ae.id;
    if (ae.dataset.sp && ae.dataset.id && ae.dataset.v) return `[data-sp="${ae.dataset.sp}"][data-id="${ae.dataset.id}"][data-v="${ae.dataset.v}"]`;
    if (ae.dataset.ui && ae.dataset.v) return `[data-ui="${ae.dataset.ui}"][data-v="${ae.dataset.v}"]`;
    if (ae.dataset.ui) return `[data-ui="${ae.dataset.ui}"]`;
    return null;
  },
  restoreFocus(sel) {
    if (!sel) return;
    const root = $('#app'), ae = document.activeElement;
    if (ae && root && root.contains(ae) && ae !== root) return;
    const el = root && root.querySelector(sel);
    if (el && el.focus) el.focus({ preventScroll: true });
  },
  headHtml(s) {
    const part = s.clock.part, v = s.visit, ended = !!s.play.ended, here = World.here(s);
    const newBoard = Pins.newIds(s).length, newJournal = Pins.journalNew(s);
    const tabs = [['board', 'Zaakbord', newBoard], ['map', 'Kaart', 0]].concat(v ? [['visit', 'Bezoek: ' + here.name, 0]] : []);
    const late = s.clock.day > DAY.soft;
    let actHtml = '';
    if (!ended) {
      if (v) actHtml = `<button type="button" class="sp-hbtn go" data-ui="leave">Vertrek uit ${U.esc(here.name)}</button>`;
      else {
        if (part < DAY.parts) actHtml += `<button type="button" class="sp-hbtn" data-ui="wait">Wacht tot ${part < 2 ? PARTS[part + 1] + ' (' + U.hm(Clock.partEnd(part)) + ')' : '22:00'}</button>`;
        if (part >= 2) actHtml += `<button type="button" class="sp-hbtn${part >= DAY.parts ? ' go' : ''}" data-ui="endday">Sluit dag af</button>`;
      }
    }
    const clockAria = `Dag ${s.clock.day} van ${DAY.soft}, ${U.hm(Clock.norm(s))}, ${PARTS[part]}${late ? '. Het spoor koelt af' : ''}. Tik voor uitleg over de tijd.`;
    const badge = (n) => n > 0 ? `<span class="nav-badge" aria-label="${n} nieuw">+${n}</span>` : '';
    return `<div class="sp-brand"><h1 class="sp-title" data-ui="title">Het Spoor</h1><span class="sp-case" title="${U.esc(s.meta.title + ' — ' + s.meta.eraLabel + ', ' + s.world.city.name)}">${U.esc(s.meta.title)} · ${U.esc(s.world.city.name)}</span></div>` +
      `<nav class="sp-tabs" aria-label="Hoofdnavigatie">` +
      tabs.map((t) => `<button type="button" data-ui="tab" data-v="${t[0]}" class="${this.tab === t[0] ? 'on' : ''}${t[0] === 'visit' ? ' visit' : ''}"${this.tab === t[0] ? ' aria-current="page"' : ''}>${U.esc(t[1])}${badge(t[2])}</button>`).join('') +
      `</nav>` +
      `<div class="sp-status">` +
        `<button type="button" class="sp-clock${part >= DAY.parts ? ' night' : ''}${late ? ' late' : ''}" data-ui="budgethelp" aria-label="${U.esc(clockAria)}">Dag ${s.clock.day} · <b>${U.hm(Clock.norm(s))}</b> · ${PARTS[part]} <span class="sp-help" aria-hidden="true">?</span></button>` +
        actHtml +
      `</div>` +
      `<div class="sp-tools">` +
        `<button type="button" data-ui="journal">Dagboek${badge(newJournal)}</button>` +
        `<button type="button" data-ui="dossier"${this.dossierReady() ? ' class="hot"' : ''}>Zaakverslag</button>` +
        `<button type="button" data-ui="system">Systeem</button>` +
        `<button type="button" class="sp-icon-btn" data-ui="mute" aria-pressed="${!SFX.muted}" aria-label="${SFX.muted ? 'Geluid aanzetten' : 'Geluid uitzetten'}" title="${SFX.muted ? 'Geluid staat uit' : 'Geluid staat aan'}">${SFX.muted ? '🔇' : '🔊'}</button>` +
      `</div>`;
  },
  boardContentKey(s, fam) {
    const L = Board.layout(s);
    this._boardLayout = L;
    const p = s.player || {};
    return [
      'board', this.boardMode, fam, Level.id(s), this.link || '', this.threadKind,
      L.cards.map((c) => c.id + ':' + c.kind + ':' + (Pins.mark(s, c.id) || '')).join(','),
      Board.folders(s).map((f) => f.zone + ':' + f.n).join(','),
      L.threads.map((t) => t.a + '-' + t.b + '-' + t.kind + '-' + (t.meaning || '')).join(','),
      JSON.stringify(p.notes || {}),
      JSON.stringify(s.play.cleared || {}),
      JSON.stringify(s.play.debunked || {}),
      JSON.stringify(s.play.resolved || {}),
      this.boardMode === 'matrix' ? JSON.stringify(s.play.asked || {}) + JSON.stringify(s.play.alibiCheck || {}) : ''
    ].join('|');
  },
  renderHead(s, sh) {
    const hh = this.headHtml(s);
    if (this._headHtml !== hh) {
      sh.head.innerHTML = hh;
      this._headHtml = hh;
    }
  },
  renderDrawer(s, fam, sh) {
    let html = '', isFeed = false, dId = null;
    if (this.tab === 'board') {
      if (this.link) { html = Board.linkPanel(s, this.link, this.threadKind); dId = 'link:' + this.link; }
      else if (this.sel) { html = Board.detail(s, this.sel, fam); dId = 'card:' + this.sel; }
      else if (this.feed.length) { html = `<button type="button" class="sp-x" data-ui="feedx">Sluiten</button><h3>Zojuist</h3>${this.feedLines()}`; isFeed = true; dId = 'feed'; }
    } else if (this.tab === 'map') {
      if (this.stn) { html = this.stnDetail(s, this.stn); dId = 'stn:' + this.stn; }
      else if (this.feed.length) { html = `<button type="button" class="sp-x" data-ui="feedx">Sluiten</button><h3>Zojuist</h3>${this.feedLines()}`; isFeed = true; dId = 'feed'; }
    }
    const hadDrawer = !sh.drawer.hidden;
    sh.drawer.classList.toggle('sp-feed', isFeed);
    sh.drawer.hidden = !html;
    sh.stage.classList.toggle('drawer', !!html);
    if (this._drawerHtml !== html) {
      const sameTarget = dId && dId === this._drawerId;
      const prevScroll = sameTarget ? sh.drawer.scrollTop : 0;
      sh.drawer.innerHTML = html;
      this._drawerHtml = html;
      this._drawerId = dId;
      sh.drawer.scrollTop = prevScroll;
    }
    if (hadDrawer !== !!html && this.tab === 'board' && this.boardMode === 'board') this.scheduleThreads();
  },
  renderStage(s, fam, sh) {
    if (this.tab === 'visit' && s.visit) {
      this.stopBoardObserver();
      const v = s.visit;
      if (v.conv && typeof Interrogation !== 'undefined') {
        const ivKey = 'iv:' + v.conv + ':' + s.play.logN + ':' + (this.showEv ? '1' : '0') + ':' + JSON.stringify(this.deltas || {}) + ':' +
          Object.keys(s.play.found).length + ':' + Object.keys(s.play.resolved).length + ':' + (v.used[v.conv] || []).length + ':' + s.player.money + ':' + fam;
        if (this._stageKey === ivKey && sh.stage.querySelector('.iv')) {
          this.patchIvApproach(sh);
          return;
        }
        const prevLeft = sh.stage.querySelector('.iv-left'), leftTop = prevLeft ? prevLeft.scrollTop : 0;
        sh.stage.innerHTML = Interrogation.html(s, fam, { approach: this.approach, deltas: this.deltas || {}, showEvidence: !!this.showEv });
        const nextLeft = sh.stage.querySelector('.iv-left'); if (nextLeft) nextLeft.scrollTop = leftTop;
        const log = sh.stage.querySelector('.iv-log'); if (log) log.scrollTop = log.scrollHeight;
        this._stageKey = ivKey;
        return;
      }
      const tvKey = 'tv:' + v.locId + ':' + s.clock.part + ':' + Clock.norm(s) + ':' + Object.keys(v.done).length + ':' +
        Object.keys(s.play.found).length + ':' + Object.keys(s.play.early || {}).length + ':' + Object.keys(s.play.examined || {}).length + ':' + this.feed.length + ':' + fam;
      if (this._stageKey === tvKey && sh.stage.querySelector('.tv-canvas')) {
        this.patchTableauHotspot(s, fam, sh);
        return;
      }
      const prevSide = sh.stage.querySelector('.tv-side'), sideTop = prevSide ? prevSide.scrollTop : 0;
      sh.stage.innerHTML = this.visitView(s, fam);
      const nextSide = sh.stage.querySelector('.tv-side'); if (nextSide) nextSide.scrollTop = sideTop;
      this._stageKey = tvKey;
      return;
    }

    if (this.tab === 'map') {
      this.stopBoardObserver();
      const mapKey = 'map:' + s.seed + ':' + s.clock.part + ':' + s.pos + ':' + Object.keys(s.play.met).length + ':' +
        Object.keys(s.play.metCrowd || {}).length + ':' + Object.keys(s.play.visited).length + ':' + Object.keys(s.play.heardOfLoc || {}).length + ':' + fam;
      if (this._stageKey === mapKey && sh.stage.querySelector('.mv svg')) {
        this.patchMapSelection(sh);
        return;
      }
      sh.stage.innerHTML = `<div class="mv">${MapGen.svg(s, this.map(), s.clock.part, this.stn)}</div>`;
      this._stageKey = mapKey;
      return;
    }

    // Zaakbord (Prikbord or Verdachtenoverzicht)
    const bKey = this.boardContentKey(s, fam);
    if (this._stageKey === bKey && ((this.boardMode === 'board' && sh.stage.querySelector('.bd')) || (this.boardMode === 'matrix' && sh.stage.querySelector('.mx-wrap')))) {
      this.patchBoardSelection(s, sh);
      return;
    }
    const prevBw = sh.stage.querySelector('.bw'), bwTop = prevBw ? prevBw.scrollTop : 0, bwLeft = prevBw ? prevBw.scrollLeft : 0;
    const res = Board.html(s, fam, this.sel, this.link, { mode: this.boardMode, threadKind: this.threadKind });
    this._boardLayout = res.L;
    sh.stage.innerHTML = `<div class="bw">${res.html}</div>`;
    const nextBw = sh.stage.querySelector('.bw');
    if (nextBw) { nextBw.scrollTop = bwTop; nextBw.scrollLeft = bwLeft; }
    this._stageKey = bKey;
    if (this.boardMode === 'board') { this.observeBoard(); this.scheduleThreads(); }
    else this.stopBoardObserver();
  },
  renderCoach(sh) {
    const coach = this.coachPick();
    const ch = coach ? this.coachHtml(coach) : '';
    if (this._coachHtml !== ch) {
      document.querySelectorAll('#app .coach-on').forEach((el) => el.classList.remove('coach-on'));
      sh.coach.innerHTML = ch;
      this._coachHtml = ch;
    }
    if (coach) this.placeCoach(coach);
  },
  // in-place patchers (no DOM teardown, scroll and focus preserved)
  patchBoardSelection(s, sh) {
    const stage = (sh && sh.stage) || (this._shell && this._shell.stage); if (!stage) return;
    if (this.boardMode === 'matrix') {
      stage.querySelectorAll('.mx-table tbody tr').forEach((tr) => {
        const btn = tr.querySelector('[data-card]');
        const on = !!(btn && btn.dataset.card === this.sel);
        tr.classList.toggle('sel', on);
        if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      return;
    }
    const bd = stage.querySelector('.bd'); if (!bd) return;
    const L = this._boardLayout || Board.layout(s), byId = {}; L.cards.forEach((c) => { byId[c.id] = c; });
    const link = this.link && byId[this.link] ? this.link : null;
    const sel = link || (this.sel && byId[this.sel] ? this.sel : null);
    const hl = link ? new Set([link].concat(Pins.ends(s, link))) : sel ? Board.linked(s, L, sel) : null;
    bd.classList.toggle('linking', !!link);
    bd.classList.toggle('focus', !link && !!hl);
    bd.querySelectorAll('.bc[data-card]').forEach((el) => {
      const id = el.dataset.card, c = byId[id]; if (!c) return;
      const isSel = sel === id, isHl = !!(hl && hl.has(id)), isNew = Pins.isNew(s, id);
      el.classList.toggle('sel', isSel);
      el.classList.toggle('hl', isHl);
      el.classList.toggle('is-new', isNew);
      el.setAttribute('aria-pressed', isSel ? 'true' : 'false');
      el.setAttribute('aria-label', Board.cardAria(s, c, sel, L));
      if (!isNew) {
        const nb = el.querySelector('.bc-new'); if (nb) nb.remove();
        const wrap = el.querySelector('.bc-badges'); if (wrap && !wrap.children.length) wrap.remove();
      }
    });
    const seenBtn = stage.querySelector('.bd-seen-btn');
    const newN = Pins.newIds(s).length;
    if (seenBtn) {
      if (newN > 0) seenBtn.textContent = `Alles gezien (${newN})`;
      else seenBtn.remove();
    }
    this.scheduleThreads();
  },
  patchMapSelection(sh) {
    const stage = (sh && sh.stage) || (this._shell && this._shell.stage); if (!stage) return;
    stage.querySelectorAll('.stn[data-stn]').forEach((g) => {
      const on = g.dataset.stn === this.stn;
      g.classList.toggle('sel', on);
      g.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  },
  patchTableauHotspot(s, fam, sh) {
    const stage = (sh && sh.stage) || (this._shell && this._shell.stage); if (!stage) return;
    const canvas = stage.querySelector('.tv-canvas'); if (!canvas) return;
    const oldPop = canvas.querySelector('.tv-pop'); if (oldPop) oldPop.remove();
    const loc = World.here(s), part = s.clock.part, M = Tableau.model(s, loc.id, part);
    const popHtml = this.tableauPop(s, fam, M);
    if (popHtml) canvas.insertAdjacentHTML('beforeend', popHtml);
    stage.querySelectorAll('.tv-side .sp-chip[data-hs]').forEach((b) => {
      b.classList.toggle('on', b.dataset.hs === this.hot);
    });
    stage.querySelectorAll('g[data-hs]').forEach((g) => {
      g.classList.toggle('sel', g.dataset.hs === this.hot);
    });
  },
  patchIvApproach(sh) {
    const stage = (sh && sh.stage) || (this._shell && this._shell.stage); if (!stage) return;
    stage.querySelectorAll('.iv-bar [data-ui="approach"]').forEach((b) => {
      const on = b.dataset.v === this.approach;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  },
  // dynamic SVG thread underlay measured from actual DOM card rectangles
  stopBoardObserver() {
    if (this._boardRO) { try { this._boardRO.disconnect(); } catch (e) {} this._boardRO = null; }
    if (this._rafThreads && typeof cancelAnimationFrame === 'function') { cancelAnimationFrame(this._rafThreads); this._rafThreads = 0; }
  },
  observeBoard() {
    this.stopBoardObserver();
    if (typeof ResizeObserver === 'undefined') return;
    const bd = $('#app .bd'); if (!bd) return;
    this._boardRO = new ResizeObserver(() => this.scheduleThreads());
    this._boardRO.observe(bd);
  },
  scheduleThreads() {
    if (typeof requestAnimationFrame === 'function') {
      if (this._rafThreads) cancelAnimationFrame(this._rafThreads);
      this._rafThreads = requestAnimationFrame(() => { this._rafThreads = 0; this.drawThreads(); });
    } else {
      this.drawThreads();
    }
  },
  drawThreads() {
    const s = this.s; if (!s || this.screen || this.tab !== 'board' || this.boardMode !== 'board') return;
    const bd = $('#app .bd'), svg = bd && bd.querySelector('svg.bt'); if (!bd || !svg) return;
    const br = bd.getBoundingClientRect ? bd.getBoundingClientRect() : null;
    if (!br || !br.width || !br.height) return;
    const W = Math.max(1, Math.round(bd.scrollWidth || br.width)), H = Math.max(1, Math.round(bd.scrollHeight || br.height));
    const rects = {};
    bd.querySelectorAll('.bc[data-card]').forEach((el) => {
      const r = el.getBoundingClientRect();
      rects[el.dataset.card] = { x: r.left - br.left, y: r.top - br.top, w: r.width, h: r.height };
    });
    const L = this._boardLayout || Board.layout(s), byId = {}; L.cards.forEach((c) => { byId[c.id] = c; });
    const link = this.link && byId[this.link] ? this.link : null;
    const sel = link || (this.sel && byId[this.sel] ? this.sel : null);
    const hl = link ? new Set([link].concat(Pins.ends(s, link))) : sel ? Board.linked(s, L, sel) : null;
    let paths = '', dots = '';
    if (hl && sel && !link && rects[sel]) {
      const e = Evidence.get(s, sel.slice(2));
      if (e) e.requires.forEach((r) => {
        const tid = rects['d:' + r] ? 'd:' + r : rects['s:' + r] ? 's:' + r : null;
        if (tid) paths += `<path class="req hl" d="${Board.path(Board.anchorRect(rects[sel], rects[tid]), Board.anchorRect(rects[tid], rects[sel]), 'req')}"/>`;
      });
    }
    L.threads.forEach((t) => {
      const ra = rects[t.a], rb = rects[t.b]; if (!ra || !rb) return;
      const p1 = Board.anchorRect(ra, rb), p2 = Board.anchorRect(rb, ra);
      const on = !!(hl && hl.has(t.a) && hl.has(t.b));
      const mCls = t.kind === 'mine' ? ' m-' + (t.meaning || 'verband') : '';
      paths += `<path class="${t.kind}${mCls}${on ? ' hl' : ''}" d="${Board.path(p1, p2, t.kind)}"/>`;
      if (t.kind !== 'said') {
        const dCls = 'pt-' + (t.kind === 'mine' ? (t.meaning || 'verband') : t.kind) + (on ? ' hl' : '');
        dots += `<circle class="${dCls}" cx="${p1[0].toFixed(1)}" cy="${p1[1].toFixed(1)}" r="4"/><circle class="${dCls}" cx="${p2[0].toFixed(1)}" cy="${p2[1].toFixed(1)}" r="4"/>`;
      }
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    svg.innerHTML = paths + dots;
  },
  render(keepFocus) {
    if (this.screen) return this.renderScreen();
    const s = this.s, root = $('#app'); if (!s) return;
    clearTimeout(this.typeTimer);
    const focusSel = keepFocus ? this.captureFocus() : null;
    const fam = famOf(s), part = s.clock.part;
    root.dataset.part = String(Math.min(part, 3));
    const sh = this.ensureShell();
    sh.main.dataset.fam = fam;
    this.renderHead(s, sh);
    this.renderStage(s, fam, sh);
    this.renderDrawer(s, fam, sh);
    this.renderCoach(sh);
    if (focusSel) this.restoreFocus(focusSel);
  },
  // v0.6.5 (voorstel 11): a tap on the map selects a place first; this drawer replaces the hover tooltips and
  // prevents a mis-tap from opening a visit (which costs a part of the day)
  stnDetail(s, id) {
    const l = World.loc(s, id); if (!l) return '';
    const part = s.clock.part, night = part >= DAY.parts, open = World.openAt(l, part), v = s.visit;
    const allDay = l.open[0] === 0 && l.open[1] === 24;
    const tags = [];
    if (l.id === s.startLoc) tags.push('Hier logeer je.');
    if (!s.play.visited[l.id] && s.play.heardOf && (s.play.heardOfLoc || {})[l.id]) tags.push('Genoemd in je notities; je was er nog niet.');
    if (!v && s.pos === l.id) tags.push('Hier sta je nu.');
    if (l.id === s.crime.crimeLocationId) tags.push('Plaats van het voorval.');
    if (l.id === s.crime.victimLocationId) tags.push('Werk of woning van ' + s.crime.victim.name + '.');
    if (v && v.locId === l.id) tags.push('Hier ben je nu.');
    const present = open && !night ? s.cast.concat(s.crowd).filter((n) => Schedule.at(s, n.id, s.clock.day, part) === l.id) : [];
    const known = present.filter((n) => People.known(s, n.id)).sort(byName), unk = present.length - known.length;
    let h = `<button type="button" class="sp-x" data-ui="stnx">Sluiten</button><h3>${U.esc(l.name)}</h3><p class="sp-note">${U.esc(l.description)}</p>`;
    if (tags.length) h += `<p>${tags.map(U.esc).join(' ')}</p>`;
    h += `<h4>Openingstijden</h4><p class="sp-note">${allDay ? 'Altijd open.' : 'Open van ' + l.open[0] + ' tot ' + l.open[1] + ' uur.'} ${night ? 'Het is nu nacht.' : open ? 'Nu open, in de ' + PARTS[part] + '.' : 'Nu dicht, in de ' + PARTS[part] + '.'}</p>`;
    if (open && !night) {
      h += `<h4>Aanwezig in de ${PARTS[part]}</h4>`;
      h += known.length ? `<ul>${known.map((n) => `<li>${U.esc(n.name)}, ${U.esc(String(n.role).replace(/ \(.*\)$/, ''))}${People.isCore(s, n.id) ? '' : ' (bijfiguur)'}</li>`).join('')}</ul>` : '';
      h += unk > 0 ? `<p class="sp-note">${unk === 1 ? 'Eén persoon' : unk + ' mensen'} die je nog niet gesproken hebt.</p>` : (known.length ? '' : '<p class="sp-note">Niemand aanwezig.</p>');
    }
    if (v && v.locId === l.id) h += `<button type="button" class="sp-btn go wide" data-ui="tab" data-v="visit">Terug naar het bezoek</button>`;
    else if (v) h += `<p class="sp-note">Je bent nog in ${U.esc(World.here(s).name)}. Vertrek eerst.</p>`;
    else if (night) h += `<p class="sp-note">Sluit de dag af om morgen verder te gaan.</p>`;
    else { const T = Travel.check(s, l.id);
      if (T.late) h += `<button type="button" class="sp-btn wide" disabled>Te laat: je bent er pas om ${U.hm(T.at)}</button>`;
      else if (!T.open) h += `<button type="button" class="sp-btn wide" disabled>Dicht als je aankomt (${U.hm(T.at)}, ${PARTS[T.part]})</button>`;
      else if (T.here) h += `<button type="button" class="sp-btn go wide" data-ui="visit" data-v="${l.id}">Ga naar binnen in ${U.esc(l.name)}</button>`;
      else h += `<button type="button" class="sp-btn go wide" data-ui="visit" data-v="${l.id}">Ga naar ${U.esc(l.name)} (${T.walk} min lopen, aankomst ${U.hm(T.at)})</button>`; }
    return h;
  },
  dossierReady() { const f = Evidence.found(this.s); return f.some((e) => e.slot === 'motive') && f.some((e) => e.slot === 'method') && !this.s.play.ended; },
  // what just happened: a side drawer on the board and the map, a box in the visit panel
  feedLines() { const s = this.s; return this.feed.slice(-8).map((m) => `<p class="${m.k === 's' ? 'sys' : ''}">${m.who ? '<b>' + U.esc(m.who) + ':</b> ' : ''}${s ? Mentions.linkHtml(s, m.text) : U.esc(m.text)}</p>`).join(''); },
  feedHtml(cls) {
    if (!this.feed.length) return '';
    if (cls === 'drawer') return `<aside class="sp-drawer sp-feed"><button type="button" class="sp-x" data-ui="feedx">Sluiten</button><h3>Zojuist</h3>${this.feedLines()}</aside>`;
    return `<div class="${cls}">${this.feedLines()}</div>`;
  },
  tableauPop(s, fam, M) {
    const v = s.visit, sel = M.hs.find((x) => x.id === this.hot);
    if (!sel) return '';
    const cx = sel.kind === 'obj' ? sel.box.x + sel.box.w / 2 : sel.x;
    const cy = sel.kind === 'obj' ? sel.box.y + sel.box.h / 2 : sel.y - 135 * sel.k;
    const px = Math.max(16, Math.min(84, (cx / 960) * 100)).toFixed(1);
    const py = Math.max(14, Math.min(82, (cy / 540) * 100)).toFixed(1);
    let inner = `<button type="button" class="tv-pop-x" data-ui="hotx" aria-label="Sluiten">×</button>`;
    const rest = Clock.left(s), can = (k) => Level.cost(s, k) <= rest, mins = (k) => ' (' + Level.cost(s, k) + ' min)', outBtn = '<button type="button" class="sp-act" disabled>Daar is het te laat voor</button>';
    if (sel.kind !== 'obj') {
      const x = sel.ref, core = sel.kind === 'npc', known = People.known(s, x.id), label = Tableau.label(sel, s, M);
      if (!known) {
        inner += `<b>${U.esc(label)}</b><p class="sp-note">Je weet nog niet wie dit is.</p>` + (v.done[x.id] ? `<button type="button" class="sp-act" disabled>Al gesproken tijdens dit bezoek</button>` : can('greet') ? `<button type="button" class="sp-act live" data-ui="greet" data-v="${x.id}">Aanspreken${mins('greet')}</button>` : outBtn);
      } else if (core) {
        const tone = Rels.toneOf(s, x.id);
        inner += `<div class="row2"><div style="border:2px solid ${TONE_COLOR[tone]};background:${FAMILY[fam].photo}">${Silhouette.svg(x, { s: s, fam: fam, stance: TONE_STANCE[tone], w: 48 })}</div><div><b>${U.esc(x.name)}</b><br><span class="sp-note">${U.esc(x.role.replace(/ \(.*\)$/, ''))} · ${TONE_WORD[tone]}</span></div></div>` +
          (v.done[x.id] ? `<button type="button" class="sp-act" disabled>Al gesproken tijdens dit bezoek</button>` : can('talk') ? `<button type="button" class="sp-act live" data-ui="talk" data-v="${x.id}">Verhoren${mins('talk')}</button>` : outBtn);
      } else {
        inner += `<b>${U.esc(x.name)}</b><br><span class="sp-note">${U.esc(x.role)}, niet betrokken bij de zaak</span>` +
          (v.done[x.id] ? `<button type="button" class="sp-act" disabled>Al gesproken tijdens dit bezoek</button>` : can('mingle') ? `<button type="button" class="sp-act live" data-ui="mingle" data-v="${x.id}">Even praten${mins('mingle')}</button>` : outBtn);
      }
    } else {
      const clue = s.evidence.find((e) => e.source.objectId === sel.ref.id && s.play.found[e.id]);
      const early = !clue && s.play.early && s.play.early[sel.ref.id], seen = !clue && !early && s.play.examined && s.play.examined[sel.ref.id];
      inner += `<b>${U.esc(Rnd.cap(sel.ref.name))}</b>` +
        (clue ? `<p class="sp-note">Gevonden: <b>${U.esc(clue.title)}</b></p>`
          : early ? `<p class="sp-note"><b>Opvallend (?)</b>: Kom hier later terug zodra je meer weet.</p>`
          : seen ? `<p class="sp-note">Hier heb je al gekeken.</p>` : `<p class="sp-note">Van dichtbij bekijken</p>`) +
        (clue || seen ? '' : can('examine') ? `<button type="button" class="sp-act live" data-ui="examine" data-v="${sel.ref.id}">${early ? 'Opnieuw onderzoeken' : 'Onderzoeken'}${mins('examine')}</button>` : outBtn);
    }
    return `<div class="tv-pop" style="left:${px}%;top:${py}%">${inner}</div>`;
  },
  visitView(s, fam) {
    const v = s.visit;
    if (v && v.conv && typeof Interrogation !== 'undefined') {
      return Interrogation.html(s, fam, {
        approach: this.approach,
        deltas: this.deltas || {},
        showEvidence: !!this.showEv
      });
    }
    const loc = World.here(s), part = s.clock.part, M = Tableau.model(s, loc.id, part);
    const pop = this.tableauPop(s, fam, M);
    // v0.12.0: the clock of this part of the day; at its end people move on
    const now = Clock.norm(s), p0 = PART_START[part], p1 = Clock.partEnd(part), pct = Math.round(100 * (now - p0) / (p1 - p0));
    let side = `<h3>${U.esc(loc.name)}</h3><p class="sp-note">${U.esc(loc.description)}</p>` +
      `<div class="sp-att sp-time"><span>${U.hm(now)}</span><span class="tbar" role="progressbar" aria-label="Voortgang ${PARTS[part]} tot ${U.hm(p1)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></span><b>tot ${U.hm(p1)}</b></div>` +
      `<p class="sp-note">Aanspreken en onderzoeken kost ${Level.cost(s, 'examine')} minuten, verhoren ${Level.cost(s, 'talk')}. Binnen een gesprek zijn alle vragen gratis. Om ${U.hm(p1)} ${part < 2 ? 'gaan de mensen naar hun volgende plek' : 'is de dag voorbij'}.</p>`;
    const intro = loc.name + '. ' + loc.description, feedAll = this.feed;
    this.feed = feedAll.filter((m) => m.text !== intro);   // the description already stands above (v0.6.5)
    side += this.feedHtml('tv-msg'); this.feed = feedAll;
    const hasClue = (x) => x.kind === 'obj' && s.evidence.some((e) => e.source.objectId === x.ref.id && s.play.found[e.id]);
    const isEarly = (x) => x.kind === 'obj' && !hasClue(x) && s.play.early && s.play.early[x.ref.id];
    const seen = (x) => x.kind === 'obj' && !hasClue(x) && !isEarly(x) && s.play.examined && s.play.examined[x.ref.id];
    const chip = (x) => `<button type="button" class="sp-chip${this.hot === x.id ? ' on' : ''}${hasClue(x) || seen(x) || (x.kind !== 'obj' && v.done[x.ref.id]) ? ' done' : ''}${isEarly(x) ? ' early' : ''}" data-hs="${x.id}">${U.esc(Tableau.label(x, s, M))}</button>`;
    const ppl = M.hs.filter((x) => x.kind !== 'obj'), objs = M.hs.filter((x) => x.kind === 'obj');
    side += `<h4>Aanwezig in ${U.esc(loc.name)}</h4>${ppl.length ? `<div class="sp-chips">${ppl.map(chip).join('')}</div>` : '<p class="sp-note">Niemand aanwezig.</p>'}` +
      `<h4>Voorwerpen</h4><div class="sp-chips">${objs.map(chip).join('')}</div>`;
    return `<div class="tv"><div class="tv-stage"><div class="tv-canvas">${Tableau.svg(s, loc.id, part, fam, this.hot)}${pop}</div></div><aside class="tv-side">${side}</aside></div>`;
  },
  startVisit(locId) {
    const s = this.s, loc = World.loc(s, locId); if (!loc || s.play.ended) return;
    if (s.visit) { if (s.visit.locId === locId) { this.tab = 'visit'; return this.render(); } return this.toast('Je bent nog in ' + World.here(s).name + '. Vertrek eerst.'); }
    if (s.clock.part >= DAY.parts) return this.toast('Het is nacht. Sluit de dag af om morgen verder te gaan.');
    const T = Travel.check(s, locId);
    if (T.late) return this.toast('Je komt pas om ' + U.hm(T.at) + ' aan in ' + loc.name + '. Dat is te laat voor vandaag.');
    if (!T.open) return this.toast(loc.name + ' is dicht in de ' + PARTS[T.part] + (T.part !== s.clock.part ? ', als je er om ' + U.hm(T.at) + ' aankomt' : '') + '.');
    if (this.tab === 'board' && Act.see(s)) Store.put('auto', Save.pack(s));
    this.sel = null; this.stn = null; this.hot = null; this.deltas = {}; this.showEv = false; this.tab = 'visit';
    this.run((st) => Act.visit(st, locId));
  },

  /* ----- input ----- */
  act(el) {
    if (this.screenAct(el)) return;
    const d = el.dataset, s = this.s; if (!s) return;
    const harbor = s.world.locations.some((l) => l.template === 'haven');
    // v0.15.0: handle clickable mentions first so clicking inside .iv-paper never triggers skip-type
    if (d.mention) { SFX.pin(); return this.peek(d.mention); }
    if (d.card && this.link) {   // v0.11.0 / v0.14.0: pulling threads with optional meaning
      if (d.card === this.link) { SFX.paper(); this.sel = this.link; this.link = null; return this.render(true); }
      if (Act.thread(s, this.link, d.card, this.threadKind)) { SFX.pin(); Store.put('auto', Save.pack(s)); }
      return this.render(true);
    }
    if (d.card) {
      SFX.pin();
      this.sel = this.sel === d.card ? null : d.card;
      if (this.sel && Act.see(s, this.sel)) Store.put('auto', Save.pack(s));
      return this.render(true);
    }
    if (d.stn) { SFX.pin(); this.stn = this.stn === d.stn ? null : d.stn; return this.render(true); }
    if (d.hs) { SFX.pin(); this.hot = this.hot === d.hs ? null : d.hs; return this.render(true); }
    const u = d.ui || d.sp;
    switch (u) {
      case 'tab':
        SFX.paper();
        if (this.tab === 'board' && d.v !== 'board' && Act.see(s)) Store.put('auto', Save.pack(s));
        this.tab = d.v; this.sel = null; this.link = null; this.stn = null; this.hot = null;
        return this.render();
      case 'bmode':
        SFX.pin();
        if (d.v === 'board' || d.v === 'matrix') { this.boardMode = d.v; if (d.v === 'matrix') this.link = null; }
        return this.render(true);
      case 'thkind':
        SFX.pin();
        if (Pins.THREAD_KINDS[d.v]) this.threadKind = d.v;
        return this.render(true);
      case 'seen-all':
        SFX.pin();
        if (Act.see(s)) Store.put('auto', Save.pack(s));
        return this.render(true);
      case 'hint':
        SFX.paper();
        return this.hintBox();
      case 'mark':
        if (Act.mark(s, d.id, d.v)) { SFX.pin(); Store.put('auto', Save.pack(s)); }
        return this.render(true);
      case 'noteclr':
        if (Act.note(s, d.id, '')) { SFX.pin(); Store.put('auto', Save.pack(s)); }
        this.render(true);
        { const ni = $('#cardNote'); if (ni) ni.focus({ preventScroll: true }); }
        return;
      case 'stnx': this.stn = null; return this.render();
      case 'linkmode':
        SFX.pin(); this.boardMode = 'board'; this.link = d.v; this.sel = null;
        return this.render(true);
      case 'linkdone': SFX.paper(); this.sel = this.link; this.link = null; return this.render(true);
      case 'unthread': SFX.pin(); if (Act.thread(s, d.a, d.b)) Store.put('auto', Save.pack(s)); return this.render(true);
      case 'arch': { const z = Pins.zone(d.v); if (!Act.archive(s, d.v, true)) return; SFX.paper(); this.sel = null; Store.put('auto', Save.pack(s)); this.toast('In ' + Pins.FOLDER[z] + ' gelegd. Via het mapje haal je de kaart terug.'); return this.render(); }
      case 'archive': SFX.paper(); return this.archiveBox(d.v);
      case 'budgethelp': return this.toast('Je hebt vier dagen, elk van acht uur \'s ochtends tot tien uur \'s avonds. Lopen kost 15 tot 45 minuten, aanspreken en onderzoeken ' + Level.cost(s, 'examine') + ' minuten, verhoren ' + Level.cost(s, 'talk') + '. Om twaalf en om vijf uur gaan de mensen naar hun volgende plek. Na dag ' + DAY.soft + ' koelt het spoor af en wordt je eindverslag minder sterk.', 7000);
      case 'mute': return this.toggleMute();
      case 'hotx': this.hot = null; return this.render(true);
      case 'journal': SFX.paper(); return this.journal();
      case 'dossier': SFX.paper(); return this.dossier();
      case 'system': SFX.paper(); return this.system();
      case 'unsel': this.sel = null; this.link = null; return this.render();
      case 'feedx': this.feed = []; return this.render();
      case 'visit': SFX.paper(); return this.startVisit(d.v);
      case 'leave': {
        this.hot = null; this.deltas = {}; this.showEv = false;
        const r = this.run((st) => Act.leave(st));
        if (s.clock.part >= 2) SFX.bell(harbor); else SFX.paper();
        return r;
      }
      case 'wait': {
        if (s.visit || s.clock.part >= DAY.parts || s.play.ended) return;
        const endAt = Clock.partEnd(s.clock.part), skipMin = endAt - Clock.norm(s);
        const doWait = () => {
          const r = this.run((st) => Act.wait(st));
          if (s.clock.part >= 2) SFX.bell(harbor); else SFX.paper();
          return r;
        };
        if (skipMin > 60) {
          const untilTxt = s.clock.part < 2 ? 'de ' + PARTS[s.clock.part + 1] + ' (' + U.hm(endAt) + ')' : '22:00 (einde van de dag)';
          return this.confirm({
            title: 'Tijd overslaan?',
            body: '<p>Je slaat <b>' + skipMin + ' minuten</b> over tot ' + U.esc(untilTxt) + '.</p><p class="sys">Om ' + U.hm(endAt) + ' ' + (s.clock.part < 2 ? 'gaan de mensen naar hun volgende plek' : 'sluit de stad voor de nacht') + '.</p>',
            okLabel: 'Ja, wacht tot ' + U.hm(endAt),
            onOk: doWait
          });
        }
        return doWait();
      }
      case 'endday': {
        if (s.visit || s.clock.part < 2 || s.play.ended) return;
        const doEnd = () => { SFX.bell(harbor); return this.run((st) => Act.endDay(st)); };
        const hasTime = s.clock.part < DAY.parts, late = s.clock.day >= DAY.soft;
        if (hasTime || late) {
          const left = Math.max(0, DAY.end - Clock.norm(s)), home = World.loc(s, s.startLoc);
          let body = '';
          if (hasTime) body += '<p>Je hebt vandaag nog <b>' + left + ' minuten</b> over tot 22:00.</p>';
          if (late) body += '<p class="confirm-warn">Let op: na dag ' + DAY.soft + ' koelt het spoor af en wordt je eindverslag minder sterk.</p>';
          body += '<p class="sys">Morgenochtend begin je om 08:00 uitgerust in ' + U.esc(home ? home.name : 'je logies') + '.</p>';
          return this.confirm({
            title: 'Dag ' + s.clock.day + ' afsluiten?',
            body: body,
            okLabel: 'Ja, sluit dag ' + s.clock.day + ' af',
            danger: late,
            onOk: doEnd
          });
        }
        return doEnd();
      }
      case 'examine': SFX.paper(); this.hot = null; return this.run((st) => Act.examine(st, d.v));
      case 'mingle': SFX.pin(); this.hot = null; return this.run((st) => Act.mingle(st, d.v));
      case 'greet': {
        SFX.pin(); this.hot = null;
        if (People.isCore(s, d.v)) { SFX.paper(); this.feed = []; this.deltas = {}; this.showEv = false; return this.runConv((st) => Act.greet(st, d.v)); }
        return this.run((st) => Act.greet(st, d.v));
      }
      case 'talk': SFX.paper(); this.hot = null; this.feed = []; this.deltas = {}; this.showEv = false; return this.runConv((st) => Act.talkStart(st, d.v));
      case 'talkend': SFX.paper(); clearTimeout(this.typeTimer); this.hot = null; this.deltas = {}; this.showEv = false; this.feed = []; return this.run((st) => Act.talkEnd(st));
      case 'approach': SFX.pin(); this.approach = d.v; return this.render(true);
      case 'topic': SFX.paper(); return this.runConv((st) => Act.topic(st, st.visit.conv, d.v, this.approach));
      case 'confront': SFX.seal(); return this.runConv((st) => Act.confront(st, d.v));
      case 'treat': SFX.pin(); return this.runConv((st) => Act.treat(st, d.v));
      case 'evtoggle': SFX.paper(); this.showEv = !this.showEv; return this.render(true);
      case 'skip-type': return this.skipTranscript();
      case 'playev': {
        if (!s.visit || !s.visit.conv) return;
        const npc = World.npc(s, s.visit.conv);
        const match = Dialogue.confronts(s, npc).find((c) => c.counterEvidence === d.v);
        if (match) {
          SFX.seal();
          this.showEv = false;
          return this.runConv((st) => Act.confront(st, match.id));
        }
        SFX.pin();
        this.toast('Dit bewijsstuk weerlegt de verklaring van ' + U.first(npc) + ' niet.');
        return;
      }
    }
  },
  bind() {
    if (this.bound) return; this.bound = true; const root = $('#app');
    const target = (e) => e.target.closest('[data-mention],[data-ui],[data-sp],[data-card],[data-stn],[data-hs]');
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-ui="title"]')) { this.taps++; clearTimeout(this.tt); this.tt = setTimeout(() => { this.taps = 0; }, 650); if (this.taps >= 3) { this.taps = 0; Debug.open(); } return; }
      const t = target(e); if (t && t.tagName !== 'SELECT') this.act(t);
    });
    // v0.15.0: clickable mentions inside modals (#modal) open the spiekkaart (#peek) without closing the modal
    const mBody = $('#mBody');
    if (mBody) {
      mBody.addEventListener('click', (e) => {
        const mn = e.target.closest('[data-mention]');
        if (mn && this.s) { e.stopPropagation(); SFX.pin(); this.peek(mn.dataset.mention); }
      });
    }
    // live one-line card note editing without re-rendering the drawer or losing input focus
    root.addEventListener('input', (e) => {
      const inp = e.target;
      if (!inp || !inp.dataset || !inp.dataset.noteId || !this.s) return;
      const id = inp.dataset.noteId;
      Act.note(this.s, id, inp.value);
      const val = Pins.note(this.s, id);
      const cardNote = root.querySelector(`[data-card-note="${id}"]`);
      if (cardNote) { cardNote.textContent = val; cardNote.hidden = !val; }
      if (this.boardMode === 'board') this.scheduleThreads();
      this._stageKey = null;
      clearTimeout(this._noteSaveT);
      this._noteSaveT = setTimeout(() => { if (this.s) Store.put('auto', Save.pack(this.s)); }, 250);
    });
    root.addEventListener('change', (e) => {
      if (e.target.dataset.ui === 'theme') { this.setTheme(e.target.value); this.render(); }
      if (e.target.dataset.noteId && this.s) { Store.put('auto', Save.pack(this.s)); if (this.boardMode === 'matrix') this.render(true); }
    });
    document.addEventListener('keydown', (e) => {
      const peek = $('#peek'), modal = $('#modal');
      const topDlg = (peek && !peek.hidden) ? peek : (modal && !modal.hidden) ? modal : null;
      if (topDlg && e.key === 'Tab') {
        const focusables = Array.from(topDlg.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null || el.classList.contains('sr-only'));
        if (focusables.length) {
          const first = focusables[0], last = focusables[focusables.length - 1];
          if (e.shiftKey && (document.activeElement === first || !topDlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); return; }
          if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); return; }
        }
      }
      if (e.key === 'Escape') {
        if (peek && !peek.hidden) return this.closePeek();
        if (modal && !modal.hidden) return this.close();
        if (document.activeElement && document.activeElement.id === 'cardNote') { document.activeElement.blur(); return; }
        if (this.sel || this.link || this.hot || this.stn) { this.sel = null; this.link = null; this.hot = null; this.stn = null; this.render(); }
        return;
      }
      const radio = e.target.closest && e.target.closest('#app [role="radio"][data-ui="st-level"]');
      if (radio && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) >= 0) {
        e.preventDefault();
        const keys = Object.keys(LEVELS), idx = keys.indexOf(radio.dataset.v);
        const next = keys[(idx + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : keys.length - 1)) % keys.length];
        SFX.pin(); this.level = next; this.savePrefs(); this.renderScreen(next); return;
      }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const t = e.target.closest && e.target.closest('#app [data-card],#app [data-stn],#app [data-hs]'); if (!t || t.tagName === 'BUTTON') return;
      e.preventDefault(); this.act(t);
    });
    const hot = (e, on) => { const g = e.target.closest && e.target.closest('g[data-hs]'), svg = g && g.ownerSVGElement; if (!svg) return;
      svg.querySelectorAll('.tag.show').forEach((x) => x.classList.remove('show'));
      if (on) { svg.setAttribute('data-hot', '1'); const tag = svg.querySelector(`.tag[data-for="${g.dataset.hs}"]`); if (tag) tag.classList.add('show'); } };
    root.addEventListener('mouseover', (e) => hot(e, true)); root.addEventListener('focusin', (e) => hot(e, true));
    root.addEventListener('mouseout', (e) => hot(e, false));
    window.addEventListener('resize', () => { if (this.screen) return; if (this.tab === 'board' && this.boardMode === 'board') this.scheduleThreads(); const c = this.coachPick(); if (c) this.placeCoach(c); });
  },

  /* ----- modals, spiekkaart (#peek), confirmations & hints ----- */
  open(title, html, onClick, opt) {
    const modal = $('#modal'), wasHidden = modal.hidden;
    if (wasHidden) this.lastFocus = document.activeElement;
    $('#mTitle').textContent = title;
    $('#mBody').innerHTML = html;
    modal.hidden = false;
    $('#mBody').onclick = onClick || null;
    if (!(opt && opt.keepScroll)) $('#mBody').scrollTop = 0;
    if (!(opt && opt.keepFocus)) {
      const tgt = (opt && opt.focusSel && $('#mBody').querySelector(opt.focusSel)) || $('#mClose');
      if (tgt && tgt.focus) tgt.focus({ preventScroll: true });
    }
  },
  close() {
    this.closePeek();
    const modal = $('#modal');
    if (modal.hidden) return;
    modal.hidden = true;
    const prev = this.lastFocus;
    this.lastFocus = null;
    if (prev && prev.focus && (prev.isConnected === undefined || prev.isConnected)) prev.focus({ preventScroll: true });
  },
  closePeek() {
    const pk = $('#peek');
    if (!pk || pk.hidden) return;
    pk.hidden = true;
    const prev = this.peekFocus;
    this.peekFocus = null;
    if (prev && prev.focus && (prev.isConnected === undefined || prev.isConnected)) prev.focus({ preventScroll: true });
  },
  // v0.15.0: compact, leak-free spiekkaart for any clicked person or place mention
  peek(ref) {
    const s = this.s, pk = $('#peek'); if (!s || !pk || !ref) return;
    const fam = famOf(s), k = ref.split(':')[0], id = ref.slice(k.length + 1);
    const link = (txt) => Mentions.linkHtml(s, txt, { exclude: ref });
    let title = '', h = '', acts = [];
    if (k === 'p') {
      const n = World.npc(s, id); if (!n) return;
      title = n.name;
      if (s.play.met[id]) {
        const tone = Rels.toneOf(s, id), lv = Level.get(s);
        const mk = Pins.mark(s, ref), note = Pins.note(s, ref);
        h += `<div class="p-headrow"><div class="p-port" style="border-color:${TONE_COLOR[tone]};background:${FAMILY[fam].photo}">${Silhouette.svg(n, { s: s, fam: fam, stance: TONE_STANCE[tone], w: 64 })}</div>` +
          `<div><p class="p-role">${U.esc(n.role)}, ${n.age} jaar</p><p class="sp-note">Doet ${TONE_WORD[tone]} tegen je · houding: ${STANCE_LABEL[TONE_STANCE[tone]]}</p>` +
          (n.kenmerk ? `<p class="p-km"><b>Kenmerk:</b> ${U.esc(KENMERK[n.kenmerk].desc)}.</p>` : '') + `</div></div>`;
        const al = s.alibis && s.alibis[id], chk = s.play.alibiCheck && s.play.alibiCheck[id];
        if (al && s.play.asked[id + ':alibi']) {
          const comp = al.withId ? World.npc(s, al.withId) : null;
          h += `<h4>Alibi</h4><p>${link('Zegt om ' + s.truth.crimeHour + ' uur bij ' + World.loc(s, al.locId).name + ' te zijn geweest, ' + (comp ? 'met ' + comp.name : 'alleen') + '.')}</p>`;
          if (chk && lv.checkLabel) h += `<p class="sp-note">${link((String(chk.by).indexOf('obj:') === 0 ? 'Bevestigd door een gevonden stuk' : 'Gecontroleerd bij ' + World.npc(s, chk.by).name) + ': ' + (chk.ok ? 'klopt' : 'klopt niet') + '.')}</p>`;
        } else {
          h += `<p class="sp-note">Alibi nog niet gevraagd.</p>`;
        }
        h += Board.schedHtml(s, id);
        if (mk || note) {
          h += `<p class="p-my">` + (mk ? `<span class="bc-mark m-${mk}">${Pins.MARKS[mk].icon} ${U.esc(Pins.MARKS[mk].label)}</span> ` : '') + (note ? `<span>${U.esc(note)}</span>` : '') + `</p>`;
        }
        const nowLoc = s.clock.part < DAY.parts ? World.loc(s, Schedule.at(s, id, s.clock.day, s.clock.part)) : null;
        if (nowLoc) h += `<p class="sp-note">Nu (${PARTS[s.clock.part]}): ${link(nowLoc.name)}.</p>`;
        acts.push(`<button type="button" class="chip" data-peek-act="board" data-v="${U.esc(ref)}">Toon op zaakbord</button>`);
        if (nowLoc) acts.push(`<button type="button" class="chip" data-peek-act="map" data-v="${U.esc(nowLoc.id)}">Toon op kaart</button>`);
      } else {
        const hh = (s.play.heardOf || {})[id];
        h += `<div class="p-headrow"><div class="p-port p-blank">${Board.blank(60)}</div><div><p class="p-role">Nog niet ontmoet</p>` +
          `<p class="sp-note">${hh ? 'Genoemd ' + link(Mentions.source(s, hh)) + '.' : 'Genoemd in de tekst.'}</p></div></div>`;
        h += `<p class="sp-note">Je weet nog niet hoe ${U.esc(U.first(n))} eruitziet of wat ${U.pr(n).zijn} rol is. Spreek ${U.pr(n).hem} aan zodra je elkaar treft.</p>`;
        h += Board.schedHtml(s, id);
        if (Pins.ok(s, ref)) acts.push(`<button type="button" class="chip" data-peek-act="board" data-v="${U.esc(ref)}">Toon op zaakbord</button>`);
      }
    } else if (k === 'l') {
      const l = World.loc(s, id); if (!l) return;
      title = l.name;
      const part = s.clock.part, night = part >= DAY.parts, open = World.openAt(l, part), T = Travel.check(s, id);
      const allDay = l.open[0] === 0 && l.open[1] === 24;
      h += `<p class="sp-note">${allDay ? 'Altijd open.' : 'Open van ' + l.open[0] + ' tot ' + l.open[1] + ' uur.'} ${night ? 'Het is nu nacht.' : open ? 'Nu open (' + PARTS[part] + ').' : 'Nu dicht (' + PARTS[part] + ').'}</p>`;
      if (s.play.visited[id]) {
        h += `<p>${U.esc(l.description)}</p>`;
        if (open && !night) {
          const known = s.cast.filter((n) => s.play.met[n.id] && Schedule.at(s, n.id, s.clock.day, part) === id).sort(byName);
          if (known.length) h += `<h4>Bekende aanwezigen (${PARTS[part]})</h4><p>${known.map((n) => `<button type="button" class="mention m-p" data-mention="p:${U.esc(n.id)}">${U.esc(n.name)}</button>`).join(', ')}</p>`;
        }
      } else {
        h += `<p class="sp-note">Je bent hier nog niet geweest.${!T.here ? ' Lopen kost ' + T.walk + ' minuten.' : ''}</p>`;
      }
      acts.push(`<button type="button" class="chip" data-peek-act="map" data-v="${U.esc(id)}">Toon op kaart</button>`);
      if (!s.visit && !s.play.ended && !night && T.open && !T.late) {
        acts.push(`<button type="button" class="chip hot" data-peek-act="visit" data-v="${U.esc(id)}">${T.here ? 'Ga naar binnen' : 'Ga erheen (' + T.walk + ' min)'}</button>`);
      }
    } else return;

    if (acts.length) h += `<div class="p-acts">${acts.join('')}</div>`;
    if (pk.hidden) this.peekFocus = document.activeElement;
    $('#pTitle').textContent = title;
    $('#pBody').innerHTML = h;
    pk.hidden = false;
    $('#pBody').scrollTop = 0;
    $('#pBody').onclick = (e) => {
      const mn = e.target.closest('[data-mention]');
      if (mn) { SFX.pin(); return this.peek(mn.dataset.mention); }
      const actBtn = e.target.closest('[data-peek-act]');
      if (!actBtn) return;
      const a = actBtn.dataset.peekAct, v = actBtn.dataset.v;
      SFX.paper();
      this.closePeek();
      this.close();
      if (a === 'board') {
        if (Pins.archived(s, v)) { Act.archive(s, v, false); Store.put('auto', Save.pack(s)); }
        this.tab = 'board'; this.boardMode = 'board'; this.sel = v; this.link = null;
        if (Act.see(s, v)) Store.put('auto', Save.pack(s));
        return this.render();
      }
      if (a === 'map') {
        this.tab = 'map'; this.stn = v; this.sel = null; this.link = null;
        return this.render();
      }
      if (a === 'visit') return this.startVisit(v);
    };
    const closeBtn = $('#pClose');
    if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll: true });
  },
  // v0.15.0: reusable accessible confirmation modal for irreversible / big steps
  confirm(opt) {
    const okCls = opt.danger ? 'hot danger' : 'hot';
    const h = `<div class="confirm-box">${opt.body || ''}<div class="confirm-acts">` +
      `<button type="button" class="chip" data-cf="cancel">${U.esc(opt.cancelLabel || 'Annuleren')}</button>` +
      `<button type="button" class="chip ${okCls}" data-cf="ok">${U.esc(opt.okLabel || 'Doorgaan')}</button>` +
      `</div></div>`;
    this.open(opt.title || 'Bevestigen', h, (e) => {
      const b = e.target.closest('[data-cf]'); if (!b) return;
      if (b.dataset.cf === 'cancel') {
        SFX.pin();
        if (opt.onCancel) return opt.onCancel();
        return this.close();
      }
      if (b.dataset.cf === 'ok') {
        this.close();
        if (opt.onOk) opt.onOk();
      }
    }, { focusSel: '[data-cf="cancel"]' });
  },
  // v0.15.0: optional 3-tier "Geef een zetje" modal powered by Hints.get (never leaks culprit)
  hintBox(tier) {
    const s = this.s; if (!s || s.play.ended) return;
    if (this.hintTurn !== s.turn) { this.hintTurn = s.turn; this.hintTier = 1; }
    if (typeof tier === 'number') this.hintTier = Math.max(1, Math.min(3, tier));
    const h = Hints.get(s, this.hintTier);
    if (!h) return;
    const labels = ['1. Richting', '2. Specifieker', '3. Verband'];
    const steps = labels.map((lb, idx) => {
      const n = idx + 1;
      return `<button type="button" class="hint-step${h.tier === n ? ' on' : n < h.tier ? ' done' : ''}" data-htier="${n}" aria-current="${h.tier === n ? 'step' : 'false'}">${lb}</button>`;
    }).join('');
    let body = `<div class="hint-box">` +
      `<div class="hint-steps" role="group" aria-label="Hint-stappen">${steps}</div>` +
      `<h3>${U.esc(h.title)}</h3>` +
      `<p class="hint-txt">${Mentions.linkHtml(s, h.text)}</p>` +
      `<div class="hint-acts">` +
        (h.hasNext ? `<button type="button" class="chip hot" data-hnext="${h.tier + 1}">Geef meer detail (trap ${h.tier + 1} van 3)</button>` : '<span class="sys">Dit is het meest concrete zetje voor je huidige sporen.</span>') +
      `</div>` +
      `<p class="sys">Deze hulp kijkt alleen naar je gevonden sporen en verraadt nooit wie de dader is. Tik op onderstreepte namen of plaatsen voor een spiekkaart.</p>` +
      `</div>`;
    this.open('Geef een zetje', body, (e) => {
      const nb = e.target.closest('[data-hnext]');
      if (nb) { SFX.pin(); return this.hintBox(+nb.dataset.hnext); }
      const sb = e.target.closest('[data-htier]');
      if (sb) { SFX.pin(); return this.hintBox(+sb.dataset.htier); }
    });
  },
  // v0.11.0: one archive folder per zone of the board; take a card back, or all of them
  archiveBox(zone) {
    const s = this.s, ids = Pins.inFolder(s, zone), fam = famOf(s);
    if (!ids.length) { this.close(); return this.render(); }
    const sub = (id) => { const k = id.split(':')[0], ref = id.slice(k.length + 1);
      if (k === 'p') {
        if (!s.play.met[ref]) return 'Nog niet ontmoet · genoemd ' + Mentions.source(s, (s.play.heardOf || {})[ref]) + '.';
        const n = World.npc(s, ref); return n ? n.role.replace(/ \(.*\)$/, '') : '';
      }
      if (k === 'l') {
        if (!s.play.visited[ref]) return 'Nog niet bezocht.';
        const l = World.loc(s, ref); return l ? l.description : '';
      }
      if (k === 'o') {
        const l = s.world.locations.find((x) => x.objects.some((o) => o.id === ref));
        return l ? 'Bij ' + l.name + '. Nog bekijken zodra je meer weet.' : 'Nog bekijken.';
      }
      if (ref.indexOf('con_') === 0) { const c = s.contradictions.find((x) => x.id === ref); return c ? c.claim : ''; }
      const e = Evidence.get(s, ref); return e ? e.text : ''; };
    const items = ids.slice().sort((a, b) => Board.title(s, a).localeCompare(Board.title(s, b), 'nl'));
    let h = '<p class="sys">Wat hier ligt, telt gewoon mee in het zaakverslag. Je draadjes blijven bewaard.</p>' + items.map((id) => {
      const k = id.split(':')[0], ref = id.slice(k.length + 1), n = k === 'p' ? World.npc(s, ref) : null;
      const thumb = !n ? '' : s.play.met[ref]
        ? '<span class="jframe" style="background:' + FAMILY[fam].photo + '">' + Silhouette.svg(n, { s: s, fam: fam, w: 40 }) + '</span>'
        : '<span class="jframe">' + Board.blank(40) + '</span>';
      return '<div class="arch-it">' + thumb +
        '<div><b>' + U.esc(Board.title(s, id)) + '</b><small>' + U.esc(sub(id)) + '</small></div>' + this.btn('Terug op het bord', { x: 'unarch', v: id }) + '</div>'; }).join('');
    if (items.length > 1) h += '<div class="row">' + this.btn('Alles terug op het bord', { x: 'unarchall' }, 'hot') + '</div>';
    this.open(Pins.FOLDER[zone], h, (e) => {
      const t = e.target.closest('[data-x]'); if (!t) return;
      if (t.dataset.x === 'unarch') Act.archive(s, t.dataset.v, false);
      else if (t.dataset.x === 'unarchall') Pins.inFolder(s, zone).forEach((id) => Act.archive(s, id, false));
      else return;
      SFX.pin(); Store.put('auto', Save.pack(s)); this.render(); this.archiveBox(zone);
    });
  },
  journal(opt) {
    const s = this.s, p = s.play, fam = famOf(s);
    if (Pins.journalNew(s) > 0) { Act.seeJournal(s); Store.put('auto', Save.pack(s)); if (this._shell) this.renderHead(s, this._shell); }
    const foundEv = Evidence.found(s), claims = s.contradictions.filter((c) => p.heard[c.id]);
    const met = s.cast.filter((n) => p.met[n.id]).slice().sort(byName);
    const figs = s.crowd.filter((c) => p.metCrowd && p.metCrowd[c.id]).slice().sort(byName);
    const tab = this.jTab || 'overzicht';
    const tabs = [
      ['overzicht', 'Overzicht'],
      ['sporen', 'Sporen (' + foundEv.length + ')'],
      ['mensen', 'Mensen (' + met.length + ')'],
      ['log', 'Logboek']
    ];
    let h = '<div class="j-tabs" role="tablist" aria-label="Dagboek-onderdelen">' +
      tabs.map((t) => '<button type="button" role="tab" aria-selected="' + (tab === t[0]) + '" class="j-tab' + (tab === t[0] ? ' on' : '') + '" data-jtab="' + t[0] + '">' + U.esc(t[1]) + '</button>').join('') +
      '</div><div class="j-panel" role="tabpanel">';

    const renderLogEntries = (query) => {
      const list = s.log.slice(-80).filter((e) => {
        if (!query) return true;
        const who = e.k === 'p' || e.k === 'q' ? World.npc(s, e.npc).name : e.k === 'c' ? e.name : '';
        return (who + ' ' + e.text).toLowerCase().indexOf(query) >= 0;
      });
      return list.map((e) =>
        e.k === 'p' ? '<p><b><button type="button" class="mention m-p" data-mention="p:' + U.esc(e.npc) + '">' + U.esc(World.npc(s, e.npc).name) + '</button>:</b> ' + Mentions.linkHtml(s, e.text, { exclude: 'p:' + e.npc }) + '</p>' :
        e.k === 'q' ? '<p class="ask"><b>' + U.esc(U.first(s.protagonist)) + ' (vraag aan <button type="button" class="mention m-p" data-mention="p:' + U.esc(e.npc) + '">' + U.esc(U.first(World.npc(s, e.npc))) + '</button>):</b> <i>' + Mentions.linkHtml(s, e.text, { exclude: 'p:' + e.npc }) + '</i></p>' :
        e.k === 'c' ? '<p><b>' + U.esc(e.name) + ':</b> ' + Mentions.linkHtml(s, e.text) + '</p>' :
        '<p class="' + (e.k === 's' ? 'sys' : 'narr') + '">' + Mentions.linkHtml(s, e.text) + '</p>'
      ).join('') || '<p class="sys">Geen regels gevonden voor "' + U.esc(query) + '".</p>';
    };

    if (tab === 'overzicht') {
      h += '<h3>De zaak</h3><p class="narr">' + Mentions.linkHtml(s, s.crime.summary + ' ' + s.crime.personalHook) + '</p>';
      h += '<div class="j-stats">' +
        '<div class="j-stat"><b>' + foundEv.length + '</b><span>Sporen</span></div>' +
        '<div class="j-stat"><b>' + claims.length + '</b><span>Verklaringen</span></div>' +
        '<div class="j-stat"><b>' + met.length + '</b><span>Mensen gesproken</span></div>' +
        '<div class="j-stat"><b>Dag ' + s.clock.day + '</b><span>' + U.hm(Clock.norm(s)) + ' · ' + PARTS[s.clock.part] + '</span></div>' +
        '</div>';
      if (!s.play.ended) {
        const hard = Level.id(s) === 'moeilijk';
        h += '<div class="j-hint-row"><p class="sys">' + (hard ? 'Op Moeilijk staan hints standaard uit, maar je kunt altijd vrijblijvend een zetje vragen.' : 'Loop je even vast? Vraag een stapsgewijs zetje op basis van je huidige sporen.') + '</p>' +
          '<button type="button" class="chip" data-jhint="1">' + (hard ? 'Toch een zetje vragen' : 'Geef een zetje') + '</button></div>';
      }
      if (s.meta.settingSummary) h += '<h3>De stad</h3><p class="narr">' + Mentions.linkHtml(s, s.meta.settingSummary) + '</p>';
      if (claims.length) {
        h += '<h3>Open verklaringen</h3>' + claims.map((c) => '<div class="ev' + (p.resolved[c.id] ? ' debunked' : '') + '"><b><button type="button" class="mention m-p" data-mention="p:' + U.esc(c.npcId) + '">' + U.esc(World.npc(s, c.npcId).name) + '</button></b>' + (p.resolved[c.id] ? ' <i>(doorgeprikt)</i>' : '') + '<p>' + Mentions.linkHtml(s, c.claim, { exclude: 'p:' + c.npcId }) + '</p></div>').join('');
      }
    } else if (tab === 'sporen') {
      h += '<h3>Gevonden sporen</h3>' + (foundEv.map((e) => '<div class="ev ' + (p.debunked[e.id] ? 'debunked' : '') + '"><b>' + U.esc(e.title) + '</b>' + (p.debunked[e.id] ? ' <i>(weerlegd)</i>' : '') + '<p>' + Mentions.linkHtml(s, e.text) + '</p></div>').join('') || '<p class="sys">Je hebt nog geen sporen gevonden.</p>');
      if (claims.length) h += '<h3>Verklaringen</h3>' + claims.map((c) => '<div class="ev' + (p.resolved[c.id] ? ' debunked' : '') + '"><b><button type="button" class="mention m-p" data-mention="p:' + U.esc(c.npcId) + '">' + U.esc(World.npc(s, c.npcId).name) + '</button></b>' + (p.resolved[c.id] ? ' <i>(doorgeprikt)</i>' : '') + '<p>' + Mentions.linkHtml(s, c.claim, { exclude: 'p:' + c.npcId }) + '</p></div>').join('');
    } else if (tab === 'mensen') {
      h += '<h3>Betrokkenen</h3>' + (met.map((n) => {
        const t = Rels.toneOf(s, n.id), tips = Mentions.schedOf(s, n.id);
        const tipLine = tips.length ? '<br><span class="sys">Roostertip: ' + tips.map((x) => {
          const l = World.loc(s, x.locId);
          return PARTS[x.part] + ' bij ' + (l ? '<button type="button" class="mention m-l" data-mention="l:' + U.esc(l.id) + '">' + U.esc(l.name) + '</button>' : '?');
        }).join(' · ') + '</span>' : '';
        return '<div class="person"><span class="jframe" style="border-color:' + TONE_COLOR[t] + ';background:' + FAMILY[fam].photo + '">' + Silhouette.svg(n, { s: s, fam: fam, stance: TONE_STANCE[t], w: 44 }) + '</span><div><b><button type="button" class="mention m-p" data-mention="p:' + U.esc(n.id) + '">' + U.esc(n.name) + '</button></b>, ' + U.esc(n.role) + (n.kenmerk ? '. ' + U.esc(Rnd.cap(KENMERK[n.kenmerk].desc)) : '') + '<br><span class="sys">Doet ' + TONE_WORD[t] + ' tegen je.' + this.alibiNote(s, n) + '</span>' + tipLine + '</div></div>';
      }).join('') || '<p class="sys">Je hebt nog niemand gesproken.</p>');
      if (figs.length) h += '<h3>Bijfiguren</h3><p class="sys">' + figs.map((c) => U.esc(c.name + ', ' + c.role)).join(' · ') + '</p>';
    } else {
      const q = (this.jQuery || '').trim().toLowerCase();
      h += '<div class="j-search"><label for="jSearch" class="sr-only">Zoek in logboek</label><input id="jSearch" type="search" placeholder="Zoek op naam, plaats of woord…" value="' + U.esc(this.jQuery || '') + '"></div>';
      h += '<div id="jLogList">' + renderLogEntries(q) + '</div>';
    }
    h += '</div>';

    this.open('Dagboek', h, (e) => {
      const hb = e.target.closest('[data-jhint]');
      if (hb) { SFX.paper(); return this.hintBox(); }
      const tb = e.target.closest('[data-jtab]');
      if (tb) { SFX.pin(); this.jTab = tb.dataset.jtab; this.journal({ focusSel: '[data-jtab="' + this.jTab + '"]' }); }
    }, opt);
    const inp = $('#jSearch');
    if (inp) {
      inp.oninput = () => {
        this.jQuery = inp.value;
        const box = $('#jLogList'); if (!box) return;
        box.innerHTML = renderLogEntries(inp.value.trim().toLowerCase());
      };
    }
  },
  // what the player knows about someone's alibi, in one short sentence (journal)
  alibiNote(s, n) {
    const a = s.alibis && s.alibis[n.id]; if (!a || !s.play.asked[n.id + ':alibi']) return '';
    const comp = a.withId ? World.npc(s, a.withId) : null, chk = s.play.alibiCheck && s.play.alibiCheck[n.id];
    let t = ' Alibi: ' + World.loc(s, a.locId).name + (comp ? ', met ' + comp.name : ', alleen') + '.';
    if (chk && Level.get(s).checkLabel) t += String(chk.by).indexOf('obj:') === 0 ? ' Een stuk bevestigt het.' : ' ' + World.npc(s, chk.by).name + (chk.ok ? ' bevestigt het.' : ' spreekt het tegen.');
    return Mentions.linkHtml(s, t, { exclude: 'p:' + n.id });
  },
  dossier() {
    const s = this.s, d = s.player.dossier, f = Evidence.found(s), fam = famOf(s);
    const styleId = (s.meta && s.meta.dna && s.meta.dna.styles) || 'gezelschap';
    const sr = STYLE_REPORT[styleId] || STYLE_REPORT.gezelschap;
    const crimeloc = World.loc(s, s.crime.crimeLocationId);

    // Ensure active slot defaults to the first unfilled blank
    if (!this.zvSlot || (d[this.zvSlot] && (!d.suspectId || !d.motiveEvidenceId || !d.methodEvidenceId))) {
      this.zvSlot = !d.suspectId ? 'suspectId' : !d.motiveEvidenceId ? 'motiveEvidenceId' : !d.methodEvidenceId ? 'methodEvidenceId' : this.zvSlot;
    }
    const curSlot = this.zvSlot || 'suspectId';

    const sus = d.suspectId ? World.npc(s, d.suspectId) : null;
    const mot = d.motiveEvidenceId ? Evidence.get(s, d.motiveEvidenceId) : null;
    const met = d.methodEvidenceId ? Evidence.get(s, d.methodEvidenceId) : null;

    const blank = (slot, val, placeholder) => {
      const on = curSlot === slot ? ' active' : '';
      const filled = val ? ' filled' : '';
      return `<button type="button" class="zv-blank${on}${filled}" data-zslot="${slot}">${U.esc(val || placeholder)}</button>`;
    };

    const suspects = s.cast.filter((n) => s.play.met[n.id]).slice().sort(byName).map((n) => ({
      id: n.id,
      title: n.name,
      sub: n.role.replace(/ \(.*\)$/, '') + (n.kenmerk ? ' · ' + KENMERK[n.kenmerk].label : '') + (s.play.cleared[n.id] && Level.get(s).checkLabel ? ' · alibi bevestigd' : '') +
        (() => { const k = Pins.ends(s, 'p:' + n.id).length; return k ? ' · ' + k + (k === 1 ? ' draadje' : ' draadjes') : ''; })(),
      warn: !!s.play.cleared[n.id] && Level.get(s).dim
    }));
    const motives = f.filter((e) => e.slot === 'motive').map((e) => ({
      id: e.id,
      title: e.title,
      sub: (e.item ? Rnd.cap(e.item) : 'Verklaring') + (s.play.debunked[e.id] ? ' · weerlegd' : ''),
      warn: !!s.play.debunked[e.id]
    }));
    const methods = f.filter((e) => e.slot === 'method').map((e) => ({
      id: e.id,
      title: e.title,
      sub: (e.item ? Rnd.cap(e.item) : 'Doorgeprikt alibi') + (s.play.debunked[e.id] ? ' · weerlegd' : ''),
      warn: !!s.play.debunked[e.id]
    }));

    const slotMeta = {
      suspectId:        { label: '1. Kies de dader (alleen mensen die je hebt gesproken)', items: suspects },
      motiveEvidenceId: { label: '2. Kies het bewijsstuk voor het motief', items: motives },
      methodEvidenceId: { label: '3. Kies het bewijsstuk voor de werkwijze of het gebroken alibi', items: methods }
    }[curSlot];

    const ready = !!(sus && mot && met);
    let h = `<div class="zv" data-fam="${fam}">
      <div class="zv-sheet">
        <div class="zv-head">
          <span>${U.esc(sr.badge)}</span>
          <small>${U.esc(s.world.city.name)} · Dag ${s.clock.day}, ${PARTS[Math.min(s.clock.part, 2)]} · ${U.esc(Level.get(s).label)}</small>
        </div>
        <p class="zv-intro">${U.esc(sr.intro)}</p>
        <div class="zv-madlibs">
          <p>Uit het onderzoek in <b>${U.esc(s.world.city.name)}</b> blijkt dat het voorval rond <b>${U.esc(s.crime.victim.name)}</b> bij ${U.esc(crimeloc ? crimeloc.name : s.world.city.name)} — dat aanvankelijk doorging voor <i>${U.esc(s.crime.publicVersion)}</i> — het werk is van ${blank('suspectId', sus ? sus.name : null, '[ 1. Kies verdachte ]')}.</p>
          <p>De drijfveer achter de daad wordt sluitend aangetoond door ${blank('motiveEvidenceId', mot ? mot.title : null, '[ 2. Kies motief-bewijs ]')}, terwijl de werkwijze en aanwezigheid ter plekke vaststaan dankzij ${blank('methodEvidenceId', met ? met.title : null, '[ 3. Kies werkwijze / alibi-bewijs ]')}.</p>
        </div>
        <div class="zv-foot">
          <span>Opgemaakt door <b>${U.esc(s.protagonist.name)}</b> (${U.esc(s.protagonist.background)})</span>
          ${ready && !s.play.ended ? `<button type="button" class="zv-seal" data-f="accuse">Onderteken &amp; Sluit de zaak</button>` : `<span class="sp-note">Vul alle drie de velden in om te ondertekenen</span>`}
        </div>
      </div>
      <div class="zv-picker">
        <div class="zv-tabs">
          <button type="button" class="sp-chip${curSlot === 'suspectId' ? ' on' : ''}" data-zslot="suspectId">1. Verdachte ${sus ? '✓' : ''}</button>
          <button type="button" class="sp-chip${curSlot === 'motiveEvidenceId' ? ' on' : ''}" data-zslot="motiveEvidenceId">2. Motief ${mot ? '✓' : ''}</button>
          <button type="button" class="sp-chip${curSlot === 'methodEvidenceId' ? ' on' : ''}" data-zslot="methodEvidenceId">3. Werkwijze ${met ? '✓' : ''}</button>
        </div>
        <h4>${U.esc(slotMeta.label)}</h4>
        <div class="zv-cards">
          ${slotMeta.items.map((x) => `<button type="button" class="zv-card${d[curSlot] === x.id ? ' on' : ''}${x.warn ? ' dim' : ''}" data-f="${curSlot}" data-v="${U.esc(x.id)}">
            <b>${U.esc(x.title)}</b><small>${U.esc(x.sub)}</small>
          </button>`).join('') || '<p class="sys">Nog geen geschikte personen of sporen gevonden voor dit veld.</p>'}
        </div>
        <p class="sys" style="margin-top:8px">Let op: een onjuiste aanklacht kost vertrouwen in de stad én de rest van het dagdeel.</p>
      </div>
    </div>`;

    this.open('Zaakverslag', h, (e) => {
      const slotBtn = e.target.closest('[data-zslot]');
      if (slotBtn) { this.zvSlot = slotBtn.dataset.zslot; return this.dossier(); }
      const t = e.target.closest('button[data-f]'); if (!t || s.play.ended) return;
      if (t.dataset.f === 'accuse') {
        if (!ready) return this.toast('Het zaakverslag is nog niet compleet.');
        const warns = [];
        if (s.play.cleared[sus.id] && Level.get(s).checkLabel) warns.push('Het alibi van ' + sus.name + ' staat als bevestigd genoteerd.');
        if (s.play.debunked[mot.id]) warns.push('"' + mot.title + '" is eerder weerlegd.');
        if (s.play.debunked[met.id]) warns.push('"' + met.title + '" is eerder weerlegd.');
        const body = `<p>Controleer je aanklacht voordat je ondertekent:</p>` +
          `<ul class="confirm-list">` +
            `<li><span>Verdachte:</span> <b>${U.esc(sus.name)}</b></li>` +
            `<li><span>Motief-bewijs:</span> <b>${U.esc(mot.title)}</b></li>` +
            `<li><span>Werkwijze-bewijs:</span> <b>${U.esc(met.title)}</b></li>` +
          `</ul>` +
          (warns.length ? `<p class="confirm-warn">${warns.map(U.esc).join(' ')}</p>` : '') +
          `<p class="sys">Een onjuiste aanklacht kost vertrouwen in de stad én de rest van het dagdeel.</p>`;
        return this.confirm({
          title: 'Aanklacht indienen?',
          body: body,
          okLabel: 'Ja, dien aanklacht in',
          cancelLabel: 'Terug naar zaakverslag',
          danger: warns.length > 0,
          onCancel: () => this.dossier(),
          onOk: () => { SFX.seal(); this.run((st) => Act.accuse(st)); }
        });
      }
      const field = t.dataset.f, nextVal = d[field] === t.dataset.v ? null : t.dataset.v;
      Act.setDossier(s, field, nextVal);
      if (nextVal) {
        if (!d.suspectId) this.zvSlot = 'suspectId';
        else if (!d.motiveEvidenceId) this.zvSlot = 'motiveEvidenceId';
        else if (!d.methodEvidenceId) this.zvSlot = 'methodEvidenceId';
      }
      Store.put('auto', Save.pack(s)); this.dossier(); this.render();
    });
  },
  ending() {
    const e = this.s.play.ended; if (!e) return;
    const sr = STYLE_REPORT[e.styleId] || STYLE_REPORT.gezelschap;
    this.open('De Ontknoping · ' + sr.badge, e.text.map((t) => '<p class="narr">' + U.esc(t) + '</p>').join('') + '<h3>Wat er van hen werd</h3>' + e.epilogue.map((t) => '<p class="narr">' + U.esc(t) + '</p>').join('') +
      '<p class="sys">Opgelost op dag ' + e.stats.day + '. Sporen: ' + e.stats.found + ' van ' + e.stats.total + '. Valse beschuldigingen: ' + e.stats.wrong + '.</p><div class="row">' + this.btn('Nieuw spel', { x: 'new' }, 'hot') + '</div>',
      (ev) => { if (ev.target.closest('[data-x="new"]')) this.showStart(); });
  },
  contentReport(res) {
    const r = res.rep;
    let h = res.ok ? '<p class="narr">Pakket <b>' + U.esc(Content.cur.name) + '</b> is actief.</p><p class="sys">' + r.added + (r.added === 1 ? ' regel' : ' regels') + ' toegevoegd, ' + r.dropped + ' geweigerd. ' +
      r.missing + ' van ' + Object.keys(Content.SCHEMA).length + ' sleutels staan niet in het pakket; daar wordt de standaardtekst gebruikt.</p>' +
      '<p class="sys">Gesprekken, figuranten en vertelling gebruiken het pakket direct. Sporen en verklaringen van het lopende spel liggen al vast; start een nieuw spel om ook die te zien.</p>'
      : '<p class="bad">Het pakket is niet geladen.</p>' + r.errors.map((x) => '<p class="sys">' + U.esc(x) + '</p>').join('');
    if (r.warnings.length) h += '<h3>Meldingen (' + r.warnings.length + ')</h3>' + r.warnings.slice(0, 40).map((x) => '<p class="sys">' + U.esc(x) + '</p>').join('') + (r.warnings.length > 40 ? '<p class="sys">…</p>' : '');
    if (res.ok && r.missing) h += '<h3>Terugval op standaard</h3><p class="sys">' + U.esc(r.missingKeys.slice(0, 30).join(', ')) + (r.missing > 30 ? ' …' : '') + '</p>';
    this.open('Contentpakket', h);
  },
  download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); },
  async system(opt) {
    const s = this.s, b = this.btn, slots = [];
    for (let i = 1; i <= 3; i++) { const raw = await Store.get('slot' + i); let m = null; try { m = raw ? JSON.parse(raw) : null; } catch (e) { m = null; }
      slots.push(!m ? 'leeg' : m.schema !== APP.schema ? 'oude versie (schema ' + (m.schema || '?') + ')' : m.meta.title + ', ' + U.time(m.clock)); }
    const seg = (label, key, cur, opts) => '<div class="sys-row"><span class="sys-lbl">' + label + '</span><div class="row seg">' +
      opts.map((o) => b(o[1], { x: key, v: o[0] }, cur === o[0] ? 'on' : '')).join('') + '</div></div>';
    let h = '<h3>Weergave &amp; leesgemak</h3>' +
      seg('Thema', 'theme', this.theme, [['auto', 'Systeem'], ['light', 'Licht'], ['dark', 'Donker']]) +
      seg('Tekstgrootte', 'size', this.size, [['normal', 'Normaal'], ['large', 'Groot'], ['xlarge', 'Extra groot']]) +
      seg('Lettertype', 'font', this.font, [['classic', 'Klassiek papier'], ['plain', 'Rustig leesfont']]) +
      seg('Geluid', 'sound', SFX.muted ? 'off' : 'on', [['on', 'Aan'], ['off', 'Uit']]) +
      '<p class="sys">Rustig leesfont vervangt cursieve en typemachine-lettertypen door een strak leeslettertype.</p>';
    h += '<h3>Opslaan en laden</h3>' + slots.map((m, i) => '<div class="row"><span class="slot">Slot ' + (i + 1) + ': ' + U.esc(m) + '</span>' + b('Opslaan', { x: 'save', v: i + 1 }) + b('Laden', { x: 'load', v: i + 1 }, m === 'leeg' ? 'dim' : '') + '</div>').join('');
    h += '<p class="sys">Er wordt na elke actie automatisch opgeslagen.</p><div class="row">' + b('Exporteer als bestand', { x: 'export' }) + '<label class="chip file">Importeer bestand<input type="file" accept="application/json,.json" id="imp" class="sr-only"></label></div>';
    if (this.oldRaw) h += '<p class="sys">Je vorige spel komt uit een oudere versie en kan niet meer geladen worden. Je kunt het bestand wel bewaren.</p><div class="row">' + b('Bewaar het oude bestand', { x: 'oldsave' }) + b('Vergeet het oude bestand', { x: 'oldforget' }, 'quiet') + '</div>';
    const LV_TXT = { makkelijk: 'Het bord trekt de draadjes voor je, verdachten met een bevestigd alibi vallen vanzelf af en opvallende plekken krijgen een vraagteken.',
      normaal: 'Je trekt de draadjes zelf. Een alibi valt pas af als je het controleert bij de persoon die het noemt. Opvallende plekken krijgen een vraagteken.',
      moeilijk: 'Geen vraagtekens, geen labels bij alibi\'s en geen hint na een scherpe vraag. Wat je hoort, staat alleen in je dagboek.' };
    const cur = Level.id(s);
    h += '<h3>Moeilijkheid</h3><div class="zv-cards lvl-pick">' + Object.keys(LEVELS).map((k) => '<button type="button" class="zv-card' + (cur === k ? ' on' : '') + '" data-x="level" data-v="' + k + '"><b>' + LEVELS[k].label + '</b><small>' + U.esc(LV_TXT[k]) + '</small></button>').join('') + '</div>' +
      '<p class="sys">Wisselen kan altijd. Het verandert alleen de hulp, niet de zaak zelf.</p>';
    h += '<h3>Nieuw spel</h3><div class="row">' + b('Nieuwe zaak', { x: 'start' }, 'hot') + '</div><p class="sys">Met een seed speel je een vaste zaak, bijvoorbeeld om te testen.</p><div class="row"><input id="seedIn" placeholder="seed" autocapitalize="off" autocomplete="off">' + b('Begin met deze seed', { x: 'new' }) + '</div>';
    h += '<h3>Uitleg</h3><p class="sys">Het begeleide eerste bezoek en de tips over alibi\'s en draadjes komen terug bij je volgende bezoek.</p><div class="row">' + b('Uitleg opnieuw', { x: 'intro' }) + '</div>';
    const isBase = Content.cur === Content.base;
    h += '<h3>Contentpakket</h3><p class="sys">Actief: <b>' + U.esc(Content.cur.name) + '</b>, ' + Content.count(Content.cur) + ' tekstregels. Een geïmporteerd pakket wordt samengevoegd met de standaard; wat ontbreekt, komt uit de standaard.</p>' +
      '<div class="row"><label class="chip file">Importeer contentpakket<input type="file" accept="application/json,.json" id="impContent" class="sr-only"></label>' + b('Exporteer standaardpakket', { x: 'cexport' }) + b('Herstel standaard', { x: 'creset' }, isBase ? 'dim' : '') + '</div>';
    h += '<p class="sys">' + APP.title + ' ' + APP.version + ', seed: ' + U.esc(s.seed) + '. Volledig offline. Klik drie keer op de titel voor het debug-paneel.</p>';
    this.open('Systeem', h, async (e) => {
      const t = e.target.closest('button[data-x]'); if (!t) return;
      const x = t.dataset.x, v = t.dataset.v;
      if (x === 'theme') { SFX.pin(); this.setTheme(v); this.render(); return this.system({ keepScroll: true, focusSel: 'button[data-x="theme"][data-v="' + v + '"]' }); }
      if (x === 'size') { SFX.pin(); this.setSize(v); if (this.tab === 'board' && this.boardMode === 'board') this.scheduleThreads(); return this.system({ keepScroll: true, focusSel: 'button[data-x="size"][data-v="' + v + '"]' }); }
      if (x === 'font') { SFX.pin(); this.setFont(v); if (this.tab === 'board' && this.boardMode === 'board') this.scheduleThreads(); return this.system({ keepScroll: true, focusSel: 'button[data-x="font"][data-v="' + v + '"]' }); }
      if (x === 'sound') { SFX.muted = (v === 'off'); this.savePrefs(); if (!SFX.muted) SFX.pin(); this.render(); return this.system({ keepScroll: true, focusSel: 'button[data-x="sound"][data-v="' + v + '"]' }); }
      if (x === 'save') { await Store.put('slot' + v, Save.pack(s)); this.toast('Opgeslagen in slot ' + v + '.'); this.system({ keepScroll: true }); }
      if (x === 'load') { const raw = await Store.get('slot' + v); if (!raw) return; try { this.close(); this.load(Save.unpack(raw)); this.toast('Slot ' + v + ' geladen.'); } catch (err) { this.toast(err.message, 9000); } }
      if (x === 'export') this.download('het-spoor-' + s.seed + '-dag' + s.clock.day + '.json', Save.pack(s));
      if (x === 'oldsave') this.download('het-spoor-oude-save.json', this.oldRaw);
      if (x === 'oldforget') { await Store.put('oldAuto', ''); this.oldRaw = null; this.system({ keepScroll: true }); }
      if (x === 'start') this.showStart();
      if (x === 'new') { const seed = ($('#seedIn').value || '').trim(); if (seed) this.newGame(seed); else this.showStart(); }
      if (x === 'intro') { this.intro = Coach.fresh(); this.savePrefs(); this.toast('De uitleg begint opnieuw bij je volgende bezoek.'); this.system({ keepScroll: true }); }
      if (x === 'level') { SFX.pin(); this.setLevel(v); this.system({ keepScroll: true, focusSel: 'button[data-x="level"][data-v="' + v + '"]' }); }
      if (x === 'cexport') this.download('het-spoor-content-standaard.json', Content.rawText);
      if (x === 'creset') { if (Content.cur === Content.base) return; await Store.put('contentPack', ''); Content.reset(); this.toast('Standaardpakket hersteld.'); this.system({ keepScroll: true }); }
    }, opt);
    $('#impContent').onchange = (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader();
      r.onload = async () => { const res = Content.importPack(r.result); if (res.ok) await Store.put('contentPack', r.result); this.contentReport(res); }; r.readAsText(file); };
    $('#imp').onchange = (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader();
      r.onload = () => { try { this.close(); this.load(Save.unpack(r.result)); this.toast('Savegame geïmporteerd.'); } catch (err) { this.toast(err.message, 9000); } }; r.readAsText(file); };
  }
};

/* ---------------- Debug panel (triple click on the title) ---------------- */
const Debug = {
  tab: 'truth', day: null,
  open() { this.render(); },
  render() {
    const s = UI.s, b = UI.btn, T = s.truth, nm = (id) => { const n = id && World.npc(s, id); return n ? n.name : (id || '-'); };
    const tabs = [['truth', 'Waarheid'], ['ev', 'Bewijs'], ['rel', 'Relaties'], ['sched', 'Rooster'], ['fig', 'Figuren'], ['txt', 'Tekst'], ['act', 'Acties'], ['test', 'Tests']];
    let h = '<div class="row">' + tabs.map((t) => b(t[1], { d: 'tab', v: t[0] }, this.tab === t[0] ? 'on' : '')).join('') + '</div>';
    if (this.tab === 'truth') {
      h += '<pre>' + U.esc(['Seed: ' + s.seed, 'DNA: ' + JSON.stringify(s.meta.dna), 'Plot geldig: ' + s.meta.plotOk, 'Dader: ' + nm(T.culpritId) + ' (' + T.culpritId + ')' + (T.close ? ' (naaste, manipuleert)' : ''), 'Motief: ' + T.motive, 'Methode: ' + T.method,
        'Slachtoffer: ' + s.crime.victim.name, 'Plaats: ' + World.loc(s, s.crime.crimeLocationId).name + ', vals alibi: ' + World.loc(s, T.otherLocationId).name,
        'Verdachte A (rode haring): ' + nm(T.roles.suspA), 'Verdachte B (liegt over geheim): ' + nm(T.roles.suspB), 'Getuige: ' + nm(T.roles.witness), 'Vertrouweling: ' + nm(T.roles.confidant), 'Roddel: ' + nm(T.roles.gossip),
        'Tijd: ' + U.time(s.clock) + ', bezoeken: ' + (s.play.visits || 0) + (s.visit ? ', nu in ' + World.here(s).name : ''),
        'Checks: ' + (Game.check(s).join('; ') || 'alles in orde'), '', 'Tijdlijn:'].concat(T.timeline.map((x) => '  ' + x.when + ': ' + x.event)).join('\n')) + '</pre>';
    } else if (this.tab === 'ev') {
      h += '<div class="scroll"><table><tr><th>id</th><th>route</th><th>slot</th><th>wijst naar</th><th>vereist</th><th>bron</th><th></th></tr>' + s.evidence.map((e) => {
        const src = e.source.type === 'object' ? World.loc(s, e.source.locationId).name + ' / ' + World.loc(s, e.source.locationId).objects.find((o) => o.id === e.source.objectId).name : e.source.type === 'start' ? 'start' : e.source.type + ': ' + nm(e.source.npcId);
        return '<tr><td>' + e.id + '<br><small>' + U.esc(e.title) + '</small></td><td>' + e.route + '</td><td>' + (e.slot || '-') + '</td><td>' + U.esc(nm(e.pointsTo)) + '</td><td>' + e.requires.join(', ') + '</td><td>' + U.esc(src) + '</td><td>' + (s.play.found[e.id] ? 'gevonden' : b('Geef', { d: 'give', v: e.id })) + '</td></tr>';
      }).join('') + '</table></div>';
    } else if (this.tab === 'rel') {
      h += '<div class="scroll"><table><tr><th>NPC</th><th>thuis</th><th>T/A/R/S</th><th>toon</th><th>status</th></tr>' + s.cast.map((n) => { const r = s.relations[n.id];
        return '<tr><td>' + U.esc(n.name) + ' <small>' + n.id + '</small><br><small>' + U.esc(n.role) + ', ' + n.relationshipArc.type + '</small></td><td>' + U.esc(World.loc(s, n.locationId).name) + '</td><td>' + [r.trust, r.affection, r.resentment, r.suspicion].join('/') + '</td><td>' + Rels.toneOf(s, n.id) + '</td><td>' + U.esc(r.statusText) + (s.play.cleared[n.id] ? ', vrijgepleit' : '') + '</td></tr>'; }).join('') + '</table></div>';
      h += '<p class="sys">Figuranten: ' + s.crowd.length + '</p>';
    } else if (this.tab === 'sched') {
      const day = this.day || s.clock.day, cur = (p) => day === s.clock.day && p === s.clock.part, short = (id) => U.esc(World.loc(s, id).name);
      h += '<div class="row">' + [1, 2, 3, 4, 5, 6, 7].map((d) => b('Dag ' + d, { d: 'day', v: d }, d === day ? 'on' : '')).join('') + '</div>';
      const row = (n, crowd) => '<tr' + (crowd ? ' class="dim"' : '') + '><td>' + U.esc(n.name) + '<br><small>' + U.esc(n.role) + (crowd ? '' : ' · ' + n.id) + '</small></td>' + [0, 1, 2].map((p) => { const id = Schedule.at(s, n.id, day, p); return '<td' + (cur(p) ? ' class="now"' : '') + '>' + short(id) + (id === n.locationId ? ' <small>(thuis)</small>' : '') + '</td>'; }).join('') + '</tr>';
      h += '<div class="scroll"><table class="sched"><tr><th>persoon</th>' + [0, 1, 2].map((p) => '<th' + (cur(p) ? ' class="now"' : '') + '>' + PARTS[p] + '</th>').join('') + '</tr>' +
        s.cast.map((n) => row(n, false)).join('') + s.crowd.map((c) => row(c, true)).join('') + '</table></div>';
      h += '<p class="sys">Het rooster herhaalt zich na ' + SCHED_DAYS + ' dagen. Grijs: bijfiguren. Omkaderd: het huidige dagdeel.</p>';
    } else if (this.tab === 'fig') {
      h += Figures.html(s, famOf(s));
    } else if (this.tab === 'txt') {
      const cov = Content.coverage(Content.cur), keys = Object.keys(Content.SCHEMA), lu = s.play.lineUse && s.play.lineUse.day === s.clock.day ? Object.keys(s.play.lineUse.n).length : 0;
      h += '<pre>' + U.esc(['Pakket: ' + Content.cur.name + ' (' + Content.count(Content.cur) + ' regels, ' + keys.length + ' sleutels, sig ' + Content.sig + ')', 'Spel gestart met: ' + (s.meta.content ? s.meta.content.name + ' (sig ' + s.meta.content.sig + ')' : 'onbekend'),
        'Tijdvak van dit spel: ' + s.meta.era, 'Dekking: ' + (cov.length ? cov.length + ' tekorten' : 'alle sleutels gevuld in alle ' + ERAS.length + ' tijdvakken'), 'Regels vandaag gebruikt: ' + lu].join('\n')) + '</pre>';
      if (cov.length) h += '<pre>' + U.esc(cov.slice(0, 30).join('\n')) + '</pre>';
      h += '<h3>Pool bekijken</h3><div class="row"><select id="dbgEra">' + ERAS.map((e) => '<option' + (e === s.meta.era ? ' selected' : '') + '>' + e + '</option>').join('') + '</select>' +
        '<input id="dbgKey" list="dbgKeys" value="talk.warm.open" autocapitalize="off"><datalist id="dbgKeys">' + keys.map((k) => '<option value="' + k + '">').join('') + '</datalist>' + b('Toon', { d: 'pool' }) + '</div><pre id="dbgPool"></pre>';
    } else if (this.tab === 'act') {
      h += '<h3>Bezoek forceren</h3><p class="sys">Opent een bezoek, ook als de plek dicht is. Kost geen dagdeel.</p><div class="row">' + s.world.locations.map((l) => b(U.esc(l.name), { d: 'force', v: l.id })).join('') + '</div>';
      h += '<h3>Dagdeel</h3><div class="row">' + b('Volgend dagdeel', { d: 'part' }) + '<span class="sys">Nu: ' + U.esc(U.time(s.clock)) + '</span></div>';
      h += '<h3>Bereikbaarheid</h3><div class="row">' + b('Solver: papierroute', { d: 'solve', v: 'paper' }) + b('Solver: mensenroute', { d: 'solve', v: 'people' }) + b('Plan: papierroute', { d: 'plan', v: 'paper' }) + b('Plan: mensenroute', { d: 'plan', v: 'people' }) + '</div><pre id="dbgOut"></pre>';
      h += '<h3>Seed</h3><div class="row"><input id="dbgSeed" value="' + U.esc(s.seed) + '" autocapitalize="off">' + b('Nieuw spel met deze seed', { d: 'seed' }) + '</div>';
    } else {
      h += '<div class="row">' + b('Draai zelftest (30 seeds)', { d: 'run' }) + '</div><div id="dbgTests"></div>';
    }
    UI.open('Debug', h, (e) => {
      const t = e.target.closest('button[data-d]'); if (!t) return; const v = t.dataset.v;
      switch (t.dataset.d) {
        case 'tab': this.tab = v; return this.render();
        case 'day': this.day = +v; return this.render();
        case 'give': Evidence.give(s, Evidence.get(s, v), 'debug'); Rules.post(s); UI.after(); return this.render();
        case 'force': UI.close(); UI.sel = null; UI.hot = null; UI.tab = 'visit'; return UI.run((st) => { Act.force(st, v); Log.sys(st, '[debug] bezoek geforceerd'); });
        case 'part': UI.run((st) => Act.skipPart(st)); return this.render();
        case 'solve': { const r = Solver.run(s, v); $('#dbgOut').textContent = 'Route ' + v + ': motief ' + (r.motive ? 'ja' : 'nee') + ', methode ' + (r.method ? 'ja' : 'nee') + ', sporen ' + r.found + '.'; return; }
        case 'plan': { const r = Solver.plan(s, v); $('#dbgOut').textContent = 'Plan ' + v + ': ' + (r.ok ? 'haalbaar' : 'NIET haalbaar') + ' in ' + r.parts + ' dagdelen, ' + r.visits + ' bezoeken.\n' +
          r.path.map((x) => '  dag ' + x.day + ', ' + PARTS[x.part] + ': ' + World.loc(s, x.locId).name + ' -> ' + x.got.join(', ')).join('\n'); return; }
        case 'seed': return UI.newGame($('#dbgSeed').value.trim());
        case 'pool': { const k = $('#dbgKey').value.trim(), era = $('#dbgEra').value; if (!Content.schemaFor(k)) { $('#dbgPool').textContent = 'Onbekende sleutel.'; return; }
          const use = (s.play.lineUse && s.play.lineUse.day === s.clock.day) ? s.play.lineUse.n : {};
          $('#dbgPool').textContent = Content.pool(era, k).map((l) => '[' + l.src + (use[l.h] ? ' ' + use[l.h] + 'x' : '') + '] ' + l.t).join('\n') || '(leeg)'; return; }
        case 'run': { const r = Tests.run(30), ok = r.filter((x) => x.ok).length; $('#dbgTests').innerHTML = '<p><b>' + ok + '/' + r.length + ' geslaagd</b></p>' + r.map((x) => '<p class="' + (x.ok ? 'ok' : 'bad') + '">' + (x.ok ? 'OK' : 'FOUT') + ' ' + U.esc(x.name) + (x.info ? ': ' + U.esc(x.info) : '') + '</p>').join(''); return; }
      }
    });
  }
};

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => UI.init());
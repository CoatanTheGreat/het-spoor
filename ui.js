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
  s: null, screen: null, intro: null, introT: null, level: 'normaal', tab: 'board', sel: null, link: null, stn: null, hot: null, approach: 'reserved', deltas: {}, showEv: false, zvSlot: 'suspectId', typeTimer: null, feed: [], theme: 'auto', oldRaw: null, mapCache: null, taps: 0, tt: null, bound: false,
  btn: (label, data, cls) => '<button class="chip ' + (cls || '') + '" ' + Object.keys(data).map((k) => 'data-' + k + '="' + U.esc(data[k]) + '"').join(' ') + '>' + label + '</button>',

  async init() {
    window.addEventListener('error', (e) => this.toast('Fout: ' + (e.message || 'onbekend') + '. Meld dit met een schermafbeelding.', 8000));
    this.bind();
    $('#mClose').onclick = () => this.close();
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.close(); });
    await Store.open();
    Content.init();
    const pack = await Store.get('contentPack');
    if (pack) { const r = Content.importPack(pack); if (!r.ok) this.toast('Contentpakket niet geladen: ' + r.rep.errors[0]); }
    // In UI.init(): lees ook 'muted' uit prefs:
    let theme = 'auto', parsed = {};
    try {
      const prefs = await Store.get('prefs'); parsed = prefs ? JSON.parse(prefs) : {};
      theme = parsed.theme || 'auto';
      SFX.muted = !!parsed.muted;
      if (LEVELS[parsed.level]) this.level = parsed.level;
    } catch (e) { theme = 'auto'; parsed = {}; }
    this.setTheme(theme, true);
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
    this.s = s; this.mapCache = null; this.sel = null; this.link = null; this.stn = null; this.hot = null; this.deltas = {}; this.showEv = false; this.feed = [];
    this.tab = s.visit ? 'visit' : 'board';
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
// In UI.animateTranscript(npc): speel tijdvak-specifiek tikje bij elke regel die verschijnt:
  animateTranscript(npc) {
    clearTimeout(this.typeTimer);
    if (typeof Interrogation === 'undefined') return;
    const lastStrip = $('#app .iv-strip[data-last="1"]');
    if (!lastStrip) return;
    const lines = Array.from(lastStrip.querySelectorAll('.iv-line'));
    const fam = this.s ? famOf(this.s) : 'klassiek';
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
  savePrefs() { Store.put('prefs', JSON.stringify({ theme: this.theme, muted: SFX.muted, level: this.level, intro: this.intro })); },
  setTheme(t, quiet) { this.theme = t; document.documentElement.dataset.theme = t; if (!quiet) this.savePrefs(); },
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
  showStart() { clearTimeout(this.typeTimer); clearTimeout(this.introT); this.close(); this.screen = 'start'; $('#app').hidden = false; this.renderScreen(); },
  renderScreen() {
    const root = $('#app'); clearTimeout(this.introT);
    root.innerHTML = this.screen === 'intro' && this.s ? this.introHtml() : this.startHtml();
    if (this.screen === 'intro') this.revealIntro();
    const first = root.querySelector('.st-go, .st-resume'); if (first) first.focus({ preventScroll: true });
  },
  startHtml() {
    const s = this.s, live = s && !s.play.ended;
    const cards = Object.keys(LEVELS).map((k) => `<button class="st-lv${this.level === k ? ' on' : ''}" role="radio" aria-checked="${this.level === k}" data-ui="st-level" data-v="${k}"><span class="pin"></span>` +
      `<b>${LEVELS[k].label}</b><span>${U.esc(this.LV_START[k])}</span><small>Onderzoeken ${Math.round(15 * LEVELS[k].speed / 5) * 5} min, verhoren ${Math.round(30 * LEVELS[k].speed / 5) * 5} min</small></button>`).join('');
    return `<div class="start"><div class="st-folder">` +
      (live ? `<button class="st-resume" data-ui="st-resume"><b>Verder met ${U.esc(s.meta.title)}</b><small>Dag ${s.clock.day}, ${PARTS[Math.min(s.clock.part, 2)]}. ${U.esc(s.meta.eraLabel)}, ${U.esc(s.world.city.name)}.</small></button>` : '') +
      `<h1 class="st-title">Het Spoor</h1><p class="st-lead">Een stad, een voorval en vier dagen om te bewijzen wie het deed. Elke zaak is nieuw.</p>` +
      `<div class="st-lvs" role="radiogroup" aria-label="Niveau">${cards}</div>` +
      `<div class="st-foot"><p class="st-note">Het niveau wissel je later via Systeem.</p><button class="st-go" data-ui="st-begin">${live ? 'Begin een nieuwe zaak' : 'Begin de zaak'}</button></div>` +
      `<small class="st-ver">${APP.version}</small></div></div>`;
  },
  // three short paragraphs from the case itself: who you are, what happened, where you stay
  introText(s) {
    const n = s.log.filter((e) => e.k === 'n').map((e) => e.text).slice(1, 5);
    if (n.length) n[n.length - 1] += ' Het is de ochtend van dag 1.';
    return n;
  },
  introHtml() {
    const s = this.s, start = World.loc(s, s.startLoc), canGo = start && World.openAt(start, s.clock.part) && !s.visit;
    const paras = this.introText(s).map((x, i) => `<p class="co-line${i < (this.introN || 1) ? '' : ' co-hide'}">${U.esc(x)}</p>`).join('');
    return `<div class="start"><div class="st-folder co"><h1 class="co-title">${U.esc(s.meta.title)}</h1><p class="co-sub">${U.esc(s.meta.eraLabel)}, ${U.esc(s.world.city.name)}. Niveau: ${U.esc(Level.get(s).label)}.</p>` +
      `<div class="co-text" data-ui="st-reveal" title="Tik om alles te tonen">${paras}</div><div class="co-acts">` +
      (canGo ? `<button class="st-go" data-ui="st-go">${s.pos === start.id ? 'Rondkijken in ' : 'Ga naar '}${U.esc(start.name)}</button>` : '') +
      `<button class="st-sec${canGo ? '' : ' st-go'}" data-ui="st-board">${canGo ? 'Eerst naar het zaakbord' : 'Naar het zaakbord'}</button></div></div></div>`;
  },
  revealIntro() {
    const lines = Array.from(document.querySelectorAll('#app .co-line'));
    if (this.reduced()) { lines.forEach((p) => p.classList.remove('co-hide')); this.introN = lines.length; return; }
    const step = () => { const next = lines.find((p) => p.classList.contains('co-hide')); if (!next) return; next.classList.remove('co-hide'); SFX.type(famOf(this.s)); this.introN = lines.indexOf(next) + 1; this.introT = setTimeout(step, 1500); };
    this.introT = setTimeout(step, 1400);
  },
  beginCase() {
    const s = Game.create('spoor-' + Date.now().toString(36), this.level);
    this.screen = 'intro'; this.introN = 1; this.close(); this.load(s); this.feed = s.log.map((e) => this.line(s, e));
  },
  // buttons of the start screen, the cold opening and the coach bubble; true when handled
  screenAct(el) {
    const d = el.dataset, u = d.ui;
    switch (u) {
      case 'st-level': if (!LEVELS[d.v]) return true; SFX.pin(); this.level = d.v; this.savePrefs(); this.renderScreen(); return true;
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
      `<b>${U.esc(c.title)}</b><p>${U.esc(c.text)}</p><div class="coach-acts"><button class="coach-go" data-ui="coach-next" data-v="${c.id}">${c.btn}</button>` +
      (c.guided ? `<button class="coach-skip" data-ui="coach-skip" data-v="${c.id}">Uitleg overslaan</button>` : '') + '</div></div>';
  },
  // the bubble sits next to the element it explains; without one it takes the top right corner below the bars
  placeCoach(c) {
    const root = $('#app'), el = root.querySelector('.coach'); if (!el) return;
    const tgt = c.sel.map((q) => root.querySelector(q)).find(Boolean), W = window.innerWidth, H = window.innerHeight, bw = el.offsetWidth, bh = el.offsetHeight;
    let top, left;
    if (tgt) {
      tgt.classList.add('coach-on'); const r = tgt.getBoundingClientRect();
      top = r.bottom + 12; if (top + bh > H - 12) top = r.top - bh - 12; if (top < 12) top = Math.max(12, Math.min(H - bh - 12, r.top + 12));
      left = r.left + r.width / 2 - bw / 2;
    } else { const bar = root.querySelector('.sp-bar'); top = (bar ? bar.getBoundingClientRect().bottom : 100) + 12; left = W - bw - 24; }
    el.style.top = Math.round(top) + 'px'; el.style.left = Math.round(Math.max(12, Math.min(W - bw - 12, left))) + 'px'; el.style.visibility = 'visible';
  },

  /* ----- main view ----- */
  render(keepFocus) {
    if (this.screen) return this.renderScreen();
    const s = this.s, root = $('#app'); if (!s) return;
    clearTimeout(this.typeTimer);
    const fam = famOf(s), part = s.clock.part, v = s.visit, ended = !!s.play.ended, here = World.here(s);
    const ae = document.activeElement, fk = keepFocus && ae && (ae.dataset.card || ae.dataset.stn || ae.dataset.hs);
    const tabs = [['board', 'Zaakbord'], ['map', 'Kaart']].concat(v ? [['visit', 'Bezoek: ' + here.name]] : []);
    let h = `<div class="sp-top"><h1 class="sp-title" data-ui="title">Het Spoor<small>${APP.version}</small></h1><nav class="sp-tabs">` +
      tabs.map((t) => `<button data-ui="tab" data-v="${t[0]}" class="${this.tab === t[0] ? 'on' : ''}${t[0] === 'visit' ? ' visit' : ''}"${this.tab === t[0] ? ' aria-current="page"' : ''}>${U.esc(t[1])}</button>`).join('') +
      `</nav><div class="sp-tools"><button data-ui="journal">Dagboek</button><button data-ui="dossier"${this.dossierReady() ? ' class="hot"' : ''}>Zaakverslag</button><button data-ui="system">Systeem</button></div></div>`;
    const used = Clock.elapsed(s.clock), late = s.clock.day > DAY.soft;
    h += `<div class="sp-bar"><span class="sp-case">${U.esc(s.meta.title)}, ${U.esc(s.meta.eraLabel)}, ${U.esc(s.world.city.name)}</span>` +
      `<span class="sp-clock${part >= DAY.parts ? ' night' : ''}">Dag ${s.clock.day} · <b>${U.hm(Clock.norm(s))}</b> · ${PARTS[part]}</span>` +
      `<button class="sp-budget${late ? ' late' : ''}" data-ui="budgethelp" aria-label="Uitleg over de tijd">${late ? 'Het spoor koelt af' : 'Dag ' + s.clock.day + ' van ' + DAY.soft} <span class="sp-help" aria-hidden="true">?</span></button>`;
    if (!ended) {
      if (v) h += `<button class="sp-btn go" data-ui="leave">Vertrek uit ${U.esc(here.name)}</button>`;
      else {
        if (part < DAY.parts) h += `<button class="sp-btn" data-ui="wait">Wacht tot ${part < 2 ? 'de ' + PARTS[part + 1] + ' (' + U.hm(Clock.partEnd(part)) + ')' : 'tien uur'}</button>`;
        if (part >= 2) h += `<button class="sp-btn${part >= DAY.parts ? ' go' : ''}" data-ui="endday">Sluit de dag af</button>`;
      }
    }
    h += `<button class="sp-btn sp-mute" data-ui="mute" title="Geluid aan of uit">${SFX.muted ? 'Geluid: uit' : 'Geluid: aan'}</button>` +
      `<label class="sp-theme"><span class="sp-theme-l">Thema</span> <select data-ui="theme" aria-label="Thema">${[['auto', 'systeem'], ['light', 'licht'], ['dark', 'donker']].map((x) => `<option value="${x[0]}"${x[0] === this.theme ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label></div>`;
    h += `<div class="sp-main" data-fam="${fam}">${this.view(s, fam)}</div>`;
    const coach = this.coachPick(); if (coach) h += this.coachHtml(coach);
    root.innerHTML = h;
    if (this.tab === 'board') this.fit();
    if (coach) this.placeCoach(coach);
    const log = root.querySelector('.iv-log, .cv-log'); if (log) log.scrollTop = log.scrollHeight;
    if (fk) { const el = root.querySelector(`[data-card="${fk}"],[data-stn="${fk}"],[data-hs="${fk}"]`); if (el) el.focus({ preventScroll: true }); }
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
    let h = `<button class="sp-x" data-ui="stnx">Sluiten</button><h3>${U.esc(l.name)}</h3><p class="sp-note">${U.esc(l.description)}</p>`;
    if (tags.length) h += `<p>${tags.map(U.esc).join(' ')}</p>`;
    h += `<h4>Openingstijden</h4><p class="sp-note">${allDay ? 'Altijd open.' : 'Open van ' + l.open[0] + ' tot ' + l.open[1] + ' uur.'} ${night ? 'Het is nu nacht.' : open ? 'Nu open, in de ' + PARTS[part] + '.' : 'Nu dicht, in de ' + PARTS[part] + '.'}</p>`;
    if (open && !night) {
      h += `<h4>Aanwezig in de ${PARTS[part]}</h4>`;
      h += known.length ? `<ul>${known.map((n) => `<li>${U.esc(n.name)}, ${U.esc(String(n.role).replace(/ \(.*\)$/, ''))}${People.isCore(s, n.id) ? '' : ' (bijfiguur)'}</li>`).join('')}</ul>` : '';
      h += unk > 0 ? `<p class="sp-note">${unk === 1 ? 'Eén persoon' : unk + ' mensen'} die je nog niet gesproken hebt.</p>` : (known.length ? '' : '<p class="sp-note">Niemand aanwezig.</p>');
    }
    if (v && v.locId === l.id) h += `<button class="sp-btn go wide" data-ui="tab" data-v="visit">Terug naar het bezoek</button>`;
    else if (v) h += `<p class="sp-note">Je bent nog in ${U.esc(World.here(s).name)}. Vertrek eerst.</p>`;
    else if (night) h += `<p class="sp-note">Sluit de dag af om morgen verder te gaan.</p>`;
    else { const T = Travel.check(s, l.id);
      if (T.late) h += `<button class="sp-btn wide" disabled>Te laat: je bent er pas om ${U.hm(T.at)}</button>`;
      else if (!T.open) h += `<button class="sp-btn wide" disabled>Dicht als je aankomt (${U.hm(T.at)}, ${PARTS[T.part]})</button>`;
      else if (T.here) h += `<button class="sp-btn go wide" data-ui="visit" data-v="${l.id}">Ga naar binnen in ${U.esc(l.name)}</button>`;
      else h += `<button class="sp-btn go wide" data-ui="visit" data-v="${l.id}">Ga naar ${U.esc(l.name)} (${T.walk} min lopen, aankomst ${U.hm(T.at)})</button>`; }
    return h;
  },
  dossierReady() { const f = Evidence.found(this.s); return f.some((e) => e.slot === 'motive') && f.some((e) => e.slot === 'method') && !this.s.play.ended; },
  // what just happened: a side drawer on the board and the map, a box in the visit panel
  feedLines() { return this.feed.slice(-8).map((m) => `<p class="${m.k === 's' ? 'sys' : ''}">${m.who ? '<b>' + U.esc(m.who) + ':</b> ' : ''}${U.esc(m.text)}</p>`).join(''); },
  feedHtml(cls) {
    if (!this.feed.length) return '';
    if (cls === 'drawer') return `<aside class="sp-drawer sp-feed"><button class="sp-x" data-ui="feedx">Sluiten</button><h3>Zojuist</h3>${this.feedLines()}</aside>`;
    return `<div class="${cls}">${this.feedLines()}</div>`;
  },
  view(s, fam) {
    if (this.tab === 'visit' && s.visit) return this.visitView(s, fam);
    const side = this.link && this.tab === 'board' ? `<aside class="sp-drawer">${Board.linkPanel(s, this.link)}</aside>` : this.sel && this.tab === 'board' ? `<aside class="sp-drawer">${Board.detail(s, this.sel, fam)}</aside>` : this.feedHtml('drawer');
    if (this.tab === 'map') {
      const mside = this.stn ? `<aside class="sp-drawer">${this.stnDetail(s, this.stn)}</aside>` : side;
      return `<div class="mv${mside ? ' drawer' : ''}">${MapGen.svg(s, this.map(), s.clock.part, this.stn)}</div>` + mside;
    }
    return `<div class="bw${side ? ' drawer' : ''}">${Board.html(s, fam, this.sel, this.link).html}</div>` + side;
  },
  fit() {
    const w = $('#app .bw'), b = $('#app .bd'); if (!w || !b) return;
    const k = Math.min(w.clientWidth / Board.W, w.clientHeight / Board.H) * 0.98;
    b.style.transform = `translate(${((w.clientWidth - Board.W * k) / 2).toFixed(1)}px, ${((w.clientHeight - Board.H * k) / 2).toFixed(1)}px) scale(${k.toFixed(4)})`;
  },
// Vervang UI.visitView(s, fam) in ui.js door deze versie met de In-Scene Popover op het Tableau (Optie B):
  visitView(s, fam) {
    const v = s.visit;
    if (v && v.conv && typeof Interrogation !== 'undefined') {
      return Interrogation.html(s, fam, {
        approach: this.approach,
        deltas: this.deltas || {},
        showEvidence: !!this.showEv
      });
    }
    const loc = World.here(s), part = s.clock.part, M = Tableau.model(s, loc.id, part), sel = M.hs.find((x) => x.id === this.hot);
    let pop = '';
    if (sel) {
      // Bereken positie (in %) op het 960x540 tableau met rand-beveiliging
      const cx = sel.kind === 'obj' ? sel.box.x + sel.box.w / 2 : sel.x;
      const cy = sel.kind === 'obj' ? sel.box.y + sel.box.h / 2 : sel.y - 135 * sel.k;
      const px = Math.max(16, Math.min(84, (cx / 960) * 100)).toFixed(1);
      const py = Math.max(14, Math.min(82, (cy / 540) * 100)).toFixed(1);
      let inner = `<button class="tv-pop-x" data-ui="hotx" aria-label="Sluiten">×</button>`;
      // v0.12.0: every button shows its minutes; a stranger costs the same whoever it is
      const rest = Clock.left(s), can = (k) => Level.cost(s, k) <= rest, mins = (k) => ' (' + Level.cost(s, k) + ' min)', outBtn = '<button class="sp-act" disabled>Daar is het te laat voor</button>', left = 1;
      if (sel.kind !== 'obj') {
        // v0.8.0 (nieuw A): until you speak to someone, you only see what anyone could see
        const x = sel.ref, core = sel.kind === 'npc', known = People.known(s, x.id), label = Tableau.label(sel, s, M);
        if (!known) {
          inner += `<b>${U.esc(label)}</b><p class="sp-note">Je weet nog niet wie dit is.</p>` + (v.done[x.id] ? `<button class="sp-act" disabled>Al gesproken tijdens dit bezoek</button>` : can('greet') ? `<button class="sp-act live" data-ui="greet" data-v="${x.id}">Aanspreken${mins('greet')}</button>` : outBtn);
        } else if (core) {
          const tone = Rels.toneOf(s, x.id);
          inner += `<div class="row2"><div style="border:2px solid ${TONE_COLOR[tone]};background:${FAMILY[fam].photo}">${Silhouette.svg(x, { s: s, fam: fam, stance: TONE_STANCE[tone], w: 48 })}</div><div><b>${U.esc(x.name)}</b><br><span class="sp-note">${U.esc(x.role.replace(/ \(.*\)$/, ''))} · ${TONE_WORD[tone]}</span></div></div>` +
            (v.done[x.id] ? `<button class="sp-act" disabled>Al gesproken tijdens dit bezoek</button>` : can('talk') ? `<button class="sp-act live" data-ui="talk" data-v="${x.id}">Verhoren${mins('talk')}</button>` : outBtn);
        } else {
          inner += `<b>${U.esc(x.name)}</b><br><span class="sp-note">${U.esc(x.role)}, niet betrokken bij de zaak</span>` +
            (v.done[x.id] ? `<button class="sp-act" disabled>Al gesproken tijdens dit bezoek</button>` : can('mingle') ? `<button class="sp-act live" data-ui="mingle" data-v="${x.id}">Even praten${mins('mingle')}</button>` : outBtn);
        }
      } else {
        const clue = s.evidence.find((e) => e.source.objectId === sel.ref.id && s.play.found[e.id]);
        const early = !clue && s.play.early && s.play.early[sel.ref.id], seen = !clue && !early && s.play.examined && s.play.examined[sel.ref.id];
        inner += `<b>${U.esc(Rnd.cap(sel.ref.name))}</b>` +
          (clue ? `<p class="sp-note">Gevonden: <b>${U.esc(clue.title)}</b></p>`
            : early ? `<p class="sp-note"><b>Opvallend (?)</b>: Kom hier later terug zodra je meer weet.</p>`
            : seen ? `<p class="sp-note">Hier heb je al gekeken.</p>` : `<p class="sp-note">Van dichtbij bekijken</p>`) +
          (clue || seen ? '' : can('examine') ? `<button class="sp-act live" data-ui="examine" data-v="${sel.ref.id}">${early ? 'Opnieuw onderzoeken' : 'Onderzoeken'}${mins('examine')}</button>` : outBtn);
      }
      pop = `<div class="tv-pop" style="left:${px}%;top:${py}%">${inner}</div>`;
    }

    // v0.12.0: the clock of this part of the day; at its end people move on
    const now = Clock.norm(s), p0 = PART_START[part], p1 = Clock.partEnd(part), pct = Math.round(100 * (now - p0) / (p1 - p0));
    let side = `<h3>${U.esc(loc.name)}</h3><p class="sp-note">${U.esc(loc.description)}</p>` +
      `<div class="sp-att sp-time" aria-label="Het is ${U.hm(now)}; de ${PARTS[part]} duurt tot ${U.hm(p1)}"><span>${U.hm(now)}</span><span class="tbar"><i style="width:${pct}%"></i></span><b>tot ${U.hm(p1)}</b></div>` +
      `<p class="sp-note">Aanspreken en onderzoeken kost ${Level.cost(s, 'examine')} minuten, verhoren ${Level.cost(s, 'talk')}. Binnen een gesprek zijn alle vragen gratis. Om ${U.hm(p1)} ${part < 2 ? 'gaan de mensen naar hun volgende plek' : 'is de dag voorbij'}.</p>`;
    const intro = loc.name + '. ' + loc.description, feedAll = this.feed;
    this.feed = feedAll.filter((m) => m.text !== intro);   // the description already stands above (v0.6.5)
    side += this.feedHtml('tv-msg'); this.feed = feedAll;
    const hasClue = (x) => x.kind === 'obj' && s.evidence.some((e) => e.source.objectId === x.ref.id && s.play.found[e.id]);
    const isEarly = (x) => x.kind === 'obj' && !hasClue(x) && s.play.early && s.play.early[x.ref.id];
    const seen = (x) => x.kind === 'obj' && !hasClue(x) && !isEarly(x) && s.play.examined && s.play.examined[x.ref.id];
    const chip = (x) => `<button class="sp-chip${this.hot === x.id ? ' on' : ''}${hasClue(x) || seen(x) || (x.kind !== 'obj' && v.done[x.ref.id]) ? ' done' : ''}${isEarly(x) ? ' early' : ''}" data-hs="${x.id}">${U.esc(Tableau.label(x, s, M))}</button>`;
    const ppl = M.hs.filter((x) => x.kind !== 'obj'), objs = M.hs.filter((x) => x.kind === 'obj');
    side += `<h4>Aanwezig in ${U.esc(loc.name)}</h4>${ppl.length ? `<div class="sp-chips">${ppl.map(chip).join('')}</div>` : '<p class="sp-note">Niemand aanwezig.</p>'}` +
      `<h4>Voorwerpen</h4><div class="sp-chips">${objs.map(chip).join('')}</div>`;
    return `<div class="tv"><div class="tv-stage"><div class="tv-canvas">${Tableau.svg(s, loc.id, part, fam, this.hot)}${pop}</div></div><aside class="tv-side">${side}</aside></div>`;
  },
  // fallback conversation side-panel (if Interrogation is not loaded in views.js)
  convPanel(s, fam) {
    const v = s.visit, n = World.npc(s, v.conv), tone = Rels.toneOf(s, n.id), b = (label, data, cls) => `<button class="sp-chip ${cls || ''}" ${Object.keys(data).map((k) => `data-${k}="${U.esc(data[k])}"`).join(' ')}>${label}</button>`;
    let h = `<div class="cv"><div class="row2"><div style="border:3px solid ${TONE_COLOR[tone]};background:${FAMILY[fam].photo}">${Silhouette.svg(n, { s: s, fam: fam, stance: TONE_STANCE[tone], w: 64 })}</div><div><b>${U.esc(n.name)}</b><br><span class="sp-note">${U.esc(n.role)}, doet ${TONE_WORD[tone]}</span></div></div>`;
    const lines = s.log.filter((e) => e.i > (v.convAt || 0));
    h += `<div class="cv-log">` + lines.slice(-10).map((e) => e.k === 'p' ? `<p class="say ${e.tone || ''}"><b>${U.esc(U.first(World.npc(s, e.npc)))}:</b> ${U.esc(e.text)}</p>` : `<p class="${e.k === 's' ? 'sys' : 'narr'}">${U.esc(e.text)}</p>`).join('') + '</div>';
    h += `<h4>Aanpak</h4><div class="sp-chips seg">` + Object.keys(APPROACH).map((k) => b(APPROACH[k].label, { ui: 'approach', v: k }, this.approach === k ? 'on' : '')).join('') + '</div>';
    const topics = Dialogue.topics(s, n), cons = Dialogue.confronts(s, n);
    h += `<h4>Vraag naar</h4><div class="cv-opts">` + topics.map((t) => b(U.esc(t.label), { ui: 'topic', v: t.id }, t.id.indexOf('ev:') === 0 ? 'lead' : '')).join('') +
      cons.map((c) => b('Confronteer: ' + U.esc(Evidence.get(s, c.counterEvidence).title), { ui: 'confront', v: c.id }, 'hot')).join('') +
      (Dialogue.canTreat(s, n) ? b('Trakteer op een glas (' + TREAT_COST + ' ' + U.esc(s.meta.eraRules.currency || '') + ')', { ui: 'treat', v: n.id }) : '') +
      (!topics.length && !cons.length ? '<p class="sp-note">Alles is gevraagd. Elk onderwerp kan één keer per gesprek.</p>' : '') + '</div>';
    h += `<button class="sp-btn" data-ui="talkend">Gesprek beëindigen</button></div>`;
    return h;
  },
  startVisit(locId) {
    const s = this.s, loc = World.loc(s, locId); if (!loc || s.play.ended) return;
    if (s.visit) { if (s.visit.locId === locId) { this.tab = 'visit'; return this.render(); } return this.toast('Je bent nog in ' + World.here(s).name + '. Vertrek eerst.'); }
    if (s.clock.part >= DAY.parts) return this.toast('Het is nacht. Sluit de dag af om morgen verder te gaan.');
    if (!World.openAt(loc, s.clock.part)) return this.toast(loc.name + ' is dicht in de ' + PARTS[s.clock.part] + '.');
    this.sel = null; this.stn = null; this.hot = null; this.deltas = {}; this.showEv = false; this.tab = 'visit';
    this.run((st) => Act.visit(st, locId));
  },

  /* ----- input ----- */
  act(el) {
    if (this.screenAct(el)) return;
    const d = el.dataset, s = this.s; if (!s) return;
    const harbor = s.world.locations.some((l) => l.template === 'haven');
    if (d.card && this.link) {   // v0.11.0: pulling threads; a tap on another card ties or unties it, a tap on the first card is done
      if (d.card === this.link) { SFX.paper(); this.sel = this.link; this.link = null; return this.render(true); }
      if (Act.thread(s, this.link, d.card)) { SFX.pin(); Store.put('auto', Save.pack(s)); }
      return this.render(true);
    }
    if (d.card) { SFX.pin(); this.sel = this.sel === d.card ? null : d.card; return this.render(true); }
    if (d.stn) { SFX.pin(); this.stn = this.stn === d.stn ? null : d.stn; return this.render(true); }
    if (d.hs) { SFX.pin(); this.hot = this.hot === d.hs ? null : d.hs; return this.render(true); }
    const u = d.ui || d.sp;
    switch (u) {
      case 'tab': SFX.paper(); this.tab = d.v; this.sel = null; this.link = null; this.stn = null; this.hot = null; return this.render();
      case 'stnx': this.stn = null; return this.render();
      case 'linkmode': SFX.pin(); this.link = d.v; this.sel = null; return this.render(true);
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
        const r = this.run((st) => Act.wait(st));
        if (s.clock.part >= 2) SFX.bell(harbor); else SFX.paper();
        return r;
      }
      case 'endday': SFX.bell(harbor); return this.run((st) => Act.endDay(st));
      case 'examine': SFX.paper(); this.hot = null; return this.run((st) => Act.examine(st, d.v));
      case 'mingle': SFX.pin(); this.hot = null; return this.run((st) => Act.mingle(st, d.v));
      case 'greet': {
        SFX.pin(); this.hot = null;
        if (People.isCore(s, d.v)) { SFX.paper(); this.feed = []; this.deltas = {}; this.showEv = false; return this.runConv((st) => Act.greet(st, d.v)); }
        return this.run((st) => Act.greet(st, d.v));
      }
      case 'talk': SFX.paper(); this.hot = null; this.feed = []; this.deltas = {}; this.showEv = false; return this.runConv((st) => Act.talkStart(st, d.v));
      case 'talkend': SFX.paper(); clearTimeout(this.typeTimer); this.hot = null; this.deltas = {}; this.showEv = false; this.feed = []; return this.run((st) => Act.talkEnd(st));
      case 'approach': SFX.pin(); this.approach = d.v; return this.render();
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
    const target = (e) => e.target.closest('[data-ui],[data-sp],[data-card],[data-stn],[data-hs]');
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-ui="title"]')) { this.taps++; clearTimeout(this.tt); this.tt = setTimeout(() => { this.taps = 0; }, 650); if (this.taps >= 3) { this.taps = 0; Debug.open(); } return; }
      const t = target(e); if (t && t.tagName !== 'SELECT') this.act(t);
    });
    root.addEventListener('change', (e) => { if (e.target.dataset.ui === 'theme') { this.setTheme(e.target.value); this.render(); } });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (!$('#modal').hidden) return this.close(); if (this.sel || this.link || this.hot || this.stn) { this.sel = null; this.link = null; this.hot = null; this.stn = null; this.render(); } return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const t = e.target.closest && e.target.closest('#app [data-card],#app [data-stn],#app [data-hs]'); if (!t || t.tagName === 'BUTTON') return;
      e.preventDefault(); this.act(t);
    });
    const hot = (e, on) => { const g = e.target.closest && e.target.closest('g[data-hs]'), svg = g && g.ownerSVGElement; if (!svg) return;
      svg.querySelectorAll('.tag.show').forEach((x) => x.classList.remove('show'));
      if (on) { svg.setAttribute('data-hot', '1'); const tag = svg.querySelector(`.tag[data-for="${g.dataset.hs}"]`); if (tag) tag.classList.add('show'); } };
    root.addEventListener('mouseover', (e) => hot(e, true)); root.addEventListener('focusin', (e) => hot(e, true));
    root.addEventListener('mouseout', (e) => hot(e, false));
    window.addEventListener('resize', () => { if (this.screen) return; if (this.tab === 'board') this.fit(); const c = this.coachPick(); if (c) this.placeCoach(c); });
  },

  /* ----- modals ----- */
  open(title, html, onClick) { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; $('#modal').hidden = false; $('#mBody').onclick = onClick || null; $('#mBody').scrollTop = 0; },
  close() { $('#modal').hidden = true; },
  // v0.11.0: one archive folder per zone of the board; take a card back, or all of them
  archiveBox(zone) {
    const s = this.s, ids = Pins.inFolder(s, zone), fam = famOf(s);
    if (!ids.length) { this.close(); return this.render(); }
    const sub = (id) => { const k = id.split(':')[0], ref = id.slice(k.length + 1);
      if (k === 'p') { const n = World.npc(s, ref); return n.role.replace(/ \(.*\)$/, ''); }
      if (k === 'l') return World.loc(s, ref).description;
      if (ref.indexOf('con_') === 0) return s.contradictions.find((c) => c.id === ref).claim;
      const e = Evidence.get(s, ref); return e.text; };
    const items = ids.slice().sort((a, b) => Board.title(s, a).localeCompare(Board.title(s, b), 'nl'));
    let h = '<p class="sys">Wat hier ligt, telt gewoon mee in het zaakverslag. Je draadjes blijven bewaard.</p>' + items.map((id) => {
      const k = id.split(':')[0], n = k === 'p' ? World.npc(s, id.slice(2)) : null;
      return '<div class="arch-it">' + (n ? '<span class="jframe" style="background:' + FAMILY[fam].photo + '">' + Silhouette.svg(n, { s: s, fam: fam, w: 40 }) + '</span>' : '') +
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
  journal() {
    const s = this.s, p = s.play, fam = famOf(s);
    let h = '<h3>De zaak</h3><p class="narr">' + U.esc(s.crime.summary) + ' ' + U.esc(s.crime.personalHook) + '</p>';
    h += '<h3>Sporen</h3>' + (Evidence.found(s).map((e) => '<div class="ev ' + (p.debunked[e.id] ? 'debunked' : '') + '"><b>' + U.esc(e.title) + '</b>' + (p.debunked[e.id] ? ' <i>(weerlegd)</i>' : '') + '<p>' + U.esc(e.text) + '</p></div>').join('') || '<p class="sys">Nog niets.</p>');
    const claims = s.contradictions.filter((c) => p.heard[c.id]);
    if (claims.length) h += '<h3>Verklaringen</h3>' + claims.map((c) => '<p><b>' + U.esc(World.npc(s, c.npcId).name) + ':</b> ' + U.esc(c.claim) + (p.resolved[c.id] ? ' <i>(doorgeprikt)</i>' : '') + '</p>').join('');
    const met = s.cast.filter((n) => p.met[n.id]).slice().sort(byName);
    h += '<h3>Mensen</h3>' + (met.map((n) => { const t = Rels.toneOf(s, n.id);
      return '<div class="person"><span class="jframe" style="border-color:' + TONE_COLOR[t] + ';background:' + FAMILY[fam].photo + '">' + Silhouette.svg(n, { s: s, fam: fam, stance: TONE_STANCE[t], w: 44 }) + '</span><div><b>' + U.esc(n.name) + '</b>, ' + U.esc(n.role) + (n.kenmerk ? '. ' + U.esc(Rnd.cap(KENMERK[n.kenmerk].desc)) : '') + '<br><span class="sys">Doet ' + TONE_WORD[t] + ' tegen je.' + this.alibiNote(s, n) + '</span></div></div>'; }).join('') || '<p class="sys">Je hebt nog niemand gesproken.</p>');
    const figs = s.crowd.filter((c) => p.metCrowd && p.metCrowd[c.id]).slice().sort(byName);
    if (figs.length) h += '<h3>Bijfiguren</h3><p class="sys">' + figs.map((c) => U.esc(c.name + ', ' + c.role)).join(' · ') + '</p>';
    h += '<h3>Gesprekken en notities</h3>' + s.log.slice(-60).map((e) =>
      e.k === 'p' ? '<p><b>' + U.esc(World.npc(s, e.npc).name) + ':</b> ' + U.esc(e.text) + '</p>' :
      e.k === 'q' ? '<p class="ask"><b>' + U.esc(U.first(s.protagonist)) + ' (vraag aan ' + U.esc(U.first(World.npc(s, e.npc))) + '):</b> <i>' + U.esc(e.text) + '</i></p>' :
      e.k === 'c' ? '<p><b>' + U.esc(e.name) + ':</b> ' + U.esc(e.text) + '</p>' :
      '<p class="' + (e.k === 's' ? 'sys' : 'narr') + '">' + U.esc(e.text) + '</p>'
    ).join('');
    this.open('Dagboek', h);
  },
  // what the player knows about someone's alibi, in one short sentence (journal)
  alibiNote(s, n) {
    const a = s.alibis && s.alibis[n.id]; if (!a || !s.play.asked[n.id + ':alibi']) return '';
    const comp = a.withId ? World.npc(s, a.withId) : null, chk = s.play.alibiCheck && s.play.alibiCheck[n.id];
    let t = ' Alibi: ' + World.loc(s, a.locId).name + (comp ? ', met ' + U.first(comp) : ', alleen') + '.';
    if (chk) t += String(chk.by).indexOf('obj:') === 0 ? ' Een stuk bevestigt het.' : ' ' + U.first(World.npc(s, chk.by)) + (chk.ok ? ' bevestigt het.' : ' spreekt het tegen.');
    return U.esc(t);
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
      if (t.dataset.f === 'accuse') { if (!ready) return this.toast('Het zaakverslag is nog niet compleet.'); SFX.seal(); this.close(); return this.run((st) => Act.accuse(st)); }
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
  async system() {
    const s = this.s, b = this.btn, slots = [];
    for (let i = 1; i <= 3; i++) { const raw = await Store.get('slot' + i); let m = null; try { m = raw ? JSON.parse(raw) : null; } catch (e) { m = null; }
      slots.push(!m ? 'leeg' : m.schema !== APP.schema ? 'oude versie (schema ' + (m.schema || '?') + ')' : m.meta.title + ', ' + U.time(m.clock)); }
    let h = '<h3>Opslaan en laden</h3>' + slots.map((m, i) => '<div class="row"><span class="slot">Slot ' + (i + 1) + ': ' + U.esc(m) + '</span>' + b('Opslaan', { x: 'save', v: i + 1 }) + b('Laden', { x: 'load', v: i + 1 }, m === 'leeg' ? 'dim' : '') + '</div>').join('');
    h += '<p class="sys">Er wordt na elke actie automatisch opgeslagen.</p><div class="row">' + b('Exporteer als bestand', { x: 'export' }) + '<label class="chip file">Importeer bestand<input type="file" accept="application/json,.json" id="imp" hidden></label></div>';
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
      '<div class="row"><label class="chip file">Importeer contentpakket<input type="file" accept="application/json,.json" id="impContent" hidden></label>' + b('Exporteer standaardpakket', { x: 'cexport' }) + b('Herstel standaard', { x: 'creset' }, isBase ? 'dim' : '') + '</div>';
    h += '<p class="sys">' + APP.title + ' ' + APP.version + ', seed: ' + U.esc(s.seed) + '. Volledig offline. Klik drie keer op de titel voor het debug-paneel.</p>';
    this.open('Systeem', h, async (e) => {
      const t = e.target.closest('button[data-x]'); if (!t) return;
      const x = t.dataset.x;
      if (x === 'save') { await Store.put('slot' + t.dataset.v, Save.pack(s)); this.toast('Opgeslagen in slot ' + t.dataset.v + '.'); this.system(); }
      if (x === 'load') { const raw = await Store.get('slot' + t.dataset.v); if (!raw) return; try { this.close(); this.load(Save.unpack(raw)); this.toast('Slot ' + t.dataset.v + ' geladen.'); } catch (err) { this.toast(err.message, 9000); } }
      if (x === 'export') this.download('het-spoor-' + s.seed + '-dag' + s.clock.day + '.json', Save.pack(s));
      if (x === 'oldsave') this.download('het-spoor-oude-save.json', this.oldRaw);
      if (x === 'oldforget') { await Store.put('oldAuto', ''); this.oldRaw = null; this.system(); }
      if (x === 'start') this.showStart();
      if (x === 'new') { const seed = ($('#seedIn').value || '').trim(); if (seed) this.newGame(seed); else this.showStart(); }
      if (x === 'intro') { this.intro = Coach.fresh(); this.savePrefs(); this.toast('De uitleg begint opnieuw bij je volgende bezoek.'); this.system(); }
      if (x === 'level') { SFX.pin(); this.setLevel(t.dataset.v); this.system(); }
      if (x === 'cexport') this.download('het-spoor-content-standaard.json', Content.rawText);
      if (x === 'creset') { if (Content.cur === Content.base) return; await Store.put('contentPack', ''); Content.reset(); this.toast('Standaardpakket hersteld.'); this.system(); }
    });
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
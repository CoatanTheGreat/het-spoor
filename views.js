'use strict';
/* =====================================================================
   PAPER-AND-INK VIEWS (v0.6.0 spike; the only view since v0.6.1)
   Silhouette, Board (zaakbord), MapGen (spoorkaart), Tableau, Spoorboek (mock-up, hidden until v0.6.5), Figures.
   Views only read state; every change goes through Act (ui.js calls them).
   Leak rules: appearance and ordering never read the culprit flag, the cast order or private NPC fields
   (secrets, alignment, agenda). Test: 'Uiterlijk lekt de dader niet'.
   ===================================================================== */
// accent colour per location template (map and tableau)
const TEMPLATE_COLOR = { herberg: '#c98b4e', huis: '#9fb6c2', markt: '#e0b34a', kantoor: '#8ea0c4', haven: '#7fb3bd', poort: '#b5a98f', plein: '#c7c79a', werkplaats: '#c29a6b', archief: '#a99bbd', park: '#8fb873', straat: '#cfc9b6' };
const Hex = {
  rgb: (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; },
  mix(a, b, t) { const A = Hex.rgb(a), B = Hex.rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
};
// document family per era group (GROUPS): fonts, map lines and the colour family of tableaus
const FAMILY = {
  oud: { label: 'oud', kinds: ['Akte', 'Brief', 'Rol'], lines: ['de Hoofdweg', 'de Waterweg'], line: ['#9a5b24', '#3f6e78'], photo: '#d9c49a',
    pal: { wall: '#b39468', wood: '#5e3d24', wood2: '#80562f', floor: '#6f5236', stone: '#8f877a', trim: '#d9c08c', accent: '#8e2a1e', sky: 0, ink: '#27303a', rim: null } },
  klassiek: { label: 'klassiek', kinds: ['Telegram', 'Rapport', 'Notitie'], lines: ['Tram 1', 'Tram 2'], line: ['#b0472f', '#2f5f80'], photo: '#d7d1bf',
    pal: { wall: '#6f7f68', wood: '#4f3322', wood2: '#6e4a2f', floor: '#7a5a3c', stone: '#9b9384', trim: '#d6c391', accent: '#9c3b2e', ink: '#27303a', rim: null } },
  modern: { label: 'modern', kinds: ['Doorslag', 'Fax', 'Memo'], lines: ['Lijn 1', 'Lijn 2'], line: ['#d0782a', '#2f6aa3'], photo: '#d9dde3',
    pal: { wall: '#c7ac7c', wood: '#6e4e30', wood2: '#8c6a43', floor: '#8f7048', stone: '#a49d90', trim: '#ece0c2', accent: '#c2602b', ink: '#27303a', rim: null } },
  toekomst: { label: 'toekomst', kinds: ['Log', 'Datablad', 'Bericht'], lines: ['Ring A', 'Lijn B'], line: ['#2bb3a6', '#b85bc7'], photo: '#24323f',
    pal: { wall: '#2e3c4b', wood: '#3c4b5c', wood2: '#4d5f72', floor: '#1d2732', stone: '#46566a', trim: '#7fe3d7', accent: '#5fd3c7', ink: '#0e141b', rim: '#7fe3d7' } }
};
const famOf = (s) => (GROUPS[s.meta.era] || ['klassiek'])[0];
const ROLE_ACCENT = ['#b9442f', '#2f6f8f', '#c48a1c', '#4f7f3a', '#7a4f9a', '#a3563a', '#2f7d74', '#8a6a2a'];
const TONE_COLOR = { warm: '#4f7f3a', neutral: '#1f2933', cold: '#2f6f8f', hostile: '#b9442f' };
const TONE_STANCE = { warm: 0, neutral: 0, cold: 1, hostile: 2 };
const STANCE_LABEL = ['open', 'gesloten', 'afwerend'];
const byName = (a, b) => a.name.localeCompare(b.name, 'nl');

/* ---------------- Silhouette (v0.16.0): stylized ink-line / woodcut SVG portrait (0 KB) ----------------
   Only public fields feed the shape: name, gender, public role, age and the visible trait (kenmerk). Within a case the
   look is made unique in name order (v0.10.0). Mood expression (warm/neutral/cold/hostile) comes strictly from visible
   relation tone (never culprit flag or cast order). Coordinates: 0..100 wide, feet at y=260. */
const KM_FILL = '#f1e8cf', KM_LINE = '#1f2933';   // v0.10.0: the trait is light with a dark rim, readable on every role colour
const BUST_VB = [4, 2, 92, 108];                    // x, y, w, h of the bust frame
const Silhouette = {
  pub(npc) { return { name: String(npc.name || ''), gender: npc.gender === 'vrouw' ? 'vrouw' : 'man', role: String(npc.role || '').replace(/ \(.*\)$/, ''), age: +npc.age || 40 }; },
  accent(role) { return ROLE_ACCENT[parseInt(RNG.hashStr('role|' + String(role || '').replace(/ \(.*\)$/, '')), 36) % ROLE_ACCENT.length]; },
  pools(p, fam) {
    const f = p.gender === 'vrouw';
    const HAT = { oud: f ? ['kap', 'none', 'hood', 'kap'] : ['hood', 'cap', 'none', 'brim'], klassiek: f ? ['cloche', 'none', 'brim', 'none'] : ['bowler', 'cap', 'top', 'none'],
      modern: f ? ['none', 'none', 'beret', 'band'] : ['none', 'none', 'cap', 'beret'], toekomst: f ? ['none', 'visor', 'collar', 'none'] : ['visor', 'none', 'collar', 'none'] }[fam] || ['none'];
    const COAT = fam === 'oud' ? (f ? ['robe', 'dress', 'robe'] : ['tunic', 'robe', 'long']) : fam === 'toekomst' ? (f ? ['long', 'jacket', 'dress'] : ['long', 'jacket', 'jacket'])
      : (f ? ['dress', 'long', 'jacket', 'dress'] : ['long', 'jacket', 'jacket', 'long']);
    const HAIR = f ? ['bob', 'long', 'bun', 'tail', 'short'] : (p.age > 55 ? ['bald', 'short', 'crop'] : ['short', 'crop', 'short', 'long']);
    const ACC = ['none', 'glasses', 'scarf', 'bag', 'book', 'badge', 'none'].concat(p.age > 60 ? ['cane', 'cane', 'glasses'] : []);
    return { HAT: HAT, COAT: COAT, HAIR: HAIR, ACC: ACC };
  },
  covered: (hat) => ['hood', 'kap', 'cap', 'bowler', 'top', 'brim', 'cloche'].indexOf(hat) >= 0,
  // what the eye can tell apart: headwear, visible hair, coat
  key(t) { return t.hat + '|' + (this.covered(t.hat) ? '-' : t.hair) + '|' + t.coat; },
  // the look of one person from public fields only (no case context)
  base(npc, fam) {
    const p = this.pub(npc), f = p.gender === 'vrouw', r = RNG.make('sil|' + p.name + '|' + p.gender + '|' + p.role), P = this.pools(p, fam);
    // fixed draw order keeps shapes stable when one list changes length
    const t = { head: 13 + r.int(3), sw0: r.int(6), h0: r.next(), coat: r.pick(P.COAT), hair: r.pick(P.HAIR), hat: r.pick(P.HAT), acc: r.pick(P.ACC), accent: this.accent(p.role) };
    t.mixT = 0.08 + r.next() * 0.1;
    // v0.10.0 (voorstel 14): three builds and a wider height range
    t.build = r.int(3);
    t.sw = (f ? [14, 17, 20] : [16, 20, 24])[t.build] + t.sw0 % (f ? 2 : 3);
    t.head += t.build === 2 ? 1 : t.build === 0 ? -1 : 0;
    t.h = 0.86 + t.h0 * 0.22;
    // v0.16.0: woodcut facial features appended after existing RNG draws so coat/hair/hat/build stay stable
    t.jaw = r.int(3);
    t.nose = r.int(3);
    t.brow = r.int(3);
    t.paperT = r.int(4);
    t.gender = p.gender;
    t.age = p.age;
    t.stache = !f && p.age >= 38 && r.next() < 0.28;
    // v0.7.0: every person shows their trait (see KENMERK); without one there is no accessory
    t.acc = npc && npc.kenmerk ? npc.kenmerk : 'none';
    if (t.acc === 'glasses' && t.hat === 'visor') t.hat = 'none';
    return t;
  },
  // v0.10.0 (voorstel 14): no two core people of a case share headwear, visible hair and coat.
  // Assigned in name order, so it never reads the culprit flag or the cast order.
  _memo: new Map(),
  looks(s, fam) {
    const cast = s.cast.slice().sort(byName), sig = fam + '#' + cast.map((n) => [n.id, n.name, n.gender, n.role, n.age, n.kenmerk].join('/')).join(';');
    if (this._memo.has(sig)) return this._memo.get(sig);
    const used = new Set(), out = {}, uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
    cast.forEach((n) => {
      const t = this.base(n, fam), P = this.pools(this.pub(n), fam);
      if (used.has(this.key(t))) {
        const rot = (a, v) => { const u = uniq(a), i = Math.max(0, u.indexOf(v)); return u.slice(i).concat(u.slice(0, i)); };
        let hit = null;
        rot(P.HAT, t.hat).some((hat) => rot(P.COAT, t.coat).some((coat) => rot(P.HAIR, t.hair).some((hair) => {
          if (t.acc === 'glasses' && hat === 'visor') return false;
          const c = { hat: hat, coat: coat, hair: hair }; if (used.has(this.key(c))) return false; hit = c; return true; })));
        if (hit) Object.assign(t, hit);
      }
      used.add(this.key(t)); out[n.id] = { hat: t.hat, hair: t.hair, coat: t.coat };
    });
    if (this._memo.size > 40) this._memo.clear();
    this._memo.set(sig, out); return out;
  },
  traits(npc, fam, s) {
    const t = this.base(npc, fam);
    if (s && s.cast && npc && s.cast.some((x) => x.id === npc.id)) { const lk = this.looks(s, fam)[npc.id]; if (lk) Object.assign(t, lk); }
    return t;
  },
  toneOf(o) {
    if (o && o.tone && ['warm', 'neutral', 'cold', 'hostile'].indexOf(o.tone) >= 0) return o.tone;
    const st = (o && o.stance) || 0;
    return st === 1 ? 'cold' : st === 2 ? 'hostile' : 'neutral';
  },
  // v0.16.0: woodcut ink expression per mood (warm, neutral, cold, hostile), readable from 40 px to full
  expression(t, g, tone, z, ink, hi) {
    const cx = g.cx, hy = g.hy, ex = 4.7, ey = hy - 0.4;
    const bw = ((t.brow === 2 ? 1.55 : t.brow === 1 ? 1.05 : 1.28) * (0.72 + 0.28 * z)).toFixed(2);
    const mw = (1.35 * (0.76 + 0.24 * z)).toFixed(2);
    const nw = (0.95 * (0.75 + 0.25 * z)).toFixed(2);
    let brows = '', eyes = '', mouth = '', extras = '';
    // nose bridge (subtle woodcut stroke)
    const nose = t.nose === 0
      ? `<path d="M${cx} ${ey + 0.6} L${cx - 0.5} ${hy + 4.3} L${cx + 1.1} ${hy + 4.5}" fill="none" stroke="${ink}" stroke-width="${nw}" stroke-linecap="round" stroke-linejoin="round" opacity=".72"/>`
      : t.nose === 1
      ? `<path d="M${cx} ${ey + 1.1} Q${cx + 1.0} ${hy + 3.2} ${cx - 0.6} ${hy + 4.2}" fill="none" stroke="${ink}" stroke-width="${nw}" stroke-linecap="round" opacity=".68"/>`
      : `<path d="M${cx - 0.2} ${ey + 0.2} L${cx + 1.3} ${hy + 4.4} L${cx - 0.8} ${hy + 4.7}" fill="none" stroke="${ink}" stroke-width="${nw}" stroke-linecap="round" stroke-linejoin="round" opacity=".76"/>`;
    if (tone === 'warm') {
      brows = `<path d="M${cx - 8.2} ${hy - 4.9} Q${cx - 4.7} ${hy - 7.4} ${cx - 1.7} ${hy - 5.4} M${cx + 1.7} ${hy - 5.4} Q${cx + 4.7} ${hy - 7.4} ${cx + 8.2} ${hy - 4.9}" fill="none" stroke="${ink}" stroke-width="${bw}" stroke-linecap="round"/>`;
      eyes = `<circle cx="${cx - ex}" cy="${ey}" r="${(1.45 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/><circle cx="${cx + ex}" cy="${ey}" r="${(1.45 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/>` +
        `<circle cx="${cx - ex - 0.45}" cy="${ey - 0.45}" r="0.45" fill="${hi}"/><circle cx="${cx + ex - 0.45}" cy="${ey - 0.45}" r="0.45" fill="${hi}"/>` +
        `<path d="M${cx - ex - 2.1} ${ey + 1.4} Q${cx - ex} ${ey + 0.5} ${cx - ex + 2.1} ${ey + 1.4} M${cx + ex - 2.1} ${ey + 1.4} Q${cx + ex} ${ey + 0.5} ${cx + ex + 2.1} ${ey + 1.4}" fill="none" stroke="${ink}" stroke-width="0.7" opacity=".45" stroke-linecap="round"/>`;
      mouth = `<path d="M${cx - 4.7} ${hy + 7.4} Q${cx} ${hy + 11.4} ${cx + 4.7} ${hy + 7.4}" fill="none" stroke="${ink}" stroke-width="${mw}" stroke-linecap="round"/>`;
      extras = `<path d="M${cx - 5.3} ${hy + 6.9} L${cx - 4.4} ${hy + 7.8} M${cx + 5.3} ${hy + 6.9} L${cx + 4.4} ${hy + 7.8}" stroke="${ink}" stroke-width="0.8" opacity=".45" stroke-linecap="round"/>`;
    } else if (tone === 'cold') {
      brows = `<path d="M${cx - 8.4} ${hy - 4.1} L${cx - 1.6} ${hy - 4.8} M${cx + 1.6} ${hy - 4.8} L${cx + 8.4} ${hy - 4.1}" fill="none" stroke="${ink}" stroke-width="${bw}" stroke-linecap="round"/>`;
      eyes = `<path d="M${cx - ex - 2.3} ${ey - 1.1} L${cx - ex + 2.2} ${ey - 0.9} M${cx + ex - 2.2} ${ey - 0.9} L${cx + ex + 2.3} ${ey - 1.1}" stroke="${ink}" stroke-width="${(1.25 * (0.8 + 0.2 * z)).toFixed(2)}" stroke-linecap="round"/>` +
        `<circle cx="${cx - ex}" cy="${ey + 0.3}" r="${(1.25 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/><circle cx="${cx + ex}" cy="${ey + 0.3}" r="${(1.25 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/>`;
      mouth = `<path d="M${cx - 3.6} ${hy + 8.9} Q${cx} ${hy + 8.3} ${cx + 3.6} ${hy + 9.2}" fill="none" stroke="${ink}" stroke-width="${mw}" stroke-linecap="round"/>`;
    } else if (tone === 'hostile') {
      brows = `<path d="M${cx - 8.6} ${hy - 5.7} L${cx - 1.4} ${hy - 3.1} M${cx + 1.4} ${hy - 3.1} L${cx + 8.6} ${hy - 5.7}" fill="none" stroke="${ink}" stroke-width="${(parseFloat(bw) + 0.25).toFixed(2)}" stroke-linecap="round"/>` +
        `<path d="M${cx - 0.9} ${hy - 4.6} L${cx - 0.9} ${hy - 2.4} M${cx + 0.9} ${hy - 4.6} L${cx + 0.9} ${hy - 2.4}" stroke="${ink}" stroke-width="0.85" opacity=".75" stroke-linecap="round"/>`;
      eyes = `<path d="M${cx - ex - 2.3} ${ey - 1.4} L${cx - ex + 2.3} ${ey - 0.5} M${cx + ex - 2.3} ${ey - 0.5} L${cx + ex + 2.3} ${ey - 1.4}" stroke="${ink}" stroke-width="${(1.3 * (0.8 + 0.2 * z)).toFixed(2)}" stroke-linecap="round"/>` +
        `<circle cx="${cx - ex + 0.2}" cy="${ey + 0.2}" r="${(1.32 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/><circle cx="${cx + ex - 0.2}" cy="${ey + 0.2}" r="${(1.32 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/>`;
      mouth = `<path d="M${cx - 4.5} ${hy + 9.8} Q${cx} ${hy + 6.9} ${cx + 4.5} ${hy + 9.8}" fill="none" stroke="${ink}" stroke-width="${mw}" stroke-linecap="round"/>`;
      extras = `<path d="M${cx - 2.2} ${hy + 10.9} Q${cx} ${hy + 10.4} ${cx + 2.2} ${hy + 10.9}" fill="none" stroke="${ink}" stroke-width="0.8" opacity=".55" stroke-linecap="round"/>`;
    } else {
      brows = `<path d="M${cx - 8.1} ${hy - 5.0} Q${cx - 4.7} ${hy - 5.9} ${cx - 1.7} ${hy - 5.0} M${cx + 1.7} ${hy - 5.0} Q${cx + 4.7} ${hy - 5.9} ${cx + 8.1} ${hy - 5.0}" fill="none" stroke="${ink}" stroke-width="${bw}" stroke-linecap="round"/>`;
      eyes = `<path d="M${cx - ex - 2.1} ${ey - 1.2} Q${cx - ex} ${ey - 2.0} ${cx - ex + 2.1} ${ey - 1.1} M${cx + ex - 2.1} ${ey - 1.1} Q${cx + ex} ${ey - 2.0} ${cx + ex + 2.1} ${ey - 1.2}" fill="none" stroke="${ink}" stroke-width="0.85" opacity=".65" stroke-linecap="round"/>` +
        `<circle cx="${cx - ex}" cy="${ey}" r="${(1.4 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/><circle cx="${cx + ex}" cy="${ey}" r="${(1.4 * (0.85 + 0.15 * z)).toFixed(2)}" fill="${ink}"/>`;
      mouth = `<path d="M${cx - 3.8} ${hy + 8.4} Q${cx} ${hy + 8.9} ${cx + 3.8} ${hy + 8.4}" fill="none" stroke="${ink}" stroke-width="${mw}" stroke-linecap="round"/>` +
        `<path d="M${cx - 1.6} ${hy + 10.1} Q${cx} ${hy + 10.6} ${cx + 1.6} ${hy + 10.1}" fill="none" stroke="${ink}" stroke-width="0.7" opacity=".4" stroke-linecap="round"/>`;
    }
    if (t.stache) {
      extras += `<path d="M${cx - 4.8} ${hy + 6.9} Q${cx - 1.8} ${hy + 5.2} ${cx} ${hy + 6.3} Q${cx + 1.8} ${hy + 5.2} ${cx + 4.8} ${hy + 6.9}" fill="none" stroke="${ink}" stroke-width="${(1.45 * (0.8 + 0.2 * z)).toFixed(2)}" stroke-linecap="round"/>`;
    }
    if (t.age >= 52) {
      extras += `<path d="M${cx - 7.8} ${hy + 3.4} Q${cx - 6.6} ${hy + 6.1} ${cx - 5.2} ${hy + 7.5} M${cx + 7.8} ${hy + 3.4} Q${cx + 6.6} ${hy + 6.1} ${cx + 5.2} ${hy + 7.5}" fill="none" stroke="${ink}" stroke-width="0.75" opacity=".32" stroke-linecap="round"/>`;
    }
    return `<g class="sil-expr" data-tone="${tone}">${brows}${eyes}${nose}${mouth}${extras}</g>`;
  },
  // the trait as drawn: an svg string plus its bounding box (the box feeds the test 'kenmerk in beeld')
  kenmerk(t, g, bust, z) {
    const cx = g.cx, hy = g.hy, sy = g.sy, L = g.L, R = g.R, st = g.st, dk = (2.2 * z + 1.2).toFixed(2), lt = (1.6 * z).toFixed(2), rim = `stroke="${KM_LINE}" stroke-width="${(1.3 * z).toFixed(2)}"`;
    const twin = (d, w) => `<path d="${d}" fill="none" stroke="${KM_LINE}" stroke-width="${(w + 1.6 * z).toFixed(2)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${KM_FILL}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`;
    switch (t.acc) {
      case 'glasses': { const r = bust ? 3.6 + 0.5 * z : 3.6;
        const gdk = bust ? dk : '2.35', glt = bust ? lt : '1.15';
        return { box: [cx - 5 - r, hy - r, 10 + 2 * r, 2 * r], svg: `<g fill="none" stroke-linecap="round"><g stroke="${KM_LINE}" stroke-width="${gdk}"><circle cx="${cx - 5}" cy="${hy}" r="${r}"/><circle cx="${cx + 5}" cy="${hy}" r="${r}"/><path d="M${cx - 5 + r} ${hy} L${cx + 5 - r} ${hy}"/></g>` +
          `<g stroke="${KM_FILL}" stroke-width="${glt}"><circle cx="${cx - 5}" cy="${hy}" r="${r}"/><circle cx="${cx + 5}" cy="${hy}" r="${r}"/><path d="M${cx - 5 + r} ${hy} L${cx + 5 - r} ${hy}"/></g></g>` }; }
      case 'scarf': return { box: [cx - 11, sy - 4, 22, 37], svg: `<path d="M${cx - 10} ${sy - 4} L${cx + 10} ${sy - 4} L${cx + 11} ${sy + 4} L${cx - 11} ${sy + 4} Z M${cx + 3} ${sy + 3} L${cx + 9} ${sy + 32} L${cx + 3} ${sy + 33} L${cx - 1} ${sy + 4} Z" fill="${KM_FILL}" ${rim}/><path d="M${cx - 7} ${sy} L${cx + 7} ${sy} M${cx + 2} ${sy + 14} L${cx + 7} ${sy + 13} M${cx + 3} ${sy + 23} L${cx + 8} ${sy + 22}" stroke="${KM_LINE}" stroke-width="${(0.9 * z).toFixed(2)}" opacity=".55"/>` };
      case 'badge': { const r = bust ? 3.2 * z + 0.6 : 3.4, x = cx - t.sw / 2, y = sy + 16;
        return { box: [x - r, y - r, 2 * r, 2 * r], svg: `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${KM_FILL}" ${rim}/><circle cx="${x}" cy="${y}" r="${(r * 0.42).toFixed(2)}" fill="${KM_LINE}"/>` }; }
      case 'bag':
        if (bust) { const bx = R - 8, by = 90;
          return { box: [bx, by, 20, 20], svg: twin(`M${L + 5} ${sy + 1} L${bx + 8} ${by + 2}`, 1.8 * z) + `<rect x="${bx}" y="${by}" width="20" height="18" rx="2.5" fill="${KM_FILL}" ${rim}/><path d="M${bx} ${by + 6} L${bx + 20} ${by + 6}" stroke="${KM_LINE}" stroke-width="${(1.1 * z).toFixed(2)}"/><rect x="${bx + 8}" y="${by + 4.5}" width="4" height="4" rx="0.8" fill="${KM_LINE}"/>` }; }
        return { box: [R - 4, sy + 64, 17, 13], svg: twin(`M${L + 5} ${sy + 1} L${R + 3} ${sy + 66}`, 2) + `<rect x="${R - 4}" y="${sy + 64}" width="17" height="13" rx="2" fill="${KM_FILL}" ${rim}/><path d="M${R - 4} ${sy + 69} L${R + 13} ${sy + 69}" stroke="${KM_LINE}" stroke-width="1.1"/>` };
      case 'book':
        if (bust) { const bx = cx + 1, by = sy + 14;
          return { box: [bx, by, 18, 24], svg: `<g transform="rotate(-8 ${bx + 9} ${by + 12})"><rect x="${bx}" y="${by}" width="18" height="24" rx="1.5" fill="${KM_FILL}" ${rim}/><path d="M${bx + 3} ${by} L${bx + 3} ${by + 24} M${bx + 6} ${by + 7} L${bx + 15} ${by + 7} M${bx + 6} ${by + 12} L${bx + 13} ${by + 12}" stroke="${KM_LINE}" stroke-width="${(1.05 * z).toFixed(2)}"/></g>` }; }
        { const y = sy + (st === 2 ? 58 : 66); return { box: [L - 11, y, 11, 15], svg: `<rect x="${L - 11}" y="${y}" width="11" height="15" rx="1.5" fill="${KM_FILL}" ${rim}/><path d="M${L - 8} ${y} L${L - 8} ${y + 15}" stroke="${KM_LINE}" stroke-width="1"/>` }; }
      case 'cane':
        if (bust) return { box: [R - 2, sy - 9, 13, 120 - sy], svg: twin(`M${R + 8} 112 L${R + 8} ${sy + 2} q0 -10 -8 -10 q-6 0 -6 6`, 2.2 * z) };
        return { box: [R - 1, sy + 77, 13, 258 - sy - 77], svg: twin(`M${R + 6} ${sy + 84} L${R + 11} 258 M${R + 6} ${sy + 84} q-1 -7 -7 -5`, 2.6) };
      default: return { box: null, svg: '' };
    }
  },
  // one figure as an SVG <g>; o: { fam, stance 0-2, tone, color, accent, gap, rim, crowd, mode, w, s }
  figure(npc, o) {
    o = o || {}; const fam = o.fam || 'klassiek', t = this.traits(npc, fam, o.s), pal = FAMILY[fam] ? FAMILY[fam].pal : FAMILY.klassiek.pal;
    const tone = this.toneOf(o), st = o.stance != null ? o.stance : (o.tone ? TONE_STANCE[tone] : 0);
    const bust = o.mode !== 'full', z = bust ? ((o.w || 64) < 56 ? 1.6 : 1.2) : 1;
    const base = o.color || pal.ink, C = o.crowd ? Hex.mix(base, '#8d969e', 0.42) : Hex.mix(base, t.accent, t.mixT), A = o.accent || (o.crowd ? Hex.mix(t.accent, '#9aa0a6', 0.5) : t.accent);
    const ink = o.crowd ? Hex.mix(pal.ink, '#5b646d', 0.35) : pal.ink;
    const paperPal = fam === 'toekomst' ? ['#d7ece9', '#cce3e2', '#c3dbdc', '#d2e6e1'] : ['#f5ecd9', '#efe4cd', '#e8d9bd', '#f1e5ce'];
    const faceFill = o.crowd ? Hex.mix(paperPal[t.paperT || 0], '#b8bec2', 0.38) : paperPal[t.paperT || 0];
    const shade = Hex.mix(faceFill, ink, 0.17), hi = Hex.mix(faceFill, '#ffffff', 0.35);
    const lw = (bust ? ((o.w || 64) < 56 ? 1.55 : 1.18) : 1.05).toFixed(2);
    const rim = o.rim === undefined ? pal.rim : o.rim;
    const cx = 50, r = t.head, hy = 40, top = hy - r, sw = t.sw, sy = 64, L = cx - sw, R = cx + sw, mir = (x) => 2 * cx - x;
    const covered = this.covered(t.hat);
    let back = '', body = '', head = '', front = '';
    // hair and headwear behind the head (with woodcut contour & engraved highlights)
    if (t.hair === 'long' && t.hat !== 'hood') back += `<path d="M${cx - r - 2} ${hy - 2} Q${cx - r - 5} ${hy + 32} ${cx - r + 1} ${sy + 28} L${cx + r - 1} ${sy + 28} Q${cx + r + 5} ${hy + 32} ${cx + r + 2} ${hy - 2} Z" stroke="${ink}" stroke-width="${lw}"/><path d="M${cx - r - 1} ${hy + 12} Q${cx - r - 2} ${hy + 28} ${cx - r + 2} ${sy + 22} M${cx + r + 1} ${hy + 12} Q${cx + r + 2} ${hy + 28} ${cx + r - 2} ${sy + 22}" fill="none" stroke="${hi}" stroke-width="0.9" opacity=".32"/>`;
    if (t.hair === 'bob' && !covered) back += `<path d="M${cx - r - 3} ${hy + r - 1} Q${cx - r - 5} ${top - 3} ${cx} ${top - 3} Q${cx + r + 5} ${top - 3} ${cx + r + 3} ${hy + r - 1} Z" stroke="${ink}" stroke-width="${lw}"/>`;
    if (t.hat === 'hood') back += `<path d="M${cx - r - 8} ${sy + 10} C${cx - r - 11} ${top - 6} ${cx + r + 11} ${top - 6} ${cx + r + 8} ${sy + 10} Z" stroke="${ink}" stroke-width="${lw}"/><path d="M${cx - r - 5} ${hy + 4} C${cx - r - 6} ${top - 1} ${cx + r + 6} ${top - 1} ${cx + r + 5} ${hy + 4}" fill="none" stroke="${hi}" stroke-width="1" opacity=".38"/>`;
    if (t.hat === 'kap') back += `<ellipse cx="${cx}" cy="${hy - 1}" rx="${r + 4}" ry="${r + 5}" fill="${A}" stroke="${ink}" stroke-width="${lw}"/>`;
    if (t.hat === 'collar') back += `<path d="M${cx - 14} ${sy + 2} L${cx - 13} ${hy + 2} L${cx - 6} ${hy + 10} L${cx - 6} ${sy} Z M${mir(cx - 14)} ${sy + 2} L${mir(cx - 13)} ${hy + 2} L${mir(cx - 6)} ${hy + 10} L${mir(cx - 6)} ${sy} Z" stroke="${ink}" stroke-width="${lw}"/>`;
    // body: coat shapes with woodcut ink contour, lapels and engraving hatching
    const sh = `M${L} ${sy + 8} Q${L} ${sy} ${L + 9} ${sy - 1} L${R - 9} ${sy - 1} Q${R} ${sy} ${R} ${sy + 8}`;
    const leg = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" stroke="${ink}" stroke-width="1"/>`;
    if (t.coat === 'long') body += `<path d="${sh} L${R + 5} 202 L${L - 5} 202 Z" stroke="${ink}" stroke-width="${lw}"/>` + leg(cx - 12, 196, 10, 62) + leg(cx + 2, 196, 10, 62);
    else if (t.coat === 'jacket') body += `<path d="${sh} L${R + 2} 150 L${L - 2} 150 Z" stroke="${ink}" stroke-width="${lw}"/><path d="M${cx - 14} 144 L${cx + 14} 144 L${cx + 13} 258 L${cx + 3} 258 L${cx} 172 L${cx - 3} 258 L${cx - 13} 258 Z" stroke="${ink}" stroke-width="1"/>`;
    else if (t.coat === 'dress') body += `<path d="${sh} L${R - 3} 118 L${R + 16} 226 L${L - 16} 226 L${L + 3} 118 Z" stroke="${ink}" stroke-width="${lw}"/>` + leg(cx - 9, 220, 6, 38) + leg(cx + 3, 220, 6, 38);
    else if (t.coat === 'robe') body += `<path d="${sh} L${R + 10} 254 L${L - 10} 254 Z" stroke="${ink}" stroke-width="${lw}"/>`;
    else body += `<path d="${sh} L${R + 6} 172 L${L - 6} 172 Z" stroke="${ink}" stroke-width="${lw}"/>` + leg(cx - 11, 166, 9, 92) + leg(cx + 2, 166, 9, 92) + `<rect x="${L - 2}" y="122" width="${2 * sw + 4}" height="5" fill="${A}" stroke="${ink}" stroke-width="0.9"/>`;
    body += `<ellipse cx="${cx - 8}" cy="258" rx="8" ry="3.4"/><ellipse cx="${cx + 8}" cy="258" rx="8" ry="3.4"/>`;
    // woodcut lapels, seam, buttons and right-shoulder engraving hatch
    body += `<path d="M${cx} ${sy + 14} L${cx} ${t.coat === 'jacket' ? 148 : 168}" stroke="${hi}" stroke-width="0.9" opacity=".32"/>`;
    body += `<path d="M${cx - 8} ${sy} L${cx - 11} ${sy + 15} L${cx - 2} ${sy + 18} M${cx + 8} ${sy} L${cx + 11} ${sy + 15} L${cx + 2} ${sy + 18}" fill="none" stroke="${hi}" stroke-width="1.15" opacity=".48" stroke-linejoin="round"/>`;
    body += `<path d="M${R - 6} ${sy + 7} L${R - 1} ${sy + 12} M${R - 7} ${sy + 13} L${R - 1} ${sy + 19} M${R - 7} ${sy + 20} L${R - 2} ${sy + 25}" stroke="${hi}" stroke-width="0.9" opacity=".34" stroke-linecap="round"/>`;
    if (t.coat !== 'robe') body += `<circle cx="${cx + 2.5}" cy="${sy + 24}" r="1.25" fill="${hi}" opacity=".55"/><circle cx="${cx + 2.5}" cy="${sy + 35}" r="1.25" fill="${hi}" opacity=".55"/>`;
    // arms by stance: 0 open (hanging), 1 closed (folded), 2 defensive (hands on hips)
    if (st === 0) { const arm = `M${L + 2} ${sy + 4} Q${L - 6} ${sy + 10} ${L - 7} ${sy + 50} L${L - 5} ${sy + 86} Q${L - 1} ${sy + 92} ${L + 2} ${sy + 86} L${L + 4} ${sy + 30} Z`;
      body += `<path d="${arm}" stroke="${ink}" stroke-width="1"/><path d="${arm}" transform="translate(${2 * cx} 0) scale(-1 1)" stroke="${ink}" stroke-width="1"/>`; }
    if (st === 2) { const arm = `M${L + 1} ${sy + 4} L${L - 15} ${sy + 40} L${L + 3} ${sy + 64} L${L + 6} ${sy + 56} L${L - 5} ${sy + 40} L${L + 4} ${sy + 16} Z`;
      body += `<path d="${arm}" stroke="${ink}" stroke-width="1"/><path d="${arm}" transform="translate(${2 * cx} 0) scale(-1 1)" stroke="${ink}" stroke-width="1"/>`; }
    // paper-toned neck with chin shadow hatching + shirt collar + role accent
    const ny = hy + r - 3, nh = Math.max(8, sy - ny + 5);
    body += `<rect x="${cx - 4.8}" y="${ny}" width="9.6" height="${nh}" fill="${faceFill}" stroke="${ink}" stroke-width="${lw}"/>`;
    body += `<path d="M${cx - 4.2} ${ny + 2} L${cx + 4.2} ${ny + 2} L${cx + 4.2} ${ny + 6.5} Q${cx} ${ny + 8} ${cx - 4.2} ${ny + 5.5} Z" fill="${shade}"/>`;
    body += `<path d="M${cx - 7.5} ${sy - 1} L${cx} ${sy + 13} L${cx + 7.5} ${sy - 1} Z" fill="${faceFill}" stroke="${ink}" stroke-width="1"/>`;
    body += `<path d="M${cx - 5.2} ${sy - 1} L${cx} ${sy + 10.5} L${cx + 5.2} ${sy - 1} Z" fill="${A}" stroke="${ink}" stroke-width="0.8"/>`;   // role mark: always visible
    if (st === 1) body += `<rect x="${L - 5}" y="${sy + 30}" width="${2 * sw + 10}" height="16" rx="8" stroke="${o.gap || hi}" stroke-width="1.5"/><path d="M${cx - 8} ${sy + 34} L${cx + 10} ${sy + 42}" stroke="${hi}" stroke-width="1" opacity=".4"/>`;
    // sculpted woodcut head (paper fill, ink contour, subtle ears, cheek shadow hatching)
    const jw = t.jaw === 2 ? r * 0.96 : t.jaw === 0 ? r * 0.78 : r * 0.88;
    const faceD = `M${cx - r} ${hy - 1} C${cx - r} ${top - 2} ${cx + r} ${top - 2} ${cx + r} ${hy - 1} C${cx + r} ${hy + r * 0.62} ${cx + jw * 0.68} ${hy + r + 1.4} ${cx} ${hy + r + 1.6} C${cx - jw * 0.68} ${hy + r + 1.4} ${cx - r} ${hy + r * 0.62} ${cx - r} ${hy - 1} Z`;
    if (!covered && t.hair !== 'long' && t.hair !== 'bob') {
      head += `<ellipse cx="${cx - r - 0.5}" cy="${hy + 1}" rx="2.1" ry="3.3" fill="${faceFill}" stroke="${ink}" stroke-width="1"/><ellipse cx="${cx + r + 0.5}" cy="${hy + 1}" rx="2.1" ry="3.3" fill="${faceFill}" stroke="${ink}" stroke-width="1"/>`;
    }
    head += `<path d="${faceD}" fill="${faceFill}" stroke="${ink}" stroke-width="${lw}"/>`;
    // right-side woodcut cheek shading + fine diagonal engraving strokes
    head += `<path d="M${cx + r * 0.52} ${top + 5} C${cx + r * 0.98} ${hy - 3} ${cx + r * 0.92} ${hy + r * 0.65} ${cx + 2} ${hy + r + 1.1} C${cx + r * 0.52} ${hy + r * 0.62} ${cx + r * 0.62} ${hy} ${cx + r * 0.52} ${top + 5} Z" fill="${shade}" opacity=".75"/>`;
    head += `<path d="M${cx + r * 0.62} ${hy + 3} L${cx + r * 0.92} ${hy + 1.5} M${cx + r * 0.54} ${hy + 6.5} L${cx + r * 0.86} ${hy + 5} M${cx + r * 0.42} ${hy + 9.5} L${cx + r * 0.72} ${hy + 8.2}" stroke="${ink}" stroke-width="0.75" opacity=".36" stroke-linecap="round"/>`;
    // hair framing the forehead (leaves face & expression completely clear)
    if (!covered) {
      if (t.hair === 'short') head += `<path d="M${cx - r - 0.8} ${hy - 2} C${cx - r - 1.4} ${top - 4.5} ${cx + r + 1.4} ${top - 4.5} ${cx + r + 0.8} ${hy - 2} Q${cx + r * 0.4} ${top + 4.5} ${cx - 2} ${top + 3.2} Q${cx - r * 0.7} ${top + 5.5} ${cx - r - 0.8} ${hy - 2} Z" stroke="${ink}" stroke-width="1"/><path d="M${cx - r * 0.5} ${top - 0.5} Q${cx} ${top - 2.6} ${cx + r * 0.55} ${top - 0.2}" fill="none" stroke="${hi}" stroke-width="0.95" opacity=".4"/>`;
      else if (t.hair === 'crop') head += `<path d="M${cx - r - 0.2} ${hy - 3} C${cx - r - 0.4} ${top - 2.6} ${cx + r + 0.4} ${top - 2.6} ${cx + r + 0.2} ${hy - 3} Q${cx} ${top + 3.5} ${cx - r - 0.2} ${hy - 3} Z" stroke="${ink}" stroke-width="0.9"/>`;
      else if (t.hair === 'bald') head += `<path d="M${cx - r - 0.5} ${hy - 2} Q${cx - r + 1.5} ${hy - 5} ${cx - r + 1.5} ${hy + 1} M${cx + r + 0.5} ${hy - 2} Q${cx + r - 1.5} ${hy - 5} ${cx + r - 1.5} ${hy + 1}" fill="none" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/><path d="M${cx - 4.5} ${top + 2.8} Q${cx - 1} ${top + 1.4} ${cx + 2.5} ${top + 2.5}" fill="none" stroke="${hi}" stroke-width="1.1" opacity=".75" stroke-linecap="round"/>`;
      else if (t.hair === 'bob') head += `<path d="M${cx - r - 1.5} ${hy + 1} C${cx - r - 2} ${top - 4} ${cx + r + 2} ${top - 4} ${cx + r + 1.5} ${hy + 1} Q${cx + r * 0.35} ${top + 3.8} ${cx} ${top + 2.4} Q${cx - r * 0.35} ${top + 3.8} ${cx - r - 1.5} ${hy + 1} Z" stroke="${ink}" stroke-width="1"/>`;
      else if (t.hair === 'long') head += `<path d="M${cx - r - 1.2} ${hy} C${cx - r - 1.8} ${top - 4} ${cx + r + 1.8} ${top - 4} ${cx + r + 1.2} ${hy} Q${cx + 2} ${top + 3.6} ${cx} ${top + 1.8} Q${cx - 2} ${top + 3.6} ${cx - r - 1.2} ${hy} Z" stroke="${ink}" stroke-width="1"/>`;
      else if (t.hair === 'bun') head += `<circle cx="${cx + 2}" cy="${top - 3.5}" r="5.8" stroke="${ink}" stroke-width="1"/><path d="M${cx - r - 0.6} ${hy - 2} C${cx - r - 1} ${top - 3.5} ${cx + r + 1} ${top - 3.5} ${cx + r + 0.6} ${hy - 2} Q${cx} ${top + 3.2} ${cx - r - 0.6} ${hy - 2} Z" stroke="${ink}" stroke-width="1"/>`;
      else if (t.hair === 'tail') head += `<circle cx="${cx + r - 1}" cy="${hy - 5}" r="4.8" stroke="${ink}" stroke-width="1"/><path d="M${cx + r} ${hy - 2} Q${cx + r + 9} ${hy + 14} ${cx + r + 3} ${hy + 30}" fill="none" stroke="${C}" stroke-width="5.5" stroke-linecap="round"/><path d="M${cx - r - 0.5} ${hy - 2.5} C${cx - r - 0.8} ${top - 3.2} ${cx + r + 0.8} ${top - 3.2} ${cx + r + 0.5} ${hy - 2.5} Q${cx} ${top + 3} ${cx - r - 0.5} ${hy - 2.5} Z" stroke="${ink}" stroke-width="1"/>`;
    }
    // facial expression drawn cleanly onto the woodcut face
    head += this.expression(t, { cx: cx, hy: hy, r: r }, tone, z, ink, hi);
    // headwear (with crisp ink lines and highlights)
    const band = (y, w) => `<rect x="${cx - w}" y="${y}" width="${2 * w}" height="3.2" fill="${A}" stroke="${ink}" stroke-width="0.7"/>`;
    if (t.hat === 'kap') head += `<path d="M${cx - r - 0.5} ${hy - 2.5} Q${cx} ${top - 7} ${cx + r + 0.5} ${hy - 2.5} Q${cx} ${top + 3.5} ${cx - r - 0.5} ${hy - 2.5} Z" fill="${A}" stroke="${ink}" stroke-width="1"/>`;
    if (t.hat === 'cap') head += `<path d="M${cx - r - 1} ${hy - 4.5} Q${cx} ${top - 6.5} ${cx + r + 1} ${hy - 4.5} Z" stroke="${ink}" stroke-width="1"/><ellipse cx="${cx + 3}" cy="${hy - 4.5}" rx="${r + 5}" ry="2.5" stroke="${ink}" stroke-width="1"/>`;
    if (t.hat === 'bowler') head += `<path d="M${cx - r + 1} ${top + 4} Q${cx - r + 1} ${top - 11} ${cx} ${top - 11} Q${cx + r - 1} ${top - 11} ${cx + r - 1} ${top + 4} Z" stroke="${ink}" stroke-width="1"/><ellipse cx="${cx}" cy="${top + 4}" rx="${r + 6}" ry="2.7" stroke="${ink}" stroke-width="1"/>` + band(top, r - 1) + `<path d="M${cx - r * 0.4} ${top - 6.5} Q${cx} ${top - 9.2} ${cx + r * 0.35} ${top - 6.8}" fill="none" stroke="${hi}" stroke-width="0.95" opacity=".4"/>`;
    if (t.hat === 'top') head += `<rect x="${cx - r + 2}" y="${top - 20}" width="${2 * r - 4}" height="24" stroke="${ink}" stroke-width="1"/><ellipse cx="${cx}" cy="${top + 3.5}" rx="${r + 6}" ry="2.7" stroke="${ink}" stroke-width="1"/>` + band(top - 0.5, r - 2) + `<line x1="${cx - r + 5}" y1="${top - 17}" x2="${cx - r + 5}" y2="${top - 2}" stroke="${hi}" stroke-width="1" opacity=".35"/>`;
    if (t.hat === 'brim') head += `<path d="M${cx - r + 3} ${top + 4} Q${cx - r + 3} ${top - 8} ${cx} ${top - 8} Q${cx + r - 3} ${top - 8} ${cx + r - 3} ${top + 4} Z" stroke="${ink}" stroke-width="1"/><ellipse cx="${cx}" cy="${top + 4}" rx="${r + 13}" ry="3.5" stroke="${ink}" stroke-width="1"/>` + band(top, r - 3);
    if (t.hat === 'cloche') head += `<path d="M${cx - r - 2.5} ${hy - 1.5} Q${cx - r - 2.5} ${top - 5} ${cx} ${top - 6} Q${cx + r + 2.5} ${top - 5} ${cx + r + 2.5} ${hy - 1.5} Q${cx} ${hy - 7.5} ${cx - r - 2.5} ${hy - 1.5} Z" stroke="${ink}" stroke-width="1"/>` + band(hy - 7.2, r + 0.5);
    if (t.hat === 'beret') head += `<ellipse cx="${cx + 3}" cy="${top + 1.5}" rx="${r + 4}" ry="5.2" transform="rotate(-8 ${cx} ${top})" stroke="${ink}" stroke-width="1"/>`;
    if (t.hat === 'band') head += band(top + 3.5, r - 0.5);
    if (t.hat === 'visor') head += `<rect x="${cx - r - 3}" y="${hy - 4.8}" width="${2 * r + 6}" height="7.4" rx="3.7" fill="${A}" fill-opacity=".32" stroke="${A}" stroke-width="1.3"/><line x1="${cx - r}" y1="${hy - 2.6}" x2="${cx + r * 0.4}" y2="${hy - 2.6}" stroke="${hi}" stroke-width="0.9" opacity=".7"/>`;
    if (t.hat === 'collar') front += `<path d="M${cx - 13} ${hy + 2} L${cx - 6} ${hy + 10} M${mir(cx - 13)} ${hy + 2} L${mir(cx - 6)} ${hy + 10}" stroke="${A}" stroke-width="2" fill="none"/>`;
    // v0.10.0 (voorstel 14): the trait, also inside the bust frame and thicker in small portraits
    front += this.kenmerk(t, { cx: cx, hy: hy, sy: sy, L: L, R: R, st: st }, bust, z).svg;
    const tilt = st === 1 ? ' transform="translate(0 2) rotate(-5 50 56)"' : st === 2 ? ' transform="translate(0 -1) rotate(5 50 56)"' : '';
    const stroke = rim ? ` stroke="${rim}" stroke-width="1.2" stroke-opacity=".65"` : '';
    return `<g fill="${C}"${stroke}><g transform="translate(50 260) scale(${(o.mode === 'full' ? t.h : 1).toFixed(3)}) translate(-50 -260)">${back}${body}<g${tilt}>${head}</g>${front}</g></g>`;
  },
  // box of the trait in figure coordinates (test helper); same geometry as figure()
  kenmerkBox(npc, o) {
    o = o || {}; const fam = o.fam || 'klassiek', t = this.traits(npc, fam, o.s), bust = o.mode !== 'full', z = bust ? ((o.w || 64) < 56 ? 1.6 : 1.2) : 1;
    return this.kenmerk(t, { cx: 50, hy: 40, sy: 64, L: 50 - t.sw, R: 50 + t.sw, st: o.stance || 0 }, bust, z).box;
  },
  svg(npc, o) {
    o = o || {}; const bust = o.mode !== 'full', vb = bust ? BUST_VB.join(' ') : '-8 -6 116 270';
    const w = o.w || (bust ? 64 : 60), h = o.h || Math.round(w * (bust ? 108 / 92 : 270 / 116));
    const tone = this.toneOf(o);
    return `<svg class="sil" data-tone="${tone}" viewBox="${vb}" width="${w}" height="${h}" aria-hidden="true">${this.figure(npc, Object.assign({}, o, { w: w, tone: tone }))}</svg>`;
  }
};

/* ---------------- SpikeData: demo state per seed and stage, for the view tests (leak, determinism); never saved ---------------- */
const SpikeData = {
  make(seed, stage) {
    const s = Game.create(seed), p = s.play, T = s.truth, ev = (k) => s.evidence.find((e) => e.key === k);
    const meet = (id) => { if (id) p.met[id] = true; };
    if (stage !== 'begin') {
      ['paper_ctx', 'paper_motive', 'people_witness', 'red_motive', 'red_alibi'].forEach((k) => { const e = ev(k); if (e) Evidence.give(s, e, 'spike'); });
      s.contradictions.forEach((c) => { p.heard[c.id] = true; });
      [T.culpritId, T.roles.witness, T.roles.suspA, T.roles.suspB, T.roles.confidant].forEach(meet);
      Evidence.found(s).forEach((e) => { if (e.source.locationId) p.visited[e.source.locationId] = true; });
    }
    if (stage === 'laat') {
      const solved = Solver.run(s).state;
      s.evidence.forEach((e) => { if (solved.play.found[e.id] && !p.found[e.id]) Evidence.give(s, e, 'spike'); });
      s.cast.forEach((n) => meet(n.id));
      s.contradictions.forEach((c) => { p.resolved[c.id] = true; if (c.clears) { p.cleared[c.npcId] = true; p.debunked[c.counterEvidence] = true; } });
      s.world.locations.forEach((l) => { p.visited[l.id] = true; });
    }
    Rules.post(s);
    return s;
  }
};

/* ---------------- Board (v0.14.0): responsive corkboard, dynamic threads, marks/notes & suspect matrix ---------------- */
const Board = {
  // v0.14.0: responsive zones rendered in real readable scale (no fixed 1280x810 transform:scale canvas)
  ZONES: [
    { key: 'person', label: 'Mensen', empty: 'Spreek mensen aan om hun kaart hier te zien.' },
    { key: 'doc',    label: 'De zaak en de stukken', empty: 'Onderzoek voorwerpen om sporen te verzamelen.' },
    { key: 'stmt',   label: 'Verklaringen', empty: 'Verhoor betrokkenen; opvallende verklaringen verschijnen hier.' },
    { key: 'place',  label: 'Plaatsen', empty: 'Bezochte en genoemde plekken verschijnen hier.' }
  ],
  // gentle deterministic tilt (capped to ±0.8 deg so cards stay crisp and easy to read)
  rot: (id) => +((((parseInt(RNG.hashStr('rot|' + id), 36) % 17) - 8) / 10)).toFixed(2),
  folders(s) {
    return this.ZONES.map((z) => ({ zone: z.key, n: Pins.inFolder(s, z.key).length })).filter((f) => f.n > 0);
  },
  layout(s) {
    const p = s.play, cards = [], threads = [], zones = { person: [], doc: [], stmt: [], place: [] };
    const A = (s.player && s.player.archive) || {}, live = (it) => !A[it.id];
    const add = (z, it) => { const c = Object.assign({ zone: z, rot: this.rot(it.id) }, it); cards.push(c); zones[z].push(c); };
    const hO = p.heardOf || {}, hL = p.heardOfLoc || {};
    // v0.12.0: people you only heard of follow after met people as blank cards
    s.cast.filter((n) => p.met[n.id]).sort(byName).map((n) => ({ id: 'p:' + n.id, kind: 'person', ref: n.id }))
      .concat(s.cast.filter((n) => !p.met[n.id] && hO[n.id]).sort(byName).map((n) => ({ id: 'p:' + n.id, kind: 'ghost', ref: n.id })))
      .filter(live).forEach((it) => add('person', it));
    add('doc', { id: 'case', kind: 'case', ref: s.evidence[0].id });
    const found = Evidence.found(s).filter((e) => e.route !== 'start');
    const marked = s.world.locations.reduce((a, l) => a.concat(l.objects.filter((o) => Pins.ok(s, 'o:' + o.id)).map((o) => ({ id: 'o:' + o.id, kind: 'ghostdoc', ref: o.id, loc: l.id }))), []).sort((a, b) => a.id < b.id ? -1 : 1);
    found.filter((e) => e.source.type === 'object').map((e) => ({ id: 'd:' + e.id, kind: 'doc', ref: e.id })).concat(marked)
      .filter(live).forEach((it) => add('doc', it));
    s.contradictions.filter((c) => p.heard[c.id]).map((c) => ({ id: 's:' + c.id, kind: 'claim', ref: c.id }))
      .concat(found.filter((e) => e.source.type !== 'object').map((e) => ({ id: 's:' + e.id, kind: 'talk', ref: e.id })))
      .filter(live).forEach((it) => add('stmt', it));
    s.world.locations.filter((l) => p.visited[l.id] || hL[l.id]).sort(byName).map((l) => ({ id: 'l:' + l.id, kind: p.visited[l.id] ? 'place' : 'ghostplace', ref: l.id }))
      .filter(live).forEach((it) => add('place', it));

    const has = (id) => cards.some((c) => c.id === id), cardOf = (eid) => has('d:' + eid) ? 'd:' + eid : has('s:' + eid) ? 's:' + eid : null;
    // v0.7.0: Makkelijk draws automatic threads from evidence; v0.11.0 / v0.14.0: everyone draws their own with optional meaning
    const L = Level.get(s);
    if (L.threads) found.forEach((e) => { const a = cardOf(e.id), to = e.pointsTo; if (a && to && has('p:' + to)) threads.push({ a: a, b: 'p:' + to, kind: p.debunked[e.id] ? 'dead' : 'points' }); });
    s.contradictions.forEach((c) => {
      if (!has('s:' + c.id)) return; const ce = cardOf(c.counterEvidence);
      if (ce && (p.resolved[c.id] || L.clash)) threads.push({ a: 's:' + c.id, b: ce, kind: p.resolved[c.id] ? 'solved' : 'clash' });
      if (has('p:' + c.npcId)) threads.push({ a: 's:' + c.id, b: 'p:' + c.npcId, kind: 'said' });
    });
    Pins.threads(s).forEach((t) => {
      if (has(t[0]) && has(t[1]) && !threads.some((x) => x.kind !== 'said' && Pins.key(x.a, x.b) === Pins.key(t[0], t[1]))) {
        threads.push({ a: t[0], b: t[1], kind: 'mine', meaning: Pins.threadKind(t) });
      }
    });
    return { cards: cards, zones: zones, threads: threads };
  },
  // dynamic anchor on the edge of card rect a facing card rect b (used by UI.drawThreads with getBoundingClientRect)
  anchorRect(a, b) {
    if (b.x >= a.x + a.w - 8) return [a.x + a.w - 2, a.y + a.h / 2];
    if (b.x + b.w <= a.x + 8) return [a.x + 2, a.y + a.h / 2];
    if (b.y >= a.y + a.h - 8) return [a.x + a.w / 2, a.y + a.h - 2];
    if (b.y + b.h <= a.y + 8) return [a.x + a.w / 2, a.y + 2];
    return [a.x + a.w - 2, a.y + a.h / 2];
  },
  // v0.19.0 (Fase I): anchor directly on the top push-pin of each card so threads visibly span pin-to-pin
  anchorPin(a, cardId) {
    const yOff = cardId && cardId.indexOf('l:') === 0 ? 5 : 9;
    return [a.x + a.w / 2, a.y + Math.min(yOff, a.h / 2)];
  },
  path(a, b, kind) {
    const x1 = a[0], y1 = a[1], x2 = b[0], y2 = b[1], d = Math.hypot(x2 - x1, y2 - y1) || 1;
    if (kind !== 'clash' && kind !== 'solved') {
      const sag = Math.min(54, d * 0.12);
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2 + sag).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    const n = Math.max(4, Math.round(d / 18)), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    let out = `M${x1.toFixed(1)} ${y1.toFixed(1)}`;
    for (let i = 1; i < n; i++) {
      const k = i / n, o = (i % 2 ? 6 : -6);
      out += ` L${(x1 + (x2 - x1) * k - uy * o).toFixed(1)} ${(y1 + (y2 - y1) * k + ux * o).toFixed(1)}`;
    }
    return out + ` L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  },
  // cards that belong together; used for highlighting a person, document or place
  linked(s, L, id) {
    const out = new Set([id]), ids = new Set(L.cards.map((c) => c.id)), add = (x) => { if (ids.has(x)) out.add(x); }, cardOf = (eid) => { add('d:' + eid); add('s:' + eid); };
    L.threads.forEach((t) => { if (t.a === id) out.add(t.b); if (t.b === id) out.add(t.a); });
    const k = id.split(':')[0], ref = id.slice(k.length + 1);
    if (k === 'p' && !s.play.met[ref]) return out;   // v0.12.0: a blank card knows nothing about where someone lives
    if (k === 'p') { const n = World.npc(s, ref), lk = (s.player && s.player.links) || {}, auto = Level.get(s).threads; add('l:' + n.locationId); s.evidence.forEach((e) => { if ((e.source.npcId === ref) || (auto ? e.pointsTo === ref : lk[e.id] === ref)) cardOf(e.id); }); s.contradictions.forEach((c) => { if (c.npcId === ref) add('s:' + c.id); }); }
    const e = (k === 'd' || k === 's') && Evidence.get(s, ref);
    if (e) { e.requires.forEach(cardOf); if (e.source.locationId) add('l:' + e.source.locationId); if (e.source.npcId) add('p:' + e.source.npcId); }
    if (k === 'l') { s.evidence.forEach((x) => { if (x.source.locationId === ref) cardOf(x.id); }); s.cast.forEach((n) => { if (n.locationId === ref && s.play.met[n.id]) add('p:' + n.id); }); }
    return out;
  },
  // a neutral head-and-shoulders outline; the same for everyone, so it never gives anything away
  blank: (w) => `<svg viewBox="0 0 92 108" width="${w}" height="${Math.round(w * 108 / 92)}" aria-hidden="true"><circle cx="46" cy="38" r="20" fill="none" stroke="#6f6d64" stroke-width="3" stroke-dasharray="5 4"/><path d="M10 108 C12 78 28 66 46 66 C64 66 80 78 82 108" fill="none" stroke="#6f6d64" stroke-width="3" stroke-dasharray="5 4"/><text x="46" y="45" text-anchor="middle" font-size="20" font-weight="700" fill="#6f6d64">?</text></svg>`,
  // accessible label including status mark, new state, thread count, and selection state
  cardAria(s, c, sel, L) {
    let base = this.title(s, c.id);
    if (c.kind === 'person') { const n = World.npc(s, c.ref); base = n.name + ', ' + n.role; }
    else if (c.kind === 'ghost') base += ', nog niet ontmoet';
    else if (c.kind === 'ghostplace') base += ', nog niet bezocht';
    const parts = [base];
    const m = Pins.mark(s, c.id); if (m) parts.push('gemarkeerd als ' + Pins.MARKS[m].label.toLowerCase());
    if (Pins.isNew(s, c.id)) parts.push('nieuw');
    const tc = L ? L.threads.filter((t) => t.a === c.id || t.b === c.id).length : Pins.ends(s, c.id).length;
    if (tc > 0) parts.push('verbonden met ' + tc + (tc === 1 ? ' kaart' : ' kaarten'));
    if (sel === c.id) parts.push('geselecteerd');
    return parts.join(', ');
  },
  cardExtras(s, c) {
    const isNew = Pins.isNew(s, c.id);
    const mark = Pins.mark(s, c.id);
    const note = Pins.note(s, c.id);
    const badges = (isNew ? '<span class="bc-new">Nieuw</span>' : '') +
      (mark ? `<span class="bc-mark m-${mark}"><i aria-hidden="true">${Pins.MARKS[mark].icon}</i>${U.esc(Pins.MARKS[mark].label)}</span>` : '');
    const foot = note ? `<div class="bc-note" data-card-note="${U.esc(c.id)}">${U.esc(note)}</div>` : `<div class="bc-note" data-card-note="${U.esc(c.id)}" hidden></div>`;
    return { badges: badges ? `<div class="bc-badges">${badges}</div>` : '', foot: foot, hasNew: isNew, mark: mark };
  },
  card(s, c, fam, opt) {
    const F = FAMILY[fam], sel = opt && opt.sel, hl = opt && opt.hl, L = opt && opt.L;
    const ex = this.cardExtras(s, c);
    const clsExtra = (hl && hl.has(c.id) ? ' hl' : '') + (sel === c.id ? ' sel' : '') + (ex.hasNew ? ' is-new' : '') + (ex.mark ? ' marked-' + ex.mark : '');
    const attr = `data-card="${U.esc(c.id)}" tabindex="0" role="button" aria-pressed="${sel === c.id ? 'true' : 'false'}" aria-label="${U.esc(this.cardAria(s, c, sel, L))}"`;
    const rotSt = `--rot:${c.rot || 0}deg`;

    if (c.kind === 'person') {
      const n = World.npc(s, c.ref), tone = Rels.toneOf(s, n.id), r = s.relations[n.id];
      const pLbl = typeof Living !== 'undefined' ? Living.pressureLabel(s, n.id) : '';
      return `<div class="bc pc${clsExtra}" ${attr} style="${rotSt};--tone:${TONE_COLOR[tone]};--phbg:${F.photo}"><div class="pin" aria-hidden="true"></div>${ex.badges}` +
        `<div class="pc-body"><div class="ph">${Silhouette.svg(n, { s: s, fam: fam, tone: tone, stance: TONE_STANCE[tone], w: 68 })}</div>` +
        `<div class="pt"><b>${U.esc(n.name)}</b><span>${U.esc(n.role.replace(/ \(.*\)$/, ''))}</span>${n.kenmerk ? `<span class="km">${U.esc(KENMERK[n.kenmerk].label)}</span>` : ''}${pLbl ? `<span class="bc-press">${U.esc(pLbl)}</span>` : ''}<i>${U.esc(r.statusText)}${s.play.cleared[n.id] && Level.get(s).checkLabel ? '. Alibi bevestigd.' : ''}</i></div></div>${ex.foot}</div>`;
    }
    // v0.12.0: blank cards: a plain outline, the name and where you heard it; nothing else
    if (c.kind === 'ghost') {
      const n = World.npc(s, c.ref), h = (s.play.heardOf || {})[n.id];
      return `<div class="bc pc ghost${clsExtra}" ${attr} style="${rotSt}"><div class="pin" aria-hidden="true"></div>${ex.badges}` +
        `<div class="pc-body"><div class="ph">${this.blank(68)}</div><div class="pt"><b>${U.esc(n.name)}</b><span>Nog niet ontmoet</span><i>Genoemd ${U.esc(Mentions.source(s, h))}.</i></div></div>${ex.foot}</div>`;
    }
    if (c.kind === 'ghostdoc') {
      const l = World.loc(s, c.loc), o = l.objects.find((x) => x.id === c.ref);
      return `<div class="bc doc ghost${clsExtra}" ${attr} style="${rotSt}"><div class="pin" aria-hidden="true"></div>${ex.badges}<div class="dk">Nog bekijken</div><b>${U.esc(Rnd.cap(o.name))}</b><p>Hier was iets, maar je wist nog te weinig.</p><small>${U.esc(l.name)}</small>${ex.foot}</div>`;
    }
    if (c.kind === 'ghostplace') {
      const l = World.loc(s, c.ref);
      return `<div class="bc tk ghost${clsExtra}" ${attr} style="${rotSt}"><i aria-hidden="true"></i><span>${U.esc(l.name)}</span>${ex.hasNew ? '<span class="bc-new">Nieuw</span>' : ''}${ex.mark ? `<span class="bc-mark m-${ex.mark}" aria-hidden="true">${Pins.MARKS[ex.mark].icon}</span>` : ''}</div>`;
    }
    if (c.kind === 'case') {
      return `<div class="bc case${clsExtra}" ${attr} style="${rotSt}"><div class="pin" aria-hidden="true"></div><h2>${U.esc(s.meta.title)}</h2><p>${U.esc(s.crime.summary)} ${U.esc(s.crime.personalHook)}</p><small>${U.esc(s.meta.eraLabel)}, ${U.esc(s.world.city.name)}</small>${ex.foot}</div>`;
    }
    if (c.kind === 'doc') {
      const e = Evidence.get(s, c.ref), loc = World.loc(s, e.source.locationId), obj = loc.objects.find((o) => o.id === e.source.objectId), kind = F.kinds[parseInt(RNG.hashStr(e.key), 36) % F.kinds.length];
      const role = Evidence.roleInfo(e);
      return `<div class="bc doc${clsExtra}" ${attr} style="${rotSt}"><div class="pin" aria-hidden="true"></div>${ex.badges}<div class="dk">${U.esc(role.short)} · ${U.esc(kind)}</div><b>${U.esc(e.title)}${s.play.debunked[e.id] ? ' (weerlegd)' : ''}</b>` +
        `<p>${U.esc(Rnd.cap(e.item || (obj ? obj.name : '')))}</p><small>${U.esc(loc.name)}</small>${ex.foot}</div>`;
    }
    if (c.kind === 'claim' || c.kind === 'talk') {
      const con = c.kind === 'claim' ? s.contradictions.find((x) => x.id === c.ref) : null, e = con ? null : Evidence.get(s, c.ref);
      const who = World.npc(s, con ? con.npcId : (e.source.npcId || '')), text = con ? con.claim : e.text, title = con ? 'Verklaring van ' + who.name : e.title + ' · ' + Evidence.roleInfo(e).short;
      const wTone = who && s.play.met[who.id] ? Rels.toneOf(s, who.id) : 'neutral';
      const stamp = con && s.play.resolved[con.id] ? '<span class="stamp">doorgeprikt</span>' : e && e.source.type === 'confront' ? '<span class="stamp">bekentenis</span>' : '';
      return `<div class="bc st${stamp ? ' stamped' : ''}${clsExtra}" ${attr} style="${rotSt}"><div class="pin" aria-hidden="true"></div>${ex.badges}` +
        `<div class="st-body"><div class="sp">${who ? Silhouette.svg(who, { s: s, fam: fam, tone: wTone, w: 40 }) : ''}</div>` +
        `<div class="st-txt"><q>${U.esc(text)}</q><small>${U.esc(title)}</small></div>${stamp}</div>${ex.foot}</div>`;
    }
    const l = World.loc(s, c.ref);
    return `<div class="bc tk${clsExtra}" ${attr} style="${rotSt}"><i style="background:${TEMPLATE_COLOR[l.template] || '#fff'}" aria-hidden="true"></i><span>${U.esc(l.name)}</span>${ex.hasNew ? '<span class="bc-new">Nieuw</span>' : ''}${ex.mark ? `<span class="bc-mark m-${ex.mark}" aria-hidden="true">${Pins.MARKS[ex.mark].icon}</span>` : ''}</div>`;
  },
  // top toolbar of the board: switch between Prikbord, Verdachtenoverzicht and Spoorboek, plus link-mode, thread-layer toggle, "Alles gezien" & optional hint controls
  bar(s, mode, link, threadKind, threadLayer) {
    const metN = s.cast.filter((n) => s.play.met[n.id]).length;
    const sbN = typeof Spoorboek !== 'undefined' && Spoorboek.count ? Spoorboek.count(s) : 0;
    const newN = Pins.newIds(s).length;
    const tk = threadKind && Pins.THREAD_KINDS[threadKind] ? threadKind : 'verband';
    const tl = ['over', 'under', 'off'].indexOf(threadLayer) >= 0 ? threadLayer : 'over';
    const tlLabel = tl === 'over' ? 'Draadjes: boven' : tl === 'under' ? 'Draadjes: achter' : 'Draadjes: uit';
    const hintBtn = !s.play.ended && Level.id(s) !== 'moeilijk' ? `<button type="button" class="bd-hint-btn" data-ui="hint">Geef een zetje</button>` : '';
    const isBoard = mode !== 'matrix' && mode !== 'timeline';
    let right = '';
    if (isBoard && link) {
      right = `<div class="bd-linkbar" role="region" aria-label="Draadjes trekken">` +
        `<span>Draadje vanaf <b>${U.esc(this.title(s, link))}</b>:</span>` +
        `<div class="bd-tkinds" role="group" aria-label="Betekenis van draadje">` +
        Object.keys(Pins.THREAD_KINDS).map((k) => `<button type="button" class="bd-tkind tk-${k}${tk === k ? ' on' : ''}" aria-pressed="${tk === k}" data-ui="thkind" data-v="${k}"><i aria-hidden="true"></i>${U.esc(Pins.THREAD_KINDS[k].label)}</button>`).join('') +
        `</div><button type="button" class="sp-chip on" data-sp="linkdone">Klaar</button></div>`;
    } else {
      const tCount = Pins.threads(s).length;
      right = `<div class="bd-meta">` +
        (isBoard && tCount > 0 ? `<span class="bd-tstat">${tCount} ${tCount === 1 ? 'eigen draadje' : 'eigen draadjes'}</span>` : '') +
        (isBoard ? `<button type="button" class="bd-layer-btn" data-ui="thlayer" title="Wissel of draadjes over de punaises lopen, achter de kaarten of verborgen zijn">${tlLabel}</button>` : '') +
        (isBoard && newN > 0 ? `<button type="button" class="bd-seen-btn" data-ui="seen-all">Alles gezien (${newN})</button>` : '') +
        hintBtn +
        `</div>`;
    }
    return `<div class="bd-bar">` +
      `<div class="bd-modes" role="tablist" aria-label="Weergave van het zaakbord">` +
        `<button type="button" role="tab" aria-selected="${isBoard}" class="bd-mode${isBoard ? ' on' : ''}" data-ui="bmode" data-v="board">Prikbord</button>` +
        `<button type="button" role="tab" aria-selected="${mode === 'matrix'}" class="bd-mode${mode === 'matrix' ? ' on' : ''}" data-ui="bmode" data-v="matrix">Verdachtenoverzicht (${metN})</button>` +
        `<button type="button" role="tab" aria-selected="${mode === 'timeline'}" class="bd-mode${mode === 'timeline' ? ' on' : ''}" data-ui="bmode" data-v="timeline">Spoorboek${sbN > 0 ? ' (' + sbN + ')' : ''}</button>` +
      `</div>${right}</div>`;
  },
  // sel: the selected card (its family lights up); link: the card you pull threads from (v0.11.0, nothing dims)
  html(s, fam, sel, link, opt) {
    const L = this.layout(s), byId = {}; L.cards.forEach((c) => { byId[c.id] = c; });
    const mode = (opt && opt.mode) || 'board', threadKind = (opt && opt.threadKind) || 'verband';
    const threadLayer = (opt && opt.threadLayer) || 'over';
    if (link && !byId[link]) link = null;
    if (mode === 'matrix') {
      return { html: this.bar(s, 'matrix', null, threadKind, threadLayer) + this.matrix(s, fam, sel), L: L };
    }
    if (mode === 'timeline') {
      const M = (opt && opt.map) || Travel.map(s);
      return { html: this.bar(s, 'timeline', null, threadKind, threadLayer) + Spoorboek.html(s, M, (opt && opt.sbSel) || []), L: L };
    }
    const hl = link ? new Set([link].concat(Pins.ends(s, link))) : sel && byId[sel] ? this.linked(s, L, sel) : null;
    if (link) sel = link;
    const foldersByZone = {}; this.folders(s).forEach((f) => { foldersByZone[f.zone] = f.n; });
    let h = this.bar(s, 'board', link, threadKind, threadLayer);
    h += `<div class="bd${link ? ' linking' : hl ? ' focus' : ''}" data-threads="${U.esc(threadLayer)}">`;
    h += `<svg class="bt" aria-hidden="true"></svg>`;
    h += `<div class="bd-grid">`;
    this.ZONES.forEach((z) => {
      const fCount = foldersByZone[z.key] || 0;
      const folderBtn = fCount > 0 ? `<button type="button" class="zf" data-ui="archive" data-v="${z.key}" aria-label="${U.esc(Pins.FOLDER[z.key])}, ${fCount} ${fCount === 1 ? 'kaart' : 'kaarten'}"><i aria-hidden="true"></i>Archief · ${fCount}</button>` : '';
      const zCards = L.zones[z.key] || [];
      const cardsHtml = zCards.length
        ? zCards.map((c) => this.card(s, c, fam, { sel: sel, hl: hl, L: L })).join('')
        : `<p class="bd-empty">${U.esc(z.empty)}</p>`;
      h += `<section class="bd-zone bd-zone-${z.key}" data-zone="${z.key}" aria-label="${U.esc(z.label)}">` +
        `<div class="zn-head"><h2 class="zn">${U.esc(z.label)}</h2>${folderBtn}</div>` +
        `<div class="bd-cards bd-cards-${z.key}">${cardsHtml}</div></section>`;
    });
    h += `</div></div>`;
    return { html: h, L: L };
  },
  // v0.14.0: leak-free suspect comparison matrix (only public, player-discovered data, sorted alphabetically)
  matrix(s, fam, sel) {
    const p = s.play, lv = Level.get(s);
    const met = s.cast.filter((n) => p.met[n.id]).slice().sort(byName);
    const ghosts = s.cast.filter((n) => !p.met[n.id] && p.heardOf && p.heardOf[n.id]).slice().sort(byName);
    const found = Evidence.found(s).filter((e) => e.route !== 'start');

    const alibiCell = (n) => {
      const a = s.alibis && s.alibis[n.id];
      if (!a || !p.asked[n.id + ':alibi']) return '<span class="mx-mute">Nog niet gevraagd</span>';
      const comp = a.withId ? World.npc(s, a.withId) : null;
      const where = World.loc(s, a.locId).name + (comp ? ' (met ' + U.first(comp) + ')' : ' (alleen)');
      const chk = p.alibiCheck && p.alibiCheck[n.id];
      let badge = '<span class="mx-st st-open">Niet gecontroleerd</span>';
      if (chk) {
        if (!lv.checkLabel) badge = '<span class="mx-st st-open">Gecontroleerd (zie dagboek)</span>';
        else badge = chk.ok
          ? `<span class="mx-st st-ok">✓ Bevestigd${String(chk.by).indexOf('obj:') === 0 ? ' (stuk)' : ' door ' + U.esc(U.first(World.npc(s, chk.by)))}</span>`
          : `<span class="mx-st st-bad">✗ Tegengesproken${String(chk.by).indexOf('obj:') === 0 ? ' (stuk)' : ' door ' + U.esc(U.first(World.npc(s, chk.by)))}</span>`;
      } else if (p.cleared[n.id] && lv.checkLabel) {
        badge = '<span class="mx-st st-ok">✓ Bevestigd</span>';
      }
      return `<div class="mx-alibi"><span>${U.esc(where)}</span>${badge}</div>`;
    };

    const cluesCell = (n) => {
      const pid = 'p:' + n.id, seen = new Set(), chips = [];
      const pushChip = (cid, label, cls) => {
        if (seen.has(cid) || !Pins.ok(s, cid)) return;
        seen.add(cid);
        chips.push(`<button type="button" class="mx-chip ${cls || ''}" data-card="${U.esc(cid)}">${U.esc(label)}</button>`);
      };
      // player threads attached to this person
      Pins.ends(s, pid).filter((o) => Pins.ok(s, o)).sort((a, b) => this.title(s, a).localeCompare(this.title(s, b), 'nl')).forEach((o) => {
        const th = Pins.threadOf(s, pid, o), mk = Pins.threadKind(th);
        pushChip(o, this.title(s, o), 'th-' + mk);
      });
      // automatic evidence pointers on Makkelijk
      if (lv.threads) found.forEach((e) => {
        if (e.pointsTo === n.id) { const cid = Pins.cardOf(s, e.id); if (cid) pushChip(cid, e.title, p.debunked[e.id] ? 'th-dead' : 'th-auto'); }
      });
      // heard contradictions by this person
      s.contradictions.filter((c) => c.npcId === n.id && p.heard[c.id]).forEach((c) => {
        pushChip('s:' + c.id, p.resolved[c.id] ? 'Verklaring (doorgeprikt)' : 'Verklaring', p.resolved[c.id] ? 'th-bevestigd' : 'th-claim');
      });
      return chips.length ? `<div class="mx-chips">${chips.join('')}</div>` : '<span class="mx-mute">Geen gekoppelde sporen</span>';
    };

    const markCell = (n) => {
      const pid = 'p:' + n.id, cur = Pins.mark(s, pid), note = Pins.note(s, pid);
      const btns = Object.keys(Pins.MARKS).map((k) => `<button type="button" class="mx-mark m-${k}${cur === k ? ' on' : ''}" aria-pressed="${cur === k}" data-sp="mark" data-id="${U.esc(pid)}" data-v="${k}" title="${U.esc(Pins.MARKS[k].label)}"><i aria-hidden="true">${Pins.MARKS[k].icon}</i><span>${U.esc(Pins.MARKS[k].label)}</span></button>`).join('');
      return `<div class="mx-judge"><div class="mx-marks" role="group" aria-label="Eigen oordeel over ${U.esc(n.name)}">${btns}</div>${note ? `<p class="mx-note">${U.esc(note)}</p>` : ''}</div>`;
    };

    let h = `<div class="mx-wrap">`;
    h += `<div class="mx-intro"><p>Vergelijk de betrokkenen op beginletter, kenmerk, alibi en gekoppelde sporen. Tik op een naam of spoor om het dossier te openen.</p></div>`;
    if (!met.length) {
      h += `<div class="mx-empty"><h3>Nog niemand ontmoet</h3><p>Zodra je betrokkenen aanspreekt tijdens een bezoek, verschijnen ze hier naast elkaar zodat je aanwijzingen kunt vergelijken.</p></div>`;
    } else {
      h += `<div class="mx-table-wrap"><table class="mx-table"><thead><tr>` +
        `<th scope="col">Persoon &amp; beginletter</th>` +
        `<th scope="col">Kenmerk</th>` +
        `<th scope="col">Alibi</th>` +
        `<th scope="col">Gekoppelde sporen</th>` +
        `<th scope="col">Eigen oordeel</th>` +
        `</tr></thead><tbody>`;
      met.forEach((n) => {
        const pid = 'p:' + n.id, tone = Rels.toneOf(s, n.id), ini = n.name.charAt(0).toUpperCase(), cur = Pins.mark(s, pid);
        const cleared = !!(p.cleared[n.id] && lv.dim);
        h += `<tr class="${sel === pid ? 'sel' : ''}${cleared ? ' mx-cleared' : ''}${cur ? ' mx-m-' + cur : ''}">` +
          `<td data-label="Persoon"><button type="button" class="mx-who" data-card="${U.esc(pid)}" aria-pressed="${sel === pid ? 'true' : 'false'}">` +
            `<span class="mx-port" style="border-color:${TONE_COLOR[tone]};background:${FAMILY[fam].photo}">${Silhouette.svg(n, { s: s, fam: fam, tone: tone, stance: TONE_STANCE[tone], w: 38 })}</span>` +
            `<span class="mx-who-txt"><span class="mx-name-row"><span class="mx-ini" title="Beginletter ${ini}">${ini}</span><b>${U.esc(n.name)}</b></span><small>${U.esc(n.role.replace(/ \(.*\)$/, ''))}</small></span>` +
          `</button></td>` +
          `<td data-label="Kenmerk">${n.kenmerk ? `<span class="mx-km">${U.esc(KENMERK[n.kenmerk].label)}</span>` : '<span class="mx-mute">—</span>'}</td>` +
          `<td data-label="Alibi">${alibiCell(n)}</td>` +
          `<td data-label="Gekoppelde sporen">${cluesCell(n)}</td>` +
          `<td data-label="Eigen oordeel">${markCell(n)}</td>` +
        `</tr>`;
      });
      h += `</tbody></table></div>`;
    }
    if (ghosts.length) {
      h += `<div class="mx-ghosts"><h3>Alleen van naam genoemd (nog niet ontmoet)</h3><div class="mx-chips">` +
        ghosts.map((n) => `<button type="button" class="mx-chip ghost" data-card="p:${U.esc(n.id)}">${U.esc(n.name)}</button>`).join('') +
        `</div></div>`;
    }
    return h + `</div>`;
  },
  // v0.15.0: render discovered schedule tips for a person (empty string if none discovered)
  schedHtml(s, npcId) {
    const tips = Mentions.schedOf(s, npcId);
    if (!tips.length) return '';
    return `<h4>Ontdekte roostertips</h4><ul class="sched-tips">${tips.map((t) => {
      const l = World.loc(s, t.locId);
      const locBtn = l ? `<button type="button" class="mention m-l" data-mention="l:${U.esc(l.id)}">${U.esc(l.name)}</button>` : '?';
      return `<li>In de <b>${U.esc(PARTS[t.part] || '?')}</b> bij ${locBtn}${t.via ? ` <small>(via ${U.esc(t.via)})</small>` : ''}</li>`;
    }).join('')}</ul>`;
  },
  detail(s, id, fam) {
    const k = id === 'case' ? 'case' : id.split(':')[0], ref = id.slice(k.length + 1);
    const link = (txt) => Mentions.linkHtml(s, txt, { exclude: id });
    let h = '<button type="button" class="sp-x" data-sp="unsel">Sluiten</button>';
    if (k === 'p' && !s.play.met[ref]) {
      const n = World.npc(s, ref), hh = (s.play.heardOf || {})[ref];
      h += `<div style="float:left;margin:0 12px 6px 0">${this.blank(80)}</div><h3>${U.esc(n.name)}</h3><p>Je kent ${U.esc(U.first(n))} alleen van naam. Genoemd ${link(Mentions.source(s, hh))}.</p>`;
      h += `<p class="sp-note" style="clear:both">Interessant om uit te zoeken. Vraag rond wie ${U.esc(U.first(n))} is en waar je ${U.pr(n).hem} kunt vinden. Zodra je ${U.pr(n).hem} spreekt, wordt deze kaart actief.</p>`;
      h += this.schedHtml(s, ref);
      return h + this.tools(s, id);
    }
    if (k === 'o') {
      const l = s.world.locations.find((x) => x.objects.some((o) => o.id === ref)), o = l.objects.find((x) => x.id === ref);
      h += `<h3>Nog bekijken: ${U.esc(o.name)}</h3><p>Bij ${link(l.name)} viel je iets op aan ${U.esc(o.name)}, maar je wist nog te weinig. Kom terug zodra je meer weet.</p>`;
      return h + this.tools(s, id);
    }
    if (k === 'l' && !s.play.visited[ref]) {
      const l = World.loc(s, ref), T = Travel.check(s, ref);
      h += `<h3>${U.esc(l.name)}</h3><p>Je hebt van deze plek gehoord, maar je bent er nog niet geweest.</p><p class="sp-note">Open van ${l.open[0]} tot ${l.open[1]} uur. Lopen kost ${T.walk} minuten.</p>`;
      if (!s.visit && !s.play.ended && T.open && !T.late) h += `<button type="button" class="sp-btn" data-sp="visit" data-v="${l.id}">Ga erheen (${T.walk} min, aankomst ${U.hm(T.at)})</button>`;
      return h + this.tools(s, id);
    }
    if (k === 'p') {
      const n = World.npc(s, ref), r = s.relations[n.id], tone = Rels.toneOf(s, n.id), bar = (lab, v, c) => `<span>${lab}</span><i role="progressbar" aria-label="${lab}" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" style="--v:${v}%;--c:${c}"></i><small class="rel-val">${v}</small>`;
      h += `<div class="det-port" style="border-color:${TONE_COLOR[tone]};background:${FAMILY[fam].photo}">${Silhouette.svg(n, { s: s, fam: fam, tone: tone, stance: TONE_STANCE[tone], w: 96 })}</div>`;
      h += `<h3>${U.esc(n.name)}</h3><p>${U.esc(n.role)}, ${n.age} jaar. Doet ${TONE_WORD[tone]} tegen je; houding: ${STANCE_LABEL[TONE_STANCE[tone]]}.</p><p><i>${U.esc(r.statusText)}</i></p>`;
      h += `<h4 style="clear:both">Relatie</h4><div class="relbar">${bar('Vertrouwen', r.trust, '#3c7031')}${bar('Genegenheid', r.affection, '#b8821d')}${bar('Wrok', r.resentment, '#b33a28')}${bar('Argwaan', r.suspicion, '#2b6785')}</div>`;
      h += `<p class="sp-note" style="margin-top:10px">${U.esc(Rnd.cap(n.personality))}; ${U.esc(n.voice)}.</p>`;
      if (n.kenmerk) h += `<p><b>Opvallend:</b> ${U.esc(KENMERK[n.kenmerk].desc)}.</p>`;
      const al = s.alibis && s.alibis[n.id], chk = s.play.alibiCheck && s.play.alibiCheck[n.id];
      if (al && s.play.asked[n.id + ':alibi']) {
        const comp = al.withId ? World.npc(s, al.withId) : null;
        h += `<h4>Alibi</h4><p>${link('Zegt om ' + s.truth.crimeHour + ' uur in ' + World.loc(s, al.locId).name + ' te zijn geweest, ' + (comp ? 'met ' + comp.name : 'alleen') + '.')}</p>`;
        if (chk && Level.get(s).checkLabel) h += `<p class="sp-note">${link((String(chk.by).indexOf('obj:') === 0 ? 'Bevestigd door een gevonden stuk' : 'Gecontroleerd bij ' + World.npc(s, chk.by).name) + ': ' + (chk.ok ? 'klopt' : 'klopt niet') + '.')}</p>`;
      }
      h += this.schedHtml(s, n.id);
      const pLbl = typeof Living !== 'undefined' ? Living.pressureLabel(s, n.id) : '';
      if (pLbl) h += `<p class="sp-note"><b>Gedrag:</b> ${U.esc(U.first(n))} ${U.esc(pLbl)} door het lopende onderzoek.</p>`;
      const nowMin = Clock.norm(s), now = nowMin < NIGHT ? Schedule.atMin(s, n.id, s.clock.day, nowMin) : null;
      h += `<p class="sp-note">${!now ? 'Het is nacht; iedereen is thuis.' : 'Nu (' + U.hm(nowMin) + '): ' + link(World.loc(s, now).name) + '.'}</p>`;
    } else if (k === 'case') {
      h += `<h3>${U.esc(s.meta.title)}</h3><p>${link(s.crime.summary)}</p><p>${link(s.crime.personalHook)}</p><p>${link(s.evidence[0].text)}</p><p class="sp-note">${link(s.meta.settingSummary || '')}</p>`;
    } else if (k === 'l') {
      const l = World.loc(s, ref), nowMin = Clock.norm(s), isOpenNow = World.openAtMin(l, nowMin);
      h += `<h3>${U.esc(l.name)}</h3><p>${U.esc(l.description)}</p><p class="sp-note">Open van ${String(l.open[0]).padStart(2, '0')}:00 tot ${String(Math.min(24, l.open[1])).padStart(2, '0')}:00 (${nowMin >= NIGHT ? 'nu nacht' : isOpenNow ? 'nu open' : 'nu gesloten'}).</p>`;
      const T = Travel.check(s, l.id);
      if (!s.visit && !s.play.ended && T.open && !T.late) h += `<button type="button" class="sp-btn" data-sp="visit" data-v="${l.id}">${T.here ? 'Ga naar binnen' : 'Ga erheen (' + T.walk + ' min, aankomst ' + U.hm(T.at) + ')'}</button>`;
    } else if (k === 's' && ref.indexOf('con_') === 0) {
      const c = s.contradictions.find((x) => x.id === ref), n = World.npc(s, c.npcId);
      h += `<h3>Verklaring van ${link(n.name)}</h3><p>${link(c.claim)}</p>` + (s.play.resolved[c.id] ? `<p class="sp-note">Doorgeprikt.${c.reveal ? ' ' + link(c.reveal) : ''}</p>` : `<p class="sp-note">Nog niet getoetst.</p>`);
    } else {
      const e = Evidence.get(s, ref), role = Evidence.roleInfo(e);
      h += `<h3>${U.esc(e.title)}</h3><p class="sp-role-tag"><b>${U.esc(role.pillar)}:</b> ${U.esc(role.help)}</p><p>${link(e.text)}</p>`;
      if (e.source.type === 'object') { const l = World.loc(s, e.source.locationId); h += `<p class="sp-note">Gevonden: ${link(l.name)}, ${U.esc(l.objects.find((o) => o.id === e.source.objectId).name)}.</p>`; }
      if (e.source.npcId) h += `<p class="sp-note">Bron: ${link(World.npc(s, e.source.npcId).name)}.</p>`;
      if (s.play.debunked[e.id]) h += '<p class="sp-note">Weerlegd.</p>';
    }
    return h + this.tools(s, id);
  },
  // v0.11.0: a short name for any card, for the thread lists and the archive
  title(s, id) {
    if (id === 'case') return 'De zaak';
    const k = id.split(':')[0], ref = id.slice(k.length + 1);
    if (k === 'p') { const n = World.npc(s, ref); return n ? n.name : '?'; }
    if (k === 'l') { const l = World.loc(s, ref); return l ? l.name : '?'; }
    if (k === 'o') { const l = s.world.locations.find((x) => x.objects.some((o) => o.id === ref)); return l ? 'Nog bekijken: ' + l.objects.find((o) => o.id === ref).name : '?'; }
    if (ref.indexOf('con_') === 0) { const c = s.contradictions.find((x) => x.id === ref); return c ? 'Verklaring van ' + World.npc(s, c.npcId).name : '?'; }
    const e = Evidence.get(s, ref); return e ? e.title : '?';
  },
  // v0.14.0: personal marks, 1-line note, threads (with meaning) and archive under every detail panel
  tools(s, id) {
    if (!Pins.ok(s, id)) return '';
    const ends = Pins.ends(s, id).filter((o) => Pins.ok(s, o)).sort((a, b) => this.title(s, a).localeCompare(this.title(s, b), 'nl'));
    const z = Pins.zone(id), curMark = Pins.mark(s, id), curNote = Pins.note(s, id);
    let h = '';
    if (z !== 'case') {
      h += `<h4>Eigen markering</h4><div class="sp-marks" role="group" aria-label="Eigen markering">` +
        Object.keys(Pins.MARKS).map((k) => `<button type="button" class="sp-mark m-${k}${curMark === k ? ' on' : ''}" aria-pressed="${curMark === k}" data-sp="mark" data-id="${U.esc(id)}" data-v="${k}"><i aria-hidden="true">${Pins.MARKS[k].icon}</i>${U.esc(Pins.MARKS[k].label)}</button>`).join('') +
        `</div>`;
    }
    h += `<div class="sp-notebox"><label for="cardNote">Eigen notitie</label><div class="sp-note-row"><input id="cardNote" type="text" maxlength="140" data-note-id="${U.esc(id)}" value="${U.esc(curNote)}" placeholder="Korte notitie op deze kaart…">` +
      (curNote ? `<button type="button" class="sp-note-clr" data-sp="noteclr" data-id="${U.esc(id)}" aria-label="Wis notitie">×</button>` : '') + `</div></div>`;
    h += `<h4>Je draadjes</h4>` + (ends.length ? `<ul class="sp-threads">${ends.map((o) => {
      const th = Pins.threadOf(s, id, o), mk = Pins.threadKind(th);
      return `<li><span class="th-dot tk-${mk}" aria-hidden="true"></span><span>${U.esc(this.title(s, o))} <small class="th-lbl">(${U.esc(Pins.THREAD_KINDS[mk].label)})</small>${Pins.archived(s, o) ? ' <i>(in het archief)</i>' : ''}</span></li>`;
    }).join('')}</ul>`
      : `<p class="sp-note">Nog geen draadjes. Je draadjes zijn notities: pas het zaakverslag toetst je conclusie.</p>`);
    h += `<div class="sp-acts"><button type="button" class="sp-btn" data-sp="linkmode" data-v="${U.esc(id)}">Draadje trekken</button>` + (z !== 'case' ? `<button type="button" class="sp-btn" data-sp="arch" data-v="${U.esc(id)}">Naar ${Pins.FOLDER[z]}</button>` : '') + '</div>';
    return h;
  },
  // the side panel while you pull threads from one card (v0.14.0: choose optional thread meaning)
  linkPanel(s, from, curKind) {
    const tk = curKind && Pins.THREAD_KINDS[curKind] ? curKind : 'verband';
    const ends = Pins.ends(s, from).filter((o) => Pins.ok(s, o)).sort((a, b) => this.title(s, a).localeCompare(this.title(s, b), 'nl'));
    let h = `<button type="button" class="sp-x" data-sp="linkdone">Klaar</button><h3>Draadjes trekken</h3>` +
      `<p>Vanaf <b>${U.esc(this.title(s, from))}</b>. Tik op kaarten op het bord om ze te verbinden. Tik nog eens met dezelfde kleur om het draadje los te halen.</p>`;
    h += `<h4>Betekenis van het draadje</h4><div class="bd-tkinds side" role="group" aria-label="Betekenis van het draadje">` +
      Object.keys(Pins.THREAD_KINDS).map((k) => `<button type="button" class="bd-tkind tk-${k}${tk === k ? ' on' : ''}" aria-pressed="${tk === k}" data-ui="thkind" data-v="${k}"><i aria-hidden="true"></i>${U.esc(Pins.THREAD_KINDS[k].label)}</button>`).join('') + `</div>`;
    h += `<h4>Verbonden met</h4>` + (ends.length ? `<div class="sp-chips">${ends.map((o) => {
      const th = Pins.threadOf(s, from, o), mk = Pins.threadKind(th);
      return `<button type="button" class="sp-chip on tk-chip-${mk}" data-sp="unthread" data-a="${U.esc(from)}" data-b="${U.esc(o)}" aria-label="Haal het draadje (${Pins.THREAD_KINDS[mk].label}) naar ${U.esc(this.title(s, o))} los"><span class="th-dot tk-${mk}" aria-hidden="true"></span>${U.esc(this.title(s, o))}${Pins.archived(s, o) ? ' (archief)' : ''} ×</button>`;
    }).join('')}</div>` : '<p class="sp-note">Nog niets.</p>');
    return h + `<button type="button" class="sp-btn go wide" data-sp="linkdone">Klaar</button>`;
  }
};

/* ---------------- MapGen (v0.11.0): first a generic town, then the story places ----------------
   Layers: water (river, coast with harbour basin, or a lake), a jittered street lattice with merged blocks and bridges,
   town and countryside cells, generic squares and parks, houses along the streets (never on a street or in the water),
   then every location gets a fitting site: the harbour on the quay, a park in a park, market and square on a square,
   the gate where a country lane leaves town. There is no main road. Deterministic per seed; never saved. */
const Geo = {
  segD(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); },
  area(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p.x * q.y - q.x * p.y; } return a / 2; },
  inside(pt, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; },
  centroid: (P) => ({ x: P.reduce((a, p) => a + p.x, 0) / P.length, y: P.reduce((a, p) => a + p.y, 0) / P.length }),
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
  // a convex polygon moved inwards by m; null when it collapses
  inset(P, m) {
    const sg = Math.sign(this.area(P)) || 1, n = P.length, L = [];
    for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], len = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      L.push({ x: a.x - uy * sg * m, y: a.y + ux * sg * m, ux: ux, uy: uy }); }
    const out = [];
    for (let i = 0; i < n; i++) { const A = L[(i + n - 1) % n], B = L[i], den = A.ux * B.uy - A.uy * B.ux;
      if (Math.abs(den) < 1e-6) { out.push({ x: B.x, y: B.y }); continue; }
      const t = ((B.x - A.x) * B.uy - (B.y - A.y) * B.ux) / den; out.push({ x: A.x + A.ux * t, y: A.y + A.uy * t }); }
    for (let i = 0; i < n; i++) { const a = out[i], b = out[(i + 1) % n]; if ((b.x - a.x) * L[i].ux + (b.y - a.y) * L[i].uy <= 4) return null; }
    return Math.sign(this.area(out)) === sg ? out : null;
  },
  d: (P) => 'M' + P.map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L') + 'Z'
};
const MAP_INK = { house: ['var(--map-house1)', 'var(--map-house2)', 'var(--map-house3)'], street: 'var(--map-street)', casing: 'var(--map-casing)', lane: 'var(--map-lane)', water: 'var(--map-water)', shore: 'var(--map-shore)', ripple: 'var(--map-ripple)', park: 'var(--map-park)', tree: 'var(--map-tree)', treeLine: 'var(--map-treeline)', field: ['var(--map-field1)', 'var(--map-field2)', 'var(--map-field3)'], hatch: 'var(--map-hatch)', square: 'var(--map-square)', block: 'var(--map-block)', quay: 'var(--map-quay)', boat: 'var(--map-boat)', stall: 'var(--map-stall)' };
const MapGen = {
  W: 1200, H: 640, HALF: 6.5, LANE: 3,
  // story sites stay clear of the compass (top right) and the legend (bottom left)
  KEEP: [[1070, 0, 1200, 118], [0, 486, 420, 640]],
  PRIO: ['haven', 'park', 'markt', 'plein', 'poort', 'straat', 'kantoor', 'archief', 'herberg', 'werkplaats', 'huis'],

  /* ----- water ----- */
  river(r) {
    const W = this.W, H = this.H, horiz = r.next() < 0.65, base = horiz ? 190 + r.int(250) : 340 + r.int(500), len = horiz ? W : H;
    const A1 = 26 + r.int(34), A2 = 6 + r.int(12), f1 = Math.PI * 2 / (640 + r.int(420)), f2 = Math.PI * 2 / (190 + r.int(130)), p1 = r.next() * 6.28, p2 = r.next() * 6.28, hw = 19 + r.int(6), C = [];
    for (let t = -60; t <= len + 60; t += 15) { const o = base + A1 * Math.sin(t * f1 + p1) + A2 * Math.sin(t * f2 + p2); C.push(horiz ? { x: t, y: o } : { x: o, y: t }); }
    const side = (k) => C.map((p, i) => { const q = C[Math.min(C.length - 1, i + 1)], o = C[Math.max(0, i - 1)], dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy) || 1; return { x: p.x - dy / l * hw * k, y: p.y + dx / l * hw * k }; });
    const A = side(1), B = side(-1).reverse();
    return { kind: 'river', horiz: horiz, line: C, hw: hw, polys: [A.concat(B)],
      wet(x, y, pad) { pad = pad || 0; for (let i = 1; i < C.length; i++) { const a = C[i - 1], b = C[i]; if (Math.abs((a.x + b.x) / 2 - x) > 60 + pad && Math.abs((a.y + b.y) / 2 - y) > 60 + pad) continue; if (Geo.segD(x, y, a.x, a.y, b.x, b.y) < hw + pad) return true; } return false; },
      along: (p) => horiz ? p.x : p.y };
  },
  coast(r) {
    const W = this.W, H = this.H, right = r.next() < 0.65, s0 = right ? 905 + r.int(110) : 498 + r.int(46), A = 16 + r.int(22), f = Math.PI * 2 / (300 + r.int(260)), p = r.next() * 6.28;
    const shore = (t) => s0 + A * Math.sin(t * f + p) + 7 * Math.sin(t * f * 3.1 + p * 2);
    const b0 = right ? 170 + r.int(300) : 520 + r.int(460), bh = 34 + r.int(14), bd = 66 + r.int(30), bx = shore(b0) - bd;
    const len = right ? H : W, P = [];
    for (let t = -20; t <= len + 20; t += 12) {
      if (Math.abs(t - b0) <= bh) { if (!P.inBasin) { P.inBasin = true; const e = shore(b0 - bh); P.push(right ? { x: e, y: b0 - bh } : { x: b0 - bh, y: e }, right ? { x: bx, y: b0 - bh } : { x: b0 - bh, y: bx }, right ? { x: bx, y: b0 + bh } : { x: b0 + bh, y: bx }); const e2 = shore(b0 + bh); P.push(right ? { x: e2, y: b0 + bh } : { x: b0 + bh, y: e2 }); } continue; }
      const sv = shore(t); P.push(right ? { x: sv, y: t } : { x: t, y: sv });
    }
    const far = right ? [{ x: W + 30, y: len + 20 }, { x: W + 30, y: -20 }] : [{ x: len + 20, y: H + 30 }, { x: -20, y: H + 30 }];
    return { kind: 'coast', right: right, basin: { b0: b0, bh: bh, bx: bx }, polys: [P.concat(far)],
      wet(x, y, pad) { pad = pad || 0; const t = right ? y : x, v = right ? x : y; if (v > shore(t) - pad) return true; return Math.abs(t - b0) < bh + pad && v > bx - pad && v <= shore(t) + 1; } };
  },
  lake(r) {
    const spots = [[250, 160], [800, 420], [860, 190], [560, 420], [330, 330], [700, 160]], sp = r.pick(spots);
    const cx = sp[0] + r.int(81) - 40, cy = sp[1] + r.int(51) - 25, rx = 70 + r.int(42), ry = 46 + r.int(24), p = r.next() * 6.28, q = r.next() * 6.28;
    const k = (a) => 1 + 0.11 * Math.sin(3 * a + p) + 0.07 * Math.sin(5 * a + q), P = [];
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; P.push({ x: cx + Math.cos(a) * rx * k(a), y: cy + Math.sin(a) * ry * k(a) }); }
    return { kind: 'lake', c: { x: cx, y: cy }, polys: [P],
      wet(x, y, pad) { pad = pad || 0; const dx = x - cx, dy = y - cy, a = Math.atan2(dy / ry, dx / rx); return Math.hypot(dx / (rx * k(a) + pad), dy / (ry * k(a) + pad)) < 1; } };
  },

  /* ----- town ----- */
  build(s) {
    const r = RNG.make(s.seed + '|city'), W = this.W, H = this.H, real = s.world.locations, has = (t) => real.some((l) => l.template === t);
    const wk = has('haven') ? (r.next() < 0.55 ? 'coast' : 'river') : (r.next() < 0.6 ? 'river' : 'lake');
    const water = this[wk](r), wet = (x, y, pad) => water.wet(x, y, pad);
    // 1. jittered lattice of crossings
    const xs = [], ys = [];
    for (let x = 50 + r.int(26); x < W - 34; x += 94 + r.int(36)) xs.push(x);
    for (let y = 42 + r.int(20); y < H - 26; y += 78 + r.int(26)) ys.push(y);
    const nx = xs.length, ny = ys.length, N = xs.map((x, i) => ys.map((y, j) => ({ x: x + (i && i < nx - 1 ? r.int(25) - 12 : 0), y: y + (j && j < ny - 1 ? r.int(21) - 10 : 0) })));
    // 2. cells: town inside a lumpy oval, countryside outside, water where the water is
    const cx = W / 2 + r.int(141) - 70, cy = H / 2 + r.int(61) - 30, RX = 450 + r.int(90), RY = 255 + r.int(50), cells = [], cid = (i, j) => (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) ? null : cells[i * (ny - 1) + j];
    for (let i = 0; i < nx - 1; i++) for (let j = 0; j < ny - 1; j++) {
      const P = [N[i][j], N[i + 1][j], N[i + 1][j + 1], N[i][j + 1]], c = Geo.centroid(P), d = Math.hypot((c.x - cx) / RX, (c.y - cy) / RY) + r.next() * 0.22;
      const wetN = P.filter((p) => wet(p.x, p.y)).length;
      // a harbour town grows down to the waterfront
      const shoreTown = water.kind === 'coast' && d < 1.45 && wet(c.x, c.y, 120);
      cells.push({ i: i, j: j, P: P, c: c, d: d, type: wet(c.x, c.y) || wetN >= 3 ? 'water' : d < 1 || shoreTown ? 'town' : 'country', merged: 0 });
    }
    // 3. streets on every edge that touches town; edges through the water become bridges (river) or are dropped
    const edges = [], crosses = (a, b) => { for (let t = 0.1; t < 0.95; t += 0.1) if (wet(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return true; return false; };
    const mk = (k, i, j) => { const a = N[i][j], b = k === 'h' ? N[i + 1][j] : N[i][j + 1], cs = k === 'h' ? [cid(i, j - 1), cid(i, j)] : [cid(i - 1, j), cid(i, j)];
      const e = { k: k, i: i, j: j, a: a, b: b, cells: cs.filter(Boolean), kind: null }, town = e.cells.some((c) => c.type === 'town');
      if (town && !wet(a.x, a.y, 4) && !wet(b.x, b.y, 4)) e.kind = crosses(a, b) ? 'xing' : 'street';
      edges.push(e); return e; };
    const Eh = {}, Ev = {};
    for (let i = 0; i < nx - 1; i++) for (let j = 0; j < ny; j++) Eh[i + ',' + j] = mk('h', i, j);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny - 1; j++) Ev[i + ',' + j] = mk('v', i, j);
    // merged blocks: some inner streets disappear, at most one per block
    edges.forEach((e) => { if (e.kind === 'street' && e.cells.length === 2 && e.cells.every((c) => c.type === 'town' && !c.merged) && r.next() < 0.13) { e.kind = null; e.merged = true; e.cells.forEach((c) => { c.merged++; }); } });
    // bridges: spaced along the river, two to four of them
    const xing = edges.filter((e) => e.kind === 'xing');
    xing.forEach((e) => { e.kind = null; });
    if (water.kind === 'river') {
      const at = (e) => water.along(Geo.lerp(e.a, e.b, 0.5)), cand = xing.slice().sort((a, b) => at(a) - at(b) || a.i - b.i || a.j - b.j), pick = [];
      Rnd.pickN(r, cand, cand.length).forEach((e) => { if (pick.length < 4 && pick.every((p) => Math.abs(at(p) - at(e)) > 175)) pick.push(e); });
      pick.forEach((e) => { e.kind = 'bridge'; });
    }
    // 4. country lanes leave town along one row and one column (sometimes two)
    const ext = [], gates = [], nearest = (arr, v) => arr.reduce((b, x, k) => Math.abs(x - v) < Math.abs(arr[b] - v) ? k : b, 0);
    const rows = [Math.max(1, Math.min(ny - 2, nearest(ys, cy) + r.int(3) - 1))], cols = [Math.max(1, Math.min(nx - 2, nearest(xs, cx) + r.int(3) - 1))];
    if (r.next() < 0.45) rows.push(Math.max(1, Math.min(ny - 2, rows[0] + (rows[0] > ny / 2 ? -2 : 2))));
    const lane = (list, ends) => {
      const first = list.findIndex((e) => e.kind === 'street' || e.kind === 'bridge'), last = list.length - 1 - list.slice().reverse().findIndex((e) => e.kind === 'street' || e.kind === 'bridge');
      if (first < 0) return;
      [[first - 1, -1, ends[0], 'a'], [last + 1, 1, ends[1], 'b']].forEach((g) => {
        let k = g[0], n = 0, open = true;
        for (; k >= 0 && k < list.length; k += g[1]) { const e = list[k]; if (e.kind) { open = false; break; } if (wet(e.a.x, e.a.y, 6) || wet(e.b.x, e.b.y, 6) || crosses(e.a, e.b)) { open = false; break; }
          e.kind = 'lane'; if (!n) { const town = g[1] < 0 ? e.b : e.a, out = g[1] < 0 ? e.a : e.b; gates.push(Geo.lerp(town, out, 0.36)); } n++; }
        if (open) { const tip = g[1] < 0 ? list[0].a : list[list.length - 1].b, end = g[2](tip); if (!crosses(tip, end) && !wet(end.x, end.y)) { ext.push({ a: tip, b: end }); if (!n) gates.push(Geo.lerp(tip, end, 0.3)); } }
      });
    };
    rows.forEach((j) => lane(xs.slice(0, -1).map((x, i) => Eh[i + ',' + j]), [(p) => ({ x: -12, y: p.y }), (p) => ({ x: W + 12, y: p.y })]));
    cols.forEach((i) => lane(ys.slice(0, -1).map((y, j) => Ev[i + ',' + j]), [(p) => ({ x: p.x, y: -12 }), (p) => ({ x: p.x, y: H + 12 })]));
    const segs = edges.filter((e) => e.kind === 'street' || e.kind === 'bridge'), lanes = edges.filter((e) => e.kind === 'lane').concat(ext);
    // 5. generic squares and parks, before any story place is known
    const town = cells.filter((c) => c.type === 'town'), roomy = (c) => !!Geo.inset(c.P, 16), front = (c) => c.P.some((p) => wet(p.x, p.y, 24)) || wet(c.c.x, c.c.y, 46);
    town.forEach((c) => { c.front = front(c); c.border = [[-1, 0], [1, 0], [0, -1], [0, 1]].some((o) => { const n = cid(c.i + o[0], c.j + o[1]); return !n || n.type === 'country'; }); });
    const spaced = (list, n, gap, taken) => { const out = []; list.forEach((c) => { if (out.length < n && out.concat(taken).every((o) => Math.hypot(o.c.x - c.c.x, o.c.y - c.c.y) > gap)) out.push(c); }); return out; };
    const byD = (a, b) => a.d - b.d || a.i - b.i || a.j - b.j;
    const sq = spaced(town.filter((c) => c.d < 0.75 && !c.front && roomy(c)).map((c) => ({ c: c, k: c.d + r.next() * 0.35 })).sort((a, b) => a.k - b.k || byD(a.c, b.c)).map((x) => x.c), 2 + r.int(2), 230, []);
    sq.forEach((c) => { c.type = 'square'; });
    const pk = spaced(Rnd.pickN(r, town.filter((c) => c.type === 'town' && (c.d > 0.45 || c.front) && roomy(c)), 99), 2 + r.int(2), 200, sq);
    pk.forEach((c) => { c.type = 'park'; });
    // 6. story places: every location takes a fitting site from the generated town
    const sites = [], used = new Set(), pos = {}, rank = (t) => { const i = this.PRIO.indexOf(t); return i < 0 ? 99 : i; };
    const order = real.slice().sort((a, b) => rank(a.template) - rank(b.template) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const keepOut = (p) => p.x < 86 || p.x > W - 86 || p.y < 70 || p.y > H - 56 || this.KEEP.some((k) => p.x > k[0] - 40 && p.x < k[2] + 40 && p.y > k[1] - 30 && p.y < k[3] + 30) || wet(p.x, p.y, 20);
    const toWater = (c) => { let best = null; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; for (let d = 8; d <= 110; d += 6) { if (wet(c.c.x + Math.cos(a) * d, c.c.y + Math.sin(a) * d)) { if (!best || d < best.d) best = { d: d, a: a }; break; } } } return best; };
    const houseCells = (pref) => town.filter((c) => c.type === 'town' && !used.has(c)).map((c) => ({ x: c.c.x, y: c.c.y, cell: c, pref: pref(c), kind: 'lot' }));
    const cand = (t) => {
      if (t === 'haven') { const quay = (list) => list.map((c) => { const w = toWater(c); if (!w) return null; const k = Math.max(0, w.d - 30);
          return { x: c.c.x + Math.cos(w.a) * k, y: c.c.y + Math.sin(w.a) * k, cell: c, pref: 2 - w.d / 120, kind: 'quay', dir: w.a }; }).filter((p) => p && !keepOut(p));
        const q = quay(town.filter((c) => c.type === 'town' && c.front && !used.has(c)));
        return q.length ? q : quay(cells.filter((c) => (c.type === 'town' || c.type === 'country') && !used.has(c))).map((p) => Object.assign(p, { convert: true, kind: 'quay', to: 'town' })); }
      if (t === 'park' || t === 'plein' || t === 'markt') {
        const want = t === 'park' ? 'park' : 'square', ready = cells.filter((c) => c.type === want && !used.has(c)).map((c) => ({ x: c.c.x, y: c.c.y, cell: c, pref: 1.5 - (t === 'markt' ? c.d * 0.5 : 0), kind: want }));
        return ready.concat(town.filter((c) => c.type === 'town' && !used.has(c) && roomy(c)).map((c) => ({ x: c.c.x, y: c.c.y, cell: c, pref: 0.2 + (want === 'park' ? c.d * 0.3 : 0.5 - c.d * 0.3), kind: want, convert: true })));
      }
      if (t === 'poort') return gates.map((g) => ({ x: g.x, y: g.y, pref: 1.4, kind: 'gate', gate: g })).concat(houseCells((c) => c.border ? 0.4 : -1));
      if (t === 'straat') return segs.filter((e) => e.kind === 'street' && e.cells.length === 2 && e.cells.every((c) => c.type === 'town')).map((e) => { const m = Geo.lerp(e.a, e.b, 0.5); return { x: m.x, y: m.y, pref: 0.6, kind: 'street', edge: e }; });
      if (t === 'kantoor' || t === 'archief') return houseCells((c) => 1 - c.d);
      if (t === 'herberg') return houseCells((c) => 0.7 - c.d * 0.3 + ([[-1, 0], [1, 0], [0, -1], [0, 1]].some((o) => { const n = cid(c.i + o[0], c.j + o[1]); return n && n.type === 'square'; }) ? 0.5 : 0));
      if (t === 'werkplaats') return houseCells((c) => 0.3 + (c.front ? 0.3 : 0) + (c.border ? 0.2 : 0) + c.d * 0.2);
      return houseCells((c) => 0.25 + c.d * 0.4);
    };
    order.forEach((l) => {
      let list = cand(l.template).filter((p) => !keepOut(p) && (!p.cell || !used.has(p.cell))), pick = null;
      if (!list.length) list = houseCells(() => 0).filter((p) => !keepOut(p));
      if (!list.length) list = town.concat(cells.filter((c) => c.type === 'country')).map((c) => ({ x: c.c.x, y: c.c.y, cell: c, pref: 0, kind: 'lot' })).filter((p) => !used.has(p.cell) && !keepOut(p));
      for (const D of [175, 150, 125, 100, 80, 0]) {
        list.forEach((p) => { const md = sites.reduce((m, q) => Math.min(m, Math.hypot(q.x - p.x, q.y - p.y)), 999); if (md < D) return;
          const sc = p.pref + Math.min(md, 320) / 320 * 0.8 + r.next() * 0.15; if (!pick || sc > pick.sc) pick = Object.assign({ sc: sc }, p); });
        if (pick) break;
      }
      if (!pick) pick = { x: W / 2, y: H / 2, pref: 0, kind: 'lot' };
      if (pick.cell) { used.add(pick.cell); if (pick.convert) pick.cell.type = pick.to || pick.kind; pick.cell.story = l.id; }
      const site = { id: l.id, tpl: l.template, x: +pick.x.toFixed(1), y: +pick.y.toFixed(1), kind: pick.kind, cell: pick.cell || null, dir: pick.dir, edge: pick.edge || null };
      sites.push(site); pos[l.id] = { x: site.x, y: site.y };
    });
    // labels go above the place, unless the top edge or a close neighbour above is in the way
    sites.forEach((p) => { const crowd = sites.some((q) => q !== p && Math.abs(q.x - p.x) < 130 && q.y < p.y && p.y - q.y < 78); pos[p.id].above = p.y > 84 && !(crowd && p.y < H - 96); });
    // 7. houses along the streets of every town block; a story block keeps room around its landmark
    const houses = [], hr = RNG.make(s.seed + '|houses'), hasStreet = (c, k) => { const e = k === 0 ? Eh[c.i + ',' + c.j] : k === 1 ? Ev[(c.i + 1) + ',' + c.j] : k === 2 ? Eh[c.i + ',' + (c.j + 1)] : Ev[c.i + ',' + c.j]; return e && (e.kind === 'street' || e.kind === 'bridge'); };
    cells.filter((c) => c.type === 'town').forEach((c) => {
      const Q = Geo.inset(c.P, this.HALF + 3.5); if (!Q) return;
      const site = sites.find((p) => p.cell === c), sg = Math.sign(Geo.area(Q)), wMin = Math.min(Math.hypot(Q[2].x - Q[0].x, Q[2].y - Q[0].y), Math.hypot(Q[3].x - Q[1].x, Q[3].y - Q[1].y));
      const depth = Math.min(10 + hr.int(5), wMin * 0.3);
      for (let k = 0; k < 4; k++) {
        if (!hasStreet(c, k)) continue;
        const a = Q[k], b = Q[(k + 1) % 4], len = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx2 = -uy * sg, ny2 = ux * sg;
        let t = 0; const tone = hr.int(3);
        while (t < len - depth - 6) {
          const w = Math.min(7 + hr.int(8), len - depth - t);
          if (w >= 6) {
            const p0 = { x: a.x + ux * t, y: a.y + uy * t }, p1 = { x: a.x + ux * (t + w), y: a.y + uy * (t + w) }, q = [p0, p1, { x: p1.x + nx2 * depth, y: p1.y + ny2 * depth }, { x: p0.x + nx2 * depth, y: p0.y + ny2 * depth }];
            const ctr = Geo.centroid(q), skip = (site && Math.hypot(ctr.x - site.x, ctr.y - site.y) < 30) || q.some((p) => wet(p.x, p.y, 2)) || hr.next() < 0.05;
            if (!skip && q.every((p) => Geo.inside(p, Q) || Geo.segD(p.x, p.y, a.x, a.y, b.x, b.y) < 0.6)) houses.push({ q: q, tone: (tone + (hr.next() < 0.25 ? 1 : 0)) % 3 });
          }
          t += w + 1 + (hr.next() < 0.1 ? 5 : 0);
        }
      }
    });
    // a few farms along the country lanes, away from the lane itself
    lanes.forEach((e) => { if (hr.next() > 0.35) return; const m = Geo.lerp(e.a, e.b, 0.3 + hr.next() * 0.4), dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, l = Math.hypot(dx, dy) || 1, sd = hr.next() < 0.5 ? 1 : -1, ox = -dy / l * 18 * sd, oy = dx / l * 18 * sd;
      const ux = dx / l, uy = dy / l, c0 = { x: m.x + ox, y: m.y + oy }, q = [[-9, -6], [9, -6], [9, 6], [-9, 6]].map((v) => ({ x: c0.x + ux * v[0] - uy * v[1], y: c0.y + uy * v[0] + ux * v[1] }));
      const clear = q.concat([c0]).every((p) => segs.concat(lanes).every((x) => Geo.segD(p.x, p.y, x.a.x, x.a.y, x.b.x, x.b.y) > 9));
      if (clear && !q.some((p) => wet(p.x, p.y, 3) || p.x < 4 || p.x > W - 4 || p.y < 4 || p.y > H - 4)) houses.push({ q: q, tone: 2, farm: true }); });
    const M = { W: W, H: H, water: water, pos: pos, sites: sites, cells: cells, segs: segs, lanes: lanes, houses: houses, gates: gates, seed: s.seed, center: { x: cx, y: cy } };
    return M;
  },
  // Spoorboek: walking minutes from the straight distance, with a detour factor for the streets
  travel(M, a, b) {
    if (a === b) return 0; const p = M.pos[a], q = M.pos[b]; if (!p || !q) return Infinity;
    return Math.max(10, Math.min(40, 5 * Math.round((10 + Math.hypot(q.x - p.x, q.y - p.y) * 1.25 / 20) / 5)));
  },
  /* ----- drawing: the town is static per seed and cached; places, people and the legend change ----- */
  ground(M) {
    if (M.bg) return M.bg;
    const r = RNG.make(M.seed + '|paint'), W = M.W, H = M.H, wet = (x, y, pad) => M.water.wet(x, y, pad), I = MAP_INK;
    let h = `<defs><pattern id="hs-field" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="${I.hatch}" stroke-opacity=".28" stroke-width="1.4"/></pattern></defs>`;
    const tree = (x, y, rad) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${I.tree}" fill-opacity=".6" stroke="${I.treeLine}" stroke-opacity=".5" stroke-width="1.1"/>`;
    const treesIn = (P, n, keep) => { let out = ''; const xs = P.map((p) => p.x), ys = P.map((p) => p.y), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      for (let k = 0, made = 0; k < n * 4 && made < n; k++) { const x = x0 + r.next() * (x1 - x0), y = y0 + r.next() * (y1 - y0); if (!Geo.inside({ x: x, y: y }, P) || wet(x, y, 6) || (keep && keep(x, y))) continue; out += tree(x, y, 5 + r.int(4)); made++; } return out; };
    // countryside: fields and woods, plus loose trees in the margins
    M.cells.filter((c) => c.type === 'country').forEach((c) => {
      const Q = Geo.inset(c.P, 5), Q2 = Geo.inset(c.P, 12); if (!Q) return;
      if (r.next() < 0.36) { if (Q2) h += treesIn(Q2, 10 + r.int(8)); }
      else { const f = I.field[r.int(3)]; h += `<path d="${Geo.d(Q)}" fill="${f}" fill-opacity=".32"/><path d="${Geo.d(Q)}" fill="url(#hs-field)"/>`; }
    });
    for (let k = 0; k < 46; k++) { const edge = r.int(4), x = edge === 0 ? r.next() * 46 : edge === 1 ? W - r.next() * 40 : r.next() * W, y = edge === 2 ? r.next() * 36 : edge === 3 ? H - r.next() * 24 : r.next() * H;
      if (!wet(x, y, 6) && !M.lanes.concat(M.segs).some((e) => Geo.segD(x, y, e.a.x, e.a.y, e.b.x, e.b.y) < 16)) h += tree(x, y, 4 + r.int(4)); }
    // town blocks, squares and parks
    M.cells.forEach((c) => {
      if (c.type === 'town') { const Q = Geo.inset(c.P, this.HALF + 2); if (Q) h += `<path d="${Geo.d(Q)}" fill="${I.block}" fill-opacity=".28"/>`; }
      if (c.type === 'square') { const Q = Geo.inset(c.P, this.HALF + 2); if (!Q) return; const m = Geo.centroid(Q);
        h += `<path d="${Geo.d(Q)}" fill="${I.square}" fill-opacity=".85" stroke="${I.casing}" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="3 3"/>`;
        Q.forEach((p) => { const t = Geo.lerp(p, m, 0.18); h += tree(t.x, t.y, 5); });
        if (c.story && M.sites.some((p) => p.id === c.story && p.tpl === 'markt')) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = m.x + Math.cos(a) * 26, y = m.y + Math.sin(a) * 17; h += `<rect x="${(x - 5).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="10" height="8" fill="${I.stall}" fill-opacity=".8" stroke="var(--sp-ink)" stroke-opacity=".5" stroke-width="1"/>`; }
        else h += `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="5" fill="${I.water}" fill-opacity=".7" stroke="${I.shore}" stroke-width="1.4"/>`;
      }
      if (c.type === 'park') { const Q = Geo.inset(c.P, this.HALF + 2); if (!Q) return; const m = Geo.centroid(Q), a = Geo.lerp(Q[0], Q[3], 0.5), b = Geo.lerp(Q[1], Q[2], 0.5);
        h += `<path d="${Geo.d(Q)}" fill="${I.park}" fill-opacity=".42" stroke="${I.treeLine}" stroke-opacity=".35" stroke-width="1.2"/>`;
        h += `<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${(m.x + 10).toFixed(1)} ${(m.y - 16).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="${I.street}" stroke-opacity=".9" stroke-width="3"/>`;
        const Q2 = Geo.inset(c.P, this.HALF + 10); if (Q2) h += treesIn(Q2, 9 + r.int(5), (x, y) => Math.hypot(x - m.x, y - m.y) < 10);
      }
    });
    // water above the land, streets above the water (bridges)
    M.water.polys.forEach((P) => { h += `<path d="${Geo.d(P)}" fill="${I.water}" fill-opacity=".55" stroke="${I.shore}" stroke-width="2.5" stroke-linejoin="round"/>`; });
    for (let k = 0; k < 18; k++) { const x = 20 + r.next() * (W - 40), y = 20 + r.next() * (H - 40); if (wet(x, y, -8) && wet(x + 22, y, -8)) h += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q5.5 -3 11 0 t11 0" fill="none" stroke="${I.ripple}" stroke-opacity=".6" stroke-width="1.3"/>`; }
    const line = (list) => list.map((e) => `M${e.a.x.toFixed(1)} ${e.a.y.toFixed(1)} L${e.b.x.toFixed(1)} ${e.b.y.toFixed(1)}`).join(' ');
    if (M.lanes.length) h += `<path d="${line(M.lanes)}" fill="none" stroke="${I.lane}" stroke-opacity=".9" stroke-width="${this.LANE * 2}" stroke-linecap="round"/><path d="${line(M.lanes)}" fill="none" stroke="${I.casing}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="4 5"/>`;
    h += `<path d="${line(M.segs)}" fill="none" stroke="${I.casing}" stroke-opacity=".7" stroke-width="${this.HALF * 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
    h += `<path d="${line(M.segs)}" fill="none" stroke="${I.street}" stroke-width="${this.HALF * 2 - 4}" stroke-linecap="round" stroke-linejoin="round"/>`;
    M.segs.filter((e) => e.kind === 'bridge').forEach((e) => { const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l; let t0 = null, t1 = null;
      for (let t = 0; t <= 1; t += 0.02) if (wet(e.a.x + dx * t, e.a.y + dy * t, 6)) { if (t0 === null) t0 = t; t1 = t; }
      if (t0 === null) return; [-1, 1].forEach((sd) => { const ox = -uy * (this.HALF + 1) * sd, oy = ux * (this.HALF + 1) * sd; h += `<line x1="${(e.a.x + dx * t0 + ox).toFixed(1)}" y1="${(e.a.y + dy * t0 + oy).toFixed(1)}" x2="${(e.a.x + dx * t1 + ox).toFixed(1)}" y2="${(e.a.y + dy * t1 + oy).toFixed(1)}" stroke="var(--sp-ink)" stroke-opacity=".75" stroke-width="2.2"/>`; }); });
    // houses in three paper tones, one path each
    [0, 1, 2].forEach((t) => { const d = M.houses.filter((x) => x.tone === t).map((x) => Geo.d(x.q)).join(''); if (d) h += `<path d="${d}" fill="${I.house[t]}" fill-opacity=".85" stroke="var(--sp-ink)" stroke-opacity=".42" stroke-width="1"/>`; });
    // landmarks of the story places: a quay with a boat, a gate, or a larger building in the colour of the place
    M.sites.forEach((p) => {
      const col = Hex.mix(TEMPLATE_COLOR[p.tpl] || '#b89472', '#d8cfb8', 0.2);
      if (p.kind === 'quay') { const ux = Math.cos(p.dir), uy = Math.sin(p.dir), w = M.water; let d0 = 0; while (d0 < 120 && !w.wet(p.x + ux * d0, p.y + uy * d0)) d0 += 3;
        const a = { x: p.x + ux * (d0 - 4), y: p.y + uy * (d0 - 4) }, b = { x: p.x + ux * (d0 + 30), y: p.y + uy * (d0 + 30) };
        h += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${I.quay}" stroke-width="7" stroke-linecap="square"/>`;
        const bt = { x: b.x - uy * 13 - ux * 8, y: b.y + ux * 13 - uy * 8 }; if (w.wet(bt.x, bt.y, -4)) h += `<ellipse cx="${bt.x.toFixed(1)}" cy="${bt.y.toFixed(1)}" rx="11" ry="4.5" transform="rotate(${(p.dir * 180 / Math.PI).toFixed(1)} ${bt.x.toFixed(1)} ${bt.y.toFixed(1)})" fill="${I.boat}" fill-opacity=".85" stroke="var(--sp-ink)" stroke-opacity=".6" stroke-width="1"/>`; }
      if (p.kind === 'gate') { h += `<rect x="${(p.x - 16).toFixed(1)}" y="${(p.y - 16).toFixed(1)}" width="32" height="32" rx="3" fill="${col}" fill-opacity=".7" stroke="var(--sp-ink)" stroke-opacity=".5" stroke-width="1.2"/>`; }
      if (p.kind === 'lot' || p.kind === 'quay') { const c = p.cell, a = c ? Math.atan2(c.P[1].y - c.P[0].y, c.P[1].x - c.P[0].x) * 180 / Math.PI : 0;
        h += `<rect x="${(p.x - 21).toFixed(1)}" y="${(p.y - 15).toFixed(1)}" width="42" height="30" rx="2" transform="rotate(${a.toFixed(1)} ${p.x} ${p.y})" fill="${col}" fill-opacity=".8" stroke="var(--sp-ink)" stroke-opacity=".55" stroke-width="1.3"/>`; }
    });
    // compass rose, top right
    h += `<g transform="translate(1134 62)" opacity=".8"><circle r="26" fill="var(--sp-panel)" stroke="var(--sp-ink)" stroke-width="1.5"/><path d="M0 -22 L5 -5 L22 0 L5 5 L0 22 L-5 5 L-22 0 L-5 -5 Z" fill="none" stroke="var(--sp-ink)" stroke-width="1.3"/><path d="M0 -22 L4 -4 L-4 -4 Z" fill="var(--sp-thread)"/><text y="-29" text-anchor="middle" font-size="11" font-weight="700" fill="var(--sp-ink)">N</text></g>`;
    M.bg = `<g pointer-events="none">${h}</g>`; return M.bg;
  },
  // v0.16.0: at most one calm badge for unknown people (?, 2 ?, 3 ?, or 3+ ?), never ?\d and never a row of ? ? ? 3+
  unknownBadges: (n) => n <= 0 ? [] : n === 1 ? ['?'] : n <= 3 ? [n + ' ?'] : ['3+ ?'],
  svg(s, M, part, sel) {
    const P = M.pos, met = s.cast.filter((n) => s.play.met[n.id]).sort(byName), here = s.visit ? s.visit.locId : s.pos || null;
    const useNow = part === s.clock.part && typeof Clock !== 'undefined', nowMin = useNow ? Clock.norm(s) : null;
    const isLocOpen = (l) => useNow ? World.openAtMin(l, nowMin) : World.openAt(l, part);
    const isAt = (id, lid) => (useNow ? Schedule.atMin(s, id, s.clock.day, nowMin) : Schedule.at(s, id, s.clock.day, part)) === lid;
    const crimeLocId = s.crime && s.crime.crimeLocationId, victimLocId = s.crime && s.crime.victimLocationId;
    const vFirst = s.crime && s.crime.victim ? U.first(s.crime.victim) : 'slachtoffer';
    let h = `<svg viewBox="0 0 ${this.W} ${this.H}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Stadskaart">` + this.ground(M);
    s.world.locations.forEach((l) => {
      const p = P[l.id], open = isLocOpen(l), up = p.above, tw = l.name.length * 8.4;
      const lx = Math.max(tw / 2 + 8, Math.min(this.W - tw / 2 - 8, p.x)), ly = up ? p.y - 24 : p.y + 36;
      const isCrime = l.id === crimeLocId, isVic = l.id === victimLocId;
      const ariaExtra = (isCrime ? ', plaats van het voorval' : '') + (isVic ? ', plek van ' + s.crime.victim.name : '') + (open ? '' : ', gesloten');
      const tplCol = TEMPLATE_COLOR[l.template] || '#c98b4e';
      h += `<g class="stn${open ? '' : ' closed'}${here === l.id ? ' here' : ''}${sel === l.id ? ' sel' : ''}" data-stn="${l.id}" tabindex="0" role="button" aria-label="${U.esc(l.name + ariaExtra)}">`;
      h += `<circle cx="${p.x}" cy="${p.y}" r="30" fill="transparent"/>`;
      if (here === l.id) h += `<circle cx="${p.x}" cy="${p.y}" r="30" fill="none" stroke="var(--sp-ink)" stroke-width="2.5" stroke-dasharray="5 4"><title>Hier ben je nu</title></circle>`;
      if (l.id === s.startLoc) h += `<circle cx="${p.x}" cy="${p.y}" r="21" fill="none" stroke="var(--sp-thread)" stroke-width="3"><title>Hier logeer je</title></circle>`;
      if (sel === l.id) h += `<circle class="selring" cx="${p.x}" cy="${p.y}" r="26" fill="none" stroke="var(--sp-thread)" stroke-width="3.5"/>`;
      h += `<circle class="dot" cx="${p.x}" cy="${p.y}" r="14" fill="${open ? 'var(--sp-stn)' : 'var(--sp-line)'}" stroke="var(--sp-stnline)" stroke-width="3"${open ? '' : ' stroke-dasharray="4 3"'}/>`;
      h += `<path d="M${p.x - 7} ${p.y + 5} L${p.x - 7} ${p.y - 2} L${p.x} ${p.y - 8} L${p.x + 7} ${p.y - 2} L${p.x + 7} ${p.y + 5} Z" fill="${open ? tplCol : 'var(--sp-mute)'}" stroke="var(--sp-stnline)" stroke-width="1.3"/>`;
      if (isCrime) h += `<g transform="translate(${p.x - 16} ${p.y - 15})"><title>Plaats van het voorval (${U.esc(l.name)})</title><circle r="8" fill="#b3312a" stroke="var(--sp-mapbg)" stroke-width="2"/><path d="M-3.2 -3.2 L3.2 3.2 M3.2 -3.2 L-3.2 3.2" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/></g>`;
      if (isVic) h += `<g transform="translate(${p.x + 16} ${p.y - 15})"><title>Werk/woning van ${U.esc(s.crime.victim.name)}</title><rect x="-6.5" y="-6.5" width="13" height="13" rx="2" transform="rotate(45)" fill="#c48a1c" stroke="var(--sp-mapbg)" stroke-width="2"/><circle r="2" fill="#fff"/></g>`;
      h += `<text class="lbl" x="${lx.toFixed(1)}" y="${ly}" text-anchor="middle">${U.esc(l.name)}</text>`;
      if (!open) h += `<text class="sub" x="${lx.toFixed(1)}" y="${up ? ly - 17 : ly + 16}" text-anchor="middle">${part >= DAY.parts ? 'dicht, het is nacht' : 'open ' + l.open[0] + '–' + l.open[1] + ' uur'}</text>`;
      // v0.16.0: calm badge strip: up to 3 met core suspects (+N overflow) and at most 1 compact unknown badge (met extras stay in stnDetail)
      const presentAll = open ? s.cast.concat(s.crowd).filter((n) => isAt(n.id, l.id)) : [];
      const who = met.filter((n) => open && isAt(n.id, l.id)), fig = presentAll.filter((n) => !People.isCore(s, n.id) && People.known(s, n.id));
      const unk = Math.max(0, presentAll.length - who.length - fig.length);
      const badges = who.slice(0, 3).map((n) => ({ kind: 'met', n: n, w: 18 }));
      if (who.length > 3) badges.push({ kind: 'met-more', n: who.length - 3, names: who.slice(3).map((n) => n.name).join(', '), w: 22 });
      this.unknownBadges(unk).forEach((t) => { badges.push({ kind: t === '?' ? 'unk' : 'more', t: t, n: unk, w: t === '?' ? 18 : t.length > 3 ? 34 : 28 }); });
      if (badges.length) {
        const gap = 4, totalW = badges.reduce((a, b) => a + b.w, 0) + gap * (badges.length - 1);
        let curX = Math.max(12, Math.min(this.W - 12 - totalW, p.x - totalW / 2));
        const by = up ? p.y + 29 : p.y - 29;
        badges.forEach((b) => {
          const cx = +(curX + b.w / 2).toFixed(1), y = by;
          if (b.kind === 'met') h += `<g class="met-b"><title>${U.esc(b.n.name)} (aanwezig)</title><circle cx="${cx}" cy="${y}" r="9" fill="${Silhouette.accent(b.n.role)}" stroke="var(--sp-mapbg)" stroke-width="1.8"/><text x="${cx}" y="${y + 3.5}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">${U.esc(b.n.name.charAt(0))}</text></g>`;
          else if (b.kind === 'met-more') h += `<g class="met-more"><title>Ook aanwezig: ${U.esc(b.names)}</title><rect x="${(cx - b.w / 2).toFixed(1)}" y="${y - 9}" width="${b.w}" height="18" rx="9" fill="var(--sp-ink)" stroke="var(--sp-mapbg)" stroke-width="1.6"/><text x="${cx}" y="${y + 3.5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--sp-panel)">+${b.n}</text></g>`;
          else if (b.kind === 'unk') h += `<g class="unk"><title>Eén persoon die je nog niet kent</title><circle cx="${cx}" cy="${y}" r="9" fill="var(--sp-panel)" stroke="var(--sp-mute)" stroke-width="1.6" stroke-dasharray="2.5 2"/><text x="${cx}" y="${y + 3.5}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--sp-ink)">?</text></g>`;
          else h += `<g class="unk-more"><title>${b.n > 3 ? 'Meer dan drie mensen' : b.n + ' mensen'} die je nog niet kent</title><rect x="${(cx - b.w / 2).toFixed(1)}" y="${y - 9}" width="${b.w}" height="18" rx="9" fill="var(--sp-panel)" stroke="var(--sp-mute)" stroke-width="1.5" stroke-dasharray="3 2"/><text x="${cx}" y="${y + 3.5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--sp-ink)">${U.esc(b.t)}</text></g>`;
          curX += b.w + gap;
        });
      }
      h += '</g>';
    });
    // legend, bottom left
    const cy = this.H - 126;
    h += `<g class="cart" transform="translate(20 ${cy})" pointer-events="none"><rect width="388" height="114" rx="6" fill="var(--sp-panel)" stroke="var(--sp-ink)" stroke-width="1.8"/><text class="t" x="14" y="26">Kaart van ${U.esc(s.world.city.name)}</text>`;
    h += `<circle cx="22" cy="46" r="6" fill="none" stroke="var(--sp-thread)" stroke-width="2.8"/><text x="34" y="50">logies</text>`;
    h += `<circle cx="104" cy="46" r="6.5" fill="#b3312a"/><path d="M101.5 43.5 L106.5 48.5 M106.5 43.5 L101.5 48.5" stroke="#fff" stroke-width="1.6"/><text x="116" y="50">plaats delict</text>`;
    h += `<rect x="217" y="41" width="10" height="10" rx="1.5" transform="rotate(45 222 46)" fill="#c48a1c"/><text x="234" y="50">plek v. ${U.esc(vFirst)}</text>`;
    h += `<rect x="13" y="64" width="28" height="16" rx="8" fill="var(--sp-panel)" stroke="var(--sp-mute)" stroke-width="1.4" stroke-dasharray="2.5 2"/><text x="27" y="75.5" text-anchor="middle" font-size="9" font-weight="700" fill="var(--sp-ink)">2 ?</text><text x="48" y="76" font-size="12">onbekenden · dag ${s.clock.day}, ${useNow ? U.hm(nowMin) : PARTS[part]}</text>`;
    h += `<text x="14" y="98" fill="var(--sp-mute)" font-size="11">Tik op een plek voor details. Lopen kost 15 tot 45 minuten.</text></g>`;
    return h + '</svg>';
  },
  // tests: the checks the town must pass
  audit(M) {
    const bad = [], wet = (x, y, pad) => M.water.wet(x, y, pad), roads = M.segs.map((e) => [e, this.HALF]).concat(M.lanes.map((e) => [e, this.LANE]));
    M.houses.forEach((hs, k) => {
      const pts = hs.q.concat([Geo.centroid(hs.q)]);
      if (pts.some((p) => wet(p.x, p.y))) bad.push('huis ' + k + ' in het water');
      if (pts.some((p) => roads.some((x) => Geo.segD(p.x, p.y, x[0].a.x, x[0].a.y, x[0].b.x, x[0].b.y) < x[1] + 0.5))) bad.push('huis ' + k + ' op straat');
    });
    return bad;
  }
};

/* ---------------- Tableau: procedural SVG scene per location (viewBox 960x540) with hotspots ----------------
   Layers: background per template kind x colour family of the era, props, crowd, people, front props, light.
   Slots are fixed per template kind; people and crowd fill them in name order (never cast order). */
// v0.8.0: the inn has five fixed spots; an object's prop says which one it takes
const HERBERG_BOX = { counter: [40, 286, 362, 148], table: [586, 412, 214, 74], hearth: [776, 196, 164, 214], ledger: [316, 256, 70, 32], door: [470, 186, 88, 214] };
const Tableau = {
  PEOPLE: { herberg: [[214, 472], [340, 474], [512, 486], [704, 446], [878, 486], [606, 500]], inside: [[236, 488], [404, 482], [640, 488], [812, 482], [520, 498], [118, 494]],
    outside: [[226, 504], [424, 498], [644, 504], [824, 500], [526, 514], [120, 508]] },
  CROWD: { herberg: [[112, 420], [440, 432], [560, 428], [744, 432], [262, 420]], inside: [[110, 440], [330, 436], [560, 434], [760, 440], [880, 438]],
    outside: [[84, 446], [330, 440], [572, 438], [740, 444], [900, 442]] },
  SLOTS: { inside: [[56, 168, 190, 250], [292, 252, 168, 168], [540, 160, 170, 136], [744, 196, 186, 226], [478, 412, 214, 64]],
    outside: [[48, 300, 176, 168], [262, 336, 176, 122], [512, 300, 156, 150], [714, 286, 206, 180], [430, 452, 230, 58]] },
  kindOf: (tpl) => tpl === 'herberg' ? 'herberg' : ['huis', 'kantoor', 'archief', 'werkplaats'].indexOf(tpl) >= 0 ? 'inside' : 'outside',
  prop(name, tpl) {
    const n = norm(name), has = (w) => n.indexOf(w) >= 0;

    if (has('haard') || has('schoorsteen') || has('oven')) return 'hearth';
    if (has('deur')) return 'door';
    if (has('kraam')) return 'stall';
    if (has('pomp')) return 'pump';
    if (has('bord')) return 'board';
    if (has('bank')) return 'bench';
    if (has('boom')) return 'tree';
    if (has('trappen')) return 'steps';
    if (has('weegschaal')) return 'scale';
    if (has('meerpaal')) return 'bollard';
    if (has('netten')) return 'nets';
    if (has('huisje') || has('hokje')) return 'hut';
    if (has('lantaarn')) return 'lamp';
    if (has('etalage')) return 'shop';
    if (has('pad')) return 'hedge';
    if (has('nachtkastje')) return 'stand';
    if (has('bureau') || has('werkbank') || has('leestafel')) return 'desk';
    if (has('rek')) return 'rack';
    if (has('kast') || has('registers') || has('kaartenbak')) return 'cabinet';
    if (has('register') || has('boek') || has('brieven') || has('post')) return 'ledger';
    return 'crate';
  },
  model(s, locId, part) {
    const loc = World.loc(s, locId), useNow = part === s.clock.part && typeof Clock !== 'undefined', nowMin = useNow ? Clock.norm(s) : null;
    const open = useNow ? World.openAtMin(loc, nowMin) : World.openAt(loc, part);
    const k = this.kindOf(loc.template), hs = [];
    const at = (x) => (useNow ? Schedule.atMin(s, x.id, s.clock.day, nowMin) : Schedule.at(s, x.id, s.clock.day, part)) === loc.id;
    // v0.8.0 (nieuw A): core people and figuranten share one shuffled line-up, so where someone stands says nothing
    const all = open ? s.cast.filter(at).concat(s.crowd.filter(at)).sort((a, b) => a.id.localeCompare(b.id)) : [], mix = Rnd.pickN(RNG.make(s.seed + '|stage|' + loc.id + '|' + s.clock.day + '|' + part), all, all.length);
    const extra = Math.max(0, mix.length - 11);
    mix.forEach((x, i) => {
      const core = People.isCore(s, x.id), front = i < 6;
      let px, py, sc;
      if (front) { const sl = this.PEOPLE[k][i]; px = sl[0]; py = sl[1]; sc = 0.92; }
      else if (i < 11) { const sl = this.CROWD[k][i - 6]; px = sl[0]; py = sl[1]; sc = 0.8; }
      else {
        const ei = i - 11;
        px = Math.round(78 + ((ei + 1) / (extra + 1)) * 804);
        py = (k === 'outside' ? 430 : k === 'herberg' ? 414 : 424) + (ei % 2) * 14;
        sc = 0.74;
      }
      hs.push({ id: (core ? 'npc:' : 'crowd:') + x.id, kind: core ? 'npc' : 'crowd', ref: x, x: px, y: py, k: sc, back: !front });
    });
    let free = 0;
    loc.objects.forEach((o) => {
      const prop = o.prop || this.prop(o.name, loc.template), fixed = loc.template === 'herberg' && HERBERG_BOX[prop], sl = fixed || this.SLOTS[k === 'herberg' ? 'inside' : k][free++ % 5];
      hs.push({ id: 'obj:' + o.id, kind: 'obj', ref: o, box: { x: sl[0], y: sl[1], w: sl[2], h: sl[3] }, prop: prop });
    });
    return { loc: loc, part: part, open: open, kind: k, hs: hs };
  },
  defs(M, P, fam, idP) {
    const p = Math.min(2, Math.max(0, M.part)), wall = M.kind === 'herberg' ? P.wall : Hex.mix(P.wall, TEMPLATE_COLOR[M.loc.template] || P.wall, 0.26);
    const skyTop = fam === 'toekomst' ? ['#295368', '#1e4260', '#070f1d'][p] : ['#9bbcc7', '#6da7c7', '#131d32'][p];
    const skyBot = fam === 'toekomst' ? ['#5ea49c', '#3c778c', '#182b44'][p] : ['#f4dfb9', '#d2e4ea', '#2d3f5e'][p];
    const sunCol = fam === 'toekomst' ? P.accent : (p === 0 ? '#ffe59e' : '#fff7dc');
    const glowCol = fam === 'toekomst' ? P.accent : '#ffcf72';
    return `<defs>` +
      `<linearGradient id="${idP}_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${skyTop}"/><stop offset="100%" stop-color="${skyBot}"/></linearGradient>` +
      `<linearGradient id="${idP}_wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${Hex.mix(wall, '#000000', 0.14)}"/><stop offset="35%" stop-color="${wall}"/><stop offset="100%" stop-color="${Hex.mix(wall, '#000000', 0.18)}"/></linearGradient>` +
      `<linearGradient id="${idP}_floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${Hex.mix(P.floor, '#000000', 0.24)}"/><stop offset="32%" stop-color="${P.floor}"/><stop offset="100%" stop-color="${Hex.mix(P.floor, '#000000', 0.12)}"/></linearGradient>` +
      `<linearGradient id="${idP}_sun" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stop-color="${sunCol}" stop-opacity="${p === 0 ? 0.34 : 0.22}"/><stop offset="100%" stop-color="${sunCol}" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="${idP}_glow"><stop offset="0%" stop-color="${glowCol}" stop-opacity="${fam === 'toekomst' ? 0.36 : 0.62}"/><stop offset="55%" stop-color="${glowCol}" stop-opacity="${fam === 'toekomst' ? 0.12 : 0.2}"/><stop offset="100%" stop-color="${glowCol}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="${idP}_hearth"><stop offset="0%" stop-color="#ff9d3b" stop-opacity="0.58"/><stop offset="60%" stop-color="#e86a1f" stop-opacity="0.16"/><stop offset="100%" stop-color="#e86a1f" stop-opacity="0"/></radialGradient>` +
      `</defs>`;
  },
  sky(part, fam, x, y, w, h, idP) {
    const p = Math.min(2, Math.max(0, part));
    const fill = idP ? `url(#${idP}_sky)` : (fam === 'toekomst' ? ['#3d6b7a', '#2c5a78', '#0b1626'][p] : ['#d7e6e4', '#9cc6d6', '#24324a'][p]);
    let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    if (p === 0) {
      const sx = x + w * 0.24, sy = y + h * 0.76, sr = Math.min(w, h) * 0.15;
      g += `<circle cx="${sx}" cy="${sy}" r="${(sr * 1.9).toFixed(1)}" fill="#fde5a8" opacity=".28"/><circle cx="${sx}" cy="${sy}" r="${sr.toFixed(1)}" fill="#fff0c2" opacity=".92"/>`;
      g += `<rect x="${x}" y="${y + h * 0.74}" width="${w}" height="${h * 0.26}" fill="#f7e6c4" opacity=".24"/>`;
    }
    if (p === 1) {
      g += `<ellipse cx="${x + w * 0.62}" cy="${y + h * 0.28}" rx="${w * 0.21}" ry="${h * 0.065}" fill="#fff" opacity=".62"/>` +
        `<ellipse cx="${x + w * 0.28}" cy="${y + h * 0.42}" rx="${w * 0.14}" ry="${h * 0.045}" fill="#fff" opacity=".45"/>`;
    }
    if (p >= 2) {
      const mx = x + w * 0.74, my = y + h * 0.26, mr = Math.min(w, h) * 0.085;
      g += `<circle cx="${mx}" cy="${my}" r="${(mr * 2.1).toFixed(1)}" fill="#dfe8f6" opacity=".16"/><circle cx="${mx}" cy="${my}" r="${mr.toFixed(1)}" fill="#f5efd4"/>`;
      for (let i = 0; i < 11; i++) g += `<circle cx="${(x + 12 + (i * 47 % Math.max(20, w - 24))).toFixed(0)}" cy="${(y + 8 + (i * 29 % Math.max(16, h * 0.64))).toFixed(0)}" r="${i % 3 === 0 ? 1.6 : 1.1}" fill="#f2ecd2" opacity="${i % 2 ? 0.85 : 0.55}"/>`;
    }
    return g;
  },
  window(fam, part, x, y, w, h, P, idP) {
    const p = Math.min(2, Math.max(0, part)), sill = `<rect x="${x - 10}" y="${y + h}" width="${w + 20}" height="11" rx="2" fill="${P.wood2}" stroke="${P.ink}" stroke-width="1.2" stroke-opacity=".45"/>`;
    let g = this.sky(p, fam, x, y, w, h, idP);
    // subtle distant roofline silhouette visible outside the window
    g += `<path d="M${x} ${y + h} L${x} ${y + h * 0.72} L${x + w * 0.34} ${y + h * 0.58} L${x + w * 0.62} ${y + h * 0.74} L${x + w} ${y + h * 0.62} L${x + w} ${y + h} Z" fill="${P.ink}" opacity="${p >= 2 ? 0.45 : 0.18}"/>`;
    const clipId = (idP || 'tb') + '_wclip_' + x;
    if (fam === 'oud') {
      const arch = `M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`;
      for (let i = -8; i < 8; i++) { const x0 = x + i * 22; g += `<path d="M${x0} ${y} L${x0 + h} ${y + h} M${x0 + w} ${y} L${x0 + w - h} ${y + h}" stroke="${P.ink}" stroke-width="1.4" opacity=".46"/>`; }
      return `<g><clipPath id="${clipId}"><path d="${arch}"/></clipPath><g clip-path="url(#${clipId})">${g}</g><path d="${arch}" fill="none" stroke="${P.stone}" stroke-width="14" opacity=".6"/><path d="${arch}" fill="none" stroke="${P.wood}" stroke-width="9"/>${sill}</g>`;
    }
    if (fam === 'klassiek') g += `<path d="M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}" stroke="${P.trim}" stroke-width="5.5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${P.trim}" stroke-width="9"/>` +
      `<rect x="${x - 16}" y="${y - 10}" width="${w + 32}" height="9" rx="2" fill="${P.wood2}"/><path d="M${x - 14} ${y - 4} Q${x + 12} ${y + h * 0.55} ${x + 4} ${y + h + 12} L${x - 16} ${y + h + 12} Z M${x + w + 14} ${y - 4} Q${x + w - 12} ${y + h * 0.55} ${x + w - 4} ${y + h + 12} L${x + w + 16} ${y + h + 12} Z" fill="${P.accent}" opacity=".88"/>` +
      `<path d="M${x - 8} ${y} L${x - 6} ${y + h + 10} M${x + w + 8} ${y} L${x + w + 6} ${y + h + 10}" stroke="#000" stroke-width="1.5" opacity=".18"/>`;
    if (fam === 'modern') { for (let i = 1; i < 9; i++) g += `<rect x="${x}" y="${y + i * h / 9 - 3}" width="${w}" height="3.5" fill="${P.trim}" opacity=".76"/>`; g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#e9e4d6" stroke-width="8"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${P.ink}" stroke-width="1.2" opacity=".35"/>`; }
    if (fam === 'toekomst') return `<g>${g}<path d="M${x} ${y + h * 0.25} L${x + w} ${y + h * 0.25} M${x} ${y + h * 0.75} L${x + w} ${y + h * 0.75}" stroke="${P.accent}" stroke-width="1" opacity=".28"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${P.accent}" stroke-width="3"/><rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="8" fill="none" stroke="${P.accent}" stroke-opacity=".28" stroke-width="5"/></g>`;
    return `<g>${g}${sill}</g>`;
  },
  lamp(fam, x, P, part) {
    const lit = part >= 2;
    if (fam === 'oud') return `<g><path d="M${x} 26 L${x} 70" stroke="${P.ink}" stroke-width="2.2"/><ellipse cx="${x}" cy="74" rx="38" ry="6" fill="none" stroke="${P.wood}" stroke-width="5"/>` +
      [-30, -10, 10, 30].map((d) => `<rect x="${x + d - 2.5}" y="58" width="5" height="14" fill="#efe3c1"/><path d="M${x + d} 49 q-3.5 4.5 0 9 q3.5 -4.5 0 -9" fill="${lit ? '#ffda66' : '#f4be48'}"/>${lit ? `<circle cx="${x + d}" cy="53" r="9" fill="#ffd26a" opacity=".28"/>` : ''}`).join('') + '</g>';
    if (fam === 'klassiek') return `<g><path d="M${x} 26 L${x} 84" stroke="${P.ink}" stroke-width="2"/><path d="M${x - 18} 108 Q${x} 76 ${x + 18} 108 Z" fill="${lit ? '#ffe28f' : '#e8cf86'}" opacity=".92"/><rect x="${x - 20}" y="106" width="40" height="7" rx="3" fill="${P.wood}"/><path d="M${x - 9} 84 L${x + 9} 84 L${x + 5} 92 L${x - 5} 92 Z" fill="${P.wood}"/>${lit ? `<ellipse cx="${x}" cy="112" rx="22" ry="8" fill="#ffd978" opacity=".32"/>` : ''}</g>`;
    if (fam === 'modern') return `<g><path d="M${x} 26 L${x} 90" stroke="${P.ink}" stroke-width="2"/><path d="M${x - 34} 120 Q${x} 72 ${x + 34} 120 Z" fill="${P.accent}" stroke="${P.ink}" stroke-width="1.2" stroke-opacity=".35"/><ellipse cx="${x}" cy="120" rx="34" ry="5" fill="${lit ? '#fff0bd' : '#e6d39c'}"/></g>`;
    return `<g><rect x="${x - 70}" y="30" width="140" height="6" rx="3" fill="${P.accent}"/><rect x="${x - 76}" y="26" width="152" height="14" rx="7" fill="${P.accent}" opacity="${lit ? 0.36 : 0.2}"/></g>`;
  },
  back(M, P, fam, idP) {
    const tpl = M.loc.template, k = M.kind, part = Math.min(2, Math.max(0, M.part)), wall = k === 'herberg' ? P.wall : Hex.mix(P.wall, TEMPLATE_COLOR[tpl] || P.wall, 0.26);
    let g = '';
    if (k !== 'outside') {
      // wall with subtle vertical gradient + wainscoting + architectural molding
      g += `<rect width="960" height="406" fill="url(#${idP}_wall)"/>`;
      if (fam === 'oud') {
        for (let y = 52; y < 292; y += 34) { g += `<line x1="0" y1="${y}" x2="960" y2="${y}" stroke="${P.ink}" stroke-width="1" opacity=".1"/>`;
          for (let x = (y % 68 ? 0 : 40); x < 960; x += 80) g += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 34}" stroke="${P.ink}" stroke-width="1" opacity=".08"/>`; }
      }
      if (fam === 'klassiek') for (let x = 24; x < 960; x += 48) g += `<rect x="${x}" y="26" width="16" height="268" fill="#000" opacity=".05"/>`;
      if (fam === 'modern') for (let x = 40; x < 960; x += 120) g += `<line x1="${x}" y1="26" x2="${x}" y2="294" stroke="${P.ink}" stroke-width="1" opacity=".08"/>`;
      if (fam === 'toekomst') {
        for (let x = 0; x < 960; x += 120) g += `<rect x="${x}" y="26" width="2" height="378" fill="${P.accent}" opacity=".16"/>`;
        g += `<line x1="0" y1="68" x2="960" y2="68" stroke="${P.accent}" stroke-width="1" opacity=".18"/>`;
      }
      // wainscoting dado + recessed panels
      g += `<rect y="296" width="960" height="108" fill="${Hex.mix(P.wood2, wall, 0.22)}"/><rect y="290" width="960" height="8" fill="${P.trim}" opacity=".75"/>`;
      for (let x = 18; x < 940; x += 116) g += `<rect x="${x}" y="308" width="96" height="78" rx="2" fill="none" stroke="${P.ink}" stroke-width="1.4" opacity=".16"/>`;
      // baseboard shadow + perspective floor
      g += `<rect y="400" width="960" height="140" fill="url(#${idP}_floor)"/><rect y="398" width="960" height="6" fill="${P.ink}" opacity=".28"/>`;
      for (let y = 426; y < 540; y += 28) g += `<line x1="0" y1="${y}" x2="960" y2="${y}" stroke="#000" stroke-width="1.4" opacity=".13"/>`;
      for (let i = -5; i <= 5; i++) g += `<line x1="${480 + i * 78}" y1="400" x2="${480 + i * 142}" y2="540" stroke="#000" stroke-width="1.2" opacity=".11"/>`;
      // ceiling cornice & beams
      g += `<rect width="960" height="26" fill="${P.wood}"/><rect y="26" width="960" height="5" fill="#000" opacity=".18"/>`;
      if (fam !== 'toekomst') [150, 470, 790].forEach((x) => { g += `<rect x="${x}" y="26" width="18" height="18" fill="${P.wood}"/><rect x="${x - 3}" y="42" width="24" height="5" fill="${P.wood2}"/>`; });
      // template-specific interior set dressing (non-hotspot architectural depth)
      if (k === 'herberg') {
        g += `<rect x="768" y="26" width="180" height="176" fill="${Hex.mix(P.stone, wall, 0.35)}" opacity=".65"/>`; // chimney breast above hearth
        g += `<rect x="40" y="150" width="360" height="9" fill="${P.wood2}"/><rect x="40" y="214" width="360" height="9" fill="${P.wood2}"/>`;
        for (let i = 0; i < 9; i++) { const x = 52 + i * 38, tall = i % 3 !== 1;
          g += tall ? `<rect x="${x}" y="112" width="13" height="38" rx="3" fill="${['#3f5e3a', '#6b2d2a', '#4b3a24'][i % 3]}"/><rect x="${x + 4}" y="102" width="5" height="12" fill="${['#3f5e3a', '#6b2d2a', '#4b3a24'][i % 3]}"/>`
            : `<rect x="${x - 2}" y="128" width="18" height="22" rx="3" fill="${P.trim}"/>`;
          g += `<rect x="${x + 2}" y="${190}" width="16" height="24" rx="3" fill="${i % 2 ? P.trim : '#8a6a44'}"/>`; }
        g += `<ellipse cx="438" cy="396" rx="26" ry="36" fill="${P.wood2}" stroke="${P.ink}" stroke-width="1.2" stroke-opacity=".35"/><rect x="412" y="380" width="52" height="5" fill="${P.ink}" opacity=".55"/><rect x="412" y="406" width="52" height="5" fill="${P.ink}" opacity=".55"/>`;
        g += `<rect x="462" y="88" width="104" height="72" rx="2" fill="${P.trim}" stroke="${P.wood}" stroke-width="5" opacity=".78"/><path d="M474 134 Q504 108 552 128" fill="none" stroke="${P.ink}" stroke-width="1.4" opacity=".4"/>`;
      } else if (tpl === 'kantoor' || tpl === 'archief') {
        // wall clock whose hands match the time of day + framed plan/niches
        const ang = [[-60, 0], [60, 0], [-120, 0]][part];
        g += `<g transform="translate(820 112)"><circle r="28" fill="${P.trim}" stroke="${P.wood}" stroke-width="5"/><circle r="22" fill="#f5ecd9" opacity=".92"/><line x1="0" y1="0" x2="${(Math.cos((ang[0] - 90) * Math.PI / 180) * 12).toFixed(1)}" y2="${(Math.sin((ang[0] - 90) * Math.PI / 180) * 12).toFixed(1)}" stroke="${P.ink}" stroke-width="2.2" stroke-linecap="round"/><line x1="0" y1="0" x2="0" y2="-16" stroke="${P.ink}" stroke-width="1.5" stroke-linecap="round"/><circle r="2.2" fill="${P.ink}"/></g>`;
        if (tpl === 'archief') {
          g += `<path d="M580 288 L580 120 A60 44 0 0 1 700 120 L700 288 Z" fill="${P.wood}" opacity=".26"/>`;
          for (let y = 146; y < 276; y += 34) g += `<line x1="588" y1="${y}" x2="692" y2="${y}" stroke="${P.wood}" stroke-width="4" opacity=".45"/>`;
        } else {
          g += `<rect x="116" y="76" width="136" height="92" rx="2" fill="#efe6d1" stroke="${P.wood}" stroke-width="5" opacity=".82"/><path d="M132 104 L236 104 M132 124 L218 124 M132 144 L228 144" stroke="${P.ink}" stroke-width="1.5" opacity=".32"/>`;
        }
      } else if (tpl === 'huis') {
        g += `<rect x="136" y="78" width="96" height="112" rx="2" fill="${Hex.mix(P.trim, wall, 0.3)}" stroke="${P.wood}" stroke-width="6" opacity=".84"/><path d="M148 164 Q184 128 220 158" fill="none" stroke="${P.ink}" stroke-width="1.6" opacity=".35"/>`;
        g += `<polygon points="220,432 740,432 796,512 164,512" fill="${P.accent}" opacity=".22"/><polygon points="242,442 718,442 764,502 196,502" fill="none" stroke="${P.trim}" stroke-width="2" opacity=".35"/>`;
      } else if (tpl === 'werkplaats') {
        g += `<rect x="610" y="92" width="140" height="92" rx="3" fill="${P.wood}" opacity=".35"/>`;
        for (let i = 0; i < 5; i++) g += `<rect x="${626 + i * 24}" y="108" width="6" height="52" rx="2" fill="${P.ink}" opacity=".32"/>`;
        g += `<path d="M0 110 L140 26 M960 110 L820 26" stroke="${P.wood}" stroke-width="10" opacity=".45"/>`;
      }
      // windows & ceiling lamps
      if (k === 'herberg') g += this.window(fam, part, 600, 96, 120, 150, P, idP) + this.lamp(fam, 300, P, part) + this.lamp(fam, 690, P, part);
      else g += this.window(fam, part, 396, 82, 120, 140, P, idP) + this.lamp(fam, 640, P, part);
      // angled daylight sunbeams (morning warm low shaft, midday crisp cone)
      if (part < 2) {
        const wx = k === 'herberg' ? 600 : 396, wy = k === 'herberg' ? 96 : 82, dx = part === 0 ? -170 : -65;
        g += `<polygon points="${wx},${wy} ${wx + 120},${wy} ${wx + 120 + dx},495 ${wx + dx},495" fill="url(#${idP}_sun)" pointer-events="none"/>`;
      }
      return g;
    }
    // outside: atmospheric sky, two-layer skyline by era family, textured ground & template details
    g += this.sky(part, fam, 0, 0, 960, 330, idP);
    const sk = RNG.make('skyline|' + M.loc.id + '|' + M.loc.name);
    // distant hazy background layer (spires, domes, towers) for depth
    const farCol = Hex.mix(P.stone, fam === 'toekomst' ? '#18374a' : ['#dce4e0', '#b4d0dc', '#182438'][part], 0.58);
    let fx = -20;
    while (fx < 960) {
      const fw = 64 + sk.int(66), fh = 125 + sk.int(95), fy = 330 - fh;
      if (fam === 'oud' && sk.int(3) === 0) g += `<path d="M${fx} 330 L${fx} ${fy + 30} L${fx + fw / 2} ${fy - 44} L${fx + fw} ${fy + 30} L${fx + fw} 330 Z" fill="${farCol}" opacity=".75"/>`;
      else if (fam === 'toekomst') g += `<rect x="${fx + 6}" y="${fy - 36}" width="${fw - 12}" height="${fh + 36}" rx="4" fill="${farCol}" opacity=".7"/>`;
      else g += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${farCol}" opacity=".68"/>`;
      fx += fw + 10;
    }
    // mid-ground era facades
    let x = -10;
    while (x < 960) { const w = 70 + sk.int(70), hgt = 90 + sk.int(108), y = 330 - hgt, c = Hex.mix(P.stone, fam === 'toekomst' ? '#17293c' : ['#d7e6e4', '#9cc6d6', '#24324a'][part], 0.34);
      if (fam === 'oud') {
        g += `<path d="M${x} 330 L${x} ${y} L${x + w * 0.25} ${y} L${x + w * 0.25} ${y - 16} L${x + w * 0.5} ${y - 34} L${x + w * 0.75} ${y - 16} L${x + w * 0.75} ${y} L${x + w} ${y} L${x + w} 330 Z" fill="${c}" stroke="${P.ink}" stroke-width="1" stroke-opacity=".18"/>`;
      } else if (fam === 'klassiek') {
        g += `<path d="M${x} 330 L${x} ${y} L${x + 12} ${y - 24} L${x + w - 12} ${y - 24} L${x + w} ${y} L${x + w} 330 Z" fill="${c}" stroke="${P.ink}" stroke-width="1" stroke-opacity=".18"/>`;
        g += `<rect x="${x + w * 0.7}" y="${y - 38}" width="10" height="16" fill="${c}"/>`;
      } else if (fam === 'modern') {
        g += `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="${c}" stroke="${P.ink}" stroke-width="1" stroke-opacity=".16"/><rect x="${x + 8}" y="${y - 10}" width="${w - 16}" height="10" fill="${Hex.mix(c, '#000', 0.12)}"/>`;
      } else {
        g += `<rect x="${x + 10}" y="${y - 54}" width="${w - 20}" height="${hgt + 54}" rx="6" fill="${c}" stroke="${P.accent}" stroke-width="1" stroke-opacity=".28"/>`;
        if (x > 60 && sk.int(2) === 0) g += `<line x1="${x - 14}" y1="${y + 20}" x2="${x + 12}" y2="${y + 20}" stroke="${P.accent}" stroke-width="3" opacity=".32"/>`;
      }
      for (let wy = y + 14; wy < 316; wy += 26) for (let wx = x + 12; wx < x + w - 16; wx += 22) {
        const lit = part >= 2 && ((wx + wy) % 3 !== 0);
        g += `<rect x="${wx}" y="${wy}" width="9" height="12" fill="${lit ? (fam === 'toekomst' ? P.accent : '#f6dc8b') : '#000'}" opacity="${lit ? 0.78 : 0.12}"/>`;
      }
      x += w + 6; }
    // ground plane with subtle depth gradient
    const ground = tpl === 'park' ? '#7b9b59' : tpl === 'haven' ? Hex.mix(P.stone, '#000', 0.1) : Hex.mix(P.stone, '#fff', 0.14);
    g += `<rect y="330" width="960" height="210" fill="${ground}"/><rect y="330" width="960" height="14" fill="#000" opacity=".14"/>`;
    if (tpl === 'haven') {
      const wCol = part >= 2 ? '#29495c' : part === 0 ? '#5d8fa0' : '#4f889c';
      g += `<rect y="336" width="960" height="76" fill="${wCol}"/>`;
      g += `<path d="M0 358 q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#dceef2" stroke-width="1.8" opacity=".48"/>`;
      g += `<path d="M16 382 q24 -4 48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0" fill="none" stroke="#dceef2" stroke-width="1.4" opacity=".32"/>`;
      g += `<path d="M640 352 L764 352 L742 374 L662 374 Z" fill="${P.wood}" stroke="${P.ink}" stroke-width="1.2" stroke-opacity=".4"/><path d="M702 352 L702 292 L736 346 Z" fill="${P.trim}" opacity=".9"/>`;
      if (part >= 2) g += `<ellipse cx="702" cy="388" rx="34" ry="8" fill="#ffd978" opacity=".26"/><ellipse cx="220" cy="378" rx="42" ry="7" fill="${fam === 'toekomst' ? P.accent : '#ffd978'}" opacity=".22"/>`;
      g += `<rect y="408" width="960" height="10" fill="${P.wood}"/>`;
      [88, 290, 510, 790].forEach((px) => { g += `<rect x="${px}" y="396" width="12" height="24" rx="2" fill="${P.wood2}" stroke="${P.ink}" stroke-width="1" stroke-opacity=".4"/>`; });
    }
    if (tpl === 'park') {
      g += `<polygon points="360,330 600,330 760,540 200,540" fill="#d5c69c" opacity=".42"/>`;
      for (let i = 0; i < 6; i++) g += `<circle cx="${80 + i * 170}" cy="${300 - (i % 2) * 20}" r="${44 + (i % 3) * 8}" fill="#4a753a"/><circle cx="${96 + i * 170}" cy="${292 - (i % 2) * 20}" r="${28 + (i % 2) * 6}" fill="#5c8a48" opacity=".6"/>`;
      g += `<path d="M0 334 L960 334" stroke="${P.ink}" stroke-width="2" opacity=".35"/>`;
      for (let rx = 20; rx < 960; rx += 26) g += `<line x1="${rx}" y1="318" x2="${rx}" y2="334" stroke="${P.ink}" stroke-width="1.4" opacity=".3"/>`;
    }
    if (tpl === 'markt') {
      g += `<path d="M0 118 Q240 168 480 118 Q720 168 960 118" fill="none" stroke="${P.ink}" stroke-width="2"/>`;
      for (let i = 0; i < 16; i++) g += `<path d="M${30 + i * 60} ${124 + Math.sin(i) * 8} l12 26 l12 -26 Z" fill="${['#b9442f', '#e0b34a', '#2f6f8f'][i % 3]}"/>`;
    }
    if (tpl === 'poort') {
      g += `<path d="M320 330 L320 144 L640 144 L640 330 L562 330 L562 240 A82 82 0 0 0 398 240 L398 330 Z" fill="${Hex.mix(P.stone, '#000', 0.14)}" stroke="${P.ink}" stroke-width="1.4" stroke-opacity=".35"/>`;
      for (let bx = 326; bx < 630; bx += 38) g += `<rect x="${bx}" y="130" width="22" height="16" fill="${Hex.mix(P.stone, '#000', 0.18)}"/>`;
      for (let gx = 418; gx <= 542; gx += 24) g += `<line x1="${gx}" y1="162" x2="${gx}" y2="218" stroke="${P.ink}" stroke-width="3" opacity=".5"/>`;
    }
    if (tpl !== 'park' && tpl !== 'haven') {
      for (let y = 358; y < 540; y += 26) g += `<line x1="0" y1="${y}" x2="960" y2="${y}" stroke="#000" stroke-width="1.4" opacity=".1"/>`;
      for (let i = -4; i <= 4; i++) g += `<line x1="${480 + i * 95}" y1="330" x2="${480 + i * 165}" y2="540" stroke="#000" stroke-width="1.2" opacity=".08"/>`;
    }
    // subtle outdoor street lamps in the background (glow in evening)
    [156, 804].forEach((lx) => {
      g += `<g pointer-events="none"><rect x="${lx - 2.5}" y="256" width="5" height="78" fill="${P.ink}" opacity=".68"/><rect x="${lx - 8}" y="242" width="16" height="16" rx="2" fill="${part >= 2 ? (fam === 'toekomst' ? P.accent : '#ffe082') : '#d7dde0'}" stroke="${P.ink}" stroke-width="1.4" opacity=".88"/></g>`;
    });
    return g;
  },
  drawProp(kind, b, P, fam) {
    const x = b.x, y = b.y, w = b.w, h = b.h, W = P.wood, W2 = P.wood2, S = P.stone, T = P.trim, ink = P.ink;
    const sh = kind === 'ledger' && h < 50 ? '' : `<ellipse cx="${x + w / 2}" cy="${y + h - 2}" rx="${(w * 0.48).toFixed(1)}" ry="7" fill="#0d131a" opacity=".2"/>`;
    const ol = `stroke="${ink}" stroke-width="1.2" stroke-opacity=".34"`;
    let body = '';
    switch (kind) {
      case 'counter': body = `<rect x="${x - 10}" y="${y}" width="${w + 20}" height="16" fill="${W2}" ${ol}/><rect x="${x}" y="${y + 16}" width="${w}" height="${h - 16}" fill="${W}" ${ol}/>` +
        [0, 1, 2, 3].map((i) => `<rect x="${x + 14 + i * w / 4}" y="${y + 34}" width="${w / 4 - 28}" height="${h - 64}" fill="none" stroke="${W2}" stroke-width="4"/>`).join('') +
        [0, 1, 2].map((i) => `<rect x="${x + 110 + i * 34}" y="${y - 30}" width="8" height="30" rx="3" fill="${T}"/><circle cx="${x + 114 + i * 34}" cy="${y - 32}" r="6" fill="${P.accent}"/>`).join(''); break;
      case 'table': body = `<rect x="${x}" y="${y}" width="${w}" height="16" rx="3" fill="${W2}" ${ol}/><rect x="${x + 14}" y="${y + 16}" width="12" height="${h - 16}" fill="${W}"/><rect x="${x + w - 26}" y="${y + 16}" width="12" height="${h - 16}" fill="${W}"/>` +
        `<rect x="${x + 70}" y="${y - 34}" width="14" height="34" rx="4" fill="#6b2d2a"/><rect x="${x + 74}" y="${y - 46}" width="6" height="14" fill="#6b2d2a"/><path d="M${x + 110} ${y - 20} l14 0 l-3 12 l-8 0 Z M${x + 132} ${y - 20} l14 0 l-3 12 l-8 0 Z" fill="#f2e6c6"/><rect x="${x + 116}" y="${y - 8}" width="2" height="8" fill="#f2e6c6"/><rect x="${x + 138}" y="${y - 8}" width="2" height="8" fill="#f2e6c6"/>`; break;
      case 'hearth': body = `<rect x="${x - 10}" y="${y}" width="${w + 20}" height="18" fill="${W2}" ${ol}/><rect x="${x}" y="${y + 18}" width="${w}" height="${h - 18}" fill="${S}" ${ol}/>` +
        `<path d="M${x + 26} ${y + h} L${x + 26} ${y + h * 0.42} Q${x + w / 2} ${y + h * 0.22} ${x + w - 26} ${y + h * 0.42} L${x + w - 26} ${y + h} Z" fill="#1d1712"/>` +
        (fam === 'toekomst' ? `<rect x="${x + 36}" y="${y + h * 0.55}" width="${w - 72}" height="10" rx="5" fill="${P.accent}"/><rect x="${x + 36}" y="${y + h * 0.7}" width="${w - 72}" height="10" rx="5" fill="${P.accent}" opacity=".6"/>`
          : `<path d="M${x + w / 2 - 30} ${y + h - 6} q10 -50 22 -30 q6 -34 18 -6 q12 -26 14 4 q10 -18 6 32 Z" fill="#e8892c"/><path d="M${x + w / 2 - 14} ${y + h - 6} q6 -28 14 -16 q8 -16 12 16 Z" fill="#f7d36b"/>`); break;
      case 'door': body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${W}" ${ol}/>` + [1, 2, 3].map((i) => `<rect x="${x + i * w / 4 - 1}" y="${y + 6}" width="2" height="${h - 12}" fill="#000" opacity=".25"/>`).join('') +
        `<rect x="${x + 8}" y="${y + h * 0.3}" width="${w - 16}" height="7" fill="${ink}" opacity=".5"/><rect x="${x + 8}" y="${y + h * 0.7}" width="${w - 16}" height="7" fill="${ink}" opacity=".5"/><circle cx="${x + w - 16}" cy="${y + h / 2}" r="5" fill="${T}"/>`; break;
      case 'ledger': body = `<rect x="${x + w * 0.15}" y="${y + h * 0.35}" width="${w * 0.7}" height="${h * 0.3}" rx="2" fill="#efe3c1" stroke="${ink}" stroke-width="2"/><path d="M${x + w / 2} ${y + h * 0.35} L${x + w / 2} ${y + h * 0.65}" stroke="${ink}" stroke-width="2"/>` +
        (h > 60 ? `<rect x="${x + w * 0.1}" y="${y + h * 0.65}" width="${w * 0.8}" height="10" fill="${W2}"/><rect x="${x + w * 0.45}" y="${y + h * 0.65 + 10}" width="${w * 0.1}" height="${h * 0.35 - 10}" fill="${W}"/>` : ''); break;
      case 'desk': body = `<rect x="${x}" y="${y + h * 0.45}" width="${w}" height="14" fill="${W2}" ${ol}/><rect x="${x + 8}" y="${y + h * 0.45 + 14}" width="${w * 0.36}" height="${h * 0.55 - 14}" fill="${W}" ${ol}/>` +
        [0, 1, 2].map((i) => `<rect x="${x + 16}" y="${y + h * 0.45 + 22 + i * (h * 0.55 - 20) / 3}" width="${w * 0.36 - 16}" height="4" fill="#000" opacity=".25"/>`).join('') +
        `<rect x="${x + w - 18}" y="${y + h * 0.45 + 14}" width="10" height="${h * 0.55 - 14}" fill="${W}"/><rect x="${x + w * 0.55}" y="${y + h * 0.45 - 10}" width="${w * 0.25}" height="10" fill="#efe3c1" stroke="${ink}" stroke-width="1.5"/>` +
        (fam === 'modern' || fam === 'toekomst' ? `<rect x="${x + w * 0.12}" y="${y + h * 0.45 - 40}" width="44" height="34" rx="3" fill="${fam === 'toekomst' ? P.accent : '#d9d2c0'}" stroke="${ink}" stroke-width="2"/>` : `<rect x="${x + w * 0.16}" y="${y + h * 0.45 - 24}" width="12" height="24" fill="${T}"/>`); break;
      case 'cabinet': case 'rack': body = `<rect x="${x + w * 0.1}" y="${y}" width="${w * 0.8}" height="${h}" fill="${W}" ${ol}/>` +
        [1, 2, 3].map((i) => `<rect x="${x + w * 0.1}" y="${y + i * h / 4 - 3}" width="${w * 0.8}" height="6" fill="${W2}"/>`).join('') +
        (kind === 'rack' ? [0, 1, 2, 3].map((i) => `<path d="M${x + w * 0.2 + i * w * 0.17} ${y + 12} l0 ${h / 4 - 18}" stroke="${S}" stroke-width="5"/>`).join('')
          : [0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((i) => `<rect x="${x + w * 0.16 + i * w * 0.13}" y="${y + r * h / 4 + 10}" width="${w * 0.09}" height="${h / 4 - 16}" fill="${['#8a3b2e', '#3f5e3a', '#5b4a7a', '#a3763a', '#2f5f80'][(i + r) % 5]}"/>`).join('')).join('')); break;
      case 'stand': body = `<rect x="${x + w * 0.3}" y="${y + h * 0.5}" width="${w * 0.4}" height="${h * 0.5}" fill="${W}" ${ol}/><rect x="${x + w * 0.27}" y="${y + h * 0.5 - 8}" width="${w * 0.46}" height="10" fill="${W2}"/><rect x="${x + w * 0.36}" y="${y + h * 0.62}" width="${w * 0.28}" height="5" fill="#000" opacity=".25"/><rect x="${x + w * 0.42}" y="${y + h * 0.5 - 40}" width="14" height="32" fill="${T}"/><path d="M${x + w * 0.42 - 8} ${y + h * 0.5 - 40} l15 -18 l15 18 Z" fill="#f4d98a"/>`; break;
      case 'crate': body = `<rect x="${x + w * 0.15}" y="${y + h * 0.35}" width="${w * 0.7}" height="${h * 0.65}" fill="${W2}" stroke="${W}" stroke-width="5"/><path d="M${x + w * 0.15} ${y + h * 0.35} L${x + w * 0.85} ${y + h}" stroke="${W}" stroke-width="5"/>`; break;
      case 'stall': body = `<rect x="${x}" y="${y + h * 0.5}" width="${w}" height="${h * 0.5}" fill="${W2}" ${ol}/><path d="M${x - 8} ${y + h * 0.3} L${x + w + 8} ${y + h * 0.3} L${x + w} ${y} L${x} ${y} Z" fill="${P.accent}" ${ol}/>` +
        [0, 1, 2, 3].map((i) => `<rect x="${x + i * w / 4}" y="${y}" width="${w / 8}" height="${h * 0.3}" fill="#f2ead4" opacity=".7"/>`).join('') + `<rect x="${x + 4}" y="${y + h * 0.3}" width="6" height="${h * 0.2}" fill="${W}"/><rect x="${x + w - 10}" y="${y + h * 0.3}" width="6" height="${h * 0.2}" fill="${W}"/>`; break;
      case 'pump': body = `<rect x="${x + w / 2 - 12}" y="${y + 20}" width="24" height="${h - 20}" fill="${S}" ${ol}/><rect x="${x + w / 2 - 18}" y="${y + 10}" width="36" height="14" rx="6" fill="${ink}" opacity=".75"/><path d="M${x + w / 2 + 12} ${y + 60} l26 0 l0 10" stroke="${S}" stroke-width="8" fill="none"/><path d="M${x + w / 2 - 12} ${y + 40} l-30 -20" stroke="${ink}" stroke-width="5"/>`; break;
      case 'board': body = `<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h * 0.55}" fill="${W2}" stroke="${W}" stroke-width="6"/>` + [0, 1, 2].map((i) => `<rect x="${x + 22 + i * (w - 44) / 3}" y="${y + 22 + (i % 2) * 10}" width="${(w - 60) / 3}" height="${h * 0.3}" fill="#f2ead4" transform="rotate(${i - 1} ${x + w / 2} ${y + h / 3})"/>`).join('') +
        `<rect x="${x + 22}" y="${y + 10 + h * 0.55}" width="8" height="${h * 0.45 - 10}" fill="${W}"/><rect x="${x + w - 30}" y="${y + 10 + h * 0.55}" width="8" height="${h * 0.45 - 10}" fill="${W}"/>`; break;
      case 'bench': body = `<rect x="${x}" y="${y + h * 0.45}" width="${w}" height="12" fill="${W2}" ${ol}/><rect x="${x}" y="${y + h * 0.2}" width="${w}" height="10" fill="${W2}" ${ol}/><rect x="${x + 10}" y="${y + h * 0.2}" width="8" height="${h * 0.8}" fill="${W}"/><rect x="${x + w - 18}" y="${y + h * 0.2}" width="8" height="${h * 0.8}" fill="${W}"/>`; break;
      case 'tree': body = `<rect x="${x + w / 2 - 12}" y="${y + h * 0.4}" width="24" height="${h * 0.6}" fill="${W}"/><circle cx="${x + w / 2}" cy="${y + h * 0.3}" r="${w * 0.38}" fill="#4f7a3e"/><circle cx="${x + w / 2 - w * 0.22}" cy="${y + h * 0.42}" r="${w * 0.22}" fill="#5c8a47"/>`; break;
      case 'steps': body = [0, 1, 2, 3].map((i) => `<rect x="${x + i * 10}" y="${y + h - (i + 1) * h / 4}" width="${w - i * 20}" height="${h / 4}" fill="${Hex.mix(S, '#fff', i * 0.08)}" stroke="${ink}" stroke-width="1.5" stroke-opacity=".4"/>`).join(''); break;
      case 'scale': body = `<rect x="${x + w / 2 - 4}" y="${y + 20}" width="8" height="${h - 20}" fill="${ink}"/><path d="M${x + 20} ${y + 30} L${x + w - 20} ${y + 30}" stroke="${ink}" stroke-width="4"/><path d="M${x + 6} ${y + 60} L${x + 20} ${y + 30} L${x + 34} ${y + 60} Z M${x + w - 34} ${y + 60} L${x + w - 20} ${y + 30} L${x + w - 6} ${y + 60} Z" fill="${T}" ${ol}/>`; break;
      case 'bollard': body = `<rect x="${x + w / 2 - 16}" y="${y + h * 0.3}" width="32" height="${h * 0.7}" rx="6" fill="${ink}" opacity=".85"/><rect x="${x + w / 2 - 22}" y="${y + h * 0.3}" width="44" height="12" rx="5" fill="${ink}"/><path d="M${x + w / 2} ${y + h * 0.4} q-60 10 -80 50" stroke="${T}" stroke-width="4" fill="none"/>`; break;
      case 'nets': body = `<path d="M${x} ${y + h} Q${x + w / 2} ${y} ${x + w} ${y + h} Z" fill="#7a6a4a" ${ol}/>` + [1, 2, 3, 4].map((i) => `<path d="M${x + i * w / 5} ${y + h} Q${x + w / 2} ${y + h * 0.2} ${x + w - i * w / 5} ${y + h}" stroke="#c9b98a" stroke-width="1.5" fill="none"/>`).join(''); break;
      case 'hut': body = `<rect x="${x + 10}" y="${y + h * 0.3}" width="${w - 20}" height="${h * 0.7}" fill="${W2}" ${ol}/><path d="M${x} ${y + h * 0.32} L${x + w / 2} ${y} L${x + w} ${y + h * 0.32} Z" fill="${W}" ${ol}/><rect x="${x + w * 0.3}" y="${y + h * 0.45}" width="${w * 0.4}" height="${h * 0.25}" fill="${part2(fam)}"/>`; break;
      case 'lamp': body = `<rect x="${x + w / 2 - 4}" y="${y}" width="8" height="${h}" fill="${ink}"/><path d="M${x + w / 2 - 16} ${y + 6} L${x + w / 2 + 16} ${y + 6} L${x + w / 2 + 10} ${y + 30} L${x + w / 2 - 10} ${y + 30} Z" fill="#f4d98a" stroke="${ink}" stroke-width="3"/>`; break;
      case 'shop': body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${W}" ${ol}/><rect x="${x + 12}" y="${y + 30}" width="${w - 24}" height="${h - 44}" fill="#cfe0e3"/><rect x="${x}" y="${y}" width="${w}" height="22" fill="${P.accent}"/>`; break;
      case 'hedge': body = `<rect x="${x}" y="${y + h * 0.3}" width="${w}" height="${h * 0.7}" rx="20" fill="#4f7a3e" ${ol}/><path d="M${x} ${y + h} L${x + w} ${y + h * 0.75}" stroke="#d8c79c" stroke-width="16" opacity=".7"/>`; break;
      default: body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${W2}" ${ol}/>`;
    }
    return sh + body;
  },
  label(hs, s, M) { return hs.kind === 'obj' ? Rnd.cap(hs.ref.name) : People.label(s, hs.ref, M ? M.hs.filter((x) => x.kind !== 'obj').map((x) => x.ref) : []); },
  svg(s, locId, part, fam, selId) {
    const M = this.model(s, locId, part), P = FAMILY[fam].pal, front = new Set(['table']), lab = (x) => U.esc(this.label(x, s, M));
    const p = Math.min(2, Math.max(0, part)), idP = 'tb_' + String(M.loc.id).replace(/[^a-zA-Z0-9]/g, '') + '_' + p;
    let h = `<svg class="tab" data-fam="${fam}" data-part="${p}" viewBox="0 0 960 540" role="group" aria-label="${U.esc(M.loc.name)}">` + this.defs(M, P, fam, idP);
    h += this.back(M, P, fam, idP);
    const objG = (o) => `<g class="hs obj${selId === o.id ? ' on' : ''}" data-hs="${o.id}" tabindex="0" role="button" aria-label="${lab(o)}">${this.drawProp(o.prop, o.box, P, fam)}<rect class="ring" x="${o.box.x - 4}" y="${o.box.y - 4}" width="${o.box.w + 8}" height="${o.box.h + 8}" rx="8"/></g>`;
    const figG = (o) => {
      const metCore = o.kind === 'npc' && s.play.met[o.ref.id];
      const fTone = metCore ? Rels.toneOf(s, o.ref.id) : 'neutral';
      const fStance = metCore ? TONE_STANCE[fTone] : 0;
      return `<g class="hs${selId === o.id ? ' on' : ''}" data-hs="${o.id}" tabindex="0" role="button" aria-label="${lab(o)}">` +
        `<ellipse cx="${o.x}" cy="${o.y + 1}" rx="${32 * o.k}" ry="${7 * o.k}" fill="#0c121a" opacity=".22" pointer-events="none"/>` +
        `<ellipse class="ring" cx="${o.x}" cy="${o.y}" rx="${46 * o.k}" ry="${11 * o.k}"/>` +
        `<g transform="translate(${(o.x - 50 * o.k).toFixed(1)} ${(o.y - 260 * o.k).toFixed(1)}) scale(${o.k})">${Silhouette.figure(o.ref, { s: s, fam: fam, mode: 'full', tone: fTone, stance: fStance })}</g>` +
        `<rect x="${o.x - 40 * o.k}" y="${o.y - 262 * o.k}" width="${80 * o.k}" height="${262 * o.k}" fill="transparent"/></g>`;
    };
    // herberg: crowd standing in the counter's span is drawn behind it (staff and regulars at the bar)
    const behind = (o) => M.kind === 'herberg' && o.back && o.x < 400, mid = new Set(M.kind === 'herberg' ? ['counter', 'ledger'] : []);
    M.hs.filter((o) => o.kind === 'obj' && !front.has(o.prop) && !mid.has(o.prop)).forEach((o) => { h += objG(o); });
    M.hs.filter(behind).forEach((o) => { h += figG(o); });
    M.hs.filter((o) => o.kind === 'obj' && mid.has(o.prop)).sort((a, b) => (a.prop === 'counter' ? 0 : 1) - (b.prop === 'counter' ? 0 : 1)).forEach((o) => { h += objG(o); });
    M.hs.filter((o) => o.kind !== 'obj' && o.back && !behind(o)).forEach((o) => { h += figG(o); });
    M.hs.filter((o) => o.kind !== 'obj' && !o.back).forEach((o) => { h += figG(o); });
    M.hs.filter((o) => o.kind === 'obj' && front.has(o.prop)).forEach((o) => { h += objG(o); });
    // time-of-day atmospheric light overlay
    if (part === 0) h += `<rect width="960" height="540" fill="${fam === 'toekomst' ? '#8be8df' : '#ffedc2'}" opacity=".11" pointer-events="none"/>`;
    if (part >= 2) {
      h += `<rect width="960" height="540" fill="#101828" opacity="${M.kind === 'outside' ? 0.36 : 0.28}" pointer-events="none"/>`;
      const lights = M.kind === 'herberg' ? [[300, 108, 220, 'glow'], [690, 108, 220, 'glow'], [858, 368, 210, 'hearth']]
        : M.kind === 'inside' ? [[640, 118, 240, 'glow']]
        : [[156, 250, 165, 'glow'], [804, 250, 165, 'glow']];
      lights.forEach((q) => { h += `<circle cx="${q[0]}" cy="${q[1]}" r="${q[2]}" fill="url(#${idP}_${q[3]})" style="mix-blend-mode:screen" pointer-events="none"/>`; });
    }
    if (!M.open) h += `<g pointer-events="none"><rect width="960" height="540" fill="#141c2e" opacity=".45"/><rect x="330" y="232" width="300" height="76" rx="6" fill="#fffaf0" stroke="#1f2933" stroke-width="3"/><text x="480" y="268" text-anchor="middle" font-size="24" font-weight="700" font-family="Georgia,serif" fill="#1f2933">Gesloten</text><text x="480" y="292" text-anchor="middle" font-size="14" fill="#1f2933">${part >= DAY.parts ? "'s nachts" : 'in de ' + PARTS[part]}</text></g>`;
    M.hs.forEach((o) => {
      const t = this.label(o, s, M), w = Math.min(380, 18 + t.length * 8), cx = o.kind === 'obj' ? o.box.x + o.box.w / 2 : o.x, top = o.kind === 'obj' ? o.box.y - 14 : o.y - 262 * o.k - 12;
      const x = Math.max(4, Math.min(956 - w, cx - w / 2)), y = Math.max(4, top - 28);
      h += `<g class="tag${selId === o.id ? ' pin' : ''}" data-for="${o.id}"><rect x="${x}" y="${y}" width="${w}" height="28" rx="4"/><text x="${x + w / 2}" y="${y + 19}" text-anchor="middle">${U.esc(t)}</text></g>`;
    });
    return h + '</svg>';
  }
};

/* ---------------- Interrogation: eigen verhoorscherm (v0.6.2, puur weergave) ----------------
   Regel 5: leest alleen publieke velden (npc.voice, npc.name, npc.role) en zichtbare spelstaat
   (relations, play.heard, play.found, log). Niets hangt af van truth.culpritId of private velden. */
const VOICE_PACE = {
  snel:        { ms: 14, pause: 140, label: 'snel en gehaast' },
  luid:        { ms: 18, pause: 180, label: 'luid en stellig' },
  kort:        { ms: 20, pause: 260, label: 'kort en droog' },
  droog:       { ms: 22, pause: 240, label: 'droog' },
  vraag:       { ms: 22, pause: 220, label: 'vragend' },
  bijnaam:     { ms: 22, pause: 200, label: 'los en familiair' },
  beleefd:     { ms: 26, pause: 260, label: 'zorgvuldig beleefd' },
  formeel:     { ms: 28, pause: 280, label: 'formeel en afgemeten' },
  spreekwoord: { ms: 26, pause: 300, label: 'bedachtzaam' },
  omweg:       { ms: 30, pause: 360, label: 'in omwegen' },
  fluister:    { ms: 34, pause: 380, label: 'bijna fluisterend' },
  zacht:       { ms: 38, pause: 460, label: 'zacht en aarzelend' }
};

const Interrogation = {
  pace(npc) {
    const st = VOICE_STYLE[npc && npc.voice] || 'beleefd';
    return VOICE_PACE[st] || { ms: 24, pause: 240, label: 'rustig' };
  },
  // Splitst een tekst deterministisch in spreekregels (op zinseinde of gedachtestreep/ellips)
  splitLines(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const parts = raw.match(/[^.!?…]+(?:[.!?…]+["']?|\s*$)/g) || [raw];
    return parts.map((x) => x.trim()).filter(Boolean);
  },
  html(s, fam, uiState) {
    const v = s.visit, npc = v && v.conv ? World.npc(s, v.conv) : null;
    if (!npc) return '';
    const r = s.relations[npc.id], tone = Rels.toneOf(s, npc.id), stance = TONE_STANCE[tone];
    const pace = this.pace(npc), F = FAMILY[fam], deltas = (uiState && uiState.deltas) || {};
    const approach = (uiState && uiState.approach) || 'reserved';
    const showEv = !!(uiState && uiState.showEvidence);

    // 1. Linkerkolom: groot silhouet in getint kader + houding + relatiebalken met delta-badges
    const dBadge = (k) => {
      const d = deltas[k];
      if (!d) return '';
      const sign = d > 0 ? '+' + d : String(d);
      const good = (k === 'trust' || k === 'affection') ? d > 0 : d < 0;
      return `<b class="iv-delta ${good ? 'pos' : 'neg'}">${sign}</b>`;
    };
    const bar = (key, lab, val, col) =>
      `<div class="iv-rrow"><span>${lab} ${dBadge(key)}</span><i role="progressbar" aria-label="${lab}" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="100" style="--v:${val}%;--c:${col}"></i><small class="rel-val">${val}</small></div>`;

    const pLbl = typeof Living !== 'undefined' ? Living.pressureLabel(s, npc.id) : '';
    const stanceShow = pLbl && stance < 1 ? 1 : stance;
    const left = `<aside class="iv-left" style="--tone:${TONE_COLOR[tone]};--phbg:${F.photo}">
      <div class="iv-frame" data-tone="${tone}" data-stance="${STANCE_LABEL[stanceShow]}">
        <div class="iv-badge">${U.esc(TONE_WORD[tone])} · houding: ${STANCE_LABEL[stanceShow]}${pLbl ? ' · ' + U.esc(pLbl) : ''}</div>
        <div class="iv-sil">${Silhouette.svg(npc, { s: s, fam: fam, mode: 'full', tone: tone, stance: stanceShow, w: 176 })}</div>
      </div>
      <div class="iv-meta">
        <h3>${U.esc(npc.name)}</h3>
        <p class="sp-note">${U.esc(npc.role)} · ${U.esc(pace.label)}</p>
        <div class="iv-rels">
          ${bar('trust', 'Vertrouwen', r.trust, '#3c7031')}
          ${bar('affection', 'Genegenheid', r.affection, '#b8821d')}
          ${bar('resentment', 'Wrok', r.resentment, '#b33a28')}
          ${bar('suspicion', 'Argwaan', r.suspicion, '#2b6785')}
        </div>
      </div>
    </aside>`;

    // 2. Rechterkolom boven: Transcriptpapier met sprekersstroken (inclusief jouw eigen vragen e.k === 'q')
    const entries = s.log.filter((e) => e.i > (v.convAt || 0));
    const strips = entries.map((e, idx) => {
      const isLast = idx === entries.length - 1;
      const lines = this.splitLines(e.text);
      const speaker = e.k === 'p' ? U.first(npc) : e.k === 'q' ? U.first(s.protagonist) : e.k === 's' ? 'Notitie' : 'Verhoor';
      const cls = e.k === 'p' ? 'npc ' + (e.tone || tone) : e.k === 'q' ? 'ask' : e.k === 's' ? 'sys' : 'narr';
      return `<div class="iv-strip ${cls}" data-last="${isLast ? '1' : '0'}">
        <span class="iv-spk">${U.esc(speaker)}</span>
        <div class="iv-lines">${lines.map((ln, li) => `<p class="iv-line" data-line="${li}">${Mentions.linkHtml(s, ln, { exclude: 'p:' + npc.id })}</p>`).join('')}</div>
      </div>`;
    }).join('');

    // 3. Rechterkolom onder: Aanpak, Vraagkaarten op tafel & Bewijskaarten uit het bord
    const topics = Dialogue.topics(s, npc), cons = Dialogue.confronts(s, npc);
    const hasHeardClaim = s.contradictions.some((c) => c.npcId === npc.id && s.play.heard[c.id] && !s.play.resolved[c.id]);
    const boardEvs = Evidence.found(s).filter((e) => e.route !== 'start' && !s.play.debunked[e.id]);

    const tCards = topics.map((t) => {
      const isLead = t.id.indexOf('ev:') === 0;
      const kind = t.id === 'verzoen' ? 'Herstel' : t.id === 'alibi' ? 'Alibi' : t.id === 'crime' ? 'De zaak' : t.id.indexOf('chk:') === 0 ? 'Controle' : t.id === 'xt' ? 'Teruggeven' : isLead ? 'Spoor' : 'Kennismaking';
      return `<button type="button" class="iv-qcard${isLead ? ' lead' : ''}${t.id === 'verzoen' ? ' calm' : ''}" data-ui="topic" data-v="${U.esc(t.id)}">
        <small>${kind}</small><b>${U.esc(t.label)}</b>
      </button>`;
    }).join('');

    // Bewijswaaier: speel een echte bewijskaart van het bord uit tegen de verklaring
    let evDeck = '';
    const autoTray = cons.length > 0 && Level.get(s).clash;   // v0.7.0: on Moeilijk you open the evidence map yourself
    if (showEv || autoTray) {
      const claimObj = s.contradictions.find((c) => c.npcId === npc.id && s.play.heard[c.id] && !s.play.resolved[c.id]);
      evDeck = `<div class="iv-evtray">
        <div class="iv-evhead">
          <b>Speel een bewijsstuk van het zaakbord uit${claimObj ? ' tegen: ' + U.esc(claimObj.claim) : ''}</b>
          ${showEv ? `<button type="button" class="sp-chip" data-ui="evtoggle">Sluit bewijsmap</button>` : ''}
        </div>
        <div class="iv-evcards">
          ${boardEvs.map((e) => `<button type="button" class="iv-evcard" data-ui="playev" data-v="${U.esc(e.id)}">
            <span class="pin"></span><small>${U.esc(Evidence.roleInfo(e).short)}</small>
            <b>${U.esc(e.title)}</b>
          </button>`).join('') || '<p class="sp-note">Je hebt nog geen bruikbare bewijsstukken op het bord.</p>'}
        </div>
      </div>`;
    }

    const treatC = Dialogue.treatCost(s, npc);
    const right = `<section class="iv-right">
      <div class="iv-paper" data-ui="skip-type">
        <div class="iv-phead"><span>Verhoortranscript · ${U.esc(World.here(s).name)}</span><button type="button" class="iv-skip-btn" data-ui="skip-type">Alles direct tonen</button></div>
        <div class="iv-log">${strips}</div>
      </div>
      <div class="iv-desk">
        <div class="iv-bar">
          <div class="sp-chips seg" role="group" aria-label="Toon van de vraag">
            <span class="sp-note iv-tone-lbl">Toon:</span>
            ${Object.keys(APPROACH).map((k) => `<button type="button" class="sp-chip${approach === k ? ' on' : ''}" aria-pressed="${approach === k}" data-ui="approach" data-v="${k}">${APPROACH[k].label}${Level.get(s).toneHint && Dialogue.best(npc) === k ? ' ★' : ''}</button>`).join('')}
          </div>
          <div class="iv-actions">
            ${Dialogue.canTreat(s, npc) ? `<button type="button" class="sp-chip" data-ui="treat" data-v="${npc.id}">Trakteer (${treatC} ${U.esc(s.meta.eraRules.currency || '')}${treatC < TREAT_COST ? ' · vriendenprijs' : ''})</button>` : ''}
            ${hasHeardClaim && !autoTray && !showEv ? `<button type="button" class="sp-chip" data-ui="evtoggle">Bewijsstuk voorleggen…</button>` : ''}
            <button type="button" class="sp-btn" data-ui="talkend">Verhoor afronden</button>
          </div>
        </div>
        ${evDeck}
        <div class="iv-qgrid">
          ${tCards || (!autoTray ? '<p class="sp-note">Je hebt alle vragen voor dit bezoek gesteld.</p>' : '')}
        </div>
      </div>
    </section>`;

    return `<div class="iv">${left}${right}</div>`;
  }
};

/* ---------------- FinalConfrontView (v0.19.0, Fase I): live 3-beat unmasking with signed Zaakverslag ---------------- */
const FinalConfrontView = {
  html(s, fam) {
    const fc = s && s.play && s.play.finalConfront;
    if (!fc) return '';
    const sus = World.npc(s, fc.suspectId), mot = Evidence.get(s, fc.motiveEvidenceId), met = Evidence.get(s, fc.methodEvidenceId);
    const loc = World.loc(s, fc.locId), F = FAMILY[fam];
    if (!sus || !mot || !met) return '';
    const tone = fc.outcome === 'surrender' ? 'cold' : fc.step >= 1 || fc.outcome === 'refuted' ? 'hostile' : 'neutral';
    const stance = fc.outcome === 'surrender' ? 0 : fc.step >= 1 ? 2 : 1;
    const badge = fc.outcome === 'surrender' ? 'Overgegeven · Zaak opgelost!' : fc.outcome === 'refuted' ? 'Weerlegd · Verslag wankelt' : fc.step === 0 ? 'Ontkent zelfverzekerd' : 'Zichtbaar onder druk';
    const beats = [
      { n: 1, title: 'Wie (Beschuldiging)', sub: sus.name, done: true },
      { n: 2, title: 'Waarom (Motief)', sub: mot.title, done: fc.step >= 1 },
      { n: 3, title: 'Hoe (Werkwijze / alibi)', sub: met.title, done: fc.step >= 2 }
    ];
    const logHtml = fc.log.map((entry) => {
      const spk = entry.who === 'you' ? U.first(s.protagonist) : entry.who === 'npc' ? sus.name : entry.who === 'hero' ? s.world.city.name : 'Confrontatie';
      const cls = entry.who === 'you' ? 'ask' : entry.who === 'npc' ? 'npc ' + tone : entry.who === 'hero' ? 'hero' : 'narr';
      return `<div class="iv-strip ${cls}"><span class="iv-spk">${U.esc(spk)}</span><div class="iv-lines"><p class="iv-line">${U.esc(entry.text)}</p></div></div>`;
    }).join('');

    let actionHtml = '';
    if (!fc.outcome && fc.step === 0) {
      actionHtml = `<button type="button" class="fc-go" data-ui="fc-step">Leg Waarom op tafel: ${U.esc(mot.title)}</button>` +
        `<button type="button" class="sp-btn" data-ui="fc-back">Breek af &amp; keer terug</button>`;
    } else if (!fc.outcome && fc.step === 1) {
      actionHtml = `<button type="button" class="fc-go" data-ui="fc-step">Leg Hoe op tafel (sluitstuk): ${U.esc(met.title)}</button>`;
    } else if (fc.outcome === 'surrender') {
      actionHtml = `<button type="button" class="fc-go hero" data-ui="fc-end">Lees het volledige eindverslag &amp; epiloog</button>`;
    } else {
      const hint = fc.failKind === 'person' ? 'Tip: de beschuldigde persoon klopt niet met alle sporen.' :
        fc.failKind === 'motive' ? 'Tip: het gekozen motief-bewijs (Waarom) houdt geen stand.' :
        fc.failKind === 'method' ? 'Tip: het gekozen werkwijze-/alibi-bewijs (Hoe) houdt geen stand.' :
        'Tip: controleer of je Waarom (motief) en Hoe (werkwijze/alibi) in het juiste vak hebt gezet.';
      actionHtml = `<p class="fc-fail-hint">${U.esc(hint)}</p><div class="fc-act-row">` +
        `<button type="button" class="fc-go" data-ui="fc-revise">Pas zaakverslag aan</button>` +
        `<button type="button" class="sp-btn" data-ui="fc-back">Terug naar het zaakbord</button></div>`;
    }

    return `<div class="iv fc-view${fc.outcome ? ' fc-' + fc.outcome : ''}">` +
      `<aside class="iv-left" style="--tone:${TONE_COLOR[tone]};--phbg:${F.photo}">` +
        `<div class="iv-frame" data-tone="${tone}"><div class="iv-badge">${U.esc(badge)}</div>` +
        `<div class="iv-sil">${Silhouette.svg(sus, { s: s, fam: fam, mode: 'full', tone: tone, stance: stance, w: 176 })}</div></div>` +
        `<div class="iv-meta"><h3>${U.esc(sus.name)}</h3><p class="sp-note">${U.esc(sus.role)} · ${U.esc(loc ? loc.name : s.world.city.name)}</p>` +
        `<ol class="fc-beats">${beats.map((b) => `<li class="${b.done ? 'done' : ''}"><b>${b.n}. ${U.esc(b.title)}</b><small>${U.esc(b.sub)}</small></li>`).join('')}</ol></div>` +
      `</aside>` +
      `<section class="iv-right">` +
        `<div class="iv-paper"><div class="iv-phead"><span>De Ontmaskering · ${U.esc(s.meta.title)}</span><span>Slag ${Math.min(fc.step + 1, 3)} van 3</span></div>` +
        `<div class="iv-log">${logHtml}</div></div>` +
        `<div class="iv-desk fc-desk">${actionHtml}</div>` +
      `</section></div>`;
  }
};

const part2 = (fam) => fam === 'toekomst' ? '#5fd3c7' : '#cfe0e3';

/* ---------------- Spoorboek (v0.17.0): interactive evening timeline (18:00-24:00) ----------------
   Driven 100% by real player-discovered state (asked alibis, found sightings/registers/denials/confessions/twists).
   NEVER reads s.truth.culpritId, s.truth.roles, unasked alibis, or unfound evidence.
   Legacy mock()/svg()/check() are preserved for regression tests. */
const SB_COLOR = ['#b9442f', '#2f6f8f', '#c48a1c', '#4f7f3a', '#7a4f9a', '#a35b2a', '#3b6b63', '#8c3b65'];
const Spoorboek = {
  X0: 220, X1: 1240, Y0: 70, ROW: 74,
  mx(min) { return this.X0 + (min / 360) * (this.X1 - this.X0); },
  mock(s, M) {
    const T = s.truth, npc = (id) => World.npc(s, id), cr = s.crime.crimeLocationId, other = T.otherLocationId, start = s.startLoc;
    const red = s.evidence.find((e) => e.key === 'red_alibi'), regLoc = red ? red.source.locationId : start;
    const huis = s.world.locations.find((l) => l.template === 'huis'), tt = (a, b) => MapGen.travel(M, a, b);
    const route = (legs) => { legs = legs.reduce((a, l) => { const q = a[a.length - 1]; if (q && q.loc === l.loc) q.to = Math.max(q.to, l.to); else a.push(l); return a; }, []);
      for (let i = 1; i < legs.length; i++) legs[i].from = Math.max(legs[i].from, legs[i - 1].to + tt(legs[i - 1].loc, legs[i].loc)); return legs.filter((l) => l.from < l.to).map((l) => Object.assign(l, { to: Math.min(360, l.to) })); };
    const W = npc(T.roles.witness), B = npc(T.roles.suspB), Cf = npc(T.roles.confidant), A = npc(T.roles.suspA), C = npc(T.culpritId);
    const rows = [
      { n: C, legs: route([{ loc: other, from: 90, to: 300 }]) },
      { n: W, legs: route(W.locationId === cr ? [{ loc: cr, from: 120, to: 360 }] : [{ loc: cr, from: 150, to: 205 }, { loc: W.locationId, from: 215, to: 360 }]) },
      { n: B, legs: route([{ loc: huis ? huis.id : B.locationId, from: 60, to: 330 }]) },
      { n: Cf, legs: route([{ loc: Cf.locationId, from: 0, to: 130 }, { loc: start, from: 150, to: 300 }]) },
      { n: A, legs: route([{ loc: A.locationId, from: 20, to: 240 }]) }
    ].filter((r, i, all) => r.n && all.findIndex((x) => x.n && x.n.id === r.n.id) === i).sort((a, b) => byName(a.n, b.n));
    rows.forEach((r, i) => { r.color = SB_COLOR[i % SB_COLOR.length]; r.legs.forEach((l, k) => { l.id = 'seg:' + r.n.id + ':' + k; }); });
    const dots = [{ id: 'dot1', who: C, loc: cr, t: 180, by: W.name }, { id: 'dot2', who: B, loc: regLoc, t: 180, by: 'het register' }];
    const pairs = [['seg:' + C.id + ':0', 'dot1'], ['seg:' + B.id + ':0', 'dot2']];
    const stations = s.world.locations.slice().sort((a, b) => (M.pos[a.id].y - M.pos[b.id].y) || (M.pos[a.id].x - M.pos[b.id].x));
    return { rows: rows, dots: dots, pairs: pairs, stations: stations };
  },
  clock: (min) => U.pad(18 + Math.floor(min / 60)) + ':' + U.pad(min % 60),
  svg(s, D, sel, showAll) {
    const rowY = {}, H = this.Y0 + D.stations.length * this.ROW + 30; D.stations.forEach((l, i) => { rowY[l.id] = this.Y0 + i * this.ROW + this.ROW / 2; });
    let h = `<svg viewBox="0 0 1270 ${H}" role="group" aria-label="Spoorboek van de avond">`;
    for (let m = 0; m <= 360; m += 30) { const x = this.mx(m); h += `<line class="grid" x1="${x}" y1="${this.Y0 - 10}" x2="${x}" y2="${H - 24}" stroke-width="${m % 60 ? 0.6 : 1.4}"/>`; if (m % 60 === 0) h += `<text class="hr" x="${x}" y="${this.Y0 - 18}" text-anchor="middle">${this.clock(m)}</text>`; }
    D.stations.forEach((l) => { const y = rowY[l.id]; h += `<line class="grid" x1="${this.X0}" y1="${y}" x2="${this.X1}" y2="${y}" stroke-width="1"/><text class="rowl" x="${this.X0 - 14}" y="${y + 5}" text-anchor="end">${U.esc(l.name)}</text>`; });
    const off = (i) => (i - (D.rows.length - 1) / 2) * 5;
    D.rows.forEach((r, i) => {
      const o = off(i);
      for (let k = 1; k < r.legs.length; k++) { const a = r.legs[k - 1], b = r.legs[k]; h += `<path d="M${this.mx(a.to)} ${rowY[a.loc] + o} L${this.mx(b.from)} ${rowY[b.loc] + o}" stroke="${r.color}" stroke-width="2.5" stroke-dasharray="6 4" fill="none"/>`; }
      r.legs.forEach((l, k) => { const y = rowY[l.loc] + o, x1 = this.mx(l.from), x2 = this.mx(l.to), on = sel.indexOf(l.id) >= 0;
        h += `<g class="seg${on ? ' on' : ''}" data-sb="${l.id}" tabindex="0" role="button" aria-label="${U.esc('Volgens ' + r.n.name + ': ' + World.loc(s, l.loc).name + ' van ' + this.clock(l.from) + ' tot ' + this.clock(l.to))}">` +
          `<line class="halo" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="transparent" stroke-width="18" stroke-linecap="round"/><line class="vis" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${r.color}" stroke-width="7" stroke-linecap="round"/></g>`;
        if (k === 0) h += `<text class="who" x="${x1 + 4}" y="${y - 10}" fill="${r.color}">volgens ${U.esc(U.first(r.n))}</text>`; });
    });
    D.dots.forEach((d) => { const r = D.rows.find((x) => x.n.id === d.who.id), y = rowY[d.loc], x = this.mx(d.t), on = sel.indexOf(d.id) >= 0;
      h += `<g class="seg${on ? ' on' : ''}" data-sb="${d.id}" tabindex="0" role="button" aria-label="${U.esc(d.by + ' zag ' + d.who.name + ' om ' + this.clock(d.t) + ' bij ' + World.loc(s, d.loc).name)}"><circle cx="${x}" cy="${y}" r="14" fill="transparent"/>` +
        `<circle class="vis" cx="${x}" cy="${y}" r="${on ? 10 : 7}" fill="var(--sp-mapbg)" stroke="${r ? r.color : '#1f2933'}" stroke-width="4"/></g><text class="who" x="${x + 12}" y="${y + 20}" fill="${r ? r.color : '#1f2933'}">${U.esc(U.first(d.who))}, gezien door ${U.esc(d.by)}</text>`; });
    const pairOn = (p) => showAll || (sel.indexOf(p[0]) >= 0 && sel.indexOf(p[1]) >= 0);
    D.pairs.filter(pairOn).forEach((p) => { const d = D.dots.find((x) => x.id === p[1]), seg = D.rows.reduce((a, r) => a.concat(r.legs), []).find((l) => l.id === p[0]); if (!d || !seg) return;
      const x = this.mx(d.t), y1 = rowY[seg.loc], y2 = rowY[d.loc]; let z = `M${x} ${y1}`; const n = Math.max(4, Math.round(Math.abs(y2 - y1) / 14));
      for (let i = 1; i < n; i++) z += ` L${x + (i % 2 ? 8 : -8)} ${y1 + (y2 - y1) * i / n}`; h += `<path d="${z} L${x} ${y2}" stroke="#b3312a" stroke-width="3.2" fill="none"/>`; });
    return h + '</svg>';
  },
  check(D, sel) {
    if (sel.length < 2) return null;
    const hit = D.pairs.some((p) => sel.indexOf(p[0]) >= 0 && sel.indexOf(p[1]) >= 0);
    return hit ? { ok: true, text: 'Klopt: die twee kunnen niet allebei waar zijn. Op hetzelfde moment op twee plaatsen.' } : { ok: false, text: 'Die twee sluiten elkaar niet uit. Kies een verklaring en een waarneming op hetzelfde tijdstip.' };
  },

  /* ----- v0.17.0: real leak-free interactive Spoorboek from discovered player state ----- */
  _kenmerkIn(txt) {
    const low = (txt || '').toLowerCase();
    return Object.keys(KENMERK).find((k) => {
      const km = KENMERK[k];
      return low.indexOf(km.saw.toLowerCase()) >= 0 || low.indexOf(km.label.toLowerCase()) >= 0 || low.indexOf(km.desc.toLowerCase()) >= 0;
    }) || null;
  },
  _colorOf(s, npcId) {
    const sorted = s.cast.slice().sort(byName);
    const idx = sorted.findIndex((n) => n.id === npcId);
    return SB_COLOR[(idx >= 0 ? idx : 0) % SB_COLOR.length];
  },
  count(s) {
    if (!s || !s.play) return 0;
    const p = s.play;
    let n = 0;
    s.cast.forEach((c) => { if (p.met[c.id] && p.asked[c.id + ':alibi'] && s.alibis && s.alibis[c.id]) n++; });
    Evidence.found(s).forEach((e) => {
      if (['people_witness', 'red_alibi', 'twist_double'].indexOf(e.key) >= 0) n++;
      if (e.source.type === 'confront' && s.contradictions.some((c) => c.id === e.source.conId && p.resolved[c.id] && c.yields === e.id)) n++;
    });
    Object.keys(p.alibiCheck || {}).forEach((id) => {
      if (p.met[id] && p.asked[id + ':alibi'] && p.alibiCheck[id] && p.alibiCheck[id].ok === false) n++;
    });
    return n;
  },
  build(s, M) {
    const p = s.play, lv = Level.get(s);
    const stations = s.world.locations.slice().sort((a, b) => (M.pos[a.id].y - M.pos[b.id].y) || (M.pos[a.id].x - M.pos[b.id].x));
    const crimeHour = (s.truth && s.truth.crimeHour) || 21;
    const crimeMin = Math.max(60, Math.min(300, (crimeHour - 18) * 60));
    const crimeLocId = s.crime.crimeLocationId;
    const items = [];
    const castAlpha = s.cast.slice().sort(byName);

    // 1. Asked alibis of met suspects (alphabetical, leak-free)
    castAlpha.forEach((n) => {
      if (!p.met[n.id] || !p.asked[n.id + ':alibi']) return;
      const a = s.alibis && s.alibis[n.id]; if (!a) return;
      const comp = a.withId ? World.npc(s, a.withId) : null;
      const chk = p.alibiCheck && p.alibiCheck[n.id];
      let status = 'open';
      if (chk && lv.checkLabel) status = chk.ok ? 'ok' : 'bad';
      else if (p.cleared[n.id] && lv.checkLabel) status = 'ok';
      items.push({
        id: 'al:' + n.id, kind: 'alibi', npcId: n.id, who: n,
        locId: a.locId, from: Math.max(0, crimeMin - 60), to: Math.min(360, crimeMin + 60), t: crimeMin,
        withId: a.withId || null, withName: comp ? comp.name : null,
        status: status, color: this._colorOf(s, n.id),
        label: 'Alibi ' + U.first(n),
        detail: n.name + ' zegt rond ' + crimeHour + ':00 bij ' + World.loc(s, a.locId).name + ' te zijn geweest' + (comp ? ' (met ' + comp.name + ')' : ' (alleen)') + '.'
      });
    });

    // 2. Broken alibis recorded publicly via alibiCheck (only when alibi was asked & refuted)
    castAlpha.forEach((n) => {
      const chk = p.alibiCheck && p.alibiCheck[n.id];
      if (!chk || chk.ok !== false || !p.met[n.id] || !p.asked[n.id + ':alibi']) return;
      const a = s.alibis && s.alibis[n.id]; if (!a) return;
      const byTxt = String(chk.by).indexOf('obj:') === 0 ? 'gevonden stuk' : World.npc(s, chk.by).name;
      items.push({
        id: 'den:' + n.id, kind: 'denial', npcId: n.id, who: n,
        locId: a.locId, t: crimeMin, color: '#b3312a',
        label: 'Weerlegd: ' + U.first(n),
        detail: 'Volgens ' + byTxt + ' was ' + n.name + ' om ' + crimeHour + ':00 niet bij ' + World.loc(s, a.locId).name + '.'
      });
    });

    // 3. Discovered evidence observations (strictly from Evidence.found(s) + public text matching)
    const found = Evidence.found(s).slice().sort((a, b) => a.id < b.id ? -1 : 1);
    found.forEach((e) => {
      if (e.key === 'people_witness') {
        const km = this._kenmerkIn(e.text);
        const by = e.source.npcId ? World.npc(s, e.source.npcId) : null;
        items.push({
          id: 'obs:' + e.id, kind: 'witness', evId: e.id, kenmerk: km,
          locId: crimeLocId, t: crimeMin, color: '#b3312a',
          label: 'Getuige: ' + (km ? KENMERK[km].label : 'gestalte'),
          detail: (by ? by.name : 'Getuige') + ' zag rond ' + crimeHour + ':00 bij ' + World.loc(s, crimeLocId).name + ' iemand met ' + (km ? KENMERK[km].met : 'een opvallend kenmerk') + '.'
        });
      } else if (e.key === 'red_alibi' && e.source.locationId) {
        const named = castAlpha.find((n) => e.text.indexOf(n.name) >= 0) || null;
        items.push({
          id: 'reg:' + e.id, kind: 'register', evId: e.id, npcId: named ? named.id : null, who: named,
          locId: e.source.locationId, t: crimeMin, color: named ? this._colorOf(s, named.id) : '#2f6f8f',
          label: 'Register: ' + (named ? U.first(named) : e.title),
          detail: e.title + ' bij ' + World.loc(s, e.source.locationId).name + ' rond ' + crimeHour + ':00' + (named ? ' noemt ' + named.name : '') + '.'
        });
      } else if (e.key === 'twist_double' && e.source.locationId) {
        items.push({
          id: 'dbl:' + e.id, kind: 'distraction', evId: e.id,
          locId: e.source.locationId, t: Math.max(15, crimeMin - 25), color: '#c48a1c',
          label: 'Afleiding bij ' + World.loc(s, e.source.locationId).name,
          detail: 'Kort voor ' + crimeHour + ':00 ontstond er opschudding bij ' + World.loc(s, e.source.locationId).name + ' (' + e.title + ').'
        });
      } else if (e.source.type === 'confront') {
        const con = s.contradictions.find((c) => c.id === e.source.conId && p.resolved[c.id] && c.yields === e.id);
        if (con && con.kind === 'culprit') {
          const who = World.npc(s, con.npcId);
          items.push({
            id: 'cnf:' + con.npcId, kind: 'confess', evId: e.id, npcId: con.npcId, who: who,
            locId: crimeLocId, t: crimeMin, color: this._colorOf(s, con.npcId),
            label: 'Bekentenis: ' + U.first(who),
            detail: who.name + ' gaf na confrontatie toe om ' + crimeHour + ':00 bij ' + World.loc(s, crimeLocId).name + ' te zijn geweest.'
          });
        }
      }
    });

    return { stations: stations, items: items, crimeHour: crimeHour, crimeMin: crimeMin, crimeLocId: crimeLocId };
  },
  compare(s, D, sel, M) {
    if (!sel || sel.length < 2) return null;
    const a = D.items.find((x) => x.id === sel[0]), b = D.items.find((x) => x.id === sel[1]);
    if (!a || !b) return null;
    const pair = [a, b], byKind = (k) => pair.find((x) => x.kind === k);
    const al = byKind('alibi'), den = byKind('denial'), cnf = byKind('confess'), reg = byKind('register'), wit = byKind('witness'), dbl = byKind('distraction');
    const locName = (id) => { const l = World.loc(s, id); return l ? l.name : '?'; };
    const walk = (x, y) => M ? MapGen.travel(M, x, y) : Travel.min(s, x, y);

    // 1. Alibi vs Denial of same person
    if (al && den) {
      if (al.npcId === den.npcId) {
        return { kind: 'conflict', title: 'Tegenstrijdigheid: alibi gebroken', text: al.who.name + ' zei om ' + D.crimeHour + ':00 bij ' + locName(al.locId) + ' te zijn geweest, maar dat alibi is tegengesproken.' };
      }
      return { kind: 'neutral', title: 'Andere personen', text: 'Deze twee punten horen bij ' + al.who.name + ' en ' + den.who.name + ' — kies twee items van dezelfde persoon of vergelijk met een waarneming.' };
    }
    // 2. Alibi vs Confession at crime scene
    if (al && cnf) {
      if (al.npcId === cnf.npcId) {
        return { kind: 'conflict', title: 'Tegenstrijdigheid: weerlegd alibi', text: al.who.name + ' beweerde bij ' + locName(al.locId) + ' te zijn, maar gaf na confrontatie toe rond ' + D.crimeHour + ':00 bij ' + locName(cnf.locId) + ' te zijn geweest.' };
      }
      return { kind: 'neutral', title: 'Andere personen', text: 'De bekentenis hoort bij ' + cnf.who.name + ', niet bij ' + al.who.name + '.' };
    }
    // 3. Alibi vs Register entry
    if (al && reg) {
      if (reg.npcId && reg.npcId === al.npcId) {
        if (reg.locId !== al.locId) {
          const w = walk(al.locId, reg.locId);
          return { kind: 'conflict', title: 'Tegenstrijdigheid op de tijdlijn!', text: al.who.name + ' zei om ' + D.crimeHour + ':00 bij ' + locName(al.locId) + ' te zijn, maar staat rond hetzelfde uur in het register van ' + locName(reg.locId) + ' (' + w + ' min lopen verderop).', travelMin: w };
        }
        return { kind: 'match', title: 'Bevestigd door het register', text: 'Het register van ' + locName(reg.locId) + ' bevestigt de verklaring van ' + al.who.name + '.' };
      }
      return { kind: 'neutral', title: 'Geen directe botsing', text: 'Dit registerspoor noemt ' + (reg.who ? reg.who.name : 'iemand anders') + ', niet ' + al.who.name + '.' };
    }
    // 4. Alibi vs Witness sighting (kenmerk match without ever leaking culprit)
    if (al && wit) {
      const w = walk(al.locId, wit.locId);
      if (wit.kenmerk && al.who.kenmerk === wit.kenmerk) {
        return { kind: 'clue', title: 'Opvallend verband (kenmerk past)', text: al.who.name + ' ' + KENMERK[wit.kenmerk].desc + ' — precies wat de getuige zag bij ' + locName(wit.locId) + '. Toch zegt ' + U.first(al.who) + ' rond ' + D.crimeHour + ':00 bij ' + locName(al.locId) + ' te zijn geweest (' + w + ' min lopen). Controleer dit alibi!', travelMin: w };
      }
      return { kind: 'neutral', title: 'Kenmerk past niet', text: 'De getuige zag iemand met ' + (wit.kenmerk ? KENMERK[wit.kenmerk].met : 'een ander kenmerk') + '. Dat kenmerk hoort niet bij ' + al.who.name + '.' };
    }
    // 5. Distraction (dubbel twist) vs Witness or Alibi
    if (dbl && wit) {
      const w = walk(dbl.locId, wit.locId);
      return { kind: 'clue', title: 'Looptijd afleiding → plaats delict: ' + w + ' min', text: 'Van ' + locName(dbl.locId) + ' naar ' + locName(wit.locId) + ' is het ' + w + ' minuten lopen. Eén persoon kon eerst de afleiding veroorzaken en rond ' + D.crimeHour + ':00 bij ' + locName(wit.locId) + ' zijn.', travelMin: w };
    }
    if (dbl && al) {
      const w1 = walk(dbl.locId, D.crimeLocId), w2 = walk(al.locId, dbl.locId);
      return { kind: 'clue', title: 'Afleiding op de tijdlijn', text: 'De afleiding bij ' + locName(dbl.locId) + ' ligt op ' + w2 + ' min lopen van ' + locName(al.locId) + ' (alibi van ' + U.first(al.who) + ') en ' + w1 + ' min van ' + locName(D.crimeLocId) + '.', travelMin: w1 };
    }
    // 6. Two alibis compared
    if (a.kind === 'alibi' && b.kind === 'alibi') {
      if (a.locId === b.locId && (a.withId === b.npcId || b.withId === a.npcId)) {
        return { kind: 'match', title: 'Zelfde plek rond ' + D.crimeHour + ':00', text: a.who.name + ' en ' + b.who.name + ' noemen allebei ' + locName(a.locId) + ' als plek voor die avond.' };
      }
      if (a.locId === b.locId) {
        return { kind: 'clue', title: 'Zelfde locatie genoemd', text: 'Zowel ' + U.first(a.who) + ' als ' + U.first(b.who) + ' zegt rond ' + D.crimeHour + ':00 bij ' + locName(a.locId) + ' te zijn geweest.' };
      }
      const w = walk(a.locId, b.locId);
      return { kind: 'neutral', title: 'Twee verschillende plekken (' + w + ' min lopen)', text: U.first(a.who) + ' noemt ' + locName(a.locId) + ' en ' + U.first(b.who) + ' noemt ' + locName(b.locId) + '. Ze sluiten elkaar niet uit.', travelMin: w };
    }
    const w = walk(a.locId, b.locId);
    return { kind: 'neutral', title: 'Geen directe tegenstrijdigheid', text: a.label + ' (' + locName(a.locId) + ') en ' + b.label + ' (' + locName(b.locId) + ')' + (a.locId !== b.locId ? ' liggen ' + w + ' min lopen uit elkaar' : ' spelen zich op dezelfde plek af') + '.', travelMin: w };
  },
  renderSvg(s, D, sel, cmp) {
    const rowY = {}, H = this.Y0 + D.stations.length * this.ROW + 34;
    D.stations.forEach((l, i) => { rowY[l.id] = this.Y0 + i * this.ROW + this.ROW / 2; });
    const crimeX = this.mx(D.crimeMin);
    let h = `<svg class="sb-svg" viewBox="0 0 1270 ${H}" role="group" aria-label="Spoorboek van de avond van 18:00 tot 24:00">`;
    // Highlight band on the crime location row
    if (rowY[D.crimeLocId] != null) {
      h += `<rect x="${this.X0}" y="${rowY[D.crimeLocId] - this.ROW / 2}" width="${this.X1 - this.X0}" height="${this.ROW}" fill="#b3312a" fill-opacity=".06"/>`;
    }
    // Time grid (18:00–24:00)
    for (let m = 0; m <= 360; m += 30) {
      const x = this.mx(m);
      h += `<line class="grid" x1="${x}" y1="${this.Y0 - 10}" x2="${x}" y2="${H - 24}" stroke-width="${m % 60 ? 0.6 : 1.3}"/>`;
      if (m % 60 === 0) h += `<text class="hr" x="${x}" y="${this.Y0 - 18}" text-anchor="middle">${this.clock(m)}</text>`;
    }
    // Vertical crime-hour marker
    h += `<line x1="${crimeX}" y1="${this.Y0 - 10}" x2="${crimeX}" y2="${H - 24}" stroke="#b3312a" stroke-width="2" stroke-dasharray="6 4" opacity=".7"/>`;
    h += `<text x="${crimeX}" y="${H - 7}" text-anchor="middle" font-size="11" font-weight="700" fill="#b3312a">Voorval (~${D.crimeHour}:00)</text>`;
    // Station rows
    D.stations.forEach((l) => {
      const y = rowY[l.id], isCr = l.id === D.crimeLocId;
      h += `<line class="grid" x1="${this.X0}" y1="${y}" x2="${this.X1}" y2="${y}" stroke-width="1"/>`;
      h += `<text class="rowl${isCr ? ' crime' : ''}" x="${this.X0 - 14}" y="${y + 5}" text-anchor="end">${U.esc(l.name)}${isCr ? ' ✕' : ''}</text>`;
    });

    // Stack offsets for multiple alibis on the same station row
    const alibisByLoc = {};
    D.items.filter((x) => x.kind === 'alibi').forEach((x) => { (alibisByLoc[x.locId] = alibisByLoc[x.locId] || []).push(x); });
    const posOf = {};

    // Draw alibi segments (labels alternate left/right of the bar so stacked bars never collide)
    D.items.filter((x) => x.kind === 'alibi').forEach((it) => {
      const group = alibisByLoc[it.locId], idx = group.indexOf(it);
      const dy = (idx - (group.length - 1) / 2) * 16;
      const y = rowY[it.locId] + dy, x1 = this.mx(it.from), x2 = this.mx(it.to), on = sel.indexOf(it.id) >= 0;
      posOf[it.id] = { x: this.mx(it.t), y: y };
      const dash = it.status === 'bad' ? ' stroke-dasharray="9 5"' : '';
      const badge = it.status === 'ok' ? ' ✓' : it.status === 'bad' ? ' ✗' : '';
      const onLeft = idx % 2 === 0;
      h += `<g class="seg${on ? ' on' : ''}" data-sb="${U.esc(it.id)}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${U.esc(it.detail)}">` +
        `<line class="halo" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="transparent" stroke-width="18" stroke-linecap="round"/>` +
        `<line class="vis" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${it.color}" stroke-width="${on ? 10 : 7}" stroke-linecap="round"${dash}/>` +
        `</g>` +
        `<text class="who" x="${onLeft ? x1 - 10 : x2 + 10}" y="${y + 4}" text-anchor="${onLeft ? 'end' : 'start'}" fill="${it.color}">${U.esc(U.first(it.who) + badge)}</text>`;
    });

    // Draw point observations (witness, denial, register, confess, distraction)
    const dotsByLoc = {};
    D.items.filter((x) => x.kind !== 'alibi').forEach((x) => { (dotsByLoc[x.locId] = dotsByLoc[x.locId] || []).push(x); });
    D.items.filter((x) => x.kind !== 'alibi').forEach((it) => {
      const group = dotsByLoc[it.locId], idx = group.indexOf(it);
      const dx = (idx - (group.length - 1) / 2) * 26;
      const x = this.mx(it.t) + dx, y = rowY[it.locId], on = sel.indexOf(it.id) >= 0;
      posOf[it.id] = { x: x, y: y };
      const r = on ? 11 : 8;
      let shape = `<circle class="vis" cx="${x}" cy="${y}" r="${r}" fill="var(--sp-mapbg)" stroke="${it.color}" stroke-width="4"/>`;
      if (it.kind === 'distraction') {
        shape = `<rect class="vis" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" rx="2" transform="rotate(45 ${x} ${y})" fill="var(--sp-mapbg)" stroke="${it.color}" stroke-width="3.5"/>`;
      } else if (it.kind === 'denial') {
        shape = `<circle class="vis" cx="${x}" cy="${y}" r="${r}" fill="#b3312a" stroke="var(--sp-mapbg)" stroke-width="2.5"/><path d="M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
      }
      h += `<g class="seg${on ? ' on' : ''}" data-sb="${U.esc(it.id)}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${U.esc(it.detail)}">` +
        `<circle cx="${x}" cy="${y}" r="16" fill="transparent"/>${shape}</g>` +
        `<text class="who sb-dot-lbl" x="${x + 13}" y="${y + (idx % 2 ? -12 : 21)}" fill="${it.color}">${U.esc(it.label)}</text>`;
    });

    // Connector line when 2 items are selected
    if (sel.length === 2 && posOf[sel[0]] && posOf[sel[1]]) {
      const p1 = posOf[sel[0]], p2 = posOf[sel[1]];
      if (cmp && cmp.kind === 'conflict') {
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (dist > 14) {
          const steps = Math.max(4, Math.round(dist / 16)), ux = (p2.x - p1.x) / dist, uy = (p2.y - p1.y) / dist;
          let z = `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
          for (let i = 1; i < steps; i++) {
            const t = i / steps, sgn = i % 2 ? 7 : -7;
            z += ` L${(p1.x + (p2.x - p1.x) * t - uy * sgn).toFixed(1)} ${(p1.y + (p2.y - p1.y) * t + ux * sgn).toFixed(1)}`;
          }
          h += `<path d="${z} L${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" stroke="#b3312a" stroke-width="3.2" fill="none" pointer-events="none"/>`;
        } else {
          h += `<circle cx="${p1.x.toFixed(1)}" cy="${p1.y.toFixed(1)}" r="16" fill="none" stroke="#b3312a" stroke-width="3" stroke-dasharray="5 3" pointer-events="none"/>`;
        }
      } else {
        const col = cmp && cmp.kind === 'match' ? '#3c7031' : cmp && cmp.kind === 'clue' ? '#c48a1c' : 'var(--sp-mute)';
        h += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${col}" stroke-width="2.4" stroke-dasharray="6 4" pointer-events="none"/>`;
      }
    }
    return h + '</svg>';
  },
  html(s, M, sel) {
    const D = this.build(s, M);
    const activeSel = (sel || []).filter((id) => D.items.some((x) => x.id === id)).slice(0, 2);
    const cmp = this.compare(s, D, activeSel, M);
    const link = (txt) => Mentions.linkHtml(s, txt);

    let h = `<div class="sb-wrap">`;
    h += `<div class="sb-intro"><p>Het Spoorboek zet alle ontdekte alibi's en tijdsporen van de avond (18:00–24:00) naast elkaar. <b>Tik op twee balken of punten</b> om te controleren of ze met elkaar botsen of elkaar bevestigen.</p>`;
    h += `<div class="sb-legend" aria-hidden="true">` +
      `<span><i class="sb-lg-bar"></i>Alibi-verklaring</span>` +
      `<span><i class="sb-lg-dot"></i>Waarneming / spoor</span>` +
      `<span><i class="sb-lg-x"></i>Weerlegd alibi</span>` +
      `<span><i class="sb-lg-cr"></i>Tijdstip voorval (~${D.crimeHour}:00)</span>` +
      `</div></div>`;

    if (!D.items.length) {
      h += `<div class="sb-empty"><h3>Nog geen tijdsporen ontdekt</h3><p>Vraag betrokkenen tijdens een verhoor waar ze die avond waren, of zoek sporen met tijdstippen. Zodra je het eerste alibi of een waarneming hoort, verschijnt die hier op de tijdlijn.</p></div>`;
      return h + `</div>`;
    }

    h += `<div class="sb-scroll">${this.renderSvg(s, D, activeSel, cmp)}</div>`;

    // Comparison readout
    if (cmp) {
      h += `<div class="sb-result sb-${cmp.kind}" role="status" aria-live="polite">` +
        `<div class="sb-res-body"><b>${U.esc(cmp.title)}</b><p>${link(cmp.text)}</p></div>` +
        `<button type="button" class="sp-chip" data-ui="sb-clear">Wis selectie</button>` +
        `</div>`;
    } else if (activeSel.length === 1) {
      const it = D.items.find((x) => x.id === activeSel[0]);
      h += `<div class="sb-result sb-pick" role="status" aria-live="polite">` +
        `<div class="sb-res-body"><b>Geselecteerd: ${U.esc(it.label)}</b><p>${link(it.detail)} Kies nu een tweede balk of punt om te vergelijken.</p></div>` +
        `<button type="button" class="sp-chip" data-ui="sb-clear">Wis selectie</button>` +
        `</div>`;
    } else {
      h += `<div class="sb-result sb-idle"><p>Selecteer twee punten op het Spoorboek of uit de lijst hieronder om ze te vergelijken.</p></div>`;
    }

    // Accessible selectable list of discovered items
    h += `<div class="sb-list" role="group" aria-label="Ontdekte tijdsporen">` +
      D.items.map((it) => {
        const on = activeSel.indexOf(it.id) >= 0;
        const kindLbl = it.kind === 'alibi' ? 'Alibi' : it.kind === 'denial' ? 'Weerlegd' : it.kind === 'witness' ? 'Getuige' : it.kind === 'register' ? 'Register' : it.kind === 'confess' ? 'Bekentenis' : 'Afleiding';
        return `<button type="button" class="sb-item${on ? ' on' : ''} sb-k-${it.kind}" data-sb="${U.esc(it.id)}" aria-pressed="${on}" style="--sbc:${it.color}">` +
          `<span class="sb-it-k">${kindLbl}</span><b>${U.esc(it.label)}</b><small>${U.esc(World.loc(s, it.locId).name)} · ~${this.clock(it.t)}</small>` +
        `</button>`;
      }).join('') +
      `</div>`;

    return h + `</div>`;
  }
};

/* ---------------- Coach (v0.10.0, voorstel 10): which explanation fits now ----------------
   Pure: reads the game state and the player's intro prefs, never writes either. The UI draws the bubble.
   intro: { coached: bool, step: 0-2, tips: { alibi: bool, link: bool } }. It lives in the prefs, never in the save. */
const Coach = {
  fresh: () => ({ coached: false, step: 0, tips: {} }),
  done: () => ({ coached: true, step: 3, tips: { alibi: true, link: true } }),
  // an alibi with a named companion that the player heard but has not checked yet
  openAlibi(s) {
    const n = s.cast.slice().sort(byName).find((x) => { const a = s.alibis && s.alibis[x.id]; return a && a.withId && s.play.asked[x.id + ':alibi'] && !(s.play.alibiCheck && s.play.alibiCheck[x.id]); });
    return n ? { npc: n, comp: World.npc(s, s.alibis[n.id].withId) } : null;
  },
  // selectors are single strings, so the first person in the mixed line-up is marked, core or not (no leak)
  pick(s, intro, ctx) {
    if (!s || !intro || s.play.ended) return null;
    const tab = ctx && ctx.tab, v = s.visit, inVisit = tab === 'visit' && v, conv = inVisit && v.conv, tips = intro.tips || {};
    if (!intro.coached) {
      if (conv) {
        const star = Level.get(s).toneHint;
        return { id: 'tone', guided: true, n: 3, sel: ['.iv-bar .seg'], title: 'Kies de juiste toon',
          text: 'Kies eerst een toon en stel dan een vraag. Elk temperament reageert anders: na je vraag zie je aan de reactie of je toon goed viel.' + (star ? ' Op Makkelijk wijst de ster de beste toon aan.' : ''), btn: 'Klaar' };
      }
      if (inVisit && intro.step === 0) {
        return { id: 'att', guided: true, n: 1, sel: ['.sp-att'], title: 'De klok loopt',
          text: 'Rondkijken is gratis. Grondig onderzoeken en aanspreken kosten ' + Level.cost(s, 'examine') + ' minuten, verhoren ' + Level.cost(s, 'talk') + ', lopen 15 tot 45. Binnen een gesprek zijn alle vragen gratis. Mensen komen en gaan door de dag op hun eigen ritme.', btn: 'Volgende' };
      }
      if (inVisit && intro.step === 1) {
        const anyone = Tableau.model(s, v.locId, s.clock.part).hs.some((x) => x.kind !== 'obj');
        return anyone ? { id: 'greet', guided: true, n: 2, sel: ['.tv-side [data-hs^="npc:"], .tv-side [data-hs^="crowd:"]'], title: 'Spreek iemand aan',
          text: 'Tik op iemand die je nog niet kent. Je ziet eerst alleen het uiterlijk. Pas als je iemand aanspreekt, hoor je naam en rol.', btn: 'Volgende' }
          : { id: 'greet', guided: true, n: 2, sel: ['.tv-side h4'], title: 'Spreek iemand aan',
            text: 'Hier is nu niemand. Op de kaart staat bij elke plek een ? voor iedereen die je nog niet kent. Daar spreek je ze aan.', btn: 'Volgende' };
      }
    }
    if (!tips.alibi) {
      const o = this.openAlibi(s);
      if (o) return { id: 'alibi', sel: conv ? ['.iv-paper'] : [], title: 'Controleer het alibi',
        text: U.first(o.npc) + ' zegt bij ' + o.comp.name + ' te zijn geweest. Spreek ' + U.first(o.comp) + ' aan en vraag naar het alibi van ' + U.first(o.npc) + '. Zo zie je of het klopt.', btn: 'Begrepen' };
    }
    if (!tips.link && tab === 'board' && !Level.get(s).threads && Evidence.found(s).some((e) => e.route !== 'start') && !Pins.threads(s).length) {
      return { id: 'link', sel: ['.bd [data-card^="d:"]', '.bd [data-card^="s:"]:not([data-card^="s:con_"])'], title: 'Trek zelf een draadje',
        text: 'Tik op een kaart en kies Draadje trekken. Tik daarna op mensen, stukken, verklaringen of plaatsen die erbij horen. Wat af is, leg je in het archief.', btn: 'Begrepen' };
    }
    return null;
  },
  // the next intro after the player answers a bubble
  answer(intro, id, skip) {
    if (skip) return this.done();
    const n = { coached: !!intro.coached, step: intro.step || 0, tips: Object.assign({}, intro.tips) };
    if (id === 'att') n.step = 1; else if (id === 'greet') n.step = 2; else if (id === 'tone') { n.coached = true; n.step = 3; } else n.tips[id] = true;
    return n;
  }
};

/* ---------------- Figures: line-up of the cast and crowd (debug panel since v0.6.1) ---------------- */
const Figures = {
  html(s, fam) {
    const cast = s.cast.slice().sort(byName), crowd = s.crowd.slice().sort(byName), lw = 120;
    let line = `<svg viewBox="0 0 ${cast.length * lw + 40} 330" width="${cast.length * lw + 40}" height="330" aria-hidden="true">`;
    for (let m = 1.0; m <= 1.85; m += 0.1) { const y = (290 - m * 148).toFixed(1); line += `<line x1="0" y1="${y}" x2="${cast.length * lw + 40}" y2="${y}" stroke="var(--sp-line)"/><text x="4" y="${y - 3}" font-size="10" fill="var(--sp-mute)">${m.toFixed(1).replace('.', ',')} m</text>`; }
    cast.forEach((n, i) => { const tone = Rels.toneOf(s, n.id); line += `<g transform="translate(${40 + i * lw} 30)">${Silhouette.figure(n, { s: s, fam: fam, mode: 'full', tone: tone, stance: TONE_STANCE[tone] })}</g>`; });
    line += '</svg>';
    let h = `<h3>De mensen van deze zaak</h3><p class="sp-note">Op naam gesorteerd. Houding en expressie volgen de toon tegen jou; de kaderkleur ook. De accentkleur hoort bij de publieke rol.</p><div class="lineup">${line}<div class="strip" style="padding:6px 0 10px 40px;gap:0">` +
      cast.map((n) => `<figure style="width:${lw}px"><b>${U.esc(U.first(n))}</b>${U.esc(n.role.replace(/ \(.*\)$/, ''))}</figure>`).join('') + '</div></div>';
    const ref = cast[0];
    h += `<h3>Vier stemmingen</h3><div class="strip">` + ['warm', 'neutral', 'cold', 'hostile'].map((t) => `<figure><span class="frame" style="--c:${TONE_COLOR[t]};background:${FAMILY[fam].photo}">${Silhouette.svg(ref, { s: s, fam: fam, tone: t, stance: TONE_STANCE[t], w: 88 })}</span><b>${TONE_WORD[t]}</b>${STANCE_LABEL[TONE_STANCE[t]]}</figure>`).join('') + '</div>';
    h += `<h3>Dezelfde persoon in vier tijdvakken</h3><div class="strip">` + ['oud', 'klassiek', 'modern', 'toekomst'].map((f) => `<figure><span class="frame" style="width:110px;height:200px;background:${FAMILY[f].photo}">${Silhouette.svg(ref, { s: s, fam: f, mode: 'full', w: 74 })}</span><b>${f}</b></figure>`).join('') + '</div>';
    h += `<h3>Figuranten</h3><p class="sp-note">Bijfiguren zijn grijzer, zodat de mensen die je kunt verhoren eruit springen.</p><div class="strip">` +
      crowd.map((c) => `<figure><span class="frame" style="background:${FAMILY[fam].photo}">${Silhouette.svg(c, { s: s, fam: fam, crowd: true, w: 80 })}</span><b>${U.esc(U.first(c))}</b>${U.esc(c.role)}</figure>`).join('') + '</div>';
    return `<div class="fg">${h}</div>`;
  }
};

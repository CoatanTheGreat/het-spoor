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

/* ---------------- Silhouette: layered SVG figure (body, coat, headwear, hair, accessory) ----------------
   Only public fields feed the shape: name, gender, public role, age and the visible trait (kenmerk). Within a case the
   look is made unique in name order (v0.10.0). Coordinates: 0..100 wide, feet at y=260. */
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
  // the trait as drawn: an svg string plus its bounding box (the box feeds the test 'kenmerk in beeld')
  kenmerk(t, g, bust, z) {
    const cx = g.cx, hy = g.hy, sy = g.sy, L = g.L, R = g.R, st = g.st, dk = (2.2 * z + 1.2).toFixed(2), lt = (1.6 * z).toFixed(2), rim = `stroke="${KM_LINE}" stroke-width="${(1.3 * z).toFixed(2)}"`;
    const twin = (d, w) => `<path d="${d}" fill="none" stroke="${KM_LINE}" stroke-width="${(w + 1.6 * z).toFixed(2)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${KM_FILL}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`;
    switch (t.acc) {
      case 'glasses': { const r = bust ? 3.6 + 0.5 * z : 3.6;
        return { box: [cx - 5 - r, hy - r, 10 + 2 * r, 2 * r], svg: `<g fill="none" stroke-linecap="round"><g stroke="${KM_LINE}" stroke-width="${dk}"><circle cx="${cx - 5}" cy="${hy}" r="${r}"/><circle cx="${cx + 5}" cy="${hy}" r="${r}"/><path d="M${cx - 5 + r} ${hy} L${cx + 5 - r} ${hy}"/></g>` +
          `<g stroke="${KM_FILL}" stroke-width="${lt}"><circle cx="${cx - 5}" cy="${hy}" r="${r}"/><circle cx="${cx + 5}" cy="${hy}" r="${r}"/></g></g>` }; }
      case 'scarf': return { box: [cx - 11, sy - 4, 22, 37], svg: `<path d="M${cx - 10} ${sy - 4} L${cx + 10} ${sy - 4} L${cx + 11} ${sy + 4} L${cx - 11} ${sy + 4} Z M${cx + 3} ${sy + 3} L${cx + 9} ${sy + 32} L${cx + 3} ${sy + 33} L${cx - 1} ${sy + 4} Z" fill="${KM_FILL}" ${rim}/>` };
      case 'badge': { const r = bust ? 3.2 * z + 0.6 : 3.4, x = cx - t.sw / 2, y = sy + 16;
        return { box: [x - r, y - r, 2 * r, 2 * r], svg: `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${KM_FILL}" ${rim}/><circle cx="${x}" cy="${y}" r="${(r * 0.35).toFixed(2)}" fill="${KM_LINE}"/>` }; }
      case 'bag':
        if (bust) { const bx = R - 8, by = 90;
          return { box: [bx, by, 20, 20], svg: twin(`M${L + 5} ${sy + 1} L${bx + 8} ${by + 2}`, 1.8 * z) + `<rect x="${bx}" y="${by}" width="20" height="18" rx="2.5" fill="${KM_FILL}" ${rim}/><path d="M${bx} ${by + 6} L${bx + 20} ${by + 6}" stroke="${KM_LINE}" stroke-width="${(1.1 * z).toFixed(2)}"/>` }; }
        return { box: [R - 4, sy + 64, 17, 13], svg: twin(`M${L + 5} ${sy + 1} L${R + 3} ${sy + 66}`, 2) + `<rect x="${R - 4}" y="${sy + 64}" width="17" height="13" rx="2" fill="${KM_FILL}" ${rim}/>` };
      case 'book':
        if (bust) { const bx = cx + 1, by = sy + 14;
          return { box: [bx, by, 18, 24], svg: `<g transform="rotate(-8 ${bx + 9} ${by + 12})"><rect x="${bx}" y="${by}" width="18" height="24" rx="1.5" fill="${KM_FILL}" ${rim}/><path d="M${bx + 4} ${by + 7} L${bx + 14} ${by + 7} M${bx + 4} ${by + 12} L${bx + 12} ${by + 12}" stroke="${KM_LINE}" stroke-width="${(1.1 * z).toFixed(2)}"/></g>` }; }
        { const y = sy + (st === 2 ? 58 : 66); return { box: [L - 11, y, 11, 15], svg: `<rect x="${L - 11}" y="${y}" width="11" height="15" rx="1.5" fill="${KM_FILL}" ${rim}/>` }; }
      case 'cane':
        if (bust) return { box: [R - 2, sy - 9, 13, 120 - sy], svg: twin(`M${R + 8} 112 L${R + 8} ${sy + 2} q0 -10 -8 -10 q-6 0 -6 6`, 2.2 * z) };
        return { box: [R - 1, sy + 77, 13, 258 - sy - 77], svg: twin(`M${R + 6} ${sy + 84} L${R + 11} 258 M${R + 6} ${sy + 84} q-1 -7 -7 -5`, 2.6) };
      default: return { box: null, svg: '' };
    }
  },
  // one figure as an SVG <g>; o: { fam, stance 0-2, color, accent, gap, rim, crowd, mode, w, s }
  figure(npc, o) {
    o = o || {}; const fam = o.fam || 'klassiek', t = this.traits(npc, fam, o.s), st = o.stance || 0, pal = FAMILY[fam] ? FAMILY[fam].pal : FAMILY.klassiek.pal;
    const bust = o.mode !== 'full', z = bust ? ((o.w || 64) < 56 ? 1.6 : 1.2) : 1;
    const base = o.color || pal.ink, C = o.crowd ? Hex.mix(base, '#9aa0a6', 0.42) : Hex.mix(base, t.accent, t.mixT), A = o.accent || (o.crowd ? Hex.mix(t.accent, '#9aa0a6', 0.5) : t.accent);
    const rim = o.rim === undefined ? pal.rim : o.rim;
    const cx = 50, r = t.head, hy = 40, top = hy - r, sw = t.sw, sy = 64, L = cx - sw, R = cx + sw, mir = (x) => 2 * cx - x;
    const covered = this.covered(t.hat);
    let back = '', body = '', head = '', front = '';
    // hair and headwear behind the head
    if (t.hair === 'long' && t.hat !== 'hood') back += `<path d="M${cx - r - 2} ${hy - 2} Q${cx - r - 5} ${hy + 32} ${cx - r + 1} ${sy + 28} L${cx + r - 1} ${sy + 28} Q${cx + r + 5} ${hy + 32} ${cx + r + 2} ${hy - 2} Z"/>`;
    if (t.hair === 'bob' && !covered) back += `<path d="M${cx - r - 3} ${hy + r - 1} Q${cx - r - 5} ${top - 3} ${cx} ${top - 3} Q${cx + r + 5} ${top - 3} ${cx + r + 3} ${hy + r - 1} Z"/>`;
    if (t.hat === 'hood') back += `<path d="M${cx - r - 8} ${sy + 10} C${cx - r - 11} ${top - 6} ${cx + r + 11} ${top - 6} ${cx + r + 8} ${sy + 10} Z"/>`;
    if (t.hat === 'kap') back += `<ellipse cx="${cx}" cy="${hy - 1}" rx="${r + 4}" ry="${r + 5}" fill="${A}"/>`;
    if (t.hat === 'collar') back += `<path d="M${cx - 14} ${sy + 2} L${cx - 13} ${hy + 2} L${cx - 6} ${hy + 10} L${cx - 6} ${sy} Z M${mir(cx - 14)} ${sy + 2} L${mir(cx - 13)} ${hy + 2} L${mir(cx - 6)} ${hy + 10} L${mir(cx - 6)} ${sy} Z"/>`;
    // body: coat shapes
    const sh = `M${L} ${sy + 8} Q${L} ${sy} ${L + 9} ${sy - 1} L${R - 9} ${sy - 1} Q${R} ${sy} ${R} ${sy + 8}`;
    const leg = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`;
    if (t.coat === 'long') body += `<path d="${sh} L${R + 5} 202 L${L - 5} 202 Z"/>` + leg(cx - 12, 196, 10, 62) + leg(cx + 2, 196, 10, 62);
    else if (t.coat === 'jacket') body += `<path d="${sh} L${R + 2} 150 L${L - 2} 150 Z"/><path d="M${cx - 14} 144 L${cx + 14} 144 L${cx + 13} 258 L${cx + 3} 258 L${cx} 172 L${cx - 3} 258 L${cx - 13} 258 Z"/>`;
    else if (t.coat === 'dress') body += `<path d="${sh} L${R - 3} 118 L${R + 16} 226 L${L - 16} 226 L${L + 3} 118 Z"/>` + leg(cx - 9, 220, 6, 38) + leg(cx + 3, 220, 6, 38);
    else if (t.coat === 'robe') body += `<path d="${sh} L${R + 10} 254 L${L - 10} 254 Z"/>`;
    else body += `<path d="${sh} L${R + 6} 172 L${L - 6} 172 Z"/>` + leg(cx - 11, 166, 9, 92) + leg(cx + 2, 166, 9, 92) + `<rect x="${L - 2}" y="122" width="${2 * sw + 4}" height="5" fill="${A}"/>`;
    body += `<ellipse cx="${cx - 8}" cy="258" rx="8" ry="3.4"/><ellipse cx="${cx + 8}" cy="258" rx="8" ry="3.4"/>`;
    // arms by stance: 0 open (hanging), 1 closed (folded), 2 defensive (hands on hips)
    if (st === 0) { const arm = `M${L + 2} ${sy + 4} Q${L - 6} ${sy + 10} ${L - 7} ${sy + 50} L${L - 5} ${sy + 86} Q${L - 1} ${sy + 92} ${L + 2} ${sy + 86} L${L + 4} ${sy + 30} Z`;
      body += `<path d="${arm}"/><path d="${arm}" transform="translate(${2 * cx} 0) scale(-1 1)"/>`; }
    if (st === 2) { const arm = `M${L + 1} ${sy + 4} L${L - 15} ${sy + 40} L${L + 3} ${sy + 64} L${L + 6} ${sy + 56} L${L - 5} ${sy + 40} L${L + 4} ${sy + 16} Z`;
      body += `<path d="${arm}"/><path d="${arm}" transform="translate(${2 * cx} 0) scale(-1 1)"/>`; }
    body += `<rect x="${cx - 5}" y="${hy + r - 5}" width="10" height="${sy - hy - r + 9}"/>`;
    body += `<path d="M${cx - 6} ${sy - 2} L${cx} ${sy + 9} L${cx + 6} ${sy - 2} Z" fill="${A}"/>`;   // role mark: always visible
    if (st === 1) body += `<rect x="${L - 5}" y="${sy + 30}" width="${2 * sw + 10}" height="16" rx="8" stroke="${o.gap || Hex.mix(C, '#ffffff', 0.3)}" stroke-width="1.6"/>`;
    // head, hair on top, headwear
    head += `<circle cx="${cx}" cy="${hy}" r="${r}"/>`;
    if (t.hair === 'short' && !covered) head += `<circle cx="${cx}" cy="${hy - 2}" r="${r + 1.3}"/>`;
    if (t.hair === 'bun' && !covered) head += `<circle cx="${cx + 2}" cy="${top - 3}" r="6"/>`;
    if (t.hair === 'tail' && !covered) head += `<circle cx="${cx + r - 1}" cy="${hy - 5}" r="5"/><path d="M${cx + r} ${hy - 2} Q${cx + r + 9} ${hy + 14} ${cx + r + 3} ${hy + 30}" fill="none" stroke="${C}" stroke-width="6" stroke-linecap="round"/>`;
    const band = (y, w) => `<rect x="${cx - w}" y="${y}" width="${2 * w}" height="3.2" fill="${A}"/>`;
    if (t.hat === 'kap') head += `<path d="M${cx - r} ${hy - 1} Q${cx} ${top - 7} ${cx + r} ${hy - 1} Q${cx} ${top + 3} ${cx - r} ${hy - 1} Z" fill="${A}"/>`;
    if (t.hat === 'cap') head += `<path d="M${cx - r - 1} ${hy - 3} Q${cx} ${top - 6} ${cx + r + 1} ${hy - 3} Z"/><ellipse cx="${cx + 3}" cy="${hy - 3}" rx="${r + 5}" ry="2.6"/>`;
    if (t.hat === 'bowler') head += `<path d="M${cx - r + 1} ${top + 5} Q${cx - r + 1} ${top - 11} ${cx} ${top - 11} Q${cx + r - 1} ${top - 11} ${cx + r - 1} ${top + 5} Z"/><ellipse cx="${cx}" cy="${top + 5}" rx="${r + 6}" ry="2.8"/>` + band(top + 1, r - 1);
    if (t.hat === 'top') head += `<rect x="${cx - r + 2}" y="${top - 20}" width="${2 * r - 4}" height="25"/><ellipse cx="${cx}" cy="${top + 4}" rx="${r + 6}" ry="2.8"/>` + band(top, r - 2);
    if (t.hat === 'brim') head += `<path d="M${cx - r + 3} ${top + 5} Q${cx - r + 3} ${top - 8} ${cx} ${top - 8} Q${cx + r - 3} ${top - 8} ${cx + r - 3} ${top + 5} Z"/><ellipse cx="${cx}" cy="${top + 5}" rx="${r + 13}" ry="3.6"/>` + band(top + 1, r - 3);
    if (t.hat === 'cloche') head += `<path d="M${cx - r - 3} ${hy + 1} Q${cx - r - 3} ${top - 5} ${cx} ${top - 6} Q${cx + r + 3} ${top - 5} ${cx + r + 3} ${hy + 1} Q${cx} ${hy - 6} ${cx - r - 3} ${hy + 1} Z"/>` + band(hy - 6, r + 1);
    if (t.hat === 'beret') head += `<ellipse cx="${cx + 3}" cy="${top + 2}" rx="${r + 4}" ry="5.5" transform="rotate(-8 ${cx} ${top})"/>`;
    if (t.hat === 'band') head += band(hy - 8, r);
    if (t.hat === 'visor') head += `<rect x="${cx - r - 4}" y="${hy - 6}" width="${2 * r + 8}" height="9" rx="4.5" fill="${A}" opacity=".35"/><rect x="${cx - r - 2}" y="${hy - 4}" width="${2 * r + 4}" height="5" rx="2.5" fill="${A}"/>`;
    if (t.hat === 'collar') front += `<path d="M${cx - 13} ${hy + 2} L${cx - 6} ${hy + 10} M${mir(cx - 13)} ${hy + 2} L${mir(cx - 6)} ${hy + 10}" stroke="${A}" stroke-width="2" fill="none"/>`;
    // v0.10.0 (voorstel 14): the trait, also inside the bust frame and thicker in small portraits
    front += this.kenmerk(t, { cx: cx, hy: hy, sy: sy, L: L, R: R, st: st }, bust, z).svg;
    const tilt = st === 1 ? ' transform="translate(0 2) rotate(-5 50 56)"' : st === 2 ? ' transform="translate(0 -1) rotate(5 50 56)"' : '';
    const stroke = rim ? ` stroke="${rim}" stroke-width="1.6" stroke-opacity=".75"` : '';
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
    return `<svg class="sil" viewBox="${vb}" width="${w}" height="${h}" aria-hidden="true">${this.figure(npc, Object.assign({}, o, { w: w }))}</svg>`;
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

/* ---------------- Board: deterministic zones, cards and threads (bewijsgraaf) ---------------- */
const Board = {
  W: 1280, H: 810,
  // v0.10.0 (voorstel 15): fixed grid. The labels own a header strip of 44 px; cards start at y 56 and keep at least 20 px apart.
  // v0.11.0: a strip of visited places along the bottom, with its own label row; every zone has an archive folder
  ZONES: [['Mensen', 30, 8, 'person'], ['De zaak en de stukken', 474, 8, 'doc'], ['Verklaringen', 850, 8, 'stmt'], ['Plaatsen', 30, 710, 'place']],
  labelW: (z) => z[0].length * 10 + 24,
  // wider cards turn less, so their corners never swing into a neighbour (406 px: at most 0,6 degree)
  rot: (id, w) => { const max = Math.min(1.6, 240 / (w || 160)); return +((((parseInt(RNG.hashStr('rot|' + id), 36) % 33) - 16) / 16) * max).toFixed(2); },
  grid(x0, y0, cols, rows, w, h, gx, gy) { const out = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: x0 + c * (w + gx), y: y0 + r * (h + gy), w: w, h: h }); return out; },
  SLOTS: null,
  slots() {
    return this.SLOTS || (this.SLOTS = { person: this.grid(30, 56, 2, 4, 200, 144, 20, 20), case: { x: 474, y: 56, w: 352, h: 170 },
      doc: this.grid(474, 246, 2, 3, 166, 132, 20, 20), stmt: this.grid(850, 56, 1, 8, 404, 62, 0, 20), place: this.grid(30, 756, 7, 1, 160, 38, 18, 0) });
  },
  // the folder button sits in the label row, right after the label; only when something is in it
  folders(s) {
    return this.ZONES.map((z) => ({ zone: z[3], n: Pins.inFolder(s, z[3]).length, x: z[1] + this.labelW(z) + 14, y: z[2] + 1, w: 112, h: 30 })).filter((f) => f.n > 0);
  },
  layout(s) {
    const p = s.play, cards = [], threads = [], add = (c) => { c.rot = this.rot(c.id, c.w); cards.push(c); }, S = this.slots(), A = (s.player && s.player.archive) || {}, live = (it) => !A[it.id];
    // more items than slots: the last slot becomes an overflow card that opens the journal, so nothing drops out silently
    const fill = (items, slots, zone, one, many) => {
      items = items.filter(live);
      const over = items.length > slots.length, shown = over ? items.slice(0, slots.length - 1) : items;
      shown.forEach((it, i) => add(Object.assign(it, slots[i])));
      if (over) { const n = items.length - shown.length; add(Object.assign({ id: 'more:' + zone, kind: 'more', zone: zone, n: n, word: n === 1 ? one : many }, slots[slots.length - 1])); }
    };
    // v0.12.0: people you only heard of follow as blank cards, so an overflow hides them first
    const hO = p.heardOf || {}, hL = p.heardOfLoc || {};
    fill(s.cast.filter((n) => p.met[n.id]).sort(byName).map((n) => ({ id: 'p:' + n.id, kind: 'person', ref: n.id }))
      .concat(s.cast.filter((n) => !p.met[n.id] && hO[n.id]).sort(byName).map((n) => ({ id: 'p:' + n.id, kind: 'ghost', ref: n.id }))), S.person, 'person', 'persoon', 'mensen');
    add(Object.assign({ id: 'case', kind: 'case', ref: s.evidence[0].id }, S.case));
    const found = Evidence.found(s).filter((e) => e.route !== 'start');
    const marked = s.world.locations.reduce((a, l) => a.concat(l.objects.filter((o) => Pins.ok(s, 'o:' + o.id)).map((o) => ({ id: 'o:' + o.id, kind: 'ghostdoc', ref: o.id, loc: l.id }))), []).sort((a, b) => a.id < b.id ? -1 : 1);
    fill(found.filter((e) => e.source.type === 'object').map((e) => ({ id: 'd:' + e.id, kind: 'doc', ref: e.id })).concat(marked), S.doc, 'doc', 'stuk', 'stukken');
    fill(s.contradictions.filter((c) => p.heard[c.id]).map((c) => ({ id: 's:' + c.id, kind: 'claim', ref: c.id }))
      .concat(found.filter((e) => e.source.type !== 'object').map((e) => ({ id: 's:' + e.id, kind: 'talk', ref: e.id }))), S.stmt, 'stmt', 'verklaring', 'verklaringen');
    fill(s.world.locations.filter((l) => p.visited[l.id] || hL[l.id]).sort(byName).map((l) => ({ id: 'l:' + l.id, kind: p.visited[l.id] ? 'place' : 'ghostplace', ref: l.id })), S.place, 'place', 'plaats', 'plaatsen');
    const has = (id) => cards.some((c) => c.id === id), cardOf = (eid) => has('d:' + eid) ? 'd:' + eid : has('s:' + eid) ? 's:' + eid : null;
    // v0.7.0 (voorstel 3): Makkelijk draws the threads from the evidence; v0.11.0: everyone draws their own as well
    const L = Level.get(s);
    if (L.threads) found.forEach((e) => { const a = cardOf(e.id), to = e.pointsTo; if (a && to && has('p:' + to)) threads.push({ a: a, b: 'p:' + to, kind: p.debunked[e.id] ? 'dead' : 'points' }); });
    s.contradictions.forEach((c) => {
      if (!has('s:' + c.id)) return; const ce = cardOf(c.counterEvidence);
      if (ce && (p.resolved[c.id] || L.clash)) threads.push({ a: 's:' + c.id, b: ce, kind: p.resolved[c.id] ? 'solved' : 'clash' });
      if (has('p:' + c.npcId)) threads.push({ a: 's:' + c.id, b: 'p:' + c.npcId, kind: 'said' });
    });
    // your own threads; one that the board already draws (not a 'said' line) is not drawn twice
    Pins.threads(s).forEach((t) => { if (has(t[0]) && has(t[1]) && !threads.some((x) => x.kind !== 'said' && Pins.key(x.a, x.b) === Pins.key(t[0], t[1]))) threads.push({ a: t[0], b: t[1], kind: 'mine' }); });
    return { cards: cards, threads: threads };
  },
  pin: (c) => [c.x + c.w / 2, c.y + 9],
  // where a thread meets a card: the edge that faces the other card; same column -> just outside the right edge
  // v0.11.0: a place in the bottom strip meets a card above it on its top edge, and the card meets it on its bottom edge
  anchor(c, o) {
    if (o.x >= c.x + c.w - 4) return [c.x + c.w - 5, c.y + c.h / 2];
    if (o.x + o.w <= c.x + 4) return [c.x + 5, c.y + c.h / 2];
    const pl = (x) => x.kind === 'place' || x.kind === 'ghostplace';
    if ((pl(c) || pl(o)) && o.y >= c.y + c.h) return [c.x + c.w / 2, c.y + c.h - 4];
    if ((pl(c) || pl(o)) && o.y + o.h <= c.y) return [c.x + c.w / 2, c.y + 4];
    return [c.x + c.w + 12, c.y + c.h / 2];
  },
  path(a, b, kind) {
    const x1 = a[0], y1 = a[1], x2 = b[0], y2 = b[1], d = Math.hypot(x2 - x1, y2 - y1);
    if (kind !== 'clash' && kind !== 'solved') { const sag = Math.min(70, d * 0.14); return `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag} ${x2} ${y2}`; }
    const n = Math.max(4, Math.round(d / 16)), ux = (x2 - x1) / d, uy = (y2 - y1) / d; let s = `M${x1} ${y1}`;
    for (let i = 1; i < n; i++) { const k = i / n, o = (i % 2 ? 7 : -7); s += ` L${(x1 + (x2 - x1) * k - uy * o).toFixed(1)} ${(y1 + (y2 - y1) * k + ux * o).toFixed(1)}`; }
    return s + ` L${x2} ${y2}`;
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
    if (k === 'l') { s.evidence.forEach((x) => { if (x.source.locationId === ref) cardOf(x.id); }); s.cast.forEach((n) => { if (n.locationId === ref) add('p:' + n.id); }); }
    return out;
  },
  // a neutral head-and-shoulders outline; the same for everyone, so it never gives anything away
  blank: (w) => `<svg viewBox="0 0 92 108" width="${w}" height="${Math.round(w * 108 / 92)}" aria-hidden="true"><circle cx="46" cy="38" r="20" fill="none" stroke="#6f6d64" stroke-width="3" stroke-dasharray="5 4"/><path d="M10 108 C12 78 28 66 46 66 C64 66 80 78 82 108" fill="none" stroke="#6f6d64" stroke-width="3" stroke-dasharray="5 4"/><text x="46" y="45" text-anchor="middle" font-size="20" font-weight="700" fill="#6f6d64">?</text></svg>`,
  card(s, c, fam) {
    const F = FAMILY[fam], st = `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;--rot:${c.rot}deg`, attr = `data-card="${c.id}" tabindex="0" role="button"`;
    if (c.kind === 'person') {
      const n = World.npc(s, c.ref), tone = Rels.toneOf(s, n.id), r = s.relations[n.id];
      return `<div class="bc pc" ${attr} aria-label="${U.esc(n.name + ', ' + n.role)}" style="${st};--tone:${TONE_COLOR[tone]};--phbg:${F.photo}"><div class="pin"></div>` +
        `<div class="ph">${Silhouette.svg(n, { s: s, fam: fam, stance: TONE_STANCE[tone], w: 72 })}</div><div class="pt"><b>${U.esc(n.name)}</b><span>${U.esc(n.role)}</span>${n.kenmerk ? `<span class="km">${U.esc(KENMERK[n.kenmerk].label)}</span>` : ''}<i>${U.esc(r.statusText)}${s.play.cleared[n.id] ? '. Alibi bevestigd.' : ''}</i></div></div>`;
    }
    // v0.12.0: blank cards: a plain outline, the name and where you heard it; nothing else
    if (c.kind === 'ghost') {
      const n = World.npc(s, c.ref), h = (s.play.heardOf || {})[n.id];
      return `<div class="bc pc ghost" ${attr} aria-label="${U.esc(n.name + ', nog niet ontmoet')}" style="${st}"><div class="pin"></div><div class="ph">${this.blank(72)}</div><div class="pt"><b>${U.esc(n.name)}</b><span>Nog niet ontmoet</span><i>Genoemd ${U.esc(Mentions.source(s, h))}.</i></div></div>`;
    }
    if (c.kind === 'ghostdoc') {
      const l = World.loc(s, c.loc), o = l.objects.find((x) => x.id === c.ref);
      return `<div class="bc doc ghost" ${attr} aria-label="${U.esc('Nog te bekijken: ' + o.name)}" style="${st}"><div class="pin"></div><div class="dk">Nog bekijken</div><b>${U.esc(Rnd.cap(o.name))}</b><p>Hier was iets, maar je wist nog te weinig.</p><small>${U.esc(l.name)}</small></div>`;
    }
    if (c.kind === 'ghostplace') {
      const l = World.loc(s, c.ref);
      return `<div class="bc tk ghost" ${attr} aria-label="${U.esc(l.name + ', nog niet bezocht')}" style="${st}"><i></i><span>${U.esc(l.name)}</span></div>`;
    }
    if (c.kind === 'case') {
      return `<div class="bc case" ${attr} aria-label="De zaak" style="${st}"><div class="pin"></div><h2>${U.esc(s.meta.title)}</h2><p>${U.esc(s.crime.summary)} ${U.esc(s.crime.personalHook)}</p><small>${U.esc(s.meta.eraLabel)}, ${U.esc(s.world.city.name)}</small></div>`;
    }
    if (c.kind === 'doc') {
      const e = Evidence.get(s, c.ref), loc = World.loc(s, e.source.locationId), obj = loc.objects.find((o) => o.id === e.source.objectId), kind = F.kinds[parseInt(RNG.hashStr(e.key), 36) % F.kinds.length];
      return `<div class="bc doc" ${attr} aria-label="${U.esc(e.title)}" style="${st}"><div class="pin"></div><div class="dk">${kind}</div><b>${U.esc(e.title)}${s.play.debunked[e.id] ? ' (weerlegd)' : ''}</b>` +
        `<p>${U.esc(Rnd.cap(e.item || (obj ? obj.name : '')))}</p><small>${U.esc(loc.name)}</small></div>`;
    }
    if (c.kind === 'claim' || c.kind === 'talk') {
      const con = c.kind === 'claim' ? s.contradictions.find((x) => x.id === c.ref) : null, e = con ? null : Evidence.get(s, c.ref);
      const who = World.npc(s, con ? con.npcId : (e.source.npcId || '')), text = con ? con.claim : e.text, title = con ? 'Verklaring van ' + who.name : e.title;
      const stamp = con && s.play.resolved[con.id] ? '<span class="stamp">doorgeprikt</span>' : e && e.source.type === 'confront' ? '<span class="stamp">bekentenis</span>' : '';
      return `<div class="bc st${stamp ? ' stamped' : ''}" ${attr} aria-label="${U.esc(title)}" style="${st}"><div class="pin"></div><div class="sp">${who ? Silhouette.svg(who, { s: s, fam: fam, w: 40 }) : ''}</div>` +
        `<div><q>${U.esc(text)}</q><small>${U.esc(title)}</small></div>${stamp}</div>`;
    }
    if (c.kind === 'more') {
      return `<button class="bc more" data-ui="journal" aria-label="${c.n} ${c.word} meer, open het dagboek" style="${st}"><div class="pin"></div><b>+${c.n} ${c.word}</b><small>Archiveer wat af is, of open je dagboek.</small></button>`;
    }
    const l = World.loc(s, c.ref);
    return `<div class="bc tk" ${attr} aria-label="${U.esc(l.name)}" style="${st}"><i style="background:${TEMPLATE_COLOR[l.template] || '#fff'}"></i><span>${U.esc(l.name)}</span></div>`;
  },
  // sel: the selected card (its family lights up); link: the card you pull threads from (v0.11.0, nothing dims)
  html(s, fam, sel, link) {
    const L = this.layout(s), byId = {}; L.cards.forEach((c) => { byId[c.id] = c; });
    if (link && !byId[link]) link = null;
    const hl = link ? new Set([link].concat(Pins.ends(s, link))) : sel ? this.linked(s, L, sel) : null;
    if (link) sel = link;
    let h = `<div class="bd${link ? ' linking' : hl ? ' focus' : ''}" style="height:${this.H}px">`;
    this.ZONES.forEach((z) => { h += `<div class="zn" style="left:${z[1]}px;top:${z[2]}px">${z[0]}</div>`; });
    this.folders(s).forEach((f) => { h += `<button class="zf" data-ui="archive" data-v="${f.zone}" style="left:${f.x}px;top:${f.y}px" aria-label="${U.esc(Pins.FOLDER[f.zone])}, ${f.n} ${f.n === 1 ? 'kaart' : 'kaarten'}"><i aria-hidden="true"></i>Archief · ${f.n}</button>`; });
    L.cards.forEach((c) => { const html = this.card(s, c, fam), cls = (hl && hl.has(c.id) ? ' hl' : '') + (sel === c.id ? ' sel' : ''); h += cls ? html.replace('class="bc ', 'class="bc' + cls + ' ') : html; });
    h += `<svg class="bt" viewBox="0 0 ${this.W} ${this.H}" style="height:${this.H}px" aria-hidden="true">`;
    if (hl && sel && !link) { const e = Evidence.get(s, sel.slice(2)); if (e) e.requires.forEach((r) => { const a = byId['d:' + r] || byId['s:' + r]; if (a) h += `<path class="req hl" d="${this.path(this.anchor(byId[sel], a), this.anchor(a, byId[sel]), 'req')}"/>`; }); }
    L.threads.forEach((t) => { const a = byId[t.a], b = byId[t.b]; const on = hl && hl.has(t.a) && hl.has(t.b); h += `<path class="${t.kind}${on ? ' hl' : ''}" d="${this.path(this.anchor(a, b), this.anchor(b, a), t.kind)}"/>`; });
    L.threads.forEach((t) => { if (t.kind === 'said') return; [[byId[t.a], byId[t.b]], [byId[t.b], byId[t.a]]].forEach((q2) => { const q = this.anchor(q2[0], q2[1]); h += `<circle cx="${q[0]}" cy="${q[1]}" r="4"/>`; }); });
    return { html: h + '</svg></div>', L: L };
  },
  detail(s, id, fam) {
    const k = id === 'case' ? 'case' : id.split(':')[0], ref = id.slice(k.length + 1);
    let h = '<button class="sp-x" data-sp="unsel">Sluiten</button>';
    if (k === 'p' && !s.play.met[ref]) {
      const n = World.npc(s, ref), hh = (s.play.heardOf || {})[ref];
      h += `<div style="float:left;margin:0 12px 6px 0">${this.blank(80)}</div><h3>${U.esc(n.name)}</h3><p>Je kent ${U.esc(U.first(n))} alleen van naam. Genoemd ${U.esc(Mentions.source(s, hh))}.</p>`;
      h += `<p class="sp-note" style="clear:both">Interessant om uit te zoeken. Vraag rond wie ${U.esc(U.first(n))} is en waar je ${U.pr(n).hem} kunt vinden. Zodra je ${U.pr(n).hem} spreekt, wordt deze kaart actief.</p>`;
      return h + this.tools(s, id);
    }
    if (k === 'o') {
      const l = s.world.locations.find((x) => x.objects.some((o) => o.id === ref)), o = l.objects.find((x) => x.id === ref);
      h += `<h3>Nog bekijken: ${U.esc(o.name)}</h3><p>Bij ${U.esc(l.name)} viel je iets op aan ${U.esc(o.name)}, maar je wist nog te weinig. Kom terug zodra je meer weet.</p>`;
      return h + this.tools(s, id);
    }
    if (k === 'l' && !s.play.visited[ref]) {
      const l = World.loc(s, ref), T = Travel.check(s, ref);
      h += `<h3>${U.esc(l.name)}</h3><p>Je hebt van deze plek gehoord, maar je bent er nog niet geweest.</p><p class="sp-note">Open van ${l.open[0]} tot ${l.open[1]} uur. Lopen kost ${T.walk} minuten.</p>`;
      if (!s.visit && !s.play.ended && T.open && !T.late) h += `<button class="sp-btn" data-sp="visit" data-v="${l.id}">Ga erheen (${T.walk} min, aankomst ${U.hm(T.at)})</button>`;
      return h + this.tools(s, id);
    }
    if (k === 'p') {
      const n = World.npc(s, ref), r = s.relations[n.id], tone = Rels.toneOf(s, n.id), bar = (lab, v, c) => `<span>${lab}</span><i style="--v:${v}%;--c:${c}"></i>`;
      h += `<div style="float:left;margin:0 12px 6px 0;border:3px solid ${TONE_COLOR[tone]};background:${FAMILY[fam].photo}">${Silhouette.svg(n, { s: s, fam: fam, stance: TONE_STANCE[tone], w: 96 })}</div>`;
      h += `<h3>${U.esc(n.name)}</h3><p>${U.esc(n.role)}, ${n.age} jaar. Doet ${TONE_WORD[tone]} tegen je; houding: ${STANCE_LABEL[TONE_STANCE[tone]]}.</p><p><i>${U.esc(r.statusText)}</i></p>`;
      h += `<h4 style="clear:both">Relatie</h4><div class="relbar">${bar('Vertrouwen', r.trust, '#4f7f3a')}${bar('Genegenheid', r.affection, '#c48a1c')}${bar('Wrok', r.resentment, '#b9442f')}${bar('Argwaan', r.suspicion, '#2f6f8f')}</div>`;
      h += `<p class="sp-note" style="margin-top:10px">${U.esc(Rnd.cap(n.personality))}; ${U.esc(n.voice)}.</p>`;
      if (n.kenmerk) h += `<p><b>Opvallend:</b> ${U.esc(KENMERK[n.kenmerk].desc)}.</p>`;
      const al = s.alibis && s.alibis[n.id], chk = s.play.alibiCheck && s.play.alibiCheck[n.id];
      if (al && s.play.asked[n.id + ':alibi']) {
        const comp = al.withId ? World.npc(s, al.withId) : null;
        h += `<h4>Alibi</h4><p>Zegt om ${s.truth.crimeHour} uur in ${U.esc(World.loc(s, al.locId).name)} te zijn geweest, ${comp ? 'met ' + U.esc(comp.name) : 'alleen'}.</p>`;
        if (chk && Level.get(s).checkLabel) h += `<p class="sp-note">${String(chk.by).indexOf('obj:') === 0 ? 'Bevestigd door een gevonden stuk' : 'Gecontroleerd bij ' + U.esc(World.npc(s, chk.by).name)}: ${chk.ok ? 'klopt' : 'klopt niet'}.</p>`;
      }
      const now = Schedule.at(s, n.id, s.clock.day, s.clock.part);
      h += `<p class="sp-note">${s.clock.part >= DAY.parts ? 'Het is nacht; iedereen is thuis.' : 'Nu, in de ' + PARTS[s.clock.part] + ': ' + U.esc(World.loc(s, now).name) + '.'}</p>`;
    } else if (k === 'case') {
      h += `<h3>${U.esc(s.meta.title)}</h3><p>${U.esc(s.crime.summary)}</p><p>${U.esc(s.crime.personalHook)}</p><p>${U.esc(s.evidence[0].text)}</p><p class="sp-note">${U.esc(s.meta.settingSummary || '')}</p>`;
    } else if (k === 'l') {
      const l = World.loc(s, ref), open = PARTS.slice(0, DAY.parts).filter((x, i) => World.openAt(l, i));
      h += `<h3>${U.esc(l.name)}</h3><p>${U.esc(l.description)}</p><p class="sp-note">Open in de ${open.join(', ') || 'geen enkel dagdeel'}.</p>`;
      const T = Travel.check(s, l.id);
      if (!s.visit && !s.play.ended && T.open && !T.late) h += `<button class="sp-btn" data-sp="visit" data-v="${l.id}">${T.here ? 'Ga naar binnen' : 'Ga erheen (' + T.walk + ' min, aankomst ' + U.hm(T.at) + ')'}</button>`;
    } else if (k === 's' && ref.indexOf('con_') === 0) {
      const c = s.contradictions.find((x) => x.id === ref), n = World.npc(s, c.npcId);
      h += `<h3>Verklaring van ${U.esc(n.name)}</h3><p>${U.esc(c.claim)}</p>` + (s.play.resolved[c.id] ? `<p class="sp-note">Doorgeprikt.${c.reveal ? ' ' + U.esc(c.reveal) : ''}</p>` : `<p class="sp-note">Nog niet getoetst.</p>`);
    } else {
      const e = Evidence.get(s, ref);
      h += `<h3>${U.esc(e.title)}</h3><p>${U.esc(e.text)}</p>`;
      if (e.source.type === 'object') { const l = World.loc(s, e.source.locationId); h += `<p class="sp-note">Gevonden: ${U.esc(l.name)}, ${U.esc(l.objects.find((o) => o.id === e.source.objectId).name)}.</p>`; }
      if (e.source.npcId) h += `<p class="sp-note">Bron: ${U.esc(World.npc(s, e.source.npcId).name)}.</p>`;
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
  // threads and archive under every detail panel
  tools(s, id) {
    if (!Pins.ok(s, id)) return '';
    const ends = Pins.ends(s, id).filter((o) => Pins.ok(s, o)).sort((a, b) => this.title(s, a).localeCompare(this.title(s, b), 'nl')), z = Pins.zone(id);
    let h = `<h4>Je draadjes</h4>` + (ends.length ? `<ul class="sp-threads">${ends.map((o) => `<li>${U.esc(this.title(s, o))}${Pins.archived(s, o) ? ' <i>(in het archief)</i>' : ''}</li>`).join('')}</ul>`
      : `<p class="sp-note">Nog geen draadjes. Je draadjes zijn notities: pas het zaakverslag toetst je conclusie.</p>`);
    h += `<div class="sp-acts"><button class="sp-btn" data-sp="linkmode" data-v="${id}">Draadje trekken</button>` + (z !== 'case' ? `<button class="sp-btn" data-sp="arch" data-v="${id}">Naar ${Pins.FOLDER[z]}</button>` : '') + '</div>';
    return h;
  },
  // the side panel while you pull threads from one card
  linkPanel(s, from) {
    const ends = Pins.ends(s, from).filter((o) => Pins.ok(s, o)).sort((a, b) => this.title(s, a).localeCompare(this.title(s, b), 'nl'));
    let h = `<button class="sp-x" data-sp="linkdone">Klaar</button><h3>Draadjes trekken</h3><p>Vanaf <b>${U.esc(this.title(s, from))}</b>. Tik op kaarten op het bord om ze te verbinden. Tik nog eens om een draadje los te halen.</p>`;
    h += `<h4>Verbonden met</h4>` + (ends.length ? `<div class="sp-chips">${ends.map((o) => `<button class="sp-chip on" data-sp="unthread" data-a="${U.esc(from)}" data-b="${U.esc(o)}" aria-label="Haal het draadje naar ${U.esc(this.title(s, o))} los">${U.esc(this.title(s, o))}${Pins.archived(s, o) ? ' (archief)' : ''} ×</button>`).join('')}</div>` : '<p class="sp-note">Nog niets.</p>');
    return h + `<button class="sp-btn go wide" data-sp="linkdone">Klaar</button>`;
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
const MAP_INK = { house: ['#c9ad84', '#b99a72', '#d4bf98'], street: '#ebe3cf', casing: '#7a6850', lane: '#b9a983', water: '#89b8c9', shore: '#5f97a8', park: '#8fb873', tree: '#6e9856', treeLine: '#3b522f', field: ['#cfc58c', '#a9bf7a', '#d8c79a'], square: '#e6d9b8', block: '#d9cdb0' };
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
    let h = `<defs><pattern id="hs-field" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a7f50" stroke-opacity=".28" stroke-width="1.4"/></pattern></defs>`;
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
        if (c.story && M.sites.some((p) => p.id === c.story && p.tpl === 'markt')) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = m.x + Math.cos(a) * 26, y = m.y + Math.sin(a) * 17; h += `<rect x="${(x - 5).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="10" height="8" fill="#e0b34a" fill-opacity=".8" stroke="#1f2933" stroke-opacity=".5" stroke-width="1"/>`; }
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
    for (let k = 0; k < 18; k++) { const x = 20 + r.next() * (W - 40), y = 20 + r.next() * (H - 40); if (wet(x, y, -8) && wet(x + 22, y, -8)) h += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q5.5 -3 11 0 t11 0" fill="none" stroke="#e3f0f3" stroke-opacity=".6" stroke-width="1.3"/>`; }
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
        h += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#7a5a3a" stroke-width="7" stroke-linecap="square"/>`;
        const bt = { x: b.x - uy * 13 - ux * 8, y: b.y + ux * 13 - uy * 8 }; if (w.wet(bt.x, bt.y, -4)) h += `<ellipse cx="${bt.x.toFixed(1)}" cy="${bt.y.toFixed(1)}" rx="11" ry="4.5" transform="rotate(${(p.dir * 180 / Math.PI).toFixed(1)} ${bt.x.toFixed(1)} ${bt.y.toFixed(1)})" fill="#a3563a" fill-opacity=".85" stroke="var(--sp-ink)" stroke-opacity=".6" stroke-width="1"/>`; }
      if (p.kind === 'gate') { h += `<rect x="${(p.x - 16).toFixed(1)}" y="${(p.y - 16).toFixed(1)}" width="32" height="32" rx="3" fill="${col}" fill-opacity=".7" stroke="var(--sp-ink)" stroke-opacity=".5" stroke-width="1.2"/>`; }
      if (p.kind === 'lot' || p.kind === 'quay') { const c = p.cell, a = c ? Math.atan2(c.P[1].y - c.P[0].y, c.P[1].x - c.P[0].x) * 180 / Math.PI : 0;
        h += `<rect x="${(p.x - 21).toFixed(1)}" y="${(p.y - 15).toFixed(1)}" width="42" height="30" rx="2" transform="rotate(${a.toFixed(1)} ${p.x} ${p.y})" fill="${col}" fill-opacity=".8" stroke="var(--sp-ink)" stroke-opacity=".55" stroke-width="1.3"/>`; }
    });
    // compass rose, top right
    h += `<g transform="translate(1134 62)" opacity=".8"><circle r="26" fill="var(--sp-panel)" stroke="var(--sp-ink)" stroke-width="1.5"/><path d="M0 -22 L5 -5 L22 0 L5 5 L0 22 L-5 5 L-22 0 L-5 -5 Z" fill="none" stroke="var(--sp-ink)" stroke-width="1.3"/><path d="M0 -22 L4 -4 L-4 -4 Z" fill="var(--sp-thread)"/><text y="-29" text-anchor="middle" font-size="11" font-weight="700" fill="var(--sp-ink)">N</text></g>`;
    M.bg = `<g pointer-events="none">${h}</g>`; return M.bg;
  },
  // v0.11.0: one "?" per person you do not know yet, at most three; more than three shows a "3+" tag beside them
  unknownBadges: (n) => n <= 0 ? [] : Array.from({ length: Math.min(3, n) }, () => '?').concat(n > 3 ? ['3+'] : []),
  svg(s, M, part, sel) {
    const P = M.pos, met = s.cast.filter((n) => s.play.met[n.id]).sort(byName), here = s.visit ? s.visit.locId : s.pos || null;
    const crimeLocId = s.crime && s.crime.crimeLocationId, victimLocId = s.crime && s.crime.victimLocationId;
    const vFirst = s.crime && s.crime.victim ? U.first(s.crime.victim) : 'slachtoffer';
    let h = `<svg viewBox="0 0 ${this.W} ${this.H}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Stadskaart">` + this.ground(M);
    s.world.locations.forEach((l) => {
      const p = P[l.id], open = World.openAt(l, part), up = p.above, tw = l.name.length * 8.4;
      const lx = Math.max(tw / 2 + 8, Math.min(this.W - tw / 2 - 8, p.x)), ly = up ? p.y - 24 : p.y + 36;
      const isCrime = l.id === crimeLocId, isVic = l.id === victimLocId;
      const ariaExtra = (isCrime ? ', plaats van het voorval' : '') + (isVic ? ', plek van ' + s.crime.victim.name : '') + (open ? '' : ', gesloten');
      const tplCol = TEMPLATE_COLOR[l.template] || '#c98b4e';
      h += `<g class="stn${open ? '' : ' closed'}${here === l.id ? ' here' : ''}${sel === l.id ? ' sel' : ''}" data-stn="${l.id}" tabindex="0" role="button" aria-label="${U.esc(l.name + ariaExtra)}">`;
      h += `<circle cx="${p.x}" cy="${p.y}" r="30" fill="transparent"/>`;
      if (here === l.id) h += `<circle cx="${p.x}" cy="${p.y}" r="31" fill="none" stroke="var(--sp-ink)" stroke-width="3" stroke-dasharray="5 4"><title>Hier ben je nu</title></circle>`;
      if (l.id === s.startLoc) h += `<circle cx="${p.x}" cy="${p.y}" r="22" fill="none" stroke="var(--sp-thread)" stroke-width="3.5"><title>Hier logeer je</title></circle>`;
      if (sel === l.id) h += `<circle class="selring" cx="${p.x}" cy="${p.y}" r="27" fill="none" stroke="var(--sp-thread)" stroke-width="4"/>`;
      h += `<circle class="dot" cx="${p.x}" cy="${p.y}" r="14" fill="${open ? 'var(--sp-stn)' : 'var(--sp-line)'}" stroke="var(--sp-stnline)" stroke-width="3.5"${open ? '' : ' stroke-dasharray="4 3"'}/>`;
      h += `<path d="M${p.x - 7} ${p.y + 5} L${p.x - 7} ${p.y - 2} L${p.x} ${p.y - 8} L${p.x + 7} ${p.y - 2} L${p.x + 7} ${p.y + 5} Z" fill="${open ? tplCol : 'var(--sp-mute)'}" stroke="var(--sp-stnline)" stroke-width="1.4"/>`;
      if (isCrime) h += `<g transform="translate(${p.x - 16} ${p.y - 15})"><title>Plaats van het voorval (${U.esc(l.name)})</title><circle r="8.5" fill="#b3312a" stroke="var(--sp-mapbg)" stroke-width="2"/><path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`;
      if (isVic) h += `<g transform="translate(${p.x + 16} ${p.y - 15})"><title>Werk/woning van ${U.esc(s.crime.victim.name)}</title><rect x="-7" y="-7" width="14" height="14" rx="2" transform="rotate(45)" fill="#c48a1c" stroke="var(--sp-mapbg)" stroke-width="2"/><circle r="2.2" fill="#fff"/></g>`;
      h += `<text class="lbl" x="${lx.toFixed(1)}" y="${ly}" text-anchor="middle">${U.esc(l.name)}</text>`;
      if (!open) h += `<text class="sub" x="${lx.toFixed(1)}" y="${up ? ly - 17 : ly + 16}" text-anchor="middle">${part >= DAY.parts ? 'dicht, het is nacht' : 'dicht in de ' + PARTS[part]}</text>`;
      // people present: known core people, known extras, and a "?" per stranger (at most three, then "3+")
      const presentAll = open ? s.cast.concat(s.crowd).filter((n) => Schedule.at(s, n.id, s.clock.day, part) === l.id) : [];
      const who = met.filter((n) => open && Schedule.at(s, n.id, s.clock.day, part) === l.id), fig = presentAll.filter((n) => !People.isCore(s, n.id) && People.known(s, n.id)).sort(byName);
      const unk = Math.max(0, presentAll.length - who.length - fig.length);
      const badges = who.map((n) => ({ kind: 'met', n: n })).concat(fig.map((n) => ({ kind: 'fig', n: n }))).concat(this.unknownBadges(unk).map((t) => ({ kind: t === '?' ? 'unk' : 'more', t: t })));
      const by = up ? p.y + 30 : p.y - 30, step = 23, x0 = Math.max(16, Math.min(this.W - 16 - (badges.length - 1) * step, p.x - (badges.length - 1) * step / 2));
      badges.forEach((b, k) => {
        const x = +(x0 + k * step).toFixed(1), y = by;
        if (b.kind === 'met') h += `<g><title>${U.esc(b.n.name)} (aanwezig)</title><circle cx="${x}" cy="${y}" r="10" fill="${Silhouette.accent(b.n.role)}" stroke="var(--sp-mapbg)" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${U.esc(b.n.name.charAt(0))}</text></g>`;
        else if (b.kind === 'fig') h += `<g><title>${U.esc(b.n.name)} (bijfiguur)</title><circle cx="${x}" cy="${y}" r="10" fill="var(--sp-mute)" stroke="var(--sp-mapbg)" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${U.esc(b.n.name.charAt(0))}</text></g>`;
        else if (b.kind === 'unk') h += `<g class="unk"><title>Iemand die je nog niet kent</title><circle cx="${x}" cy="${y}" r="10" fill="var(--sp-panel)" stroke="var(--sp-mute)" stroke-width="2" stroke-dasharray="3 2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--sp-ink)">?</text></g>`;
        else h += `<g class="unk-more"><title>Meer dan drie mensen die je nog niet kent</title><rect x="${x - 12}" y="${y - 9}" width="24" height="18" rx="9" fill="var(--sp-panel)" stroke="var(--sp-mute)" stroke-width="1.6"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--sp-ink)">3+</text></g>`;
      });
      h += '</g>';
    });
    // legend, bottom left
    const cy = this.H - 126;
    h += `<g class="cart" transform="translate(20 ${cy})" pointer-events="none"><rect width="376" height="114" rx="6" fill="var(--sp-panel)" stroke="var(--sp-ink)" stroke-width="2"/><text class="t" x="14" y="26">Kaart van ${U.esc(s.world.city.name)}</text>`;
    h += `<circle cx="22" cy="46" r="6" fill="none" stroke="var(--sp-thread)" stroke-width="3"/><text x="34" y="50">logies</text>`;
    h += `<circle cx="104" cy="46" r="6.5" fill="#b3312a"/><path d="M101.5 43.5 L106.5 48.5 M106.5 43.5 L101.5 48.5" stroke="#fff" stroke-width="1.6"/><text x="116" y="50">plaats delict</text>`;
    h += `<rect x="217" y="41" width="10" height="10" rx="1.5" transform="rotate(45 222 46)" fill="#c48a1c"/><text x="234" y="50">plek v. ${U.esc(vFirst)}</text>`;
    h += `<circle cx="22" cy="72" r="7.5" fill="var(--sp-panel)" stroke="var(--sp-mute)" stroke-width="1.8" stroke-dasharray="2 2"/><text x="22" y="76" text-anchor="middle" font-size="10" font-weight="700">?</text><text x="36" y="76" font-size="12">onbekende, 3+ is meer dan drie · dag ${s.clock.day}, ${PARTS[part]}</text>`;
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
    const loc = World.loc(s, locId), open = World.openAt(loc, part), k = this.kindOf(loc.template), hs = [], at = (x) => Schedule.at(s, x.id, s.clock.day, part) === loc.id;
    // v0.8.0 (nieuw A): core people and figuranten share one shuffled line-up, so where someone stands says nothing
    const all = open ? s.cast.filter(at).concat(s.crowd.filter(at)).sort((a, b) => a.id.localeCompare(b.id)) : [], mix = Rnd.pickN(RNG.make(s.seed + '|stage|' + loc.id + '|' + s.clock.day + '|' + part), all, all.length);
    mix.forEach((x, i) => {
      const core = People.isCore(s, x.id), front = i < 6, sl = front ? this.PEOPLE[k][i] : this.CROWD[k][(i - 6) % 5], j = front ? 0 : Math.floor((i - 6) / 5);
      hs.push({ id: (core ? 'npc:' : 'crowd:') + x.id, kind: core ? 'npc' : 'crowd', ref: x, x: sl[0] + j * 36, y: sl[1], k: front ? 0.92 : 0.8, back: !front });
    });
    let free = 0;
    loc.objects.forEach((o) => {
      const prop = o.prop || this.prop(o.name, loc.template), fixed = loc.template === 'herberg' && HERBERG_BOX[prop], sl = fixed || this.SLOTS[k === 'herberg' ? 'inside' : k][free++ % 5];
      hs.push({ id: 'obj:' + o.id, kind: 'obj', ref: o, box: { x: sl[0], y: sl[1], w: sl[2], h: sl[3] }, prop: prop });
    });
    return { loc: loc, part: part, open: open, kind: k, hs: hs };
  },
  sky(part, fam, x, y, w, h) {
    const col = fam === 'toekomst' ? ['#3d6b7a', '#2c5a78', '#0b1626'][part] : ['#d7e6e4', '#9cc6d6', '#24324a'][part];
    let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}"/>`;
    if (part === 0) g += `<circle cx="${x + w * 0.25}" cy="${y + h * 0.8}" r="${Math.min(w, h) * 0.16}" fill="#fbe8b4"/>`;
    if (part === 1) g += `<ellipse cx="${x + w * 0.6}" cy="${y + h * 0.3}" rx="${w * 0.22}" ry="${h * 0.07}" fill="#fff" opacity=".7"/>`;
    if (part === 2) { g += `<circle cx="${x + w * 0.72}" cy="${y + h * 0.28}" r="${Math.min(w, h) * 0.09}" fill="#f2ecd2"/>`; for (let i = 0; i < 7; i++) g += `<circle cx="${(x + (i * 37 % w)).toFixed(0)}" cy="${(y + 8 + (i * 23 % (h * 0.6))).toFixed(0)}" r="1.4" fill="#f2ecd2"/>`; }
    return g;
  },
  window(fam, part, x, y, w, h, P) {
    const sill = `<rect x="${x - 8}" y="${y + h}" width="${w + 16}" height="10" fill="${P.wood2}"/>`;
    let g = this.sky(part, fam, x, y, w, h);
    if (fam === 'oud') {
      const arch = `M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`;
      for (let i = -8; i < 8; i++) { const x0 = x + i * 22; g += `<path d="M${x0} ${y} L${x0 + h} ${y + h} M${x0 + w} ${y} L${x0 + w - h} ${y + h}" stroke="${P.ink}" stroke-width="1.5" opacity=".5"/>`; }
      return `<g><clipPath id="wclip"><path d="${arch}"/></clipPath><g clip-path="url(#wclip)">${g}</g><path d="${arch}" fill="none" stroke="${P.wood}" stroke-width="10"/>${sill}</g>`;
    }
    if (fam === 'klassiek') g += `<path d="M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}" stroke="${P.trim}" stroke-width="6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${P.trim}" stroke-width="10"/>` +
      `<path d="M${x - 14} ${y - 6} L${x + 8} ${y + h + 10} L${x - 14} ${y + h + 10} Z M${x + w + 14} ${y - 6} L${x + w - 8} ${y + h + 10} L${x + w + 14} ${y + h + 10} Z" fill="${P.accent}" opacity=".85"/>`;
    if (fam === 'modern') { for (let i = 1; i < 9; i++) g += `<rect x="${x}" y="${y + i * h / 9 - 3}" width="${w}" height="4" fill="${P.trim}" opacity=".8"/>`; g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#e9e4d6" stroke-width="8"/>`; }
    if (fam === 'toekomst') return `<g>${g}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${P.accent}" stroke-width="3"/><rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="8" fill="none" stroke="${P.accent}" stroke-opacity=".3" stroke-width="6"/></g>`;
    return `<g>${g}${sill}</g>`;
  },
  lamp(fam, x, P) {
    if (fam === 'oud') return `<g><path d="M${x} 26 L${x} 70" stroke="${P.ink}" stroke-width="2"/><ellipse cx="${x}" cy="74" rx="38" ry="6" fill="none" stroke="${P.wood}" stroke-width="5"/>` +
      [-30, -10, 10, 30].map((d) => `<rect x="${x + d - 2.5}" y="58" width="5" height="14" fill="#efe3c1"/><path d="M${x + d} 50 q-3 4 0 8 q3 -4 0 -8" fill="#ffcf5a"/>`).join('') + '</g>';
    if (fam === 'klassiek') return `<g><path d="M${x} 26 L${x} 84" stroke="${P.ink}" stroke-width="2"/><path d="M${x - 16} 108 Q${x} 78 ${x + 16} 108 Z" fill="#f4d98a" opacity=".9"/><rect x="${x - 18}" y="106" width="36" height="7" rx="3" fill="${P.wood}"/><path d="M${x - 9} 84 L${x + 9} 84 L${x + 5} 92 L${x - 5} 92 Z" fill="${P.wood}"/></g>`;
    if (fam === 'modern') return `<g><path d="M${x} 26 L${x} 90" stroke="${P.ink}" stroke-width="2"/><path d="M${x - 34} 120 Q${x} 72 ${x + 34} 120 Z" fill="${P.accent}"/><ellipse cx="${x}" cy="120" rx="34" ry="5" fill="#ffe7a8"/></g>`;
    return `<rect x="${x - 70}" y="30" width="140" height="6" rx="3" fill="${P.accent}"/><rect x="${x - 76}" y="26" width="152" height="14" rx="7" fill="${P.accent}" opacity=".25"/>`;
  },
  back(M, P, fam) {
    const tpl = M.loc.template, k = M.kind, part = M.part, wall = k === 'herberg' ? P.wall : Hex.mix(P.wall, TEMPLATE_COLOR[tpl] || P.wall, 0.28);
    let g = '';
    if (k !== 'outside') {
      g += `<rect width="960" height="410" fill="${wall}"/><rect y="298" width="960" height="112" fill="${Hex.mix(P.wood2, wall, 0.25)}"/><rect y="292" width="960" height="8" fill="${P.trim}" opacity=".7"/>`;
      if (fam === 'klassiek') for (let x = 30; x < 960; x += 60) g += `<rect x="${x}" y="0" width="20" height="292" fill="#000" opacity=".05"/>`;
      if (fam === 'toekomst') for (let x = 0; x < 960; x += 120) g += `<rect x="${x}" y="0" width="2" height="410" fill="${P.accent}" opacity=".18"/>`;
      g += `<rect y="400" width="960" height="140" fill="${P.floor}"/>`;
      for (let y = 428; y < 540; y += 30) g += `<rect y="${y}" width="960" height="2" fill="#000" opacity=".12"/>`;
      g += `<rect width="960" height="26" fill="${P.wood}"/>`;
      if (fam !== 'toekomst') [150, 470, 790].forEach((x) => { g += `<rect x="${x}" y="26" width="16" height="16" fill="${P.wood}"/>`; });
      if (k === 'herberg') g += this.window(fam, part, 600, 96, 120, 150, P) + this.lamp(fam, 300, P) + this.lamp(fam, 690, P);
      else g += this.window(fam, part, 396, 82, 120, 140, P) + this.lamp(fam, 640, P);
      if (k === 'herberg') {   // set dressing that is not a hotspot: shelves, bottles, barrel
        g += `<rect x="40" y="150" width="360" height="9" fill="${P.wood2}"/><rect x="40" y="214" width="360" height="9" fill="${P.wood2}"/>`;
        for (let i = 0; i < 9; i++) { const x = 52 + i * 38, tall = i % 3 !== 1;
          g += tall ? `<rect x="${x}" y="112" width="13" height="38" rx="3" fill="${['#3f5e3a', '#6b2d2a', '#4b3a24'][i % 3]}"/><rect x="${x + 4}" y="102" width="5" height="12" fill="${['#3f5e3a', '#6b2d2a', '#4b3a24'][i % 3]}"/>`
            : `<rect x="${x - 2}" y="128" width="18" height="22" rx="3" fill="${P.trim}"/>`;
          g += `<rect x="${x + 2}" y="${190}" width="16" height="24" rx="3" fill="${i % 2 ? P.trim : '#8a6a44'}"/>`; }
        g += `<ellipse cx="438" cy="396" rx="26" ry="36" fill="${P.wood2}"/><rect x="412" y="380" width="52" height="5" fill="${P.ink}" opacity=".6"/><rect x="412" y="406" width="52" height="5" fill="${P.ink}" opacity=".6"/>`;
      }
      return g;
    }
    // outside: sky, skyline by family, ground by template
    g += this.sky(part, fam, 0, 0, 960, 330);
    const sk = RNG.make('skyline|' + M.loc.id + '|' + M.loc.name); let x = -10;
    while (x < 960) { const w = 70 + sk.int(70), hgt = 90 + sk.int(110), y = 330 - hgt, c = Hex.mix(P.stone, ['#d7e6e4', '#9cc6d6', '#24324a'][part], 0.35);
      if (fam === 'oud' || fam === 'klassiek') g += `<path d="M${x} 330 L${x} ${y} L${x + w / 2} ${y - 34} L${x + w} ${y} L${x + w} 330 Z" fill="${c}"/>`;
      else if (fam === 'modern') g += `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="${c}"/>`;
      else g += `<rect x="${x + 10}" y="${y - 60}" width="${w - 20}" height="${hgt + 60}" rx="6" fill="${c}"/>`;
      for (let wy = y + 14; wy < 316; wy += 26) for (let wx = x + 12; wx < x + w - 16; wx += 22) g += `<rect x="${wx}" y="${wy}" width="9" height="12" fill="${part === 2 ? (fam === 'toekomst' ? P.accent : '#f4d98a') : '#000'}" opacity="${part === 2 ? 0.7 : 0.12}"/>`;
      x += w + 6; }
    const ground = tpl === 'park' ? '#7f9f5c' : tpl === 'haven' ? Hex.mix(P.stone, '#000', 0.1) : Hex.mix(P.stone, '#fff', 0.15);
    g += `<rect y="330" width="960" height="210" fill="${ground}"/>`;
    if (tpl === 'haven') g += `<rect y="340" width="960" height="70" fill="#5f97a8"/><path d="M0 360 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#cfe5ea" stroke-width="2" opacity=".6"/><path d="M640 352 L760 352 L740 372 L660 372 Z" fill="${P.wood}"/><path d="M700 352 L700 300 L730 346 Z" fill="${P.trim}"/><rect y="408" width="960" height="8" fill="${P.wood}"/>`;
    if (tpl === 'park') for (let i = 0; i < 6; i++) g += `<circle cx="${80 + i * 170}" cy="${300 - (i % 2) * 20}" r="${44 + (i % 3) * 8}" fill="#4f7a3e"/>`;
    if (tpl === 'markt') { g += `<path d="M0 120 Q240 170 480 120 Q720 170 960 120" fill="none" stroke="${P.ink}" stroke-width="2"/>`; for (let i = 0; i < 16; i++) g += `<path d="M${30 + i * 60} ${126 + Math.sin(i) * 8} l12 26 l12 -26 Z" fill="${['#b9442f', '#e0b34a', '#2f6f8f'][i % 3]}"/>`; }
    if (tpl === 'poort') g += `<path d="M330 330 L330 150 L630 150 L630 330 L560 330 L560 240 A80 80 0 0 0 400 240 L400 330 Z" fill="${Hex.mix(P.stone, '#000', 0.15)}"/>`;
    if (tpl !== 'park' && tpl !== 'haven') for (let y = 360; y < 540; y += 28) g += `<rect y="${y}" width="960" height="2" fill="#000" opacity=".1"/>`;
    return g;
  },
  drawProp(kind, b, P, fam) {
    const x = b.x, y = b.y, w = b.w, h = b.h, W = P.wood, W2 = P.wood2, S = P.stone, T = P.trim, ink = P.ink;
    switch (kind) {
      case 'counter': return `<rect x="${x - 10}" y="${y}" width="${w + 20}" height="16" fill="${W2}"/><rect x="${x}" y="${y + 16}" width="${w}" height="${h - 16}" fill="${W}"/>` +
        [0, 1, 2, 3].map((i) => `<rect x="${x + 14 + i * w / 4}" y="${y + 34}" width="${w / 4 - 28}" height="${h - 64}" fill="none" stroke="${W2}" stroke-width="4"/>`).join('') +
        [0, 1, 2].map((i) => `<rect x="${x + 110 + i * 34}" y="${y - 30}" width="8" height="30" rx="3" fill="${T}"/><circle cx="${x + 114 + i * 34}" cy="${y - 32}" r="6" fill="${P.accent}"/>`).join('');
      case 'table': return `<rect x="${x}" y="${y}" width="${w}" height="16" rx="3" fill="${W2}"/><rect x="${x + 14}" y="${y + 16}" width="12" height="${h - 16}" fill="${W}"/><rect x="${x + w - 26}" y="${y + 16}" width="12" height="${h - 16}" fill="${W}"/>` +
        `<rect x="${x + 70}" y="${y - 34}" width="14" height="34" rx="4" fill="#6b2d2a"/><rect x="${x + 74}" y="${y - 46}" width="6" height="14" fill="#6b2d2a"/><path d="M${x + 110} ${y - 20} l14 0 l-3 12 l-8 0 Z M${x + 132} ${y - 20} l14 0 l-3 12 l-8 0 Z" fill="#f2e6c6"/><rect x="${x + 116}" y="${y - 8}" width="2" height="8" fill="#f2e6c6"/><rect x="${x + 138}" y="${y - 8}" width="2" height="8" fill="#f2e6c6"/>`;
      case 'hearth': return `<rect x="${x - 10}" y="${y}" width="${w + 20}" height="18" fill="${W2}"/><rect x="${x}" y="${y + 18}" width="${w}" height="${h - 18}" fill="${S}"/>` +
        `<path d="M${x + 26} ${y + h} L${x + 26} ${y + h * 0.42} Q${x + w / 2} ${y + h * 0.22} ${x + w - 26} ${y + h * 0.42} L${x + w - 26} ${y + h} Z" fill="#1d1712"/>` +
        (fam === 'toekomst' ? `<rect x="${x + 36}" y="${y + h * 0.55}" width="${w - 72}" height="10" rx="5" fill="${P.accent}"/><rect x="${x + 36}" y="${y + h * 0.7}" width="${w - 72}" height="10" rx="5" fill="${P.accent}" opacity=".6"/>`
          : `<path d="M${x + w / 2 - 30} ${y + h - 6} q10 -50 22 -30 q6 -34 18 -6 q12 -26 14 4 q10 -18 6 32 Z" fill="#e8892c"/><path d="M${x + w / 2 - 14} ${y + h - 6} q6 -28 14 -16 q8 -16 12 16 Z" fill="#f7d36b"/>`);
      case 'door': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${W}"/>` + [1, 2, 3].map((i) => `<rect x="${x + i * w / 4 - 1}" y="${y + 6}" width="2" height="${h - 12}" fill="#000" opacity=".25"/>`).join('') +
        `<rect x="${x + 8}" y="${y + h * 0.3}" width="${w - 16}" height="7" fill="${ink}" opacity=".5"/><rect x="${x + 8}" y="${y + h * 0.7}" width="${w - 16}" height="7" fill="${ink}" opacity=".5"/><circle cx="${x + w - 16}" cy="${y + h / 2}" r="5" fill="${T}"/>`;
      case 'ledger': return `<rect x="${x + w * 0.15}" y="${y + h * 0.35}" width="${w * 0.7}" height="${h * 0.3}" rx="2" fill="#efe3c1" stroke="${ink}" stroke-width="2"/><path d="M${x + w / 2} ${y + h * 0.35} L${x + w / 2} ${y + h * 0.65}" stroke="${ink}" stroke-width="2"/>` +
        (h > 60 ? `<rect x="${x + w * 0.1}" y="${y + h * 0.65}" width="${w * 0.8}" height="10" fill="${W2}"/><rect x="${x + w * 0.45}" y="${y + h * 0.65 + 10}" width="${w * 0.1}" height="${h * 0.35 - 10}" fill="${W}"/>` : '');
      case 'desk': return `<rect x="${x}" y="${y + h * 0.45}" width="${w}" height="14" fill="${W2}"/><rect x="${x + 8}" y="${y + h * 0.45 + 14}" width="${w * 0.36}" height="${h * 0.55 - 14}" fill="${W}"/>` +
        [0, 1, 2].map((i) => `<rect x="${x + 16}" y="${y + h * 0.45 + 22 + i * (h * 0.55 - 20) / 3}" width="${w * 0.36 - 16}" height="4" fill="#000" opacity=".25"/>`).join('') +
        `<rect x="${x + w - 18}" y="${y + h * 0.45 + 14}" width="10" height="${h * 0.55 - 14}" fill="${W}"/><rect x="${x + w * 0.55}" y="${y + h * 0.45 - 10}" width="${w * 0.25}" height="10" fill="#efe3c1" stroke="${ink}" stroke-width="1.5"/>` +
        (fam === 'modern' || fam === 'toekomst' ? `<rect x="${x + w * 0.12}" y="${y + h * 0.45 - 40}" width="44" height="34" rx="3" fill="${fam === 'toekomst' ? P.accent : '#d9d2c0'}" stroke="${ink}" stroke-width="2"/>` : `<rect x="${x + w * 0.16}" y="${y + h * 0.45 - 24}" width="12" height="24" fill="${T}"/>`);
      case 'cabinet': case 'rack': return `<rect x="${x + w * 0.1}" y="${y}" width="${w * 0.8}" height="${h}" fill="${W}"/>` +
        [1, 2, 3].map((i) => `<rect x="${x + w * 0.1}" y="${y + i * h / 4 - 3}" width="${w * 0.8}" height="6" fill="${W2}"/>`).join('') +
        (kind === 'rack' ? [0, 1, 2, 3].map((i) => `<path d="M${x + w * 0.2 + i * w * 0.17} ${y + 12} l0 ${h / 4 - 18}" stroke="${S}" stroke-width="5"/>`).join('')
          : [0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((i) => `<rect x="${x + w * 0.16 + i * w * 0.13}" y="${y + r * h / 4 + 10}" width="${w * 0.09}" height="${h / 4 - 16}" fill="${['#8a3b2e', '#3f5e3a', '#5b4a7a', '#a3763a', '#2f5f80'][(i + r) % 5]}"/>`).join('')).join(''));
      case 'stand': return `<rect x="${x + w * 0.3}" y="${y + h * 0.5}" width="${w * 0.4}" height="${h * 0.5}" fill="${W}"/><rect x="${x + w * 0.27}" y="${y + h * 0.5 - 8}" width="${w * 0.46}" height="10" fill="${W2}"/><rect x="${x + w * 0.36}" y="${y + h * 0.62}" width="${w * 0.28}" height="5" fill="#000" opacity=".25"/><rect x="${x + w * 0.42}" y="${y + h * 0.5 - 40}" width="14" height="32" fill="${T}"/><path d="M${x + w * 0.42 - 8} ${y + h * 0.5 - 40} l15 -18 l15 18 Z" fill="#f4d98a"/>`;
      case 'crate': return `<rect x="${x + w * 0.15}" y="${y + h * 0.35}" width="${w * 0.7}" height="${h * 0.65}" fill="${W2}" stroke="${W}" stroke-width="5"/><path d="M${x + w * 0.15} ${y + h * 0.35} L${x + w * 0.85} ${y + h}" stroke="${W}" stroke-width="5"/>`;
      case 'stall': return `<rect x="${x}" y="${y + h * 0.5}" width="${w}" height="${h * 0.5}" fill="${W2}"/><path d="M${x - 8} ${y + h * 0.3} L${x + w + 8} ${y + h * 0.3} L${x + w} ${y} L${x} ${y} Z" fill="${P.accent}"/>` +
        [0, 1, 2, 3].map((i) => `<rect x="${x + i * w / 4}" y="${y}" width="${w / 8}" height="${h * 0.3}" fill="#f2ead4" opacity=".7"/>`).join('') + `<rect x="${x + 4}" y="${y + h * 0.3}" width="6" height="${h * 0.2}" fill="${W}"/><rect x="${x + w - 10}" y="${y + h * 0.3}" width="6" height="${h * 0.2}" fill="${W}"/>`;
      case 'pump': return `<rect x="${x + w / 2 - 12}" y="${y + 20}" width="24" height="${h - 20}" fill="${S}"/><rect x="${x + w / 2 - 18}" y="${y + 10}" width="36" height="14" rx="6" fill="${ink}" opacity=".7"/><path d="M${x + w / 2 + 12} ${y + 60} l26 0 l0 10" stroke="${S}" stroke-width="8" fill="none"/><path d="M${x + w / 2 - 12} ${y + 40} l-30 -20" stroke="${ink}" stroke-width="5"/>`;
      case 'board': return `<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h * 0.55}" fill="${W2}" stroke="${W}" stroke-width="6"/>` + [0, 1, 2].map((i) => `<rect x="${x + 22 + i * (w - 44) / 3}" y="${y + 22 + (i % 2) * 10}" width="${(w - 60) / 3}" height="${h * 0.3}" fill="#f2ead4" transform="rotate(${i - 1} ${x + w / 2} ${y + h / 3})"/>`).join('') +
        `<rect x="${x + 22}" y="${y + 10 + h * 0.55}" width="8" height="${h * 0.45 - 10}" fill="${W}"/><rect x="${x + w - 30}" y="${y + 10 + h * 0.55}" width="8" height="${h * 0.45 - 10}" fill="${W}"/>`;
      case 'bench': return `<rect x="${x}" y="${y + h * 0.45}" width="${w}" height="12" fill="${W2}"/><rect x="${x}" y="${y + h * 0.2}" width="${w}" height="10" fill="${W2}"/><rect x="${x + 10}" y="${y + h * 0.2}" width="8" height="${h * 0.8}" fill="${W}"/><rect x="${x + w - 18}" y="${y + h * 0.2}" width="8" height="${h * 0.8}" fill="${W}"/>`;
      case 'tree': return `<rect x="${x + w / 2 - 12}" y="${y + h * 0.4}" width="24" height="${h * 0.6}" fill="${W}"/><circle cx="${x + w / 2}" cy="${y + h * 0.3}" r="${w * 0.38}" fill="#4f7a3e"/><circle cx="${x + w / 2 - w * 0.22}" cy="${y + h * 0.42}" r="${w * 0.22}" fill="#5c8a47"/>`;
      case 'steps': return [0, 1, 2, 3].map((i) => `<rect x="${x + i * 10}" y="${y + h - (i + 1) * h / 4}" width="${w - i * 20}" height="${h / 4}" fill="${Hex.mix(S, '#fff', i * 0.08)}" stroke="${ink}" stroke-width="1.5" stroke-opacity=".4"/>`).join('');
      case 'scale': return `<rect x="${x + w / 2 - 4}" y="${y + 20}" width="8" height="${h - 20}" fill="${ink}"/><path d="M${x + 20} ${y + 30} L${x + w - 20} ${y + 30}" stroke="${ink}" stroke-width="4"/><path d="M${x + 6} ${y + 60} L${x + 20} ${y + 30} L${x + 34} ${y + 60} Z M${x + w - 34} ${y + 60} L${x + w - 20} ${y + 30} L${x + w - 6} ${y + 60} Z" fill="${T}"/>`;
      case 'bollard': return `<rect x="${x + w / 2 - 16}" y="${y + h * 0.3}" width="32" height="${h * 0.7}" rx="6" fill="${ink}" opacity=".85"/><rect x="${x + w / 2 - 22}" y="${y + h * 0.3}" width="44" height="12" rx="5" fill="${ink}"/><path d="M${x + w / 2} ${y + h * 0.4} q-60 10 -80 50" stroke="${T}" stroke-width="4" fill="none"/>`;
      case 'nets': return `<path d="M${x} ${y + h} Q${x + w / 2} ${y} ${x + w} ${y + h} Z" fill="#7a6a4a"/>` + [1, 2, 3, 4].map((i) => `<path d="M${x + i * w / 5} ${y + h} Q${x + w / 2} ${y + h * 0.2} ${x + w - i * w / 5} ${y + h}" stroke="#c9b98a" stroke-width="1.5" fill="none"/>`).join('');
      case 'hut': return `<rect x="${x + 10}" y="${y + h * 0.3}" width="${w - 20}" height="${h * 0.7}" fill="${W2}"/><path d="M${x} ${y + h * 0.32} L${x + w / 2} ${y} L${x + w} ${y + h * 0.32} Z" fill="${W}"/><rect x="${x + w * 0.3}" y="${y + h * 0.45}" width="${w * 0.4}" height="${h * 0.25}" fill="${part2(fam)}"/>`;
      case 'lamp': return `<rect x="${x + w / 2 - 4}" y="${y}" width="8" height="${h}" fill="${ink}"/><path d="M${x + w / 2 - 16} ${y + 6} L${x + w / 2 + 16} ${y + 6} L${x + w / 2 + 10} ${y + 30} L${x + w / 2 - 10} ${y + 30} Z" fill="#f4d98a" stroke="${ink}" stroke-width="3"/>`;
      case 'shop': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${W}"/><rect x="${x + 12}" y="${y + 30}" width="${w - 24}" height="${h - 44}" fill="#cfe0e3"/><rect x="${x}" y="${y}" width="${w}" height="22" fill="${P.accent}"/>`;
      case 'hedge': return `<rect x="${x}" y="${y + h * 0.3}" width="${w}" height="${h * 0.7}" rx="20" fill="#4f7a3e"/><path d="M${x} ${y + h} L${x + w} ${y + h * 0.75}" stroke="#d8c79c" stroke-width="16" opacity=".7"/>`;
      default: return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${W2}"/>`;
    }
  },
  label(hs, s, M) { return hs.kind === 'obj' ? Rnd.cap(hs.ref.name) : People.label(s, hs.ref, M ? M.hs.filter((x) => x.kind !== 'obj').map((x) => x.ref) : []); },
  svg(s, locId, part, fam, selId) {
    const M = this.model(s, locId, part), P = FAMILY[fam].pal, front = new Set(['table']), lab = (x) => U.esc(this.label(x, s, M));
    let h = `<svg class="tab" viewBox="0 0 960 540" role="group" aria-label="${U.esc(M.loc.name)}"><defs><radialGradient id="glow"><stop offset="0" stop-color="${fam === 'toekomst' ? P.accent : '#ffd27a'}" stop-opacity="${fam === 'toekomst' ? 0.3 : 0.55}"/><stop offset="1" stop-color="${fam === 'toekomst' ? P.accent : '#ffd27a'}" stop-opacity="0"/></radialGradient></defs>`;
    h += this.back(M, P, fam);
    const objG = (o) => `<g class="hs obj${selId === o.id ? ' on' : ''}" data-hs="${o.id}" tabindex="0" role="button" aria-label="${lab(o)}">${this.drawProp(o.prop, o.box, P, fam)}<rect class="ring" x="${o.box.x - 4}" y="${o.box.y - 4}" width="${o.box.w + 8}" height="${o.box.h + 8}" rx="8"/></g>`;
    const figG = (o) => `<g class="hs${selId === o.id ? ' on' : ''}" data-hs="${o.id}" tabindex="0" role="button" aria-label="${lab(o)}"><ellipse class="ring" cx="${o.x}" cy="${o.y}" rx="${46 * o.k}" ry="${11 * o.k}"/>` +
      `<g transform="translate(${(o.x - 50 * o.k).toFixed(1)} ${(o.y - 260 * o.k).toFixed(1)}) scale(${o.k})">${Silhouette.figure(o.ref, { s: s, fam: fam, mode: 'full', stance: o.kind === 'npc' && s.play.met[o.ref.id] ? TONE_STANCE[Rels.toneOf(s, o.ref.id)] : 0 })}</g>` +
      `<rect x="${o.x - 40 * o.k}" y="${o.y - 262 * o.k}" width="${80 * o.k}" height="${262 * o.k}" fill="transparent"/></g>`;
    // herberg: crowd standing in the counter's span is drawn behind it (staff and regulars at the bar)
    const behind = (o) => M.kind === 'herberg' && o.back && o.x < 400, mid = new Set(M.kind === 'herberg' ? ['counter', 'ledger'] : []);
    M.hs.filter((o) => o.kind === 'obj' && !front.has(o.prop) && !mid.has(o.prop)).forEach((o) => { h += objG(o); });
    M.hs.filter(behind).forEach((o) => { h += figG(o); });
    M.hs.filter((o) => o.kind === 'obj' && mid.has(o.prop)).sort((a, b) => (a.prop === 'counter' ? 0 : 1) - (b.prop === 'counter' ? 0 : 1)).forEach((o) => { h += objG(o); });
    M.hs.filter((o) => o.kind !== 'obj' && o.back && !behind(o)).forEach((o) => { h += figG(o); });
    M.hs.filter((o) => o.kind !== 'obj' && !o.back).forEach((o) => { h += figG(o); });
    M.hs.filter((o) => o.kind === 'obj' && front.has(o.prop)).forEach((o) => { h += objG(o); });
    if (part === 0) h += `<rect width="960" height="540" fill="#fff3d6" opacity=".1" pointer-events="none"/>`;
    if (part >= 2) { h += `<rect width="960" height="540" fill="#141c2e" opacity="${M.kind === 'outside' ? 0.34 : 0.28}" pointer-events="none"/>`;
      (M.kind === 'herberg' ? [[300, 110], [690, 110], [858, 380]] : M.kind === 'inside' ? [[640, 120]] : []).forEach((q) => { h += `<circle cx="${q[0]}" cy="${q[1]}" r="230" fill="url(#glow)" style="mix-blend-mode:screen" pointer-events="none"/>`; }); }
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
      `<div class="iv-rrow"><span>${lab} ${dBadge(key)}</span><i style="--v:${val}%;--c:${col}"></i></div>`;

    const left = `<aside class="iv-left" style="--tone:${TONE_COLOR[tone]};--phbg:${F.photo}">
      <div class="iv-frame" data-tone="${tone}" data-stance="${STANCE_LABEL[stance]}">
        <div class="iv-badge">${U.esc(TONE_WORD[tone])} · houding: ${STANCE_LABEL[stance]}</div>
        <div class="iv-sil">${Silhouette.svg(npc, { s: s, fam: fam, mode: 'full', stance: stance, w: 176 })}</div>
      </div>
      <div class="iv-meta">
        <h3>${U.esc(npc.name)}</h3>
        <p class="sp-note">${U.esc(npc.role)} · ${U.esc(pace.label)}</p>
        <div class="iv-rels">
          ${bar('trust', 'Vertrouwen', r.trust, '#4f7f3a')}
          ${bar('affection', 'Genegenheid', r.affection, '#c48a1c')}
          ${bar('resentment', 'Wrok', r.resentment, '#b9442f')}
          ${bar('suspicion', 'Argwaan', r.suspicion, '#2f6f8f')}
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
        <div class="iv-lines">${lines.map((ln, li) => `<p class="iv-line" data-line="${li}">${U.esc(ln)}</p>`).join('')}</div>
      </div>`;
    }).join('');

    // 3. Rechterkolom onder: Aanpak, Vraagkaarten op tafel & Bewijskaarten uit het bord
    const topics = Dialogue.topics(s, npc), cons = Dialogue.confronts(s, npc);
    const hasHeardClaim = s.contradictions.some((c) => c.npcId === npc.id && s.play.heard[c.id] && !s.play.resolved[c.id]);
    const boardEvs = Evidence.found(s).filter((e) => e.route !== 'start' && !s.play.debunked[e.id]);

    const tCards = topics.map((t) => {
      const isLead = t.id.indexOf('ev:') === 0;
      const kind = t.id === 'alibi' ? 'Alibi' : t.id === 'crime' ? 'De zaak' : t.id.indexOf('chk:') === 0 ? 'Controle' : t.id === 'xt' ? 'Teruggeven' : isLead ? 'Spoor' : 'Kennismaking';
      return `<button class="iv-qcard${isLead ? ' lead' : ''}" data-ui="topic" data-v="${U.esc(t.id)}">
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
          ${showEv ? `<button class="sp-chip" data-ui="evtoggle">Sluit bewijsmap</button>` : ''}
        </div>
        <div class="iv-evcards">
          ${boardEvs.map((e) => `<button class="iv-evcard" data-ui="playev" data-v="${U.esc(e.id)}">
            <span class="pin"></span><small>${U.esc(e.slot === 'motive' ? 'Motief' : e.slot === 'method' ? 'Werkwijze' : 'Bewijsstuk')}</small>
            <b>${U.esc(e.title)}</b>
          </button>`).join('') || '<p class="sp-note">Je hebt nog geen bruikbare bewijsstukken op het bord.</p>'}
        </div>
      </div>`;
    }

    const right = `<section class="iv-right">
      <div class="iv-paper" data-ui="skip-type" title="Tik om tekst direct te tonen">
        <div class="iv-phead"><span>Verhoortranscript · ${U.esc(World.here(s).name)}</span><small class="iv-skip-hint">Tik op het papier om versneld te lezen</small></div>
        <div class="iv-log">${strips}</div>
      </div>
      <div class="iv-desk">
        <div class="iv-bar">
          <div class="sp-chips seg">
            <span class="sp-note" style="margin-right:4px">Toon:</span>
            ${Object.keys(APPROACH).map((k) => `<button class="sp-chip${approach === k ? ' on' : ''}" data-ui="approach" data-v="${k}">${APPROACH[k].label}${Level.get(s).toneHint && Dialogue.best(npc) === k ? ' ★' : ''}</button>`).join('')}
          </div>
          <div class="iv-actions">
            ${Dialogue.canTreat(s, npc) ? `<button class="sp-chip" data-ui="treat" data-v="${npc.id}">Trakteer (${TREAT_COST} ${U.esc(s.meta.eraRules.currency || '')})</button>` : ''}
            ${hasHeardClaim && !autoTray && !showEv ? `<button class="sp-chip" data-ui="evtoggle">Bewijsstuk voorleggen…</button>` : ''}
            <button class="sp-btn" data-ui="talkend">Verhoor afronden</button>
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

const part2 = (fam) => fam === 'toekomst' ? '#5fd3c7' : '#cfe0e3';

/* ---------------- Spoorboek: static mock-up of the time-place diagram (evening 18:00-24:00) ----------------
   Not engine data: derived by hand from the current case. In v0.6.5 the segments come from truth.night.
   v0.6.1: not shown in the game (the tab returns in v0.6.5); kept for its test and as the reference. */
const SB_COLOR = ['#b9442f', '#2f6f8f', '#c48a1c', '#4f7f3a', '#7a4f9a'];
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
          text: 'Alles kost tijd. Aanspreken en onderzoeken ' + Level.cost(s, 'examine') + ' minuten, verhoren ' + Level.cost(s, 'talk') + ', lopen naar een andere plek 15 tot 45. Binnen een gesprek zijn alle vragen gratis. Om twaalf en om vijf uur gaan de mensen naar hun volgende plek.', btn: 'Volgende' };
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
    cast.forEach((n, i) => { const tone = Rels.toneOf(s, n.id); line += `<g transform="translate(${40 + i * lw} 30)">${Silhouette.figure(n, { s: s, fam: fam, mode: 'full', stance: TONE_STANCE[tone] })}</g>`; });
    line += '</svg>';
    let h = `<h3>De mensen van deze zaak</h3><p class="sp-note">Op naam gesorteerd. Houding volgt de toon tegen jou; de kaderkleur ook. De accentkleur hoort bij de publieke rol.</p><div class="lineup">${line}<div class="strip" style="padding:6px 0 10px 40px;gap:0">` +
      cast.map((n) => `<figure style="width:${lw}px"><b>${U.esc(U.first(n))}</b>${U.esc(n.role.replace(/ \(.*\)$/, ''))}</figure>`).join('') + '</div></div>';
    const ref = cast[0];
    h += `<h3>Drie houdingen</h3><div class="strip">` + ['warm', 'cold', 'hostile'].map((t) => `<figure><span class="frame" style="--c:${TONE_COLOR[t]};background:${FAMILY[fam].photo}">${Silhouette.svg(ref, { s: s, fam: fam, stance: TONE_STANCE[t], w: 88 })}</span><b>${STANCE_LABEL[TONE_STANCE[t]]}</b>${TONE_WORD[t]}</figure>`).join('') + '</div>';
    h += `<h3>Dezelfde persoon in vier tijdvakken</h3><div class="strip">` + ['oud', 'klassiek', 'modern', 'toekomst'].map((f) => `<figure><span class="frame" style="width:110px;height:200px;background:${FAMILY[f].photo}">${Silhouette.svg(ref, { s: s, fam: f, mode: 'full', w: 74 })}</span><b>${f}</b></figure>`).join('') + '</div>';
    h += `<h3>Figuranten</h3><p class="sp-note">Bijfiguren zijn grijzer, zodat de mensen die je kunt verhoren eruit springen.</p><div class="strip">` +
      crowd.map((c) => `<figure><span class="frame" style="background:${FAMILY[fam].photo}">${Silhouette.svg(c, { s: s, fam: fam, crowd: true, w: 80 })}</span><b>${U.esc(U.first(c))}</b>${U.esc(c.role)}</figure>`).join('') + '</div>';
    return `<div class="fg">${h}</div>`;
  }
};

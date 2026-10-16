'use strict';
const APP = Object.freeze({ title: 'Het Spoor', version: 'v0.12.0', schema: 8 });

/* ---------------- Config ---------------- */
const OPEN_HOURS = { herberg: [6, 24], huis: [8, 21], markt: [8, 18], kantoor: [8, 18], archief: [9, 17], werkplaats: [7, 18], haven: [0, 24], poort: [0, 24], plein: [0, 24], park: [0, 24], straat: [0, 24] };
// v0.12.0: time runs on a clock from 08:00 to 22:00. Walking and every action in a visit cost minutes; the parts of
// the day (ochtend, middag, avond) still decide where people are and which places are open.
const PARTS = ['ochtend', 'middag', 'avond', 'nacht'];   // part 3 (night): only endDay is possible
const PART_START = [480, 720, 1020], NIGHT = 1320;          // minutes since midnight: 08:00, 12:00, 17:00, 22:00
const COST = { greet: 15, mingle: 15, examine: 15, talk: 30 }; // minutes; Makkelijk takes two thirds
const PART_HOUR = [10, 14, 20];                           // representative hour per part, checked against OPEN_HOURS
const DAY = { parts: 3, soft: 4, budget: 12 };            // budget: 4 days x 3 parts (A1); soft deadline after day 4 (A7)
const SCHED_DAYS = 7;                                     // schedule length; repeats after a week
const TREAT_COST = 2;
const CRIME_HOUR = 21;
const APPROACH = {
  warm: { label: 'Warm', d: { trust: 3, affection: 2, resentment: -1 } },
  reserved: { label: 'Terughoudend', d: { trust: 1 } },
  sharp: { label: 'Scherp', d: { trust: -3, resentment: 3, suspicion: 2 } }
};
// v0.9.0 (voorstel 6): the same approach lands differently per temperament; fit is good, ok or bad
const TONE_FIT = {
  open: { warm: ['good', { trust: 4, affection: 3, resentment: -1 }], reserved: ['ok', { trust: 1 }], sharp: ['bad', { trust: -4, resentment: 4, suspicion: 2 }] },
  gesloten: { warm: ['bad', { affection: 1, suspicion: 3 }], reserved: ['good', { trust: 3, affection: 1 }], sharp: ['bad', { trust: -3, resentment: 3, suspicion: 2 }] },
  scherp: { warm: ['bad', { trust: -1, affection: 1, suspicion: 2 }], reserved: ['ok', { trust: 1 }], sharp: ['good', { trust: 3, suspicion: 1 }] },
  peinzend: { warm: ['ok', { trust: 2, affection: 2 }], reserved: ['good', { trust: 3, affection: 1 }], sharp: ['bad', { trust: -3, resentment: 3, suspicion: 2 }] }
};
// v0.9.0 (voorstel 7): the plot-DNA twist decides one game twist
const TWIST_GAME = { zondebok: 'zondebok', manipulatie: 'zondebok', valsegetuige: 'medeplichtige', identiteit: 'medeplichtige', aangever: 'medeplichtige' };
const TONE_WORD = { warm: 'hartelijk', neutral: 'beleefd', cold: 'koel', hostile: 'vijandig' };
// v0.8.0 (fase 3a, nieuw B): a much larger object pool per place type, with era-bound objects. Each entry is
// [name, prop, eras]; prop is what the tableau draws (for the inn: one of its five fixed spots), eras = null means all.
const E_OUD = ['middeleeuwen'], E_KL = ['e1895', 'e1925', 'e1955'], E_MO = ['e1978', 'e1994'], E_TK = ['toekomst'], E_NOUD = E_KL.concat(E_MO, E_TK), E_NU = E_MO.concat(E_TK);
const OBJ_POOL = {
  herberg: [['de tapkast', 'counter'], ['de toonbank', 'counter', E_OUD.concat(E_KL)], ['de bar', 'counter', E_NU], ['de stamtafel', 'table'], ['de speeltafel', 'table'], ['de hoektafel', 'table'],
    ['de open haard', 'hearth', E_OUD.concat(E_KL)], ['de kachel', 'hearth', E_KL.concat(E_MO)], ['de warmtewand', 'hearth', E_TK], ['het gastenboek', 'ledger'], ['het kasboek', 'ledger'],
    ['het reserveringsboek', 'ledger', E_NU], ['de kelderdeur', 'door'], ['de keukendeur', 'door'], ['de achterdeur', 'door']],
  markt: [['een kraam met stoffen', 'stall'], ['een viskraam', 'stall'], ['een groentekraam', 'stall'], ['de weegschaal', 'scale'], ['een stapel kisten', 'crate'], ['het prijzenbord', 'board'],
    ['het marktregister', 'ledger'], ['een handkar', 'crate'], ['een mand met brood', 'crate', E_OUD.concat(E_KL)], ['de kassa van de bloemist', 'desk', E_NU], ['de betaalzuil', 'lamp', E_TK]],
  plein: [['de waterpomp', 'pump', E_OUD.concat(E_KL)], ['de fontein', 'pump', E_NU], ['het mededelingenbord', 'board'], ['een bank onder de linde', 'bench'], ['de trappen van het raadhuis', 'steps'],
    ['de kiosk', 'hut', E_KL.concat(E_MO)], ['een lantaarnpaal', 'lamp', E_NOUD], ['een fietsenrek', 'rack', E_MO], ['het infoscherm', 'board', E_TK], ['de schandpaal', 'bollard', E_OUD]],
  huis: [['het bureau', 'desk'], ['de kast in de gang', 'cabinet'], ['de schoorsteenmantel', 'hearth'], ['een stapel brieven', 'ledger'], ['het nachtkastje', 'stand'], ['de boekenkast', 'cabinet'],
    ['de kapstok', 'rack'], ['de keukentafel', 'desk'], ['een naaimand', 'crate', E_OUD.concat(E_KL, E_MO)], ['het telefoontafeltje', 'stand', ['e1925', 'e1955'].concat(E_MO)], ['de wandkist', 'crate', E_OUD], ['het huisscherm', 'board', E_TK]],
  kantoor: [['de archiefkast', 'cabinet'], ['het grote bureau', 'desk'], ['de postbakken', 'ledger'], ['het kasboek', 'ledger'], ['het bezoekersregister', 'ledger'], ['de kluis', 'cabinet', E_NOUD],
    ['de typemachine', 'desk', E_KL.concat(E_MO)], ['de telex', 'desk', E_MO], ['de terminal', 'desk', E_TK], ['de prullenbak', 'crate'], ['het rooster aan de muur', 'board'], ['de schrijfpultkist', 'cabinet', E_OUD]],
  haven: [['de meerpaal', 'bollard'], ['een stapel netten', 'nets'], ['het laadregister', 'ledger'], ['het wachthuisje', 'hut'], ['een opgerold touw', 'nets'], ['een rij vaten', 'crate'],
    ['het getijdenbord', 'board'], ['een omgekeerde roeiboot', 'crate'], ['de laadkraan', 'rack', E_NOUD]],
  poort: [['het wachthokje', 'hut'], ['het doorlaatregister', 'ledger'], ['de zware deur', 'door'], ['een bank langs de muur', 'bench'], ['het tolbord', 'board'], ['een lantaarn aan de muur', 'lamp'],
    ['de slagboom', 'rack', E_NOUD], ['de scanpoort', 'door', E_TK]],
  werkplaats: [['de werkbank', 'desk'], ['het gereedschapsrek', 'rack'], ['een kist met afval', 'crate'], ['de oven', 'hearth'], ['het orderboek', 'ledger'], ['een stapel planken', 'crate'],
    ['de draaibank', 'desk', E_NOUD], ['het prikbord', 'board', E_NOUD], ['de printer', 'desk', E_TK], ['het aambeeld', 'crate', E_OUD.concat(E_KL)]],
  archief: [['de registers', 'cabinet'], ['de leestafel', 'desk'], ['een afgesloten kast', 'cabinet'], ['de kaartenbak', 'cabinet'], ['het uitleenboek', 'ledger'], ['een ladder bij de rekken', 'rack'],
    ['een doos met losse stukken', 'crate'], ['de leesmachine', 'desk', E_MO], ['de datakluis', 'cabinet', E_TK], ['een kist met oorkonden', 'crate', E_OUD.concat(E_KL)]],
  park: [['een bank bij de vijver', 'bench'], ['het tuinhuisje', 'hut'], ['een oude boom', 'tree'], ['het pad langs de heg', 'hedge'], ['de muziektent', 'hut', E_KL.concat(E_MO)], ['het hek bij de ingang', 'rack'],
    ['een vogelhuisje', 'tree'], ['een vuilnisbak', 'crate', E_NOUD]],
  straat: [['een lantaarnpaal', 'lamp', E_NOUD], ['een etalage', 'shop'], ['een aanplakbord', 'board'], ['de brievenbus', 'stand', E_NOUD], ['een telefooncel', 'hut', ['e1925', 'e1955'].concat(E_MO)],
    ['een laadpaal', 'lamp', E_TK], ['een regenton', 'crate']]
};
const TPL_OBJECTS = {}; Object.keys(OBJ_POOL).forEach((t) => { TPL_OBJECTS[t] = OBJ_POOL[t].map((x) => x[0]); });
const objPool = (tpl, era) => OBJ_POOL[tpl].filter((x) => !x[2] || x[2].indexOf(era) >= 0);
// what a non-evidence object can yield (weights); 'alibi' is placed on purpose, the rest is drawn
const YIELD_W = { none: 35, sched: 15, char: 12, coins: 12, topic: 10, hint: 16 };
const TOPIC_ITEMS = ['een oude foto', 'een vergeten brief', 'een geleend boek', 'een ingelijste oorkonde', 'een tekening van een kind', 'een verloren sleutelhanger'];
const REGISTER_OBJ = ['het gastenboek', 'het doorlaatregister', 'het laadregister', 'het bezoekersregister', 'het marktregister', 'het uitleenboek', 'het orderboek', 'het kasboek', 'het reserveringsboek', 'het aantekenboek'];
// v0.7.0 (fase 2): visible traits. Each core person carries one; the witness only saw the trait, never the face.
// The culprit shares the trait with suspect A, so the trait alone never names the culprit. Drawn by Silhouette.
const KENMERK = {
  glasses: { label: 'bril', met: 'een bril', saw: 'een bril op', desc: 'draagt een bril' },
  scarf: { label: 'sjaal', met: 'een sjaal', saw: 'een sjaal om', desc: 'draagt een sjaal' },
  badge: { label: 'speld', met: 'een speld', saw: 'een speld op de jas', desc: 'draagt een speld op de jas' },
  bag: { label: 'schoudertas', met: 'een schoudertas', saw: 'een tas over de schouder', desc: 'draagt een tas over de schouder' },
  book: { label: 'map', met: 'een map', saw: 'een map onder de arm', desc: 'heeft altijd een map onder de arm' },
  cane: { label: 'wandelstok', met: 'een wandelstok', saw: 'een wandelstok', desc: 'loopt met een wandelstok' }
};
// v0.7.0 (voorstel 9): difficulty. Makkelijk keeps every v0.6 help; Normaal and Moeilijk ask the player to deduce.
// v0.10.0: Moeilijk gets 4 attention points (was 3); it differs from Normaal only in help, not in room to act.
const LEVELS = {
  makkelijk: { label: 'Makkelijk', speed: 2 / 3, toneHint: true, threads: true, autoClear: true, dim: true, early: true, hint: true, checkLabel: true, clash: true },
  normaal: { label: 'Normaal', speed: 1, threads: false, autoClear: false, dim: false, early: true, hint: true, checkLabel: true, clash: true },
  moeilijk: { label: 'Moeilijk', speed: 1, threads: false, autoClear: false, dim: false, early: false, hint: false, checkLabel: false, clash: false }
};
const Level = { id: (s) => (s && s.settings && LEVELS[s.settings.level]) ? s.settings.level : 'normaal', get: (s) => LEVELS[Level.id(s)],
  // v0.12.0: minutes an action takes on this level, rounded to five
  cost: (s, kind) => Math.round((COST[kind] || 15) * (Level.get(s).speed || 1) / 5) * 5 };
// v0.6.5: crimes where the victim is gone (dead or missing); for the others the victim is still around
const VICTIM_ABSENT = ['moord', 'verdwijning', 'ontvoering'];
const CROWD_ROLES = {
  herberg: ['stamgast', 'dienster', 'kaartspeler', 'reiziger'], markt: ['marktkoopman', 'groenteboer', 'visverkoper', 'klant met een mand'],
  plein: ['straatveger', 'voorbijganger', 'oude man op een bank', 'waterhaalster'], huis: ['buurvrouw', 'buurman'], kantoor: ['bode', 'klerk in pauze'],
  haven: ['havenarbeider', 'visser', 'sjouwer'], poort: ['wachter', 'voerman'], werkplaats: ['leerling', 'knecht'], archief: ['lezer', 'kopiist'],
  park: ['wandelaar', 'tuinman'], straat: ['voorbijganger', 'venter']
};
// v0.8.0: roles you can see at a glance (only at the person's own place); the rest only shows after speaking
const SEEN_ROLES = new Set(['dienster', 'marktkoopman', 'groenteboer', 'visverkoper', 'straatveger', 'bode', 'havenarbeider', 'visser', 'sjouwer', 'wachter', 'voerman', 'leerling', 'knecht', 'kopiist', 'tuinman', 'venter', 'waterhaalster']);
const CROWD_F = new Set(['dienster', 'buurvrouw', 'waterhaalster']), CROWD_M = new Set(['buurman', 'oude man op een bank']);
// Placement of motive/method evidence (structure stays in code; all wording lives in the content pack)
const MOTIVE_TPL = { geld: ['kantoor', 'archief', 'huis'], liefde: ['huis', 'herberg', 'park'], schaamte: ['archief', 'kantoor'], bescherming: ['huis', 'werkplaats', 'herberg'],
  wraak: ['archief', 'kantoor'], macht: ['kantoor', 'archief'], angst: ['huis', 'herberg'], erfenis: ['kantoor', 'huis', 'archief'] };
const METHOD_TPL = { tijd: ['markt', 'kantoor', 'herberg'], identiteit: ['huis', 'werkplaats', 'herberg'], documenten: ['kantoor', 'archief'], afleiding: ['plein', 'markt', 'herberg'],
  vertrouwen: ['huis', 'kantoor'], plaatsen: ['werkplaats', 'markt'], telefoon: ['kantoor', 'herberg'], reis: ['poort', 'haven', 'kantoor'], onwetend: ['markt', 'werkplaats', 'haven'],
  bericht: ['kantoor', 'huis'], onmogelijk: ['huis', 'werkplaats'] };

// v0.6.3 (Richting C): Writer-style lead types mapped from dna.ids.styles
const LEAD_KINDS = ['notebook', 'trace', 'dossier', 'letter', 'mistake'];
const STYLE_LEAD = {
  gezelschap: 'notebook',   // Christie / Carr: gastenlijst of afspraaknotitie
  psych: 'notebook',        // Vermeer / Maigret: persoonlijke aantekeningen
  procedureel: 'trace',     // Baantjer / Holmes: ambachtsspoor + verwijzing
  noir: 'dossier',          // Chandler / Brown: uitgescheurd kasblad / doordrukvel
  dorp: 'letter',           // Midsomer: onverzonden brief over dorpsgeheim
  omgekeerd: 'mistake'      // Columbo: de kleine misrekening bij het opruimen
};
const STYLES = ['gezelschap', 'procedureel', 'dorp', 'psych', 'noir', 'omgekeerd'];
const WEATHERS = ['een zachte motregen', 'een frisse wind', 'bleek zonlicht', 'laaghangende nevel', 'een heldere, koude lucht', 'jagende wolken'];

/* ---------------- Content: all text banks as JSON (#content), importable and validated ----------------
   Data: { format, version, name, common: { key: [lines] }, eras: { eraId: { key: [lines] } } }
   A pool for (era, key) = lines of the key and all its ancestors (talk.warm.open <- talk.warm <- talk),
   from both the common layer and the era layer. Type 'one' (titles, items) does not inherit: the era
   layer replaces the common line. The schema lives in code, so a pack can never change game structure. */
const ERAS = ['middeleeuwen', 'e1895', 'e1925', 'e1955', 'e1978', 'e1994', 'toekomst'];
const TONES = ['warm', 'neutral', 'cold', 'hostile'];
const TEMPERS = ['open', 'gesloten', 'scherp', 'peinzend'];
const TEMPER = { 'joviaal maar snel beledigd': 'open', 'nieuwsgierig en praatgraag': 'open', 'charmant en aanpasbaar': 'open', 'zorgzaam tot bemoeizucht': 'open', 'grappig als afleiding': 'open',
  'zwijgzaam en waakzaam': 'gesloten', 'trots en gesloten': 'gesloten', 'verlegen en trouw': 'gesloten', 'argwanend tegenover vreemden': 'gesloten',
  'streng maar rechtvaardig': 'scherp', 'ambitieus en ongeduldig': 'scherp', 'eerlijk tot op het pijnlijke': 'scherp', 'sluw en geduldig': 'scherp',
  'bedachtzaam en nauwgezet': 'peinzend', 'melancholisch en filosofisch': 'peinzend', 'praktisch en ongeïnteresseerd in roddel': 'peinzend' };
const VOICE_STYLE = { 'spreekt kort en droog': 'kort', 'praat in omwegen en zegt zelden ja of nee': 'omweg', 'stelt vragen terug in plaats van te antwoorden': 'vraag', 'praat zacht en wacht lang met antwoorden': 'zacht',
  'vol spreekwoorden en gezegden': 'spreekwoord', 'spreekt snel en onderbreekt zichzelf': 'snel', 'zorgvuldig beleefd': 'beleefd', 'warm en gezellig, met bijnamen': 'bijnaam',
  'formeel en afstandelijk': 'formeel', 'droog humoristisch': 'droog', 'bijna fluisterend': 'fluister', 'luid en stellig': 'luid' };
const CONTENT_BANNED = /\b(bloed\w*|lijk|lijken|drugs|seks\w*|wapen\w*|steken|neergestoken|vermoord\w*|vergif\w*|mes|messen|geweer|pistool|bijl|wurg\w*|neergeschoten|schieten|doodgeslagen|verkracht\w*|naakt|jenever|brandewijn|whisky|rum|cognac|opium|morfine|cocaïne|heroïne|hasj|wiet|pillen)\b/i;
const ANACHRO = {
  middeleeuwen: /\b(telefo|telegra|trein|auto\b|radio|krant|courant|koffie|thee\b|sigar|fiets|politie|computer|scherm\b|elektr|foto|televisie|tv\b|gulden|krediet|drone|data|fax|kantine|supermarkt|proost|tram\b|gaslicht|lucifer|kassabon|teletekst|semafoon|diskette|feed|kopieer|patat)/i,
  e1895: /\b(telefo|auto\b|radio|computer|televisie|tv\b|drone|data|fax|krediet|supermarkt|teletekst|semafoon|diskette|feed|kopieer|patat)/i,
  e1925: /\b(computer|televisie|tv\b|drone|data|fax|krediet|supermarkt|teletekst|semafoon|diskette|feed|kopieer|patat)/i,
  e1955: /\b(computer|drone|data|fax|krediet|teletekst|semafoon|diskette|feed|internet|kopieer)/i,
  e1978: /\b(computer|drone|data|fax|krediet|teletekst|semafoon|diskette|feed|internet|mobiel)/i,
  e1994: /\b(drone|datastrip|krediet|smartphone|feed|locatielog|huisassistent)/i,
  toekomst: /\b(penning|gulden|telegra|courant|gaslicht|rijtuig|schout|diskette|semafoon|teletekst|fax\b|grammofoon)/i
};
const Content = {
  SCHEMA: null, PARENT: null, rawText: '', rawBase: null, base: null, cur: null, sig: '', lastReport: null, _cache: {},
  buildSchema() {
    const S = {}, def = (k, type, min, vars, need, era) => { S[k] = { type: type, min: min, vars: vars || [], need: need || [], era: !!era }; };
    // v0.6.3 (Richting A): Rich public context variables available to all dialogue, sub-grammars and narration
    const BASE = ['victim', 'city', 'public', 'nick', 'here', 'tpl', 'part', 'day', 'weather', 'style', 'crimeloc', 'customs', 'economy'];
    const NPC = ['first', 'name', 'hij', 'Hij', 'hem', 'zijn', 'role', 'home'];
    const ALL_VARS = BASE.concat(NPC);
    TONES.forEach((t) => TEMPERS.forEach((m) => def('talk.' + t + '.' + m, 'speech', 5, ALL_VARS, [], true)));
    Array.from(new Set(Object.values(VOICE_STYLE))).forEach((v) => { def('voice.' + v + '.open', 'frag', 2, ALL_VARS); def('voice.' + v + '.close', 'frag', 2, ALL_VARS); });
    // v0.6.3 (Richting A): Combinatorial sub-grammars {@sub.*}
    TEMPER && TEMPERS.forEach((m) => def('sub.groet.' + m, 'frag', 2, ALL_VARS));
    TONES.forEach((t) => def('sub.blik.' + t, 'frag', 2, ALL_VARS));
    def('sub.sfeer.stad', 'frag', 3, ALL_VARS);
    def('sub.sfeer.weer', 'frag', 3, ALL_VARS);
    def('sub.sfeer.zaak', 'frag', 3, ALL_VARS);
    def('nick.man', 'label', 1, [], [], true); def('nick.vrouw', 'label', 1, [], [], true);
    def('evade.cold', 'speech', 4, ALL_VARS, [], true); def('evade.hostile', 'speech', 4, ALL_VARS, [], true);
    def('crime.culprit.close', 'speech', 3, ALL_VARS.concat(['suspA']), ['suspA']); def('crime.culprit.distant', 'speech', 3, ALL_VARS);
    def('crime.culprit.sharp', 'raw', 2, ALL_VARS.concat(['clue']), ['clue']);
    def('crime.suspect.sharp', 'speech', 2, ALL_VARS); def('crime.suspect.calm', 'speech', 2, ALL_VARS); def('crime.confidant', 'speech', 3, ALL_VARS);
    def('crime.general', 'speech', 5, ALL_VARS, [], true);
    def('alibi.plain', 'speech', 5, ALL_VARS.concat(['place', 'other']), ['place'], true); def('alibi.hostileLead', 'raw', 2, ALL_VARS);
    def('alibi.culpritClaim', 'speech', 2, ALL_VARS.concat(['place', 'other']), ['place', 'other']); def('alibi.secretClaim', 'speech', 2, ALL_VARS);
    def('alibi.secretReveal', 'narr', 2, ALL_VARS.concat(['secret', 'regloc']), ['secret', 'regloc']);
    def('alibi.check.yes', 'speech', 2, ALL_VARS.concat(['x', 'place']), ['x']); def('alibi.check.no', 'speech', 2, ALL_VARS.concat(['x', 'place']), ['x']);
    def('ev.hook.text', 'narr', 2, ['v', 'loc', 'hour'], ['loc', 'hour']); def('ev.hook.present', 'narr', 2, ['v', 'loc', 'hour'], ['loc', 'hour']);
    // v0.6.3 (Richting C): Writer-style specific lead clues (notebook + 4 new style leads)
    const leadVars = ['v', 'initial', 'crole', 'locA', 'locB'], leadSameVars = ['v', 'initial', 'crole', 'locA'];
    def('ev.notebook.title', 'one', 1, ['v']); def('ev.notebook.item', 'one', 1, ['v']);
    def('ev.notebook.text', 'narr', 2, leadVars, ['initial', 'locA', 'locB']); def('ev.notebook.textSame', 'narr', 2, leadSameVars, ['initial', 'locA']);
    ['trace', 'dossier', 'letter', 'mistake'].forEach((k) => {
      def('ev.lead.' + k + '.title', 'one', 1, ['v']);
      def('ev.lead.' + k + '.item', 'one', 1, ['v']);
      const need2 = ['initial', 'locA', 'locB'], need1 = ['initial', 'locA'];   // v0.7.0: the trace lead gives an initial too, never the role
      def('ev.lead.' + k + '.text', 'narr', 2, leadVars, need2);
      def('ev.lead.' + k + '.textSame', 'narr', 2, leadSameVars, need1);
    });
    def('ev.witness.title', 'one', 1, ['first']); def('ev.witness.text', 'speech', 2, ['trait', 'loc', 'hour'], ['trait', 'loc']);
    def('ev.denial.title', 'one', 1, ['first', 'cfirst']);
    def('ev.motiveTalk.title', 'one', 1, ['first', 'cfirst']); def('ev.alibiBreak.title', 'one', 1, ['cfirst']);
    def('ev.alibiBreak.text', 'narr', 2, ['c', 'other', 'witness', 'hem', 'hij', 'loc', 'hour'], ['c', 'other', 'witness']);
    def('ev.red.letter.title', 'one', 1, ['first']); def('ev.red.letter.item', 'one', 1); def('ev.red.letter.text', 'narr', 2, ['a', 'v'], ['a']);
    def('ev.red.register.title', 'one', 1, ['first']); def('ev.red.register.text', 'narr', 2, ['obj', 'regloc', 'b', 'hour', 'Hij', 'hij'], ['b', 'obj', 'regloc']);
    def('ev.red.gossip.title', 'one', 1, ['first']); def('ev.red.gossip.text', 'speech', 2, ['a', 'v'], ['a']);
    Object.keys(MOTIVE_TPL).forEach((m) => { def('ev.motive.' + m + '.title', 'one', 1); def('ev.motive.' + m + '.item', 'one', 1); def('ev.motive.' + m + '.text', 'narr', 2, ['c', 'v'], ['c']); def('ev.motive.' + m + '.talk', 'speech', 2, ['c', 'v'], ['c']); });
    Object.keys(METHOD_TPL).forEach((m) => { def('ev.method.' + m + '.title', 'one', 1); def('ev.method.' + m + '.item', 'one', 1); def('ev.method.' + m + '.text', 'narr', 2, ['initial', 'v'], ['initial']); });
    def('crowd.any', 'speech', 12, BASE.concat(['place']), [], true);
    Object.keys(CROWD_ROLES).forEach((t) => def('crowd.tpl.' + t, 'speech', 2, BASE.concat(['place'])));
    Array.from(new Set([].concat.apply([], Object.values(CROWD_ROLES)))).forEach((r) => def('crowd.role.' + Content.slug(r), 'speech', 2, BASE.concat(['place'])));
    def('crowd.rumor', 'speech', 2, ['public'], ['public']); def('crowd.worry', 'speech', 2, ['name'], ['name']);
    def('crowd.guideWitness', 'speech', 2, ['first', 'Hij', 'hij'], ['first']); def('crowd.guidePapers', 'speech', 2, ['loc', 'victim'], ['loc']); def('crowd.quiet', 'narr', 2, ['name']);
    def('obj.examine', 'narr', 2, ['obj'], ['obj']); def('obj.tooEarly', 'narr', 2);
    // v0.8.0: object yields, returned objects, figurant schedule tips
    def('obj.done', 'narr', 2, ['obj'], ['obj']); def('obj.y.coins', 'narr', 2, ['obj', 'n', 'cur'], ['n']); def('obj.y.hint', 'narr', 2, ['obj', 'loc'], ['loc']);
    def('obj.y.alibi', 'narr', 2, ['obj', 'a', 'b', 'place', 'hour'], ['a', 'b']); def('obj.y.topic', 'narr', 2, ['obj', 'first', 'item'], ['first', 'item']);
    def('obj.y.sched', 'narr', 2, ['obj', 'name', 'part'], ['name', 'part']); def('obj.y.char', 'narr', 2, ['obj', 'name', 'role', 'trait'], ['name', 'trait']);
    def('xt.answer', 'speech', 2, ALL_VARS); def('tone.good', 'narr', 2, ALL_VARS); def('tone.bad', 'narr', 2, ALL_VARS);
    // v0.9.0: twists
    def('ev.twist.planted.title', 'one', 1, ['first']); def('ev.twist.planted.item', 'one', 1); def('ev.twist.planted.text', 'narr', 2, ['obj', 'a', 'initial'], ['a', 'initial']);
    def('ev.twist.accomplice.title', 'one', 1, ['cfirst']); def('ev.twist.accomplice.text', 'narr', 2, ['obj', 'place', 'hour', 'comp', 'c'], ['comp', 'c']);
    def('crowd.twist.zondebok', 'speech', 2, ['first'], ['first']); def('crowd.twist.medeplichtige', 'speech', 2, ['comp', 'c'], ['comp', 'c']);
    def('end.twist.zondebok', 'narr', 1, ALL_VARS.concat(['a']), ['a']); def('end.twist.medeplichtige', 'narr', 1, ALL_VARS.concat(['comp']), ['comp']); def('crowd.sched', 'speech', 2, BASE.concat(['name', 'part']), ['name', 'part']);
    Object.keys(TPL_OBJECTS).forEach((t) => def('obj.nothing.' + t, 'narr', 4, BASE, [], true));
    def('drink', 'label', 2, [], [], true);
    def('treat.narr', 'narr', 2, ALL_VARS.concat(['drink']), ['drink']); def('treat.ok', 'speech', 3, ALL_VARS.concat(['drink']), [], true); def('treat.hostile', 'raw', 2, ALL_VARS);
    def('night.sleep', 'narr', 2, BASE, [], true); def('night.soft', 'narr', 2, ['day']); def('night.late', 'narr', 2); def('clock.closing', 'narr', 2, ['loc'], ['loc']);
    def('visit.leave', 'narr', 2, ['loc', 'part', 'next', 'weather'], ['loc']); def('day.wait', 'narr', 2, ['part', 'next', 'weather'], ['part']);
    def('confront.lead', 'narr', 2, ALL_VARS.concat(['title']), ['title']); def('confront.culprit.close', 'raw', 2, ALL_VARS.concat(['loc']), ['loc']); def('confront.culprit.distant', 'raw', 2, ALL_VARS);
    def('flip.culprit', 'narr', 2, ALL_VARS); def('flip.friend', 'narr', 2, ALL_VARS); def('flip.love', 'narr', 2, ALL_VARS);
    def('accuse.solved', 'narr', 1, BASE); def('accuse.mismatch', 'narr', 1); def('accuse.person', 'raw', 1, ALL_VARS); def('accuse.evidence', 'raw', 1, ALL_VARS);
    def('end.open', 'narr', 1, ALL_VARS.concat(['motive', 'method']), ['name']);
    STYLES.forEach((st) => def('end.style.' + st, 'narr', 1, ALL_VARS.concat(['motive', 'method'])));
    def('end.close', 'raw', 1, ALL_VARS); def('end.distant', 'narr', 1, ALL_VARS);
    [0, 1, 2, 3].forEach((q) => def('end.quality.' + q, 'narr', 1));
    def('epi.love', 'narr', 2, ALL_VARS);
    ['warm', 'neutral', 'cold'].forEach((t) => ['none', 'friend', 'love', 'enemy'].forEach((a) => def('epi.' + t + '.' + a, 'narr', 3, ALL_VARS, [], true)));
    // ancestors: allowed as inheritance keys when every descendant shares the type
    const P = {};
    Object.keys(S).forEach((k) => { if (S[k].type === 'one') return; const parts = k.split('.'); for (let i = 1; i < parts.length; i++) { const a = parts.slice(0, i).join('.'); (P[a] = P[a] || []).push(k); } });
    this.PARENT = {};
    Object.keys(P).forEach((a) => {
      const kids = P[a].map((k) => S[k]), type = kids[0].type; if (kids.some((x) => x.type !== type)) return;
      this.PARENT[a] = { type: type, min: 0, era: false, vars: kids[0].vars.filter((v) => kids.every((x) => x.vars.indexOf(v) >= 0)), need: Array.from(new Set([].concat.apply([], kids.map((x) => x.need)))) };
    });
    this.SCHEMA = S;
  },
  slug: (s) => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
  schemaFor(k) { if (!this.SCHEMA) this.buildSchema(); return this.SCHEMA[k] || this.PARENT[k] || null; },
  init() {
    if (this.base) return;
    this.buildSchema();
    const el = typeof document !== 'undefined' && document.getElementById('content');
    this.rawText = el ? el.textContent : (typeof DEFAULT_CONTENT !== 'undefined' ? JSON.stringify(DEFAULT_CONTENT, null, 1) : '{}');
    try { this.rawBase = JSON.parse(this.rawText); } catch (e) { this.rawBase = { format: 'het-spoor-content', common: {}, eras: {} }; }
    this.base = this.validate(this.rawBase).pack || { format: 'het-spoor-content', version: 1, name: 'Standaard', common: {}, eras: {} };
    this.use(this.base);
  },
  use(data) { this.cur = data; this._cache = {}; this.sig = RNG.hashStr(JSON.stringify(data)); },
  checkLine(t, sch, k) {
    if (typeof t !== 'string' || !t.trim()) return 'lege of ongeldige regel';
    const max = sch.type === 'label' || sch.type === 'one' ? 90 : 420; if (t.length > max) return 'te lang (max ' + max + ' tekens)';
    const bad = t.match(CONTENT_BANNED); if (bad) return 'verboden woord "' + bad[0] + '"';
    // v0.6.3: validate nested {@sub.key} tokens against the schema
    const subs = (t.match(/\{@([\w.]+)\}/g) || []).map((x) => x.slice(2, -1));
    const badSub = subs.find((sk) => !this.schemaFor(sk));
    if (badSub) return 'onbekende sub-sleutel {@' + badSub + '}';
    const vars = (t.match(/\{(\w+)\}/g) || []).map((x) => x.slice(1, -1)), unknown = vars.filter((v) => sch.vars.indexOf(v) < 0);
    if (unknown.length) return 'onbekende variabele {' + unknown[0] + '}';
    const miss = sch.need.filter((v) => vars.indexOf(v) < 0); if (miss.length) return 'mist verplichte variabele {' + miss[0] + '}';
    if (sch.type === 'raw' && t.indexOf('"') < 0) return 'deze bank vraagt een regel met dialoog tussen aanhalingstekens';
    if (sch.type !== 'raw' && sch.type !== 'narr' && t.indexOf('"') >= 0) return 'geen aanhalingstekens in deze bank (die zet de engine zelf)';
    if (sch.type === 'frag' && /\.open$/.test(k) && !/[.:!?…]$/.test(t.trim())) return 'een openingsstukje moet eindigen met een leesteken';
    return null;
  },
  validate(raw) {
    const rep = { errors: [], warnings: [], added: 0, dropped: 0, missing: 0, missingKeys: [] };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { rep.errors.push('Het bestand is geen JSON-object.'); return { pack: null, rep: rep }; }
    if (raw.format !== 'het-spoor-content') rep.errors.push('Veld "format" moet "het-spoor-content" zijn.');
    const pack = { format: 'het-spoor-content', version: 1, name: String(raw.name || 'Zonder naam').slice(0, 60), common: {}, eras: {} };
    const layer = (src, dst, where) => {
      if (src == null) return;
      if (typeof src !== 'object' || Array.isArray(src)) { rep.errors.push(where + ' moet een object zijn.'); return; }
      Object.keys(src).forEach((k) => {
        const sch = this.schemaFor(k);
        if (!sch) { rep.warnings.push(where + ': onbekende sleutel "' + k + '" genegeerd.'); return; }
        if (!Array.isArray(src[k])) { rep.warnings.push(where + '.' + k + ': geen lijst, genegeerd.'); return; }
        const ok = [];
        src[k].forEach((t, i) => { const why = this.checkLine(t, sch, k); if (why) { rep.dropped++; rep.warnings.push(where + '.' + k + '[' + i + ']: ' + why + '.'); } else if (ok.indexOf(t.trim()) < 0) ok.push(t.trim()); });
        if (ok.length) { dst[k] = ok; rep.added += ok.length; }
      });
    };
    layer(raw.common, pack.common, 'common');
    if (raw.eras != null) {
      if (typeof raw.eras !== 'object' || Array.isArray(raw.eras)) rep.errors.push('"eras" moet een object zijn.');
      else Object.keys(raw.eras).forEach((e) => { if (ERAS.indexOf(e) < 0) { rep.warnings.push('Onbekend tijdvak "' + e + '" genegeerd.'); return; } pack.eras[e] = {}; layer(raw.eras[e], pack.eras[e], 'eras.' + e); });
    }
    // keys the pack does not touch fall back to the default text
    const touched = (key) => { const ks = [key]; if (this.SCHEMA[key].type !== 'one') { const p = key.split('.'); for (let i = 1; i < p.length; i++) ks.push(p.slice(0, i).join('.')); }
      return ks.some((x) => pack.common[x] || ERAS.some((e) => pack.eras[e] && pack.eras[e][x])); };
    rep.missingKeys = Object.keys(this.SCHEMA).filter((k) => !touched(k)); rep.missing = rep.missingKeys.length;
    return { pack: rep.errors.length ? null : pack, rep: rep };
  },
  merge(base, pack) {
    const out = JSON.parse(JSON.stringify(base));
    out.name = pack.name === base.name ? base.name : pack.name;
    const into = (src, dst) => Object.keys(src).forEach((k) => {
      if (this.schemaFor(k).type === 'one') { dst[k] = src[k].slice(0, 1); return; }
      const have = dst[k] || []; dst[k] = have.concat(src[k].filter((t) => have.indexOf(t) < 0));
    });
    into(pack.common, out.common);
    Object.keys(pack.eras).forEach((e) => { out.eras[e] = out.eras[e] || {}; into(pack.eras[e], out.eras[e]); });
    return out;
  },
  importPack(text, dry) {
    this.init();
    let raw; try { raw = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, rep: { errors: ['Geen geldig JSON-bestand: ' + e.message], warnings: [], added: 0, dropped: 0, missing: 0, missingKeys: [] } }; }
    const v = this.validate(raw); if (!v.pack) return { ok: false, rep: v.rep };
    const data = this.merge(this.base, v.pack);
    if (!dry) { this.use(data); this.lastReport = v.rep; }
    return { ok: true, data: data, rep: v.rep };
  },
  reset() { this.init(); this.use(this.base); this.lastReport = null; },
  poolOf(data, era, key, noFilter) {
    const sch = this.schemaFor(key), out = [], seen = new Set(), ana = noFilter ? null : ANACHRO[era];
    const add = (arr, src) => (arr || []).forEach((t) => { if (seen.has(t) || (ana && ana.test(t))) return; seen.add(t); out.push({ t: t, h: RNG.hashStr(t), src: src }); });
    const E = data.eras[era] || {};
    if (sch && sch.type === 'one') { if (E[key] && E[key].length) add(E[key].slice(0, 1), 'e'); else add((data.common[key] || []).slice(0, 1), 'c'); return out; }
    const p = key.split('.');
    for (let i = 1; i <= p.length; i++) { const k = p.slice(0, i).join('.'); add(data.common[k], 'c'); add(E[k], 'e'); }
    return out;
  },
  pool(era, key) {
    this.init(); const ck = era + '|' + key;
    if (!this._cache[ck]) { let p = this.poolOf(this.cur, era, key); if (!p.length && this.cur !== this.base) p = this.poolOf(this.base, era, key); this._cache[ck] = p; }
    return this._cache[ck];
  },
  count(data) { let n = 0; Object.values(data.common).forEach((a) => { n += a.length; }); Object.values(data.eras).forEach((E) => Object.values(E).forEach((a) => { n += a.length; })); return n; },
  coverage(data) {
    this.init(); const bad = [];
    ERAS.forEach((e) => Object.keys(this.SCHEMA).forEach((k) => {
      const sch = this.SCHEMA[k], p = this.poolOf(data, e, k);
      if (p.length < sch.min) bad.push(e + ' / ' + k + ': ' + p.length + ' van minimaal ' + sch.min);
      else if (sch.era && !p.some((l) => l.src === 'e')) bad.push(e + ' / ' + k + ': geen eigen tijdvakregel');
    }));
    return bad;
  },
  scan(data, test) {
    const hits = [], chk = (where, arr, re) => arr.forEach((t) => { const m = t.match(re); if (m) hits.push(where + ': "' + m[0] + '" in "' + t.slice(0, 50) + '"'); });
    Object.keys(data.common).forEach((k) => test((re) => chk('common.' + k, data.common[k], re), null, k));
    Object.keys(data.eras).forEach((e) => Object.keys(data.eras[e]).forEach((k) => test((re) => chk(e + '.' + k, data.eras[e][k], re), e, k)));
    return hits;
  }
};

/* ---------------- Text: deterministic choice from the content pack ----------------
   Creation-time text uses its own RNG stream per key (seed|txt|key), so content never shifts world structure.
   Runtime text uses World.rng (seed + turn) and a per-day usage counter in s.play.lineUse: the least-used line
   wins, and 'strict' callers get null once every line has reached the daily limit.
   v0.6.3: Text.expand resolves nested {@sub.key} fragments (up to 3 levels deep) before variable replacement. */
const Text = {
  expand(t, era, rng) {
    let out = String(t || '');
    for (let d = 0; d < 3 && out.indexOf('{@') >= 0; d++) {
      out = out.replace(/\{@([\w.]+)\}/g, (m, k) => {
        const p = this.pool(era || 'e1925', k);
        return p.length ? (rng ? rng.pick(p).t : p[0].t) : '';
      });
    }
    return out;
  },
  fill(t, v, era, rng) {
    const exp = (era || rng) ? this.expand(t, era, rng) : String(t);
    return exp.replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? String(v[k]) : m)).replace(/\s{2,}/g, ' ').trim();
  },
  fix(key, t) { const sch = Content.schemaFor(key); return (sch && sch.type === 'label') || /\.item$/.test(key) || !t ? t : t.charAt(0).toUpperCase() + t.slice(1); },
  pool: (era, key) => Content.pool(era, key),
  pick(rng, era, key, vars) { const p = this.pool(era, key); return p.length ? this.fix(key, this.fill(rng.pick(p).t, vars, era, rng)) : ''; },
  // creation-time rotation: successive calls walk through the pool from a seeded offset (no clusters of one variant)
  cycle(seed, era, key, vars, ctr) {
    const p = this.pool(era, key); if (!p.length) return '';
    const subRng = RNG.make(seed + '|sub|' + key + '|' + (ctr[key] || 0));
    ctr[key] = ctr[key] == null ? RNG.make(seed + '|txt|' + key).int(p.length) : ctr[key] + 1;
    return this.fix(key, this.fill(p[ctr[key] % p.length].t, vars, era, subRng));
  },
  one(era, key, vars) { const p = this.pool(era, key); return p.length ? this.fix(key, this.fill(p[0].t, vars, era)) : ''; },
  q: (t) => '"' + t + '"',
  usage(s) { const p = s.play; if (!p.lineUse || p.lineUse.day !== s.clock.day) p.lineUse = { day: s.clock.day, n: {} }; return p.lineUse.n; },
  sayFrom(s, keys, vars, tag, opt) {
    opt = opt || {}; const seen = new Set(), pool = [];
    keys.forEach((k) => this.pool(s.meta.era, k).forEach((l) => { if (!seen.has(l.h)) { seen.add(l.h); pool.push(l); } }));
    if (!pool.length) return opt.strict ? null : '';
    const use = this.usage(s), lim = opt.limit || 2, cnt = (l) => use[l.h] || 0;
    let cand = pool.filter((l) => cnt(l) < lim);
    if (!cand.length) { if (opt.strict) return null; cand = pool; }
    const lo = Math.min.apply(null, cand.map(cnt)); cand = cand.filter((l) => cnt(l) === lo);
    const rng = World.rng(s, 'txt|' + (tag || keys[0]));
    const l = rng.pick(cand); use[l.h] = cnt(l) + 1;
    return this.fix(keys[0], this.fill(l.t, vars || this.vars(s), s.meta.era, rng));
  },
  say(s, key, vars, tag, opt) { return this.sayFrom(s, [key], vars, tag, opt); },
  nick(s) { const p = this.pool(s.meta.era, 'nick.' + (s.protagonist.gender === 'vrouw' ? 'vrouw' : 'man')); return p.length ? RNG.make(s.seed + '|nick').pick(p).t : ''; },
  weather(s) {
    const d = s.clock ? s.clock.day : 1, p = s.clock ? s.clock.part : 0;
    return RNG.make(s.seed + '|weather|' + d + '|' + p).pick(WEATHERS);
  },
  // v0.6.3 (Richting A): Rich public variables (0% culprit leak; only reads public world & clock state)
  vars(s, extra) {
    const here = World.here(s) || World.loc(s, s.startLoc) || s.world.locations[0];
    const crimeloc = World.loc(s, s.crime.crimeLocationId) || here;
    const styleId = (s.meta && s.meta.dna && s.meta.dna.styles) || 'gezelschap';
    const styleObj = typeof Lib !== 'undefined' && Lib.get('styles', styleId);
    const styleLabel = styleObj ? styleObj.nl.replace(/ \(.*\)$/, '').toLowerCase() : styleId;
    const partIdx = s.clock ? Math.min(s.clock.part, DAY.parts) : 0;
    return Object.assign({
      victim: s.crime.victim.name,
      city: s.world.city.name,
      public: s.crime.publicVersion,
      nick: this.nick(s),
      here: here ? here.name : s.world.city.name,
      tpl: here ? here.template : 'plein',
      part: PARTS[partIdx],
      day: s.clock ? s.clock.day : 1,
      weather: this.weather(s),
      style: styleLabel,
      crimeloc: crimeloc ? crimeloc.name : s.world.city.name,
      customs: s.world.city.customs || '',
      economy: (s.world.city.economy || '').toLowerCase()
    }, extra || {});
  },
  npcVars(s, npc, extra) {
    const p = U.pr(npc), home = World.loc(s, npc.locationId);
    const pubRole = String(npc.role || '').replace(/ \(.*\)$/, '');
    return this.vars(s, Object.assign({
      first: U.first(npc),
      name: npc.name,
      hij: p.hij,
      Hij: p.Hij,
      hem: p.hem,
      zijn: p.zijn,
      role: pubRole,
      home: home ? home.name : s.world.city.name
    }, extra || {}));
  },
  // speech of a core NPC: core line + optional voice tic (opening or closing), wrapped in quotes
  speak(s, npc, key, vars, opt) {
    const v = vars || this.npcVars(s, npc);
    const core = this.say(s, key, v, key + '|' + npc.id, opt); if (core == null) return null;
    const st = VOICE_STYLE[npc.voice]; let open = '', close = '';
    if (st) {
      const x = World.rng(s, 'voice|' + npc.id + '|' + key).next();
      if (x < 0.3) open = this.say(s, 'voice.' + st + '.open', v, 'vo|' + npc.id, { limit: 3 });
      else if (x < 0.6) close = this.say(s, 'voice.' + st + '.close', v, 'vc|' + npc.id, { limit: 3 });
    }
    return this.q([open, core, close].filter(Boolean).join(' '));
  }
};
const Crowd = {
  // specials (rumour, guidance) first, then the pool for this figurant type; null when nothing new is left today
  line(s, c) {
    const use = Text.usage(s), loc = World.here(s) || World.loc(s, c.locationId), sp = (b) => 'sp|' + RNG.hashStr(b);
    for (const b of (c.barks || [])) { if (!(use[sp(b)] || 0)) { use[sp(b)] = 1; return b; } }
    // v0.8.0: now and then a figurant tells you where and when someone can be found here (once per person per day)
    const tipKey = 'tip|' + c.id, tr = RNG.make(s.seed + '|tip|' + c.id + '|' + s.clock.day);
    if (!use[tipKey] && tr.next() < 0.45) {
      const who = s.cast.filter((n) => [0, 1, 2].some((p) => Schedule.at(s, n.id, s.clock.day, p) === loc.id)).sort(byNameE);
      if (who.length) { use[tipKey] = 1; const n = tr.pick(who), p = [0, 1, 2].find((q) => Schedule.at(s, n.id, s.clock.day, q) === loc.id);
        return Text.q(Text.say(s, 'crowd.sched', Text.vars(s, { name: n.name, part: PARTS[p] }), 'tip|' + c.id)); }
    }
    const keys = ['crowd.any', 'crowd.tpl.' + loc.template], rk = 'crowd.role.' + Content.slug(c.role);
    if (Content.SCHEMA[rk]) keys.push(rk);
    const l = Text.sayFrom(s, keys, Text.vars(s, { place: loc.name }), 'crowd|' + c.id, { strict: true, limit: 2 });
    if (l) return Text.q(l);
    for (const b of (c.barks || [])) { if ((use[sp(b)] || 0) < 2) { use[sp(b)]++; return b; } }
    return null;
  }
};

/* ---------------- Helpers ---------------- */
const U = {
  pad: (n) => (n < 10 ? '0' : '') + n,
  clone: (o) => JSON.parse(JSON.stringify(o)),
  esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  first: (n) => n.name.split(' ')[0],
  pr: (n) => (n && n.gender === 'vrouw') ? { hij: 'zij', Hij: 'Zij', hem: 'haar', zijn: 'haar' } : { hij: 'hij', Hij: 'Hij', hem: 'hem', zijn: 'zijn' },
  hm: (m) => U.pad(Math.floor(m / 60) % 24) + ':' + U.pad(m % 60),
  time: (c) => 'Dag ' + c.day + ', ' + (typeof c.min === 'number' ? U.hm(c.min) + ', ' : '') + PARTS[c.part],
  hash: (s) => RNG.hashStr(s)
};

/* ---------------- CaseGen: seed -> complete game world (one city) ---------------- */
const CaseGen = {
  P: { cities: 1, locs: [5, 7], cast: [8, 10], acts: 4 },
  ROOM_SPOTS: [[2, 1], [5, 1], [9, 1], [1, 3], [10, 3], [3, 5], [8, 5]],
  NPC_SPOTS: [[4, 3], [7, 3], [6, 4], [3, 4], [8, 3], [5, 3], [9, 4], [2, 4]],
  CROWD_SPOTS: [[2, 2], [9, 2], [4, 5], [7, 5], [1, 5], [10, 5], [6, 2]],

  build(seed) {
    seed = String(seed);
    const plot = PlotEngine.generate(seed, { runHours: 8 }), dna = plot.dna, rng = RNG.make(seed + '|case');
    const book = NameBook.make(GROUPS[dna.ids.eras][1]), flavor = RNG.make(seed + '|flavor').pick(Object.keys(Kit.flavors));
    const bible = { relations: {} };
    bible.protagonist = ProtagonistEngine.build(dna, RNG.make(seed + '|protagonist'), book, flavor);
    bible.world = WorldEngine.build(dna, this.P, RNG.make(seed + '|world'), book, flavor);
    const cb = CastEngine.build(bible, dna, plot, this.P, RNG.make(seed + '|cast'), book);
    bible.cast = cb.cast; bible.culpritId = cb.culpritId; bible.culpritName = cb.culpritName; bible.culpritRole = cb.culpritRole;
    const t = TruthEngine.build(dna, plot, bible, RNG.make(seed + '|truth'));
    const city = bible.world.cities[0], crimeId = dna.ids.crimes;

    // --- locations (5-7; the v0.5 street hub is gone since v0.6.1) ---
    const locations = city.locations.map((l, i) => ({ id: 'loc_' + (i + 1), srcId: l.id, name: l.name, template: l.template, description: l.description }));
    const idMap = {}; locations.forEach((l) => { idMap[l.srcId] = l.id; delete l.srcId; });
    locations.forEach((l) => {
      // v0.8.0: 4 or 5 objects from the era-filtered pool; the inn has five fixed spots, so one object per spot there
      const lr = RNG.make(seed + '|room|' + l.id), pool = objPool(l.template, dna.ids.eras), want = Rnd.range(lr, 4, 5);
      let pick;
      if (l.template === 'herberg') { const bySlot = {}; pool.forEach((x) => { (bySlot[x[1]] = bySlot[x[1]] || []).push(x); }); pick = Rnd.pickN(lr, Object.keys(bySlot), want).map((k) => lr.pick(bySlot[k])); }
      else pick = Rnd.pickN(lr, pool, want);
      const spots = Rnd.pickN(lr, this.ROOM_SPOTS, pick.length);
      l.objects = pick.map((x, k) => ({ id: l.id + '_o' + (k + 1), name: x[0], prop: x[1], x: spots[k][0], y: spots[k][1] }));
      l.open = OPEN_HOURS[l.template].slice();
    });
    const real = locations;
    const byTpl = (prefs, avoid) => { for (const p of prefs) { const c = real.filter((l) => l.template === p && (avoid || []).indexOf(l.id) < 0); if (c.length) return rng.pick(c); } const c2 = real.filter((l) => (avoid || []).indexOf(l.id) < 0); return rng.pick(c2.length ? c2 : real); };

    // --- core cast (6-8) and crowd source ---
    const all = cb.cast.map((n) => Object.assign({}, n, { locationId: idMap[n.locationId] }));
    const culprit = all.find((n) => n.id === cb.culpritId), rest = all.filter((n) => n !== culprit), core = [culprit];
    const arc = (n) => n.relationshipArc.type, isSusp = (n) => n.secrets.some((s) => s.indexOf('Had een eigen reden') === 0), isKin = (n) => / van het slachtoffer\)$/.test(n.role);
    const free = (f) => rest.find((n) => core.indexOf(n) < 0 && f(n)), add = (n) => { if (n && core.indexOf(n) < 0) core.push(n); };
    rest.filter(isSusp).slice(0, 2).forEach(add);
    while (core.length < 3) add(free((n) => arc(n) === 'none' || arc(n) === 'enemy') || free(() => true));
    const confidant = free(isKin) || free((n) => arc(n) === 'friend') || free((n) => arc(n) === 'love') || free((n) => arc(n) !== 'enemy');
    add(confidant);
    const witness = free((n) => arc(n) === 'none' && !isSusp(n) && !isKin(n)) || free((n) => arc(n) !== 'enemy');
    add(witness);
    ['love', 'friend', 'enemy'].forEach((a) => add(free((n) => arc(n) === a)));
    rest.filter(isSusp).slice(2).forEach((n) => { if (core.length < 8) add(n); });
    for (const n of rest) { if (core.length >= 6) break; add(n); }
    core.length = Math.min(core.length, 8);
    const suspA = core[1], suspB = core[2];
    // v0.7.0 (voorstel 4 en 8): every deduction key is shared by exactly two core people. The initial on paper is shared
    // by the culprit and suspect B, the trait the witness saw by the culprit and suspect A. Only the culprit has both.
    const surOf = (x) => x.name.slice(x.name.indexOf(' ') + 1), ini = (x) => x.name.charAt(0).toUpperCase();
    const rename = (x, test) => {
      const key = x.gender === 'vrouw' ? 'f' : 'm', fls = [flavor].concat(Object.keys(Kit.flavors).filter((f) => f !== flavor));
      for (const f of fls) {
        const pool = Kit.flavors[f][key][book.g].filter((nm) => test(nm.charAt(0).toUpperCase()) && !book.usedFirst.has(norm(nm)) && !book.usedFull.has(norm(nm + ' ' + surOf(x))));
        if (pool.length) { const nm = rng.pick(pool); book.usedFirst.add(norm(nm)); book.usedFull.add(norm(nm + ' ' + surOf(x))); x.name = nm + ' ' + surOf(x); return true; }
      }
      return false;
    };
    if (ini(suspB) !== ini(culprit) && !rename(suspB, (c) => c === ini(culprit)) && !rename(culprit, (c) => c === ini(suspB))) {
      // both directions failed: give both a third initial for which each gender still has a free first name
      const freeIni = (x) => new Set([].concat.apply([], Object.keys(Kit.flavors).map((f) => Kit.flavors[f][x.gender === 'vrouw' ? 'f' : 'm'][book.g]))
        .filter((nm) => !book.usedFirst.has(norm(nm))).map((nm) => nm.charAt(0).toUpperCase()));
      const pools = (x) => [].concat.apply([], Object.keys(Kit.flavors).map((f) => Kit.flavors[f][x.gender === 'vrouw' ? 'f' : 'm'][book.g])).filter((nm) => !book.usedFirst.has(norm(nm)));
      const pb = pools(suspB), pc = pools(culprit), letters = Array.from(new Set(pb.map((nm) => nm.charAt(0).toUpperCase()))).sort();
      const both = letters.filter((L) => { const a = pb.filter((nm) => nm.charAt(0).toUpperCase() === L), c = pc.filter((nm) => nm.charAt(0).toUpperCase() === L); return a.length && c.length && new Set(a.concat(c)).size >= 2; });
      if (both.length) { const L = rng.pick(both); rename(suspB, (c) => c === L); rename(culprit, (c) => c === L); }
    }
    core.forEach((x) => { if (x !== culprit && x !== suspB && ini(x) === ini(culprit)) rename(x, (c) => c !== ini(culprit)); });
    const KK = Object.keys(KENMERK), fits = (x, k) => k !== 'cane' || x.age >= 50;
    const shared = rng.pick(KK.filter((k) => fits(culprit, k) && fits(suspA, k)));
    culprit.kenmerk = shared; suspA.kenmerk = shared;
    const restK = Rnd.pickN(rng, KK.filter((k) => k !== shared), KK.length - 1); let ki = 0;
    core.forEach((x) => { if (x.kenmerk) return; const c2 = restK.filter((k) => fits(x, k)); x.kenmerk = c2[ki++ % c2.length]; });
    // v0.6.1: shuffled ids (stream seed|ids), so the culprit is no longer always npc_1; the cast array follows the new ids
    Rnd.pickN(RNG.make(seed + '|ids'), core, core.length).forEach((x, i) => { x.id = 'npc_' + (i + 1); });
    core.sort((a, b) => +a.id.slice(4) - +b.id.slice(4));

    // NPC room positions per location
    const perLoc = {};
    core.forEach((n) => {
      perLoc[n.locationId] = (perLoc[n.locationId] || 0) + 1; const sp = this.NPC_SPOTS[(perLoc[n.locationId] - 1) % this.NPC_SPOTS.length];
      n.x = sp[0]; n.y = sp[1]; n.dna = { hue: RNG.make(seed + '|face|' + n.id).int(360) };
      delete n.cityId;
    });

    // --- victim, places ---
    const kinV = all.find((x) => isKin(x) && !/\((schoonzus|zwager) /.test(x.role));   // v0.6.5: blood kin of the victim shares the surname
    const vg = rng.next() < 0.5 ? 'vrouw' : 'man', victimP = NameBook.person(book, rng, flavor, vg, kinV ? kinV.name.slice(kinV.name.indexOf(' ') + 1) : null), victim = { name: victimP.full, gender: vg };
    const crimeLoc = byTpl(['huis', 'kantoor', 'werkplaats', 'herberg'], [suspB.locationId]);   // v0.7.0: suspect B claims to be home, so home is not the scene
    const victimLoc = byTpl(['huis', 'kantoor'], []);
    const otherLoc = byTpl(['herberg', 'plein', 'markt', 'park'], [crimeLoc.id]);
    // v0.7.0 (voorstel 2): alibis that can be checked. Innocents name someone who was with them and confirms it.
    // The culprit names a companion who was there, but denies the culprit was. Suspect B claims to be home alone.
    const witness0 = witness, I = core.filter((x) => x !== culprit && x !== suspB);
    const compPool = I.filter((x) => x !== suspA && x !== witness0 && x !== confidant);
    const companion = compPool.length ? rng.pick(compPool) : rng.pick(I.filter((x) => x !== suspA));
    const alibis = {};
    alibis[culprit.id] = { locId: otherLoc.id, withId: companion.id, truth: false };
    alibis[suspB.id] = { locId: suspB.locationId, withId: null, truth: false };
    const order = Rnd.pickN(rng, I.filter((x) => x !== companion), I.length - 1); order.unshift(companion);
    const pairLoc = (a, b) => { const h = [a, b].map((x) => real.find((l) => l.id === x.locationId)).find((l) => l && l.id !== crimeLoc.id && World.isOpen(l, CRIME_HOUR));
      return h || rng.pick(real.filter((l) => l.id !== crimeLoc.id && World.isOpen(l, CRIME_HOUR))) || otherLoc; };
    for (let i = 0; i < order.length; i += 2) {
      const a = order[i], b = order[i + 1];
      if (!b) { const prev = order[i - 2]; alibis[a.id] = { locId: alibis[prev.id].locId, withId: prev.id, truth: true }; break; }
      const loc = a === companion ? otherLoc : pairLoc(a, b);
      alibis[a.id] = { locId: loc.id, withId: b.id, truth: true }; alibis[b.id] = { locId: loc.id, withId: a.id, truth: true };
    }
    const ctext = Kit.crimeText[crimeId];
    const personalHook = String(t.crime.personalHook || '').replace(/\{v\}/g, victim.name);
    const crime = { type: crimeId, victim: victim, crimeLocationId: crimeLoc.id, victimLocationId: victimLoc.id,
      summary: Rnd.cap('in ' + city.name + ' ' + ctext[0].replace('{v}', victim.name)) + '.', publicVersion: ctext[1], personalHook: personalHook };

    // --- evidence graph (9-10 items, two independent routes; v0.6.3: e2 follows the writer style!) ---
    const used = new Set(), C = culprit.name, V = victim.name, mid = dna.ids.motives, tid = dna.ids.methods, era = dna.ids.eras, styleId = dna.ids.styles;
    const crole = String(culprit.role || '').replace(/ \(.*\)$/, '');
    const tx = (key, vars, salt) => Text.pick(RNG.make(seed + '|txt|' + key + '|' + (salt || '')), era, key, vars), one = (key, vars) => Text.one(era, key, vars), ctr = {};
    const objAt = (loc, prefer) => {
      const fr = loc.objects.filter((o) => !used.has(o.id)), pf = prefer ? fr.filter((o) => prefer.indexOf(o.name) >= 0) : [];
      const o = pf.length ? pf[0] : fr.length ? rng.pick(fr) : null; if (o) used.add(o.id); return o;
    };
    const place = (prefs, avoid, preferObj) => {
      for (let k = 0; k < 8; k++) { const loc = byTpl(prefs, avoid); const o = objAt(loc, preferObj); if (o) return { type: 'object', locationId: loc.id, objectId: o.id }; avoid = (avoid || []).concat([loc.id]); }
      throw new Error('no free object');
    };
    // v0.6.5: the register red herring always lands on a register or ledger; if none is free, a free object at a
    // place where such a book belongs becomes one (same id, new name); last resort: a notebook anywhere
    const placeReg = (prefs, avoid) => {
      const ok = real.filter((l) => avoid.indexOf(l.id) < 0), free = (l) => l.objects.filter((o) => !used.has(o.id)), rank = (l) => { const i = prefs.indexOf(l.template); return i < 0 ? 99 : i; };
      const take = (l, o) => { used.add(o.id); return { type: 'object', locationId: l.id, objectId: o.id }; };
      const withReg = ok.filter((l) => free(l).some((o) => REGISTER_OBJ.indexOf(o.name) >= 0)).sort((a, b) => rank(a) - rank(b));
      if (withReg.length) { const l = withReg[0]; return take(l, free(l).find((o) => REGISTER_OBJ.indexOf(o.name) >= 0)); }
      const canReg = ok.filter((l) => free(l).length && !(l.template === 'herberg' && l.objects.some((o) => o.prop === 'ledger')) && objPool(l.template, era).some((x) => REGISTER_OBJ.indexOf(x[0]) >= 0)).sort((a, b) => rank(a) - rank(b));
      const l = canReg[0] || ok.find((x) => free(x).length) || real.find((x) => free(x).length); if (!l) throw new Error('no free object');
      const o = rng.pick(free(l)), regs = objPool(l.template, era).filter((x) => REGISTER_OBJ.indexOf(x[0]) >= 0 && !l.objects.some((y) => y.name === x[0]));
      o.name = regs.length ? regs[0][0] : 'het aantekenboek'; o.prop = regs.length ? regs[0][1] : 'ledger';
      return take(l, o);
    };
    const ev = []; let n = 0;
    const mk = (o) => { o.id = 'ev_' + (++n); ev.push(o); return o; };
    const e1 = mk({ key: 'hook', route: 'start', title: 'De zaak', slot: null, pointsTo: null, requires: [], source: { type: 'start' }, item: null,
      text: crime.summary + ' ' + personalHook + ' ' + tx(VICTIM_ABSENT.indexOf(crimeId) >= 0 ? 'ev.hook.text' : 'ev.hook.present', { v: V, loc: crimeLoc.name, hour: CRIME_HOUR }) });
    const p3src = place(METHOD_TPL[tid], [victimLoc.id]), p2src = place(MOTIVE_TPL[mid], [victimLoc.id]);
    const locName = (id) => locations.find((l) => l.id === id).name;

    // v0.6.3 (Richting C): Select lead key family based on writer style (Christie, Baantjer/Holmes, Chandler, Midsomer, Columbo)
    const leadKind = STYLE_LEAD[styleId] || 'notebook';
    const leadKey = leadKind === 'notebook' ? 'ev.notebook' : 'ev.lead.' + leadKind;
    const leadVars = { v: V, initial: C.charAt(0), crole: crole, locA: locName(p2src.locationId), locB: locName(p3src.locationId) };
    const e2 = mk({
      key: 'paper_ctx', route: 'paper', leadKind: leadKind,
      title: one(leadKey + '.title', { v: V }), slot: null, pointsTo: culprit.id, requires: [e1.id],
      item: one(leadKey + '.item', { v: V }),
      source: { type: 'object', locationId: victimLoc.id, objectId: (objAt(victimLoc) || objAt(byTpl(['huis', 'kantoor', 'archief'], [victimLoc.id]))).id },
      text: p2src.locationId === p3src.locationId ? tx(leadKey + '.textSame', leadVars) : tx(leadKey + '.text', leadVars)
    });
    e2.source.locationId = locations.find((l) => l.objects.some((o) => o.id === e2.source.objectId)).id;

    mk({ key: 'paper_motive', route: 'paper', title: one('ev.motive.' + mid + '.title'), slot: 'motive', pointsTo: culprit.id, requires: [e2.id], item: one('ev.motive.' + mid + '.item'), source: p2src, text: tx('ev.motive.' + mid + '.text', { c: C, v: V }) });
    mk({ key: 'paper_method', route: 'paper', title: one('ev.method.' + tid + '.title'), slot: 'method', pointsTo: culprit.id, requires: [e2.id], item: one('ev.method.' + tid + '.item'), source: p3src, text: tx('ev.method.' + tid + '.text', { initial: C.charAt(0), v: V }) });
    const wp = U.pr(witness);
    const e5 = mk({ key: 'people_witness', route: 'people', title: one('ev.witness.title', { first: U.first(witness) }), slot: null, pointsTo: culprit.id, requires: [e1.id], item: null,
      source: { type: 'talk', npcId: witness.id, topic: 'Die avond bij ' + crimeLoc.name },
      text: Text.q(tx('ev.witness.text', { trait: KENMERK[culprit.kenmerk].saw, loc: crimeLoc.name, hour: CRIME_HOUR })) });
    mk({ key: 'people_motive', route: 'people', title: one('ev.motiveTalk.title', { first: U.first(confidant), cfirst: U.first(culprit) }), slot: 'motive', pointsTo: culprit.id, requires: [e5.id], item: null,
      source: { type: 'talk', npcId: confidant.id, topic: 'Wie had iets tegen ' + U.first(victim) + '?' }, text: Text.q(tx('ev.motive.' + mid + '.talk', { c: C, v: V })) });
    const cp = U.pr(culprit);
    const eD = mk({ key: 'people_denial', route: 'people', title: one('ev.denial.title', { first: U.first(companion), cfirst: U.first(culprit) }), slot: null, pointsTo: culprit.id, requires: [e1.id], needHeard: 'con_1', item: null,
      source: { type: 'check', npcId: companion.id, ofId: culprit.id }, text: Text.q(tx('alibi.check.no', { x: U.first(culprit), place: otherLoc.name })) });
    const e7 = mk({ key: 'people_method', route: 'people', title: one('ev.alibiBreak.title', { cfirst: U.first(culprit) }), slot: 'method', pointsTo: culprit.id, requires: [eD.id], item: null,
      source: { type: 'confront', conId: 'con_1', npcId: culprit.id },
      text: tx('ev.alibiBreak.text', { c: C, other: otherLoc.name, witness: companion.name, hem: cp.hem, hij: cp.hij, loc: crimeLoc.name, hour: CRIME_HOUR }) });
    mk({ key: 'red_motive', route: 'red', title: one('ev.red.letter.title', { first: U.first(suspA) }), slot: 'motive', pointsTo: suspA.id, requires: [e1.id], item: one('ev.red.letter.item'),
      source: place(['huis', 'herberg', 'markt']), text: tx('ev.red.letter.text', { a: suspA.name, v: V }) });
    const regSrc = placeReg(['herberg', 'poort', 'haven', 'kantoor', 'markt', 'archief', 'werkplaats'], [suspB.locationId]);
    const regLoc = locations.find((l) => l.id === regSrc.locationId), regObj = regLoc.objects.find((o) => o.id === regSrc.objectId), bp = U.pr(suspB);
    const e9 = mk({ key: 'red_alibi', route: 'red', title: one('ev.red.register.title', { first: U.first(suspB) }), slot: 'method', pointsTo: suspB.id, requires: [e1.id], item: null, source: regSrc,
      text: tx('ev.red.register.text', { obj: regObj.name, regloc: regLoc.name, b: suspB.name, hour: CRIME_HOUR, Hij: bp.Hij, hij: bp.hij }) });
    const gossip = core.find((x) => [culprit, suspA, confidant, witness].indexOf(x) < 0);
    if (gossip && rng.next() < 0.6) mk({ key: 'red_gossip', route: 'red', title: one('ev.red.gossip.title', { first: U.first(suspA) }), slot: 'motive', pointsTo: suspA.id, requires: [e1.id], item: null,
      source: { type: 'talk', npcId: gossip.id, topic: 'Wat er wordt gefluisterd' }, text: Text.q(tx('ev.red.gossip.text', { a: suspA.name, v: V })) });

    // --- v0.9.0 (voorstel 7): one twist per case, from the plot DNA ---
    let twist = TWIST_GAME[dna.ids.twists] || 'geen';
    if (dna.ids.twists === 'manipulatie' && RNG.make(seed + '|twist').next() < 0.5) twist = 'medeplichtige';   // a manipulating confidant may also buy a false alibi
    if (twist === 'medeplichtige') {
      const o = objAt(otherLoc);
      if (o) { eD.source = { type: 'object', locationId: otherLoc.id, objectId: o.id }; eD.title = one('ev.twist.accomplice.title', { cfirst: U.first(culprit) });
        eD.text = tx('ev.twist.accomplice.text', { obj: o.name, place: otherLoc.name, hour: CRIME_HOUR, comp: companion.name, c: C }); }
      else twist = 'geen';
    }
    if (twist === 'zondebok') {
      const home = real.find((l) => l.id === suspA.locationId), o = (home && objAt(home)) || null, src = o ? { type: 'object', locationId: home.id, objectId: o.id } : place(['huis', 'werkplaats', 'kantoor']);
      const ol = real.find((l) => l.id === src.locationId), on = ol.objects.find((x) => x.id === src.objectId).name;
      mk({ key: 'twist_planted', route: 'red', title: one('ev.twist.planted.title', { first: U.first(suspA) }), slot: 'method', pointsTo: suspA.id, requires: [e1.id], item: one('ev.twist.planted.item'),
        source: src, text: tx('ev.twist.planted.text', { obj: on, a: suspA.name, initial: C.charAt(0) }) });
    }

    const contradictions = [
      { id: 'con_1', npcId: culprit.id, kind: 'culprit', claim: Text.q(tx('alibi.culpritClaim', { place: otherLoc.name, other: companion.name })), counterEvidence: eD.id, yields: e7.id },
      { id: 'con_2', npcId: suspB.id, kind: 'secret', claim: Text.q(tx('alibi.secretClaim')), counterEvidence: e9.id, yields: null, clears: true,
        reveal: tx('alibi.secretReveal', { first: U.first(suspB), hij: bp.hij, Hij: bp.Hij, secret: suspB.secrets[0], regloc: regLoc.name }) }
    ];

    // --- v0.8.0 (nieuw B): what the other objects yield. Some confirm a true alibi (a bill for two, a guest list),
    // the rest is drawn by weight; sched, char and hint are worked out when examined, from what is true at that moment ---
    const yr = RNG.make(seed + '|yield'), freeObjs = (l) => l.objects.filter((o) => !used.has(o.id) && !o.yield);
    const pairs = {}; Object.keys(alibis).forEach((id) => { const a = alibis[id]; if (!a.truth || !a.withId) return; const k = [id, a.withId].sort().join('|'); if (!pairs[k]) pairs[k] = { a: id, b: a.withId, locId: a.locId }; });
    Object.values(pairs).forEach((pr) => { const l = real.find((x) => x.id === pr.locId); if (!l || yr.next() < 0.4) return; const f = freeObjs(l); if (f.length) yr.pick(f).yield = { k: 'alibi', a: pr.a, b: pr.b }; });
    const wk = Object.keys(YIELD_W);
    real.forEach((l) => freeObjs(l).forEach((o) => {
      const k = yr.weighted(wk, (x) => YIELD_W[x]);
      if (k === 'coins') o.yield = { k: k, n: 2 + yr.int(3) };
      else if (k === 'topic') o.yield = { k: k, npc: yr.pick(core).id, item: yr.pick(TOPIC_ITEMS) };
      else o.yield = { k: k };
    }));

    // --- relations ---
    const relations = {};
    core.forEach((x) => {
      const base = arc(x) === 'enemy' ? { trust: 30, affection: 15, resentment: 25, suspicion: 25 } : Rel.base(arc(x));
      relations[x.id] = Object.assign(base, { statusText: x.relationshipArc.startsAs || 'neutraal' });
    });

    // --- crowd (10-16): leftover cast + generated extras ---
    const crowdN = Rnd.range(rng, 10, 16), crowd = [], extras = all.filter((x) => core.indexOf(x) < 0);
    const locCycle = Rnd.pickN(rng, locations, locations.length);
    extras.slice(0, crowdN).forEach((x) => crowd.push({ name: x.name, role: x.role.replace(/ \(.*\)$/, ''), locationId: x.locationId, gender: x.gender, age: x.age }));
    let k = 0;
    while (crowd.length < crowdN) {
      const loc = locCycle[k++ % locCycle.length], role = rng.pick(CROWD_ROLES[loc.template]);
      const g = CROWD_F.has(role) ? 'vrouw' : CROWD_M.has(role) ? 'man' : (rng.next() < 0.5 ? 'vrouw' : 'man');
      crowd.push({ name: NameBook.person(book, rng, flavor, g, null, true).full, role: role, locationId: loc.id, gender: g, age: Rnd.range(rng, 19, 76) });
    }
    const cperLoc = {};
    const notCulprit = core.filter((x) => x !== culprit);
    // v0.8.0 (nieuw A): figuranten carry a visible trait too, but never the one the culprit shares with suspect A
    const crowdK = KK.filter((k) => k !== shared), kr = RNG.make(seed + '|crowdk');
    crowd.forEach((c, i) => {
      c.id = 'crowd_' + (i + 1);
      const ok = crowdK.filter((k) => fits(c, k)); c.kenmerk = ok[kr.int(ok.length)];
      cperLoc[c.locationId] = (cperLoc[c.locationId] || 0) + 1; const sp = this.CROWD_SPOTS[(cperLoc[c.locationId] - 1) % this.CROWD_SPOTS.length]; c.x = sp[0]; c.y = sp[1];
      // specials only (rumour or worry); everyday lines are drawn at runtime from the content pack (Crowd.line)
      c.barks = [rng.next() < 0.5 ? Text.q(Text.cycle(seed, era, 'crowd.rumor', { public: crime.publicVersion }, ctr)) : Text.q(Text.cycle(seed, era, 'crowd.worry', { name: rng.pick(core).name }, ctr))];
    });
    // guidance barks: one points to the witness, one to the victim's papers
    crowd[0].barks.push(Text.q(tx('crowd.guideWitness', { first: U.first(witness), Hij: wp.Hij, hij: wp.hij })));
    crowd[1 % crowd.length].barks.push(Text.q(tx('crowd.guidePapers', { loc: victimLoc.name, victim: V })));
    if (twist === 'zondebok') crowd[2 % crowd.length].barks.push(Text.q(tx('crowd.twist.zondebok', { first: U.first(suspA) })));
    if (twist === 'medeplichtige') crowd[2 % crowd.length].barks.push(Text.q(tx('crowd.twist.medeplichtige', { comp: U.first(companion), c: U.first(culprit) })));

    const start = real.find((l) => l.template === 'herberg') || real[0];
    const clockDef = Lib.get('clocks', dna.ids.clocks);
    const actHooks = (plot.acts || []).slice(0, 4).map((a) => {
      const hk = (a.beats || []).find((b) => b.fn === 'haakje');
      return { n: a.n, goal: a.goal, emotion: a.emotion, hook: hk ? hk.text : '' };
    });
    return {
      seed: seed, startLoc: start.id,
      meta: { title: t.meta.title, era: dna.ids.eras, eraLabel: Lib.get('eras', dna.ids.eras).nl, settingSummary: t.meta.settingSummary, tone: dna.tone, eraRules: t.meta.eraRules,
        dna: Object.assign({}, dna.ids), plotSignature: plot.signature, plotOk: !!(plot.validation && plot.validation.ok),
        actHooks: actHooks, clockText: (clockDef && clockDef.text) || '', content: { name: Content.cur.name, sig: Content.sig } },
      protagonist: (() => { const p = Object.assign({}, bible.protagonist); delete p.surname; return p; })(),
      world: { city: { id: 'city_main', name: city.name, culture: city.culture.replace(/ \(.*\)$/, ''), customs: city.customs, economy: city.economy }, locations: locations },
      crime: crime,
      truth: { twist: twist, culpritId: culprit.id, close: !!t.truth.culprit.closeToProtagonist, motive: Lib.get('motives', dna.ids.motives).nl, method: Lib.get('methods', dna.ids.methods).nl,
        motiveId: dna.ids.motives, methodId: dna.ids.methods, roleLabel: t.truth.culprit.relationToProtagonist, timeline: t.truth.timeline, trueEnding: t.truth.trueEnding,
        roles: { suspA: suspA.id, suspB: suspB.id, witness: witness.id, confidant: confidant.id, companion: companion.id, gossip: gossip ? gossip.id : null }, crimeHour: CRIME_HOUR, otherLocationId: otherLoc.id },
      cast: core, crowd: crowd, evidence: ev, contradictions: contradictions, relations: relations, alibis: alibis
    };
  }
};

/* ---------------- Evidence ---------------- */
const Evidence = {
  get: (s, id) => s.evidence.find((e) => e.id === id),
  reqMet: (s, e) => e.requires.every((r) => !!s.play.found[r]) && (!e.needHeard || !!s.play.heard[e.needHeard]),
  found: (s) => s.evidence.filter((e) => s.play.found[e.id]),
  give(s, e, via) {
    if (s.play.found[e.id]) return false;
    s.play.found[e.id] = { day: s.clock.day, part: s.clock.part, via: via, locationId: s.visit ? s.visit.locId : null };
    if (e.source && e.source.objectId && s.play.early) delete s.play.early[e.source.objectId];
    // v0.12.0: threads and the archive mark of a blank object card move to the piece it turned out to hold
    if (e.source && e.source.objectId && s.player) { const from = 'o:' + e.source.objectId, to = 'd:' + e.id;
      if (Array.isArray(s.player.threads)) s.player.threads = s.player.threads.map((t) => t.map((x) => x === from ? to : x)).filter((t) => t[0] !== t[1]).map((t) => t[0] < t[1] ? t : [t[1], t[0]]);
      if (s.player.archive && s.player.archive[from]) { delete s.player.archive[from]; s.player.archive[to] = true; } }
    if (e.item) Log.sys(s, 'Je neemt ' + e.item + ' mee. Het komt als stuk op je zaakbord.');
    if (e.key === 'people_denial' && e.source.type === 'object') {   // v0.9.0: the document unmasks the lying companion
      const C = s.truth.culpritId, chk = s.play.alibiCheck && s.play.alibiCheck[C], liar = World.npc(s, s.truth.roles.companion), cul = World.npc(s, C);
      if (chk && chk.lie) Log.sys(s, U.first(liar) + ' heeft gelogen over het alibi van ' + U.first(cul) + '.' + (s.play.cleared[C] ? ' ' + U.first(cul) + ' is weer verdachte.' : ''));
      delete s.play.cleared[C]; (s.play.alibiCheck = s.play.alibiCheck || {})[C] = { by: 'obj:' + e.source.objectId, ok: false };
    }
    Log.sys(s, 'Nieuw spoor in je dagboek: ' + e.title + '.');
    return true;
  },
  acyclic(evs) {
    const map = {}; evs.forEach((e) => { map[e.id] = e; }); const state = {};
    const visit = (id) => { if (state[id] === 1) return false; if (state[id] === 2) return true; state[id] = 1; const e = map[id]; if (!e) return false; for (const r of e.requires) if (!visit(r)) return false; state[id] = 2; return true; };
    return evs.every((e) => visit(e.id));
  }
};

/* ---------------- Relations ---------------- */
const Rels = {
  clamp: (v) => Math.max(0, Math.min(100, Math.round(v))),
  score: (r) => r.trust * 0.5 + r.affection * 0.5 - r.resentment * 0.7 - r.suspicion * 0.3,
  tone(r) { const x = this.score(r); return x >= 30 ? 'warm' : x >= 8 ? 'neutral' : x >= -10 ? 'cold' : 'hostile'; },
  toneOf: (s, id) => Rels.tone(s.relations[id]),
  apply(s, id, d) { const r = s.relations[id]; if (!r) return; Object.keys(d).forEach((k) => { if (typeof r[k] === 'number') r[k] = Rels.clamp(r[k] + d[k]); }); }
};

/* ---------------- Log ---------------- */
const Log = {
  push(s, e) { s.play.logN = (s.play.logN || 0) + 1; e.i = s.play.logN; s.log.push(e); if (s.log.length > 160) s.log.splice(0, s.log.length - 160); Mentions.scan(s, e); },
  narr: (s, text) => Log.push(s, { k: 'n', text: text }),
  sys: (s, text) => Log.push(s, { k: 's', text: text }),
  ask: (s, npc, text, approach) => Log.push(s, { k: 'q', npc: npc.id, text: text, approach: approach || 'reserved' }),
  npc: (s, npc, text, tone) => Log.push(s, { k: 'p', npc: npc.id, text: text, tone: tone }),
  crowd: (s, c, text) => Log.push(s, { k: 'c', name: c.name, role: c.role, text: text })
};

/* ---------------- Mentions (v0.12.0): people and places you have heard of but not yet found ----------------
   Read only from text the player has seen (every log line), so it never knows more than the player. A person counts
   by full name, or by first name when nobody else in the town shares it. Stored in play.heardOf and play.heardOfLoc. */
const Mentions = {
  rx: (w) => new RegExp('(^|[^A-Za-zÀ-ÿ])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-zÀ-ÿ])'),
  firsts(s) { const n = {}; s.cast.concat(s.crowd || [], [s.protagonist || { name: '' }]).forEach((x) => { const f = String(x.name || '').split(' ')[0]; n[f] = (n[f] || 0) + 1; }); return n; },
  scan(s, e) {
    if (!s || !s.play || !e || !e.text || !s.cast) return;
    const p = s.play, text = String(e.text), F = this.firsts(s), src = e.k === 'p' ? e.npc : e.k === 'c' ? 'c:' + e.name : null;
    p.heardOf = p.heardOf || {}; p.heardOfLoc = p.heardOfLoc || {};
    s.cast.forEach((n) => {
      if (p.met[n.id] || p.heardOf[n.id] || (e.k === 'p' && e.npc === n.id)) return;
      const f = U.first(n);
      if (text.indexOf(n.name) >= 0 || (F[f] === 1 && f.length > 2 && this.rx(f).test(text))) p.heardOf[n.id] = { by: src, day: s.clock ? s.clock.day : 1 };
    });
    ((s.world && s.world.locations) || []).forEach((l) => { if (!p.visited[l.id] && !p.heardOfLoc[l.id] && text.indexOf(l.name) >= 0) p.heardOfLoc[l.id] = { by: src }; });
  },
  // where you heard of someone, in a few words
  source(s, h) { if (!h || !h.by) return 'in je notities'; if (h.by.indexOf('c:') === 0) return 'door ' + h.by.slice(2); const n = World.npc(s, h.by); return n ? 'door ' + n.name : 'in je notities'; }
};

/* ---------------- People: who you know (v0.8.0, nieuw A) ----------------
   Before you speak to someone you only see what anyone would see: age, sex, a visible trait, and the role only
   when it shows (staff at their own place). Core people and figuranten look and behave the same until then. */
const People = {
  isCore: (s, id) => s.cast.some((n) => n.id === id),
  get: (s, id) => s.cast.find((n) => n.id === id) || s.crowd.find((c) => c.id === id),
  known: (s, id) => People.isCore(s, id) ? !!s.play.met[id] : !!(s.play.metCrowd && s.play.metCrowd[id]),
  roleSeen(s, x) {
    const role = String(x.role || '').replace(/ \(.*\)$/, ''), here = World.here(s), home = x.locationId;
    if (!here || here.id !== home || here.template === 'huis') return null;
    if (People.isCore(s, x.id)) return here.template === 'plein' || here.template === 'park' || here.template === 'straat' ? null : role;
    return SEEN_ROLES.has(role) ? role : null;
  },
  look(s, x) {
    const g = x.gender === 'vrouw', age = +x.age || 40, k = x.kenmerk && KENMERK[x.kenmerk], role = People.roleSeen(s, x);
    const who = role ? Rnd.cap(role) : Rnd.cap((age < 30 ? 'jonge ' : age >= 60 ? 'oudere ' : '') + (g ? 'vrouw' : 'man'));
    return who + (k ? ' met ' + k.met : '');
  },
  // the name shown in lists and on the scene; unknown people get their look, numbered when two look alike
  label(s, x, all) {
    if (People.known(s, x.id)) return x.name + ', ' + String(x.role || '').replace(/ \(.*\)$/, '');
    const me = People.look(s, x), same = (all || []).filter((y) => !People.known(s, y.id) && People.look(s, y) === me);
    return same.length > 1 ? me + ' (' + 'ABCDEFGH'.charAt(same.findIndex((y) => y.id === x.id)) + ')' : me;
  }
};

const byNameE = (a, b) => a.name.localeCompare(b.name, 'nl');
/* ---------------- Clock and world queries ---------------- */
const World = {
  loc: (s, id) => s.world.locations.find((l) => l.id === id),
  here: (s) => (s.visit ? World.loc(s, s.visit.locId) : null),
  isOpen: (loc, hour) => hour >= loc.open[0] && hour < loc.open[1],
  openAt: (loc, part) => part >= 0 && part < DAY.parts && World.isOpen(loc, PART_HOUR[part]),
  npc: (s, id) => s.cast.find((n) => n.id === id),
  present: (s, loc) => { loc = loc || World.here(s); return loc ? s.cast.filter((n) => Schedule.at(s, n.id, s.clock.day, s.clock.part) === loc.id) : []; },
  crowdHere: (s, loc) => { loc = loc || World.here(s); return loc ? s.crowd.filter((c) => Schedule.at(s, c.id, s.clock.day, s.clock.part) === loc.id) : []; },
  rng: (s, tag) => RNG.make(s.seed + '|turn|' + s.turn + '|' + tag),
  // v0.8.0 (nieuw B): what a non-evidence object yields; null means nothing (the caller tells the 'nothing' line)
  yieldOf(s, loc, obj) {
    const y = obj.yield || { k: 'none' }, r = RNG.make(s.seed + '|yield|' + obj.id + '|' + s.clock.day), name = Rnd.cap(obj.name), tag = 'y|' + obj.id;
    if (y.k === 'coins') { s.player.money += y.n; return Text.say(s, 'obj.y.coins', { obj: obj.name, n: y.n, cur: s.meta.eraRules.currency || 'munten' }, tag); }
    if (y.k === 'alibi') {
      const A = World.npc(s, y.a), B = World.npc(s, y.b), al = s.alibis[A.id]; if (!A || !B) return null;
      s.play.alibiCheck = s.play.alibiCheck || {};
      [A, B].forEach((x) => { if (!s.play.alibiCheck[x.id]) s.play.alibiCheck[x.id] = { by: 'obj:' + obj.id, ok: true }; if (Level.get(s).checkLabel && s.play.asked[x.id + ':alibi']) s.play.cleared[x.id] = true; });
      return Text.say(s, 'obj.y.alibi', { obj: obj.name, a: A.name, b: B.name, place: World.loc(s, al.locId).name, hour: s.truth.crimeHour }, tag);
    }
    if (y.k === 'topic') {
      const n = World.npc(s, y.npc); if (!n || (s.play.xtDone && s.play.xtDone[n.id])) return null;
      (s.play.xt = s.play.xt || {})[n.id] = y.item;
      return Text.say(s, 'obj.y.topic', { obj: obj.name, first: U.first(n), item: y.item }, tag) + ' Je kunt het teruggeven als je ' + U.first(n) + ' spreekt.';
    }
    if (y.k === 'hint') {
      const open = s.evidence.filter((e) => e.source.type === 'object' && !s.play.found[e.id] && Evidence.reqMet(s, e) && e.source.locationId !== loc.id);
      if (!open.length) return null;
      return Text.say(s, 'obj.y.hint', { obj: obj.name, loc: World.loc(s, r.pick(open).source.locationId).name }, tag);
    }
    if (y.k === 'sched') {
      const who = s.cast.filter((n) => [0, 1, 2].some((p) => Schedule.at(s, n.id, s.clock.day, p) === loc.id)).sort(byNameE);
      if (!who.length) return null;
      const n = r.pick(who), p = [0, 1, 2].find((q) => Schedule.at(s, n.id, s.clock.day, q) === loc.id);
      return Text.say(s, 'obj.y.sched', { obj: obj.name, name: n.name, part: PARTS[p] }, tag);
    }
    if (y.k === 'char') {
      const own = s.cast.filter((n) => n.locationId === loc.id).sort(byNameE); if (!own.length) return null;
      const n = r.pick(own); return Text.say(s, 'obj.y.char', { obj: obj.name, name: n.name, role: String(n.role).replace(/ \(.*\)$/, ''), trait: n.personality }, tag);
    }
    return null;
  }
};
const Clock = {
  partOf: (m) => m >= NIGHT ? 3 : m >= PART_START[2] ? 2 : m >= PART_START[1] ? 1 : 0,
  // minutes and part stay in step; a save or a test that only sets the part moves the minutes to its start
  norm(s) { const c = s.clock; if (typeof c.min !== 'number' || this.partOf(c.min) !== c.part) c.min = c.part >= DAY.parts ? NIGHT : PART_START[c.part]; return c.min; },
  left: (s) => NIGHT - Clock.norm(s),
  partEnd: (part) => part < 2 ? PART_START[part + 1] : NIGHT,
  // time passes; crossing into a new part moves people, can close the place you are in, and can make it night
  spend(s, mins) {
    const c = s.clock, before = (this.norm(s), c.part);
    c.min = Math.min(NIGHT, c.min + Math.max(0, mins)); c.part = this.partOf(c.min);
    if (c.part !== before) this.turned(s, before);
  },
  turned(s, before) {
    const c = s.clock, now = c.part;
    if (now >= DAY.parts) Log.sys(s, 'Het is tien uur \'s avonds. Sluit de dag af om morgen verder te gaan.');
    else Log.sys(s, 'Het is ' + PARTS[now] + ' geworden.');
    if (!s.visit) return;
    const loc = World.here(s);
    if (now >= DAY.parts || !World.openAt(loc, now)) { if (s.visit.conv) s.visit.closing = true; else this.shut(s); return; }
    const at = (n, part) => Schedule.at(s, n.id, c.day, part) === loc.id, all = s.cast.concat(s.crowd), name = (n) => People.known(s, n.id) ? U.first(n) : null;
    const gone = all.filter((n) => at(n, before) && !at(n, now) && n.id !== s.visit.conv), come = all.filter((n) => !at(n, before) && at(n, now));
    const say = (list, verb1, verbN) => { if (!list.length) return null; const k = list.map(name).filter(Boolean).sort(), u = list.length - k.length;
      const parts = k.concat(u ? [u === 1 ? 'iemand die je niet kent' : u + ' onbekenden'] : []); const w = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' en ' + parts[parts.length - 1] : parts[0];
      return Rnd.cap(w) + ' ' + (list.length === 1 ? verb1 : verbN) + '.'; };
    const lines = [say(gone, 'vertrekt', 'vertrekken'), say(come, 'komt binnen', 'komen binnen')].filter(Boolean);
    if (lines.length) Log.narr(s, lines.join(' '));
  },
  shut(s) {
    const loc = World.here(s); if (!loc) return;
    Log.sys(s, s.clock.part >= DAY.parts ? 'Het is laat. Je verlaat ' + loc.name + '.' : loc.name + ' gaat dicht. Je staat weer buiten.');
    s.visit = null;
  },
  // to the start of the next part (waiting, or a false accusation)
  nextPart(s) {
    if (s.visit) { Act.talkEnd(s); s.visit = null; }
    if (this.norm(s), s.clock.part >= DAY.parts) return;
    this.spend(s, this.partEnd(s.clock.part) - s.clock.min);
  },
  night(s) {
    const c = s.clock, closedDay = c.day;
    s.visit = null; c.day++; c.part = 0; c.min = PART_START[0]; s.pos = s.startLoc;
    Log.narr(s, Text.say(s, 'night.sleep', Text.vars(s), 'night'));
    // v0.6.4 (Voorstel 5): Hoofdstuk-avondoverpeinzing + tikkende klok uit het Plot-DNA
    const hooks = (s.meta && s.meta.actHooks) || [];
    const hk = hooks.find((a) => a.n === closedDay);
    if (hk && hk.hook) {
      Log.narr(s, 'Avondoverpeinzing (Einde dag ' + closedDay + ' · ' + Rnd.cap(hk.emotion) + '): ' + hk.hook);
    }
    if (closedDay === 2 && s.meta && s.meta.clockText) {
      Log.sys(s, 'De tijd dringt: ' + s.meta.clockText);
    }
    if (c.day === DAY.soft) Log.sys(s, Text.say(s, 'night.soft', { day: c.day }, 'soft'));
    if (c.day > DAY.soft) Log.sys(s, Text.say(s, 'night.late', {}, 'late'));
  },
  elapsed: (c) => (c.day - 1) * DAY.parts + Math.min(c.part, DAY.parts)
};

/* ---------------- Schedule: per person (cast and crowd), per day and part, a place that is open then ----------------
   Own RNG stream per person (seed|sched|id), so the world itself never shifts. Rules: never at a closed place;
   home most of the time; a fixed second place (preferably a social one); at home at least once every day. */
const SOCIAL_TPL = ['herberg', 'plein', 'markt', 'park'];
const Schedule = {
  build(s) {
    const locs = s.world.locations, out = {};
    s.cast.concat(s.crowd).forEach((n) => {
      const r = RNG.make(s.seed + '|sched|' + n.id), home = World.loc(s, n.locationId), others = locs.filter((l) => l.id !== home.id);
      const social = others.filter((l) => SOCIAL_TPL.indexOf(l.template) >= 0), second = r.pick(social.length ? social : others), days = [];
      for (let d = 0; d < SCHED_DAYS; d++) {
        const row = [0, 1, 2].map((p) => {
          const stay = r.next() < (p === 2 ? 0.5 : 0.72);
          if (stay && World.openAt(home, p)) return home.id;
          if (World.openAt(second, p)) return second.id;
          if (World.openAt(home, p)) return home.id;
          return r.pick(locs.filter((l) => World.openAt(l, p))).id;
        });
        if (row.indexOf(home.id) < 0) { const p = [0, 1, 2].find((q) => World.openAt(home, q)); if (p != null) row[p] = home.id; }
        days.push(row);
      }
      out[n.id] = days;
    });
    return out;
  },
  at(s, id, day, part) { if (part < 0 || part >= DAY.parts) return null; const rows = s.schedule[id]; return rows ? rows[(day - 1) % SCHED_DAYS][part] : null; },
  check(s) {
    const e = [];
    s.cast.concat(s.crowd).forEach((n) => {
      const rows = s.schedule[n.id]; if (!rows || rows.length !== SCHED_DAYS) { e.push('rooster ontbreekt: ' + n.id); return; }
      rows.forEach((row, d) => {
        row.forEach((id, p) => { const l = World.loc(s, id); if (!l || !World.openAt(l, p)) e.push('rooster ' + n.id + ' dag ' + (d + 1) + ' ' + PARTS[p] + ': gesloten of onbekend'); });
        if (row.indexOf(n.locationId) < 0) e.push('rooster ' + n.id + ' dag ' + (d + 1) + ': nooit thuis');
      });
    });
    return e;
  }
};

/* ---------------- Dialogue ---------------- */

const Dialogue = {
  topics(s, npc) {
    const p = s.play, cleared = !!p.cleared[npc.id], out = [{ id: 'talk', label: 'Praat even' }], used = Dialogue.used(s, npc.id);
    if (!cleared) out.push({ id: 'crime', label: 'Over de zaak' });
    if (!cleared && !p.asked[npc.id + ':alibi']) out.push({ id: 'alibi', label: 'Waar was je die avond?' });
    s.evidence.forEach((e) => { if (e.source.type === 'talk' && e.source.npcId === npc.id && !p.found[e.id] && Evidence.reqMet(s, e)) out.push({ id: 'ev:' + e.id, label: e.source.topic }); });
    if (p.xt && p.xt[npc.id]) out.push({ id: 'xt', label: 'Geef ' + p.xt[npc.id] + ' terug' });
    // v0.7.0: check an alibi with the person it names (after you heard that alibi)
    Dialogue.checkable(s, npc).forEach((x) => out.push({ id: 'chk:' + x.id, label: 'Het alibi van ' + U.first(x) }));
    return out.filter((x) => used.indexOf(x.id) < 0);
  },
  temper: (npc) => TEMPER[npc.personality] || 'peinzend',
  fit: (npc, approach) => TONE_FIT[Dialogue.temper(npc)][approach] || TONE_FIT.peinzend.reserved,
  best: (npc) => Object.keys(APPROACH).find((a) => Dialogue.fit(npc, a)[0] === 'good'),
  // people whose alibi names this npc as companion, heard but not yet checked
  checkable(s, npc) {
    const A = s.alibis || {}, p = s.play;
    return s.cast.filter((x) => x.id !== npc.id && A[x.id] && A[x.id].withId === npc.id && p.asked[x.id + ':alibi'] && !(p.alibiCheck && p.alibiCheck[x.id]));
  },
  // v0.6.1: every topic (and treating) once per conversation; without a visit nothing is used yet
  used: (s, npcId) => (s.visit && s.visit.used[npcId]) || [],
  confronts(s, npc) {
    const p = s.play, used = Dialogue.used(s, npc.id);
    return s.contradictions.filter((c) => c.npcId === npc.id && p.heard[c.id] && p.found[c.counterEvidence] && !p.resolved[c.id] && used.indexOf('con:' + c.id) < 0);
  },
  canTreat: (s, npc) => !!(s.visit && s.visit.conv === npc.id && World.here(s).template === 'herberg' && s.player.money >= TREAT_COST && Dialogue.used(s, npc.id).indexOf('treat') < 0),
  crimeLine(s, npc, approach) {
    const T = s.truth, A = World.npc(s, T.roles.suspA), v = Text.npcVars(s, npc, { suspA: A.name });
    if (npc.id === T.culpritId) {
      if (approach === 'sharp') {
        const clue = Lib.get('methods', T.methodId).clue.text.replace('{dader}', 'iemand').toLowerCase().replace(/^./, (c) => c.toUpperCase());
        return { text: Text.say(s, 'crime.culprit.sharp', Object.assign(v, { clue: clue }), 'sharp|' + npc.id), hint: true };
      }
      return { text: Text.speak(s, npc, T.close ? 'crime.culprit.close' : 'crime.culprit.distant', v) };
    }
    if (npc.id === T.roles.suspA || npc.id === T.roles.suspB) return { text: Text.speak(s, npc, approach === 'sharp' ? 'crime.suspect.sharp' : 'crime.suspect.calm', v) };
    if (npc.id === T.roles.confidant) return { text: Text.speak(s, npc, 'crime.confidant', v) };
    return { text: Text.speak(s, npc, 'crime.general', v) };
  },
  alibiLine(s, npc) {
    const con = s.contradictions.find((c) => c.npcId === npc.id);
    if (con) { s.play.heard[con.id] = true; return con.claim; }
    const a = s.alibis && s.alibis[npc.id], loc = World.loc(s, a ? a.locId : npc.locationId), comp = a && a.withId ? World.npc(s, a.withId) : null;
    const other = comp || World.rng(s, 'alibi' + npc.id).pick(s.cast.filter((x) => x.id !== npc.id));
    return Text.speak(s, npc, 'alibi.plain', Text.npcVars(s, npc, { place: loc.name, other: other.name }));
  },
// v0.6.5 (voorstel 12): register of the protagonist per person. Je/jij for friends, love interests and labelled family
  // of the protagonist, and by default in the modern eras (except towards people of 60 and older); u otherwise.
  informal(s, npc) {
    if (!npc) return false;
    const arc = npc.relationshipArc && npc.relationshipArc.type;
    if (arc === 'friend' || arc === 'love' || / van de hoofdpersoon\)$/.test(String(npc.role || ''))) return true;
    return ['e1978', 'e1994', 'toekomst'].indexOf(s.meta.era) >= 0 && !(npc.age >= 60);
  },
  // first letter lower case, the rest (names, places) untouched
  lc: (t) => String(t || '').replace(/^./, (c) => c.toLowerCase()),
  // v0.6.4: spoken questions of the player (by topic and chosen approach); v0.6.5: every line in a u- and a je-form
  questionLine(s, npc, topicId, approach) {
    const r = World.rng(s, 'q|' + npc.id + '|' + topicId), first = U.first(npc), v = s.crime.victim.name, hour = s.truth.crimeHour;
    const loc = World.loc(s, s.crime.crimeLocationId).name, je = Dialogue.informal(s, npc) ? 1 : 0;
    const ASK = {
      talk: {
        warm: [
          ['Hoe houdt u zich staande in deze onrustige dagen, ' + first + '?', 'Hoe hou je je staande in deze onrustige dagen, ' + first + '?'],
          ['Ik kom even rustig polshoogte nemen, ' + first + '. Hoe is de stemming hier?', 'Ik kom even rustig bij je kijken, ' + first + '. Hoe is de stemming hier?'],
          ['Geen haast, ' + first + '. Vertel eens hoe het er vandaag voorstaat.', 'Geen haast, ' + first + '. Vertel eens hoe het er vandaag voorstaat.']
        ],
        reserved: [
          ['Heeft u een ogenblik voor een kort gesprek, ' + first + '?', 'Heb je even tijd voor een kort gesprek, ' + first + '?'],
          ['Ik loop een ronde door de stad, ' + first + '. Wat valt u vandaag op?', 'Ik loop een ronde door de stad, ' + first + '. Wat valt jou vandaag op?'],
          ['Kunt u mij vertellen hoe de zaken hier vandaag verlopen, ' + first + '?', 'Kun je me vertellen hoe het hier vandaag gaat, ' + first + '?']
        ],
        sharp: [
          ['Laten we er niet omheen draaien, ' + first + ': wat wordt er hier achter gesloten deuren gezegd?', 'Laten we er niet omheen draaien, ' + first + ': wat wordt er hier achter gesloten deuren gezegd?'],
          ['Ik heb weinig tijd voor beleefdheden, ' + first + '. Wat houdt u bezig?', 'Ik heb weinig tijd voor beleefdheden, ' + first + '. Wat houdt jou bezig?'],
          ['U ziet meer dan u laat merken, ' + first + '. Vertel wat er speelt.', 'Je ziet meer dan je laat merken, ' + first + '. Vertel wat er speelt.']
        ]
      },
      crime: {
        warm: [
          ['Wat denkt u zelf dat er met ' + v + ' bij ' + loc + ' is gebeurd, ' + first + '? U kent de mensen hier goed.', 'Wat denk jij dat er met ' + v + ' bij ' + loc + ' is gebeurd, ' + first + '? Jij kent de mensen hier goed.'],
          ['Tussen ons gezegd, ' + first + ': gelooft u het officiële verhaal rond ' + v + '?', 'Tussen ons gezegd, ' + first + ': geloof jij het officiële verhaal rond ' + v + '?'],
          ['Het laat mij niet los wat er met ' + v + ' is gebeurd. Heeft u enig idee wie hierachter kan zitten?', 'Het laat me niet los wat er met ' + v + ' is gebeurd. Heb jij enig idee wie hierachter kan zitten?']
        ],
        reserved: [
          ['Wat kunt u mij vertellen over het voorval rond ' + v + ' bij ' + loc + '?', 'Wat kun je me vertellen over het voorval rond ' + v + ' bij ' + loc + '?'],
          ['Hoe kijkt u naar wat er met ' + v + ' is voorgevallen, ' + first + '?', 'Hoe kijk jij naar wat er met ' + v + ' is voorgevallen, ' + first + '?'],
          ['Welke geluiden hoort u in de stad over de zaak rond ' + v + '?', 'Wat hoor jij in de stad over de zaak rond ' + v + '?']
        ],
        sharp: [
          ['Iemand in deze stad liegt over wat er met ' + v + ' is gebeurd, ' + first + '. Wat weet u ervan?', 'Iemand in deze stad liegt over wat er met ' + v + ' is gebeurd, ' + first + '. Wat weet jij ervan?'],
          ['Kijk me eens aan, ' + first + ': wat verzwijgt men over die avond bij ' + loc + '?', 'Kijk me eens aan, ' + first + ': wat verzwijgt men over die avond bij ' + loc + '?'],
          ['Het officiële verhaal over ' + v + ' rammelt aan alle kanten. Wat is uw rol hierin, ' + first + '?', 'Het officiële verhaal over ' + v + ' rammelt aan alle kanten. Wat is jouw rol hierin, ' + first + '?']
        ]
      },
      alibi: {
        warm: [
          ['Om misverstanden uit te sluiten, ' + first + ': waar was u zelf op de avond van het voorval?', 'Om misverstanden uit te sluiten, ' + first + ': waar was jij zelf op de avond van het voorval?'],
          ['Het helpt mij enorm als ik weet wie waar was die avond. Waar bracht u de avond door, ' + first + '?', 'Het helpt me enorm als ik weet wie waar was die avond. Waar was jij, ' + first + '?'],
          ['Zou u mij willen vertellen waar u die bewuste avond rond ' + hour + ' uur was, ' + first + '?', 'Wil je me vertellen waar je die avond rond ' + hour + ' uur was, ' + first + '?']
        ],
        reserved: [
          ['Waar was u op de avond van het voorval rond ' + hour + ' uur, ' + first + '?', 'Waar was je op de avond van het voorval rond ' + hour + ' uur, ' + first + '?'],
          ['Kunt u aangeven waar u die avond verbleef, en of iemand dat kan bevestigen?', 'Waar was je die avond, en kan iemand dat bevestigen?'],
          ['Voor mijn aantekeningen, ' + first + ': waar bevond u zich tijdens die avond?', 'Voor mijn aantekeningen, ' + first + ': waar was je die avond?']
        ],
        sharp: [
          ['Waar was u die avond precies om ' + hour + ' uur, ' + first + ', en wie kan dat bewijzen?', 'Waar was je die avond precies om ' + hour + ' uur, ' + first + ', en wie kan dat bewijzen?'],
          ['Geen uitvluchten graag, ' + first + ': waar zat u op het uur van het voorval?', 'Geen uitvluchten, ' + first + ': waar zat je op het uur van het voorval?'],
          ['Ik controleer ieders gangen van die avond. Waar beweert u dat u was, ' + first + '?', 'Ik controleer ieders gangen van die avond. Waar beweer jij dat je was, ' + first + '?']
        ]
      }
    };
    if (ASK[topicId]) return Text.q(r.pick(ASK[topicId][approach] || ASK[topicId].reserved)[je]);
    if (topicId === 'xt') return Text.q(['Dit vond ik, ' + first + '. Het is van u, geloof ik.', 'Dit vond ik, ' + first + '. Het is van jou, toch?'][je]);
    if (topicId.indexOf('chk:') === 0) {
      const x = World.npc(s, topicId.slice(4)), a = s.alibis[x.id], place = World.loc(s, a.locId).name, xf = U.first(x);
      return Text.q(['Klopt het dat ' + xf + ' die avond bij u was, in ' + place + ', ' + first + '?', 'Klopt het dat ' + xf + ' die avond bij jou was, in ' + place + ', ' + first + '?'][je]);
    }
    if (topicId.indexOf('ev:') === 0) {
      const e = Evidence.get(s, topicId.slice(3)), top = Dialogue.lc((e && e.source && e.source.topic) || 'dit spoor');
      if (approach === 'warm') return Text.q(['Ik hoop dat u mij in vertrouwen kunt helpen, ' + first + ': wat weet u over ' + top + '?', 'Ik hoop dat je me in vertrouwen kunt helpen, ' + first + ': wat weet je over ' + top + '?'][je]);
      if (approach === 'sharp') return Text.q(['Vertel mij nu meteen de waarheid, ' + first + ': wat weet u over ' + top + '?', 'Vertel me nu meteen de waarheid, ' + first + ': wat weet je over ' + top + '?'][je]);
      return Text.q(['Ik wil u iets voorleggen, ' + first + ': wat kunt u mij vertellen over ' + top + '?', 'Ik wil je iets voorleggen, ' + first + ': wat kun je me vertellen over ' + top + '?'][je]);
    }
    return Text.q(['Kunt u mij daar meer over vertellen, ' + first + '?', 'Kun je me daar meer over vertellen, ' + first + '?'][je]);
  },
  confrontLine(s, npc, title) {
    const first = U.first(npc), t = Dialogue.lc(title);
    return Text.q(Dialogue.informal(s, npc) ? 'Je beweerde eerder iets anders, ' + first + '. Hoe verklaar je ' + t + '?' : 'U beweerde eerder iets anders, ' + first + '. Hoe verklaart u ' + t + '?');
  }
};


/* ---------------- Pins (v0.11.0): your own notes on the case board, archive folders and free threads ----------------
   Card ids: p:<person>, d:<piece found on an object>, s:<other evidence or con_ statement>, l:<visited place>, case.
   Only the player writes these; the puzzle never reads them. */
const Pins = {
  ZONE: { p: 'person', d: 'doc', o: 'doc', s: 'stmt', l: 'place' },
  FOLDER: { person: 'Archief Personen', doc: 'Archief Stukken', stmt: 'Archief Verklaringen', place: 'Archief Plaatsen' },
  zone(id) { return id === 'case' ? 'case' : this.ZONE[String(id).split(':')[0]] || null; },
  cardOf(s, eid) { const e = Evidence.get(s, eid); return e ? (e.source.type === 'object' ? 'd:' : 's:') + e.id : null; },
  // a card that can stand on the board right now
  ok(s, id) {
    if (id === 'case') return true;
    const k = String(id).split(':')[0], ref = String(id).slice(k.length + 1), p = s.play;
    // v0.12.0: also people and places you have only heard of, and objects you marked with a ? (blank cards)
    if (k === 'p') return s.cast.some((n) => n.id === ref) && !!(p.met[ref] || (p.heardOf && p.heardOf[ref]));
    if (k === 'l') return !!World.loc(s, ref) && !!(p.visited[ref] || (p.heardOfLoc && p.heardOfLoc[ref]));
    if (k === 'o') return !!(p.early && p.early[ref]) && !s.evidence.some((e) => e.source.objectId === ref && p.found[e.id]);
    if (k === 's' && ref.indexOf('con_') === 0) return s.contradictions.some((c) => c.id === ref && p.heard[c.id]);
    if (k !== 's' && k !== 'd') return false;
    const e = Evidence.get(s, ref); if (!e || !p.found[e.id] || e.route === 'start') return false;
    return (e.source.type === 'object') === (k === 'd');
  },
  key: (a, b) => a < b ? a + '|' + b : b + '|' + a,
  threads: (s) => (s.player && Array.isArray(s.player.threads)) ? s.player.threads : [],
  has(s, a, b) { const k = this.key(a, b); return this.threads(s).some((t) => this.key(t[0], t[1]) === k); },
  ends(s, id) { return this.threads(s).filter((t) => t[0] === id || t[1] === id).map((t) => t[0] === id ? t[1] : t[0]); },
  archived: (s, id) => !!(s.player && s.player.archive && s.player.archive[id]),
  inFolder(s, zone) { const A = (s.player && s.player.archive) || {}; return Object.keys(A).filter((id) => A[id] && this.zone(id) === zone && this.ok(s, id)).sort(); },
  // saves from v0.7 to v0.10 kept one thread from a piece to one person
  migrate(s) { const L = (s.player && s.player.links) || {}, out = [];
    Object.keys(L).sort().forEach((eid) => { const a = this.cardOf(s, eid), b = L[eid] ? 'p:' + L[eid] : null; if (a && b && !out.some((t) => this.key(t[0], t[1]) === this.key(a, b))) out.push(a < b ? [a, b] : [b, a]); });
    return out; }
};

/* ---------------- Travel (v0.12.0): walking minutes between places, from the town map ----------------
   15 minutes close by, 30 across town, 45 to the far side. The map is built per seed (views.js); without it, 30. */
const Travel = {
  maps: [],
  map(s) {
    if (typeof MapGen === 'undefined') return null;
    let hit = this.maps.find((x) => x.seed === s.seed); if (hit) return hit.M;
    hit = { seed: s.seed, M: MapGen.build(s) }; this.maps.unshift(hit); this.maps.length = Math.min(this.maps.length, 6); return hit.M;
  },
  min(s, a, b) {
    if (!a || !b || a === b) return 0; const M = this.map(s), p = M && M.pos[a], q = M && M.pos[b]; if (!p || !q) return 30;
    const d = Math.hypot(q.x - p.x, q.y - p.y); return d < 300 ? 15 : d < 620 ? 30 : 45;
  },
  // what happens if you set off now: arrival time and whether the door is open then
  check(s, locId) {
    const loc = World.loc(s, locId), now = Clock.norm(s), walk = Travel.min(s, s.pos, locId), at = now + walk, part = Clock.partOf(at);
    return { loc: loc, walk: walk, at: at, part: part, late: at >= NIGHT, open: !!loc && part < DAY.parts && World.openAt(loc, part), here: s.pos === locId };
  }
};

/* ---------------- Actions (the only place that changes game state) ----------------
   v0.6.1: a visit costs one part of the day (paid on leaving); examining, talking and asking around inside a
   visit cost nothing. One conversation per person per visit; every topic once per conversation. */
const Act = {
  _done(s) { s.turn++; Rules.post(s); },
  _open(s, loc) {
    s.visit = { locId: loc.id, conv: null, convAt: 0, done: {}, used: {} }; s.pos = loc.id;
    s.play.visits = (s.play.visits || 0) + 1;
    if (!s.play.visited[loc.id]) { s.play.visited[loc.id] = true; Log.narr(s, loc.name + '. ' + loc.description); }
    else Log.narr(s, 'Je bent terug in ' + loc.name + ', om ' + U.hm(Clock.norm(s)) + '.');
    this._done(s);
  },
  // v0.12.0: walking costs minutes from where you are; you arrive in the part of the day the clock has reached by then
  visit(s, locId) {
    if (s.play.ended || s.visit) return false;
    Clock.norm(s); if (s.clock.part >= DAY.parts) return false;
    const T = Travel.check(s, locId), loc = T.loc; if (!loc) return false;
    if (T.late) { Log.sys(s, 'Je komt pas om ' + U.hm(T.at) + ' aan in ' + loc.name + '. Dat is te laat voor vandaag.'); return false; }
    if (!T.open) { Log.sys(s, loc.name + ' is dicht in de ' + PARTS[T.part] + (T.part !== s.clock.part ? ', als je er om ' + U.hm(T.at) + ' aankomt' : '') + '. Open van ' + loc.open[0] + ' tot ' + loc.open[1] + ' uur.'); return false; }
    if (T.walk) { Log.narr(s, 'Je loopt naar ' + loc.name + '. Dat kost ' + T.walk + ' minuten.'); Clock.spend(s, T.walk); }
    this._open(s, loc); return true;
  },
  // debug: open a visit anywhere, ignoring opening hours and walking
  force(s, locId) {
    const loc = World.loc(s, locId); if (!loc || s.play.ended) return false; Clock.norm(s); if (s.clock.part >= DAY.parts) return false;
    s.visit = null; this._open(s, loc); return true;
  },
  // v0.12.0: every action in a visit costs minutes (talking within a conversation is free); false when it is too late
  _can(s, kind) {
    if (!s.visit) return false;
    if (Level.cost(s, kind) > Clock.left(s)) { Log.sys(s, 'Daar is het te laat voor. Sluit de dag af en kom morgen terug.'); return false; }
    return true;
  },
  _tick(s, kind) { Clock.spend(s, Level.cost(s, kind)); },
  leave(s) {
    if (s.play.ended || !s.visit) return false;
    const loc = World.here(s); this.talkEnd(s); if (!s.visit) { this._done(s); return true; }
    s.visit = null; Log.narr(s, 'Je staat weer buiten bij ' + loc.name + '. Het is ' + U.hm(Clock.norm(s)) + '.');
    this._done(s); return true;
  },
  // v0.11.0: archive a board card in the folder of its zone, or take it back out; the case card always stays
  archive(s, id, on) {
    if (!id || id === 'case' || !Pins.zone(id) || !Pins.ok(s, id)) return false;
    const A = s.player.archive = s.player.archive || {}; if (on) A[id] = true; else delete A[id]; return true;
  },
  // v0.11.0: a thread between any two board cards, as many as you like; pulling the same pair again removes it
  thread(s, a, b) {
    if (!a || !b || a === b || !Pins.ok(s, a) || !Pins.ok(s, b)) return false;
    const T = s.player.threads = Pins.threads(s).slice(), k = Pins.key(a, b), i = T.findIndex((t) => Pins.key(t[0], t[1]) === k);
    if (i >= 0) T.splice(i, 1); else T.push(a < b ? [a, b] : [b, a]); return true;
  },
  wait(s) {
    if (s.play.ended || s.visit) return false; Clock.norm(s); if (s.clock.part >= DAY.parts) return false;
    const part = s.clock.part;
    Log.narr(s, Text.say(s, 'day.wait', { part: PARTS[part], next: PARTS[part + 1], weather: Text.weather(s) }, 'wait'));
    Clock.nextPart(s); this._done(s); return true;
  },
  endDay(s) {
    if (s.play.ended || s.visit || s.clock.part < 2) return false;
    Log.narr(s, 'Je besluit dat het genoeg is voor vandaag.');
    Clock.night(s); this._done(s); return true;
  },
  // debug: next part (or the next morning at night)
  skipPart(s) {
    if (s.play.ended) return false;
    if (s.clock.part >= DAY.parts) Clock.night(s); else Clock.nextPart(s);
    Log.sys(s, '[debug] dagdeel verzet naar ' + U.time(s.clock));
    this._done(s); return true;
  },
  examine(s, objId) {
    if (s.play.ended || !s.visit) return;
    const loc = World.here(s), obj = loc.objects.find((o) => o.id === objId); if (!obj) return;
    this.talkEnd(s);
    s.play.early = s.play.early || {}; s.play.examined = s.play.examined || {};
    const ev = s.evidence.find((e) => e.source.type === 'object' && e.source.objectId === obj.id && !s.play.found[e.id]);
    const spent = s.evidence.some((e) => e.source.objectId === obj.id && s.play.found[e.id]) || (!ev && s.play.examined[obj.id]);
    if (spent) { Log.narr(s, Text.say(s, 'obj.done', { obj: obj.name }, 'done')); this._done(s); return; }   // nothing new: free
    if (!this._can(s, 'examine')) { this._done(s); return; }
    Log.narr(s, Text.say(s, 'obj.examine', { obj: obj.name }, 'examine'));
    if (ev && Evidence.reqMet(s, ev)) {
      delete s.play.early[obj.id];
      Log.narr(s, ev.text);
      Evidence.give(s, ev, 'object');
    } else if (ev) {
      Log.narr(s, Text.say(s, 'obj.tooEarly', {}, 'early'));
      if (Level.get(s).early) { s.play.early[obj.id] = true; Log.sys(s, 'Je markeert ' + obj.name + ' met een ? in je notities om hier later terug te keren.'); }
    } else {
      s.play.examined[obj.id] = true;
      const y = World.yieldOf(s, loc, obj);
      Log.narr(s, y || Text.say(s, 'obj.nothing.' + loc.template, Text.vars(s), 'obj' + obj.id));
    }
    this._tick(s, 'examine'); this._done(s);
  },
  talkStart(s, npcId) {
    if (s.play.ended || !s.visit) return false;
    const npc = World.npc(s, npcId); if (!npc || !World.present(s).some((n) => n.id === npcId) || s.visit.done[npcId]) return false;
    if (s.visit.conv === npcId) return true;
    this.talkEnd(s); if (!s.visit) return false;
    // speaking to a stranger costs the same as any greeting, so the price never tells core from crowd
    const kind = People.known(s, npcId) ? 'talk' : 'greet';
    if (!this._can(s, kind)) { this._done(s); return false; }
    s.visit.conv = npcId; s.visit.convAt = s.play.logN || 0;
    if (!s.play.met[npcId]) { s.play.met[npcId] = true; Log.narr(s, npc.name + ', ' + npc.role + '. ' + Rnd.cap(npc.personality) + '; ' + npc.voice + '.'); }
    else Log.narr(s, 'Je zoekt ' + npc.name + ' op.');
    this._tick(s, kind); s.turn++; return true;
  },
  // ends the current conversation; that person is done for this visit. A place that closed meanwhile shows you out.
  talkEnd(s) { if (!s.visit || !s.visit.conv) return; s.visit.done[s.visit.conv] = true; s.visit.conv = null; if (s.visit.closing) Clock.shut(s); },
  _use(s, npcId, key) { (s.visit.used[npcId] = s.visit.used[npcId] || []).push(key); },
  _inConv: (s, npcId) => !s.play.ended && !!s.visit && s.visit.conv === npcId,   // v0.12.0: a talk lasts, even when the hour turns
  topic(s, npcId, topicId, approach) {
    if (!this._inConv(s, npcId)) return;
    const npc = World.npc(s, npcId);
    approach = APPROACH[approach] ? approach : 'reserved';
    if (!Dialogue.topics(s, npc).some((t) => t.id === topicId)) return;   // engine validates every choice
    this._use(s, npcId, topicId);
    Log.ask(s, npc, Dialogue.questionLine(s, npc, topicId, approach), approach);
    const fit = Dialogue.fit(npc, approach);
    Rels.apply(s, npcId, fit[1]);
    if (fit[0] === 'good') s.play.warmTalks[npcId] = (s.play.warmTalks[npcId] || 0) + 1;   // v0.9.0: counts talks in the right tone
    const cueKey = 'cue|' + npcId + '|' + approach;
    if (fit[0] !== 'ok' && s.visit && !(s.visit.used[npcId] || []).some((k) => k === cueKey)) { this._use(s, npcId, cueKey); Log.narr(s, Text.say(s, fit[0] === 'good' ? 'tone.good' : 'tone.bad', Text.npcVars(s, npc), 'cue|' + npcId)); }
    const tone = Rels.toneOf(s, npcId), v = Text.npcVars(s, npc), evade = (t) => Text.speak(s, npc, t === 'hostile' ? 'evade.hostile' : 'evade.cold', v);
    if (topicId === 'talk') Log.npc(s, npc, Text.speak(s, npc, 'talk.' + tone + '.' + (TEMPER[npc.personality] || 'peinzend'), v), tone);
    else if (topicId === 'crime') {
      if (tone === 'hostile') Log.npc(s, npc, evade(tone), tone);
      else { const l = Dialogue.crimeLine(s, npc, approach); Log.npc(s, npc, l.text, tone); if (l.hint && Level.get(s).hint) Log.sys(s, 'Iets in die reactie klopt niet. Je onthoudt het.'); }
    } else if (topicId === 'alibi') {
      s.play.asked[npcId + ':alibi'] = true;
      if (tone === 'hostile') Log.npc(s, npc, Text.say(s, 'alibi.hostileLead', v, 'lead|' + npc.id) + ' ' + Dialogue.alibiLine(s, npc), tone);
      else Log.npc(s, npc, Dialogue.alibiLine(s, npc), tone);
    } else if (topicId === 'xt') {
      const it = s.play.xt[npcId]; delete s.play.xt[npcId]; (s.play.xtDone = s.play.xtDone || {})[npcId] = it;
      Rels.apply(s, npcId, { trust: 6, affection: 5, resentment: -4 });
      Log.npc(s, npc, Text.speak(s, npc, 'xt.answer', v), Rels.toneOf(s, npcId));
    } else if (topicId.indexOf('chk:') === 0) {
      const x = World.npc(s, topicId.slice(4)), a = s.alibis[x.id], L = Level.get(s);
      if (tone !== 'warm' && tone !== 'neutral') { Log.npc(s, npc, evade(tone), tone); Log.sys(s, U.first(npc) + ' wil daar nu niets over zeggen. Met een andere toon lukt het misschien bij een volgend bezoek.'); }
      else {
        s.play.alibiCheck = s.play.alibiCheck || {};
        const den = s.evidence.find((e) => e.source.type === 'check' && e.source.ofId === x.id);
        if (!den && s.truth.twist === 'medeplichtige' && x.id === s.truth.culpritId) {   // v0.9.0: the companion lies for the culprit
          Log.npc(s, npc, Text.speak(s, npc, 'alibi.check.yes', Text.npcVars(s, npc, { x: U.first(x), place: World.loc(s, a.locId).name })), tone);
          s.play.alibiCheck[x.id] = { by: npc.id, ok: true, lie: true };
          if (L.checkLabel) { s.play.cleared[x.id] = true; Log.sys(s, U.first(npc) + ' bevestigt het alibi van ' + U.first(x) + '. ' + U.pr(x).Hij + ' valt af als verdachte.'); }
          else Log.sys(s, 'Je noteert wat ' + U.first(npc) + ' zegt over ' + U.first(x) + '.');
        } else if (den) { Log.npc(s, npc, den.text, tone); s.play.alibiCheck[x.id] = { by: npc.id, ok: false }; Evidence.give(s, den, 'check'); }
        else {
          Log.npc(s, npc, Text.speak(s, npc, 'alibi.check.yes', Text.npcVars(s, npc, { x: U.first(x), place: World.loc(s, a.locId).name })), tone);
          s.play.alibiCheck[x.id] = { by: npc.id, ok: a.truth };
          if (L.checkLabel) { s.play.cleared[x.id] = true; Log.sys(s, U.first(npc) + ' bevestigt het alibi van ' + U.first(x) + '. ' + U.pr(x).Hij + ' valt af als verdachte.'); }
          else Log.sys(s, 'Je noteert wat ' + U.first(npc) + ' zegt over ' + U.first(x) + '.');
        }
      }
    } else if (topicId.indexOf('ev:') === 0) {
      const e = Evidence.get(s, topicId.slice(3));
      if (tone === 'warm' || tone === 'neutral') { Log.npc(s, npc, e.text, tone); Evidence.give(s, e, 'talk'); }
      else { Log.npc(s, npc, evade(tone), tone); Log.sys(s, U.first(npc) + ' houdt iets achter. Met een andere toon lukt het misschien bij een volgend bezoek.'); }
    }
    this._done(s);
  },
  confront(s, conId) {
    const c = s.contradictions.find((x) => x.id === conId); if (!c || !this._inConv(s, c.npcId)) return;
    const npc = World.npc(s, c.npcId);
    if (!Dialogue.confronts(s, npc).some((x) => x.id === conId)) return;
    this._use(s, npc.id, 'con:' + conId);
    const counter = Evidence.get(s, c.counterEvidence);
    s.play.resolved[conId] = true;
    const v = Text.npcVars(s, npc, { title: counter.title, loc: World.loc(s, s.truth.otherLocationId).name });
    Log.ask(s, npc, Dialogue.confrontLine(s, npc, counter.title), 'sharp');
    Log.narr(s, Text.say(s, 'confront.lead', v, 'conlead'));
    if (c.kind === 'culprit') {
      Rels.apply(s, npc.id, { resentment: 10, trust: -8, suspicion: 15 });
      Log.npc(s, npc, s.truth.close ? Text.say(s, 'confront.culprit.close', v, 'conc')
        : Text.say(s, 'confront.culprit.distant', v, 'cond'), Rels.toneOf(s, npc.id));
      Evidence.give(s, Evidence.get(s, c.yields), 'confront');
    } else {
      Rels.apply(s, npc.id, { resentment: 4, trust: 2 });
      Log.narr(s, c.reveal);
      s.play.cleared[npc.id] = true; s.play.debunked[c.counterEvidence] = true;
      Log.sys(s, U.first(npc) + ' valt af als verdachte. ' + counter.title + ' is weerlegd.');
    }
    this._done(s);
  },
  mingle(s, crowdId) {
    if (s.play.ended || !s.visit) return;
    const here = World.crowdHere(s); if (!here.length) { Log.sys(s, 'Er is hier niemand om mee te praten.'); return; }
    const c = (crowdId && here.find((x) => x.id === crowdId)) || World.rng(s, 'mingle').pick(here);
    if (s.visit.done[c.id]) return;
    this.talkEnd(s); if (!s.visit) return;
    if (!this._can(s, 'mingle')) { this._done(s); return; }
    s.visit.done[c.id] = true; s.play.metCrowd = s.play.metCrowd || {};
    if (!s.play.metCrowd[c.id]) { s.play.metCrowd[c.id] = true; Log.narr(s, 'Het is ' + c.name + ', ' + c.role + '. ' + Rnd.cap(U.pr(c).hij) + ' heeft verder niets met de zaak te maken.'); }
    const line = Crowd.line(s, c);
    if (line) Log.crowd(s, c, line);
    else Log.narr(s, Text.say(s, 'crowd.quiet', { name: c.name }, 'quiet'));
    this._tick(s, 'mingle'); this._done(s);
  },
  // v0.8.0 (nieuw A): speak to someone you do not know yet; a core person opens an interrogation, a figurant gives one line
  greet(s, id) { return People.isCore(s, id) ? this.talkStart(s, id) : this.mingle(s, id); },
  treat(s, npcId) {
    const npc = World.npc(s, npcId); if (!npc || !this._inConv(s, npcId) || !Dialogue.canTreat(s, npc)) return;
    this._use(s, npcId, 'treat');
    s.player.money -= TREAT_COST; Rels.apply(s, npcId, { affection: 4, trust: 2, resentment: -2 });
    const drink = Text.say(s, 'drink', {}, 'drink', { limit: 99 }), v = Text.npcVars(s, npc, { drink: drink });
    Log.narr(s, Text.say(s, 'treat.narr', v, 'treat'));
    Log.npc(s, npc, Rels.toneOf(s, npcId) === 'hostile' ? Text.say(s, 'treat.hostile', v, 'treath') : Text.speak(s, npc, 'treat.ok', v), Rels.toneOf(s, npcId));
    this._done(s);
  },
  setDossier(s, field, id) { if (['suspectId', 'motiveEvidenceId', 'methodEvidenceId'].indexOf(field) >= 0) s.player.dossier[field] = id || null; },
  accuse(s) {
    if (s.play.ended) return null;
    const res = Accuse.evaluate(s);
    if (!res.complete) return res;
    s.turn++;
    if (res.correct) {
      s.play.ended = Accuse.ending(s, res);
      s.visit = null;
      Log.narr(s, Text.say(s, 'accuse.solved', Text.vars(s), 'solved'));
    } else {
      s.play.wrongAccusations++;
      const sus = World.npc(s, s.player.dossier.suspectId);
      s.cast.forEach((n) => Rels.apply(s, n.id, { trust: -5 }));
      if (sus) Rels.apply(s, sus.id, { resentment: 25, trust: -15 });
      Log.narr(s, res.reason);
      Log.sys(s, 'De aanklacht houdt geen stand. Het kost je vertrouwen in de stad, en een dagdeel.');
      s.player.dossier = { suspectId: null, motiveEvidenceId: null, methodEvidenceId: null };
      Clock.nextPart(s);   // a false accusation costs the rest of the current part
    }
    Rules.post(s);
    return res;
  }
};

/* ---------------- Rules: checks after every turn ---------------- */
const Rules = {
  post(s) {
    const p = s.play, T = s.truth, wEv = s.evidence.find((e) => e.key === 'people_witness'), L = Level.get(s);
    // alibi confirmation filters irrelevant questions away (v0.7.0: automatic on Makkelijk only)
    if (L.autoClear) s.cast.forEach((n) => {
      if (p.cleared[n.id] || n.id === T.culpritId || s.contradictions.some((c) => c.npcId === n.id && c.kind !== 'culprit' && !p.resolved[c.id])) return;
      if (p.asked[n.id + ':alibi'] && wEv && p.found[wEv.id]) { p.cleared[n.id] = true; Log.sys(s, 'Wat ' + U.first(n) + ' over die avond vertelde, wordt door anderen bevestigd. ' + U.pr(n).Hij + ' valt af als verdachte.'); }
    });
    // relationship arcs
    const cul = World.npc(s, T.culpritId), against = s.evidence.filter((e) => p.found[e.id] && e.pointsTo === T.culpritId && e.slot).length;
    const broke = s.evidence.some((e) => e.key === 'people_method' && p.found[e.id]);
    if (T.close && (L.autoClear ? against >= 2 : broke) && !p.flipped[cul.id]) {
      p.flipped[cul.id] = 'enemy'; Rels.apply(s, cul.id, { resentment: 15, suspicion: 25 }); s.relations[cul.id].statusText = 'afstandelijk en op zijn hoede';
      Log.narr(s, Text.say(s, 'flip.culprit', Text.npcVars(s, cul), 'flipc'));
    }
    s.cast.forEach((n) => {
      if (n.relationshipArc.type === 'enemy' && !p.flipped[n.id] && (p.warmTalks[n.id] || 0) >= 3) {
        p.flipped[n.id] = 'friend'; Rels.apply(s, n.id, { resentment: -20, trust: 15 }); s.relations[n.id].statusText = 'voorzichtig bevriend';
        Log.narr(s, Text.say(s, 'flip.friend', Text.npcVars(s, n), 'flipf'));
      }
      if (n.relationshipArc.type === 'love' && !p.flipped[n.id] && s.relations[n.id].affection >= 70) {
        p.flipped[n.id] = 'love'; s.relations[n.id].statusText = 'verliefd, maar nog onuitgesproken';
        Log.narr(s, Text.say(s, 'flip.love', Text.npcVars(s, n), 'flipl'));
      }
    });
  }
};

/* ---------------- Accusation (v0.6.3: style-aware Zaakverslag ending) ---------------- */
const Accuse = {
  evaluate(s) {
    const d = s.player.dossier, T = s.truth;
    if (!d.suspectId || !d.motiveEvidenceId || !d.methodEvidenceId) return { complete: false };
    const m = Evidence.get(s, d.motiveEvidenceId), me = Evidence.get(s, d.methodEvidenceId), sus = World.npc(s, d.suspectId);
    if (!m || !me || !s.play.found[m.id] || !s.play.found[me.id] || m.slot !== 'motive' || me.slot !== 'method') return { complete: true, correct: false, reason: Text.say(s, 'accuse.mismatch', {}, 'acc') };
    if (d.suspectId !== T.culpritId) return { complete: true, correct: false, reason: Text.say(s, 'accuse.person', Text.npcVars(s, sus), 'acc') };
    if (m.pointsTo !== T.culpritId || me.pointsTo !== T.culpritId || s.play.debunked[m.id] || s.play.debunked[me.id])
      return { complete: true, correct: false, reason: Text.say(s, 'accuse.evidence', Text.npcVars(s, sus), 'acc') };
    return { complete: true, correct: true };
  },
  ending(s, res) {
    const T = s.truth, c = World.npc(s, T.culpritId), found = Evidence.found(s).length, total = s.evidence.length;
    const styleId = (s.meta && s.meta.dna && s.meta.dna.styles) || 'gezelschap';
    const v = Text.npcVars(s, c, { motive: T.motive.toLowerCase(), method: T.method.toLowerCase() }), lines = [];
    lines.push(Text.say(s, 'end.open', v, 'end1'));
    const stKey = 'end.style.' + styleId;
    if (Content.schemaFor(stKey)) lines.push(Text.say(s, stKey, v, 'endst'));
    lines.push(Text.say(s, T.close ? 'end.close' : 'end.distant', v, 'end2'));
    if (T.twist === 'zondebok') lines.push(Text.say(s, 'end.twist.zondebok', Object.assign({}, v, { a: World.npc(s, T.roles.suspA).name }), 'endtw'));
    if (T.twist === 'medeplichtige') lines.push(Text.say(s, 'end.twist.medeplichtige', Object.assign({}, v, { comp: World.npc(s, T.roles.companion).name }), 'endtw'));
    const q = (s.clock.day <= 3 ? 2 : s.clock.day <= DAY.soft ? 1 : 0) + (s.play.wrongAccusations === 0 ? 1 : 0) + (found >= total - 2 ? 1 : 0);
    lines.push(Text.say(s, 'end.quality.' + Math.min(q, 3), {}, 'endq'));
    const epi = s.cast.filter((n) => n.id !== c.id).map((n) => {
      const t = Rels.toneOf(s, n.id), arc = n.relationshipArc.type, vv = Text.npcVars(s, n);
      if (arc === 'love' && t === 'warm' && s.relations[n.id].affection >= 60) return Text.say(s, 'epi.love', vv, 'epi|' + n.id, { limit: 1 });
      return Text.say(s, 'epi.' + (t === 'hostile' ? 'cold' : t) + '.' + (['friend', 'love', 'enemy'].indexOf(arc) >= 0 ? arc : 'none'), vv, 'epi|' + n.id, { limit: 1 });
    });
    return { correct: true, quality: q, styleId: styleId, text: lines, epilogue: epi, stats: { day: s.clock.day, found: found, total: total, wrong: s.play.wrongAccusations } };
  }
};

/* ---------------- Solver (tests + debug): proves reachability per route ---------------- */
const Solver = {
  run(s0, only) {
    const s = U.clone(s0), p = s.play; let progress = true, guard = 0;
    while (progress && guard++ < 50) {
      progress = false;
      s.contradictions.forEach((c) => { if (!p.heard[c.id]) { p.heard[c.id] = true; progress = true; } });
      s.evidence.forEach((e) => {
        if (p.found[e.id] || !Evidence.reqMet(s, e)) return;
        if (only && e.route !== 'start' && e.route !== only) return;
        if (e.source.type === 'confront') { const c = s.contradictions.find((x) => x.id === e.source.conId); if (!p.found[c.counterEvidence]) return; }
        if (e.source.type === 'object' && !World.loc(s, e.source.locationId)) return;
        if ((e.source.type === 'talk' || e.source.type === 'check') && !World.npc(s, e.source.npcId)) return;
        p.found[e.id] = { day: 0, via: 'solver' }; progress = true;
      });
    }
    const has = (slot) => s.evidence.some((e) => p.found[e.id] && e.slot === slot && e.pointsTo === s.truth.culpritId);
    return { state: s, motive: has('motive'), method: has('method'), found: Object.keys(p.found).length };
  },
  // v0.6.1: plays a route visit by visit against the schedule and opening hours (greedy: the place with the most
  // new evidence; ties by id). Inside a visit: talk to everyone present (alibi, topics, confrontation), examine all.
  // Tone is assumed manageable (warm approach). Returns the parts used, the visits and whether it fits the budget.
  plan(s0, only, budget) {
    budget = budget || DAY.budget;
    const s = s0, T = s.truth, P = { found: Object.assign({}, s.play.found), heard: Object.assign({}, s.play.heard) }, path = [];
    const usable = (e, Q) => !Q.found[e.id] && e.requires.every((r) => Q.found[r]) && (!e.needHeard || Q.heard[e.needHeard]) && (!only || e.route === 'start' || e.route === only);
    // v0.12.0: a visit lasts until the part of the day ends; each conversation or object costs its minutes. Greedy within
    // the visit: the action with the most new evidence first (hearing a new alibi claim counts half).
    const cTalk = Level.cost(s, 'talk'), cObj = Level.cost(s, 'examine');
    const visitAt = (Q, locId, day, part, tLeft) => {
      const present = s.cast.filter((n) => Schedule.at(s, n.id, day, part) === locId), got = [], used2 = new Set(); let heardNew = 0, mins = 0;
      const give = (e) => { Q.found[e.id] = { day: day, part: part, via: 'plan' }; got.push(e.id); };
      const talkGain = (n, apply) => {   // what one conversation with n yields (topics are free inside it)
        let v = 0;
        s.contradictions.forEach((c) => { if (c.npcId === n.id && !Q.heard[c.id]) { v += 0.5; if (apply) { Q.heard[c.id] = true; heardNew++; } } });
        const H = apply ? Q.heard : Object.assign({}, Q.heard); s.contradictions.forEach((c) => { if (c.npcId === n.id) H[c.id] = true; });
        let more = true; const F = apply ? Q.found : Object.assign({}, Q.found);
        while (more) {
          more = false;
          s.evidence.forEach((e) => {
            if (F[e.id] || !e.requires.every((r) => F[r]) || (e.needHeard && !H[e.needHeard]) || (only && e.route !== 'start' && e.route !== only)) return;
            const src = e.source, con = src.type === 'confront' ? s.contradictions.find((c) => c.id === src.conId) : null;
            const ok = (src.type === 'talk' || src.type === 'check') ? src.npcId === n.id : con ? con.npcId === n.id && H[con.id] && F[con.counterEvidence] : false;
            if (ok) { F[e.id] = true; v += 1; more = true; if (apply) give(e); }
          });
        }
        return v;
      };
      for (;;) {
        let best = null;
        if (tLeft - mins >= cTalk) present.forEach((n) => { if (used2.has(n.id)) return; const v = talkGain(n, false); if (v > 0 && (!best || v > best.v)) best = { v: v, n: n }; });
        if (tLeft - mins >= cObj) s.evidence.forEach((e) => { if (e.source.type === 'object' && e.source.locationId === locId && usable(e, Q) && !used2.has(e.source.objectId) && (!best || 1 > best.v)) best = { v: 1, e: e }; });
        if (!best) break;
        if (best.n) { used2.add(best.n.id); talkGain(best.n, true); mins += cTalk; } else { used2.add(best.e.source.objectId); give(best.e); mins += cObj; }
      }
      got.heardNew = heardNew; got.mins = mins; return got;
    };
    const done = () => [['motive'], ['method']].every((sl) => s.evidence.some((e) => P.found[e.id] && e.slot === sl[0] && e.pointsTo === T.culpritId && (!only || e.route === only)));
    let day = s.clock.day, min = Clock.norm(s), pos = s.pos || s.startLoc;
    const elapsed = () => (day - 1) * DAY.parts + Math.min(Clock.partOf(min), DAY.parts);
    while (!done() && elapsed() < budget) {
      const part = Clock.partOf(min);
      if (part >= DAY.parts) { day++; min = PART_START[0]; pos = s.startLoc; continue; }
      let best = null;
      s.world.locations.forEach((l) => {
        const walk = Travel.min(s, pos, l.id), at = min + walk;
        if (Clock.partOf(at) !== part || !World.openAt(l, part)) return;
        const Q = { found: Object.assign({}, P.found), heard: Object.assign({}, P.heard) }, got = visitAt(Q, l.id, day, part, Clock.partEnd(part) - at);
        const val = got.length + 0.5 * got.heardNew;
        if (val > 0 && (!best || val > best.val || (val === best.val && walk < best.walk))) best = { loc: l.id, got: got, Q: Q, val: val, walk: walk, at: at };
      });
      if (best) { P.found = best.Q.found; P.heard = best.Q.heard; path.push({ day: day, part: part, at: best.at, locId: best.loc, got: best.got }); min = best.at + best.got.mins; pos = best.loc; }
      else min = Clock.partEnd(part);
    }
    return { ok: done(), parts: elapsed() + (done() ? 1 : 0), visits: path.length, path: path };
  }
};

/* ---------------- Game: create / validate ---------------- */
const Game = {
  create(seed, level) {
    const w = CaseGen.build(seed);
    const s = {
      schema: APP.schema, version: APP.version, seed: w.seed, startLoc: w.startLoc, turn: 0, settings: { level: LEVELS[level] ? level : 'normaal' },
      clock: { day: 1, part: 0, min: PART_START[0] }, pos: w.startLoc,
      player: { money: 25, dossier: { suspectId: null, motiveEvidenceId: null, methodEvidenceId: null }, links: {}, threads: [], archive: {} },
      visit: null,
      meta: w.meta, protagonist: w.protagonist, world: w.world, crime: w.crime, truth: w.truth,
      cast: w.cast, crowd: w.crowd, schedule: null, evidence: w.evidence, contradictions: w.contradictions, relations: w.relations, alibis: w.alibis,
      play: { found: {}, heard: {}, resolved: {}, cleared: {}, asked: {}, met: {}, metCrowd: {}, visited: {}, early: {}, examined: {}, xt: {}, xtDone: {}, warmTalks: {}, flipped: {}, debunked: {}, alibiCheck: {}, heardOf: {}, heardOfLoc: {}, wrongAccusations: 0, visits: 0, ended: null },
      ui: {},
      log: []
    };
    s.schedule = Schedule.build(s);
    const P = s.protagonist, start = World.loc(s, s.startLoc);
    Log.narr(s, s.meta.title + '. ' + s.meta.eraLabel + '.');
    // v0.11.1: first who you are, then the town by name, then the crime
    const C = s.world.city;
    Log.narr(s, 'Je bent ' + P.name + ', ' + P.age + ' jaar, ' + P.background + '.');
    Log.narr(s, C.name + ' is ' + C.culture.charAt(0).toLowerCase() + C.culture.slice(1) + ' ' + C.customs);
    Log.narr(s, s.crime.summary + ' ' + s.crime.personalHook);
    Evidence.give(s, s.evidence[0], 'start');
    Log.narr(s, 'Je logeert in ' + start.name + '.');
    Log.sys(s, 'Het is acht uur en je bent in ' + start.name + '. Lopen naar een andere plek kost 15 tot 45 minuten. Aanspreken en onderzoeken kost ' + Level.cost(s, 'examine') + ' minuten, verhoren ' + Level.cost(s, 'talk') + '. Om twaalf en om vijf uur gaan de mensen naar hun volgende plek.');
    return s;
  },
  check(s) {
    const e = [], real = s.world.locations;
    if (real.length < 5 || real.length > 7) e.push('locaties: ' + real.length);
    if (s.cast.length < 6 || s.cast.length > 8) e.push('kern-cast: ' + s.cast.length);
    if (s.crowd.length < 10 || s.crowd.length > 16) e.push('figuranten: ' + s.crowd.length);
    if (s.evidence.length < 8 || s.evidence.length > 12) e.push('bewijs: ' + s.evidence.length);
    if (!Evidence.acyclic(s.evidence)) e.push('bewijsgraaf heeft een cyclus');
    if (!s.contradictions.some((c) => c.npcId === s.truth.culpritId) || !s.contradictions.some((c) => c.npcId !== s.truth.culpritId)) e.push('tegenstrijdigheden onvolledig');
    const objs = s.evidence.filter((x) => x.source.type === 'object').map((x) => x.source.objectId);
    if (new Set(objs).size !== objs.length) e.push('twee sporen op hetzelfde object');
    ['paper', 'people'].forEach((r) => { const res = Solver.run(s, r); if (!res.motive || !res.method) e.push('route ' + r + ' leidt niet tot motief en methode'); });
    if (new Set(s.cast.map((n) => n.name)).size !== s.cast.length) e.push('dubbele namen');
    Schedule.check(s).slice(0, 3).forEach((x) => e.push(x));
    Game.logic(s).forEach((x) => e.push(x));
    return e;
  },
  // v0.7.0: the puzzle must be solvable by reasoning and must not give the culprit away by name
  logic(s) {
    const e = [], T = s.truth, C = World.npc(s, T.culpritId), A = World.npc(s, T.roles.suspA), B = World.npc(s, T.roles.suspB), ini = (x) => x.name.charAt(0).toUpperCase();
    const sameIni = s.cast.filter((x) => ini(x) === ini(C)).map((x) => x.id), sameK = s.cast.filter((x) => x.kenmerk === C.kenmerk).map((x) => x.id);
    if (sameIni.length !== 2 || sameIni.indexOf(B.id) < 0) e.push('beginletter van de dader niet precies gedeeld met verdachte B');
    if (sameK.length !== 2 || sameK.indexOf(A.id) < 0) e.push('kenmerk van de dader niet precies gedeeld met verdachte A');
    if (s.cast.some((x) => !KENMERK[x.kenmerk])) e.push('persoon zonder kenmerk');
    const first = C.name.slice(0, C.name.indexOf(' ')), re = new RegExp('(^|[^\\wÀ-ÿ])' + first + '($|[^\\wÀ-ÿ])');
    s.evidence.filter((x) => ['paper_ctx', 'paper_method', 'people_witness', 'twist_planted'].indexOf(x.key) >= 0).forEach((x) => { if (re.test(x.text + ' ' + x.title)) e.push('naam van de dader in ' + x.key); });
    const al = s.alibis || {};
    s.cast.forEach((x) => { const a = al[x.id]; if (!a) { e.push('geen alibi: ' + x.id); return; } if (a.withId && !World.npc(s, a.withId)) e.push('alibi noemt onbekende: ' + x.id); if (a.locId === s.crime.crimeLocationId && x.id !== C.id) e.push('alibi op plaats delict: ' + x.id); });
    if (!al[C.id] || al[C.id].truth || !al[C.id].withId) e.push('alibi dader klopt niet');
    if (!al[A.id] || !al[A.id].truth || !al[A.id].withId) e.push('alibi verdachte A is niet controleerbaar');
    return e;
  }
};

/* ---------------- Store + Save (IndexedDB, autosave + 3 slots, JSON export/import) ---------------- */
const Store = {
  DB: 'het-spoor-v04', db: null, mem: {},
  open() {
    return new Promise((res) => {
      if (typeof indexedDB === 'undefined') return res(null);
      try { const r = indexedDB.open(this.DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('saves'); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => res(null); }
      catch (e) { res(null); }
    });
  },
  put(k, v) {
    if (!this.db) { this.mem[k] = v; return Promise.resolve(true); }
    return new Promise((res) => { const tx = this.db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); });
  },
  get(k) {
    if (!this.db) return Promise.resolve(this.mem[k] || null);
    return new Promise((res) => { const r = this.db.transaction('saves').objectStore('saves').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  }
};
const Save = {
  pack: (s) => JSON.stringify(s),
  unpack(text) {
    let s; try { s = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { throw new Error('Geen geldig JSON-bestand.'); }
    if (!s || typeof s !== 'object') throw new Error('Leeg bestand.');
    if (s.schema !== APP.schema) throw new Error('Deze savegame heeft schema ' + (s.schema || '?') + '. Versie ' + APP.version + ' leest alleen schema ' + APP.schema + ': de puzzel is opnieuw opgebouwd, met alibi\'s die je zelf controleert. Oude saves zijn niet over te zetten; je kunt het bestand wel bewaren.');
    ['seed', 'clock', 'player', 'world', 'cast', 'crowd', 'schedule', 'evidence', 'contradictions', 'relations', 'alibis', 'settings', 'play', 'log'].forEach((k) => { if (!(k in s)) throw new Error('Savegame mist "' + k + '".'); });
    if (typeof s.clock.part !== 'number') throw new Error('Savegame heeft geen dagdeel in de klok.');
    s.visit = s.visit || null; s.ui = s.ui || {}; s.play.early = s.play.early || {}; s.play.alibiCheck = s.play.alibiCheck || {}; s.player.links = s.player.links || {}; if (!Array.isArray(s.player.threads)) s.player.threads = Pins.migrate(s); s.player.archive = s.player.archive || {};
    Clock.norm(s); s.pos = s.pos || (s.visit ? s.visit.locId : s.startLoc);
    if (!s.play.heardOf || !s.play.heardOfLoc) { s.play.heardOf = s.play.heardOf || {}; s.play.heardOfLoc = s.play.heardOfLoc || {}; (s.log || []).forEach((e) => Mentions.scan(s, e)); }
    ['metCrowd', 'examined', 'xt', 'xtDone'].forEach((k) => { s.play[k] = s.play[k] || {}; });
    return s;
  },
  meta: (s) => ({ seed: s.seed, title: s.meta.title, time: U.time(s.clock), saved: new Date().toISOString() })
};

/* ---------------- Tests ---------------- */
const Tests = {
  // helper for tests: open a visit where a person is in the current part (debug route, costs no part)
  meet(s, id) { const loc = Schedule.at(s, id, s.clock.day, s.clock.part); return !!loc && Act.force(s, loc); },
  run(nSeeds) {
    nSeeds = nSeeds || 30; const out = [], t = (name, fn) => { try { const r = fn(); out.push({ name: name, ok: r === true || (r && r.ok), info: r && r.info ? r.info : '' }); } catch (e) { out.push({ name: name, ok: false, info: e.message }); } };
    t('Determinisme: zelfde seed geeft zelfde wereld en rooster', () => Save.pack(Game.create('det-1')) === Save.pack(Game.create('det-1')));
    t('Verschillende seeds geven verschillende zaken', () => { const a = Game.create('x-1'), b = Game.create('x-2'); return a.truth.culpritId + a.crime.victim.name !== b.truth.culpritId + b.crime.victim.name || a.world.city.name !== b.world.city.name; });
    const bad = [];
    for (let i = 0; i < nSeeds; i++) { const s = Game.create('test-' + i), e = Game.check(s); if (e.length) bad.push('test-' + i + ': ' + e.join('; ')); }
    t('Schaal, bewijsgraaf, twee routes en rooster (' + nSeeds + ' seeds)', () => ({ ok: bad.length === 0, info: bad.slice(0, 3).join(' | ') }));
    t('Schrijversstijl stuurt kruispunt-spoor aan (Christie, Baantjer/Holmes, Chandler, Midsomer, Columbo)', () => {
      const kinds = new Set();
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('lead-' + i), e2 = s.evidence.find((e) => e.key === 'paper_ctx');
        if (e2 && e2.leadKind) kinds.add(e2.leadKind);
      }
      return { ok: kinds.size >= 4, info: Array.from(kinds).join(', ') };
    });
    t('Combinatorische sub-grammatica (@sub) en publieke variabelen vullen zonder rest-tokens', () => {
      const s = Game.create('sub-1'), n = s.cast[0], v = Text.npcVars(s, n);
      const raw = '{@sub.groet.open} Ik werk vanuit {home} als {role} deze {part}, met {weather}. {@sub.sfeer.stad}';
      const filled = Text.fill(raw, v, s.meta.era, RNG.make('sub-test'));
      return { ok: filled.indexOf('{') < 0 && filled.length > 40, info: filled.slice(0, 70) + '…' };
    });
    t('Dialoogfilter (Makkelijk): bevestigd alibi verbergt zaak- en alibivragen', () => {
      const s = Game.create('dlg-1', 'makkelijk'), wEv = s.evidence.find((e) => e.key === 'people_witness'), n = World.npc(s, s.truth.roles.confidant);
      s.play.asked[n.id + ':alibi'] = true; s.play.found[wEv.id] = { day: 1 }; Rules.post(s);
      const ids = Dialogue.topics(s, n).map((x) => x.id); return s.play.cleared[n.id] && ids.indexOf('crime') < 0 && ids.indexOf('alibi') < 0;
    });
    t('Toon: de verkeerde toon voor dit temperament geeft geen bewijs, de juiste bij een volgend bezoek wel', () => {
      const s = Game.create('tone-1'), w = World.npc(s, s.truth.roles.witness), e = s.evidence.find((x) => x.key === 'people_witness');
      this.meet(s, w.id); Act.talkStart(s, w.id);
      s.relations[w.id] = { trust: 30, affection: 20, resentment: 10, suspicion: 20, statusText: '' };
      const worst = Object.keys(APPROACH).filter((a) => Dialogue.fit(w, a)[0] === 'bad').sort((a, b) => (Dialogue.fit(w, a)[1].trust || 0) - (Dialogue.fit(w, b)[1].trust || 0))[0];
      s.relations[w.id] = { trust: 26, affection: 16, resentment: 12, suspicion: 22, statusText: '' };
      Act.topic(s, w.id, 'ev:' + e.id, worst); const blocked = !s.play.found[e.id];
      Act.talkEnd(s); const again = Act.talkStart(s, w.id);
      Act.leave(s); this.meet(s, w.id); Act.talkStart(s, w.id);
      s.relations[w.id] = { trust: 40, affection: 30, resentment: 5, suspicion: 10, statusText: '' };
      Act.topic(s, w.id, 'ev:' + e.id, Dialogue.best(w)); return blocked && !again && !!s.play.found[e.id];
    });
    t('Engine weigert ongeldige keuzes', () => {
      const s = Game.create('val-1'), before = Save.pack(s);
      Act.topic(s, 'npc_999', 'talk'); Act.examine(s, 'bestaat_niet'); Act.confront(s, 'con_1'); Act.visit(s, 'loc_999'); Act.leave(s); Act.endDay(s); Act.mingle(s); Act.treat(s, s.cast[0].id);
      return Save.pack(s) === before;
    });
    t('Confrontatie pas na verklaring en tegenbewijs, in een gesprek', () => {
      const s = Game.create('con-1'), c = World.npc(s, s.truth.culpritId), w = s.evidence.find((e) => e.key === 'people_denial');
      this.meet(s, c.id); Act.talkStart(s, c.id); const before = Dialogue.confronts(s, c).length;
      s.play.heard.con_1 = true; s.play.found[w.id] = { day: 1 }; const after = Dialogue.confronts(s, c).length;
      Act.confront(s, 'con_1'); return before === 0 && after === 1 && !!s.play.found[s.contradictions[0].yields] && Dialogue.confronts(s, c).length === 0;
    });
    t('Aanklacht: juist dossier sluit de zaak, fout dossier kost de rest van het dagdeel', () => {
      const s = Game.create('acc-1'), solved = Solver.run(s).state, cul = s.truth.culpritId;
      const m = solved.evidence.find((e) => e.slot === 'motive' && e.pointsTo === cul), me = solved.evidence.find((e) => e.slot === 'method' && e.pointsTo === cul);
      const w = U.clone(solved); w.player.dossier = { suspectId: w.truth.roles.suspA, motiveEvidenceId: m.id, methodEvidenceId: me.id }; Act.accuse(w);
      solved.player.dossier = { suspectId: cul, motiveEvidenceId: m.id, methodEvidenceId: me.id }; Act.accuse(solved);
      return !w.play.ended && w.play.wrongAccusations === 1 && w.clock.part === 1 && !!solved.play.ended && solved.play.ended.correct;
    });
    t('Opslaan: schema 8 heen en terug; schema 4 tot en met 7 en een save zonder rooster geweigerd', () => {
      const s = Game.create('save-1', 'moeilijk'); this.meet(s, s.cast[0].id); s.player.links[s.evidence[1].id] = s.cast[0].id; const back = Save.unpack(Save.pack(s)); let refused = 0;
      [4, 5, 6, 7].forEach((v) => { try { Save.unpack(JSON.stringify(Object.assign({}, s, { schema: v }))); } catch (e) { refused++; } });
      try { const x = JSON.parse(Save.pack(s)); delete x.schedule; Save.unpack(x); } catch (e) { refused++; }
      return { ok: Save.pack(back) === Save.pack(s) && refused === 5 && back.visit && back.visit.locId === s.visit.locId && back.settings.level === 'moeilijk', info: 'geweigerd ' + refused + ' van 5' };
    });
    t('Inhoudsgrenzen: geen verboden woorden in gegenereerde tekst', () => {
      const re = /\b(bloed|bloedig|lijk|lijken|drugs|seks|wapen|steken|neergestoken|vermoord|vergif)\b/i, hits = [];
      for (let i = 0; i < 15; i++) { const s = Game.create('cnt-' + i), txt = JSON.stringify([s.evidence, s.contradictions, s.crowd, s.crime, s.log]); const m = txt.match(re); if (m) hits.push('cnt-' + i + ': ' + m[0]); }
      return { ok: hits.length === 0, info: hits.join(', ') };
    });
    // ----- v0.6.1: parts of the day, visits, schedule -----
    t('Klok: lopen en handelingen kosten minuten, wachten springt naar het volgende dagdeel, om 22:00 alleen de dag afsluiten', () => {
      const s = Game.create('part-1'), open = s.world.locations.find((l) => World.openAt(l, 0) && l.id !== s.startLoc), walk = Travel.min(s, s.startLoc, open.id);
      const v1 = Act.visit(s, open.id), arrive = s.clock.min, twice = Act.visit(s, open.id), noWait = Act.wait(s);
      Act.leave(s); const afterLeave = s.clock.min === arrive && !s.visit && s.pos === open.id && s.play.visits === 1;
      Act.wait(s); const noon = s.clock.part === 1 && s.clock.min === 720; Act.wait(s); Act.wait(s);
      const night = s.clock.part === 3 && s.clock.min === 1320, noVisit = !Act.visit(s, open.id), noWait2 = !Act.wait(s), slept = Act.endDay(s);
      return { ok: [15, 30, 45].indexOf(walk) >= 0 && v1 && arrive === 480 + walk && !twice && !noWait && afterLeave && noon && night && noVisit && noWait2 && slept && s.clock.day === 2 && s.clock.min === 480 && s.pos === s.startLoc,
        info: U.time(s.clock) + ', lopen ' + walk + ' min' };
    });
    t('Dagdelen: een gesloten plek kun je niet bezoeken', () => {
      const bad = [];
      for (let i = 0; i < 10; i++) {
        const s = Game.create('shut-' + i); s.clock.part = 2;
        s.world.locations.forEach((l) => { const r = Act.visit(s, l.id); if (r !== World.openAt(l, 2)) bad.push('shut-' + i + ' ' + l.template); if (s.visit) s.visit = null; });
      }
      return { ok: !bad.length, info: bad.slice(0, 3).join(' | ') };
    });
    t('Rooster: altijd op een open plek, elke dag minstens één keer thuis (' + nSeeds + ' seeds)', () => {
      const bad = [];
      for (let i = 0; i < nSeeds; i++) { const s = Game.create('sched-' + i), e = Schedule.check(s); if (e.length) bad.push('sched-' + i + ': ' + e[0]); }
      return { ok: !bad.length, info: bad.slice(0, 3).join(' | ') };
    });
    t('Gesprek: één gesprek per persoon per bezoek, elk onderwerp één keer', () => {
      const s = Game.create('conv-1'), n = s.cast[0]; this.meet(s, n.id); Act.talkStart(s, n.id);
      const before = Dialogue.topics(s, n).length; Act.topic(s, n.id, 'talk', 'warm'); const logN = s.play.logN;
      Act.topic(s, n.id, 'talk', 'warm'); const blocked = s.play.logN === logN, after = Dialogue.topics(s, n).length;
      Act.talkEnd(s); const again = Act.talkStart(s, n.id);
      return blocked && after === before - 1 && !again && s.clock.part === 0;
    });
    t('Solver: beide routes binnen ' + DAY.budget + ' dagdelen, met rooster en openingstijden (' + nSeeds + ' seeds)', () => {
      const bad = [], used = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('plan-' + i);
        ['paper', 'people'].forEach((r) => { const p = Solver.plan(s, r); used.push(p.parts); if (!p.ok) bad.push('plan-' + i + ' ' + r + ' (' + p.parts + ')'); });
      }
      const avg = used.reduce((a, b) => a + b, 0) / used.length;
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 3).join(' | ') : 'gemiddeld ' + avg.toFixed(1).replace('.', ',') + ' dagdelen, hoogstens ' + Math.max.apply(null, used) };
    });
    t('Dader is niet altijd npc_1 en niet altijd de eerste in de cast (' + nSeeds + ' seeds)', () => {
      const ids = new Set(); let first = 0;
      for (let i = 0; i < nSeeds; i++) { const s = Game.create('cul-' + i); ids.add(s.truth.culpritId); if (s.cast[0].id === s.truth.culpritId) first++; }
      return { ok: ids.size >= 3 && first < nSeeds / 2, info: ids.size + ' verschillende id\'s, ' + first + 'x eerste in de cast' };
    });
    // ----- v0.7.0: deduction puzzle, alibi checks, difficulty -----
    t('Puzzel: beginletter en kenmerk elk precies door twee mensen gedeeld, dader nooit bij naam (' + nSeeds + ' seeds)', () => {
      const bad = [];
      for (let i = 0; i < nSeeds; i++) { const s = Game.create('logic-' + i), e = Game.logic(s); if (e.length) bad.push('logic-' + i + ': ' + e[0]); }
      return { ok: !bad.length, info: bad.slice(0, 3).join(' | ') };
    });
    t('Puzzel: alleen de dader heeft motief, beginletter, kenmerk en een vals alibi (' + nSeeds + ' seeds)', () => {
      const bad = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('uniq-' + i), C = s.truth.culpritId, ini = (x) => x.name.charAt(0).toUpperCase(), c = World.npc(s, C);
        const motive = new Set(s.evidence.filter((e) => e.slot === 'motive').map((e) => e.pointsTo));
        const fit = s.cast.filter((x) => motive.has(x.id) && ini(x) === ini(c));
        const fit2 = s.cast.filter((x) => x.kenmerk === c.kenmerk && !s.alibis[x.id].truth);
        if (fit.length !== 1 || fit[0].id !== C || fit2.length !== 1 || fit2[0].id !== C) bad.push('uniq-' + i);
      }
      return { ok: !bad.length, info: bad.slice(0, 3).join(', ') };
    });
    t('Alibi-controle: metgezel bevestigt een onschuldige en spreekt de dader tegen', () => {
      const s = Game.create('chk-1'), T = s.truth, A = World.npc(s, T.roles.suspA), C = World.npc(s, T.culpritId);
      const ask = (x) => { s.clock.part = 0; this.meet(s, x.id); Act.talkStart(s, x.id); Act.topic(s, x.id, 'alibi', 'warm'); Act.leave(s); };
      const check = (x) => { s.clock.part = 0; const comp = World.npc(s, s.alibis[x.id].withId); this.meet(s, comp.id); Act.talkStart(s, comp.id); s.relations[comp.id] = { trust: 60, affection: 50, resentment: 0, suspicion: 0, statusText: '' }; Act.topic(s, comp.id, 'chk:' + x.id, 'warm'); Act.leave(s); };
      ask(A); ask(C); check(A); check(C);
      const den = s.evidence.find((e) => e.key === 'people_denial');
      return { ok: s.play.alibiCheck[A.id] && s.play.alibiCheck[A.id].ok === true && s.play.alibiCheck[C.id] && s.play.alibiCheck[C.id].ok === false && !!s.play.found[den.id] && !!s.play.cleared[A.id] && !s.play.cleared[C.id],
        info: JSON.stringify(s.play.alibiCheck) };
    });
    t('Moeilijkheid: Moeilijk geeft geen labels, geen vraagteken en geen automatisch afvallen', () => {
      const s = Game.create('lvl-1', 'moeilijk'), A = World.npc(s, s.truth.roles.suspA), w = s.evidence.find((e) => e.key === 'people_witness');
      this.meet(s, A.id); Act.talkStart(s, A.id); Act.topic(s, A.id, 'alibi', 'warm'); Act.leave(s);
      s.play.found[w.id] = { day: 1 }; Rules.post(s);
      const comp = World.npc(s, s.alibis[A.id].withId); this.meet(s, comp.id); Act.talkStart(s, comp.id); s.relations[comp.id] = { trust: 60, affection: 50, resentment: 0, suspicion: 0, statusText: '' }; Act.topic(s, comp.id, 'chk:' + A.id, 'warm'); Act.leave(s);
      const early = s.evidence.find((e) => e.source.type === 'object' && !Evidence.reqMet(s, e)); let marked = false;
      if (early) { Act.force(s, early.source.locationId); Act.examine(s, early.source.objectId); marked = !!s.play.early[early.source.objectId]; }
      return { ok: !s.play.cleared[A.id] && s.play.alibiCheck[A.id].ok === true && !marked, info: 'afgevallen: ' + !!s.play.cleared[A.id] + ', vraagteken: ' + marked };
    });
    // ----- v0.8.0: attention, unknown people, objects -----
    t('Tijd: onderzoeken kost 15 minuten en verhoren 30 (Normaal); al bekeken is gratis; na 22:00 weigert de engine nieuwe handelingen', () => {
      const s = Game.create('att-1'), loc = s.world.locations.find((l) => l.objects.length >= 5 && World.openAt(l, 2) && l.open[1] >= 24) || s.world.locations.find((l) => World.openAt(l, 2));
      Act.force(s, loc.id); const objs = World.here(s).objects, t0 = s.clock.min;
      Act.examine(s, objs[0].id); const t1 = s.clock.min; Act.examine(s, objs[0].id); const t2 = s.clock.min;
      const n = World.present(s)[0]; let talk = true; if (n) { s.play.met[n.id] = true; const a = s.clock.min; Act.talkStart(s, n.id); talk = s.clock.min === a + 30; Act.talkEnd(s); }
      s.clock.part = 2; s.clock.min = 1310; if (!s.visit) Act.force(s, loc.id); const late = objs.find((o) => !s.play.examined[o.id] && !s.evidence.some((e) => e.source.objectId === o.id));
      const before = s.clock.min; if (late && s.visit) Act.examine(s, late.id);
      return { ok: t1 === t0 + 15 && t2 === t1 && talk && (!late || (!s.play.examined[late.id] && s.clock.min === before)), info: U.hm(t0) + ' -> ' + U.hm(t1) };
    });
    t('Onbekend: voor aanspreken geen naam of rol, figuranten dragen nooit het gedeelde kenmerk (' + nSeeds + ' seeds)', () => {
      const bad = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('unk-' + i), C = World.npc(s, s.truth.culpritId);
        if (s.crowd.some((c) => c.kenmerk === C.kenmerk)) bad.push('unk-' + i + ' kenmerk');
        if (s.cast.concat(s.crowd).some((x) => !KENMERK[x.kenmerk])) bad.push('unk-' + i + ' zonder kenmerk');
        const x = s.cast[0], loc = Schedule.at(s, x.id, 1, 0); Act.force(s, loc);
        const before = People.label(s, x, []); if (before.indexOf(x.name) >= 0) bad.push('unk-' + i + ' naam zichtbaar');
        Act.greet(s, x.id); if (!s.play.met[x.id] || People.label(s, x, []).indexOf(x.name) < 0) bad.push('unk-' + i + ' aanspreken');
      }
      return { ok: !bad.length, info: bad.slice(0, 3).join(' | ') };
    });
    t('Voorwerpen: 4 of 5 per plek uit de tijdvakpool, herberg één per vaste plek, gevarieerde opbrengst (' + nSeeds + ' seeds)', () => {
      const bad = [], kinds = new Set();
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('obj-' + i), era = s.meta.era;
        s.world.locations.forEach((l) => {
          if (l.objects.length < 4 || l.objects.length > 5) bad.push('obj-' + i + ' aantal ' + l.objects.length);
          const pool = objPool(l.template, era).map((x) => x[0]).concat(['het aantekenboek']);
          l.objects.forEach((o) => { if (pool.indexOf(o.name) < 0) bad.push('obj-' + i + ' ' + o.name + ' past niet bij ' + era); if (o.yield) kinds.add(o.yield.k); });
          if (l.template === 'herberg') { const pr = l.objects.map((o) => o.prop); if (new Set(pr).size !== pr.length) bad.push('obj-' + i + ' herberg dubbele plek'); }
        });
      }
      return { ok: !bad.length && kinds.size >= 6, info: bad.slice(0, 3).join(' | ') + ' soorten: ' + Array.from(kinds).join(', ') };
    });
    t('Voorwerpen: een gevonden rekening bevestigt het alibi van twee mensen', () => {
      for (let i = 0; i < 40; i++) {
        const s = Game.create('ybill-' + i); let hit = null;
        s.world.locations.forEach((l) => l.objects.forEach((o) => { if (!hit && o.yield && o.yield.k === 'alibi' && World.openAt(l, 0)) hit = { l: l, o: o }; }));
        if (!hit) continue;
        Act.force(s, hit.l.id); Act.examine(s, hit.o.id);
        return { ok: !!(s.play.alibiCheck[hit.o.yield.a] && s.play.alibiCheck[hit.o.yield.b] && s.play.alibiCheck[hit.o.yield.a].ok), info: 'ybill-' + i };
      }
      return { ok: false, info: 'geen rekening gevonden in 40 seeds' };
    });
    // ----- v0.9.0: tone per temperament, twists -----
    t('Toon: elk temperament heeft een andere beste toon, en elke toon is ergens de beste', () => {
      const best = Object.keys(TONE_FIT).map((m) => Object.keys(TONE_FIT[m]).find((a) => TONE_FIT[m][a][0] === 'good'));
      return { ok: new Set(best).size === 3 && Object.keys(TONE_FIT).every((m) => Object.keys(TONE_FIT[m]).some((a) => TONE_FIT[m][a][0] === 'bad')), info: best.join(', ') };
    });
    t('Twist: elk soort komt voor, en een ondergeschoven briefje draagt de paraaf van de dader', () => {
      const seen = {}; let bad = '';
      for (let i = 0; i < 80; i++) {
        const s = Game.create('tw-' + i), T = s.truth; seen[T.twist] = (seen[T.twist] || 0) + 1;
        if (T.twist === 'zondebok') { const e = s.evidence.find((x) => x.key === 'twist_planted'), C = World.npc(s, T.culpritId);
          if (!e || e.pointsTo !== T.roles.suspA || e.text.indexOf(C.name.charAt(0)) < 0) bad = 'tw-' + i; }
        if (T.twist === 'medeplichtige' && s.evidence.find((x) => x.key === 'people_denial').source.type !== 'object') bad = 'tw-' + i;
      }
      return { ok: !bad && seen.zondebok > 3 && seen.medeplichtige > 3 && seen.geen > 3, info: JSON.stringify(seen) + (bad ? ' fout: ' + bad : '') };
    });
    t('Twist medeplichtige: de metgezel liegt, een stuk ontmaskert de leugen en de dader is weer verdachte', () => {
      for (let i = 0; i < 80; i++) {
        const s = Game.create('acc-tw-' + i); if (s.truth.twist !== 'medeplichtige') continue;
        const C = World.npc(s, s.truth.culpritId), comp = World.npc(s, s.truth.roles.companion), den = s.evidence.find((e) => e.key === 'people_denial');
        s.clock.part = 0; this.meet(s, C.id); Act.talkStart(s, C.id); Act.topic(s, C.id, 'alibi', 'reserved'); Act.leave(s);
        s.clock.part = 0; this.meet(s, comp.id); Act.talkStart(s, comp.id); s.relations[comp.id] = { trust: 60, affection: 50, resentment: 0, suspicion: 0, statusText: '' }; Act.topic(s, comp.id, 'chk:' + C.id, 'reserved'); Act.leave(s);
        const fooled = !!s.play.cleared[C.id] && s.play.alibiCheck[C.id].ok === true;
        s.clock.part = 0; Act.force(s, den.source.locationId); Act.examine(s, den.source.objectId);
        return { ok: fooled && !!s.play.found[den.id] && !s.play.cleared[C.id] && s.play.alibiCheck[C.id].ok === false && Dialogue.confronts(s, C).length === 1, info: 'acc-tw-' + i };
      }
      return { ok: false, info: 'geen medeplichtige in 80 seeds' };
    });
    // ----- v0.5.2: content pack -----
    t('Content: schema van het standaardpakket is geldig', () => { Content.init(); const r = Content.validate(Content.rawBase).rep, all = r.errors.concat(r.warnings);
      return { ok: !all.length && Content.count(Content.base) === Content.count(Content.rawBase) && r.missing === 0, info: all.slice(0, 3).join(' | ') + (r.missing ? ' ontbrekend: ' + r.missingKeys.slice(0, 3).join(', ') : '') }; });
    t('Content: elke sleutel per tijdvak gevuld (' + ERAS.length + ' tijdvakken)', () => { const b = Content.coverage(Content.base); return { ok: !b.length, info: b.slice(0, 4).join(' | ') + (b.length > 4 ? ' (+' + (b.length - 4) + ')' : '') }; });
    t('Content: geen verboden woorden in alle tekstbanken', () => { const old = /\b(bloed|bloedig|lijk|lijken|drugs|seks|wapen|steken|neergestoken|vermoord|vergif)\b/i;
      const hits = Content.scan(Content.rawBase, (chk) => { chk(CONTENT_BANNED); chk(old); }); return { ok: !hits.length, info: hits.slice(0, 3).join(' | ') }; });
    t('Content: geen anachronismen per tijdvak', () => { const hits = Content.scan(Content.rawBase, (chk, era) => { if (era) chk(ANACHRO[era]); else ERAS.forEach((e) => chk(ANACHRO[e])); });
      return { ok: !hits.length, info: hits.slice(0, 3).join(' | ') }; });
    t('Content: import voegt samen, valt terug en weigert foute regels', () => {
      const pack = { format: 'het-spoor-content', version: 1, name: 'Testpakket', common: { 'crowd.any': ['Testregel voor de stad {city}.', 'Hier staat een {onbekend} woord.', 'Er ligt een wapen.'], 'bestaat.niet': ['x'] },
        eras: { toekomst: { 'talk.warm': ['Toekomstige testgroet.'] }, atlantis: {} } };
      const before = Content.sig, r = Content.importPack(JSON.stringify(pack), true), bad2 = Content.importPack('{kapot', true);
      const p = Content.poolOf(r.data, 'e1925', 'crowd.any').map((l) => l.t), base = Content.poolOf(Content.base, 'e1925', 'crowd.any').length;
      const ok = r.ok && !bad2.ok && p.indexOf('Testregel voor de stad {city}.') >= 0 && p.length === base + 1 && r.rep.dropped === 2 && r.rep.missing > 100
        && r.rep.warnings.some((w) => w.indexOf('bestaat.niet') >= 0) && r.rep.warnings.some((w) => w.indexOf('atlantis') >= 0)
        && Content.poolOf(r.data, 'toekomst', 'talk.warm.open').some((l) => l.t === 'Toekomstige testgroet.') && !Content.poolOf(r.data, 'e1925', 'talk.warm.open').some((l) => l.t === 'Toekomstige testgroet.') && Content.sig === before;
      return { ok: ok, info: 'geweigerd ' + r.rep.dropped + ', terugval ' + r.rep.missing + ' sleutels' };
    });
    t('Determinisme: zelfde seed kiest dezelfde tekst', () => {
      const script = (seed) => {
        const s = Game.create(seed), n = World.npc(s, s.truth.roles.witness);
        this.meet(s, n.id); Act.talkStart(s, n.id); ['talk', 'crime', 'alibi'].forEach((x) => Act.topic(s, n.id, x, 'warm'));
        s.crowd.slice(0, 6).forEach((c) => { this.meet(s, c.id); Act.mingle(s, c.id); });
        World.here(s).objects.forEach((o) => Act.examine(s, o.id));
        return JSON.stringify(s.log.map((e) => e.text));
      };
      const a = script('dt-1'), b = script('dt-1'), c = script('dt-2'); return a === b && a !== c;
    });
    t('Herhaling: dezelfde figuranten- of gespreksregel max 2x per dag', () => {
      const bad2 = [], worst = { n: 0 };
      ['rep-1', 'rep-2', 'rep-3', 'rep-4'].forEach((seed) => {
        const s = Game.create(seed);
        for (let i = 0; i < 40; i++) { const c = s.crowd[i % s.crowd.length]; this.meet(s, c.id); Act.mingle(s, c.id); }
        s.cast.slice(0, 3).forEach((n) => { for (let i = 0; i < 12; i++) { this.meet(s, n.id); Act.talkStart(s, n.id); Act.topic(s, n.id, 'talk', 'reserved'); } });
        const count = {}; s.log.filter((e) => e.k === 'c' || e.k === 'p').forEach((e) => { count[e.text] = (count[e.text] || 0) + 1; });
        Object.keys(count).forEach((k) => { worst.n = Math.max(worst.n, count[k]); if (count[k] > 2) bad2.push(seed + ': ' + count[k] + 'x ' + k.slice(0, 40)); });
        if (s.clock.day !== 1) bad2.push(seed + ': dag verschoven');
      });
      return { ok: !bad2.length, info: bad2.length ? bad2.slice(0, 3).join(' | ') : 'hoogste herhaling ' + worst.n + 'x' };
    });
    // ----- views (paper and ink + v0.6.2 Interrogation) -----
    t('Uiterlijk en verhoorscherm lekken de dader niet: silhouet, bord, tableau, tempo en verhoor (10 seeds)', () => {
      const b2 = [];
      for (let i = 0; i < 10; i++) {
        const s = SpikeData.make('leak-' + i, 'laat'), fam = famOf(s);
        const render = (st) => {
          const base = st.cast.slice().sort(byName).map((n) => Silhouette.svg(n, { fam: fam, mode: 'full' }) + (typeof Interrogation !== 'undefined' ? JSON.stringify(Interrogation.pace(n)) : '')).join('')
            + Board.html(st, fam, null).html
            + st.world.locations.map((l) => Tableau.svg(st, l.id, 1, fam)).join('');
          const ivs = typeof Interrogation !== 'undefined' ? st.cast.slice().sort(byName).map((n) => {
            const clone = U.clone(st);
            clone.visit = { locId: n.locationId, conv: n.id, convAt: 0, done: {}, used: {} };
            return Interrogation.html(clone, fam, { approach: 'reserved', deltas: { trust: 3 } });
          }).join('') : '';
          return base + ivs;
        };
        const a = render(s), w = U.clone(s), other = w.cast.find((n) => n.id !== w.truth.culpritId);
        w.truth.culpritId = other.id; w.cast.reverse(); w.cast.forEach((n) => { n.secrets = []; n.trueAlignment = 'goed'; n.agenda = ''; });
        if (render(w) !== a) b2.push('leak-' + i);
      }
      return { ok: !b2.length, info: b2.join(', ') };
    });
    t('Tableau: hotspots volgen het rooster, compleet en uniek (' + nSeeds + ' seeds, 3 dagdelen)', () => {
      const b2 = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('tab-' + i), fam = famOf(s);
        s.world.locations.forEach((l) => [0, 1, 2].forEach((p) => {
          const M = Tableau.model(s, l.id, p), ids = M.hs.map((h) => h.id), open = World.openAt(l, p), at = (x) => Schedule.at(s, x.id, s.clock.day, p) === l.id;
          const want = l.objects.map((o) => 'obj:' + o.id).concat(open ? s.cast.filter(at).map((n) => 'npc:' + n.id).concat(s.crowd.filter(at).map((c) => 'crowd:' + c.id)) : []);
          const n = (Tableau.svg(s, l.id, p, fam).match(/ data-hs="/g) || []).length;
          if (new Set(ids).size !== ids.length || ids.length !== want.length || want.some((x) => ids.indexOf(x) < 0) || n !== ids.length) b2.push('tab-' + i + ' ' + l.id + ' ' + PARTS[p]);
        }));
      }
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    // ----- v0.11.0: the town map -----
    t('Kaart: huizen nooit op straat of in het water, bebouwing ook ver van de plekken, haven aan het water, plekken passend en verspreid (' + nSeeds + ' seeds)', () => {
      const b2 = [], kinds = {};
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('map-' + i), M = MapGen.build(s), real = s.world.locations, wet = (x, y, p) => M.water.wet(x, y, p), id = 'map-' + i;
        kinds[M.water.kind] = (kinds[M.water.kind] || 0) + 1;
        MapGen.audit(M).slice(0, 1).forEach((x) => b2.push(id + ' ' + x));
        if (M.houses.length < 200) b2.push(id + ' maar ' + M.houses.length + ' huizen');
        const far = M.houses.filter((hs) => { const c = Geo.centroid(hs.q); return M.sites.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > 90); }).length;
        if (far < M.houses.length * 0.45) b2.push(id + ' bebouwing rond de plekken');
        if (M.lines || M.edges) b2.push(id + ' hoofdweg');
        real.forEach((l) => { const p = M.pos[l.id], site = M.sites.find((x) => x.id === l.id);
          if (!p || p.x < 60 || p.x > MapGen.W - 60 || p.y < 50 || p.y > MapGen.H - 40) b2.push(id + ' ' + l.template + ' buiten beeld');
          else if (MapGen.KEEP.some((k) => p.x > k[0] && p.x < k[2] && p.y > k[1] && p.y < k[3])) b2.push(id + ' ' + l.template + ' onder legenda of kompas');
          if (p && wet(p.x, p.y, 10)) b2.push(id + ' ' + l.template + ' in het water');
          if (l.template === 'haven' && !wet(p.x, p.y, 70)) b2.push(id + ' haven niet aan het water');
          if (l.template === 'park' && site.kind !== 'park') b2.push(id + ' park niet in een park');
          if ((l.template === 'plein' || l.template === 'markt') && site.kind !== 'square') b2.push(id + ' ' + l.template + ' niet op een plein');
          if (l.template === 'poort' && site.kind !== 'gate' && !(site.cell && site.cell.border)) b2.push(id + ' poort niet aan de rand');
          real.forEach((o) => { if (o.id < l.id && M.pos[o.id] && Math.hypot(M.pos[o.id].x - p.x, M.pos[o.id].y - p.y) < 80) b2.push(id + ' ' + l.template + ' te dicht bij ' + o.template); }); });
        if (real.some((l) => MapGen.travel(M, real[0].id, l.id) === Infinity || (l.id !== real[0].id && (MapGen.travel(M, real[0].id, l.id) < 10 || MapGen.travel(M, real[0].id, l.id) > 40)))) b2.push(id + ' reistijd');
      }
      return { ok: !b2.length, info: b2.length ? b2.slice(0, 3).join(' | ') : Object.keys(kinds).sort().map((k) => k + ' ' + kinds[k]).join(', ') };
    });
    t('Kaart: per onbekende één ?, hooguit drie, daarboven 3+; nooit een getal achter het vraagteken (' + nSeeds + ' seeds)', () => {
      const b2 = [], u = (n) => MapGen.unknownBadges(n).join(' ');
      if (u(0) !== '' || u(1) !== '?' || u(2) !== '? ?' || u(3) !== '? ? ?' || u(4) !== '? ? ? 3+' || u(16) !== '? ? ? 3+') b2.push('reeks ' + u(4));
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('unk-' + i), M = MapGen.build(s), svg = MapGen.svg(s, M, 0);
        if (/>\?\d/.test(svg)) b2.push('unk-' + i + ' ?getal');
        s.world.locations.forEach((l) => { const g = svg.split('data-stn="' + l.id + '"')[1].split('</g><g class="stn')[0], q = (g.match(/<g class="unk">/g) || []).length, more = (g.match(/<g class="unk-more">/g) || []).length;
          const n = World.openAt(l, 0) ? s.cast.concat(s.crowd).filter((x) => Schedule.at(s, x.id, 1, 0) === l.id).length : 0;
          if (q !== Math.min(3, n) || more !== (n > 3 ? 1 : 0)) b2.push('unk-' + i + ' ' + l.template + ' ' + q + '/' + n); });
      }
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    t('Weergave: zelfde seed geeft hetzelfde bord, kaart, tableaus en spoorboek', () => {
      const r = (seed) => { const s = SpikeData.make(seed, 'laat'), fam = famOf(s), M = MapGen.build(s);
        return Board.html(s, fam, null).html + MapGen.svg(s, M, 2) + s.world.locations.map((l) => Tableau.svg(s, l.id, 2, fam)).join('') + Spoorboek.svg(s, Spoorboek.mock(s, M), [], true); };
      return r('sp-1') === r('sp-1') && r('sp-1') !== r('sp-2');
    });
    t('Spoorboek-mock: elk paar is echt tegenstrijdig (zelfde tijd, andere plek)', () => {
      const b2 = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('sb-' + i), D = Spoorboek.mock(s, MapGen.build(s)), segs = D.rows.reduce((a, r) => a.concat(r.legs), []);
        D.pairs.forEach((p) => { const g = segs.find((x) => x.id === p[0]), d = D.dots.find((x) => x.id === p[1]); if (!g || !d || g.loc === d.loc || d.t < g.from || d.t > g.to) b2.push('sb-' + i + ' ' + p[0]); });
      }
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    // ----- v0.10.0: recognisable people, fixed board grid, onboarding, Moeilijk -----
    t('Personages: het kenmerk staat in elk portret, ook klein, voor kern en figuranten (' + nSeeds + ' seeds, 4 tijdvakken)', () => {
      const b2 = [], vb = BUST_VB, inBox = (b, x0, y0, w, h) => { const ix = Math.max(0, Math.min(b[0] + b[2], x0 + w) - Math.max(b[0], x0)), iy = Math.max(0, Math.min(b[1] + b[3], y0 + h) - Math.max(b[1], y0)); return (ix * iy) / (b[2] * b[3]); };
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('km-' + i);
        ['oud', 'klassiek', 'modern', 'toekomst'].forEach((fam) => s.cast.concat(s.crowd).forEach((n) => {
          [40, 72].forEach((w) => { const b = Silhouette.kenmerkBox(n, { s: s, fam: fam, w: w }), k = w / vb[2];
            if (!b || inBox(b, vb[0], vb[1], vb[2], vb[3]) < 0.6 || Math.min(b[2], b[3]) * k < 3) b2.push('km-' + i + ' ' + fam + ' ' + n.kenmerk + ' ' + w + 'px'); });
          const f = Silhouette.kenmerkBox(n, { s: s, fam: fam, mode: 'full' }); if (!f || inBox(f, -8, -6, 116, 270) < 0.95) b2.push('km-' + i + ' ' + fam + ' ' + n.kenmerk + ' volledig');
        }));
      }
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    t('Personages: geen twee kernpersonen met hetzelfde hoofddeksel, haar en dezelfde jas, los van dader en castvolgorde (' + nSeeds + ' seeds, 4 tijdvakken)', () => {
      const b2 = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('look-' + i), w = U.clone(s); w.cast.reverse(); w.truth.culpritId = w.cast[0].id;
        ['oud', 'klassiek', 'modern', 'toekomst'].forEach((fam) => {
          const keys = s.cast.map((n) => Silhouette.key(Silhouette.traits(n, fam, s)));
          if (new Set(keys).size !== keys.length) b2.push('look-' + i + ' ' + fam + ' dubbel');
          if (s.cast.some((n) => JSON.stringify(Silhouette.traits(n, fam, s)) !== JSON.stringify(Silhouette.traits(World.npc(w, n.id), fam, w)))) b2.push('look-' + i + ' ' + fam + ' volgorde');
        });
      }
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    // rotated corners of a board card or label, as an axis-aligned box
    const boxOf = (c) => { const a = (c.rot || 0) * Math.PI / 180, hw = c.w / 2, hh = c.h / 2, ex = Math.abs(hw * Math.cos(a)) + Math.abs(hh * Math.sin(a)), ey = Math.abs(hw * Math.sin(a)) + Math.abs(hh * Math.cos(a));
      return { x0: c.x + hw - ex, x1: c.x + hw + ex, y0: c.y + hh - ey, y1: c.y + hh + ey }; };
    const crowded = (seed) => {   // a late board with more people, pieces and statements than there are slots
      const s = SpikeData.make(seed, 'laat'), add = (list, k) => list.slice(0, 1).forEach((e) => { for (let j = 0; j < k; j++) { const c = U.clone(e); c.id = e.id + '_x' + j; s.evidence.push(c); s.play.found[c.id] = { day: 1 }; } });
      add(Evidence.found(s).filter((e) => e.source.type === 'object' && e.route !== 'start'), 4);
      add(Evidence.found(s).filter((e) => e.source.type !== 'object' && e.route !== 'start'), 5);
      for (let j = 0; j < 3; j++) { const n = U.clone(s.cast[j]); n.id = n.id + '_x' + j; n.name = 'Zz ' + n.name; s.cast.push(n); s.relations[n.id] = U.clone(s.relations[s.cast[j].id]); s.play.met[n.id] = true; }
      return s;
    };
    t('Zaakbord: vast raster zonder overlap, labels in een eigen kopstrook, gedraaide hoeken meegeteld (' + nSeeds + ' seeds)', () => {
      const b2 = [], labels = Board.ZONES.map((z) => ({ id: 'zn:' + z[0], x: z[1], y: z[2], w: Board.labelW(z), h: 28, rot: -2, top: z[2] < 44 }));
      for (let i = 0; i < nSeeds; i++) ['midden', 'laat', 'vol'].forEach((stage) => {
        const s = stage === 'vol' ? crowded('grid-' + i) : SpikeData.make('grid-' + i, stage);
        if (stage === 'vol') ['person', 'doc', 'stmt', 'place'].forEach((z) => { const c = Board.layout(s).cards.find((x) => x.kind !== 'more' && x.kind !== 'case' && Pins.zone(x.id) === z); if (c) Act.archive(s, c.id, true); });
        const folders = Board.folders(s).map((f) => ({ id: 'zf:' + f.zone, x: f.x, y: f.y, w: f.w, h: f.h, rot: 0, top: f.y < 44 }));
        if (stage === 'vol' && folders.length !== 4) b2.push('grid-' + i + ' mapjes ' + folders.length);
        const all = Board.layout(s).cards.concat(labels, folders), B = all.map(boxOf), head = (c) => c.id.indexOf('zn:') === 0 || c.id.indexOf('zf:') === 0;
        all.forEach((c, a) => { const A = B[a];
          if (A.x0 < 14 || A.x1 > Board.W - 14 || A.y1 > Board.H - 14 || (head(c) ? c.top && A.y1 > 44 : A.y0 < 44)) b2.push('grid-' + i + ' ' + stage + ' ' + c.id + ' buiten');
          for (let b = a + 1; b < all.length; b++) { const X = B[b]; if (A.x0 < X.x1 + 12 && X.x0 < A.x1 + 12 && A.y0 < X.y1 + 12 && X.y0 < A.y1 + 12) b2.push('grid-' + i + ' ' + stage + ' ' + c.id + '~' + all[b].id); } });
      });
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    t('Zaakbord: geen kaart valt weg zonder overloopkaart (' + nSeeds + ' seeds, ook overvol)', () => {
      const b2 = [];
      for (let i = 0; i < nSeeds; i++) [SpikeData.make('more-' + i, 'laat'), crowded('more-' + i)].forEach((s, v) => {
        const L = Board.layout(s), f = Evidence.found(s).filter((e) => e.route !== 'start'), more = (z) => { const m = L.cards.find((c) => c.id === 'more:' + z); return m ? m.n : 0; }, cnt = (k) => L.cards.filter((c) => k.indexOf(c.kind) >= 0).length;
        const want = { person: s.cast.filter((n) => s.play.met[n.id]).length, doc: f.filter((e) => e.source.type === 'object').length, stmt: s.contradictions.filter((c) => s.play.heard[c.id]).length + f.filter((e) => e.source.type !== 'object').length, place: s.world.locations.filter((l) => s.play.visited[l.id]).length };
        const got = { person: cnt(['person']) + more('person'), doc: cnt(['doc']) + more('doc'), stmt: cnt(['claim', 'talk']) + more('stmt'), place: cnt(['place']) + more('place') };
        Object.keys(want).forEach((z) => { if (want[z] !== got[z]) b2.push('more-' + i + (v ? ' vol ' : ' ') + z + ' ' + got[z] + '/' + want[z]); });
        if (v && !(more('person') && more('doc') && more('stmt'))) b2.push('more-' + i + ' geen overloopkaart');
      });
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    t('Uitleg: de coach leest alleen; zaak en save blijven gelijk en de save kent geen uitlegstatus', () => {
      const s = SpikeData.make('coach-1', 'midden'), before = Save.pack(s), a = Save.pack(Game.create('coach-2')); let seen = 0;
      [Coach.fresh(), { coached: false, step: 1, tips: {} }, { coached: true, step: 3, tips: {} }, Coach.done()].forEach((intro) => ['board', 'map', 'visit'].forEach((tab) => {
        Act.force(s, s.startLoc); if (Coach.pick(s, intro, { tab: tab })) seen++; Act.leave(s); }));
      const s2 = SpikeData.make('coach-1', 'midden'), b = Save.pack(Game.create('coach-2'));
      return { ok: a === b && !/"(intro|coach|coached)"/.test(before) && seen > 0 && Coach.pick(s2, Coach.done(), { tab: 'board' }) === null, info: seen + ' uitlegmomenten' };
    });
    t('Uitleg: drie begeleide stappen in volgorde, overslaan zet alles uit', () => {
      const s = Game.create('coach-3'); Act.force(s, s.startLoc); let intro = Coach.fresh(); const ids = [];
      for (let k = 0; k < 2; k++) { const c = Coach.pick(s, intro, { tab: 'visit' }); ids.push(c && c.id); intro = Coach.answer(intro, c && c.id); }
      s.visit.conv = s.cast[0].id; const c3 = Coach.pick(s, intro, { tab: 'visit' }); ids.push(c3 && c3.id); intro = Coach.answer(intro, c3 && c3.id);
      const skip = Coach.answer(Coach.fresh(), 'att', true);
      return { ok: ids.join(',') === 'att,greet,tone' && intro.coached && skip.coached && skip.tips.alibi && skip.tips.link, info: ids.join(', ') };
    });
    t('Moeilijkheid: Makkelijk kost twee derde van de tijd (10 en 20 minuten), Normaal en Moeilijk 15 en 30', () => {
      const a = Game.create('lv-4', 'moeilijk'), b = Game.create('lv-4', 'makkelijk'), n = Game.create('lv-4', 'normaal'), c = (s) => Level.cost(s, 'examine') + '/' + Level.cost(s, 'talk');
      return { ok: c(a) === '15/30' && c(n) === '15/30' && c(b) === '10/20', info: c(n) + ' en ' + c(b) };
    });
    // ----- v0.11.0: archive, free threads, the free look around the lodging, wording -----
    t('Archief: elke zone heeft een mapje; archiveren en terughalen werkt, ook na opslaan; de zaakkaart blijft (' + nSeeds + ' seeds)', () => {
      const b2 = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = SpikeData.make('arch-' + i, 'laat'), L0 = Board.layout(s).cards, id = (z) => (L0.find((c) => c.kind !== 'more' && c.kind !== 'case' && Pins.zone(c.id) === z) || {}).id, ids = ['person', 'doc', 'stmt', 'place'].map(id);
        if (ids.some((x) => !x)) { b2.push('arch-' + i + ' zone zonder kaart'); continue; }
        ids.forEach((x) => Act.archive(s, x, true));
        const back = Save.unpack(Save.pack(s)), L1 = Board.layout(back).cards.map((c) => c.id), F = Board.folders(back);
        if (ids.some((x) => L1.indexOf(x) >= 0) || F.length !== 4 || F.some((f) => f.n !== 1)) b2.push('arch-' + i + ' archief');
        if (Act.archive(back, 'case', true) || L1.indexOf('case') < 0) b2.push('arch-' + i + ' zaakkaart');
        if (!Evidence.found(back).every((e) => back.play.found[e.id])) b2.push('arch-' + i + ' sporen');
        ids.forEach((x) => Act.archive(back, x, false));
        const L2 = Board.layout(back).cards.map((c) => c.id); if (ids.some((x) => L2.indexOf(x) < 0) || Board.folders(back).length) b2.push('arch-' + i + ' terughalen');
      }
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    t('Draadjes: tussen alle soorten kaarten, meerdere personen naar één plaats, blijven bewaard in het archief, oude koppelingen worden omgezet', () => {
      const s = SpikeData.make('thr-1', 'laat'); s.settings.level = 'normaal';
      const L = Board.layout(s).cards, P = L.filter((c) => c.kind === 'person').slice(0, 3).map((c) => c.id), pl = L.find((c) => c.kind === 'place').id, doc = L.find((c) => c.kind === 'doc').id, st = L.find((c) => c.kind === 'talk' || c.kind === 'claim').id;
      const ok1 = P.every((x) => Act.thread(s, x, pl)) && Act.thread(s, doc, st) && Act.thread(s, 'case', pl) && !Act.thread(s, pl, pl) && !Act.thread(s, pl, 'l:bestaat_niet');
      const mine = () => Board.layout(s).threads.filter((t) => t.kind === 'mine');
      const n1 = mine().length, toPlace = mine().filter((t) => t.a === pl || t.b === pl).length;
      Act.archive(s, pl, true); const n2 = mine().length; Act.archive(s, pl, false); const n3 = mine().length;
      Act.thread(s, P[0], pl); const n4 = mine().length;
      const old = Game.create('thr-2', 'normaal'); Tests.meet(old, old.cast[0].id); const e = old.evidence.find((x) => x.route !== 'start'); old.play.found[e.id] = { day: 1 }; old.player.links = {}; old.player.links[e.id] = old.cast[0].id;
      const raw = JSON.parse(Save.pack(old)); delete raw.player.threads; delete raw.player.archive; const mig = Save.unpack(JSON.stringify(raw));
      const okMig = mig.player.threads.length === 1 && Pins.has(mig, Pins.cardOf(mig, e.id), 'p:' + old.cast[0].id) && typeof mig.player.archive === 'object';
      return { ok: ok1 && n1 === 5 && toPlace === 4 && n2 === 1 && n3 === 5 && n4 === 4 && okMig, info: [n1, toPlace, n2, n3, n4, okMig].join(', ') };
    });
    t('Start: om 08:00 in de logies, rondkijken zonder reistijd; elders heen kost lopen; slapen brengt je terug (' + nSeeds + ' seeds)', () => {
      const b2 = [];
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('start-' + i), home = World.loc(s, s.startLoc), other = s.world.locations.find((l) => l.id !== s.startLoc && World.openAt(l, 0)), id = 'start-' + i;
        if (!World.openAt(home, 0) || s.clock.min !== 480 || s.pos !== home.id) { b2.push(id + ' start'); continue; }
        Act.visit(s, home.id); if (!s.visit || s.clock.min !== 480) b2.push(id + ' logies kost tijd'); Act.leave(s);
        if (other) { const w = Travel.min(s, home.id, other.id); Act.visit(s, other.id); if (s.clock.min !== 480 + w || !w) b2.push(id + ' lopen ' + w); Act.leave(s); }
        Act.wait(s); Act.wait(s); Act.wait(s); Act.endDay(s); if (s.pos !== home.id || s.clock.day !== 2) b2.push(id + ' nacht');
      }
      return { ok: !b2.length, info: b2.slice(0, 3).join(' | ') };
    });
    t('Dagdeel om: mensen verplaatsen zich, een gesprek loopt door en een plek die dichtgaat zet je daarna buiten', () => {
      let s = null, loc = null;
      for (let i = 0; i < 40 && !loc; i++) { s = Game.create('turn-' + i); loc = s.world.locations.find((l) => World.openAt(l, 1) && !World.openAt(l, 2) && s.cast.some((n) => Schedule.at(s, n.id, 1, 1) === l.id)); }
      if (!loc) return { ok: false, info: 'geen plek die om vijf uur dichtgaat' };
      s.clock.part = 1; s.clock.min = 1000; Act.force(s, loc.id); const n = World.present(s)[0]; s.play.met[n.id] = true;
      Act.talkStart(s, n.id); const midTalk = s.clock.part === 2 && !!s.visit && s.visit.conv === n.id && s.visit.closing;
      Act.topic(s, n.id, 'talk', 'warm'); const asked = (s.visit.used[n.id] || []).indexOf('talk') >= 0;
      Act.talkEnd(s);
      return { ok: midTalk && asked && !s.visit && s.log.some((e) => /gaat dicht/.test(e.text)), info: loc.template };
    });
    t('Tekst: een ontvoering heet ontvoerd, niet meegenomen', () => {
      const bad = Kit.crimeText.ontvoering[0].indexOf('ontvoerd') < 0 || /meegenomen|meenemen/.test(JSON.stringify(Kit.crimeText.ontvoering) + JSON.stringify(ProtagonistEngine.HOOKS.ontvoering || ''));
      let seen = 0, wrong = 0; for (let i = 0; i < 400 && seen < 3; i++) { const s = Game.create('ont-' + i); if (s.crime.type !== 'ontvoering') continue; seen++; if (!/ontvoerd/.test(s.crime.summary) || /meegenomen|meenemen/.test(s.crime.summary + s.crime.personalHook)) wrong++; }
      return { ok: !bad && !wrong, info: seen + ' ontvoeringen bekeken' };
    });
    // ----- v0.12.0: blank cards for what you heard of -----
    t('Genoemd: wie je alleen van naam kent, krijgt een blanco kaart; na de ontmoeting wordt die actief en blijven de draadjes', () => {
      const b2 = []; let tried = 0;
      for (let i = 0; i < nSeeds; i++) {
        const s = Game.create('ment-' + i, 'normaal'), id = 'ment-' + i, n = s.cast.slice().sort(byName).find((x) => U.first(x).length > 2); if (!n) continue;
        Log.sys(s, 'Je hoort dat ' + n.name + ' gisteren in de stad was.');
        const loc = s.world.locations.find((l) => l.id !== s.startLoc); Log.narr(s, 'Iemand noemt ' + loc.name + '.');
        tried++;
        if (!s.play.heardOf[n.id] || !s.play.heardOfLoc[loc.id]) { b2.push(id + ' niet genoteerd'); continue; }
        let L = Board.layout(s), card = L.cards.find((c) => c.id === 'p:' + n.id), place = L.cards.find((c) => c.id === 'l:' + loc.id);
        if (!card || card.kind !== 'ghost' || !place || place.kind !== 'ghostplace') { b2.push(id + ' geen blanco kaart'); continue; }
        if (/kenmerk|km"/.test(Board.card(s, card, famOf(s))) || Board.detail(s, 'p:' + n.id, famOf(s)).indexOf(World.loc(s, n.locationId).name) >= 0) b2.push(id + ' blanco kaart verraadt meer');
        Act.thread(s, 'p:' + n.id, 'l:' + loc.id); s.play.met[n.id] = true; s.play.visited[loc.id] = true;
        L = Board.layout(s); card = L.cards.find((c) => c.id === 'p:' + n.id); place = L.cards.find((c) => c.id === 'l:' + loc.id);
        if (!card || card.kind !== 'person' || place.kind !== 'place' || !L.threads.some((t) => t.kind === 'mine' && Pins.key(t.a, t.b) === Pins.key('p:' + n.id, 'l:' + loc.id))) b2.push(id + ' niet actief of draadje weg');
        const back = Save.unpack(Save.pack(s)); if (!back.play.heardOf[n.id]) b2.push(id + ' niet bewaard');
      }
      const old = Game.create('ment-x'); old.log.push({ k: 'n', text: 'Je hoort de naam ' + old.cast[0].name + '.', i: 999 }); const raw = JSON.parse(Save.pack(old)); delete raw.play.heardOf; delete raw.play.heardOfLoc;
      if (!Save.unpack(JSON.stringify(raw)).play.heardOf[old.cast[0].id]) b2.push('oude save niet aangevuld');
      return { ok: !b2.length && tried > 0, info: b2.slice(0, 3).join(' | ') || tried + ' zaken' };
    });
    t('Genoemd: alleen wat je zag; een gedeelde voornaam telt niet, en een gemarkeerd voorwerp wordt een blanco stuk dat bij vinden overgaat', () => {
      const s = Game.create('ment-2', 'normaal'), all = s.cast.concat(s.crowd), F = Mentions.firsts(s), dup = s.cast.find((n) => F[U.first(n)] > 1);
      const before = JSON.stringify(s.play.heardOf); Log.narr(s, 'Een gewone zin zonder namen.'); const quiet = JSON.stringify(s.play.heardOf) === before;
      let dupOk = true; if (dup && !s.play.heardOf[dup.id]) { Log.narr(s, 'Iemand zegt dat ' + U.first(dup) + ' langskwam.'); dupOk = !s.play.heardOf[dup.id]; }
      const ev = s.evidence.find((e) => e.source.type === 'object' && e.requires.length && e.route !== 'start'); let objOk = true;
      if (ev) { s.play.early[ev.source.objectId] = true; const L = Board.layout(s), o = L.cards.find((c) => c.id === 'o:' + ev.source.objectId);
        const pid = s.cast[0].id; s.play.met[pid] = true; Act.thread(s, 'o:' + ev.source.objectId, 'p:' + pid);
        ev.requires.forEach((r) => { s.play.found[r] = { day: 1 }; }); Evidence.give(s, ev, 'object');
        objOk = !!o && o.kind === 'ghostdoc' && Pins.has(s, 'd:' + ev.id, 'p:' + pid) && !Pins.ok(s, 'o:' + ev.source.objectId); }
      return { ok: quiet && dupOk && objOk, info: (dup ? 'gedeelde voornaam getest' : 'geen gedeelde voornaam') + (ev ? ', voorwerp getest' : '') };
    });
    return out;
  }
};
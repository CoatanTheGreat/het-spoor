'use strict';
/* ===== Library (from het-spoor-bibliotheek v0.3.0: RNG, Lib, DNA, PlotEngine, Kit, engines) ===== */
/* =====================================================================
   Het Spoor - Bibliotheek-lab v0.3.0
   Modules: RNG, Lib (data), Compat, DNA, PlotEngine, Batch, Kit, ProtagonistEngine, WorldEngine,
            CastEngine, TruthEngine, GameRules, Library, Tests, UI
   Doel: Story DNA + plot-engine zonder Gemini. De uitvoer sluit aan op de
   wereldbijbel via toBibleSkeleton() (nieuw, optioneel veld bible.plot).
   Inspiratie: plotMECHANISMEN per bron (zie SRC_LABEL): Christie, Brown, Vermeer,
   Midsomer, Baantjer, Columbo, Death in Paradise, Maigret, Holmes, Chandler, Broadchurch.
   Geen plots, namen of zinnen overgenomen; "src" duidt alleen het type techniek aan.
   Stijlprofielen (DNA-tabel 'styles') bepalen welke bronnen zwaarder meetellen.
   ===================================================================== */
const LIB_VERSION = 'v0.3.0';

/* ---------------- RNG: seed -> losse sub-generatoren per engine ---------------- */
const RNG = {
  xmur3(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return h >>> 0; }; },
  make(seedStr) {
    let a = this.xmur3(String(seedStr))();
    const next = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return {
      next: next,
      int(n) { return Math.floor(next() * n); },
      pick(arr) { return arr[Math.floor(next() * arr.length)]; },
      weighted(items, wf) {
        let tot = 0; const ws = items.map((i) => { const w = Math.max(0, wf(i)); tot += w; return w; });
        let x = next() * tot; for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x < 0) return items[i]; }
        return items[items.length - 1];
      }
    };
  },
  hashStr(s) { return this.xmur3(String(s))().toString(36); }
};

/* ---------------- Lib: de bibliotheek (alleen data) ----------------
   DNA-items:  id, nl, w (gewicht), tags[], needs[] (alle), needsAny[] (minstens een), bans[], likes[] (soft x3),
               must[] (technique-ids die verplicht in het plot komen), clue {id, points, a:[van,tot], text}
   Technieken: id, src (C|B|V|K), fn, a:[van,tot] akte, w, needs/needsAny/bans/likes (tegen DNA-tags),
               req[] (beat-tags die eerder geleverd moeten zijn), prov[] (levert beat-tags), pays[] (clue-ids die eerder
               geplant moeten zijn), clue {id, points: culprit|motive|method|red|context}, mandatory, text
   Slots in tekst: {dader} {vertrouweling} {zondebok} {slachtoffer} {mentor} {getuige} {klok}                    */
const TABLE_ORDER = ['eras', 'styles', 'crimes', 'structures', 'roles', 'motives', 'methods', 'twists', 'clocks'];
// Ids die het spel (Seeds in het-spoor.html v0.3.0) nu kent; de bibliotheek moet hierop aansluiten.
const GAME_ERAS = ['middeleeuwen', 'toekomst'];
const GAME_CRIMES = ['moord', 'verdwijning', 'diefstal', 'complot', 'fraude', 'chantage', 'sabotage', 'valsheid', 'verraad', 'brandstichting', 'ontvoering'];
const GAME_CULPRITS = ['naaste', 'machthebber', 'bijfiguur'];
const SRC_LABEL = { C: 'Christie-type', B: 'Brown-type', V: 'Vermeer-type (psychologisch)', K: 'klassiek', M: 'Midsomer-type (dorpsleven)', P: 'Baantjer-type (onderzoeksroutine)',
  X: 'Columbo-type (bewijsjacht)', L: 'Onmogelijke misdaad (Death in Paradise-type)', G: 'Maigret-type (milieu en geduld)', S: 'Holmes-type (observatie)',
  N: 'Noir (Chandler-type)', Z: 'Gemeenschapsdrama (Broadchurch- en Noordse-noir-type)', DNA: 'uit de DNA-keuze' };
const TABLE_LABEL = { eras: 'Tijdvak', styles: 'Stijl', crimes: 'Misdaad', structures: 'Structuur', roles: 'Dader', motives: 'Motief', methods: 'Methode', twists: 'Twist', clocks: 'Klok' };
const DNA_CLUE_LABEL = { roles: 'Spoor naar de dader', motives: 'Spoor naar het motief', methods: 'Spoor naar de methode', twists: 'Spoor in de twist' };

const Lib = {
  eras: [
    { id: 'middeleeuwen', nl: 'Middeleeuwen (ca. 1300-1450)', w: 2, tags: ['era.middeleeuwen', 'tech.reisschema', 'tech.brief'],
      rules: { allowed: ['brieven', 'zegels', 'gilden', 'kerkelijke registers', 'paard en wagen', 'veerdienst'], banned: ['telefoon', 'trein', 'elektriciteit', 'fotografie', 'kranten', 'vuurwapens', 'magie'] } },
    { id: 'toekomst', nl: 'Nabije toekomst (ca. 2100)', w: 2, tags: ['era.toekomst', 'tech.reisschema', 'tech.telefoon', 'tech.data', 'tech.drone', 'tech.pc', 'forensic.dna'],
      rules: { allowed: ['digitale registers', 'drones', 'data-analyse', 'biometrie'], banned: ['magie', 'ruimteoorlogen', 'tijdreizen', 'bovennatuurlijke zaken'] } },
    { id: 'e1895', nl: 'Late 19e eeuw (rond 1895)', w: 2, tags: ['era.1895', 'tech.reisschema', 'tech.telegraaf', 'tech.gaslicht'],
      rules: { allowed: ['telegraaf', 'trein', 'gaslicht', 'brieven', 'studiofotografie'], banned: ['telefoon (niet gebruiken)', 'auto', 'radio', 'film', 'computer', 'dna'] } },
    { id: 'e1925', nl: 'Interbellum (rond 1925)', w: 2, tags: ['era.1925', 'tech.reisschema', 'tech.telefoon', 'tech.auto', 'tech.radio', 'forensic.vingerafdruk'],
      rules: { allowed: ['telefoon', 'trein', 'auto', 'radio', 'vingerafdrukken', 'grammofoon'], banned: ['televisie', 'computer', 'mobiele telefoon', 'dna'] } },
    { id: 'e1955', nl: 'Wederopbouw (rond 1955)', w: 2, tags: ['era.1955', 'tech.reisschema', 'tech.telefoon', 'tech.auto', 'tech.radio', 'forensic.vingerafdruk'],
      rules: { allowed: ['telefoon', 'trein', 'auto', 'radio', 'vingerafdrukken'], banned: ['computer', 'mobiele telefoon', 'internet', 'dna'] } },
    { id: 'e1978', nl: 'Jaren zeventig (rond 1978)', w: 2, tags: ['era.1978', 'tech.reisschema', 'tech.telefoon', 'tech.auto', 'tech.tv', 'tech.kopieer', 'forensic.vingerafdruk'],
      rules: { allowed: ['telefoon', 'auto', 'televisie', 'kopieermachine', 'vingerafdrukken'], banned: ['mobiele telefoon', 'internet', 'dna-profiel', 'smartphone'] } },
    { id: 'e1994', nl: 'Jaren negentig (rond 1994)', w: 2, tags: ['era.1994', 'tech.reisschema', 'tech.telefoon', 'tech.fax', 'tech.auto', 'tech.tv', 'tech.pc', 'forensic.vingerafdruk'],
      rules: { allowed: ['vaste telefoon', 'fax', 'auto', 'televisie', 'pc (beperkt)'], banned: ['smartphone', 'sociale media', 'mobiel internet'] } }
  ],
  styles: [   // stijlprofielen: srcBoost = vermenigvuldiger voor technieken van die bron
    { id: 'dorp', nl: 'Dorpsgeheim (Midsomer-type)', w: 2, tags: ['style.dorp'], srcBoost: { M: 4, C: 2, V: 1.5 }, tones: ['warm-menselijk', 'sluimerend'], tempos: ['rustig', 'gemiddeld'] },
    { id: 'procedureel', nl: 'Het onderzoek (Baantjer-type)', w: 2, tags: ['style.procedureel'], srcBoost: { P: 4, G: 2, S: 1.5, K: 1.5 }, tones: ['ingetogen', 'warm-menselijk'], tempos: ['gemiddeld', 'stevig'] },
    { id: 'gezelschap', nl: 'Klassiek gezelschap (Christie-type)', w: 2, tags: ['style.gezelschap'], srcBoost: { C: 3, L: 3, B: 1.5 }, tones: ['ingetogen', 'sluimerend'], tempos: ['rustig', 'gemiddeld'] },
    { id: 'psych', nl: 'Psychologisch (Vermeer- en Maigret-type)', w: 2, tags: ['style.psych'], srcBoost: { V: 4, Z: 3, G: 2 }, tones: ['melancholisch', 'sluimerend'], tempos: ['rustig'] },
    { id: 'noir', nl: 'Noir (Chandler-type)', w: 1.5, tags: ['style.noir'], needsAny: ['era.1925', 'era.1955', 'era.1978', 'era.1994', 'era.toekomst'], srcBoost: { N: 4, B: 2, S: 1.5 }, tones: ['melancholisch', 'sluimerend'], tempos: ['gemiddeld', 'stevig'] },
    { id: 'omgekeerd', nl: 'Omgekeerd (Columbo-type)', w: 1.5, tags: ['style.omgekeerd'], bans: ['struct.kring', 'struct.jacht', 'struct.cold', 'struct.why', 'struct.zondebok', 'struct.reeks', 'struct.complot', 'struct.onmogelijk'], srcBoost: { X: 5, V: 1.5, S: 1.5 }, tones: ['ingetogen', 'warm-menselijk'], tempos: ['gemiddeld'] }
  ],
  crimes: [   // ids = Seeds.CRIMES van het spel
    { id: 'moord', nl: 'Moord (buiten beeld)', victim: 'het slachtoffer', w: 2, tags: ['crime.person', 'crime.death'] },
    { id: 'verdwijning', nl: 'Verdwijning', victim: 'het slachtoffer', w: 3, tags: ['crime.person', 'crime.missing'] },
    { id: 'diefstal', nl: 'Diefstal van waardevolle zaken', victim: 'de eigenaar', w: 2, tags: ['crime.property'] },
    { id: 'complot', nl: 'Complot tegen een persoon of instelling', victim: 'het doelwit', w: 1.5, tags: ['crime.person', 'crime.conspiracy'] },
    { id: 'fraude', nl: 'Fraude of verduistering', victim: 'de benadeelde', w: 2, tags: ['crime.financial', 'crime.document'] },
    { id: 'chantage', nl: 'Chantage', victim: 'de gechanteerde', w: 2, tags: ['crime.person', 'crime.blackmail'] },
    { id: 'sabotage', nl: 'Sabotage bij werk, handel of een project', victim: 'de gedupeerde', w: 1.5, tags: ['crime.property', 'crime.sabotage'] },
    { id: 'valsheid', nl: 'Valsheid in geschrifte', victim: 'de misleide partij', w: 2, tags: ['crime.property', 'crime.document'] },
    { id: 'verraad', nl: 'Verraad of spionage', victim: 'de verraden partij', w: 1.5, tags: ['crime.treason', 'crime.document'] },
    { id: 'brandstichting', nl: 'Brandstichting', victim: 'de eigenaar', w: 1.5, tags: ['crime.property', 'crime.arson'] },
    { id: 'ontvoering', nl: 'Ontvoering (buiten beeld)', victim: 'het slachtoffer', w: 1.5, tags: ['crime.person', 'crime.missing'] }
  ],
  structures: [
    { id: 'kring', nl: 'Gesloten kring', w: 3, tags: ['struct.kring'], likes: ['style.dorp', 'style.gezelschap'], must: ['c_gesloten_kring'] },
    { id: 'jacht', nl: 'Het spoor volgen (reizen)', w: 2, tags: ['struct.jacht'], likes: ['style.noir', 'style.procedureel'] },
    { id: 'cold', nl: 'Cold case', w: 1.5, tags: ['struct.cold'], needsAny: ['crime.missing', 'crime.death'], likes: ['style.psych'] },
    { id: 'whydunit', nl: 'Whydunit (waarom, niet wie)', w: 2, tags: ['struct.why'], likes: ['style.psych'] },
    { id: 'zondebok', nl: 'De onterecht beschuldigde', w: 2, tags: ['struct.zondebok'] },
    { id: 'reeks', nl: 'Reeks verwante incidenten', w: 1.5, tags: ['struct.reeks'], needsAny: ['crime.property', 'crime.sabotage', 'crime.blackmail'], likes: ['style.procedureel'] },
    { id: 'complot', nl: 'Complot achter de schermen', w: 1.5, tags: ['struct.complot'], needsAny: ['crime.financial', 'crime.sabotage', 'crime.conspiracy', 'crime.treason'], likes: ['style.noir'] },
    { id: 'onmogelijk', nl: 'Onmogelijke misdaad (afgesloten ruimte)', w: 1.5, tags: ['struct.onmogelijk'], needsAny: ['crime.property', 'crime.person'], likes: ['style.gezelschap'], must: ['l_onmogelijke_misdaad'] },
    { id: 'bewijsjacht', nl: 'Bewijsjacht (je kent de dader, het bewijs ontbreekt)', w: 3, tags: ['struct.bewijsjacht'], needs: ['style.omgekeerd'], bans: ['twist.manipulatie', 'role.close', 'role.selfvictim'], must: ['x_dader_bekend'] }
  ],
  roles: [
    { id: 'helper', nl: 'de behulpzame vertrouweling', w: 3, tags: ['role.close', 'role.helper'], must: ['c_behulpzame_dader'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: '{dader} blijkt op cruciale momenten net te veel te weten over wat er is gebeurd.' } },
    { id: 'familie', nl: 'een familielid', w: 2, tags: ['role.close', 'role.family'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: '{dader} vertelt over die dag een verhaal dat in kleine details afwijkt van wat anderen zich herinneren.' } },
    { id: 'mentor', nl: 'de mentor', w: 2, tags: ['role.close', 'role.mentor'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: '{dader} stuurt je net weg van de plek waar het antwoord ligt, zogenaamd om je te beschermen.' } },
    { id: 'autoriteit', nl: 'een gezagsdrager', w: 1.5, tags: ['role.authority'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: '{dader} sluit het onderzoek opvallend snel af zonder duidelijke reden.' } },
    { id: 'ooggetuige', nl: 'de ooggetuige', w: 1.5, tags: ['role.witness'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: 'De verklaring van {dader} is verdacht compleet en bevat een detail dat niemand kon weten.' } },
    { id: 'buur', nl: 'de onopvallende buurman of bediende', w: 2, tags: ['role.nondescript'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: 'Niemand weet nog waar {dader} die dag precies was, en dat valt pas later op.' } },
    { id: 'aangever', nl: 'degene die de zaak meldde', w: 1.5, tags: ['role.reporter'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: 'Het verhaal van {dader} over het melden van de zaak bevat een gat van een uur.' } },
    { id: 'slachtoffer', nl: 'het "slachtoffer" zelf', w: 1, tags: ['role.selfvictim'], needsAny: ['crime.missing', 'crime.property', 'crime.financial'], bans: ['crime.death'],
      clue: { id: 'dader', points: 'culprit', a: [1, 2], text: 'Persoonlijke bezittingen van {dader} zijn zorgvuldig meegenomen: dit was gepland.' } }
  ],
  motives: [
    { id: 'geld', nl: 'Geld', w: 3, tags: ['motive.geld'], clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Een geldstroom die niet klopt wijst naar iemand met schulden of grote plannen.' } },
    { id: 'liefde', nl: 'Liefde en jaloezie', w: 2, tags: ['motive.liefde'], clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Een oude brief of ontmoeting laat zien dat {dader} niet over iemand heen is.' } },
    { id: 'schaamte', nl: 'Schaamte over een geheim', w: 2, tags: ['motive.schaamte'], clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Een verborgen verleden komt boven: {dader} had alles te verliezen als dit uitkwam.' } },
    { id: 'bescherming', nl: 'Iemand beschermen', w: 2, tags: ['motive.bescherming'], clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Alles wat {dader} deed bleek gericht op het afschermen van een enkele persoon.' } },
    { id: 'wraak', nl: 'Wraak voor oud onrecht', w: 2, tags: ['motive.wraak'], clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Een oud verslag toont een onrecht waarvoor {dader} nooit genoegdoening kreeg.' } },
    { id: 'macht', nl: 'Macht en positie', w: 2, tags: ['motive.macht'], clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Een benoeming of overname hing af van de uitkomst van deze zaak.' } },
    { id: 'angst', nl: 'Angst (zelf onder druk gezet)', w: 1.5, tags: ['motive.angst'], needsAny: ['crime.blackmail', 'crime.person'], clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Er bestaat een oudere dreiging waar {dader} al lang onder gebukt gaat.' } },
    { id: 'erfenis', nl: 'Erfenis', w: 2, tags: ['motive.erfenis'], needsAny: ['crime.death', 'crime.missing'], bans: ['role.selfvictim'],
      clue: { id: 'motief', points: 'motive', a: [2, 3], text: 'Een testament of akte schuift het bezit naar {dader}.' } }
  ],
  methods: [
    { id: 'tijd', nl: 'Verschoven tijdstip', w: 2, tags: ['method.tijd'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'De tijdsaanduidingen van twee getuigen kunnen niet allebei kloppen.' } },
    { id: 'identiteit', nl: 'Valse of gewisselde identiteit', w: 1.5, tags: ['method.identiteit'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Iemand gebruikte een naam of kleding die niet de eigen was.' } },
    { id: 'documenten', nl: 'Vervalste documenten', w: 2, tags: ['method.documenten'], needsAny: ['crime.document', 'crime.financial'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Een handtekening, stempel of zegel wijkt subtiel af van de echte.' } },
    { id: 'afleiding', nl: 'Afleidingsmanoeuvre', w: 2, tags: ['method.afleiding'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Een opvallend voorval elders trok op het cruciale moment alle aandacht.' } },
    { id: 'vertrouwen', nl: 'Misbruik van vertrouwen en toegang', w: 2, tags: ['method.vertrouwen'], needsAny: ['role.close', 'role.authority', 'role.nondescript', 'role.reporter'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Er was geen braak: wie had toegang, en wie vertrouwde dat?' } },
    { id: 'plaatsen', nl: 'Bewijs bij een ander plaatsen', w: 1.5, tags: ['method.zondebok'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Het belastende voorwerp lag er te mooi, alsof het gevonden moest worden.' } },
    { id: 'telefoon', nl: 'Telefoon-alibi', w: 2, tags: ['method.telefoon'], needs: ['tech.telefoon'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Een gesprek, of juist het uitblijven daarvan, klopt niet met het verhaal.' } },
    { id: 'reis', nl: 'Reisschema-truc', w: 1.5, tags: ['method.reis'], needs: ['tech.reisschema'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Een reisschema toont dat het alibi op papier onmogelijk is.' } },
    { id: 'onwetend', nl: 'Onwetende medeplichtige', w: 1.5, tags: ['method.helper'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Iemand voerde een kleine opdracht uit zonder te weten waarvoor.' } },
    { id: 'bericht', nl: 'Vervalst of vertraagd bericht', w: 1.5, tags: ['method.bericht'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Een boodschap bereikte de ontvanger later of anders dan bedoeld, en dat gaf de dader ruimte.' } },
    { id: 'onmogelijk', nl: 'Schijnbaar onmogelijke toegang', w: 3, tags: ['method.onmogelijk'], needs: ['struct.onmogelijk'], clue: { id: 'methode', points: 'method', a: [1, 3], text: 'Een afgesloten ruimte blijkt toch bereikbaar via een weg die niemand overwoog.' } }
  ],
  twists: [
    { id: 'manipulatie', nl: 'De warme vertrouweling manipuleert', w: 3, tags: ['twist.manipulatie'], needs: ['role.close'], must: ['v_gaslighting_lite'],
      clue: { id: 'twist', points: 'culprit', a: [3, 4], text: '{vertrouweling} past het verhaal telkens net aan zodra jij iets nieuws ontdekt.' } },
    { id: 'zondebok', nl: 'De onschuldige wordt het doelwit', w: 2, tags: ['twist.zondebok'], likes: ['struct.zondebok'], must: ['c_zondebok'],
      clue: { id: 'twist', points: 'culprit', a: [3, 4], text: 'Het bewijs tegen {zondebok} is opvallend netjes aangeleverd.' } },
    { id: 'valsegetuige', nl: 'Valse getuige', w: 1.5, tags: ['twist.valsegetuige'],
      clue: { id: 'twist', points: 'culprit', a: [3, 4], text: 'Een getuige verandert haar verhaal nadat {dader} bij haar op bezoek was.' } },
    { id: 'dubbel', nl: 'Dubbele misdaad', w: 1.5, tags: ['twist.dubbel'], must: ['c_dubbele_misdaad'],
      clue: { id: 'twist', points: 'culprit', a: [3, 4], text: 'Een tweede, kleinere misdaad blijkt de eerste te hebben afgedekt.' } },
    { id: 'identiteit', nl: 'Gewisselde identiteit', w: 1.5, tags: ['twist.identiteit'], needsAny: ['method.identiteit', 'crime.missing'],
      clue: { id: 'twist', points: 'culprit', a: [3, 4], text: 'Een naam in het register klopt niet met het gezicht dat mensen zich herinneren.' } },
    { id: 'slachtofferliegt', nl: 'Het slachtoffer loog', w: 1.5, tags: ['twist.slachtofferliegt'],
      clue: { id: 'twist', points: 'culprit', a: [3, 4], text: 'Een verklaring van {slachtoffer} blijkt aantoonbaar onjuist.' } },
    { id: 'aangever', nl: 'De aangever is de dader', w: 1.5, tags: ['twist.aangever'], needs: ['role.reporter'],
      clue: { id: 'twist', points: 'culprit', a: [3, 4], text: 'De melding van de zaak kwam eerder dan iemand kon weten dat er iets was gebeurd.' } },
    { id: 'geen', nl: 'Geen extra twist (klassiek)', w: 1, tags: ['twist.geen'] }
  ],
  clocks: [
    { id: 'geen', nl: 'Geen klok', w: 2, tags: ['clock.geen'], text: '' },
    { id: 'deadline', nl: 'Vaste deadline', w: 2, tags: ['clock.deadline'], bans: ['struct.cold'], must: ['b_tikkende_klok'], text: 'Over enkele dagen vertrekt het schip, begint het proces of valt de veiling; daarna is het spoor weg.' },
    { id: 'vergankelijk', nl: 'Vergankelijk bewijs', w: 2, tags: ['clock.vergankelijk'], must: ['b_tikkende_klok'], text: 'Sommige sporen vervagen met elke dag die voorbijgaat.' },
    { id: 'opruimen', nl: 'De dader wist sporen uit', w: 2, tags: ['clock.opruimen'], must: ['b_tikkende_klok'], text: 'Iemand loopt voor je uit en ruimt na elk bezoek op.' },
    { id: 'seizoen', nl: 'Seizoen of weer sluit de weg', w: 1.5, tags: ['clock.seizoen'], must: ['b_tikkende_klok'], text: 'De eerste sneeuw of het hoogwater sluit binnenkort de verbindingen af.' }
  ],
  tones: ['ingetogen', 'melancholisch', 'sluimerend', 'warm-menselijk'],
  tempos: ['rustig', 'gemiddeld', 'stevig'],

  /* ----- plottechnieken (src: C = Christie-type, B = Brown-type, V = Vermeer-type/psychologisch, K = klassiek) ----- */
  techniques: [
    // Akte 1
    { id: 'v_persoonlijke_haak', src: 'V', fn: 'aanleiding', a: [1, 1], mandatory: true, prov: ['hook.personal'],
      text: 'De misdaad raakt je persoonlijk: iemand uit je eigen leven wordt erdoor getroffen of beschuldigd.' },
    { id: 'k_eerste_spoor', src: 'K', fn: 'spoor', a: [1, 1], w: 3, prov: ['trail.start'], clue: { id: 'plaats', points: 'method' },
      text: 'Op de plek van het voorval ligt iets dat daar niet hoort.' },
    { id: 'k_verdachtenlijst', src: 'K', fn: 'verdachte', a: [1, 1], w: 1, prov: ['suspect.pool'],
      text: 'Na het eerste onderzoek blijven enkele mensen over die iets te verbergen hebben.' },
    { id: 'c_gesloten_kring', src: 'C', fn: 'verdachte', a: [1, 2], w: 3, likes: ['struct.kring'], prov: ['suspect.pool'], clue: { id: 'kring', points: 'context' },
      text: 'Een kleine kring mensen had zowel motief als gelegenheid; niemand valt meteen af.' },
    { id: 'c_behulpzame_dader', src: 'C', fn: 'verdachte', a: [1, 2], w: 2, needs: ['role.helper'], prov: ['culprit.helpful'], clue: { id: 'behulpzaam', points: 'culprit' },
      text: '{dader} biedt meteen hulp aan, net iets te snel en te handig.' },
    { id: 'c_fair_play_zicht', src: 'C', fn: 'spoor', a: [1, 2], w: 2, clue: { id: 'zicht', points: 'culprit' },
      text: 'Een onopvallend detail valt je op en lijkt onbelangrijk; je noteert het toch.' },
    { id: 'v_gewone_geheimen', src: 'V', fn: 'verdachte', a: [1, 2], w: 2, clue: { id: 'alledaags', points: 'context' },
      text: 'In de buurt kent iedereen elkaar, en juist daarom weet niemand echt iets: alledaagse geheimen blijven dicht.' },
    { id: 'v_dagelijkse_band', src: 'V', fn: 'relatie', a: [1, 2], mandatory: true, prov: ['bond.formed'],
      text: 'Je bouwt een band op met iemand die je steeds vaker opzoekt: vriendschap, vertrouwen, misschien meer.' },
    // Akte 1-3
    { id: 'b_sleutelketen', src: 'B', fn: 'spoor', a: [1, 3], w: 2, prov: ['chain.key'],
      text: 'Elke oplossing levert de sleutel voor de volgende: een slot, een naam, een adres.' },
    { id: 'b_document_dubbel', src: 'B', fn: 'spoor', a: [1, 3], w: 2, needsAny: ['crime.document', 'crime.financial'], prov: ['puzzle.document'], clue: { id: 'dubbelzin', points: 'method' },
      text: 'Een document, kasboek of register krijgt een tweede betekenis zodra je het in een andere volgorde leest.' },
    // Akte 2-3
    { id: 'v_dubbel_leven', src: 'V', fn: 'verdachte', a: [2, 3], w: 2, prov: ['secret.double_life'], clue: { id: 'dubbelleven', points: 'red' },
      text: 'Een verdachte blijkt een dubbel leven te leiden, wat een sterk maar onjuist spoor oplevert.' },
    { id: 'c_zondebok', src: 'C', fn: 'verdachte', a: [2, 3], w: 2, likes: ['struct.zondebok', 'twist.zondebok'], prov: ['scapegoat.suspected'], clue: { id: 'zondebok', points: 'red' },
      text: '{zondebok} komt in het vizier en de schijn is tegen die persoon.' },
    { id: 'c_bijzaak_geheim', src: 'C', fn: 'rode_haring', a: [2, 3], w: 2, req: ['suspect.pool'], prov: ['redherring.secret'], clue: { id: 'bijzaak', points: 'red' },
      text: 'Elke verdachte verbergt iets, maar niet de misdaad: een schuld, een liefde, een leugen over een bezoek.' },
    { id: 'v_geheim_beschermen', src: 'V', fn: 'rode_haring', a: [2, 3], w: 2, prov: ['redherring.protect'], clue: { id: 'beschermer', points: 'red' },
      text: 'Een verdachte zwijgt hardnekkig, niet uit schuld maar om iemand anders te beschermen.' },
    { id: 'k_valse_motief', src: 'K', fn: 'rode_haring', a: [2, 3], w: 2, clue: { id: 'valsmotief', points: 'red' },
      text: 'Een verdachte lijkt een sterk motief te hebben, tot blijkt dat het nooit is uitgevoerd.' },
    { id: 'v_onbetrouwbare_herinnering', src: 'V', fn: 'spoor', a: [2, 3], w: 2, prov: ['testimony.unreliable'], clue: { id: 'herinnering', points: 'context' },
      text: 'Een getuige herinnert zich iets met overtuiging, maar emotie kleurt het verhaal.' },
    { id: 'k_tegenstrijdige_getuigen', src: 'K', fn: 'spoor', a: [2, 3], w: 2, prov: ['contradiction.pair'], clue: { id: 'tegenspraak', points: 'culprit' },
      text: 'Twee getuigen spreken elkaar tegen over dezelfde minuut; een van hen liegt.' },
    { id: 'v_schuldgevoel_tell', src: 'V', fn: 'spoor', a: [2, 3], w: 2, clue: { id: 'tell', points: 'culprit' },
      text: '{dader} toont onbewust te veel zorg voor een detail dat niemand anders belangrijk vindt.' },
    { id: 'b_organisatie_dekmantel', src: 'B', fn: 'spoor', a: [2, 3], w: 3, needs: ['struct.complot'], prov: ['organization.cover'], clue: { id: 'organisatie', points: 'motive' },
      text: 'Een vereniging of instelling verhult meer dan ze toont; leden zwijgen in koor.' },
    { id: 'c_getuige_zwijgt', src: 'C', fn: 'spoor', a: [2, 3], w: 2, prov: ['witness.silenced'], clue: { id: 'zwijgt', points: 'context' },
      text: 'Een getuige wil plotseling niets meer zeggen en vertrekt uit de stad.' },
    { id: 'c_tweede_incident', src: 'C', fn: 'spoor', a: [2, 3], w: 2, likes: ['struct.reeks', 'struct.jacht'], prov: ['incident.second'], clue: { id: 'tweede', points: 'method' },
      text: 'Een tweede, onschuldig ogend incident, een verdwenen brief of een gesloten deur, verhoogt de druk.' },
    { id: 'v_vertrouwen_op_proef', src: 'V', fn: 'relatie', a: [2, 4], w: 2, prov: ['bond.tested'],
      text: 'Een gesprek met een kandidaat-vriend of -vijand laat zien wat jij werkelijk voor diegene betekent.' },
    { id: 'b_tikkende_klok', src: 'B', fn: 'klok', a: [2, 2], needsAny: ['clock.deadline', 'clock.vergankelijk', 'clock.opruimen', 'clock.seizoen'], prov: ['clock.active'],
      text: '{klok}' },
    // Akte 2-4
    { id: 'k_bewijs_afwezigheid', src: 'K', fn: 'spoor', a: [2, 4], w: 2, clue: { id: 'afwezig', points: 'method' },
      text: 'Wat er niet is, vertelt iets: een gebruikelijk geluid, een gewoonte, een lege plek.' },
    { id: 'v_gaslighting_lite', src: 'V', fn: 'relatie', a: [2, 4], needs: ['twist.manipulatie'], prov: ['manipulation.sign'], clue: { id: 'inconsistent', points: 'culprit' },
      text: '{vertrouweling} zegt dat je iets verkeerd hebt gezien; later blijkt jouw waarneming te kloppen.' },
    { id: 'v_vertrouwen_slaat_om', src: 'V', fn: 'relatie', a: [2, 4], w: 2, needs: ['role.close'], prov: ['relation.flip'],
      text: 'Een band die warm voelde slaat om: een vriendelijk gesprek wordt afstandelijk, of juist onverwacht open.' },
    // Extra rode haringen (akte 2-3)
    { id: 'k_sterk_alibi_zwak', src: 'K', fn: 'rode_haring', a: [2, 3], w: 2, clue: { id: 'alibizwak', points: 'red' },
      text: 'Een verdachte heeft een sterk lijkend alibi dat bij nader inzien op een klein, onschuldig detail steunt.' },
    { id: 'v_verliefde_verdachte', src: 'V', fn: 'rode_haring', a: [2, 3], w: 2, clue: { id: 'verliefd', points: 'red' },
      text: 'Een verdachte gedraagt zich schuldig omdat hij of zij een verboden liefde verbergt.' },
    { id: 'k_haastig_vertrek', src: 'K', fn: 'rode_haring', a: [2, 3], w: 1, clue: { id: 'vertrek', points: 'red' },
      text: 'Iemand vertrekt haastig uit de stad, niet uit schuld maar uit schaamte over een oude schuld.' },
    { id: 'c_voorwerp_bij_ander', src: 'C', fn: 'rode_haring', a: [2, 3], w: 1, clue: { id: 'voorwerp', points: 'red' },
      text: 'Een belangrijk voorwerp duikt op bij iemand die het eerlijk van een ander heeft gekregen.' },
    // Extra sporen
    { id: 'k_gewoonte_doorbroken', src: 'K', fn: 'spoor', a: [1, 3], w: 2, clue: { id: 'gewoonte', points: 'method' },
      text: 'Een vaste gewoonte werd die dag doorbroken, en niemand weet precies waarom.' },
    { id: 'k_brief_vervangen', src: 'K', fn: 'spoor', a: [2, 3], w: 2, clue: { id: 'brief', points: 'context' },
      text: 'Een brief of bericht blijkt te zijn vervangen of vertraagd.' },
    { id: 'v_plek_met_betekenis', src: 'V', fn: 'spoor', a: [2, 4], w: 2, clue: { id: 'plek', points: 'context' },
      text: 'Een plek waar iemand telkens naar terugkeert krijgt betekenis zodra je weet waarom.' },
    { id: 'k_kaart_plattegrond', src: 'K', fn: 'spoor', a: [1, 4], w: 2, clue: { id: 'kaart', points: 'method' },
      text: 'Een kaart of plattegrond laat zien wie waar kon zijn op het cruciale moment.' },
    { id: 'k_administratie_ontbreekt', src: 'K', fn: 'spoor', a: [2, 3], w: 2, needsAny: ['crime.financial', 'crime.property'], clue: { id: 'administratie', points: 'motive' },
      text: 'Een bedrag of voorwerp ontbreekt in de administratie, en iemand heeft dat zorgvuldig weggewerkt.' },
    { id: 'c_kleine_leugen', src: 'C', fn: 'spoor', a: [2, 3], w: 2, clue: { id: 'kleineleugen', points: 'culprit' },
      text: 'Een getuige liegt over iets kleins en onbelangrijks; het is de eerste scheur in het verhaal.' },
    // Extra relaties
    { id: 'v_kleine_gunst', src: 'V', fn: 'relatie', a: [2, 4], w: 2, prov: ['bond.favor'],
      text: 'Iemand vraagt je om een kleine gunst; je antwoord bepaalt hoe warm of koel het wordt.' },
    { id: 'v_gedeeld_geheim', src: 'V', fn: 'relatie', a: [2, 4], w: 2, prov: ['bond.secret'],
      text: 'Een kandidaat-vriend of -liefde vertrouwt je een persoonlijk geheim toe.' },
    { id: 'v_misverstand', src: 'V', fn: 'relatie', a: [2, 4], w: 2, prov: ['bond.misunderstanding'],
      text: 'Een misverstand brengt je in conflict met iemand die je waardeert; hoe je het oplost telt.' },
    // Akte 3
    { id: 'c_valse_oplossing', src: 'C', fn: 'keerpunt', a: [3, 3], w: 4, bans: ['struct.bewijsjacht'], prov: ['false_solution'],
      text: 'Een verdachte lijkt de dader en de zaak lijkt gesloten; de rust is bedrieglijk.' },
    { id: 'k_koude_sporen', src: 'K', fn: 'keerpunt', a: [3, 3], w: 2, needsAny: ['clock.vergankelijk', 'clock.opruimen', 'struct.cold'], likes: ['clock.vergankelijk', 'struct.cold'], prov: ['trail.cold'],
      text: 'Het spoor wordt koud: getuigen vergeten, sporen verdwijnen, je moet opnieuw beginnen.' },
    // Akte 3-4
    { id: 'c_dubbele_misdaad', src: 'C', fn: 'twist', a: [3, 4], needs: ['twist.dubbel'], prov: ['crime.double'], clue: { id: 'dubbele', points: 'motive' },
      text: 'De zichtbare misdaad blijkt een tweede, oudere misdaad te verbergen.' },
    { id: 'v_afstand_nabijheid', src: 'V', fn: 'relatie', a: [3, 4], w: 2, prov: ['bond.shift'],
      text: 'Een kandidaat-vriend of -vijand reageert anders op je dan eerder: verwijdering of toenadering.' },
    // Akte 4
    { id: 'c_herinterpretatie', src: 'C', fn: 'keerpunt', a: [4, 4], w: 3, pays: ['zicht'], prov: ['clue.reinterpreted'],
      text: 'Het detail uit het begin blijkt iets heel anders te betekenen dan je dacht.' },
    { id: 'b_mentor_tegenstander', src: 'B', fn: 'keerpunt', a: [4, 4], w: 3, needsAny: ['role.mentor', 'twist.manipulatie'], prov: ['ally.betrays'],
      text: 'Een bondgenoot, mentor of raadgever blijkt de kant van de tegenstander te kiezen.' },
    { id: 'k_nieuw_inzicht', src: 'K', fn: 'keerpunt', a: [4, 4], w: 1, clue: { id: 'eigenaar', points: 'method' },
      text: 'Een eerder gevonden voorwerp blijkt van een andere eigenaar te zijn dan gedacht.' },
    // ---- Midsomer-type (M): dorpsleven, tradities, excentrieke bewoners ----
    { id: 'm_dorpsfeest', src: 'M', needs: ['style.dorp'], fn: 'spoor', a: [1, 2], w: 2, prov: ['event.village'], clue: { id: 'feest', points: 'context' },
      text: 'Een jaarlijks feest of wedstrijd brengt het hele dorp samen en dient als dekmantel: wie was waar, tussen de kraampjes?' },
    { id: 'm_dorpsgeheim_oud', src: 'M', needs: ['style.dorp'], fn: 'verdachte', a: [1, 2], w: 2, clue: { id: 'oudgeheim', points: 'context' },
      text: 'Iedereen kent een oud verhaal over de families hier, maar niemand vertelt het volledig.' },
    { id: 'm_excentriek', src: 'M', needs: ['style.dorp'], fn: 'relatie', a: [1, 3], w: 2, prov: ['bond.eccentric'],
      text: 'Een excentrieke bewoner weet meer dan hij laat merken en deelt zijn kennis alleen in ruil voor een wederdienst.' },
    { id: 'm_dorp_sluit_rijen', src: 'M', needs: ['style.dorp'], fn: 'rode_haring', a: [2, 3], w: 2, clue: { id: 'zwijgend', points: 'red' },
      text: 'Het dorp sluit de rijen tegen de buitenstaander; wat op medeplichtigheid lijkt is gemeenschapszin.' },
    { id: 'm_familievete', src: 'M', needs: ['style.dorp'], fn: 'rode_haring', a: [2, 3], w: 2, clue: { id: 'vete', points: 'red' },
      text: 'Een oude vete tussen twee families kleurt elk getuigenis en wijst naar het verkeerde motief.' },
    { id: 'm_roddel', src: 'M', needs: ['style.dorp'], fn: 'spoor', a: [2, 3], w: 2, prov: ['testimony.unreliable'], clue: { id: 'roddel', points: 'context' },
      text: 'De roddel verspreidt zich sneller dan jij kunt onderzoeken; er zit een korrel waarheid in, maar welke?' },
    { id: 'm_traditie_dekmantel', src: 'M', needs: ['style.dorp'], fn: 'spoor', a: [2, 3], w: 3, likes: ['struct.kring'], clue: { id: 'traditie', points: 'method' },
      text: 'Een plaatselijke traditie maakt het mogelijk om ongemerkt ergens te zijn waar je niet hoort.' },
    // ---- Baantjer-type (P): onderzoeksroutine ----
    { id: 'p_buurtonderzoek', src: 'P', fn: 'spoor', a: [1, 2], w: 3, clue: { id: 'buurt', points: 'method' },
      text: 'Een rondje langs de buren levert tien nutteloze verhalen op en een enkel detail dat klopt.' },
    { id: 'p_informant', src: 'P', fn: 'relatie', a: [1, 3], w: 3, prov: ['bond.informant'],
      text: 'Een informant op een plek waar mensen praten wil iets kwijt in ruil voor een wederdienst.' },
    { id: 'p_verhoor_stappen', src: 'P', fn: 'spoor', a: [2, 3], w: 2, prov: ['contradiction.pair'], clue: { id: 'verhoor', points: 'culprit' },
      text: 'Je haalt een verklaring laag voor laag uit elkaar: eerst de leugen, dan het ontbrekende stuk.' },
    { id: 'p_papieren_spoor', src: 'P', fn: 'spoor', a: [2, 3], w: 3, clue: { id: 'papier', points: 'motive' },
      text: 'De administratie, een register, rekening of logboek, bevat de ontbrekende schakel.' },
    { id: 'p_laatste_uren', src: 'P', fn: 'spoor', a: [1, 3], w: 2, clue: { id: 'uren', points: 'method' },
      text: 'Je reconstrueert de laatste uren voor het voorval, minuut voor minuut.' },
    { id: 'p_oude_rot', src: 'P', fn: 'relatie', a: [2, 4], w: 2, prov: ['bond.mentor_advice'],
      text: 'Een ervaren oudgediende geeft je een bruikbare raad, half verpakt in een anekdote.' },
    { id: 'p_aantekeningen_herlezen', src: 'P', fn: 'spoor', a: [3, 4], w: 2, clue: { id: 'aantekeningen', points: 'culprit' },
      text: 'Bij het herlezen van je eigen aantekeningen springt een detail uit dat je eerder over het hoofd zag.' },
    // ---- Columbo-type (X): de dader is bekend, het bewijs ontbreekt ----
    { id: 'x_dader_bekend', src: 'X', fn: 'twist', a: [2, 2], needs: ['struct.bewijsjacht'], prov: ['culprit.known'], clue: { id: 'daderbekend', points: 'culprit' },
      text: 'Je weet nu vrij zeker wie het gedaan heeft; wat ontbreekt is bewijs.' },
    { id: 'x_kleine_misrekening', src: 'X', fn: 'spoor', a: [2, 3], w: 3, needs: ['struct.bewijsjacht'], clue: { id: 'misrekening', points: 'culprit' },
      text: 'De dader heeft één kleine misrekening gemaakt: een gewoonte, een gunst, een bijzaak.' },
    { id: 'x_gewillige_medewerking', src: 'X', fn: 'relatie', a: [2, 4], w: 3, needs: ['struct.bewijsjacht'], prov: ['bond.cooperative_culprit'],
      text: 'De dader werkt vriendelijk en bereidwillig mee en wordt daardoor steeds moeilijker te doorgronden.' },
    { id: 'x_alibi_houdt_stand', src: 'X', fn: 'keerpunt', a: [3, 3], w: 4, needs: ['struct.bewijsjacht'], prov: ['alibi.holds'],
      text: 'Het alibi van de dader houdt bij het eerste onderzoek stand; je moet de zaak anders aanpakken.' },
    // ---- Onmogelijke misdaad (L): Death in Paradise-type ----
    { id: 'l_onmogelijke_misdaad', src: 'L', fn: 'spoor', a: [1, 1], needs: ['struct.onmogelijk'], prov: ['puzzle.impossible'], clue: { id: 'onmogelijk', points: 'method' },
      text: 'De misdaad lijkt onmogelijk: de ruimte was afgesloten en iedereen had een alibi.' },
    { id: 'l_alibi_rij', src: 'L', fn: 'spoor', a: [2, 3], w: 3, likes: ['struct.onmogelijk'], clue: { id: 'alibirij', points: 'culprit' },
      text: `Alle alibi's blijken te kloppen, op één onhandig moment na dat niemand heeft opgemerkt.` },
    // ---- Maigret-type (G): milieu en geduld ----
    { id: 'g_milieu_opnemen', src: 'G', fn: 'spoor', a: [1, 3], w: 2, clue: { id: 'milieu', points: 'context' },
      text: 'Door een buurt of werkplaats lang te observeren leer je het ritme kennen; wat uit de pas loopt valt op.' },
    { id: 'g_geduldig_gesprek', src: 'G', fn: 'relatie', a: [2, 4], w: 2, prov: ['bond.patient_talk'],
      text: 'Een lang, rustig gesprek zonder vragen brengt meer los dan een verhoor.' },
    { id: 'g_begrip_dader', src: 'G', fn: 'relatie', a: [4, 4], w: 1, prov: ['bond.understanding'],
      text: 'Je begint te begrijpen waarom het gebeurde, en dat maakt de ontknoping zwaarder.' },
    // ---- Holmes-type (S): observatie en deductie ----
    { id: 's_kleine_waarneming', src: 'S', fn: 'spoor', a: [1, 3], w: 2, clue: { id: 'waarneming', points: 'culprit' },
      text: 'Uit schoenen, handen of kleding van iemand leid je een beroep of gewoonte af die diegene verzweeg.' },
    { id: 's_logische_dwaling', src: 'S', fn: 'rode_haring', a: [2, 3], w: 2, clue: { id: 'dwaling', points: 'red' },
      text: 'Je eerste logische conclusie klopt in elke stap en leidt toch naar het verkeerde antwoord.' },
    // ---- Noir (N): Chandler-type ----
    { id: 'n_opdrachtgever_liegt', src: 'N', fn: 'verdachte', a: [1, 2], w: 3, clue: { id: 'opdrachtgever', points: 'context' },
      text: 'Iemand die jou om hulp vroeg verzwijgt iets wezenlijks over zijn eigen rol.' },
    { id: 'n_instantie_werkt_tegen', src: 'N', fn: 'spoor', a: [2, 3], w: 2, needsAny: ['role.authority', 'struct.complot'], clue: { id: 'instantie', points: 'context' },
      text: 'Een instantie houdt stukken achter en stuurt je van het ene bureau naar het andere.' },
    { id: 'n_gevaarlijke_charme', src: 'N', fn: 'relatie', a: [2, 4], w: 2, prov: ['bond.charm'],
      text: 'Een charmante getuige lijkt aan jouw kant te staan; haar of zijn belangstelling heeft ook een eigen reden.' },
    // ---- Gemeenschapsdrama (Z): Broadchurch- en Noordse-noir-type ----
    { id: 'z_gemeenschap_rouwt', src: 'Z', fn: 'spoor', a: [1, 3], w: 2, clue: { id: 'rouw', points: 'context' },
      text: 'De gemeenschap rouwt en verdeelt zich; verdriet maakt getuigen onbetrouwbaar en soms onwillig.' },
    { id: 'z_oud_stuk', src: 'Z', fn: 'spoor', a: [2, 3], w: 2, likes: ['struct.cold'], clue: { id: 'oudstuk', points: 'motive' },
      text: 'Een vergeten archiefstuk van jaren terug raakt dezelfde mensen.' },
    { id: 'z_instelling_keek_weg', src: 'Z', fn: 'rode_haring', a: [2, 3], w: 1, clue: { id: 'verzuim', points: 'red' },
      text: 'Een instelling heeft jarenlang weggekeken; de schuld is groot, maar niet de schuld van deze zaak.' },
    // ---- Christie-type (C), aanvulling: de alledaagse parallel ----
    { id: 'c_parallel_buurt', src: 'C', fn: 'spoor', a: [2, 3], w: 2, clue: { id: 'parallel', points: 'culprit' },
      text: 'Een alledaags voorval uit de buurt, een mislukte oogst of een zoekgeraakte sleutel, lijkt opvallend op wat hier gebeurde.' },
    // ---- Ontknopingsvarianten (fn onthulling, akte 5) ----
    { id: 'c_ontknoping_gezelschap', src: 'C', fn: 'onthulling', a: [5, 5], w: 3, likes: ['struct.kring', 'style.gezelschap'], prov: ['accusation'],
      text: 'Je roept de betrokkenen bijeen en legt de keten schakel voor schakel voor; ieder reageert anders.' },
    { id: 'l_ontknoping_reconstructie', src: 'L', fn: 'onthulling', a: [5, 5], w: 5, needs: ['struct.onmogelijk'], prov: ['accusation'],
      text: 'Je reconstrueert ter plekke hoe het onmogelijke toch kon, stap voor stap.' },
    { id: 'x_ontknoping_vraag', src: 'X', fn: 'onthulling', a: [5, 5], w: 5, needs: ['struct.bewijsjacht'], prov: ['accusation'],
      text: 'Met één onschuldig ogende vraag zet je de dader vast: het bewijsstuk dat nog ontbrak is er nu.' },
    { id: 'v_ontknoping_vier_ogen', src: 'V', fn: 'onthulling', a: [5, 5], w: 3, needsAny: ['role.close'], prov: ['accusation'],
      text: 'In een stil gesprek onder vier ogen valt het masker; het blijft persoonlijk.' },
    { id: 'p_ontknoping_stukken', src: 'P', fn: 'onthulling', a: [5, 5], w: 3, likes: ['style.procedureel'], prov: ['accusation'],
      text: 'Je legt de stukken voor: tijdlijn, getuigen en administratie sluiten als een rits.' },
    // Akte 5
    { id: 'c_ontknoping', src: 'C', fn: 'onthulling', a: [5, 5], w: 2, prov: ['accusation'],
      text: 'Je legt de keten voor, schakel voor schakel, en de dader wordt benoemd: voor de aanklacht telt wat je kunt bewijzen.' },
    { id: 'v_epiloog_relaties', src: 'V', fn: 'relatie', a: [5, 5], mandatory: true, req: ['bond.formed'],
      text: 'Het slot toont wat er van de banden is geworden: wie bleef, wie vertrok en wie je misleidde.' }
  ],

  /* ----- haakjes aan het einde van een akte (Brown-type) ----- */
  hooks: [
    { id: 'h_nieuwe_vraag', src: 'B', fn: 'haakje', a: [1, 4], w: 3, text: 'Het akteslot laat een nieuwe, onbeantwoorde vraag achter.' },
    { id: 'h_deur_dicht', src: 'B', fn: 'haakje', a: [1, 4], w: 2, text: 'Een kans glipt weg: een deur gaat dicht, een getuige vertrekt.' },
    { id: 'h_bezoeker', src: 'B', fn: 'haakje', a: [1, 4], w: 2, text: 'Een onverwachte bezoeker meldt zich met een verzoek.' },
    { id: 'h_klok', src: 'B', fn: 'haakje', a: [2, 4], w: 3, needsAny: ['clock.deadline', 'clock.seizoen', 'clock.vergankelijk'], text: 'De klok tikt: er is minder tijd dan gedacht.' },
    { id: 'h_belofte', src: 'B', fn: 'haakje', a: [2, 4], w: 2, req: ['bond.formed'], text: 'Iemand die dicht bij je staat doet je een belofte.' },
    { id: 'x_hook_nog_een_ding', src: 'X', fn: 'haakje', a: [2, 4], w: 4, needs: ['struct.bewijsjacht'], text: 'Nog een laatste vraag voordat je gaat; de ander beantwoordt hem opvallend vlot.' },
    { id: 'n_hook_waarschuwing', src: 'N', fn: 'haakje', a: [2, 4], w: 2, text: 'Iemand waarschuwt je met vriendelijke woorden om te stoppen met zoeken.' },
    { id: 'm_hook_dorpsnieuws', src: 'M', needs: ['style.dorp'], fn: 'haakje', a: [1, 4], w: 2, text: 'Het dorp praat nergens anders meer over dan het nieuws dat je net hoorde.' }
  ]
};
const ROLE_GAME = { helper: 'naaste', familie: 'naaste', mentor: 'naaste', autoriteit: 'machthebber', ooggetuige: 'bijfiguur', buur: 'bijfiguur', aangever: 'bijfiguur', slachtoffer: 'bijfiguur' };
Lib.roles.forEach((r) => { r.gameCulprit = ROLE_GAME[r.id]; });
// Spelregel: dader is een naaste <=> hiddenManipulation. Dus krijgt een naaste altijd de manipulatie-twist.
Lib.twists.forEach((t) => { if (t.id !== 'manipulatie') t.bans = (t.bans || []).concat('role.close'); });
Lib.get = (table, id) => Lib[table].find((e) => e.id === id);
Lib.tech = (id) => Lib.techniques.find((t) => t.id === id) || Lib.hooks.find((t) => t.id === id);

/* ---------------- Compat: tags, vereisten en verboden ---------------- */
const Compat = {
  ok(e, ctx) {
    if ((e.needs || []).some((t) => !ctx.tags.has(t))) return false;
    if (e.needsAny && e.needsAny.length && !e.needsAny.some((t) => ctx.tags.has(t))) return false;
    if ((e.bans || []).some((t) => ctx.tags.has(t))) return false;
    if ((e.tags || []).some((t) => ctx.bans.has(t))) return false;
    return true;
  },
  add(ctx, e) { (e.tags || []).forEach((t) => ctx.tags.add(t)); (e.bans || []).forEach((t) => ctx.bans.add(t)); },
  boost(e, ctx) { return (e.likes || []).some((t) => ctx.tags.has(t)) ? 3 : 1; }
};

/* ---------------- DNA: een compatibele set keuzes per seed ---------------- */
const DNA = {
  make(seed, force) {
    force = force || {}; let last = '';
    for (let k = 0; k < 60; k++) {
      const rng = RNG.make(seed + '|dna|' + k), ctx = { tags: new Set(), bans: new Set() }, ids = {}; let ok = true;
      for (const table of TABLE_ORDER) {
        let cands = Lib[table].filter((e) => Compat.ok(e, ctx));
        if (force[table]) cands = cands.filter((e) => e.id === force[table]);
        if (!cands.length) { ok = false; last = TABLE_LABEL[table]; break; }
        const e = rng.weighted(cands, (c) => (c.w || 1) * Compat.boost(c, ctx));
        ids[table] = e.id; Compat.add(ctx, e);
      }
      if (!ok) continue;
      const st = Lib.get('styles', ids.styles);
      return { ids: ids, tone: rng.pick(st.tones || Lib.tones), tempo: rng.pick(st.tempos || Lib.tempos), tags: Array.from(ctx.tags).sort(), attempt: k };
    }
    throw new Error('Geen compatibele DNA (vastgelopen bij: ' + last + ') voor seed "' + seed + '"' + (Object.keys(force).some((k) => force[k]) ? ' met gedwongen keuzes' : ''));
  }
};

/* ---------------- PlotEngine ---------------- */
const EXTRA_FNS = ['spoor', 'verdachte', 'rode_haring', 'relatie'];
const PlotEngine = {
  actDefs(h) {
    const long = h >= 20;
    return [
      { n: 1, id: 'act1', goal: 'Aanleiding: de misdaad raakt je persoonlijk', emotion: 'onrust', fns: ['aanleiding', 'spoor', 'verdachte'], extra: long ? 1 : 0 },
      { n: 2, id: 'act2', goal: 'Verdieping: de kring en zijn geheimen', emotion: 'nieuwsgierigheid en hechting', fns: long ? ['verdachte', 'rode_haring', 'rode_haring', 'spoor', 'spoor', 'relatie'] : ['verdachte', 'rode_haring', 'spoor', 'relatie'], extra: long ? 2 : 1 },
      { n: 3, id: 'act3', goal: 'Nepoplossing: een verdachte lijkt de dader', emotion: 'twijfel', fns: long ? ['keerpunt', 'rode_haring', 'spoor', 'spoor'] : ['keerpunt', 'rode_haring', 'spoor'], extra: long ? 2 : 1 },
      { n: 4, id: 'act4', goal: 'Keerpunt: het vertrouwen komt op de proef', emotion: 'schok', fns: long ? ['keerpunt', 'relatie', 'spoor'] : ['keerpunt', 'relatie'], extra: long ? 1 : 0 },
      { n: 5, id: 'act5', goal: 'Ontknoping: de keten sluit', emotion: 'verdriet en opluchting', fns: ['onthulling', 'relatie'], extra: 0 }
    ];
  },
  labels(dna) {
    const g = (t) => Lib.get(t, dna.ids[t]), tags = new Set(dna.tags), role = g('roles'), crime = g('crimes'), clock = g('clocks');
    return { dader: role.nl, vertrouweling: tags.has('twist.manipulatie') ? role.nl : 'een trouwe bondgenoot', zondebok: 'een onschuldige uit de kring',
      slachtoffer: crime.victim, mentor: tags.has('role.mentor') ? role.nl : 'een raadgever', getuige: 'een getuige', klok: clock.text || '' };
  },
  fill(text, labels) { const s = text.replace(/\{(\w+)\}/g, (m, k) => (labels[k] !== undefined ? labels[k] : m)); return s.charAt(0).toUpperCase() + s.slice(1); },

  build(dna, rng, runHours) {
    const ctx = { tags: new Set(dna.tags), bans: new Set() }, labels = this.labels(dna);
    const style = Lib.get('styles', dna.ids.styles), sb = (x) => (style.srcBoost && style.srcBoost[x]) || 1;
    const acts = this.actDefs(runHours).map((a) => Object.assign({}, a, { beats: [], unfilled: [] }));
    const used = new Set(), provided = new Set(), planted = new Set(), pre = [];
    const reqOk = (t) => (t.req || []).every((r) => provided.has(r)) && (t.pays || []).every((p) => planted.has(p));
    const place = (act, t) => {
      used.add(t.id); (t.prov || []).forEach((p) => provided.add(p));
      if (t.clue) { planted.add(t.clue.id); provided.add('clue:' + t.clue.id); }
      act.beats.push({ id: t.id, src: t.src, fn: t.fn, nl: t.nl || '', text: this.fill(t.text, labels), clue: t.clue ? { id: t.clue.id, points: t.clue.points } : null, pays: (t.pays || []).slice(), prov: (t.prov || []).slice() });
    };
    const pickTech = (filter, n) => {
      const c = Lib.techniques.filter((t) => !used.has(t.id) && n >= t.a[0] && n <= t.a[1] && filter(t) && Compat.ok(t, ctx) && reqOk(t));
      return c.length ? rng.weighted(c, (t) => (t.w || 1) * Compat.boost(t, ctx) * sb(t.src)) : null;
    };
    const rndAkte = (a) => a[0] + rng.int(a[1] - a[0] + 1);

    // geplande beats: verplichte technieken, DNA-verplichtingen en DNA-sporen
    const sched = [];
    Lib.techniques.filter((t) => t.mandatory).forEach((t) => sched.push({ t: t, n: rndAkte(t.a) }));
    TABLE_ORDER.forEach((table) => {
      const e = Lib.get(table, dna.ids[table]);
      (e.must || []).forEach((id) => { const t = Lib.tech(id); if (!t) { pre.push('Onbekende techniek in must: ' + id); return; } if (!sched.some((s) => s.t.id === id)) sched.push({ t: t, n: rndAkte(t.a) }); });
      if (e.clue) sched.push({ t: { id: 'dna:' + table + ':' + e.id, src: 'DNA', fn: 'spoor', nl: DNA_CLUE_LABEL[table], text: e.clue.text, clue: { id: e.clue.id, points: e.clue.points }, a: e.clue.a }, n: rndAkte(e.clue.a) });
    });

    for (const act of acts) {
      let pending = sched.filter((s) => s.n === act.n && !used.has(s.t.id)), progress = true;
      while (pending.length && progress) {
        progress = false;
        pending = pending.filter((s) => {
          if (!reqOk(s.t)) return true;
          if (!Compat.ok(s.t, ctx)) { pre.push('Verplichte techniek niet compatibel met DNA: ' + s.t.id); return false; }
          place(act, s.t); progress = true; return false;
        });
      }
      pending.forEach((s) => pre.push('Verplichte techniek ' + s.t.id + ' mist vereisten in akte ' + act.n));

      const need = {}; act.fns.forEach((f) => { need[f] = (need[f] || 0) + 1; });
      Object.keys(need).forEach((fn) => {
        let have = act.beats.filter((b) => b.fn === fn).length;
        for (; have < need[fn]; have++) { const t = pickTech((x) => x.fn === fn, act.n); if (!t) { act.unfilled.push(fn); break; } place(act, t); }
      });
      for (let i = 0; i < act.extra; i++) { const t = pickTech((x) => EXTRA_FNS.indexOf(x.fn) >= 0, act.n); if (!t) break; place(act, t); }
      if (act.n <= 4) {
        const c = Lib.hooks.filter((h) => !used.has(h.id) && act.n >= h.a[0] && act.n <= h.a[1] && Compat.ok(h, ctx) && reqOk(h));
        if (c.length) place(act, rng.weighted(c, (h) => (h.w || 1) * Compat.boost(h, ctx) * sb(h.src))); else act.unfilled.push('haakje');
      }
    }
    return { acts: acts, pre: pre };
  },

  validate(acts, dna, runHours, pre) {
    const errors = pre.slice(), warnings = [], flat = [];
    acts.forEach((a) => a.beats.forEach((b) => flat.push({ b: b, n: a.n })));
    if (!acts[0].beats.some((b) => b.fn === 'aanleiding')) errors.push('Geen aanleiding in akte 1');
    if (!acts[4].beats.some((b) => b.fn === 'onthulling')) errors.push('Geen ontknoping in akte 5');
    acts.forEach((a) => a.unfilled.forEach((f) => errors.push('Akte ' + a.n + ': geen kandidaat voor "' + f + '"')));
    const seen = new Set();
    flat.forEach((x) => { (x.b.pays || []).forEach((p) => { if (!seen.has(p)) errors.push('Fair play: ' + x.b.id + ' betaalt "' + p + '" uit zonder eerdere aanwijzing'); }); if (x.b.clue) seen.add(x.b.clue.id); });
    const early = flat.filter((x) => x.n <= 4 && x.b.clue);
    const culprit = early.filter((x) => x.b.clue.points === 'culprit').length, mm = early.filter((x) => x.b.clue.points === 'motive' || x.b.clue.points === 'method').length;
    if (culprit < 2) errors.push('Fair play: slechts ' + culprit + ' aanwijzing(en) naar de dader in akte 1-4 (minimaal 2)');
    if (mm < 1) errors.push('Fair play: geen aanwijzing naar motief of methode in akte 1-4');
    const reds = flat.filter((x) => x.b.clue && x.b.clue.points === 'red').length, minRed = runHours >= 20 ? 3 : 2;
    if (reds < minRed) errors.push('Te weinig rode haringen: ' + reds + ' (minimaal ' + minRed + ')');
    for (let n = 1; n <= 4; n++) if (!acts[n - 1].beats.some((b) => b.fn === 'haakje')) errors.push('Akte ' + n + ' heeft geen haakje');
    if (!flat.some((x) => x.b.prov.indexOf('false_solution') >= 0)) warnings.push('Geen nepoplossing in dit plot');
    if (new Set(flat.map((x) => x.b.src)).size < 4) warnings.push('Weinig variatie in techniekbronnen (' + Array.from(new Set(flat.map((x) => x.b.src))).join(',') + ')');
    if (dna.tags.indexOf('twist.manipulatie') >= 0 && !flat.some((x) => x.b.prov.indexOf('relation.flip') >= 0 || x.b.prov.indexOf('ally.betrays') >= 0)) warnings.push('Manipulatie-twist zonder omslag in de relatie');
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  },

  generate(seed, opts) {
    opts = opts || {}; const runHours = opts.runHours || 8, dna = DNA.make(seed, opts.force); let best = null;
    for (let k = 0; k < 30; k++) {
      const rng = RNG.make(seed + '|plot|' + k), built = this.build(dna, rng, runHours), v = this.validate(built.acts, dna, runHours, built.pre);
      const plot = { lib: LIB_VERSION, seed: seed, runHours: runHours, attempt: k + 1, dna: dna, roles: this.labels(dna), acts: built.acts.map((a) => ({ n: a.n, id: a.id, goal: a.goal, emotion: a.emotion, beats: a.beats })), validation: v };
      plot.signature = RNG.hashStr(plot.acts.map((a) => a.beats.map((b) => b.id).join(',')).join('|') + JSON.stringify(dna.ids));
      if (!best || v.errors.length < best.validation.errors.length) best = plot;
      if (v.ok) return plot;
    }
    best.failed = true; return best;
  },

  // Optioneel veld bible.plot en voorzet voor meta/crime/truth/acts. Naamgeving en bewijs volgen in latere engines.
  toBibleSkeleton(plot) {
    const g = (t) => Lib.get(t, plot.dna.ids[t]), era = g('eras'), tags = plot.dna.tags;
    return {
      meta: { seed: plot.seed, era: era.nl, eraRules: { allowedTech: era.rules.allowed.slice(), bannedTech: era.rules.banned.slice(), currency: era.rules.currency, clothing: era.rules.clothing, languageStyle: era.rules.languageStyle }, tone: plot.dna.tone },
      crime: { type: g('crimes').nl },
      genMapping: { eraId: GAME_ERAS.indexOf(era.id) >= 0 ? era.id : null, crimeId: g('crimes').id, culpritId: g('roles').gameCulprit, styleId: g('styles').id },
      truth: { culprit: { role: g('roles').nl, closeToProtagonist: tags.indexOf('role.close') >= 0 }, motive: g('motives').nl, method: g('methods').nl, hiddenManipulation: { present: tags.indexOf('role.close') >= 0 } },
      acts: plot.acts.map((a) => ({ id: a.id, goal: a.goal, emotionalBeat: a.emotion, requiredEvidence: a.beats.filter((b) => b.clue).map((b) => b.clue.id), summary: '' })),
      plot: { version: 1, lib: plot.lib, dna: Object.assign({}, plot.dna.ids, { tone: plot.dna.tone, tempo: plot.dna.tempo }), signature: plot.signature, beats: plot.acts.map((a) => a.beats.map((b) => ({ id: b.id, fn: b.fn, clue: b.clue ? b.clue.id : null }))) }
    };
  }
};

/* ---------------- Batch: statistiek en dekking ---------------- */
const Batch = {
  run(n, runHours, prefix) {
    prefix = prefix || 'batch';
    const r = { n: n, runHours: runHours, valid: 0, failed: [], attempts: 0, warnings: 0, sigs: new Set(), dist: {}, tech: {}, src: {}, errorKinds: {} };
    TABLE_ORDER.forEach((t) => { r.dist[t] = {}; });
    for (let i = 0; i < n; i++) {
      const seed = prefix + '-' + i, p = PlotEngine.generate(seed, { runHours: runHours });
      if (p.validation.ok) r.valid++; else { r.failed.push({ seed: seed, errors: p.validation.errors }); p.validation.errors.forEach((e) => { const k = e.replace(/[0-9]+/g, '#').slice(0, 70); r.errorKinds[k] = (r.errorKinds[k] || 0) + 1; }); }
      r.attempts += p.attempt; r.warnings += p.validation.warnings.length; r.sigs.add(p.signature);
      TABLE_ORDER.forEach((t) => { const id = p.dna.ids[t]; r.dist[t][id] = (r.dist[t][id] || 0) + 1; });
      p.acts.forEach((a) => a.beats.forEach((b) => { r.tech[b.id] = (r.tech[b.id] || 0) + 1; r.src[b.src] = (r.src[b.src] || 0) + 1; }));
    }
    return r;
  },
  coverage(r) {
    const never = { dna: [], tech: [] };
    TABLE_ORDER.forEach((t) => Lib[t].forEach((e) => { if (!r.dist[t][e.id]) never.dna.push(t + ':' + e.id); }));
    Lib.techniques.concat(Lib.hooks).forEach((t) => { if (!r.tech[t.id]) never.tech.push(t.id); });
    return never;
  }
};

/* =====================================================================
   v0.3.0: protagonist, wereld, cast en waarheid-light (alles lokaal, 0 Gemini-calls)
   Uitvoer heeft de vorm van de bijbel (sectie 4) en slaagt in dezelfde regels als
   Validate.truth/world/cast van het spel (hier gespiegeld in GameRules).
   ===================================================================== */
const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const SCALE = { 8: { cities: 4, locs: [6, 8], cast: [12, 15], acts: 4, evidence: [14, 18], items: [6, 8], maxDay: 21 }, 20: { cities: 6, locs: [7, 10], cast: [16, 20], acts: 5, evidence: [26, 32], items: [9, 12], maxDay: 45 } };
// [beroepen- en plaatsnamengroep, voornamengroep]
const GROUPS = { middeleeuwen: ['oud', 'oud'], e1895: ['klassiek', 'klassiek'], e1925: ['klassiek', 'klassiek'], e1955: ['klassiek', 'klassiek'], e1978: ['modern', 'modern'], e1994: ['modern', 'modern'], toekomst: ['toekomst', 'modern'] };
const ERA_EXTRA = {
  middeleeuwen: { currency: 'penningen', clothing: 'wollen kleding, mantels en kappen', languageStyle: 'plechtig en formeel, met oudere uitdrukkingen' },
  e1895: { currency: 'gulden', clothing: 'lange jassen, hoeden en schorten', languageStyle: 'beleefd en verzorgd, met ouderwetse beleefdheidsvormen' },
  e1925: { currency: 'gulden', clothing: 'pakken, hoeden en jurken met rechte lijnen', languageStyle: 'beleefd en verzorgd' },
  e1955: { currency: 'gulden', clothing: 'nette pakken, jurken en werkschorten', languageStyle: 'netjes en terughoudend' },
  e1978: { currency: 'gulden', clothing: 'wijde pijpen, truien en jassen', languageStyle: 'alledaags en direct' },
  e1994: { currency: 'gulden', clothing: 'spijkerbroeken, jacks en pakken', languageStyle: 'alledaags en direct' },
  toekomst: { currency: 'kredieten', clothing: 'praktische, functionele kleding van slimme stoffen', languageStyle: 'beknopt en zakelijk' }
};
Lib.eras.forEach((e) => Object.assign(e.rules, ERA_EXTRA[e.id]));

const Kit = {
  flavors: {
    nl: { nl: 'Hollands', cities: ['Zwartdam', 'Oosterveen', 'Hoogwijk', 'Groenburg', 'Westhoek', 'Diepenkerk', 'Nieuwbroek', 'Witdam'],
      sur: ['Bakker', 'Smit', 'van Dijk', 'Mulder', 'Visser', 'Brouwer', 'de Wit', 'Kuiper', 'Dekker', 'Hofman', 'Jansen', 'de Vries', 'van den Berg', 'Koster', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dijkman', 'Meijer', 'de Boer', 'Verhoeven', 'de Graaf', 'Kramer', 'van der Linden', 'Timmermans', 'Jacobs', 'Schouten', 'Prins', 'Molenaar'],
      m: { oud: ['Jan', 'Willem', 'Dirk', 'Gijsbrecht', 'Wouter', 'Floris'], klassiek: ['Cornelis', 'Hendrik', 'Gerrit', 'Anton', 'Marinus', 'Adriaan'], modern: ['Jeroen', 'Martijn', 'Sander', 'Bas', 'Ruud', 'Thijs'] },
      f: { oud: ['Aleid', 'Griet', 'Machteld', 'Geertruid', 'Lijsbeth', 'Heilwig'], klassiek: ['Johanna', 'Geertruida', 'Wilhelmina', 'Cornelia', 'Jacoba', 'Hendrika'], modern: ['Marloes', 'Esther', 'Ingrid', 'Karin', 'Sanne', 'Linda'] } },
    vl: { nl: 'Vlaams', cities: ['Sint-Odilia', 'Terhagen', 'Oudenhove', 'Zandhoven', 'Langehaven', 'Brugwijk', 'Kortrade', 'Nieuwenmeer'],
      sur: ['Peeters', 'Janssens', 'Maes', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Mertens', 'Vermeulen', 'Hermans', 'Lemmens', 'Aerts', 'Michiels', 'Van Damme', 'Pauwels', 'Verstraete', 'Verhaegen', 'Martens', 'Dewulf', 'Coppens', 'Lambrechts', 'Verbeke', 'Van de Velde', 'Segers', 'Stevens', 'Wuyts', 'Bogaert', 'Smets', 'Laenen'],
      m: { oud: ['Pieter', 'Gillis', 'Joris', 'Lodewijk', 'Boudewijn', 'Arnoud'], klassiek: ['Jozef', 'Alfons', 'Maurits', 'Emiel', 'Gustaaf', 'Remi'], modern: ['Bart', 'Stijn', 'Wim', 'Dries', 'Koen', 'Tom'] },
      f: { oud: ['Katelijne', 'Margriet', 'Mayken', 'Elisabeth', 'Beatrijs', 'Soetkin'], klassiek: ['Marie', 'Elisa', 'Irma', 'Germaine', 'Leontine', 'Stephanie'], modern: ['Griet', 'Inge', 'Els', 'Veerle', 'Katrien', 'Hilde'] } },
    fy: { nl: 'Fries', cities: ['Wierdijk', 'Oosterwier', 'Hylpen', 'Skarwier', 'Bolwerk', 'Terpenstad', 'Zijlhoek', 'Marnewier'],
      sur: ['Hoekstra', 'Bouma', 'van der Meulen', 'Zijlstra', 'Wiersma', 'Postma', 'Dijkstra', 'Terpstra', 'Veenstra', 'Tjalsma', 'de Jong', 'Sikkema', 'Bosma', 'Kingma', 'Hiemstra', 'Hofstra', 'Jongsma', 'Wijbenga', 'Feenstra', 'Faber', 'Rinsma', 'Tolsma', 'Haitsma', 'Boersma', 'Kooistra', 'Tuinstra', 'Sijbesma', 'Annema', 'Nauta', 'Heeringa'],
      m: { oud: ['Sjoerd', 'Hessel', 'Wybren', 'Tjerk', 'Okke', 'Jelle'], klassiek: ['Tjeerd', 'Anne', 'Klaas', 'Sipke', 'Hielke', 'Durk'], modern: ['Douwe', 'Jelmer', 'Sybren', 'Auke', 'Gerben', 'Wietse'] },
      f: { oud: ['Sjoukje', 'Tetje', 'Wiebke', 'Fenna', 'Aukje', 'Ymkje'], klassiek: ['Trijntje', 'Antje', 'Grietje', 'Sijtske', 'Jantje', 'Tjitske'], modern: ['Rixt', 'Nynke', 'Janke', 'Marije', 'Hylkje', 'Tryntsje'] } },
    de: { nl: 'Duitstalig', cities: ['Eichenau', 'Brunnenfeld', 'Rotenau', 'Lindenhof', 'Steinbach', 'Hohenmark', 'Waldrode', 'Kaltenfeld'],
      sur: ['Schneider', 'Becker', 'Hoffmann', 'Weber', 'Fischer', 'Wagner', 'Keller', 'Schulz', 'Richter', 'Brandt', 'Meyer', 'Schmitz', 'Koch', 'Bauer', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Köhler', 'Herrmann', 'Walter', 'König'],
      m: { oud: ['Heinrich', 'Konrad', 'Albrecht', 'Ulrich', 'Gerhard', 'Walther'], klassiek: ['Friedrich', 'Wilhelm', 'Karl', 'Otto', 'Ernst', 'Hermann'], modern: ['Jurgen', 'Lukas', 'Stefan', 'Matthias', 'Dieter', 'Jens'] },
      f: { oud: ['Adelheid', 'Kunigunde', 'Gertrud', 'Mechthild', 'Irmgard', 'Hedwig'], klassiek: ['Emma', 'Clara', 'Martha', 'Elsa', 'Frieda', 'Berta'], modern: ['Anke', 'Petra', 'Birgit', 'Katja', 'Sabine', 'Ines'] } },
    fr: { nl: 'Franstalig', cities: ['Saint-Aubin', 'Beaumarais', 'Villeneuve', 'Roquefontaine', 'Montclair', 'Valcourt', 'Fontenelle', 'Maisoncelle'],
      sur: ['Dubois', 'Lambert', 'Moreau', 'Fontaine', 'Mercier', 'Girard', 'Rousseau', 'Lefevre', 'Garnier', 'Chevalier', 'Bernard', 'Leroy', 'Roux', 'Fournier', 'Bonnet', 'Faure', 'Blanc', 'Guérin', 'Lemoine', 'Perrin', 'Morel', 'Clément', 'Gauthier', 'Picard', 'Renard', 'Marchand', 'Dumont', 'Lacroix', 'Bertrand', 'Duval'],
      m: { oud: ['Gilles', 'Hugues', 'Thibaut', 'Renaud', 'Guy', 'Aymeric'], klassiek: ['Auguste', 'Lucien', 'Henri', 'Marcel', 'Armand', 'Gaston'], modern: ['Julien', 'Mathieu', 'Hugo', 'Olivier', 'Thierry', 'Etienne'] },
      f: { oud: ['Isabeau', 'Mahaut', 'Alienor', 'Jehanne', 'Ermengarde', 'Blanche'], klassiek: ['Jeanne', 'Marguerite', 'Louise', 'Eugenie', 'Solange', 'Odette'], modern: ['Camille', 'Nathalie', 'Sylvie', 'Claire', 'Margaux', 'Odile'] } }
  },
  regions: ['De Waterlanden', 'Het Hoogland', 'De Zoutkust', 'Het Binnenland', 'De Rivierstreek', 'De Heidegronden', 'Het Veenland', 'De Grensmarken'],
  regionDesc: ['Een streek met eigen gebruiken en een eigen dialect.', 'Een streek waar het weer en het water het leven bepalen.', 'Een streek met oude families en lange herinneringen.'],
  archetypes: [
    { id: 'havenstad', nl: 'havenstad', culture: 'Een open havenstad waar vreemden snel welkom zijn en snel vergeten worden.', req: ['haven', 'markt', 'herberg', 'huis', 'kantoor'], extra: { werkplaats: 3, plein: 2, poort: 1, archief: 1, park: 1 },
      customs: ['Bij elk schip dat binnenloopt luidt een bel.', 'Aan het begin van de maand worden schulden aan de kade vereffend.', 'Vreemdelingen worden bij aankomst ingeschreven.'], economy: ['Handel in graan, hout en stoffen', 'Visserij en scheepsherstel'], factions: ['de schippers', 'de kooplieden', 'het havenbestuur'] },
    { id: 'handelsstad', nl: 'handelsstad', culture: 'Een drukke handelsstad waar alles een prijs heeft en afspraken heilig zijn.', req: ['markt', 'kantoor', 'herberg', 'huis', 'archief'], extra: { plein: 3, werkplaats: 2, poort: 2, park: 1 },
      customs: ['Een handdruk op de markt geldt als contract.', 'Op marktdag sluiten alle deuren om twaalf uur voor de maaltijd.', 'Nieuwe handelaren moeten zich eerst voorstellen aan het bestuur.'], economy: ['Handel in wol, zout en wijn', 'Geldwissel en kredietverlening'], factions: ['de kooplieden', 'het stadsbestuur', 'de wisselaars'] },
    { id: 'rivierstad', nl: 'rivierstad', culture: 'Een stad aan de rivier, trots op haar bruggen en wars van haast.', req: ['haven', 'markt', 'huis', 'herberg'], extra: { werkplaats: 3, park: 2, plein: 2, kantoor: 1, archief: 1 },
      customs: ['Bij hoogwater gaat iedereen helpen zonder te vragen waarom.', 'De brug wordt elke avond op hetzelfde uur geopend voor het verkeer over water.', 'Elk jaar wordt de oudste schipper geëerd met een maaltijd.'], economy: ['Rivierhandel en veerdiensten', 'Steenbakkerijen en landbouw'], factions: ['de veerlieden', 'de landbouwers', 'het stadsbestuur'] },
    { id: 'marktplaats', nl: 'marktplaats', culture: 'Een middelgrote marktplaats waar iedereen elkaar kent en niemand iets vergeet.', req: ['plein', 'herberg', 'huis', 'markt'], extra: { werkplaats: 3, kantoor: 1, park: 2, archief: 1 },
      customs: ['Op zaterdag houdt iedereen de lamp voor de deur aan.', 'Nieuwkomers krijgen een brood van de bakker.', 'Geschillen worden eerst bij de waard besproken.'], economy: ['Landbouw en ambacht', 'Veemarkt en kleinhandel'], factions: ['de ambachtslieden', 'de landbouwers', 'de kerkgemeente'], small: true },
    { id: 'kuststadje', nl: 'kuststadje', culture: 'Een winderig kuststadje dat leeft van de zee en van wat de zee aanspoelt.', req: ['haven', 'herberg', 'huis', 'plein'], extra: { markt: 2, werkplaats: 2, park: 1 },
      customs: ['Na een storm blijft de haven een dag gesloten.', 'Vissers zingen bij het uitvaren, ook als niemand het hoort.', 'Wie in zee verdwijnt, krijgt een naam op de kademuur.'], economy: ['Visserij en zouthandel', 'Reparatie van netten en schepen'], factions: ['de vissers', 'de kustwacht', 'de herbergiers'], small: true },
    { id: 'dorp', nl: 'dorp', culture: 'Een hecht dorp waar de families al eeuwen dezelfde plekken bewonen.', req: ['plein', 'herberg', 'huis'], extra: { werkplaats: 3, markt: 2, park: 2, kantoor: 1 },
      customs: ['Elk jaar is er een feest waar het hele dorp bij moet zijn.', 'De oudste inwoner opent de dorpsvergadering.', 'Over familiekwesties wordt alleen binnenshuis gesproken.'], economy: ['Landbouw en veeteelt', 'Ambacht en kleine handel'], factions: ['de oudste families', 'de kerkgemeente', 'de landbouwers'], small: true },
    { id: 'geleerdenstad', nl: 'stad van geleerden', culture: 'Een rustige stad vol schrijvers, bibliotheken en strenge regels voor stilte.', req: ['archief', 'kantoor', 'plein', 'huis', 'herberg'], extra: { park: 3, markt: 1, werkplaats: 1 },
      customs: ['Na het luiden van de klok wordt er niet meer hardop gesproken op de trappen.', 'Elk nieuw boek krijgt een plechtige inschrijving.', 'Geschillen worden op schrift beslecht.'], economy: ['Onderwijs en kopieerwerk', 'Papier, inkt en boekbinden'], factions: ['de geleerden', 'het stadsbestuur', 'de boekbinders'] },
    { id: 'grensstad', nl: 'grensstad', culture: 'Een wantrouwige grensstad waar iedereen papieren bij zich heeft en niemand vragen stelt.', req: ['poort', 'markt', 'herberg', 'huis', 'kantoor'], extra: { plein: 2, werkplaats: 2, archief: 1 },
      customs: ['Bij zonsondergang gaat de poort dicht, voor iedereen.', 'Reizigers melden zich binnen een dag bij het kantoor.', 'Smokkelverhalen worden verteld maar nooit geloofd.'], economy: ['Doorvoerhandel en tolgelden', 'Herbergen en paardenhandel'], factions: ['de tolbeambten', 'de herbergiers', 'het stadsbestuur'] },
    { id: 'industriestad', nl: 'werkstad', culture: 'Een werkstad waar het ritme van de werkplaatsen het leven bepaalt.', eras: ['klassiek', 'modern', 'toekomst'], req: ['werkplaats', 'kantoor', 'herberg', 'huis', 'markt'], extra: { plein: 2, haven: 1, archief: 1, park: 1 },
      customs: ['Bij de ploegenwissel stroomt de straat vol.', 'Het eerste loon van de maand wordt in de herberg gevierd.', 'Wie ziek is, wordt door buren geholpen.'], economy: ['Machinebouw en reparatie', 'Verwerking van grondstoffen'], factions: ['de werklieden', 'de eigenaren', 'het stadsbestuur'] }
  ],
  tplDesc: { herberg: 'Een plek waar reizigers en buurtbewoners samenkomen.', markt: 'Een drukke plek waar waren worden verhandeld.', plein: 'Een open plek waar het stadsleven samenkomt.', huis: 'Een woonhuis met een eigen sfeer.',
    kantoor: 'Een plek waar zaken worden geregeld en papieren bewaard.', haven: 'Een plek aan het water waar schepen laden en lossen.', poort: 'Een doorgang waar iedereen langs moet.', werkplaats: 'Een werkplaats vol gereedschap en de geur van het ambacht.',
    archief: 'Een stille plek met registers en oude stukken.', park: 'Een rustige groene plek buiten de drukte.' },
  details: ['De vloer kraakt bij elke stap.', 'Er hangt een geur van hout en rook.', 'Het licht valt schuin door een hoog raam.', 'Een bel aan de deur kondigt elke bezoeker aan.', 'Het is er stiller dan je verwacht.', 'Aan de muur hangt een vergeeld bord met regels.',
    'Een oude hond ligt bij de ingang.', 'Er staat een lange tafel vol krassen.', 'Iedereen lijkt elkaar hier te kennen.', 'De deur staat vaak half open.', 'Het ruikt er naar natte wol en oud hout.', 'Er brandt altijd een lamp, ook overdag.'],
  locNames: {
    oud: { herberg: ['Herberg De Gouden Leeuw', 'Het Zwarte Paard', 'De Drie Kronen', 'Herberg {s}', 'De Vergulde Kan', 'Het Anker'], markt: ['De Korenmarkt', 'De Vismarkt', 'De Lakenhal', 'De Beestenmarkt', 'De Overdekte Markt', 'De Hallen'],
      plein: ['Het Marktplein', 'Het Kerkplein', 'De Dam', 'Het Raadhuisplein', 'De Brink', 'Het Stadsplein'], huis: ['Huis {s}', 'Huize {s}', 'Woning {s}', 'Het stenen huis', 'Het grachtenhuis', 'Het huis aan de Kade'],
      kantoor: ['Het Stadhuis', 'Het Tolhuis', 'De Schrijfkamer', 'Het Waaggebouw', 'Kantoor {s}', 'De Schepenkamer'], haven: ['De Kade', 'Het Havenhoofd', 'De Visserskade', 'De Waag', 'De Houtkade', 'De Scheepswerf'],
      poort: ['De Waterpoort', 'De Noorderpoort', 'De Tolpoort', 'De Oostpoort', 'De Zuiderpoort', 'De Westpoort'], werkplaats: ['Smederij {s}', 'De Wagenmakerij', 'Timmerwerkplaats {s}', 'De Leerlooierij', 'De Weverij', 'Bakkerij {s}'],
      archief: ['Het Stadsarchief', 'De Kloosterbibliotheek', 'De Schrijfzaal', 'Het Kerkarchief', 'De Registerkamer', 'De Kronieken'], park: ['De Stadstuin', 'Het Bos', 'De Wal', 'De Kloostertuin', 'De Singel', 'Het Weiland'] },
    klassiek: { herberg: ['Café De Hoek', 'Hotel Centraal', 'Herberg De Zwaan', 'Café {s}', 'Logement De Kroon', 'Hotel De Ster'], markt: ['De Weekmarkt', 'De Overdekte Markt', 'De Vismarkt', 'De Winkelstraat', 'Kruidenier {s}', 'De Markthal'],
      plein: ['Het Marktplein', 'Het Kerkplein', 'De Dam', 'Het Stationsplein', 'De Brink', 'Het Raadhuisplein'], huis: ['Huis {s}', 'Huize {s}', 'Woning {s}', 'Het stenen huis', 'Het hoekhuis', 'Het huis aan de Kade'],
      kantoor: ['Het Stadhuis', 'Notariskantoor {s}', 'Het Postkantoor', 'Kantoor {s}', 'Het Belastingkantoor', 'Het Handelshuis'], haven: ['De Kade', 'Het Havenhoofd', 'De Visserskade', 'De Pakhuizen', 'De Scheepswerf', 'Het Veer'],
      poort: ['De Waterpoort', 'Het Tolhuis', 'De Noorderpoort', 'De Oostpoort', 'De Slagboom', 'Het Grenskantoor'], werkplaats: ['Smederij {s}', 'Timmerwerkplaats {s}', 'De Drukkerij', 'Werkplaats {s}', 'De Wasserij', 'Bakkerij {s}'],
      archief: ['Het Stadsarchief', 'De Bibliotheek', 'Het Kadaster', 'Het Kerkarchief', 'De Leeszaal', 'Het Gemeentearchief'], park: ['Het Stadspark', 'De Plantage', 'De Singel', 'De Wandeling', 'Het Bos', 'De Tuinen'] },
    modern: { herberg: ['Café De Hoek', 'Eetcafé {s}', 'Hotel Het Plein', 'Café De Kroeg', 'Restaurant {s}', 'Bar De Pier'], markt: ['De Weekmarkt', 'Supermarkt {s}', 'De Markthal', 'Winkelcentrum De Poort', 'De Warenmarkt', 'Slagerij {s}'],
      plein: ['Het Marktplein', 'Het Kerkplein', 'Het Stationsplein', 'De Brink', 'Het Raadhuisplein', 'Het Rondeel'], huis: ['Huis {s}', 'Huize {s}', 'Woning {s}', 'Het hoekhuis', 'Appartement {s}', 'Het huis aan de Kade'],
      kantoor: ['Het Stadhuis', 'Notariskantoor {s}', 'Het Postkantoor', 'Administratiekantoor {s}', 'Het Belastingkantoor', 'Makelaardij {s}'], haven: ['De Kade', 'De Jachthaven', 'De Visserskade', 'De Pakhuizen', 'De Veerhaven', 'Het Veer'],
      poort: ['De Noorderpoort', 'De Grenspost', 'De Oostpoort', 'De Tolweg', 'De Slagboom', 'De Westpoort'], werkplaats: ['Smederij {s}', 'Autogarage {s}', 'De Drukkerij', 'Werkplaats {s}', 'Fabriek {s}', 'Bakkerij {s}'],
      archief: ['Het Stadsarchief', 'De Bibliotheek', 'Het Kadaster', 'Het Gemeentearchief', 'De Leeszaal', 'Het Streekarchief'], park: ['Het Stadspark', 'De Plantage', 'De Singel', 'Het Bos', 'De Speeltuin', 'De Tuinen'] },
    toekomst: { herberg: ['Eetplaats De Lantaarn', 'Café Nulpunt', 'Hotel Kade 7', 'Eethuis {s}', 'Café Het Net', 'Bar Meridiaan'], markt: ['Het Collectief', 'Markthal Zuid', 'De Ruilhal', 'Voedselhal Oost', 'Het Distributiepunt', 'De Ambachtshal'],
      plein: ['Het Centrale Plein', 'Het Lichtplein', 'Het Knooppunt', 'De Brink', 'Het Kruispunt', 'Het Raadsplein'], huis: ['Woonblok {s}', 'Huize {s}', 'Woning {s}', 'De Dakwoning', 'Het hoekhuis', 'Het huis aan de Kade'],
      kantoor: ['Het Registratiebureau', 'Kantoor {s}', 'Het Gemeenteportaal', 'Het Datakantoor', 'Administratie Zuid', 'Het Verificatiebureau'], haven: ['Dok Noord', 'De Containerkade', 'Het Dronehaventje', 'Dok Zuid', 'De Kade', 'Het Laadplatform'],
      poort: ['Toegangspoort Noord', 'Het Controlepunt', 'Poort Oost', 'Poort Zuid', 'Het Grenspunt', 'Het Toegangsportaal'], werkplaats: ['Werkplaats {s}', 'Het Maakcollectief', 'De Reparatiehal', 'Printhal Noord', 'Atelier {s}', 'De Assemblagehal'],
      archief: ['Het Digitaal Archief', 'De Kennisbank', 'Het Register', 'Het Datahuis', 'De Archiefhal', 'Het Geheugenhuis'], park: ['Het Stadspark', 'De Daktuin', 'Het Groenpunt', 'De Singel', 'Het Bos', 'De Klimaattuin'] }
  },
  // beroepen per groep: nl, optionele vrouwelijke vorm f, only (alleen die sekse), tpl (waar te vinden), cls (laag/midden/hoog)
  occ: {
    oud: [{ nl: 'herbergier', f: 'herbergierster', tpl: 'herberg', cls: 'midden' }, { nl: 'koopman', f: 'koopvrouw', tpl: 'markt', cls: 'midden' }, { nl: 'schrijver bij het stadsbestuur', tpl: 'kantoor', cls: 'midden' }, { nl: 'smid', tpl: 'werkplaats', cls: 'laag' },
      { nl: 'schipper', tpl: 'haven', cls: 'laag' }, { nl: 'havenmeester', tpl: 'haven', cls: 'midden' }, { nl: 'poortwachter', tpl: 'poort', cls: 'laag' }, { nl: 'schepen', tpl: 'kantoor', cls: 'hoog' }, { nl: 'apotheker', tpl: 'huis', cls: 'midden' },
      { nl: 'kroniekschrijver', tpl: 'archief', cls: 'midden' }, { nl: 'bakker', tpl: 'werkplaats', cls: 'laag' }, { nl: 'weduwe van een koopman', only: 'f', tpl: 'huis', cls: 'midden' }, { nl: 'gildemeester', tpl: 'werkplaats', cls: 'hoog' },
      { nl: 'wijnhandelaar', tpl: 'markt', cls: 'hoog' }, { nl: 'geestelijke', tpl: 'archief', cls: 'hoog' }, { nl: 'dienstbode', tpl: 'huis', cls: 'laag' }, { nl: 'marktkoopman', f: 'marktkoopvrouw', tpl: 'markt', cls: 'laag' }],
    klassiek: [{ nl: 'cafébaas', tpl: 'herberg', cls: 'midden' }, { nl: 'kruidenier', tpl: 'markt', cls: 'midden' }, { nl: 'notaris', tpl: 'kantoor', cls: 'hoog' }, { nl: 'klerk', tpl: 'kantoor', cls: 'laag' }, { nl: 'havenarbeider', tpl: 'haven', cls: 'laag' },
      { nl: 'havenmeester', tpl: 'haven', cls: 'midden' }, { nl: 'douanebeambte', tpl: 'poort', cls: 'midden' }, { nl: 'burgemeester', tpl: 'kantoor', cls: 'hoog' }, { nl: 'huisarts', tpl: 'huis', cls: 'hoog' }, { nl: 'archivaris', tpl: 'archief', cls: 'midden' },
      { nl: 'smid', tpl: 'werkplaats', cls: 'laag' }, { nl: 'drukker', tpl: 'werkplaats', cls: 'midden' }, { nl: 'kolenhandelaar', tpl: 'markt', cls: 'midden' }, { nl: 'onderwijzer', f: 'onderwijzeres', tpl: 'huis', cls: 'midden' },
      { nl: 'weduwe', only: 'f', tpl: 'huis', cls: 'midden' }, { nl: 'advocaat', tpl: 'kantoor', cls: 'hoog' }, { nl: 'dienstbode', tpl: 'huis', cls: 'laag' }, { nl: 'marktkoopman', f: 'marktkoopvrouw', tpl: 'markt', cls: 'laag' }],
    modern: [{ nl: 'caféhouder', tpl: 'herberg', cls: 'midden' }, { nl: 'slager', tpl: 'markt', cls: 'midden' }, { nl: 'makelaar', tpl: 'kantoor', cls: 'hoog' }, { nl: 'accountant', tpl: 'kantoor', cls: 'hoog' }, { nl: 'journalist', tpl: 'kantoor', cls: 'midden' },
      { nl: 'havenmeester', tpl: 'haven', cls: 'midden' }, { nl: 'loods', tpl: 'haven', cls: 'midden' }, { nl: 'garagehouder', tpl: 'werkplaats', cls: 'midden' }, { nl: 'huisarts', tpl: 'huis', cls: 'hoog' }, { nl: 'archivaris', tpl: 'archief', cls: 'midden' },
      { nl: 'bibliothecaris', tpl: 'archief', cls: 'midden' }, { nl: 'conciërge', tpl: 'huis', cls: 'laag' }, { nl: 'wethouder', tpl: 'kantoor', cls: 'hoog' }, { nl: 'bakker', tpl: 'werkplaats', cls: 'laag' },
      { nl: 'verzekeringsagent', tpl: 'kantoor', cls: 'midden' }, { nl: 'pensionhouder', f: 'pensionhoudster', tpl: 'herberg', cls: 'midden' }, { nl: 'douanebeambte', tpl: 'poort', cls: 'midden' }, { nl: 'schoonmaker', tpl: 'huis', cls: 'laag' }],
    toekomst: [{ nl: 'dataschrijver', tpl: 'kantoor', cls: 'midden' }, { nl: 'havenmeester', tpl: 'haven', cls: 'midden' }, { nl: 'verzekeringsonderzoeker', tpl: 'kantoor', cls: 'midden' }, { nl: 'journalist', tpl: 'kantoor', cls: 'midden' },
      { nl: 'technicus bij een energiecollectief', tpl: 'werkplaats', cls: 'midden' }, { nl: 'archivaris', tpl: 'archief', cls: 'midden' }, { nl: 'dronepiloot', tpl: 'haven', cls: 'midden' }, { nl: 'bioloog bij een landbouwcollectief', tpl: 'markt', cls: 'midden' },
      { nl: 'eethuisbeheerder', tpl: 'herberg', cls: 'midden' }, { nl: 'bestuurder van het stadscollectief', tpl: 'kantoor', cls: 'hoog' }, { nl: 'wijkverpleger', tpl: 'huis', cls: 'midden' }, { nl: 'reparateur', tpl: 'werkplaats', cls: 'laag' },
      { nl: 'marktmeester', tpl: 'markt', cls: 'midden' }, { nl: 'toegangsbewaker', tpl: 'poort', cls: 'laag' }, { nl: 'schoonmaker', tpl: 'huis', cls: 'laag' }]
  },
  traits: ['bedachtzaam en nauwgezet', 'joviaal maar snel beledigd', 'zwijgzaam en waakzaam', 'nieuwsgierig en praatgraag', 'streng maar rechtvaardig', 'charmant en aanpasbaar', 'zorgzaam tot bemoeizucht', 'ambitieus en ongeduldig', 'verlegen en trouw',
    'sluw en geduldig', 'eerlijk tot op het pijnlijke', 'melancholisch en filosofisch', 'trots en gesloten', 'grappig als afleiding', 'praktisch en ongeïnteresseerd in roddel', 'argwanend tegenover vreemden'],
  warmTraits: ['zorgzaam tot bemoeizucht', 'charmant en aanpasbaar', 'joviaal maar snel beledigd', 'bedachtzaam en nauwgezet'],
  voices: ['spreekt kort en droog', 'praat in omwegen en zegt zelden ja of nee', 'stelt vragen terug in plaats van te antwoorden', 'praat zacht en wacht lang met antwoorden', 'vol spreekwoorden en gezegden', 'spreekt snel en onderbreekt zichzelf',
    'zorgvuldig beleefd', 'warm en gezellig, met bijnamen', 'formeel en afstandelijk', 'droog humoristisch', 'bijna fluisterend', 'luid en stellig'],
  secrets: ['heeft een schuld die niemand mag weten', 'is heimelijk verliefd op iemand die verloofd is', 'verzwijgt een oude vergissing in het werk', 'verkoopt heimelijk spullen uit de zaak', 'liegt over hoe het aan zijn bezit kwam',
    'bezoekt in het geheim een zieke verwant', 'overweegt de stad te verlaten zonder het te vertellen', 'heeft op de bewuste dag iets anders gedaan dan wordt gezegd', 'bewaart een brief van een oude geliefde', 'is bang dat een oud geheim uitkomt',
    'sjoemelt op kleine schaal met de boekhouding', 'kent de dader van een kleine diefstal en zwijgt', 'speelt in het geheim om geld', 'drinkt meer dan iemand weet'],
  agendas: ['wil de zaak van het gezin beschermen', 'wil een erfenis veiligstellen', 'wil een rivaal uit de stad krijgen', 'wil promotie maken', 'wil met rust gelaten worden', 'wil de waarheid kennen om een oude kwestie af te sluiten',
    'wil de speler gebruiken om iets uit te zoeken', 'wil zijn naam zuiveren', 'wil geld verdienen aan informatie', 'wil een nieuwe start elders', 'wil een oude vriend helpen', 'wil de stad beschermen tegen een schandaal'],
  motiveAgenda: { geld: 'wil dat het geld veilig blijft en niemand de boeken inziet', liefde: 'wil de ander niet verliezen en laat niets blijken', schaamte: 'wil dat het oude geheim begraven blijft', bescherming: 'wil een bepaald iemand beschermen, wat het ook kost',
    wraak: 'wil dat het onrecht van vroeger erkend wordt, zonder zelf als dader te gelden', macht: 'wil de eigen positie behouden', angst: 'wil dat de oude dreiging nooit ter sprake komt', erfenis: 'wil dat de erfenis verloopt zoals gepland' },
  skills: ['opmerkzaam', 'overtuigend', 'geduldig', 'handig', 'goed met cijfers', 'goed met mensen', 'taalvaardig', 'vindingrijk', 'goed geheugen voor gezichten', 'rustig onder druk'],
  flaws: ['vertrouwt te snel', 'kan moeilijk loslaten', 'is te trots om hulp te vragen', 'twijfelt te lang', 'neemt dingen persoonlijk', 'zwijgt als het ertoe doet'],
  hints: { oud: ['reizend koopman', 'schrijver in dienst van het stadsbestuur', 'herbergierszoon of -dochter', 'apotheker', 'gildeleerling', 'boodschapper', 'schippersknecht', 'klerk bij een handelshuis'],
    klassiek: ['onderwijzer', 'klerk bij een handelshuis', 'verpleegster of verpleger', 'koerier', 'drukkersleerling', 'huisarts in opleiding', 'winkelier', 'schippersknecht'],
    modern: ['journalist', 'verzekeringsagent', 'bibliothecaris', 'leraar', 'boekhouder', 'caféhouder', 'fotograaf', 'huisarts'],
    toekomst: ['dataschrijver', 'havenmeester', 'verzekeringsonderzoeker', 'journalist', 'technicus bij een energiecollectief', 'archivaris', 'dronepiloot', 'bioloog bij een landbouwcollectief'] },
  titles: ['Het geheim van {s}', 'De laatste dag in {s}', 'Wat {s} verzweeg', 'Schaduw over {s}', 'Het spoor naar {s}', 'De stilte van {s}', 'Niemand in {s}'],
  kin: { m: ['oom', 'neef', 'zwager', 'broer'], f: ['tante', 'nicht', 'schoonzus', 'zus'] },
  crimeText: {
    moord: ['wordt {v} onder verdachte omstandigheden dood aangetroffen; wat er gebeurde blijft buiten beeld', 'een ongeluk'], verdwijning: ['is {v} spoorloos verdwenen', 'vrijwillig vertrokken'],
    diefstal: ['is iets kostbaars en belangrijks gestolen van {v}', 'een vergissing in de administratie'], complot: ['smeedt een kring een heimelijk plan tegen {v}', 'een gewone ruzie'],
    fraude: ['is geld en bezit van {v} op sluwe wijze weggesluisd', 'een boekhoudkundige fout'], chantage: ['wordt {v} onder druk gezet met een geheim', 'een geldkwestie tussen bekenden'],
    sabotage: ['is opzettelijk schade toegebracht aan het werk van {v}', 'slijtage en pech'], valsheid: ['duikt een vervalst stuk op met grote gevolgen voor {v}', 'een echt maar omstreden document'],
    verraad: ['is geheime informatie van {v} verkocht of gelekt', 'onhandig gedrag van een medewerker'], brandstichting: ['is bij {v} een brand aangestoken, zonder slachtoffers in beeld', 'een ongelukkige brand'],
    ontvoering: ['is {v} ontvoerd; dat gebeurde buiten beeld', 'een vrijwillig vertrek']
  }
};

/* ---------------- hulpfuncties ---------------- */
const Rnd = {
  pickN(rng, arr, n) { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(rng.int(a.length), 1)[0]); return out; },
  range(rng, lo, hi) { return lo + rng.int(hi - lo + 1); },
  chance(rng, p) { return rng.next() < p; },
  cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
};

/* ---------------- NameBook: unieke voornamen en achternamen ----------------
   v0.6.5 (fase 1, voorstel 12): elke achternaam komt maar één keer voor. Een gedeelde achternaam is daardoor
   altijd een bewuste, gelabelde familieband (surname meegegeven). Locatienamen met {s} reserveren hun naam ook,
   zodat "Huize X" nooit stilzwijgend naar een persoon zonder band verwijst. Figuranten (soft) mogen pas een naam
   hergebruiken als de lijst van hun eigen naamstijl op is; kernpersonen wijken eerst uit naar een andere stijl. */
const NameBook = {
  make(nameGroup) { return { g: nameGroup, usedFirst: new Set(), usedFull: new Set(), usedSur: new Set(), usedCity: new Set(), usedLoc: new Set() }; },
  first(book, rng, flavorId, gender) {
    const key = gender === 'vrouw' ? 'f' : 'm', order = [flavorId].concat(Object.keys(Kit.flavors).filter((f) => f !== flavorId));
    for (const f of order) { const pool = Kit.flavors[f][key][book.g].filter((n) => !book.usedFirst.has(norm(n))); if (pool.length) { const n = rng.pick(pool); book.usedFirst.add(norm(n)); return n; } }
    return 'Onbekend';
  },
  // a fresh surname: own name style first, then (core people only) other styles, finally reuse
  sur(book, rng, flavorId, soft) {
    const free = (f) => Kit.flavors[f].sur.filter((x) => !book.usedSur.has(norm(x)));
    let pool = free(flavorId);
    if (!pool.length && !soft) { for (const f of Object.keys(Kit.flavors)) { if (f === flavorId) continue; pool = free(f); if (pool.length) break; } }
    if (!pool.length) pool = Kit.flavors[flavorId].sur;
    const x = rng.pick(pool); book.usedSur.add(norm(x)); return x;
  },
  person(book, rng, flavorId, gender, surname, soft) {
    for (let k = 0; k < 20; k++) {
      const first = this.first(book, rng, flavorId, gender), sur = surname || this.sur(book, rng, flavorId, soft), full = first + ' ' + sur;
      if (!book.usedFull.has(norm(full))) { book.usedFull.add(norm(full)); book.usedSur.add(norm(sur)); return { first: first, sur: sur, full: full }; }
    }
    const first = this.first(book, rng, flavorId, gender), sur = surname || this.sur(book, rng, flavorId, soft); return { first: first, sur: sur, full: first + ' ' + sur };
  }
};

/* ---------------- ProtagonistEngine ---------------- */
const ProtagonistEngine = {
  HOOKS: {
    moord: [
      'Kort voor het einde stuurde {v} jou een dringend bericht: "Als mij iets overkomt, zoek dan uit wie hier achter zit — jij bent de enige die ik nog vertrouw."',
      'Omdat jij als {bg} kort voor het voorval nog een felle woordenwisseling met {v} had, fluistert de halve stad nu jouw naam; als je de dader niet vindt, draai jij ervoor op.',
      '{v} hield jou ooit uit de wind toen niemand anders voor je opkwam; nu de autoriteiten het willen afdoen als een ongeluk, rust de plicht op jouw schouders.'
    ],
    verdwijning: [
      '{v} had die avond een afspraak met jou om iets belangrijks te overhandigen, maar kwam nooit opdagen; op tafel lag alleen een briefje met jouw naam erop.',
      'Men zag {v} het laatst bij jouw werkplek als {bg}; zolang {v} spoorloos blijft, wijzen de vingers in de stad rechtstreeks naar jou.',
      '{v} is een dierbare bekende die nooit zonder een woord zou vertrekken; jij weet zeker dat iemand {v} het zwijgen heeft opgelegd.'
    ],
    diefstal: [
      'Het gestolene lag onder jouw hoede als {bg}; als het niet binnen vier dagen boven water komt, verlies je je goede naam en je bestaan in de stad.',
      '{v} vertrouwde jou de sleutel en het toezicht toe, en nu kijkt zelfs {v} je met stille verdenking aan.',
      'Tussen de sporen van de diefstal bij {v} is een voorwerp gevonden dat van jou lijkt te zijn — iemand probeert jou voor de daad te laten opdraaien.'
    ],
    complot: [
      'In de onderschepte stukken tegen {v} wordt jouw naam als {bg} valselijk genoemd als medeplichtige; alleen de waarheid kan je naam zuiveren.',
      '{v} nam jou in vertrouwen over een dreigend gevaar en vroeg je te waken; nu het complot zich sluit, ben jij de laatste die kan ingrijpen.',
      'Wie {v} ten val brengt, heeft ook jouw positie als {bg} in het vizier; je vecht voor jullie allebei.'
    ],
    fraude: [
      'Onder de vervalste stukken waarmee {v} is benadeeld, staat een handtekening die verdacht veel op de jouwe lijkt.',
      'Als {bg} heb jij de boeken en stukken van {v} eerder ingezien; als je de echte fraudeur niet ontmaskert, houdt men jou verantwoordelijk.',
      '{v} dreigt door het bedrog alles kwijt te raken en klopt in wanhoop bij jou aan omdat niemand anders durft te graven.'
    ],
    chantage: [
      '{v} durft aan niemand te vertellen wie er dreigt, behalve aan jou; elke dag uitstel trekt de strop strakker aan.',
      'De afperser gebruikt informatie die alleen via jouw werk als {bg} bekend kon zijn; je móét ontdekken wie er achter zit.',
      'Als het geheim waarmee {v} wordt gechanteerd op straat komt, sleurt dat ook mensen mee die jou dierbaar zijn.'
    ],
    sabotage: [
      'Het gesaboteerde werk van {v} droeg jouw goedkeuring als {bg}; de stad geeft jou de schuld van de schade.',
      '{v} waarschuwde je een dag eerder dat er iemand rondsloop, maar jij wuifde het weg — dat schuldgevoel laat je niet los.',
      'Door de sabotage bij {v} ligt ook jouw eigen werk stil; zolang de dader vrij rondloopt, is niemand veilig.'
    ],
    valsheid: [
      'Het vervalste document dat {v} treft, is opgemaakt met materialen die uit jouw omgeving als {bg} lijken te komen.',
      '{v} staat op het punt alles te verliezen door het valse stuk en heeft jou gesmeekt om binnen vier dagen het bedrog te bewijzen.',
      'Wie het stuk tegen {v} vervalste, kende jouw werkwijze als {bg} van binnenuit — dit is een directe aanval op jouw eer.'
    ],
    verraad: [
      'Omdat jij als {bg} toegang had tot de vertrouwelijke gegevens van {v}, sta jij bovenaan de lijst van verdachten.',
      '{v} deelde het geheim met slechts een handvol mensen, onder wie jij; het verraad voelt als een mes in je eigen rug.',
      'De verrader heeft sporen achtergelaten die bewust naar jouw deur leiden; je hebt vier dagen voordat het gezag ingrijpt.'
    ],
    brandstichting: [
      'In de as bij {v} is iets gevonden dat naar jou als {bg} verwijst; iemand gebruikt de brand om jou én {v} te raken.',
      '{v} ving jou op toen je voor het eerst in de stad kwam; nu {v} voor de puinhopen staat, laat je het er niet bij zitten.',
      'Kort voor de brand bij {v} zag je iemand weglopen in de duisternis, maar niemand gelooft je zonder keihard bewijs.'
    ],
    ontvoering: [
      'De dader liet bij de ontvoering van {v} een boodschap achter die specifiek aan jou is gericht: wie naar de autoriteiten stapt, maakt het erger.',
      '{v} stond op het punt jou als {bg} iets te onthullen; de ontvoering had maar één doel: voorkomen dat {v} met jou zou praten.',
      'Elk dagdeel dat verstrijkt verkleint de kans dat {v} ongedeerd terugkeert, en jij kent de stad goed genoeg om het spoor te volgen.'
    ]
  },
  build(dna, rng, book, flavorId) {
    const [occG] = GROUPS[dna.ids.eras], crime = Lib.get('crimes', dna.ids.crimes), gender = Rnd.chance(rng, 0.5) ? 'man' : 'vrouw';
    const p = NameBook.person(book, rng, flavorId, gender), age = Rnd.range(rng, 24, 52), hint = rng.pick(Kit.hints[occG]);
    const hRng = RNG.make(p.full + '|hook|' + crime.id);
    const pool = this.HOOKS[crime.id] || this.HOOKS.verdwijning;
    const rel = hRng.pick(pool).replace(/\{bg\}/g, hint);
    return { name: p.full, surname: p.sur, age: age, gender: gender, background: hint, skills: Rnd.pickN(rng, Kit.skills, 3), flaw: rng.pick(Kit.flaws),
      motivation: 'wil de waarheid achterhalen en degene beschermen die onterecht in de schaduw staat', relationshipToCrime: rel };
  }
};

/* ---------------- WorldEngine ---------------- */
const WorldEngine = {
  build(dna, P, rng, book, protagonistFlavor) {
    const [occG] = GROUPS[dna.ids.eras], small = dna.ids.styles === 'dorp';
    const flavors = Rnd.pickN(rng, Object.keys(Kit.flavors), 5), N = P.cities;
    flavors.splice(flavors.indexOf(protagonistFlavor), 1); flavors.unshift(protagonistFlavor);
    let pool = Kit.archetypes.filter((a) => (!a.eras || a.eras.indexOf(occG) >= 0) && (!small || a.small));
    const picked = Rnd.pickN(rng, pool, N); while (picked.length < N) picked.push(rng.pick(pool));
    const nReg = Math.min(N, Rnd.range(rng, 1, 3)), regNames = Rnd.pickN(rng, Kit.regions, nReg);
    const regions = regNames.map((n, i) => ({ id: 'region_' + (i + 1), name: n, description: rng.pick(Kit.regionDesc) }));
    const cities = [];
    for (let i = 0; i < N; i++) {
      const flavorId = flavors[i % flavors.length], flavor = Kit.flavors[flavorId], arch = picked[i];
      const free = flavor.cities.filter((c) => !book.usedCity.has(c)), allFree = free.length ? free : [].concat.apply([], Object.keys(Kit.flavors).map((f) => Kit.flavors[f].cities)).filter((c) => !book.usedCity.has(c));
      const cname = rng.pick(allFree); book.usedCity.add(cname);
      // locatiesjablonen: verplichte eerst, dan gewogen aanvullen (huis en werkplaats mogen twee keer)
      const want = Rnd.range(rng, P.locs[0], P.locs[1]), tpls = Array.from(new Set(arch.req));
      const wl = Object.keys(arch.extra); let guard = 0;
      while (tpls.length < want && guard++ < 50) {
        const t = rng.weighted(wl, (k) => arch.extra[k]); const cnt = tpls.filter((x) => x === t).length;
        if (cnt === 0 || (cnt === 1 && (t === 'huis' || t === 'werkplaats' || t === 'markt'))) tpls.push(t);
      }
      while (tpls.length < want) tpls.push('huis');
      const locations = tpls.map((t, j) => {
        const pool2 = Kit.locNames[occG][t]; let name = null;
        for (let k = 0; k < 12 && !name; k++) { const pat = rng.pick(pool2), sur = pat.indexOf('{s}') >= 0 ? NameBook.sur(book, rng, flavorId, true) : null, raw = sur ? pat.replace('{s}', sur) : pat; if (!book.usedLoc.has(norm(raw))) name = raw; }
        if (!name) { let k = 0; const base = rng.pick(pool2).replace('{s}', () => NameBook.sur(book, rng, flavorId, true)); do { name = base + ' ' + ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(k++, 8)]; } while (book.usedLoc.has(norm(name)) && k < 9); }
        book.usedLoc.add(norm(name));
        return { id: 'loc_' + (i + 1) + '_' + (j + 1), name: name, template: t, description: Kit.tplDesc[t] + ' ' + rng.pick(Kit.details) };
      });
      cities.push({ id: 'city_' + (i + 1), name: cname, regionId: regions[i < nReg ? i : rng.int(nReg)].id, flavor: flavorId, archetype: arch.id,
        culture: arch.culture + ' (' + flavor.nl.toLowerCase() + ' gebruiken en namen)', customs: Rnd.pickN(rng, arch.customs, 2).join(' '), economy: rng.pick(arch.economy),
        factions: Rnd.pickN(rng, arch.factions, 2), locations: locations, travelTo: [] });
    }
    // reisgraaf: opspannende boom plus 0-2 extra verbindingen; symmetrisch
    const link = (a, b) => {
      if (a === b || cities[a].travelTo.some((t) => t.cityId === cities[b].id) || cities[a].travelTo.length >= 4 || cities[b].travelTo.length >= 4) return;
      const days = rng.weighted([1, 2, 3, 4], (d) => [0, 3, 3.5, 2.5, 1][d]), risk = rng.weighted(['laag', 'middel', 'hoog'], (r) => ({ laag: 6, middel: 3, hoog: 1 })[r]), cost = days * 5 + (risk === 'hoog' ? 4 : risk === 'middel' ? 2 : 0);
      cities[a].travelTo.push({ cityId: cities[b].id, days: days, cost: cost, risk: risk }); cities[b].travelTo.push({ cityId: cities[a].id, days: days, cost: cost, risk: risk });
    };
    for (let i = 1; i < N; i++) link(i, Rnd.chance(rng, 0.6) ? i - 1 : rng.int(i));
    for (let k = Rnd.range(rng, 0, 2); k > 0; k--) link(rng.int(N), rng.int(N));
    return { regions: regions, cities: cities };
  }
};

/* ---------------- CastEngine ---------------- */
const TECH_CAST = {
  p_informant: { kind: 'informant', tpl: 'herberg', cls: 'laag', pub: 'twijfelachtig', tru: 'twijfelachtig', agenda: 'wil geld verdienen aan informatie' },
  m_excentriek: { kind: 'excentriek', cls: 'midden', age: [55, 78], pub: 'goed', tru: 'goed', agenda: 'wil graag gehoord worden en deelt kennis alleen in ruil voor een wederdienst' },
  p_oude_rot: { kind: 'oudgediende', cls: 'midden', age: [55, 70], pub: 'goed', tru: 'goed', agenda: 'wil zijn ervaring doorgeven voordat die verloren gaat' },
  n_opdrachtgever_liegt: { kind: 'opdrachtgever', cls: 'midden', pub: 'twijfelachtig', tru: 'twijfelachtig', agenda: 'wil zijn eigen rol in de zaak verborgen houden' },
  c_getuige_zwijgt: { kind: 'zwijgende getuige', cls: 'laag', pub: 'goed', tru: 'goed', agenda: 'wil niet betrokken raken en vertrekt liever' }
};
const CastEngine = {
  slots(dna, plot, P, rng) {
    const tags = new Set(dna.tags), close = tags.has('role.close'), roleId = dna.ids.roles, N = P.cities, S = [];
    const has = (id) => plot.acts.some((a) => a.beats.some((b) => b.id === id)), crime = Lib.get('crimes', dna.ids.crimes);
    const cc = close ? 1 : roleId === 'slachtoffer' ? N : dna.ids.structures === 'jacht' ? 2 + rng.int(N - 1) : (Rnd.chance(rng, 0.6) ? 1 : 1 + rng.int(N));
    S.push({ kind: 'culprit', city: cc, arc: close ? (roleId === 'helper' && Rnd.chance(rng, 0.3) ? 'love' : 'friend') : 'none' });
    const nSusp = 2 + (tags.has('twist.zondebok') ? 1 : 0) + (P.cast[1] >= 20 ? 1 : 0);
    for (let i = 0; i < nSusp; i++) S.push({ kind: i === 0 && tags.has('twist.zondebok') ? 'zondebok' : 'verdachte', city: i < 2 ? 1 : (Rnd.chance(rng, 0.5) ? 1 : 2), arc: 'none' });
    S.push({ kind: 'vriend', city: 1, arc: 'friend' }, { kind: 'liefde', city: Rnd.chance(rng, 0.7) ? 1 : 2, arc: 'love' }, { kind: 'rivaal', city: Rnd.chance(rng, 0.6) ? 1 : 2, arc: 'enemy' });
    if ((close && Rnd.chance(rng, 0.5)) || (!close && Rnd.chance(rng, 0.35))) S.push({ kind: 'vriend', city: 2, arc: 'friend' });
    if (crime.tags.indexOf('crime.person') >= 0) S.push({ kind: 'naaste van het slachtoffer', city: Rnd.chance(rng, 0.7) ? 1 : 2, arc: 'none' });
    S.push({ kind: 'getuige', city: 1, arc: 'none' }, { kind: 'getuige', city: 1 + rng.int(Math.min(N, 3)), arc: 'none' });
    Object.keys(TECH_CAST).forEach((id) => { if (has(id)) { const t = TECH_CAST[id]; S.push(Object.assign({ city: id === 'p_informant' || id === 'n_opdrachtgever_liegt' ? 1 : 1 + rng.int(Math.min(N, 3)), arc: 'none', fromTech: id }, t)); } });
    if (has('n_gevaarlijke_charme')) { const l = S.find((s) => s.kind === 'liefde'); if (l) { l.charme = true; } }
    return S;
  },
  pickOcc(rng, occG, gender, want) {
    let pool = Kit.occ[occG].filter((o) => !o.only || o.only === (gender === 'vrouw' ? 'f' : 'm'));
    if (want.cls) { const sub = pool.filter((o) => o.cls === want.cls || (want.cls === 'midden' && o.cls === 'hoog')); if (sub.length) pool = sub; }
    if (want.tpl) { const sub = pool.filter((o) => o.tpl === want.tpl); if (sub.length) pool = sub; }
    if (want.cityTpls) { const sub = pool.filter((o) => want.cityTpls.indexOf(o.tpl) >= 0); if (sub.length) pool = sub; }
    if (want.avoid) {
      const sub = pool.filter((o) => want.avoid.indexOf(o.nl) < 0);
      if (sub.length) pool = sub;
      else {   // v0.6.5: rather a free occupation from another template (the fallback places it) than a duplicate role
        let alt = Kit.occ[occG].filter((o) => (!o.only || o.only === (gender === 'vrouw' ? 'f' : 'm')) && want.avoid.indexOf(o.nl) < 0);
        if (want.cls) { const c = alt.filter((o) => o.cls === want.cls || (want.cls === 'midden' && o.cls === 'hoog')); if (c.length) alt = c; }
        if (alt.length) pool = alt;
      }
    }
    return rng.pick(pool);
  },
  FALL: { herberg: ['plein', 'markt'], markt: ['plein', 'herberg'], plein: ['markt', 'herberg'], huis: ['plein', 'herberg'], kantoor: ['archief', 'plein'], haven: ['markt', 'plein'], poort: ['plein', 'herberg'], werkplaats: ['markt', 'plein'], archief: ['kantoor', 'plein'], park: ['plein', 'huis'] },
  build(bible, dna, plot, P, rng, book) {
    const [occG] = GROUPS[dna.ids.eras], cities = bible.world.cities, N = cities.length, tags = new Set(dna.tags), close = tags.has('role.close');
    const role = Lib.get('roles', dna.ids.roles), motive = Lib.get('motives', dna.ids.motives), method = Lib.get('methods', dna.ids.methods), prot = bible.protagonist;
    let slots = this.slots(dna, plot, P, rng);
    // vulling: elke stad minstens 2 NPC's, de startstad minstens 5, en het totaal binnen het bereik
    const target = Rnd.range(rng, P.cast[0], P.cast[1]);
    const count = (c) => slots.filter((s) => s.city === c).length;
    while (slots.length > P.cast[1] + 3) { const i = slots.map((s, k) => ({ s: s, k: k })).reverse().find((x) => x.s.kind === 'getuige' || x.s.fromTech); if (!i) break; slots.splice(i.k, 1); }
    slots.forEach((s) => { if (s.city > N) s.city = N; });
    const addFill = (c) => slots.push({ kind: 'bijfiguur', city: c, arc: 'none' });
    for (let c = 1; c <= N; c++) while (count(c) < (c === 1 ? 5 : 2)) addFill(c);
    while (slots.length < target) addFill(1 + rng.weighted(cities.map((x, i) => i), (i) => (i === 0 ? 3 : 2)));
    // v0.6.5: a shared surname always means a labelled family tie; one friend may be family too, so the label alone never points at the culprit
    const kinFriend = slots.find((x) => x.kind === 'vriend');
    if (kinFriend && (role.id === 'familie' || Rnd.chance(rng, 0.4))) kinFriend.kin = true;
    // personen aanmaken
    const used = { occ: {} }, cast = [];
    const order = slots.slice().sort((a, b) => (a.kind === 'culprit' ? -1 : 0) - (b.kind === 'culprit' ? -1 : 0));
    order.forEach((s) => {
      const city = cities[s.city - 1], gender = Rnd.chance(rng, 0.5) ? 'vrouw' : 'man', cityTpls = Array.from(new Set(city.locations.map((l) => l.template)));
      const high = new Set(Kit.occ[occG].filter((o) => o.cls === 'hoog').map((o) => o.nl)), want = { cityTpls: cityTpls, avoid: Object.keys(used.occ).filter((k) => used.occ[k] >= 1) };
      if (s.kind === 'culprit') {
        if (role.id === 'autoriteit') want.cls = 'hoog'; if (role.id === 'buur') want.cls = 'laag'; if (role.id === 'mentor' || role.id === 'helper') want.cls = 'midden';
      }
      if (s.cls) want.cls = s.cls; if (s.tpl) want.tpl = s.tpl;
      if (s.kind === 'vriend' || s.kind === 'liefde' || s.kind === 'rivaal') want.cls = want.cls || (Rnd.chance(rng, 0.7) ? 'midden' : 'laag');
      const occ = this.pickOcc(rng, occG, gender, want); used.occ[occ.nl] = (used.occ[occ.nl] || 0) + 1;
      const occName = gender === 'vrouw' && occ.f ? occ.f : occ.nl;
      let locs = city.locations.filter((l) => l.template === occ.tpl);
      if (!locs.length) { const fb = (this.FALL[occ.tpl] || []).concat(['plein', 'huis']); for (const t of fb) { locs = city.locations.filter((l) => l.template === t); if (locs.length) break; } }
      if (!locs.length) locs = city.locations;
      const loc = rng.pick(locs);
      const age = s.age ? Rnd.range(rng, s.age[0], s.age[1]) : (s.kind === 'culprit' && role.id === 'mentor') ? Rnd.range(rng, 52, 68) : s.kind === 'culprit' ? Rnd.range(rng, 28, 62) : Rnd.range(rng, 20, 72);
      const surname = ((s.kind === 'culprit' && role.id === 'familie') || s.kin) ? prot.surname : null;
      const person = NameBook.person(book, rng, city.flavor, gender, surname);
      const warm = s.kind === 'culprit' && close;
      s.npc = { name: person.full, gender: gender, age: age, role: occName, cityId: city.id, locationId: loc.id, personality: warm ? rng.pick(Kit.warmTraits) : rng.pick(Kit.traits), voice: null, secrets: [], agenda: '', trueAlignment: 'goed', publicAlignment: 'goed',
        relationshipArc: { type: 'none', startsAs: 'neutraal', mayFlipTo: 'none', flipTrigger: '' }, _kind: s.kind, _first: person.first };
    });
    // stemmen uniek waar mogelijk
    const voices = Rnd.pickN(rng, Kit.voices, Kit.voices.length);
    slots.forEach((s, i) => { s.npc.voice = voices[i % voices.length]; });
    // inhoud per soort
    const kinOf = (n) => rng.pick(Kit.kin[n.gender === 'vrouw' ? 'f' : 'm']), bloodKin = (n) => rng.pick(n.gender === 'vrouw' ? ['tante', 'nicht', 'zus'] : ['oom', 'neef', 'broer']);
    slots.forEach((s) => {
      const n = s.npc, bij = () => rng.pick(Kit.secrets);
      switch (s.kind) {
        case 'culprit':
          n.secrets = ['Het ware motief: ' + motive.nl.toLowerCase() + '.', 'De werkwijze: ' + method.nl.toLowerCase() + '.']; n.agenda = Kit.motiveAgenda[motive.id];
          n.trueAlignment = 'vijandig'; n.publicAlignment = (close || role.id === 'autoriteit') ? 'goed' : 'twijfelachtig';
          if (role.id === 'familie') n.role = n.role + ' (' + bloodKin(n) + ' van de hoofdpersoon)';
          if (close) n.relationshipArc = { type: s.arc, startsAs: s.arc === 'love' ? 'warm en toegewijd' : 'warm, hulpvaardig en betrouwbaar', mayFlipTo: 'enemy', flipTrigger: 'als je te dicht bij de waarheid komt of hun vertrouwen op de proef stelt' };
          break;
        case 'zondebok': case 'verdachte':
          n.secrets = [bij(), 'Had een eigen reden om het slachtoffer of de zaak te benadelen.']; n.agenda = rng.pick(Kit.agendas); n.publicAlignment = 'twijfelachtig'; n.trueAlignment = 'goed'; break;
        case 'vriend': if (s.kin) n.role = n.role + ' (' + bloodKin(n) + ' van de hoofdpersoon)'; n.secrets = [bij()]; n.agenda = rng.pick(Kit.agendas); n.relationshipArc = { type: 'friend', startsAs: 'vriendelijk en behulpzaam', mayFlipTo: Rnd.chance(rng, 0.5) ? 'enemy' : 'none', flipTrigger: 'als je hun vertrouwen schaadt of een geheim openbaart' }; break;
        case 'liefde': n.secrets = [bij()]; n.agenda = rng.pick(Kit.agendas);
          n.relationshipArc = { type: 'love', startsAs: 'voorzichtige belangstelling', mayFlipTo: Rnd.chance(rng, 0.5) ? 'friend' : 'enemy', flipTrigger: 'als je hun geheim of vertrouwen verraadt, of juist hun trouw bewijst' };
          if (s.charme) { n.trueAlignment = 'twijfelachtig'; n.secrets.push('De belangstelling voor de hoofdpersoon heeft ook een eigen reden.'); } break;
        case 'rivaal': n.secrets = [bij()]; n.agenda = 'wil dat de hoofdpersoon faalt of verdwijnt uit beeld'; n.publicAlignment = 'vijandig'; n.trueAlignment = 'twijfelachtig';
          n.relationshipArc = { type: 'enemy', startsAs: 'koel en wantrouwend', mayFlipTo: Rnd.chance(rng, 0.6) ? 'friend' : 'none', flipTrigger: 'als je laat zien dat je eerlijk bent of hun zaak steunt' }; break;
        case 'naaste van het slachtoffer': n.secrets = [bij()]; n.agenda = 'wil weten wat er echt is gebeurd'; n.role = n.role + ' (' + kinOf(n) + ' van het slachtoffer)'; break;
        default: n.secrets = [bij()]; n.agenda = s.agenda || rng.pick(Kit.agendas); if (s.tru) { n.trueAlignment = s.tru; n.publicAlignment = s.pub; }
          else if (Rnd.chance(rng, 0.3)) { n.publicAlignment = 'twijfelachtig'; n.trueAlignment = 'twijfelachtig'; }
      }
    });
    // eventueel een extra relatiekandidaat zodat het aantal 3 tot 5 is (hier altijd al 3 tot 5)
    slots.sort((a, b) => a.city - b.city || (a.kind === 'culprit' ? -1 : 0) - (b.kind === 'culprit' ? -1 : 0));
    slots.forEach((s, i) => { s.npc.id = 'npc_' + (i + 1); });
    const out = slots.map((s) => { const n = s.npc; delete n._kind; delete n._first; return Object.assign({ id: n.id }, n, { id: n.id }); });
    const culprit = slots.find((s) => s.kind === 'culprit').npc;
    return { cast: out, culpritId: culprit.id, culpritName: culprit.name, culpritRole: culprit.role };
  }
};
const Rel = { base(type) { const m = { friend: [55, 45, 5, 10], love: [40, 55, 5, 15], enemy: [15, 5, 55, 45], none: [30, 20, 10, 20] }[type] || [30, 20, 10, 20]; return { trust: m[0], affection: m[1], resentment: m[2], suspicion: m[3] }; } };

/* ---------------- TruthEngine (light): meta, crime, truth uit sjablonen ---------------- */
const TruthEngine = {
  build(dna, plot, bible, rng) {
    const g = (t) => Lib.get(t, dna.ids[t]), era = g('eras'), crime = g('crimes'), role = g('roles'), motive = g('motives'), method = g('methods'), twist = g('twists'), close = dna.tags.indexOf('role.close') >= 0;
    const home = bible.world.cities[0], labels = PlotEngine.labels(dna), txt = Kit.crimeText[crime.id], clue = (e) => PlotEngine.fill(e.clue.text, Object.assign({}, labels, { dader: 'de dader' }));
    const place = home.locations[rng.int(home.locations.length)].name;
    const summary = Rnd.cap('in ' + home.name + ' ' + txt[0].replace('{v}', crime.victim)) + ' (bij ' + place + '). De dader is nog onbekend.';
    return {
      meta: { title: rng.pick(Kit.titles).replace('{s}', home.name), era: era.id, settingSummary: era.nl + '. ' + home.culture + ' Stijl: ' + g('styles').nl + '.', tone: dna.tone,
        eraRules: { allowedTech: era.rules.allowed.slice(), bannedTech: era.rules.banned.slice(), currency: era.rules.currency, clothing: era.rules.clothing, languageStyle: era.rules.languageStyle } },
      crime: { type: crime.id, summary: summary, personalHook: bible.protagonist.relationshipToCrime, publicVersion: 'De officiële lezing is: ' + txt[1] + '.' },
      truth: {
        culprit: { name: bible.culpritName, role: bible.culpritRole, relationToProtagonist: close ? 'een naaste die je al lang vertrouwt' : role.id === 'autoriteit' ? 'een gezagsdrager die je kent van naam' : 'iemand uit de omgeving die je nauwelijks kent', closeToProtagonist: close, id: bible.culpritId },
        motive: motive.nl + '. ' + clue(motive), method: method.nl + '. ' + clue(method),
        timeline: [{ when: 'Lang voor de misdaad', event: 'Het motief krijgt vorm: ' + motive.nl.toLowerCase() + '.' }, { when: 'Maanden eerder', event: 'De dader bereidt zich voor: ' + method.nl.toLowerCase() + '.' },
          { when: 'Een week eerder', event: 'De dader neemt het besluit en wist de eerste sporen.' }, { when: 'De dag van de misdaad', event: 'In ' + home.name + ' gebeurt wat in de samenvatting staat; het blijft buiten beeld.' },
          { when: 'Daarna', event: 'De dader houdt de schijn op (' + twist.nl.toLowerCase() + ').' }, { when: 'Nu', event: bible.protagonist.name + ' wordt erbij betrokken en begint te zoeken.' }],
        hiddenManipulation: { present: close, description: close ? 'De dader stuurt de hoofdpersoon bij met warmte, hulp en kleine onwaarheden, en laat sporen na in tegenstrijdigheden.' : '' },
        trueEnding: 'Het bewijs sluit de keten en de dader wordt ontmaskerd; wat dat de hoofdpersoon en zijn naasten kost, hangt af van de gekozen weg.' }
    };
  }
};

/* ---------------- GameRules: spiegel van Validate.truth/world/cast uit het spel (v0.3.0) ---------------- */
const GameRules = {
  dupes(list, what) { const seen = new Set(), errs = []; list.forEach((x) => { if (seen.has(x)) errs.push('dubbele ' + what + ': ' + x); seen.add(x); }); return errs; },
  truth(b, P) {
    const e = [], t = b.truth || {}, m = b.meta || {};
    if (m.era !== P.era) e.push('meta.era moet "' + P.era + '" zijn');
    if (!b.crime || b.crime.type !== P.crimeId) e.push('crime.type moet "' + P.crimeId + '" zijn');
    if (t.culprit && t.culprit.closeToProtagonist !== P.culprit.close) e.push('closeToProtagonist moet ' + P.culprit.close + ' zijn');
    if (t.hiddenManipulation && t.hiddenManipulation.present !== P.culprit.close) e.push('hiddenManipulation.present moet ' + P.culprit.close + ' zijn');
    return e;
  },
  world(b, P) {
    const e = [], cities = (b.world && b.world.cities) || [];
    if (cities.length < Math.max(3, P.cities - 1) || cities.length > P.cities + 1) e.push('aantal steden ' + cities.length + ' wijkt af van ' + P.cities);
    e.push.apply(e, this.dupes(cities.map((c) => norm(c.name)), 'stadsnaam'));
    cities.forEach((c) => {
      if (c.locations.length < 5 || c.locations.length > 11) e.push(c.name + ': 5 tot 11 locaties vereist');
      e.push.apply(e, this.dupes(c.locations.map((l) => norm(l.name)), 'locatienaam in ' + c.name));
      if (!c.travelTo.length) e.push(c.name + ' heeft geen reisverbinding');
      const tp = c.locations.map((l) => l.template);
      if (!(tp.indexOf('huis') >= 0 || tp.indexOf('herberg') >= 0)) e.push(c.name + ': minstens een huis of herberg vereist');
      if (!(tp.indexOf('markt') >= 0 || tp.indexOf('plein') >= 0)) e.push(c.name + ': minstens een markt of plein vereist');
    });
    if (cities.length) {
      const seen = new Set([cities[0].id]), q = [cities[0].id];
      while (q.length) { const id = q.pop(), c = cities.find((x) => x.id === id); ((c && c.travelTo) || []).forEach((t) => { if (!seen.has(t.cityId)) { seen.add(t.cityId); q.push(t.cityId); } }); }
      if (seen.size !== cities.length) e.push('niet alle steden zijn bereikbaar');
      cities.forEach((c) => c.travelTo.forEach((t) => { const o = cities.find((x) => x.id === t.cityId); if (!o || !o.travelTo.some((x) => x.cityId === c.id)) e.push('reisverbinding niet symmetrisch: ' + c.id + '->' + t.cityId); }));
    }
    return e;
  },
  cast(b, P) {
    const e = [], cast = b.cast || [], cityIds = new Set(((b.world && b.world.cities) || []).map((c) => c.id));
    if (cast.length < P.cast[0] || cast.length > P.cast[1] + 3) e.push('aantal NPC\'s ' + cast.length + ' valt buiten ' + P.cast[0] + '-' + (P.cast[1] + 3));
    e.push.apply(e, this.dupes(cast.map((n) => norm(n.name)), 'NPC-naam'));
    cast.forEach((n) => { if (!cityIds.has(n.cityId)) e.push(n.name + ': onbekende stad'); });
    const locCity = {}; ((b.world && b.world.cities) || []).forEach((c) => c.locations.forEach((l) => { locCity[l.id] = c.id; }));
    cast.forEach((n) => { if (n.locationId == null) e.push(n.name + ': geen locatie'); else if (locCity[n.locationId] !== n.cityId) e.push(n.name + ': locationId hoort niet bij de stad'); });
    const t = b.truth || {};
    if (!t.culprit || !t.culprit.id) e.push('geen dader-id'); else if (!cast.some((n) => n.id === t.culprit.id)) e.push('dader-id niet in de cast');
    const cand = cast.filter((n) => n.relationshipArc && n.relationshipArc.type !== 'none').length;
    if (cand < 3 || cand > 5) e.push('3 tot 5 relatiekandidaten vereist, nu ' + cand);
    return e;
  },
  all(b, P) { return [].concat(this.truth(b, P), this.world(b, P), this.cast(b, P)); }
};

/* ---------------- Library: alles in een keer (seed -> plot -> bijbel) ---------------- */
const Library = {
  makeP(dna, hours) { const sc = SCALE[hours === 20 ? 20 : 8], close = dna.tags.indexOf('role.close') >= 0; return Object.assign({ era: dna.ids.eras, crimeId: dna.ids.crimes, culprit: { close: close }, runHours: hours === 20 ? 20 : 8 }, sc); },
  fromPlot(plot) {
    const dna = plot.dna, P = this.makeP(dna, plot.runHours), seed = plot.seed, nameG = GROUPS[dna.ids.eras][1], book = NameBook.make(nameG);
    const flavorIds = Object.keys(Kit.flavors), protFlavor = RNG.make(seed + '|flavor').pick(flavorIds);
    const bible = { plot: PlotEngine.toBibleSkeleton(plot).plot, genMapping: PlotEngine.toBibleSkeleton(plot).genMapping, relations: {} };
    bible.protagonist = ProtagonistEngine.build(dna, RNG.make(seed + '|protagonist'), book, protFlavor);
    bible.world = WorldEngine.build(dna, P, RNG.make(seed + '|world'), book, protFlavor);
    const c = CastEngine.build(bible, dna, plot, P, RNG.make(seed + '|cast'), book);
    bible.cast = c.cast; bible.culpritId = c.culpritId; bible.culpritName = c.culpritName; bible.culpritRole = c.culpritRole;
    c.cast.forEach((n) => { bible.relations[n.id] = Object.assign(Rel.base(n.relationshipArc.type), { knownFacts: [], lastInteractions: [] }); });
    const t = TruthEngine.build(dna, plot, bible, RNG.make(seed + '|truth'));
    bible.meta = t.meta; bible.crime = t.crime; bible.truth = t.truth;
    delete bible.culpritId; delete bible.culpritName; delete bible.culpritRole; delete bible.protagonist.surname;
    bible.world.cities.forEach((ct) => { delete ct.flavor; });
    return { P: P, plot: plot, bible: bible, issues: GameRules.all(bible, P) };
  },
  generate(seed, opts) { return this.fromPlot(PlotEngine.generate(seed, opts)); }
};

/* =====================================================================
   Het Spoor v0.4.0 — offline, deterministic, choice-driven
   Modules: Config, CaseGen (uses library above), Evidence, Rels, Clock,
            Dialogue, Act (actions), Rules (post-turn), Accuse, Solver,
            Portrait (placeholder badge, full engine in v0.4.1), Store/Save,
            Tests, MapView, UI, Debug
   Core principle: the engine decides; all state changes go through Act.*
   ===================================================================== */

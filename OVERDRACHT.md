# Het Spoor, overdracht (stand v0.16.0)

Dit document hoort bij `het-spoor` (`v0.16.0`). Het beschrijft wat er gebouwd is, waarom, en wat er nog openstaat.

## Werkwijze

- Advies- en reviewvragen volgen route B: Onderwerp, Persona, Antwoord, Toelichting en de Gecontroleerd-regel.
- Eerst voorstellen, pas bouwen na akkoord.
- Het spel blijft 100% vanilla HTML/CSS/JS zonder buildstap, volledig offline, speelbaar voor 12 tot 70 jaar.
- Testen gaat met de ingebouwde testsuite (`Tests.run(30)` in de browserconsole, of via het debugpaneel: drie keer op de titel klikken in het spel).
- De testsuite draait ook in Node: laad `content.js`, `lib.js`, `engine.js` en `views.js` in één `vm`-context, met een kleine `document`-stub (`querySelector` en `getElementById` geven `null`).
- Doelplatform: desktop, iPad (liggend én staand) en smalle schermen (ook bij 200% browserzoom).

## Bestanden en laadvolgorde

`content.js` → `lib.js` → `engine.js` → `views.js` → `ui.js`, met `style.css` en `index.html`.

| Bestand | Inhoud |
|---|---|
| content.js | Alle tekstbanken (JSON), per tijdvak aan te vullen |
| lib.js | Plot-DNA, naamgeving, wereld en cast |
| engine.js | Zaakopbouw, regels, acties (o.a. `Act.confrontWrong`), bordnotities (`Pins`), klikbare verwijzingen (`Mentions`), hints (`Hints`), solver en tests |
| views.js | Inktlijn-/houtsnede-portretten (`Silhouette`), responsief zaakbord, verdachtenoverzicht, kaartgenerator (`MapGen`), diepere tableau-scènes (`Tableau`), verhoor en coach |
| ui.js | Startscherm, koude opening, gerichte DOM-deelrenders, spiekkaart (`#peek`), "Aha!"-feedback (`#aha`), uitgebreide 0 KB WebAudio `SFX`, bevestigingen, schermen, invoer, modals en debugpaneel |

Opslag gebeurt via IndexedDB, met schema 8. Saves uit v0.8.0 tot en met v0.16.0 worden gelezen; een oudere save krijgt bij het laden een klok (begin van het dagdeel), een positie, een lijst genoemde personen/plaatsen uit het logboek, en lege standaarden voor `player.marks`, `player.notes`, `player.seen`, `player.seenJournal` en `play.knownSched` (zonder valse "Nieuw"-badges). Optionele velden (`player.threads` met optionele 3e betekenis-tag, `player.archive`, `player.marks`, `player.notes`, `player.seen`, `player.seenJournal`, `clock.min`, `pos`, `play.heardOf`, `play.heardOfLoc`, `play.knownSched`) blijven achterwaarts compatibel; oude koppelingen (`player.links`) worden bij het laden omgezet naar draadjes. De uitlegstatus staat in de voorkeuren (`prefs.intro`), niet in de save.

## Wat er per fase gebouwd is

### Fase 1, v0.6.5: fundament
- **iPad liggend:** compacte koptekst, touchmaten van 44 px en geen hover-effecten op aanraakschermen.
- **Kaart:** een tik op een plek opent eerst een detailpaneel; pas daarna volgt het bezoek.
- **Namen:** unieke achternamen en beroepen. Een gedeelde achternaam betekent altijd een gelabelde familieband, en ook een vriend kan familie zijn.
- **Aanspreekvorm:** je of u per persoon.
- **Overig:** geen reistijden meer op de kaart, en een leesbare koptekst in het donkere thema.

### Fase 2, v0.7.0: de puzzelkern
- **Bewijs noemt de dader nooit bij naam.**
  - De beginletter op papier delen de dader en verdachte B.
  - Het kenmerk dat de getuige zag, delen de dader en verdachte A.
  - Alleen de dader heeft beide.
- **Alibi's zijn controleerbaar** bij de genoemde metgezel. Die bevestigt een onschuldige en spreekt de dader tegen.
- **Draadjes:** de speler trekt ze zelf op Normaal en Moeilijk.
- **Moeilijkheid:** Makkelijk, Normaal en Moeilijk, te wisselen via Systeem.
- **Controle:** `Game.logic()` bewaakt dat de puzzel uniek en zonder naamlek is.

### Fase 3a, v0.8.0: keuzes binnen een bezoek
- **Aandacht per bezoek:** Makkelijk 6, Normaal 4, Moeilijk 3. Aanspreken, verhoren en onderzoeken kost elk één punt.
- **Onbekende aanwezigen:**
  - Voor aanspreken zie je alleen uiterlijk, plus de rol als die logisch zichtbaar is.
  - Figuranten hebben ook kenmerken, maar nooit het kenmerk dat de dader met verdachte A deelt.
  - Betrokkenen en figuranten staan in één gemengde opstelling.
  - De kaart telt alle onbekenden.
- **Voorwerpen:**
  - Een grote pool per plaatstype en tijdvak, met 4 of 5 voorwerpen per plek.
  - Mogelijke opbrengsten: niets, roosterhint, karakterspoor, munten, verwijzing naar een plek, iets om terug te geven, of een rekening die een alibi bevestigt.

### Fase 3b, v0.9.0: toon en twist
- **Toon per temperament** (open, gesloten, scherp, peinzend). Elk temperament heeft een goede en een slechte toon.
  - Een reactieregel na een goede of slechte toon maakt dat leerbaar.
  - Op Makkelijk staat een ster bij de beste toon.
- **Twist per zaak, uit de plot-DNA:**
  - **Zondebok:** een ondergeschoven briefje tegen verdachte A, met de paraaf van de dader.
  - **Medeplichtige:** de metgezel liegt voor de dader. Een document bij de alibiplek ontmaskert de leugen, waarna de dader weer verdachte is.
  - **Geen twist.**
  - Verdeling: ongeveer 38% zondebok, 38% medeplichtige en 24% geen.

### Fase 4, v0.10.0: beleving
- **Voorstel 14, herkenbare personages:**
  - Het kenmerk staat in elk portret. Het borstbeeld heeft eigen varianten voor wandelstok (handvat naast de schouder), tas (band en tas in de onderhoek) en map (tegen de borst).
  - Het kenmerk is licht met een donkere rand en wordt dikker onder 56 px.
  - Drie lichaamsbouwen en een groter lengteverschil.
  - Binnen een zaak hebben geen twee kernpersonen hetzelfde hoofddeksel, haar en dezelfde jas. De verdeling volgt de naamvolgorde (`Silhouette.looks`), dus nooit de dader of de castvolgorde.
  - Elke aanroep van een portret krijgt de zaak mee (`s: s` in de opties).
- **Voorstel 15, vast raster voor het zaakbord:**
  - Labels staan in een kopstrook van 44 px; kaarten beginnen op y 56 en staan minimaal 20 px uit elkaar.
  - De draaiing schaalt met de breedte, met hooguit 0,6 graad voor brede kaarten.
  - Een overloopkaart ("+2 stukken") opent het dagboek. Er valt niets meer weg.
  - De kolom Plaatsen is verwijderd. De vindplaats staat in het detailpaneel en op de kaart.
  - Een stempel op een verklaring bedekt de tekst niet meer.
- **Voorstel 10, onboarding:**
  - Startscherm met niveaukeuze. Het verschijnt bij de eerste start, bij Nieuwe zaak en na afloop. Bij een lopend spel staat "Verder met" bovenaan.
  - Koude opening met drie alinea's uit de zaak, en de knop "Ga naar [logies]".
  - Begeleid eerste bezoek in drie stappen: aandacht, aanspreken, toon. Alleen in het allereerste spel.
  - Twee tips, elk één keer: alibi controleren bij de metgezel, en zelf een draadje trekken (Normaal en Moeilijk).
  - Overslaan zet alles uit. "Uitleg opnieuw" staat onder Systeem.
  - De logica zit in `Coach` (views.js) en leest alleen. Een spelmarkering wijst altijd de eerste persoon in de gemengde opstelling aan, kern of figurant.
- **Afstemming:** Moeilijk heeft nu 4 aandachtspunten. Het verschil met Normaal zit alleen nog in de hulp.
- **Overig:** de starttekst noemde praten en onderzoeken nog gratis; die tekst noemt nu de aandacht.

### Fase 5, v0.11.0: bord, start en kaart
- **Archief op het zaakbord:**
  - Elke kaart behalve de zaakkaart gaat via het detailpaneel naar Archief Personen, Archief Stukken, Archief Verklaringen of Archief Plaatsen.
  - Het mapje met teller staat in de labelrij naast het zonelabel, alleen als er iets in ligt. Terughalen kan per kaart of alles tegelijk.
  - Gearchiveerde kaarten blijven kiesbaar in het zaakverslag. Nieuw bewijs komt altijd op het bord.
- **Vrije draadjes:**
  - Model: een lijst paren kaart-id's (`player.threads`), via `Act.thread`. Kaart-id's: `p:`, `d:`, `s:`, `l:` en `case`.
  - Bediening: "Draadje trekken" in het detailpaneel, daarna tikken op andere kaarten. Een tweede tik haalt het draadje los. "Klaar" of een tik op de eerste kaart sluit af.
  - Meerdere draadjes per kaart, tussen alle soorten. Makkelijk tekent daarnaast de automatische draadjes.
  - Draadjes naar een gearchiveerde kaart blijven bewaard en verschijnen weer bij terughalen.
- **Plaatsen terug op het bord:** een strook onderaan met alleen de bezochte plekken. Het bord is daarvoor 1280 × 810.
- **Startbezoek:** rondkijken in de logies kost geen dagdeel, alleen als allereerste bezoek op dag 1 in de ochtend. Daarna is het nog ochtend, en de logies is die ochtend niet opnieuw te bezoeken. De solver rekent hiermee. Het debugbezoek (`Act.force`) is nooit gratis.
- **Tekst:** een ontvoering heet "ontvoerd". Ook de persoonlijke haak zegt nu "bij de ontvoering van".
- **Kaartgenerator, volledig nieuw (`MapGen`, `Geo`):**
  - Eerst de stad: water (rivier, kust met havenbekken of meer), een verschoven stratennet met samengevoegde blokken en bruggen, stad en platteland, pleinen en parken, huizen langs de straten, velden, bos en landweggetjes.
  - Daarna de verhaalplekken: haven aan de kade, park in een park, markt en plein op een plein, poort aan een landweg, kantoor en archief nabij het centrum. Plekken houden minstens zo'n 145 px afstand en blijven vrij van kompas en legenda.
  - Geen hoofdweg meer. Een haven in de zaak dwingt water af.
  - De ondergrond wordt per seed één keer getekend en bewaard in de kaartcache.
  - Reistijd voor het Spoorboek volgt uit de afstand op de kaart.
- **Onbekenden op de kaart:** één "?" per persoon, hooguit drie. Bij meer dan drie staat er een label "3+" naast.

### v0.11.1: volgorde van de koude opening
- De koude opening telt nu vier alinea's: eerst wie je bent, dan de stad bij naam met haar gebruiken (bijvoorbeeld "Skarwier is een wantrouwige grensstad …"), dan de misdaad en tot slot de logies.
- Wijziging in `Game.create` (engine.js) en `UI.introText` (ui.js, nu `slice(1, 5)`). Lopende saves houden hun oude openingstekst.

### Fase 6, v0.12.0: de klok en blanco kaarten
- **De klok (vervangt aandacht en "kost de middag"):**
  - Een dag loopt van 08:00 tot 22:00. Ochtend tot 12:00, middag tot 17:00, avond tot 22:00. De dagdelen bepalen nog steeds roosters en openingstijden.
  - Lopen kost 15, 30 of 45 minuten, naar de afstand op de kaart (`Travel`, engine.js). Je positie staat in `s.pos`; 's nachts slaap je in de logies.
  - Aanspreken en onderzoeken kost 15 minuten, verhoren 30. Makkelijk kost twee derde (10 en 20). Vragen binnen een gesprek blijven gratis. Instelbaar in `COST` (engine.js).
  - Een onbekende aanspreken kost altijd hetzelfde, kern of figurant, zodat de prijs niets verraadt.
  - Vertrekken kost geen tijd. "Wacht tot de middag" springt naar het begin van het volgende dagdeel.
  - Gaat de klok over 12:00 of 17:00, dan blijf je waar je bent. Je leest wie vertrekt en wie binnenkomt. Gaat de plek dicht, dan sta je na een lopend gesprek buiten.
  - De regel voor het gratis startbezoek is weg: je bent om 08:00 al in de logies, dus er is geen reistijd.
  - Een foute aanklacht kost de rest van het dagdeel.
- **Blanco kaarten (`Mentions`, engine.js):**
  - Valt de naam van een kernpersoon in tekst die je ziet, dan komt er een blanco kaart: gestippeld silhouet, naam en "Genoemd door …". Geen kenmerk, rol of woonplek.
  - Een voornaam telt alleen als niemand anders in de stad die voornaam heeft.
  - Een genoemde plek die je nog niet bezocht komt gestippeld in de plaatsenstrook. Een voorwerp met een "?" komt als blanco stuk "Nog bekijken" op het bord (niet op Moeilijk, daar bestaan die markeringen niet).
  - Blanco kaarten volgen na de actieve kaarten, dus bij overloop verdwijnen zij eerst in de overloopkaart. Je kunt ze archiveren en er draadjes naar trekken. Ontmoet of bezoek je ze, dan worden ze actief en blijven de draadjes. Een blanco stuk geeft zijn draadjes door aan het stuk dat je er vindt.

### Fase A, v0.12.1: kritieke bugs, spoiler-lekken & donkere modus
- **Archief & blanco kaarten (`UI.archiveBox`, `Evidence.give`, `Act._open`, `Act.talkStart`):**
  - Crash op gearchiveerde blanco voorwerpen (`o:...`) verholpen.
  - Spoiler-lekken verholpen: nog niet ontmoete personen in *Archief Personen* tonen nu het blanco silhouet zonder rol/kenmerk; nog niet bezochte plaatsen tonen geen beschrijving.
  - Nieuw gevonden bewijs, een eerste ontmoeting of een eerste bezoek haalt een eerder gearchiveerde blanco kaart automatisch terug naar het bord (draadjes blijven bewaard).
- **Zaakbord (`Board.linked`):** het selecteren van een plaats licht geen nog niet ontmoete blanco personen meer op.
- **Tableau (`Tableau.model`):** bij grote avonddrukte (>11 aanwezigen op één plek) worden extra figuren netjes binnen `x = 78..882` op het 960 px canvas verdeeld.
- **Reistijd (`UI.startVisit`):** gebruikt nu `Travel.check` (openingstijd bij aankomst) net als `Act.visit` en `UI.stnDetail`.
- **Donkere modus, contrast & CSS (`style.css`, `views.js`, `ui.js`):**
  - `MAP_INK` en `MapGen.ground` werken volledig via CSS-variabelen met een leesbaar donker kaartpalet.
  - Onzichtbare `.tv-pop-x` sluitknop in donkere modus hersteld.
  - Afgeknipt `[data-fam="klassiek"] .doc .dk`-label (door `overflow: hidden`) hersteld via inset-kopstrook binnen de padding-box.
  - Donkere modus toegevoegd voor startscherm, koude opening, `.sp-feed` en bordkaarten; contrasten voor `--sp-mute`, `--mute`, `.ok`, `.bad`, `.iv-evhead` en `--sp-thread` naar WCAG AA gebracht; `.arch-it` gebruikt nu `--sp-line` en `--soft`.
  - `UI.animateTranscript` respecteert nu `prefers-reduced-motion`.
  - Dode code/CSS opgeruimd (`UI.convPanel`, `.cv*`, `.sp-att .dots`, `UI.mapCache`, streaming-chunk-commentaren).

### Fase B, v0.13.0: één design-systeem, moderne "papier & inkt"-stijl, bovenbalk, Dagboek & kern-toegankelijkheid
- **Eén design-systeem (`style.css`):**
  - Dubbele v0.5/v0.6-variabelen samengevoegd tot één centrale tokenlaag (licht, donker, 4 tijdvakken en dagdeel-accenten op `#app[data-part="0..3"]`), volledig op WCAG AA (`>= 5,3:1` voor alle tekstparen).
  - Verfijnde *papier & inkt*-afwerking: fijnere randen (`1–1,5 px`), zachte gelaagde schaduwen, rustigere kurk-/vilttextuur zonder stippenraster, strakke typografie (weg van systeem-`cursive` en Windows-only `Bahnschrift`) en rustige sprekerkaarten in het verhoortranscript.
- **Eén rustige bovenbalk (`ui.js`, `index.html`):**
  - `.sp-top` en `.sp-bar` samengevoegd tot één semantische `<header class="sp-head">` met merk + zaaksubtitel, `<nav class="sp-tabs">`, klok + dagactie, en *Dagboek / Zaakverslag / Systeem / Geluid*.
- **Weergave & leesgemak voor 12–70 jaar (`UI.system`, `prefs`):**
  - Instelbare **Tekstgrootte** (`Normaal` 16 px / `Groot` 18 px / `Extra groot` 20 px via `html[data-size]`) en **Rustig leesfont** (`html[data-font="plain"]`, schakelt cursieve/monospace kaartteksten uit).
- **Dagboek met tabbladen & zoekfunctie (`UI.journal`):**
  - Vier tabbladen (*Overzicht*, *Sporen*, *Mensen*, *Logboek*) met live zoekveld op naam, plaats of woord.
- **Naar voren gehaald uit Fase C (toegankelijkheid & staand scherm):**
  - Semantische landmarks (`<header>`, `<nav>`, `<main id="main">`, skiplink), volledige modal-a11y (`role="dialog"`, `aria-modal`, Tab-focus-trap, focusterugkeer bij sluiten), `#toast` met `role="status"` / `aria-live="polite"`.
  - Relatiebalken en bezoekklokbalk zijn echte `role="progressbar"`-elementen met zichtbare getallen; toetsenbord-toegankelijke bestandsinputs (`.sr-only`), `radiogroup`-pijltjestoetsen zonder focusdiefstal, echte *"Alles direct tonen"* / *"Toon hele tekst"*-knoppen en duidelijke focusringen op kaart/tableau.
  - Harde `#rotate`-blokkade verwijderd (WCAG 1.3.4): zijladen, tableau en verhoorscherm schalen nu netjes mee op staande iPad en smalle schermen.

### Fase C (rest) + Fase D, v0.14.0: gerichte DOM-deelrenders, responsief Zaakbord & Verdachtenmatrix
- **Gerichte DOM-deelrenders (`ui.js`):**
  - Persistente spelschil (`<header>`, `<main>` met `.sp-stage` + `<aside class="sp-drawer">`, en `.sp-coach-layer`): onveranderde regio's worden nooit opnieuw opgebouwd.
  - In-place patchers (`patchBoardSelection`, `patchMapSelection`, `patchTableauHotspot`, `patchIvApproach`) behouden toetsenbordfocus, scrollpositie en soepele CSS-overgangen, en voorkomen her-parsing van zware SVG's (`MapGen.svg`, `Tableau.svg`) bij kaart-, locatie-, hotspot- of toonselectie.
- **Responsief Zaakbord (`views.js`, `style.css`, `ui.js`):**
  - Vaste `1280 × 810` `transform: scale()`-canvas en `UI.fit()` volledig vervangen door een responsief CSS Grid + Container Queries-zaakbord (`>= 14 px` tekst, `>= 44 px` tikdoelen, schaalt zonder horizontale overloop op desktop, staande iPad en bij 200% browserzoom).
  - Alle niet-gearchiveerde kaarten blijven zichtbaar (geen kunstmatige afkap-overloopkaarten meer); archiefmapjes staan via flexbox in `.zn-head` naast elk zonelabel.
- **Dynamische draadjes achter kaarten met optionele betekenis (`engine.js`, `views.js`, `ui.js`):**
  - SVG-onderlaag (`svg.bt`, `z-index: 1` onder `.bd-grid`, `z-index: 2`) meet werkelijke kaartposities via `getBoundingClientRect` en werkt automatisch bij via `ResizeObserver` en bij tekstgrootte-/vensterwijzigingen.
  - Eigen draadjes ondersteunen 3 betekenissen: **Verband** (rood, standaard), **Bevestigd** (groen) en **Vermoeden** (oker, gestippeld), met achterwaartse compatibiliteit in `player.threads` (`[a, b]` of `[a, b, kind]`).
- **Eigen status-tags, korte notities & "Nieuw"-badges (`engine.js`, `views.js`, `ui.js`):**
  - Op elke kaart (behalve de zaakkaart) kun je eigen markeringen zetten (**Verdacht**, **Onschuldig**, **Nog checken**) met kleur + icoon, en op elke kaart een korte 1-regelige eigen notitie typen (live bijgewerkt zonder focusverlies in `#cardNote`).
  - "Nieuw"-badges (`+N` op tabblad *Zaakbord* en knop *Dagboek*, en `Nieuw`-label op nieuwe of actief geworden kaarten) verdwijnen zodra je de kaart aanklikt, op *Alles gezien* tikt, of het tabblad verlaat.
- **Lekvrij Verdachtenoverzicht / Deductiematrix (`Board.matrix`):**
  - Schakelbaar bovenaan het Zaakbord (*Prikbord* / *Verdachtenoverzicht*): toont alleen ontmoete personen op alfabetische volgorde met **beginletter**, **kenmerk**, **ontdekte alibi-status** (respecteert *Moeilijk*), **gekoppelde sporen** en **eigen oordeel + notitie**. Op smalle schermen stapelt de tabel netjes tot leesbare kaarten.

### Fase E, v0.15.0: klikbare namen/plaatsen (spiekkaart), roostertips, 3-traps hint & veilige bevestigingen
- **Klikbare namen en plaatsen met spiekkaart (`Mentions.linkHtml`, `#peek`, `UI.peek`):**
  - Namen van betrokkenen (volledige naam of unieke voornaam) en locaties in het verhoortranscript, zaakbord-details, feed (*Zojuist*), Dagboek (alle 4 tabbladen inclusief live zoekresultaten) en hints worden deterministisch en veilig omgezet naar inline `<button class="mention">` zonder deelwoord-matches of HTML-injectie.
  - Een tik op een verwijzing opent een compacte, lekvrije **spiekkaart** in een eigen dialoog (`#peek`, `z-index: 35`) bovenop `#modal`: klikken vanuit Dagboek houdt het Dagboek open; `Escape` sluit eerst de spiekkaart en herstelt toetsenbordfocus; klikken op een verwijzing in het verhoortranscript opent de spiekkaart zonder `skip-type` te triggeren.
  - Onbekende (blanco) personen en nog niet bezochte plaatsen lekken nooit rol, kenmerk, woonplek, beschrijving of huidig rooster; vanuit de spiekkaart spring je direct naar het zaakbord, de kaart of (indien open en bereikbaar) het bezoek.
- **Ontdekte roostertips op persoonskaarten (`Mentions.addSched`, `play.knownSched`, `Board.schedHtml`):**
  - Roosterhints uit voorwerpen (`World.yieldOf`) en bijfiguren (`Crowd.line`) worden gededupliceerd bewaard in `s.play.knownSched[npcId]` en direct getoond op de persoonskaart (zowel actief als blanco), in de spiekkaart en onder *Dagboek → Mensen*, met klikbare plaatsverwijzingen.
- **Optionele 3-traps "Geef een zetje"-hint (`Hints.get`, `UI.hintBox`):**
  - Puur en read-only, op basis van reeds ontdekte sporen en bereikbaarheid (prioriteit: confrontatie → ongecontroleerd alibi → bereikbaar spoor → ontbrekende verklaring → ongesproken betrokkene → klaar om te vergelijken). Lekt nooit `truth.culpritId` of roosters van onbekende personen.
  - Drie trappen (*1. Richting* → *2. Specifieker* → *3. Verband*), gereset bij elke nieuwe beurt, bereikbaar via *Geef een zetje* op het Zaakbord (op *Makkelijk* en *Normaal*) en als vrijblijvende knop in *Dagboek → Overzicht* (ook opt-in op *Moeilijk*).
- **Veilige bevestigingen bij grote stappen (`UI.confirm`):**
  - **Wachten** bevestigt eerst als je meer dan 60 minuten overslaat.
  - **Dag afsluiten** bevestigt wanneer er nog tijd over is vóór 22:00 of vanaf dag 4 (met waarschuwing dat het spoor daarna afkoelt).
  - **Aanklacht indienen** in *Zaakverslag* toont eerst een samenvatting van de 3 keuzes, markeert eventuele bevestigde alibi's of weerlegde stukken, herinnert aan de straf bij een foute aanklacht, en keert bij annuleren terug naar het Zaakverslag.
- **Scherpere eerste 60 seconden (`UI.introHtml`):**
  - Duidelijke hoofdknop (`Begin direct in [logies] (08:00)`) en korte oriëntatietip over voorwerpen, aanwezigen en klikbare namen/plaatsen.

### Fase F, v0.16.0: houtsnede-portretten, diepere Tableau-scènes, rustigere kaart-badges & "Aha!"-feedback
- **Gestileerde inktlijn-/houtsnede-portretten (`Silhouette` in `views.js`, 0 KB SVG):**
  - Gevormd perkamentkleurig gezicht met inktcontour, rechterwang-arcering, deterministische kaak-/neus-/wenkbrauw-/leeftijdsdetails en kledingrevers/knoop-arcering, uitsluitend op basis van publieke velden (`name`, `gender`, `role`, `age`, `kenmerk`) en naamvolgorde — 100% lekvrij.
  - Vier duidelijk herkenbare expressies per stemming (`warm`, `neutral`, `cold`, `hostile`) in `<g class="sil-expr" data-tone="...">`, doorgevoerd op alle portretplekken (zaakbord 68 px / 40 px, verdachtenmatrix 38 px, detailpaneel 96 px, tableau, verhoor 176 px, spiekkaart 64 px, dagboek 44 px, archief 40 px en debug-figurengalerij).
  - Het zichtbare `kenmerk` (bril, sjaal, speld, tas, map, wandelstok) blijft scherp leesbaar op 40 px, 72 px en full, met verfijnde brillijndikte op volle-lengte-schaal zodat ogen en expressie zichtbaar blijven.
- **Diepere Tableau-scènes (`Tableau` in `views.js`):**
  - Scène-eigen SVG `<defs>` met lucht-, muur-, vloer-, zonlicht- en gloeigradienten per dagdeel (`ochtend`, `middag`, `avond`) en tijdvak (`oud`, `klassiek`, `modern`, `toekomst`).
  - Rijkere binnenarchitectuur (steenverband/behang/panelen/bulkheads, lambrisering met kassetten, perspectiefvloeren, plafondbalken, locatie-eigen sfeerdetails zoals klok op dagdeelstand, schoorsteenmantel, kaarten/lijsten, vloerkleed, gereedschapsrek en archiefnissen) + diagonaal ochtend-/middagzonlicht door ramen en warme lamp-/haardgloed in de avond.
  - Rijkere buitenscènes (tweelaagse atmosferische skyline per tijdvak, verlichte avondramen en straatlantaarns, haven-waterreflecties/meerpalen, parklanen/hekwerk, poortkantelen/valhek) en zachte grondschaduwen onder voorwerpen en figuren — met behoud van `viewBox="0 0 960 540"` en alle hotspot-grenzen.
- **Rustigere stadskaart-badges (`MapGen.unknownBadges` & `MapGen.svg` in `views.js`):**
  - Onbekenden zijn teruggebracht naar hooguit één compacte gestippelde badge per locatie (`?`, `2 ?`, `3 ?` of `3+ ?`; nooit `?\d` en geen `? ? ? 3+`-rij meer).
  - Bekende kernpersonen worden begrensd op maximaal 3 initialencirkels + optionele `+N`-chip; reeds ontmoete bijfiguren staan rustig in het detailpaneel in plaats van de kaartpinnen te vullen.
- **Voelbare "Aha!"-momenten, in-character reactie bij fout bewijs & uitgebreide 0 KB WebAudio SFX (`content.js`, `engine.js`, `ui.js`, `index.html`, `style.css`):**
  - `#aha`-doorbraakstrook (met respect voor `prefers-reduced-motion` en `role="status"`/`aria-live="polite"`) + subtiele Zaakbord-tabpuls en verhoor-kaderflits bij nieuw spoor, gebroken alibi, bevestigd alibi (met respect voor *Moeilijk*), doorgeprikte verklaring, roostertip en gesloten zaak.
  - `Act.confrontWrong` + tijdloze `confront.wrong.{warm,neutral,cold,hostile}`-tekstbanken geven bij een fout bewijsstuk tijdens een confrontatie een directe, in-character reactie in het verhoortranscript (met eigen spreekstijl, 0 minuten klokkoste, hooguit één milde relatie-tik per stuk per gesprek en 100% lekvrij).
  - `SFX` uitgebreid met 0 KB WebAudio-geluiden voor `thread(kind)`, `stamp()`, `folder()`, `steps()`, `aha(kind)`, `miss()` en `solved()` (naast `paper`, `pin`, `type`, `bell`, `seal`).

## Meetwaarden (stand v0.16.0)

- **72 tests, alle groen in Node** (68 bestaand — met uitgebreide dader-lektest voor 4-stemmingenportretten en geüpdatete kaart-badge-test — + 4 nieuwe Fase F-regressietests voor houtsnede-portretten op 40 px/72 px/full, diepere Tableau-scènes per dagdeel × tijdvak, rustige kaart-badgedichtheid over 30 seeds en lekvrije in-character `Act.confrontWrong`).
- **20/20 headless Chromium Fase F UI-rookchecks groen** (0 console-/runtime-fouten): alle 4 portretstemmingen en kenmerken op Zaakbord, Verdachtenmatrix, Detailpaneel, Verhoor en Figurengalerij; Tableau ochtend/avond-lichtval, `960×540` hotspot-grenzen en in-place hotspot-patching; rustige kaart-badges (`<= 5` per locatie, `<= 1` onbekenden-badge); alle 12 `SFX`-methoden foutloos; `#aha`-feedback bij nieuw spoor, gebroken alibi en doorgeprikte verklaring; in-character reactie bij fout bewijs zonder toast of tijdverlies; geen horizontale overloop in donkere modus op desktop (`1280×820`), staande iPad (`768×1024`) en 200% zoom (`640×420`).
- Roadmap-status:
  - **Fase A (`v0.12.1`)**: klaar (commit `0b33703`)
  - **Fase B (`v0.13.0`) + kern Fase C**: klaar (commit `76c4556`)
  - **Fase C (rest) + Fase D (`v0.14.0`)**: klaar (commit `aaf3ab6`)
  - **Fase E (`v0.15.0`)**: klaar (commit `aeb6ecf`)
  - **Fase F (`v0.16.0`)**: klaar
  - **Volgende stap — Fase G (`v0.17.0`)**: interactief Spoorboek (tijdlijn), extra Plot-DNA-twists (`dubbel`, `slachtofferliegt`), relatie-effecten en klokbalans met niet-alwetende simulatiespeler.
  - **Daarna — Fase H (`v0.18.0`)**: PWA (manifest, icoon, Service Worker), save-migratieketen en geautomatiseerde Playwright/a11y-teststraat.

## Meetwaarden (stand v0.15.0)

- **68 tests, alle groen in Node** (65 bestaand — met `Mentions.linkHtml` en `Hints.get` toegevoegd aan de dader-lektest — + 3 nieuwe regressietests voor `Mentions.linkHtml`, ontdekte roostertips `knownSched` en 3-traps `Hints.get` over 30 seeds).
- **54/54 headless Chromium-rookchecks groen** (0 console-/runtime-fouten): alle 37 v0.14.0-checks plus 17 nieuwe Fase E-checks (roostertips in detailpaneel, klikbare mentions in Dagboek en verhoortranscript, `#peek` boven `#modal`, `Escape`-prioriteit met focusherstel, 3-traps *Geef een zetje*, en bevestigingsdialogen bij *Dag afsluiten* en *Aanklacht indienen*).

## Meetwaarden (stand v0.14.0)

- **65 tests, alle groen in Node** (60 bestaand — met aangepaste responsieve bordtests en `Board.matrix` in de dader-lektest — + 5 nieuwe regressietests voor draadbetekenissen, status-tags/notities, "Nieuw"-badges, Verdachtenoverzicht-lekvrijheid en schema-8 achterwaartse compatibiliteit).
- **37/37 headless Chromium-rookchecks groen** (0 console-/runtime-fouten): DOM-identiteit en focus-/scrollbehoud bij kaart-, kaartlocatie-, tableau-hotspot- en toonselectie; live `#cardNote`-focus; underlay-SVG-draadjes met `m-bevestigd`/`m-vermoeden` achter kaarten; kaarttekst `>= 14 px` en tikdoelen `>= 44 px`; geen overlap tussen zonelabel en archiefmapje; geen horizontale overloop op desktop (`1280×820`), staande iPad (`768×1024`) en 200% zoom (`640×420`).

## Meetwaarden (stand v0.13.0)

- 60 tests, alle groen in Node + UI-rookchecks (prefs-dataset, enkele header + `<main>`, 4 Dagboek-tabs, Systeem-weergave, `.sr-only` bestandsinputs, modal-sluiten).

## Meetwaarden (stand v0.12.1)

- 60 tests, alle groen in Node (56 bestaand + 4 nieuwe regressietests voor `Board.linked`, archief-terugkeer, tableau-overloop en donkere kaartvariabelen), plus UI-rookchecks voor `UI.archiveBox` en `UI.startVisit`.

## Meetwaarden (stand v0.12.0)

- 56 tests, alle groen in Node. Nieuw of herschreven: klok en lopen, tijd per handeling, Makkelijk twee derde, start in de logies, overgang van dagdeel met een gesprek dat doorloopt, blanco kaarten (actief worden, draadjes, opslaan, oude save, gedeelde voornaam, voorwerp dat overgaat).
- Doorloop in jsdom zonder fouten: 08:00 in de logies, onderzoeken 08:15, lopen 30 minuten met aankomsttijd, blanco kaarten op het bord, plus alle stappen uit v0.11.0.
- Solver (alwetende speler, kortste route): gemiddeld 1,4 dagdelen, hoogstens 2. In v0.11.0 was dat 3,5 en 5. Met 30/60 minuten wordt het 1,8 en 3. Het verschil komt vooral doordat je nu meerdere plekken per dagdeel haalt, niet door de prijs per handeling.

## Meetwaarden (stand v0.11.0)

- 53 tests, alle groen in Node. Daarnaast een doorloop in jsdom: startbezoek, draadjes trekken, archiveren en terughalen, kaart, plekdetail en zaakverslag, zonder fouten.
- Nieuw in v0.11.0:
  - Geen huis op een straat of in het water (30 seeds), minstens 45% van de bebouwing ligt verder dan 90 px van elke verhaalplek.
  - Haven aan het water, plekken op een passend plaatstype.
  - Onbekenden als losse "?", hooguit drie, daarboven "3+".
  - Archief in vier zones, ook na opslaan; draadjes tussen alle soorten kaarten; omzetting van oude koppelingen.
  - Startbezoek gratis, één keer.
  - Solver: gemiddeld 3,5 dagdelen, hoogstens 5. In v0.10.0 was dat 3,7 en 6; het gratis startbezoek maakt het iets ruimer.
- Kaarten in 30 seeds: 16 met rivier, 10 met meer, 4 met kust. Tussen 270 en 590 huizen per stad.

## Meetwaarden (stand v0.10.0)

- 48 tests, alle groen, in de browser en in Node.
- Nieuw: kenmerk in beeld bij 40 en 72 px, unieke silhouetten in 4 tijdvakken, bord zonder overlap ook overvol, geen weggevallen kaarten, coach leest alleen, drie stappen in volgorde, Moeilijk 4 punten.
- Het effect van 4 punten op Moeilijk is niet opnieuw gemeten. De simulatie uit v0.9.0 staat niet in de code, en een nieuwe ruwe simulatie gaf te veel ruis voor een conclusie.

## Wat nog openstaat

### Afstemming
- De tijdsdruk is lichter geworden. Een vaste simulatiespeler die niet alwetend is, en eventuele bijstelling van `COST` of daglengte, staan gepland in Fase G.

### Nog op te pakken in vervolgfasen
- Interactief Spoorboek (tijdlijn), extra Plot-DNA-twists (`dubbel` en `slachtofferliegt`), relatie-effecten en klokbalans met niet-alwetende simulatiespeler (Fase G).
- PWA (manifest, icoon, Service Worker), save-migratieketen en geautomatiseerde Playwright/a11y-teststraat (Fase H).
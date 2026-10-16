# Het Spoor, overdracht (stand v0.12.0)

Dit document hoort bij de map `het-spoor-v0.12.0`. Het beschrijft wat er gebouwd is, waarom, en wat er nog openstaat. Upload het samen met alle zeven spelbestanden in een nieuwe chat.

## Werkwijze

- Advies- en reviewvragen volgen route B: Onderwerp, Persona, Antwoord, Toelichting en de Gecontroleerd-regel.
- Eerst voorstellen, pas bouwen na akkoord.
- Elke fase levert alle gewijzigde bestanden compleet op, als zip-bestand.
- Testen gaat met de ingebouwde testsuite (`Tests.run(30)` in de browserconsole, of via het debugpaneel: drie keer op de titel klikken in het spel).
- De testsuite draait ook in Node: laad `content.js`, `lib.js`, `engine.js` en `views.js` in één `vm`-context, met een kleine `document`-stub (`querySelector` en `getElementById` geven `null`).
- Doelplatform: desktop en iPad liggend. Een staande iPad krijgt een draai-melding.

## Bestanden en laadvolgorde

`content.js` → `lib.js` → `engine.js` → `views.js` → `ui.js`, met `style.css` en `index.html`.

| Bestand | Inhoud |
|---|---|
| content.js | Alle tekstbanken (JSON), per tijdvak aan te vullen |
| lib.js | Plot-DNA, naamgeving, wereld en cast |
| engine.js | Zaakopbouw, regels, acties, bordnotities (`Pins`), solver en tests |
| views.js | Silhouetten, zaakbord, kaartgenerator, tableau, verhoor en coach |
| ui.js | Startscherm, koude opening, schermen, invoer, modals en debugpaneel |

Opslag gebeurt via IndexedDB, met schema 8. Saves uit v0.8.0 tot en met v0.12.0 worden gelezen; een oudere save krijgt bij het laden een klok (begin van het dagdeel), een positie en een lijst genoemde personen en plaatsen uit het logboek. Nieuwe velden (`player.threads`, `player.archive`, `clock.min`, `pos`, `play.heardOf`, `play.heardOfLoc`) zijn optioneel; oude koppelingen (`player.links`) worden bij het laden omgezet naar draadjes. De uitlegstatus staat in de voorkeuren (`prefs.intro`), niet in de save.

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
- De tijdsdruk is lichter geworden. Speel een paar zaken na en stel zo nodig `COST` of de lengte van de dag bij. Een vaste simulatiespeler die niet alwetend is, zou dit meetbaar maken.

### Nog na te lopen in de browser
- Het bord en de kaart zijn in deze fase niet in een echte browser bekeken, alleen in Node, jsdom en als losse kaartafbeelding. Let vooral op de breedte van de zonelabels naast de archiefmapjes en op de leesbaarheid van de kaart in het donkere thema.
- "3+" staat nu naast drie vraagtekens. Moet het één label "3+" zonder vraagtekens zijn, dan zit dat in `MapGen.unknownBadges`.

### Bekende beperkingen
- Een foute bewijskaart in de confrontatie geeft alleen een melding.
- De twist "dubbele misdaad" uit de plot-DNA heeft nog geen spelmechaniek.
- Draadjes lopen soms over andere kaarten heen, zeker nu je ze vrij kunt trekken.
- Het bord is 810 hoog in plaats van 720. Op een iPad liggend wordt het daardoor ongeveer 5% kleiner geschaald.
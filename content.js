'use strict';
const DEFAULT_CONTENT = {
 "format": "het-spoor-content",
 "version": 1,
 "name": "Standaard",
 "common": {
  "sub.groet.open": [
   "Blij dat je even binnenstapt deze {part}.",
   "Kom erbij, hier in {here} is altijd plek voor een praatje.",
   "Kijk eens aan, een bekend gezicht op deze {part}.",
   "Zet je zorgen even opzij, je bent in {here}."
  ],
  "sub.groet.gesloten": [
   "Je treft me tussen het werk door.",
   "Ik heb maar even tijd deze {part}.",
   "Zeg het maar, ik moet zo weer naar {home}.",
   "Hm. Je bent in {here} met een reden, neem ik aan."
  ],
  "sub.groet.scherp": [
   "Laten we geen tijd verspillen deze {part}.",
   "Als {role} zie ik veel, dus draai er niet omheen.",
   "Je zoekt antwoorden in {here}, dat zie ik meteen.",
   "Spreek vrijuit, daar houd ik van."
  ],
  "sub.groet.peinzend": [
   "Met {weather} buiten stemt deze {part} tot nadenken.",
   "Het is stil voor een {part} in {here}.",
   "Ik stond net aan het voorval bij {crimeloc} te denken.",
   "Soms zegt de stilte in {city} meer dan honderd woorden."
  ],
  "sub.blik.warm": [
   "Je weet dat mijn deur in {home} voor je openstaat.",
   "Gelukkig zijn er nog mensen zoals jij in {city}.",
   "Als {role} help ik je waar ik kan."
  ],
  "sub.blik.neutral": [
   "Ieder doet hier maar gewoon zijn plicht als {role}.",
   "In {city} gaat het leven ondanks alles door.",
   "Men houdt zich rustig deze {part}."
  ],
  "sub.blik.cold": [
   "Ik bemoei me liever met mijn werk in {home}.",
   "Niet iedereen in {city} zit op je vragen te wachten.",
   "Laat mij buiten de praatjes van {here}."
  ],
  "sub.blik.hostile": [
   "Ik vergeet niet hoe je mijn naam hebt genoemd in {city}.",
   "Van mij krijg je geen greintje medewerking meer.",
   "Zoek je heil maar ergens anders dan bij mij."
  ],
  "sub.sfeer.stad": [
   "Sinds die avond bij {crimeloc} kijkt iedereen in {city} over zijn schouder.",
   "Normaal draait alles hier om {economy}, maar nu telt alleen dit verhaal.",
   "Zelfs in {here} fluisteren de mensen zodra er iemand binnenkomt.",
   "Je merkt aan alles dat {city} zijn adem inhoudt."
  ],
  "sub.sfeer.weer": [
   "Het past wel bij de stemming, {weather} op zo'n {part}.",
   "Met {weather} blijven de meeste deuren in {city} vandaag dicht.",
   "Buiten hangt {weather}; binnen zoekt iedereen naar houvast.",
   "Zo'n {part} met {weather} maakt de mensen niet spraakzamer."
  ],
  "sub.sfeer.zaak": [
   "Dat verhaal over {public} gelooft bijna niemand meer echt.",
   "Wat er rond {victim} is gebeurd, raakt het hele stadje.",
   "Bij {crimeloc} lopen de mensen nu met een boog omheen.",
   "Iedereen kende {victim} wel van gezicht, dat maakt het zo wrang."
  ],
  "talk.warm.open": [
   "Fijn dat je even langskomt. Het is een rare tijd, maar samen houden we het vol.",
   "Ga zitten, ga zitten! Je ziet eruit alsof je een rustig moment wel kunt gebruiken.",
   "Ik hoorde al dat je rondvraagt. Goed zo. Iemand moet het doen.",
   "Als je iets nodig hebt, kom je maar bij mij. Dat meen ik.",
   "Weet je wat ik zo mooi vind? Dat je je er niet bij neerlegt.",
   "{@sub.groet.open} {@sub.blik.warm}",
   "{@sub.groet.open} {@sub.sfeer.stad} Maar jij laat je niet afschrikken."
  ],
  "talk.warm.gesloten": [
   "Ik ben niet zo'n prater. Maar je bent welkom.",
   "Het is goed dat jij het bent. Bij jou weet ik waar ik aan toe ben.",
   "Ik zeg niet veel. Maar ik zie dat je je best doet.",
   "Blijf maar even. Je hoeft niets te zeggen.",
   "{@sub.groet.gesloten} Maar voor jou maak ik graag een uitzondering.",
   "{@sub.blik.warm} {@sub.sfeer.weer}"
  ],
  "talk.warm.scherp": [
   "Je pakt het goed aan. Laat je door niemand wegsturen.",
   "Eerlijk is eerlijk: je bent slimmer dan de meesten hier.",
   "Doe het grondig. Halve waarheden hebben we hier al genoeg.",
   "Ik vertrouw je. Dat zeg ik niet tegen iedereen.",
   "{@sub.groet.scherp} {@sub.blik.warm}",
   "{@sub.sfeer.zaak} Gelukkig neem jij geen genoegen met praatjes."
  ],
  "talk.warm.peinzend": [
   "Ik denk vaak aan wat er gebeurd is. Jij ook, neem ik aan.",
   "Soms helpt het om gewoon even samen stil te zijn.",
   "Het leven gaat door, zeggen ze. Maar niet altijd in dezelfde richting.",
   "Neem het jezelf niet kwalijk dat je moe bent. Zoeken kost kracht.",
   "Wie geduld heeft, ziet uiteindelijk hoe de dingen in elkaar zitten.",
   "{@sub.groet.peinzend} {@sub.blik.warm}",
   "{@sub.sfeer.weer} {@sub.sfeer.zaak}"
  ],
  "talk.neutral.open": [
   "Goedendag! Druk vandaag, hè. Iedereen heeft wel iets te vertellen.",
   "Het hele stadje praat nergens anders meer over. Je wordt er gek van.",
   "Ach, je weet hoe dat gaat hier. Eerst zwijgt iedereen, dan praat iedereen tegelijk.",
   "Zeg het maar. Ik heb even, als het niet te lang duurt.",
   "Jij bent toch degene die overal vragen stelt? Nou, ga je gang.",
   "{@sub.groet.open} {@sub.sfeer.stad}",
   "{@sub.groet.open} {@sub.blik.neutral}"
  ],
  "talk.neutral.gesloten": [
   "Goedendag.",
   "Ik heb niet veel tijd. Zeg het maar.",
   "Ik doe gewoon mijn werk. Meer kan ik niet.",
   "Hm. Ja. Wat is er?",
   "{@sub.groet.gesloten} {@sub.blik.neutral}",
   "{@sub.groet.gesloten} {@sub.sfeer.weer}"
  ],
  "talk.neutral.scherp": [
   "Kom ter zake, ik heb nog meer te doen vandaag.",
   "Ik hoop dat je weet wat je doet. Er staat veel op het spel.",
   "Vragen stellen kan iedereen. Antwoorden vinden is iets anders.",
   "Je hebt even mijn aandacht. Gebruik het goed.",
   "{@sub.groet.scherp} {@sub.sfeer.zaak}",
   "{@sub.groet.scherp} {@sub.blik.neutral}"
  ],
  "talk.neutral.peinzend": [
   "Een stad is net een huishouden. Iedereen weet iets, niemand weet alles.",
   "Ik kijk liever eerst goed voordat ik iets zeg.",
   "Het is vreemd hoe snel alles weer gewoon voelt. Bijna gewoon.",
   "Er gaat hier meer om dan je zou denken, achter al die deuren.",
   "{@sub.groet.peinzend} {@sub.sfeer.stad}",
   "{@sub.groet.peinzend} {@sub.blik.neutral}"
  ],
  "talk.cold.open": [
   "Wat moet je? Ik sta hier niet de hele dag.",
   "Jij weer. Je komt wel vaak langs, voor iemand die niks verkoopt.",
   "Je stelt veel vragen. Daar wordt niet iedereen vrolijk van.",
   "Ik praat met iedereen, maar met jou nu even niet zo graag.",
   "{@sub.blik.cold} {@sub.sfeer.stad}"
  ],
  "talk.cold.gesloten": [
   "Wat moet je?",
   "Ik heb het druk.",
   "Laat me met rust, alsjeblieft.",
   "Nee. Niet nu.",
   "{@sub.groet.gesloten} {@sub.blik.cold}"
  ],
  "talk.cold.scherp": [
   "Je stelt veel vragen en je geeft weinig terug.",
   "Ik heb geen zin in jouw spelletjes.",
   "Zeg wat je wilt weten, of ga.",
   "Je maakt het jezelf niet makkelijk zo.",
   "{@sub.groet.scherp} {@sub.blik.cold}"
  ],
  "talk.cold.peinzend": [
   "Sommige dingen moet je laten rusten.",
   "Ik weet niet of je hier vindt wat je zoekt.",
   "Je kijkt alsof je al weet wat ik ga zeggen. Waarom kom je dan?",
   "Er zijn vragen die meer kapotmaken dan ze oplossen.",
   "{@sub.groet.peinzend} {@sub.blik.cold}"
  ],
  "talk.hostile.open": [
   "Jij hebt al genoeg overhoop gehaald. Ga een ander lastigvallen.",
   "Iedereen weet wat jij over mij rondvertelt. Schaam je.",
   "O, daar is de grote speurder weer. Nee, dank je.",
   "{@sub.blik.hostile} En laat je gezicht niet meer zien in {here}."
  ],
  "talk.hostile.gesloten": [
   "Ik heb je niets te zeggen.",
   "Ga weg.",
   "Laat me.",
   "{@sub.blik.hostile}"
  ],
  "talk.hostile.scherp": [
   "Kom niet dichterbij. Ik heb niks met jou te bespreken.",
   "Ik vergeet niet hoe je me behandeld hebt.",
   "Nog één vraag en ik laat je de deur wijzen.",
   "{@sub.blik.hostile} Ik ben klaar met jouw vragen."
  ],
  "talk.hostile.peinzend": [
   "Ik dacht dat je anders was. Ik vergiste me.",
   "Er is niets wat je nu kunt zeggen dat het goedmaakt.",
   "Ga maar. Hier valt voor jou niets meer te halen.",
   "{@sub.groet.peinzend} {@sub.blik.hostile}"
  ],
  "voice.kort.open": [
   "Kort dan.",
   "Hm."
  ],
  "voice.kort.close": [
   "Klaar.",
   "Meer niet."
  ],
  "voice.omweg.open": [
   "Tja, hoe zal ik het zeggen.",
   "Het is maar hoe je het bekijkt."
  ],
  "voice.omweg.close": [
   "Of niet, natuurlijk.",
   "Maar dat is maar één manier om het te zien."
  ],
  "voice.vraag.open": [
   "Wat wil je horen?",
   "Weet je het zeker?"
  ],
  "voice.vraag.close": [
   "Waarom wil je dat eigenlijk weten?",
   "Wat denk jij zelf?",
   "Is dat wat je zoekt?"
  ],
  "voice.zacht.open": [
   "Even denken…",
   "Nou…"
  ],
  "voice.zacht.close": [
   "Zo is het.",
   "Ja. Zo."
  ],
  "voice.spreekwoord.open": [
   "Zoals ze zeggen: wie het kleine niet eert, is het grote niet weerd.",
   "Een goed begin is het halve werk."
  ],
  "voice.spreekwoord.close": [
   "Geen rook zonder vuur.",
   "Stille wateren hebben diepe gronden.",
   "Wat niet weet, wat niet deert. Zeggen ze."
  ],
  "voice.snel.open": [
   "Ja, nee, wacht.",
   "Goed, luister, het zit zo."
  ],
  "voice.snel.close": [
   "Nee, laat maar, je snapt het wel.",
   "En dan nog iets, maar dat ben ik nu kwijt."
  ],
  "voice.beleefd.open": [
   "Als ik zo vrij mag zijn:",
   "Met alle respect:"
  ],
  "voice.beleefd.close": [
   "Ik hoop dat ik daarmee van dienst ben.",
   "Dank voor je geduld."
  ],
  "voice.bijnaam.open": [
   "Ach, {nick}.",
   "Hé, {nick}."
  ],
  "voice.bijnaam.close": [
   "Hè, {nick}?",
   "Toch, {nick}?"
  ],
  "voice.formeel.open": [
   "Ik zal het zakelijk zeggen.",
   "Voor de goede orde:"
  ],
  "voice.formeel.close": [
   "Dat is alles wat ik daarover kwijt wil.",
   "Ik vertrouw erop dat dit tussen ons blijft."
  ],
  "voice.droog.open": [
   "Nou, dat is ook wat.",
   "Verrassing."
  ],
  "voice.droog.close": [
   "Maar goed, wat weet ik ervan.",
   "Ik lach me een bult. Niet dus."
  ],
  "voice.fluister.open": [
   "Zachtjes, hè.",
   "Niet zo hard."
  ],
  "voice.fluister.close": [
   "Maar dat heb je niet van mij.",
   "Zeg het niet verder."
  ],
  "voice.luid.open": [
   "Luister!",
   "Ik zeg het je recht in je gezicht:"
  ],
  "voice.luid.close": [
   "Zo! Dat is eruit.",
   "En dat meen ik!"
  ],
  "nick.man": [
   "vriend"
  ],
  "nick.vrouw": [
   "vriendin"
  ],
  "evade.cold": [
   "Daar wil ik het nu niet over hebben.",
   "Misschien een andere keer.",
   "Ik weet niet waar je het over hebt.",
   "Dat is niet iets om hier te bespreken.",
   "Vraag het een ander. Ik weet er niks van."
  ],
  "evade.hostile": [
   "Waarom zou ik dat aan jou vertellen?",
   "Dat gaat je niets aan.",
   "Van mij hoor je niks. Helemaal niks.",
   "Denk je nou echt dat ik jou iets ga vertellen?"
  ],
  "crime.culprit.close": [
   "Ik help je, dat weet je. Maar kijk eens naar {suspA}. Die had al lang ruzie met {victim}.",
   "Ik wil niemand beschuldigen, maar {suspA} gedroeg zich de laatste tijd vreemd. Let daar eens op.",
   "Jij en ik, wij komen hier wel uit. Begin bij {suspA}, als je het mij vraagt.",
   "Ik maak me zorgen om jou. Wees voorzichtig met {suspA}, die is niet wie je denkt."
  ],
  "crime.culprit.distant": [
   "Een treurige zaak. Ik hoop dat het snel tot rust komt; de stad heeft er niets aan.",
   "Wat er met {victim} gebeurd is, is erg. Maar het leven moet door, nietwaar?",
   "Ik kende {victim} nauwelijks. Een beleefde groet, meer niet.",
   "Laat de zaak toch rusten. Wie wordt er beter van als je blijft graven?"
  ],
  "crime.culprit.sharp": [
   "\"Waarom vraag je dat zo?\" {first} herstelt zich snel, maar je ziet het: {clue}",
   "{first} lacht even, te hard. \"Wat een vraag.\" Toch blijft er iets hangen: {clue}",
   "\"Ik weet niet wat je bedoelt.\" {first} kijkt weg, en in die beweging zit iets: {clue}"
  ],
  "crime.suspect.sharp": [
   "Goed dan, ik had mijn redenen om boos te zijn op {victim}. Maar boos zijn is iets anders dan dit.",
   "Ja, we hadden ruzie. Iedereen weet dat. Dat maakt mij nog geen schurk.",
   "Je denkt het te weten, hè? Je weet niks. Ik heb {victim} niets aangedaan."
  ],
  "crime.suspect.calm": [
   "Iedereen kijkt naar mij, dat voel ik heus. Maar ik heb {victim} niets aangedaan.",
   "Ik weet hoe het eruitziet. Maar wat je ziet, is niet altijd wat er is.",
   "Ik had mijn meningsverschillen met {victim}, maar ik wens niemand zoiets toe."
  ],
  "crime.confidant": [
   "Er klopt iets niet aan het officiële verhaal. {victim} was niet iemand die zomaar in zoiets verzeild raakte.",
   "Ik kende {victim} beter dan de meesten. Er zat iemand achter, dat weet ik zeker.",
   "Zoek verder dan het voor de hand liggende. {victim} had meer vijanden dan de vrienden wisten.",
   "{victim} vertrouwde me dingen toe. Niet alles, maar genoeg om te weten dat dit geen toeval is."
  ],
  "crime.general": [
   "Men zegt dat het {public} was. Ik weet het niet.",
   "Ik weet er weinig van. Maar het hele stadje is ervan in de war.",
   "Arme {victim}. Meer kan ik er niet van zeggen.",
   "In {city} gebeurt nooit iets, zeiden we altijd. Nou, nu wel.",
   "Ik heb {victim} die week nog gezien. Er was niets aan de hand, dacht ik.",
   "{@sub.sfeer.zaak} Als {role} hoor ik van alles, maar het fijne weet ik er niet van.",
   "{@sub.sfeer.stad} Men houdt het op {public}, maar wie gelooft dat nog?"
  ],
  "alibi.plain": [
   "Ik was in {place}, zoals altijd. {other} kan dat bevestigen.",
   "{place}, de hele avond. Vraag het {other} maar.",
   "Waar ik altijd ben: in {place}. {other} was er ook.",
   "Ik ben niet weg geweest uit {place}. {other} zat bij me.",
   "Die avond? Gewoon in {place}, samen met {other}."
  ],
  "alibi.hostileLead": [
   "\"Dat gaat je niets aan.\" Toch voegt {hij} er na een stilte aan toe:",
   "\"Waarom zou ik dat aan jou vertellen?\" Even later zegt {hij} het toch:",
   "Een lange stilte. \"Goed dan,\" zegt {hij} met tegenzin."
  ],
  "alibi.culpritClaim": [
   "Ik was die avond in {place}, met {other}. Vraag het maar na.",
   "{place}, de hele avond. {other} was erbij, die kan het je vertellen.",
   "Die avond zat ik in {place}, samen met {other}. Daar ben ik niet weggeweest."
  ],
  "alibi.secretClaim": [
   "Ik was de hele avond thuis. Alleen, helaas.",
   "Thuis. Niemand heeft me gezien, maar zo is het.",
   "Ik ben vroeg naar bed gegaan. Er is niemand die dat kan bevestigen."
  ],
  "alibi.secretReveal": [
   "{first} zucht en vertelt het dan toch: {hij} {secret}. Daarom zat {hij} die avond in {regloc}. Met de zaak heeft het niets te maken, en het klinkt waar.",
   "Het komt er langzaam uit. {first} {secret}, en daarom was {hij} die avond in {regloc}. Beschamend, maar onschuldig.",
   "{first} kijkt naar de grond. Ik wilde niet dat iemand het wist, zegt {hij}. {Hij} {secret}; zo kwam {hij} in {regloc} terecht. Je gelooft het."
  ],
  "alibi.check.yes": [
   "Ja, {x} was die avond bij mij in {place}. Tot laat, dat weet ik zeker.",
   "Dat klopt. {x} en ik zaten samen in {place}, de hele avond.",
   "Zeker. {x} is die avond niet bij me weggeweest."
  ],
  "alibi.check.no": [
   "Bij mij? Nee. Ik heb {x} die avond helemaal niet gezien.",
   "Dat zegt {x}? Vreemd. Ik was in {place}, maar {x} was er niet.",
   "Nee. Ik weet niet waarom {x} dat zegt, maar het is niet waar."
  ],
  "ev.hook.text": [
   "{v} werd voor het laatst gezien bij {loc}, rond {hour} uur.",
   "Het laatste spoor van {v} voert naar {loc}, rond {hour} uur.",
   "Rond {hour} uur was {v} nog bij {loc}. Daarna weet niemand het."
  ],
  "ev.hook.present": [
   "Het voorval speelde zich af bij {loc}, rond {hour} uur. Daar begint het spoor.",
   "Rond {hour} uur die avond, bij {loc}, ging het mis voor {v}.",
   "Alles draait om die avond bij {loc}. Rond {hour} uur gebeurde wat {v} nu zo zwaar treft."
  ],
  "ev.notebook.title": [
   "Notitieboek van {v}"
  ],
  "ev.notebook.item": [
   "het notitieboek van {v}"
  ],
  "ev.notebook.text": [
   "In de aantekeningen van {v} staat voor de bewuste avond een afspraak. De naam is doorgehaald, maar de beginletter is nog leesbaar: {initial}. In de kantlijn staan twee plekken: {locA} en {locB}.",
   "Op de bladzijde van die avond heeft {v} één letter geschreven en omcirkeld: {initial}. Daaronder, haastig: {locA}, {locB}.",
   "{v} noteerde voor die avond een afspraak met iemand van wie alleen de beginletter nog leesbaar is: {initial}. Op de achterkant staan {locA} en {locB}, met een streep eronder."
  ],
  "ev.notebook.textSame": [
   "In de aantekeningen van {v} staat voor de bewuste avond een afspraak. De naam is doorgehaald, maar de beginletter is nog leesbaar: {initial}. In de kantlijn staat één plek, twee keer onderstreept: {locA}.",
   "Op de bladzijde van die avond heeft {v} één letter geschreven en omcirkeld: {initial}. Daaronder, haastig en twee keer: {locA}.",
   "{v} noteerde voor die avond een afspraak met iemand van wie alleen de beginletter nog leesbaar is: {initial}. Op de achterkant staat {locA}, dik onderstreept."
  ],
  "ev.lead.trace.title": [
   "Werkspoor bij de stukken van {v}"
  ],
  "ev.lead.trace.item": [
   "een opvallend ambachtsspoor"
  ],
  "ev.lead.trace.text": [
   "Tussen de spullen van {v} vind je een strookje met een paraaf: {initial}. Daaronder heeft {v} twee plekken aangestreept: {locA} en {locB}.",
   "Iemand heeft hier kort voor het voorval sporen achtergelaten, en een gekreukt kaartje met de letter {initial}. Daarnaast ligt een lijstje van {v} met twee plekken: {locA} en {locB}."
  ],
  "ev.lead.trace.textSame": [
   "Tussen de spullen van {v} vind je een strookje met een paraaf: {initial}. Daaronder heeft {v} één plek twee keer onderstreept: {locA}.",
   "Iemand heeft hier kort voor het voorval sporen achtergelaten, en een gekreukt kaartje met de letter {initial}. Daarnaast ligt een notitie van {v} die naar {locA} verwijst."
  ],
  "ev.lead.dossier.title": [
   "Uitgescheurd kasblad van {v}"
  ],
  "ev.lead.dossier.item": [
   "een map met een doordrukvel"
  ],
  "ev.lead.dossier.text": [
   "Uit een map van {v} is haastig een blad gescheurd. Op het onderliggende vel zijn de doorgedrukte letter {initial} en twee plekken waar afschriften liggen nog net te ontcijferen: {locA} en {locB}.",
   "Iemand heeft geprobeerd het dossier van {v} te zuiveren. Toch staat in de kantlijn nog de beginletter {initial}, met een verwijzing naar bewijsmateriaal in {locA} en {locB}."
  ],
  "ev.lead.dossier.textSame": [
   "Uit een map van {v} is haastig een blad gescheurd. Op het onderliggende vel zijn de doorgedrukte letter {initial} en de bewaarplek {locA} nog net te ontcijferen.",
   "Iemand heeft geprobeerd het dossier van {v} te zuiveren. Toch staat in de kantlijn nog de beginletter {initial}, met een dubbele verwijzing naar {locA}."
  ],
  "ev.lead.letter.title": [
   "Onverzonden brief van {v}"
  ],
  "ev.lead.letter.item": [
   "een onverzonden brief"
  ],
  "ev.lead.letter.text": [
   "Een onverzonden brief in het handschrift van {v}: Ik weet eindelijk wat er speelt en wat er bewaard wordt in {locA} en {locB}. Vanavond spreek ik {initial}. er persoonlijk op aan.",
   "Een dichtgevouwen brief van {v}, nog niet verstuurd. De aanhef begint met de letter {initial}, en in de tekst noemt {v} twee plekken waar de waarheid te vinden is: {locA} en {locB}."
  ],
  "ev.lead.letter.textSame": [
   "Een onverzonden brief in het handschrift van {v}: Ik weet eindelijk wat er in {locA} verborgen wordt gehouden. Vanavond spreek ik {initial}. er persoonlijk op aan.",
   "Een dichtgevouwen brief van {v}, nog niet verstuurd. De aanhef begint met de letter {initial}, en {v} noemt {locA} als de plek waar alles samenkomt."
  ],
  "ev.lead.mistake.title": [
   "Het vergeten detail bij {v}"
  ],
  "ev.lead.mistake.item": [
   "een over het hoofd gezien briefje"
  ],
  "ev.lead.mistake.text": [
   "Alles is met bijna perfecte zorg opgeruimd, op één kleine misrekening na: achter de rand bleef een strookje haken met de beginletter {initial} en de plekken {locA} en {locB}.",
   "Wie hier na het voorval opruimde, dacht aan alles behalve dit: een vergeten aantekening van {v} met de letter {initial} en twee namen van plekken: {locA} en {locB}."
  ],
  "ev.lead.mistake.textSame": [
   "Alles is met bijna perfecte zorg opgeruimd, op één kleine misrekening na: achter de rand bleef een strookje haken met de beginletter {initial} en de plek {locA}.",
   "Wie hier na het voorval opruimde, dacht aan alles behalve dit: een vergeten aantekening van {v} met de letter {initial} en één dik onderstreepte plek: {locA}."
  ],
  "ev.witness.title": [
   "Wat {first} die avond zag"
  ],
  "ev.witness.text": [
   "Rond {hour} uur zag ik iemand bij {loc}. Het was te donker voor een gezicht, maar die persoon had {trait}.",
   "Ik weet het zeker: rond {hour} uur liep er iemand bij {loc}, met {trait}. Man of vrouw kon ik niet zien.",
   "Rond {hour} uur, bij {loc}. Een gestalte in de schaduw, met {trait}. Ik heb het niemand verteld, tot nu."
  ],
  "ev.motiveTalk.title": [
   "Wat {first} weet over een motief"
  ],
  "ev.alibiBreak.title": [
   "Het alibi van {cfirst} valt om"
  ],
  "ev.denial.title": [
   "{first} spreekt het alibi van {cfirst} tegen"
  ],
  "ev.twist.planted.title": [
   "Belastend briefje over {first}"
  ],
  "ev.twist.planted.item": [
   "een belastend briefje"
  ],
  "ev.twist.planted.text": [
   "Tussen {obj} ligt een briefje dat naar {a} wijst: de naam {a} en het uur van het voorval. Opvallend: de naam staat er in een ander handschrift dan de paraaf eronder, een {initial}.",
   "Een notitie die {a} lijkt te beschuldigen, keurig opgevouwen bij {obj}. Wie goed kijkt, ziet onderaan een paraaf die niet van {a} kan zijn: {initial}.",
   "Bij {obj} vind je een stuk dat {a} in een kwaad daglicht zet. Het ligt er bijna te netjes. In de hoek staat een kleine paraaf: {initial}."
  ],
  "ev.twist.accomplice.title": [
   "Het alibi van {cfirst} rammelt"
  ],
  "ev.twist.accomplice.text": [
   "In {obj} van {place} staat wie er die avond rond {hour} uur was: {comp} wel, {c} niet. Iemand heeft voor {c} gelogen.",
   "Volgens {obj} van {place} was {comp} er die avond, maar van {c} is geen spoor. Het alibi dat {comp} bevestigde, klopt niet.",
   "De aantekeningen in {obj} van {place} laten geen ruimte voor twijfel: {c} was daar die avond niet. {comp} heeft voor {c} gelogen."
  ],
  "ev.alibiBreak.text": [
   "{c} zei die avond in {other} te zijn, maar {witness} weet daar niets van. Onder druk geeft {c} toe: rond {hour} uur was {hij} bij {loc}.",
   "Het verhaal over {other} houdt geen stand. {witness} was er wel, {c} niet. Uiteindelijk geeft {c} toe dat {hij} rond {hour} uur bij {loc} was.",
   "{c} houdt nog even vast aan {other}, maar met de verklaring van {witness} erbij valt het alibi om: rond {hour} uur was {hij} bij {loc}."
  ],
  "ev.red.letter.title": [
   "Boze brief van {first}"
  ],
  "ev.red.letter.item": [
   "een boze brief"
  ],
  "ev.red.letter.text": [
   "Een brief van {a} aan {v}, over een oude ruzie. De laatste regel is een waarschuwing: dit zal {v} nog berouwen.",
   "{a} schreef {v} een brief vol verwijten over geld en eer. Onderaan staat: dit laat ik niet zomaar gebeuren.",
   "Een brief van {a}, met harde woorden aan {v}. Wie hem leest, ziet iemand die tot veel bereid was."
  ],
  "ev.red.register.title": [
   "Notitie over {first}"
  ],
  "ev.red.register.text": [
   "In {obj} van {regloc} staat {b} die avond genoteerd, rond {hour} uur. {Hij} was dus niet thuis.",
   "{obj} van {regloc} vermeldt {b}, die avond rond {hour} uur. Dat strookt niet met wat iedereen aanneemt.",
   "Tussen de namen in {obj} van {regloc} staat ook {b}: die avond, rond {hour} uur. Dus niet thuis."
  ],
  "ev.red.gossip.title": [
   "Roddel over {first}"
  ],
  "ev.red.gossip.text": [
   "Ik zeg niets, maar {a} had {v} al maanden in het vizier. {a} zou er alles voor overhebben om {v} te zien vallen.",
   "Je hebt het niet van mij, maar {a} en {v} konden elkaar niet luchten. Ik heb {a} horen zeggen dat het een keer afgelopen moest zijn.",
   "Vraag eens naar {a}. Die had nog een rekening openstaan met {v}, en dat was geen kleine."
  ],
  "ev.motive.geld.title": [
   "Schuldbekentenis"
  ],
  "ev.motive.geld.item": [
   "een schuldbekentenis"
  ],
  "ev.motive.geld.text": [
   "Een schuldbekentenis op naam van {c}, met een bedrag dat niemand zomaar kan opbrengen. {v} was de schuldeiser.",
   "Een schuldbekentenis, getekend door {c}. De aflossing is al twee keer uitgesteld, en {v} wilde niet langer wachten.",
   "Onder een stapel papieren: een schuldbekentenis van {c} aan {v}. In de marge staat in een andere hand: laatste termijn."
  ],
  "ev.motive.geld.talk": [
   "{c} stond diep in het krijt bij {v}. Bijna niemand wist het, maar ik heb ze er een keer over horen ruziën.",
   "{v} had geld uitgeleend aan {c}. Veel geld. En {v} wilde het terug, liefst gisteren.",
   "Ik zou het niet moeten zeggen, maar {c} zat financieel klem. En {v} had de touwtjes in handen."
  ],
  "ev.motive.liefde.title": [
   "Verborgen brief"
  ],
  "ev.motive.liefde.item": [
   "een verborgen brief"
  ],
  "ev.motive.liefde.text": [
   "Een brief zonder afzender, in het handschrift van {c}. Er staat in dat {c} het niet kan verdragen dat {v} tussen {c} en een geliefde in staat.",
   "Een liefdesbrief van {c}, nooit verstuurd. Halverwege verandert de toon: {v} wordt genoemd als degene die alles kapotmaakt.",
   "Een opgevouwen brief van {c} aan een geliefde. Eén zin is drie keer onderstreept: zolang {v} er is, kan het niet."
  ],
  "ev.motive.liefde.talk": [
   "{c} hield van iemand die niet vrij was. {v} stond daar tussenin. Zoiets vreet aan een mens.",
   "Ik heb {c} zien kijken als die twee samen waren. {v} was in de weg, zo voelde {c} het.",
   "Jaloezie. Het is een lelijk woord, maar {c} was er vol van, en het ging om {v}."
  ],
  "ev.motive.schaamte.title": [
   "Oud register"
  ],
  "ev.motive.schaamte.item": [
   "een oud register"
  ],
  "ev.motive.schaamte.text": [
   "In een oud register staat een aantekening over {c} die niemand mocht zien. {v} had het register kort geleden nog ingezien.",
   "Een oud register met een bladzijde die iemand heeft willen losmaken. Daarop de naam van {c} en een voorval van lang geleden. {v} had er een bladwijzer in gelegd.",
   "Een register met de naam van {c} bij een oude, beschamende kwestie. In de kantlijn staan de initialen van {v}, nog niet lang geleden geschreven."
  ],
  "ev.motive.schaamte.talk": [
   "{v} had iets ontdekt over het verleden van {c}. Iets waar {c} zich diep voor schaamt.",
   "Er is iets van vroeger. Over {c}. {v} wist ervan en liet dat merken.",
   "{c} heeft ooit iets gedaan wat niemand mocht weten. {v} dreigde het te vertellen, geloof ik."
  ],
  "ev.motive.bescherming.title": [
   "Afgescheurd briefje"
  ],
  "ev.motive.bescherming.item": [
   "een afgescheurd briefje"
  ],
  "ev.motive.bescherming.text": [
   "Een briefje van {c}: niemand mag het weten, ik regel het. Het is geschreven om iemand anders uit de wind te houden.",
   "Een half afgescheurd briefje in de hand van {c}. Wat er nog staat: maak je geen zorgen, {v} zal niets zeggen.",
   "Een briefje van {c} aan een naaste: ik bescherm je, wat het ook kost. De naam van {v} is doorgestreept."
  ],
  "ev.motive.bescherming.talk": [
   "{c} zou alles doen om één persoon te beschermen. Echt alles. En {v} wist wie dat was.",
   "{v} kon iemand uit de familie van {c} veel schade doen. {c} zou dat nooit laten gebeuren.",
   "Voor {c} gaat de familie boven alles. {v} vergat dat, geloof ik."
  ],
  "ev.motive.wraak.title": [
   "Vergeeld verslag"
  ],
  "ev.motive.wraak.item": [
   "een vergeeld verslag"
  ],
  "ev.motive.wraak.text": [
   "Een oud verslag van een zaak waarin {c} jaren geleden onrecht werd aangedaan. De naam van {v} staat er ook in.",
   "Een vergeeld verslag: {v} getuigde destijds tegen {c}, en die getuigenis bleek later niet te kloppen.",
   "Een verslag van lang geleden. {c} verloor toen alles, en het besluit werd genomen door {v}."
  ],
  "ev.motive.wraak.talk": [
   "{c} is nooit vergeten wat {v} toen heeft gedaan. Dat heb ik altijd geweten.",
   "Er is een oude rekening tussen {c} en {v}. Van jaren terug. Zoiets verjaart niet, voor sommige mensen.",
   "{v} heeft {c} ooit diep gekrenkt. {c} zei toen: ooit zet ik het recht."
  ],
  "ev.motive.macht.title": [
   "Concept-benoeming"
  ],
  "ev.motive.macht.item": [
   "een concept-benoeming"
  ],
  "ev.motive.macht.text": [
   "Een concept van een benoeming. Zonder {v} in de weg zou de plek naar {c} gaan.",
   "Een ontwerpbesluit over een belangrijke post. De naam van {v} is doorgestreept, die van {c} staat erbij geschreven.",
   "Een stuk over de opvolging in het bestuur. Als {v} terugtreedt, is {c} de enige kandidaat. Iemand heeft dat onderstreept."
  ],
  "ev.motive.macht.talk": [
   "{c} wilde die positie al jaren. {v} stond in de weg, zo simpel is het.",
   "Macht, daar gaat het om. {c} wilde de baas worden, en {v} was dat al.",
   "{v} zou {c} nooit laten opklimmen. Dat zei {v} hardop, op een vergadering. {c} zat erbij."
  ],
  "ev.motive.angst.title": [
   "Dreigbrief"
  ],
  "ev.motive.angst.item": [
   "een dreigbrief"
  ],
  "ev.motive.angst.text": [
   "Een dreigbrief, gericht aan {c}. Iemand had {c} al lange tijd in de tang, en alles wijst naar {v}.",
   "Een stapel briefjes aan {c}, steeds dwingender van toon. Het handschrift is dat van {v}.",
   "Een brief aan {c} met eisen en een termijn. Onderaan staat geen naam, maar wel het merkteken van {v}."
  ],
  "ev.motive.angst.talk": [
   "{c} was bang. Al maanden. Ik dacht altijd dat het met {v} te maken had.",
   "{v} had iets in handen tegen {c}. Je zag {c} krimpen als {v} binnenkwam.",
   "{c} sliep slecht, zei {c} zelf. En steeds als ik vroeg waarom, viel de naam {v}."
  ],
  "ev.motive.erfenis.title": [
   "Kopie van het testament"
  ],
  "ev.motive.erfenis.item": [
   "een kopie van het testament"
  ],
  "ev.motive.erfenis.text": [
   "Een kopie van het testament van {v}. Een recente wijziging schuift het grootste deel van het bezit naar {c}.",
   "Het testament van {v}, met een aanvulling van kort geleden. Wie er het meest op vooruitgaat: {c}.",
   "Een afschrift van de laatste wil van {v}. Eén regel is nieuw, en die regel maakt {c} rijk."
  ],
  "ev.motive.erfenis.talk": [
   "Weet je wie er beter van wordt? {c}. Het testament van {v} is kort geleden nog veranderd.",
   "{v} wilde het testament wijzigen, en niet in ieders voordeel. {c} wist dat.",
   "Volg het bezit. Het komt allemaal bij {c} terecht. Toevallig, hè?"
  ],
  "ev.method.tijd.title": [
   "Bon met tijdstip"
  ],
  "ev.method.tijd.item": [
   "een bon met een tijdstip"
  ],
  "ev.method.tijd.text": [
   "Een ontvangstbewijs met een tijdstip, afgetekend met de paraaf {initial}. Het uur valt precies op de avond van het voorval.",
   "Een ontvangstbewijs met het uur erop. Onderaan staat alleen een beginletter: {initial}. Wie dit tekende, was die avond in de buurt.",
   "Een getekend bewijs van een levering, met tijd en al. De handtekening is onleesbaar, op de eerste letter na: {initial}."
  ],
  "ev.method.identiteit.title": [
   "Jas met vreemde naam"
  ],
  "ev.method.identiteit.item": [
   "een jas met een vreemde naam"
  ],
  "ev.method.identiteit.text": [
   "Een kledingstuk met de naam van een ander erin. In de voering is een letter geborduurd: {initial}. Iemand liep die avond in andermans kleren rond.",
   "Een geleend kledingstuk, nog vochtig van de avond. In de zak zit een kaartje met de letter {initial}.",
   "Andermans kleren, opgevouwen en weggestopt. Op het label staat met inkt een beginletter bijgeschreven: {initial}."
  ],
  "ev.method.documenten.title": [
   "Oefenvel met handtekeningen"
  ],
  "ev.method.documenten.item": [
   "een oefenvel met handtekeningen"
  ],
  "ev.method.documenten.text": [
   "Een vel vol geoefende handtekeningen van {v}. In de hoek staat de paraaf van de oefenaar zelf: {initial}.",
   "Een kladvel waarop iemand keer op keer de handtekening van {v} heeft nagebootst. Onderaan, uit gewoonte, een eigen beginletter: {initial}.",
   "Proefversies van een officieel stuk met de naam van {v} eronder. Op de achterkant staat een notitie, getekend met {initial}."
  ],
  "ev.method.afleiding.title": [
   "Aankondiging van een opstootje"
  ],
  "ev.method.afleiding.item": [
   "een aankondiging van een opstootje"
  ],
  "ev.method.afleiding.text": [
   "Een briefje dat een opstootje elders aankondigt, precies op het cruciale moment. Het is ondertekend met de letter {initial}.",
   "Een aantekening die iemand vraagt om op een vast uur een scène te maken op een andere plek. Onderaan staat: {initial}.",
   "Een kladje met een plan voor drukte aan de andere kant van de stad, op het uur dat het ertoe deed. Getekend met één letter: {initial}."
  ],
  "ev.method.vertrouwen.title": [
   "Reservesleutel"
  ],
  "ev.method.vertrouwen.item": [
   "een reservesleutel"
  ],
  "ev.method.vertrouwen.text": [
   "Een reservesleutel van {v}. Er waren er maar twee, en aan deze hangt een label met de letter {initial}. Er was geen braak, dus wie binnenkwam had toegang.",
   "Een sleutel aan een lint, gemerkt met de naam van {v} en, in een andere hand, de letter {initial}. Ooit uit vertrouwen gegeven en nooit teruggebracht.",
   "De extra sleutel van {v}, die volgens iedereen kwijt was. Hij zat in een envelopje met de beginletter {initial}."
  ],
  "ev.method.plaatsen.title": [
   "Pakpapier"
  ],
  "ev.method.plaatsen.item": [
   "een stuk pakpapier"
  ],
  "ev.method.plaatsen.text": [
   "Het papier waarin het belastende voorwerp verpakt zat. Op de binnenkant staat een merkteken: {initial}. Iemand legde het bewijs bewust bij een ander.",
   "Pakpapier met een kenmerkende vouw en een potloodletter in de hoek: {initial}. Het belastende voorwerp is met opzet neergelegd.",
   "Een stuk pakpapier met een merkteken, de letter {initial}. Het bewijs werd niet gevonden, het werd neergelegd."
  ],
  "ev.method.telefoon.title": [
   "Gespreksnotitie"
  ],
  "ev.method.telefoon.item": [
   "een gespreksnotitie"
  ],
  "ev.method.telefoon.text": [
   "Een notitie van de centrale: die avond werd een gesprek aangevraagd door iemand die tekende met {initial}. Het gesprek is nooit gevoerd.",
   "Een overzicht van gesprekken. Het gesprek dat een alibi moest geven, staat er niet bij. Wel een aanvraag, afgetekend met {initial}.",
   "Een aantekening van de centrale: de lijn was die avond in gebruik door iemand die tekende met {initial}."
  ],
  "ev.method.reis.title": [
   "Reisschema"
  ],
  "ev.method.reis.item": [
   "een reisschema met aantekeningen"
  ],
  "ev.method.reis.text": [
   "Reisaantekeningen, getekend met de letter {initial}. De rit die erop staat, kon die avond onmogelijk.",
   "Een overzicht van vertrektijden met kringetjes en een paraaf: {initial}. Volgens deze aantekeningen was er die avond geen verbinding.",
   "Reisplannen met een doorgestreepte route en de beginletter {initial} in de kantlijn. De reis is nooit gemaakt."
  ],
  "ev.method.onwetend.title": [
   "Opdrachtbriefje"
  ],
  "ev.method.onwetend.item": [
   "een opdrachtbriefje"
  ],
  "ev.method.onwetend.text": [
   "Een opdrachtbriefje aan een loopjongen: iets ophalen, iets afgeven. Ondertekend met {initial}. Klein en onschuldig, maar precies op het verkeerde moment.",
   "Een briefje met een eenvoudige opdracht voor iemand die van niets wist. Het tijdstip zegt genoeg, en de afzender tekende met {initial}.",
   "Een kort berichtje: breng dit vanavond daarheen, en vraag niets. Getekend: {initial}."
  ],
  "ev.method.bericht.title": [
   "Nooit bezorgd bericht"
  ],
  "ev.method.bericht.item": [
   "een nooit bezorgd bericht"
  ],
  "ev.method.bericht.text": [
   "Een bericht aan {v}, nooit bezorgd. Op de omslag staat wie het achterhield: iemand die tekent met {initial}.",
   "Een waarschuwing voor {v} die nooit is aangekomen. Op de achterkant staat een notitie, getekend met {initial}.",
   "Een boodschap aan {v}, met een verkeerd tijdstip erop. De wijziging is geparafeerd met {initial}."
  ],
  "ev.method.onmogelijk.title": [
   "Tweede sleutel"
  ],
  "ev.method.onmogelijk.item": [
   "een tweede sleutel"
  ],
  "ev.method.onmogelijk.text": [
   "Een sleutel die past op een deur die iedereen voor afgesloten hield. Aan het ringetje hangt een plaatje met de letter {initial}.",
   "Een tweede toegang, verborgen achter een kast. Het slot is onlangs gesmeerd, en op het sleutelplaatje staat {initial}.",
   "Een sleutel zonder naam, die precies op de dichte deur past. Alleen een ingekraste letter: {initial}."
  ],
  "crowd.any": [
   "Wat een weer, hè.",
   "Ik bemoei me nergens mee, hoor.",
   "Vroeger was het hier rustiger.",
   "Heb je het al gehoord? Natuurlijk heb je het gehoord.",
   "Een glas bier aan het eind van de dag, meer vraag ik niet.",
   "Iedereen kijkt elkaar ineens anders aan.",
   "Ik heb het druk, maar voor een praatje heb ik altijd tijd.",
   "Mijn moeder zei altijd: wie zwijgt, stemt toe. Dus ik zwijg maar niet.",
   "Je bent niet van hier, of wel? Nou ja, nu een beetje wel.",
   "De nachten zijn onrustig. Iedereen slaapt licht, tegenwoordig.",
   "Ik doe de deur nu twee keer op slot. Voor de zekerheid.",
   "Ik heb niks gezien. Maar ik heb wel wat gehoord. Of was het een droom?",
   "Als je het mij vraagt, weet de halve stad meer dan ze zegt.",
   "Ik hou het bij mijn eigen zaken. Dat is gezonder.",
   "De kinderen spelen weer buiten. Dat is tenminste iets.",
   "Elke dag een nieuw verhaal. Morgen weer een ander.",
   "Je loopt hier steeds rond. Zoek je iets, of iemand?",
   "Iedereen heeft wel een mening. Weinig mensen hebben ook een feit."
  ],
  "crowd.tpl.herberg": [
   "Nog eentje dan, en dan echt naar huis.",
   "Hier wordt meer verteld dan in het raadhuis.",
   "De waard schenkt royaal als er nieuws is. Nu dus heel royaal."
  ],
  "crowd.tpl.markt": [
   "Vers vandaag! Nou ja, vers genoeg.",
   "De prijzen gaan omhoog, de praatjes ook.",
   "Op de markt hoor je alles twee keer: eerst als gerucht, dan als feit."
  ],
  "crowd.tpl.plein": [
   "Op dit plein hoor je alles, als je maar lang genoeg blijft zitten.",
   "Kijk uit waar je loopt, het is glad bij de pomp.",
   "Iedereen komt hier een keer langs. Iedereen."
  ],
  "crowd.tpl.huis": [
   "De gordijnen gaan hier vroeg dicht, tegenwoordig.",
   "Buren zien meer dan ze zeggen.",
   "Ik hoor door de muren alles. Niet dat ik luister, hoor."
  ],
  "crowd.tpl.kantoor": [
   "Formulieren, formulieren. En niemand die ze leest.",
   "Kom morgen maar terug, zeggen ze altijd.",
   "Hier ligt alles vast, behalve wat ertoe doet."
  ],
  "crowd.tpl.haven": [
   "Het tij wacht op niemand.",
   "Er komt hier van alles aan land. Ook verhalen.",
   "Op de kade zie je wie er komt en wie er vertrekt."
  ],
  "crowd.tpl.poort": [
   "Wie hier langs komt, zie ik. Wie hier niet langs komt, ook.",
   "Papieren graag. Grapje. Of niet.",
   "'s Avonds is het hier stil. Te stil, soms."
  ],
  "crowd.tpl.werkplaats": [
   "Handen bezig houden, dan piekert het hoofd minder.",
   "Mijn baas wil geen geklets onder werktijd.",
   "Het gereedschap praat niet. Daarom werk ik hier graag."
  ],
  "crowd.tpl.archief": [
   "Sst. Ze zijn hier streng.",
   "Alles wat er ooit gebeurd is, staat ergens op papier.",
   "Er zijn hier mensen die al dagen in hetzelfde boek bladeren."
  ],
  "crowd.tpl.park": [
   "Hier kom ik om even nergens aan te denken.",
   "De eenden weten meer dan je denkt.",
   "Op een bank als deze hoor je de stad, zonder dat de stad jou hoort."
  ],
  "crowd.tpl.straat": [
   "Loop maar door, er is niks te zien.",
   "Het wordt vroeg donker, deze dagen.",
   "In deze straat gaat niets onopgemerkt."
  ],
  "crowd.role.stamgast": [
   "Ik zit hier al dertig jaar op dezelfde kruk. Ik heb alles zien gebeuren.",
   "De waard weet meer dan hij zegt. Maar ik weet meer dan de waard."
  ],
  "crowd.role.dienster": [
   "Ik schenk alleen in. Wat ik hoor, hoor ik toevallig.",
   "Sommige gasten praten meer als het glas halfleeg is."
  ],
  "crowd.role.kaartspeler": [
   "Ik speel om plezier, niet om geld. Meestal.",
   "Wie goed kaart, ziet wie er bluft. En hier bluft iedereen."
  ],
  "crowd.role.reiziger": [
   "Ik ben hier maar op doorreis. Gelukkig maar, zou ik zeggen.",
   "Waar ik vandaan kom, praten ze er ook al over."
  ],
  "crowd.role.marktkoopman": [
   "Koop wat, dan vertel ik je wat ik weet. Grapje. Half.",
   "Achter de kraam hoor je meer dan ervoor."
  ],
  "crowd.role.groenteboer": [
   "Mijn kolen zijn vers, de geruchten ook.",
   "Ik weeg groenten, geen woorden."
  ],
  "crowd.role.visverkoper": [
   "Vis van vanochtend! En een verhaal van gisteren.",
   "Mijn vis is eerlijk. Over de rest van de markt zeg ik niks."
  ],
  "crowd.role.klant_met_een_mand": [
   "Ik kom alleen voor brood. En voor nieuws.",
   "Ik moet opschieten, thuis wachten ze op het eten."
  ],
  "crowd.role.straatveger": [
   "Ik veeg alles op. Ook wat mensen verliezen.",
   "Je zou schrikken wat ik 's ochtends op straat vind."
  ],
  "crowd.role.voorbijganger": [
   "Ik loop maar even door. Prettige dag.",
   "Sorry, ik heb haast. Iedereen heeft haast, tegenwoordig."
  ],
  "crowd.role.oude_man_op_een_bank": [
   "Ik heb zoveel zien komen en gaan. Dit gaat ook voorbij.",
   "Toen ik jong was, gebeurde hier nooit wat. Of we zagen het niet."
  ],
  "crowd.role.waterhaalster": [
   "Bij de pomp wordt het meest gepraat.",
   "Elke ochtend twee emmers, en elke ochtend een nieuw verhaal."
  ],
  "crowd.role.buurvrouw": [
   "Ik kijk niet naar buiten. Nou ja, af en toe.",
   "Die van hiernaast is sinds die avond niet meer zichzelf."
  ],
  "crowd.role.buurman": [
   "Ik heb mijn eigen zorgen, hoor.",
   "'s Avonds hoor ik voetstappen. Ik kijk niet meer."
  ],
  "crowd.role.bode": [
   "Ik breng alleen boodschappen rond. Lezen doe ik ze niet. Meestal.",
   "Ik ben de hele dag onderweg. Ik zie veel deuren open- en dichtgaan."
  ],
  "crowd.role.klerk_in_pauze": [
   "Even pauze. Vijf minuten zonder papier.",
   "Op kantoor fluistert iedereen. Zo kun je niet werken."
  ],
  "crowd.role.havenarbeider": [
   "Sjouwen, sjouwen, en dan wil de baas ook nog dat je niks hoort.",
   "Op de kade blijft niks geheim."
  ],
  "crowd.role.visser": [
   "De zee was onrustig die nacht. De mensen ook.",
   "Ik heb liever vis in mijn net dan geruchten in mijn oren."
  ],
  "crowd.role.sjouwer": [
   "Mijn rug doet zeer, mijn oren niet.",
   "Kisten zeggen niks. Mensen te veel."
  ],
  "crowd.role.wachter": [
   "Ik hou de wacht. Wat ik zie, schrijf ik op.",
   "'s Nachts komt hier bijna niemand langs. Bijna."
  ],
  "crowd.role.voerman": [
   "Ik ken elke weg hier, en elke kuil erin.",
   "Ik vervoer van alles, en ik vraag nooit wat het is."
  ],
  "crowd.role.leerling": [
   "Ik leer het vak nog. En ik leer wie je niet moet tegenspreken.",
   "De meester zegt dat ik te veel praat. Daar heeft de meester gelijk in."
  ],
  "crowd.role.knecht": [
   "Ik doe wat me gezegd wordt. Meer niet.",
   "De baas is sinds die avond kortaf. Iedereen merkt het."
  ],
  "crowd.role.lezer": [
   "Ik lees over vroeger. Dat is rustiger dan nu.",
   "In de boeken staan andere geheimen dan op straat."
  ],
  "crowd.role.kopiist": [
   "Ik schrijf over wat anderen schreven. Soms lees ik ook wat.",
   "Je zou versteld staan welke stukken hier langskomen."
  ],
  "crowd.role.wandelaar": [
   "Ik loop elke dag hetzelfde rondje. Vandaag voelt het anders.",
   "Even de stad uit je hoofd lopen. Lukt niet."
  ],
  "crowd.role.tuinman": [
   "De planten groeien gewoon door. Die hebben er geen last van.",
   "Ik hark de paden, en ik zie wie erover gelopen heeft."
  ],
  "crowd.role.venter": [
   "Wie koopt er wat? Nee? Dan maar een praatje.",
   "Ik loop alle straten af. Ik weet wie er thuis is en wie niet."
  ],
  "crowd.rumor": [
   "Men zegt dat het {public} was. Ik geloof er niks van.",
   "Ze houden het op {public}. Nou, ik weet wel beter. Of niet.",
   "{public}, zeggen ze. Dat zeggen ze altijd als ze het niet weten."
  ],
  "crowd.worry": [
   "{name} loopt er de laatste tijd zorgelijk bij.",
   "Heb je {name} al gesproken? Die ziet er slecht uit, de laatste dagen.",
   "{name} is sinds die avond niet meer de oude."
  ],
  "crowd.guideWitness": [
   "Vraag het {first} maar. {Hij} was die avond laat nog buiten.",
   "{first} liep die avond nog laat rond. Als iemand iets zag, dan {first}.",
   "Als je wilt weten wat er die avond gebeurde, praat dan met {first}."
  ],
  "crowd.guidePapers": [
   "In {loc} liggen vast nog papieren van {victim}.",
   "{victim} hield alles bij op papier. Kijk eens in {loc}.",
   "Volgens mij ligt er bij {loc} nog van alles van {victim}. Niemand heeft er nog naar gekeken."
  ],
  "crowd.quiet": [
   "{name} knikt je toe, maar heeft je vandaag niets nieuws te vertellen.",
   "{name} haalt de schouders op. Alles is al gezegd, vandaag.",
   "{name} glimlacht vaag en praat liever over het weer. Vandaag valt er niets meer te halen."
  ],
  "crowd.sched": [
   "Zoek je {name}? Die zie je hier vaak in de {part}.",
   "{name} komt hier geregeld, meestal in de {part}. Vraag het daar maar.",
   "Als je {name} wilt spreken, kom dan in de {part}. Dan is {name} hier meestal."
  ],
  "crowd.twist.zondebok": [
   "Dat briefje over {first}? Dat lag er wel heel netjes, als je het mij vraagt.",
   "Iedereen wijst nu naar {first}. Juist dat vind ik verdacht.",
   "Als iemand {first} erin wil luizen, gaat het zo. Te makkelijk allemaal."
  ],
  "crowd.twist.medeplichtige": [
   "{comp} en {c} dekken elkaar altijd, dat weet iedereen.",
   "Vraag {comp} niet naar {c}. Die twee zijn als broer en zus.",
   "Als {comp} iets bevestigt over {c}, zou ik het nog eens nakijken."
  ],
  "obj.examine": [
   "Je onderzoekt {obj}.",
   "Je bekijkt {obj} van dichtbij.",
   "Je neemt {obj} rustig onder de loep.",
   "Je doorzoekt {obj} zorgvuldig."
  ],
  "obj.tooEarly": [
   "Je ziet niets bijzonders. Misschien weet je nog niet waar je op moet letten.",
   "Er valt je iets op, maar je kunt het nog nergens aan koppelen. Later misschien.",
   "Je hebt het gevoel dat hier iets is, maar je weet nog niet wat je zoekt."
  ],
  "obj.done": [
   "Bij {obj} heb je al gekeken. Daar valt niets meer te halen.",
   "{obj} heb je al grondig bekeken.",
   "Je weet nog wat je bij {obj} zag. Er is niets veranderd."
  ],
  "obj.y.coins": [
   "Achter {obj} ligt een vergeten beursje met {n} {cur}. Niemand komt het halen, dus je neemt het mee.",
   "Tussen {obj} glinsteren {n} {cur}. Je steekt ze bij je; een drankje op het juiste moment kan wonderen doen.",
   "Onder {obj} vind je {n} {cur}, al lang vergeten. Je neemt ze mee."
  ],
  "obj.y.hint": [
   "Bij {obj} ligt een snipper papier met één aantekening: {loc}. Iemand vond die plek belangrijk.",
   "In {obj} zit een briefje dat naar {loc} verwijst. Het handschrift is haastig.",
   "Tussen {obj} vind je een notitie: 'nog eens kijken in {loc}'. Van wie die is, staat er niet bij."
  ],
  "obj.y.alibi": [
   "Bij {obj} ligt een rekening van die avond, rond {hour} uur: twee personen, {a} en {b}, in {place}.",
   "In {obj} staan voor die avond twee namen naast elkaar: {a} en {b}. Ze waren samen in {place}.",
   "Een aantekening bij {obj} laat zien dat {a} en {b} die avond rond {hour} uur samen in {place} waren."
  ],
  "obj.y.topic": [
   "In {obj} ligt {item} van {first}. Misschien is {first} blij als je het teruggeeft.",
   "Tussen {obj} vind je {item}. Het hoort bij {first}, dat zie je meteen.",
   "Bij {obj} ligt {item} met de naam van {first} erop. Je neemt het mee om terug te geven."
  ],
  "obj.y.sched": [
   "In {obj} zie je dat {name} hier geregeld komt, meestal in de {part}.",
   "Aan {obj} zie je het: {name} is hier vaak, vooral in de {part}.",
   "Tussen de spullen bij {obj} ligt iets van {name}. Wie hier vaker komt, zegt: altijd in de {part}."
  ],
  "obj.y.char": [
   "{obj} verraadt de vaste hand van {name}, {role}: iemand die bekendstaat als {trait}.",
   "Aan {obj} zie je hoe {name} werkt. Het past bij iemand die {trait} is.",
   "{obj} zegt iets over {name}, {role}. De mensen noemen {name} {trait}, en dat zie je terug."
  ],
  "obj.nothing": [
   "Je kijkt goed, maar vindt niets wat ertoe doet.",
   "Stof, gebruikssporen, verder niets bijzonders.",
   "Alles ligt precies waar je het zou verwachten.",
   "Iemand heeft hier kort geleden opgeruimd, maar je vindt niets.",
   "Je neemt de tijd. Het levert alleen een indruk op van hoe het hier gewoonlijk gaat.",
   "Niets. Maar je onthoudt hoe het eruitziet, voor het geval dat.",
   "Een paar krassen, een vergeten knoop. Niets wat met de zaak te maken heeft.",
   "Je vindt alleen wat je overal vindt: sleet, stof en gewoonte."
  ],
  "obj.nothing.herberg": [
   "Kringen van bekers, een vergeten muts, verder niets.",
   "Het ruikt naar bier en natte jassen, en dat is alles."
  ],
  "obj.nothing.markt": [
   "Kisten, touw en wat kapotte waar. Niets voor jou.",
   "Iemand heeft hier haastig ingepakt, maar het is gewoon marktafval."
  ],
  "obj.nothing.plein": [
   "Duivenveren en zand. Het plein houdt zijn geheimen voor zich.",
   "Alleen voetstappen van honderden mensen, door elkaar."
  ],
  "obj.nothing.huis": [
   "Een keurig huishouden. Te keurig om iets te verbergen, of net niet.",
   "Huiselijke spullen, netjes op hun plek. Hier is niets."
  ],
  "obj.nothing.kantoor": [
   "Stapels papier over alledaagse zaken. Niets over die avond.",
   "Rekeningen, aanvragen, klachten. Saai, en onschuldig."
  ],
  "obj.nothing.haven": [
   "Zout, touw en teer. Verder niets.",
   "Het water heeft hier alles al lang meegenomen."
  ],
  "obj.nothing.poort": [
   "Namen van reizigers, maar niet die je zoekt.",
   "Een plek om langs te gaan, niet om iets achter te laten."
  ],
  "obj.nothing.werkplaats": [
   "Gereedschap, krullen en zaagsel. Gewoon werk.",
   "Half afgemaakt werk, verder niets bijzonders."
  ],
  "obj.nothing.archief": [
   "Oude stukken over oude zaken. Niets van nu.",
   "Je bladert, maar de bladzijden zwijgen over die avond."
  ],
  "obj.nothing.park": [
   "Bladeren, een vergeten handschoen, verder niets.",
   "Hier zitten mensen om niets te doen. Je vindt dan ook niets."
  ],
  "obj.nothing.straat": [
   "Straatvuil en regenwater. Niets wat telt.",
   "Iedereen loopt hier langs. Niemand laat hier iets achter."
  ],
  "drink": [
   "bier",
   "wijn"
  ],
  "treat.narr": [
   "Je trakteert {first} op een glas {drink}.",
   "Je laat een glas {drink} brengen voor {first}.",
   "Je schuift {first} een glas {drink} toe."
  ],
  "treat.ok": [
   "Dat is aardig van je. Op je gezondheid.",
   "Op je gezondheid. En op de waarheid.",
   "Dank je. Dit had ik nodig, eerlijk gezegd.",
   "Ha, {drink}! Je weet hoe je mensen moet nemen."
  ],
  "treat.hostile": [
   "\"Denk niet dat je me daarmee koopt.\" Het glas pakt {hij} wel aan.",
   "\"Een glas maakt niets goed.\" Toch drinkt {hij} het leeg.",
   "{Hij} kijkt naar het glas en dan naar jou. \"Dit verandert niks.\" Het glas blijft niet lang vol."
  ],
  "xt.answer": [
   "Waar heb je dat gevonden? Dank je. Echt, dat betekent veel voor me.",
   "Dat dacht ik kwijt te zijn. Je bent attenter dan ik dacht.",
   "Je had het ook kunnen houden. Dat je het terugbrengt, onthoud ik."
  ],
  "tone.good": [
   "{first} ontspant zichtbaar. Deze toon valt goed.",
   "Je ziet {first} opener worden. Zo praat {hij} graag.",
   "{first} knikt langzaam. Dit is de juiste toon voor {hem}."
  ],
  "tone.bad": [
   "{first} sluit zich af. Deze toon werkt niet bij {hem}.",
   "Je merkt dat {first} zich ergert aan je toon.",
   "{first} kijkt weg. Dit was niet de juiste toon."
  ],
  "night.sleep": [
   "Het is laat geworden. Je zoekt je kamer op en slaapt onrustig. Een nieuwe dag begint.",
   "De lampen gaan uit. Je ligt lang wakker en loopt de dag nog eens door. Dan is het ochtend.",
   "Je bent moe tot in je botten. Je slaapt, droomt van deuren die dichtgaan, en wordt wakker in een nieuwe dag."
  ],
  "night.soft": [
   "Dag {day}: de zaak dreigt weg te zakken. Wie nu nog praat, praat misschien niet lang meer.",
   "Dag {day}: de stad begint te vergeten. Getuigen worden vager, deuren gaan dichter.",
   "Dag {day}: je voelt de tijd dringen. Nog even, en niemand wil er meer over praten."
  ],
  "night.late": [
   "Het spoor koelt af. Je kunt doorzoeken, maar het einde wordt er niet beter op.",
   "Elke dag die verstrijkt, maakt de waarheid wat lichter. Je zoekt toch door.",
   "De stad heeft haar oordeel al half geveld. Wat je nu nog vindt, komt laat."
  ],
  "clock.closing": [
   "{loc} gaat dicht. Je stapt naar buiten, de straat op.",
   "De deuren van {loc} gaan dicht. Je staat weer op straat.",
   "Sluitingstijd in {loc}. Je wordt vriendelijk maar beslist naar buiten gewerkt."
  ],
  "visit.leave": [
   "Je verlaat {loc}. De {part} zit erop.",
   "Je trekt de deur van {loc} achter je dicht. Tijd voor de {next}.",
   "Bij {loc} valt voorlopig niets meer te halen. De {part} is voorbij.",
   "Je loopt weg bij {loc} onder {weather} en zet in gedachten alles op een rij."
  ],
  "day.wait": [
   "Je laat de {part} voorbijgaan en ordent je aantekeningen.",
   "Je wacht. De {part} glijdt voorbij zonder dat je de deur uit gaat.",
   "Je neemt de {part} om na te denken terwijl buiten {weather} voorbijtrekt. Daarna is het {next}."
  ],
  "confront.lead": [
   "Je houdt {first} voor wat {hij} zei, en zet er dit tegenover: {title}.",
   "Je herhaalt de woorden van {first} en legt er {title} naast.",
   "Je zegt dat {first} eerder iets anders vertelde, en je laat zien wat je hebt: {title}."
  ],
  "confront.culprit.close": [
   "\"Waarom kijk je me zo aan? Na alles wat ik voor je gedaan heb?\" Het blijft lang stil. \"Goed. Ik was er niet, in {loc}. Maar dat betekent niets.\"",
   "\"Jij ook al?\" De stem breekt bijna. \"Ja, ik loog over {loc}. Ik was bang dat je het verkeerd zou begrijpen.\"",
   "Een lange blik, gekwetst of berekenend, dat zie je niet. \"{loc}… nee. Daar was ik niet. Maar luister nou eerst naar mij.\""
  ],
  "confront.culprit.distant": [
   "\"Ik… ik heb me in de avond vergist, dat is alles.\" De woorden komen te snel.",
   "\"Dan heb ik het verkeerd onthouden. Mag dat?\" Het klinkt ingestudeerd.",
   "Een kort, droog lachje. \"Getuigen. Die zien altijd wat ze willen zien.\" Maar de blik dwaalt weg."
  ],
  "flip.culprit": [
   "{first} is de laatste tijd stiller, en kijkt je niet meer recht aan.",
   "{first} groet je nog, maar de warmte is verdwenen.",
   "Je merkt dat {first} je ontwijkt. Een deur die vroeger openstond, gaat nu dicht."
  ],
  "flip.friend": [
   "{first} bekijkt je anders dan eerst. Het wantrouwen is uit {zijn} stem verdwenen.",
   "{first} knikt je toe, voor het eerst zonder argwaan.",
   "Ergens onderweg is {first} je gaan vertrouwen. Je merkt het aan kleine dingen."
  ],
  "flip.love": [
   "{first} zoekt je blik wat langer dan nodig is.",
   "Als {first} je ziet, verandert er iets in {zijn} gezicht. Iets zachts.",
   "{first} raakt even je arm aan, en laat dan haastig los."
  ],
  "accuse.solved": [
   "Je legt het zaakverslag op tafel. De zaak is gesloten.",
   "Het zaakverslag is rond. Na al die dagen is de zaak gesloten.",
   "De laatste puzzelstukken vallen op hun plek. De zaak is gesloten."
  ],
  "accuse.mismatch": [
   "Het zaakverslag rammelt: de stukken passen niet bij wat ze moeten bewijzen.",
   "Je bewijsstukken vertellen een ander verhaal dan je reconstructie. Dat ziet iedereen.",
   "Het verslag valt uit elkaar zodra iemand het leest: motief en werkwijze kloppen niet."
  ],
  "accuse.person": [
   "{first} kijkt je ongelovig aan. \"Is dit alles? Daar hang je mij aan op?\" De anderen wenden hun blik af.",
   "\"Ik?\" {first} lacht niet. \"Je vergist je, en dat weet je zelf ook.\" Het wordt pijnlijk stil.",
   "Het blijft stil. Dan zegt {first} zacht: \"Ik hoop dat je ooit snapt wat je me nu aandoet.\""
  ],
  "accuse.evidence": [
   "{first} blijft rustig. \"Dat stuk zegt niets over mij.\" En daar heeft {hij} gelijk in: het bewijs wijst ergens anders heen.",
   "\"Kijk nog eens goed,\" zegt {first}. \"Dit gaat niet over mij.\" Bij nader inzien heeft {hij} gelijk.",
   "{first} schuift het stuk terug. \"Dit bewijst niets.\" Je ziet het zelf ook: het wijst een andere kant op."
  ],
  "end.open": [
   "Je legt het zaakverslag op tafel: {name}, het motief ({motive}) en de werkwijze ({method}).",
   "Alles komt samen in één naam: {name}. Het motief: {motive}. De werkwijze: {method}.",
   "Je zet het rustig op een rij. {name}, met als motief {motive}, en als werkwijze {method}."
  ],
  "end.style.gezelschap": [
   "In het bijeengeroepen gezelschap wijst elke schakel onverbiddelijk naar {name}. Het schijnbaar onmogelijke raadsel rond {victim} ligt open op tafel."
  ],
  "end.style.procedureel": [
   "Stap voor stap sluit je het onderzoek: de verklaringen, het tijdstip bij {crimeloc} en de stukken laten {name} geen enkele uitweg meer."
  ],
  "end.style.dorp": [
   "Het fluisteren in {city} verstomt. Wat jarenlang achter gesloten gordijnen bleef, ligt nu vast in je verslag over {name}."
  ],
  "end.style.psych": [
   "Tussen jou en {name} vallen alle beleefde woorden weg; wat overblijft is de stille erkenning van wat er werkelijk speelde."
  ],
  "end.style.noir": [
   "Ondanks alle rookgordijnen en verhulde belangen in {city} trek je de onderste steen boven: {name} staat met lege handen."
  ],
  "end.style.omgekeerd": [
   "Juist dat ene kleine detail waar {name} zo luchtig overheen stapte, blijkt de spijker waaraan het hele alibi blijft hangen."
  ],
  "end.close": [
   "{name} zwijgt lang. \"Ik heb je nooit willen kwetsen,\" zegt {hij} dan zacht. \"Alles wat ik deed, deed ik om… ach, het doet er niet meer toe.\" Je voelt geen triomf, alleen een grote, stille leegte. {first} gaat zonder verzet mee.",
   "\"Je had het nooit mogen ontdekken,\" zegt {name} zacht. \"Niet jij.\" Er volgt geen ruzie, alleen een vermoeide knik. {first} gaat zonder verzet mee.",
   "{name} kijkt je aan zoals vroeger, en heel even is alles weer gewoon. \"Je bent goed,\" zegt {hij}. \"Te goed.\" Dan is het voorbij."
  ],
  "end.distant": [
   "{first} probeert het nog even te ontkennen, maar het bewijs is te sluitend. Het gezag neemt de zaak over, en de stad haalt opgelucht adem.",
   "{first} zoekt naar woorden en vindt ze niet. Het gezag neemt het over. De stad praat er nog weken over.",
   "Een laatste poging tot ontkenning strandt op het bewijs. {first} wordt meegenomen, en de stad kan verder."
  ],
  "end.twist.zondebok": [
   "Het briefje over {a} blijkt ondergeschoven, door dezelfde hand die de daad pleegde. {a} haalt opgelucht adem.",
   "Wat {a} moest belasten, was het werk van {name} zelf. Een valse spoor, met zorg neergelegd."
  ],
  "end.twist.medeplichtige": [
   "Ook {comp} moet zich verantwoorden: wie een vals alibi geeft, draagt een deel van de schuld.",
   "{comp} loog uit trouw aan {name}. Die trouw kost nu een hoge prijs."
  ],
  "end.quality.0": [
   "Het kostte veel, misschien te veel.",
   "De zaak is gesloten, maar het voelt niet als een overwinning."
  ],
  "end.quality.1": [
   "De waarheid is boven, al bleef er schade achter.",
   "Het is gelukt, met horten en stoten."
  ],
  "end.quality.2": [
   "Je hebt de zaak eerlijk en zorgvuldig opgelost.",
   "Rustig, grondig en eerlijk. Zo hoort het."
  ],
  "end.quality.3": [
   "Een zaak om nooit te vergeten: snel, zuiver en zonder valse beschuldiging.",
   "Snel en zonder één verkeerde beschuldiging. Mensen zullen er nog lang over praten."
  ],
  "epi.love": [
   "Met {name} is iets begonnen dat nog geen naam heeft, maar wel een toekomst.",
   "{name} wacht je op bij de deur, elke avond. Wat jullie hebben, groeit langzaam en stevig.",
   "Je weet niet precies wanneer het begon, maar {name} is niet meer weg te denken."
  ],
  "epi.warm": [
   "{name} blijft in je leven, en dat voelt goed.",
   "{name} komt nog vaak langs, gewoon om te praten.",
   "Tussen jou en {name} is een vriendschap gegroeid die de zaak overleeft."
  ],
  "epi.warm.friend": [
   "{name} staat voor je klaar, zoals altijd. Sommige vriendschappen worden sterker van een storm."
  ],
  "epi.warm.enemy": [
   "Wie had dat gedacht: {name}, ooit je tegenstander, wordt een van je trouwste bondgenoten."
  ],
  "epi.neutral": [
   "{name} groet je voortaan vriendelijk, maar op afstand.",
   "{name} gaat verder met {zijn} leven, en jij met het jouwe.",
   "Met {name} blijft het beleefd. Meer hoeft ook niet."
  ],
  "epi.neutral.love": [
   "Wat er tussen jou en {name} had kunnen zijn, blijft onuitgesproken."
  ],
  "epi.cold": [
   "{name} heeft je nooit vergeven hoe je de zaak aanpakte.",
   "{name} gaat de andere kant op als je eraan komt.",
   "Voor {name} blijf je degene die te veel vragen stelde."
  ],
  "epi.cold.enemy": [
   "{name} blijft je tegenstander. Maar je ziet in {zijn} blik iets van respect."
  ],
  "epi.cold.love": [
   "Met {name} is het voorbij voordat het begon. Dat doet meer pijn dan je had verwacht."
  ]
 },
 "eras": {
  "middeleeuwen": {
   "talk.warm": [
    "Wees welkom bij mij, en moge de Heer je pad verlichten.",
    "Je hebt het goede hart van je moeder, zei men vroeger al. Dat is je geluk.",
    "Kom, ik schenk je een beker bier in. Het is van de goede brouwer."
   ],
   "talk.neutral": [
    "De klok heeft net geluid; de dag is nog lang genoeg voor vragen.",
    "Het gilde vergadert vanavond. Iedereen praat over één ding.",
    "De schepenen zwijgen, het volk fluistert. Zo gaat het altijd."
   ],
   "talk.cold": [
    "Ik heb geen tijd voor praatjes. Het werk wacht niet op de vesper.",
    "Wie veel vraagt, maakt veel vijanden. Dat leerde mijn vader mij.",
    "Zoek je antwoorden? Ga naar de kerk. Daar luisteren ze."
   ],
   "talk.hostile": [
    "Bij mijn ziel, ga weg voordat ik de schout roep.",
    "Jouw naam wordt hier niet meer met eer genoemd.",
    "Ik wens je geen kwaad. Maar ik wens je ook niet hier."
   ],
   "voice.spreekwoord.close": [
    "Wat je biecht in de kerk, hoort de herberg morgen."
   ],
   "nick.man": [
    "beste man",
    "broeder"
   ],
   "nick.vrouw": [
    "beste vrouw",
    "zuster"
   ],
   "evade": [
    "Daarover zwijg ik, zoals ik het de pastoor beloofd heb.",
    "Wat ik weet, houd ik voor me. Daar heb ik een eed op gedaan."
   ],
   "crime.general": [
    "De pastoor bidt voor {victim}, en de schepenen zwijgen.",
    "Op de markt zeggen ze dat het {public} was. Maar markten zeggen veel."
   ],
   "alibi.plain": [
    "Ik was in {place} tot de klok de laatste ronde luidde. {other} was erbij."
   ],
   "ev.notebook.title": [
    "Aantekenboek van {v}"
   ],
   "ev.notebook.item": [
    "het aantekenboek van {v}"
   ],
   "ev.lead.dossier.title": [
    "Uitgesneden registerblad van {v}"
   ],
   "ev.lead.dossier.item": [
    "een perkamenten omslag met kraslijnen"
   ],
   "ev.lead.letter.title": [
    "Onverzegelde brief van {v}"
   ],
   "ev.lead.letter.item": [
    "een onverzegelde brief"
   ],
   "ev.motive.macht.title": [
    "Ontwerp van een aanstelling"
   ],
   "ev.motive.macht.item": [
    "een ontwerp van een aanstelling"
   ],
   "ev.motive.erfenis.title": [
    "Afschrift van het testament"
   ],
   "ev.motive.erfenis.item": [
    "een afschrift van het testament"
   ],
   "ev.method.tijd.title": [
    "Kwitantie met het uur"
   ],
   "ev.method.tijd.item": [
    "een kwitantie met het uur erop"
   ],
   "ev.method.identiteit.title": [
    "Mantel met vreemd merk"
   ],
   "ev.method.identiteit.item": [
    "een mantel met een vreemd merk"
   ],
   "ev.method.documenten.title": [
    "Perkament met geoefende tekens"
   ],
   "ev.method.documenten.item": [
    "een perkament met geoefende tekens"
   ],
   "ev.method.reis.title": [
    "Reisbrief"
   ],
   "ev.method.reis.item": [
    "een reisbrief met aantekeningen"
   ],
   "crowd.any": [
    "De klokken luidden gisteren langer dan anders. Niemand weet waarom.",
    "De pelgrims die hier doortrokken, zeiden dat het een slecht teken was.",
    "Het gilde houdt de deuren dicht, de laatste tijd.",
    "Bij de put wordt meer gepraat dan in de kerk.",
    "De schout loopt rond met een gezicht als een donderwolk."
   ],
   "obj.nothing": [
    "Was en roet, van kaarsen die al lang op zijn. Niets meer.",
    "Een paar penningen en een kapotte gesp. Niets van belang."
   ],
   "drink": [
    "kruidenwijn"
   ],
   "treat.ok": [
    "Moge de Heer het je lonen.",
    "Op de gezondheid van het gilde, en die van jou."
   ],
   "night.sleep": [
    "De nachtwaker roept het uur af. Je slaapt licht, en de hanen wekken je bij het eerste licht."
   ],
   "epi.warm": [
    "{name} noemt je voortaan in {zijn} gebeden."
   ],
   "epi.neutral": [
    "{name} knikt je toe op de markt, en zegt verder niets."
   ],
   "epi.cold": [
    "{name} spreekt je naam nooit meer uit, zelfs niet in de kerk."
   ]
  },
  "e1895": {
   "talk.warm": [
    "Kom binnen, het gaslicht is net aan. Dan zit je tenminste niet in het donker.",
    "Ik las vanochtend de courant en dacht meteen aan jou. Hou moed.",
    "Een kopje thee? Het water staat al op."
   ],
   "talk.neutral": [
    "De trein was weer te laat vanochtend. Er is ook niets meer zeker.",
    "Er staat een stukje in de courant, maar wat ze schrijven, is maar de helft.",
    "Goedemiddag. Men zegt dat er vanmiddag nog een telegram kwam."
   ],
   "talk.cold": [
    "Ik heb mijn plichten, en die gaan voor.",
    "Het is niet netjes om zo bij mensen binnen te vallen.",
    "Een fatsoenlijk mens stelt zulke vragen niet op straat."
   ],
   "talk.hostile": [
    "Ik verzoek u dringend te vertrekken.",
    "Uw naam valt hier niet meer in goed gezelschap.",
    "Ik heb niets meer met u te bespreken. Goedendag."
   ],
   "voice.spreekwoord.close": [
    "Fatsoen is de beste raadgever, zei mijn grootmoeder."
   ],
   "nick.man": [
    "beste kerel"
   ],
   "nick.vrouw": [
    "beste meid"
   ],
   "evade": [
    "Daarover spreek ik niet. Dat is niet fatsoenlijk.",
    "Vraag het de notaris maar, niet mij."
   ],
   "crime.general": [
    "De courant noemt het {public}. De courant noemt veel dingen.",
    "Het is een schande voor {city}, dat zeg ik je."
   ],
   "alibi.plain": [
    "Ik was in {place}, bij het gaslicht, tot laat. {other} zal het bevestigen."
   ],
   "crowd.any": [
    "De courant van vanochtend had er een hele kolom over.",
    "Het gaslicht op de hoek is weer kapot. Alles gaat mis deze week.",
    "Mijn zwager werkt bij de telegraaf. Die hoort alles als eerste.",
    "De trein van zes uur zat vol nieuwsgierigen van buiten.",
    "Fatsoenlijke mensen praten hier niet over. Maar ik wel."
   ],
   "obj.nothing": [
    "Een oud nummer van de courant en een afgebrande lucifer. Niets.",
    "Een kaartje van een rijtuigverhuurder. Niets wat helpt."
   ],
   "drink": [
    "rode wijn"
   ],
   "treat.ok": [
    "Zeer vriendelijk, dank je.",
    "Op je gezondheid, en op betere tijden."
   ],
   "night.sleep": [
    "Het gaslicht dooft. Je slaapt slecht en hoort de eerste trein al vroeg."
   ],
   "epi.warm": [
    "{name} schrijft je nog jaren brieven, met de hand, op goed papier."
   ],
   "epi.neutral": [
    "{name} groet je beleefd als jullie elkaar zien, met een kort knikje."
   ],
   "epi.cold": [
    "{name} laat bij de deur zeggen dat {hij} niet thuis is."
   ]
  },
  "e1925": {
   "talk.warm": [
    "Ik zet de radio wat zachter. Vertel, hoe gaat het met je?",
    "Je komt als geroepen. Ik heb net koffie gezet.",
    "Ik dacht vanmorgen nog aan je, toen de grammofoon dat oude wijsje speelde."
   ],
   "talk.neutral": [
    "Ik moet straks nog bellen, maar vertel maar.",
    "Alles gaat tegenwoordig zo snel. Auto's, telefoons, roddels.",
    "De krant schrijft er van alles over. Geloof er de helft van."
   ],
   "talk.cold": [
    "Ik heb een afspraak. Je begrijpt het wel.",
    "Als je iets wilt weten, bel je maar eerst. Dat doen nette mensen.",
    "Er zijn hier mensen die al genoeg hebben meegemaakt."
   ],
   "talk.hostile": [
    "Als je niet weggaat, bel ik de politie.",
    "Ik wil je hier niet meer zien. Is dat duidelijk?",
    "Je hebt mijn naam door het slijk gehaald. Ga."
   ],
   "voice.spreekwoord.close": [
    "Haastige spoed is zelden goed, zelfs met de auto."
   ],
   "nick.man": [
    "ouwe jongen"
   ],
   "nick.vrouw": [
    "lieve meid"
   ],
   "evade": [
    "Daar praat ik niet eens over aan de telefoon, laat staan hier.",
    "Ik bemoei me er niet mee. Ik heb een gezin."
   ],
   "crime.general": [
    "Op de radio zeiden ze niets, dus het zal wel {public} zijn geweest, denken de meesten.",
    "Het hele stadje hing aan de telefoon die avond."
   ],
   "alibi.plain": [
    "In {place}, met de radio aan. {other} kwam nog even langs."
   ],
   "crowd.any": [
    "Mijn buurman heeft het van de radio. Of van de bakker.",
    "Er reed die avond een auto zonder lichten door de straat.",
    "Op de telefooncentrale weten ze alles, maar ze mogen niks zeggen.",
    "Mijn dochter danst de charleston en ik maak me zorgen om dit. De wereld is gek.",
    "Ik heb het in de krant gelezen. Ik geloof de helft."
   ],
   "obj.nothing": [
    "Een kaartje van een dansavond, verder niets.",
    "Een oude dienstregeling van de tram. Niets bijzonders."
   ],
   "drink": [
    "witte wijn"
   ],
   "treat.ok": [
    "Proost! Op betere tijden.",
    "Dat is chic van je."
   ],
   "night.sleep": [
    "Ergens speelt nog een grammofoon. Pas als die zwijgt, slaap je in. Dan is het ochtend."
   ],
   "epi.warm": [
    "{name} belt je elke zondag even op, gewoon om te horen hoe het gaat."
   ],
   "epi.neutral": [
    "{name} wuift je soms toe vanuit de auto."
   ],
   "epi.cold": [
    "{name} hangt op als je belt."
   ]
  },
  "e1955": {
   "talk.warm": [
    "Kom erin, de koffie is net door. Pak er een koekje bij.",
    "We hebben wel ergere dingen doorstaan. Dit komen we ook te boven.",
    "Mijn deur staat open voor jou, dat weet je."
   ],
   "talk.neutral": [
    "Iedereen is druk met de wederopbouw, maar hierover praat toch iedereen.",
    "Ik hoorde het op de radio, of in de winkel, dat weet ik niet meer.",
    "Het is een nette buurt hier. Tenminste, dat dachten we."
   ],
   "talk.cold": [
    "Ik heb geen tijd voor geklets. Ik moet nog naar de winkel.",
    "Je moet niet denken dat je overal zomaar binnen kunt lopen.",
    "We bemoeien ons hier niet met andermans zaken."
   ],
   "talk.hostile": [
    "Wat moeten de buren wel niet denken als ze jou hier zien?",
    "Ga weg, of ik bel de politie.",
    "Jij hoort hier niet. Dat weet iedereen."
   ],
   "voice.spreekwoord.close": [
    "Zuinigheid met vlijt bouwt huizen als kastelen."
   ],
   "nick.man": [
    "jongen"
   ],
   "nick.vrouw": [
    "meisje"
   ],
   "evade": [
    "Daar praten we niet over, hier in de buurt.",
    "Ik wil geen gedonder met de buren."
   ],
   "crime.general": [
    "In de winkel hebben ze het nergens anders over. Het zou {public} zijn.",
    "Na alles wat we hebben meegemaakt, nou dit weer."
   ],
   "alibi.plain": [
    "Ik was in {place}. Na het radionieuws ben ik niet meer weggegaan; {other} weet dat."
   ],
   "crowd.any": [
    "Bij de kruidenier hadden ze het er vanochtend nog over.",
    "Mijn man zegt dat we ons er niet mee moeten bemoeien. Mijn man zegt veel.",
    "Sinds de oorlog vertrouwt niemand meer zomaar iemand.",
    "Mijn jongen is op de fiets de hele stad rondgereden om het nieuws te horen.",
    "Op de radio zeiden ze niks. Dat zegt toch ook wat."
   ],
   "obj.nothing": [
    "Een bonnetje van de kruidenier en een knoop. Niets.",
    "Een oude distributiebon, bewaard uit gewoonte. Niets van belang."
   ],
   "drink": [
    "pils"
   ],
   "treat.ok": [
    "Nou, eentje dan. Dank je wel.",
    "Gezellig. Op de wederopbouw."
   ],
   "night.sleep": [
    "Bij de buren gaat de radio uit. Je slaapt eindelijk, tot de melkboer je wekt."
   ],
   "epi.warm": [
    "{name} komt elke zaterdag op de koffie."
   ],
   "epi.neutral": [
    "{name} groet je in de winkel, en dat is het dan."
   ],
   "epi.cold": [
    "De gordijnen bij {name} gaan dicht als je langsloopt."
   ]
  },
  "e1978": {
   "talk.warm": [
    "Kom binnen, joh. Wil je koffie? Of een biertje?",
    "Ik heb het journaal gezien, maar jij weet er natuurlijk meer van.",
    "Gezellig dat je er bent. Zet je voeten maar op tafel."
   ],
   "talk.neutral": [
    "Het was gisteren op de tv. Nou ja, een klein stukje.",
    "Iedereen heeft er een mening over. In de kantine, bij de bakker, overal.",
    "Ik heb die mededeling gekopieerd en overal opgehangen. Saai werk."
   ],
   "talk.cold": [
    "Ik moet zo naar mijn werk. Kort graag.",
    "Ik heb geen zin in een praatje, sorry.",
    "Mensen hier praten niet zomaar met iemand van buiten."
   ],
   "talk.hostile": [
    "Ik heb geen zin in jouw gezeur. Wegwezen.",
    "Ga maar bij een ander zitten zeuren.",
    "Je hebt mijn naam overal rondverteld. Bedankt, hoor."
   ],
   "voice.spreekwoord.close": [
    "Wie dan leeft, wie dan zorgt."
   ],
   "nick.man": [
    "makker"
   ],
   "nick.vrouw": [
    "meid"
   ],
   "evade": [
    "Daar heb ik echt geen zin in, joh.",
    "Ik zeg niks zonder dat er iemand van de vakbond bij is."
   ],
   "crime.general": [
    "Het stond in de krant als {public}. Nou, ik weet het niet, hoor.",
    "In de kroeg hebben ze er al tien theorieën over."
   ],
   "alibi.plain": [
    "Gewoon in {place}, tot sluitingstijd. {other} heeft me daar nog een biertje gegeven."
   ],
   "crowd.any": [
    "Het was gisteren op de regionale tv. Ik herkende onze straat.",
    "In de kantine lopen er al weddenschappen over. Schandalig.",
    "Mijn buurjongen heeft er een stencil over gemaakt. Met tekeningen.",
    "Even een patatje halen, dan hoor ik het vanzelf.",
    "Op het werk draait het kopieerapparaat overuren door alle briefjes hierover."
   ],
   "obj.nothing": [
    "Een kassabon en een afgescheurd stuk van een folder. Niets.",
    "Een sleutelhanger van een garage. Verder niets."
   ],
   "drink": [
    "pils"
   ],
   "treat.ok": [
    "Lekker, joh. Proost.",
    "Daar zeg ik geen nee tegen."
   ],
   "night.sleep": [
    "Buiten slaat een autodeur dicht. Je slaapt slecht, en dan is het alweer ochtend."
   ],
   "epi.warm": [
    "{name} neemt je elke vrijdag mee naar het café."
   ],
   "epi.neutral": [
    "{name} zwaait als je voorbij fietst."
   ],
   "epi.cold": [
    "{name} kijkt weg als jullie elkaar in de supermarkt tegenkomen."
   ]
  },
  "e1994": {
   "talk.warm": [
    "Kom binnen. Ik zet even koffie, de fax ratelt toch de hele dag.",
    "Goed dat je er bent. Ik heb je gisteren nog proberen te bellen.",
    "Zullen we straks een biertje drinken? Even geen zaak, gewoon praten."
   ],
   "talk.neutral": [
    "Op kantoor hebben ze het nergens anders over. Bij het koffieapparaat, vooral.",
    "Het stond in de regionale krant, maar die schrijven alles een beetje verkeerd.",
    "Even kijken, ik heb om drie uur een afspraak. Zeg het maar."
   ],
   "talk.cold": [
    "Je kunt beter even een afspraak maken. Ik zit vol.",
    "Ik zit midden in een klus. Kan het later?",
    "Ik ben niet zo van de praatjes, eerlijk gezegd."
   ],
   "talk.hostile": [
    "Als je me nog één keer lastigvalt, bel ik de politie.",
    "Ik heb niks tegen jou te zeggen. Helemaal niks.",
    "Doe me een plezier en ga weg."
   ],
   "voice.spreekwoord.close": [
    "Tijd is geld, zeggen ze op kantoor."
   ],
   "nick.man": [
    "kerel"
   ],
   "nick.vrouw": [
    "schat"
   ],
   "evade": [
    "Geen commentaar, zoals ze op tv zeggen.",
    "Daarvoor moet je bij een ander zijn."
   ],
   "crime.general": [
    "Volgens de lokale omroep was het {public}. Ik geloof er geen bal van.",
    "Het is zo'n zaak waar ze later een documentaire over maken."
   ],
   "alibi.plain": [
    "In {place}. Ik heb er nog een fax verstuurd, {other} stond ernaast."
   ],
   "ev.notebook.title": [
    "Agenda van {v}"
   ],
   "ev.notebook.item": [
    "de agenda van {v}"
   ],
   "ev.lead.dossier.title": [
    "Doordruk uit de ordner van {v}"
   ],
   "ev.lead.dossier.item": [
    "een ordner met een uitgescheurd blad"
   ],
   "crowd.any": [
    "Mijn zus belde me er drie keer over. Op mijn werk!",
    "Het stond op teletekst, pagina honderd-nog-wat.",
    "Er rijdt de hele dag een busje van de omroep door de straat.",
    "Op de computer van de bibliotheek kun je alles nazoeken, zeggen ze.",
    "Ik kreeg het bericht op mijn semafoon. Echt waar."
   ],
   "obj.nothing": [
    "Een vergeten diskette zonder label. Niets van waarde.",
    "Een faxrol met een boodschappenlijstje. Niets."
   ],
   "drink": [
    "speciaalbier"
   ],
   "treat.ok": [
    "Top, dank je. Proost.",
    "Ah, jij bent de beste."
   ],
   "night.sleep": [
    "Je zet de wekker, slaapt onrustig en wordt wakker van de vuilniswagen."
   ],
   "epi.warm": [
    "{name} spreekt elke week een berichtje in op je antwoordapparaat."
   ],
   "epi.neutral": [
    "{name} stuurt je met de kerst een kaart."
   ],
   "epi.cold": [
    "{name} laat je fax voorgoed onbeantwoord."
   ]
  },
  "toekomst": {
   "talk.warm": [
    "Kom binnen. De lampen staan op warm, speciaal voor zulke dagen.",
    "Ik had een bericht voor je klaargezet, maar persoonlijk is beter.",
    "Fijn je te zien, en niet alleen op een scherm."
   ],
   "talk.neutral": [
    "Het collectief heeft er drie vergaderingen over gehad. Niemand weet iets.",
    "Alles wordt vastgelegd, behalve wat er echt toe doet.",
    "Mijn tijdschema zit vol, maar voor jou maak ik een gaatje."
   ],
   "talk.cold": [
    "Stuur me liever een bericht. Dan kan ik er later naar kijken.",
    "Ik heb geen tijd voor ongeplande gesprekken.",
    "Je toegangsniveau geeft je geen recht op mijn tijd."
   ],
   "talk.hostile": [
    "Ik heb je contact geblokkeerd. Nu blokkeer ik je ook hier.",
    "Ga, voordat ik de wijkbewaking een melding stuur.",
    "Mijn register zegt dat jij alleen maar problemen brengt."
   ],
   "voice.spreekwoord.close": [
    "Wat niet gelogd is, is niet gebeurd, zeggen ze tegenwoordig."
   ],
   "nick.man": [
    "maat"
   ],
   "nick.vrouw": [
    "maat"
   ],
   "evade": [
    "Die informatie deel ik niet. Dat is mijn recht.",
    "Dat valt onder mijn privacyinstellingen."
   ],
   "crime.general": [
    "Het officiële register meldt {public}. Registers liegen niet, zeggen ze.",
    "Alle feeds staan er vol mee, maar niemand weet iets echt."
   ],
   "alibi.plain": [
    "Mijn locatielog zegt {place}, en {other} staat ook in het log."
   ],
   "ev.notebook.title": [
    "Logboek van {v}"
   ],
   "ev.notebook.item": [
    "het persoonlijke logboek van {v}"
   ],
   "ev.lead.dossier.title": [
    "Gewist datasegment van {v}"
   ],
   "ev.lead.dossier.item": [
    "een datamap met restsporen"
   ],
   "ev.lead.letter.title": [
    "Conceptbericht van {v}"
   ],
   "ev.lead.letter.item": [
    "een niet-verzonden conceptbericht"
   ],
   "ev.method.tijd.title": [
    "Tijdgestempelde bon"
   ],
   "ev.method.tijd.item": [
    "een tijdgestempelde bon"
   ],
   "ev.method.identiteit.title": [
    "Jas met andermans label"
   ],
   "ev.method.identiteit.item": [
    "een jas met andermans label"
   ],
   "crowd.any": [
    "Mijn feed staat er vol mee. Allemaal gissingen.",
    "De drones vliegen sinds die avond lager. Dat voelt raar.",
    "Het collectief heeft een gesprekskring georganiseerd. Iedereen praat, niemand luistert.",
    "Mijn huisassistent begint er steeds over. Ik heb hem op stil gezet.",
    "In het register staat het als afgehandeld. Nou, ik zie niks afgehandeld."
   ],
   "obj.nothing": [
    "Een lege datastrip en wat verpakking. Niets.",
    "Een uitgeschakelde sensor, al maanden niet gebruikt. Niets."
   ],
   "drink": [
    "kaswijn"
   ],
   "treat.ok": [
    "Gekweekt of echt? Maakt niet uit, proost.",
    "Dank je. Dat zet ik op mijn welzijnslog."
   ],
   "night.sleep": [
    "Je kamer dimt het licht. Je slaapt, en de wekfunctie haalt je zacht een nieuwe dag in."
   ],
   "epi.warm": [
    "{name} zet je bovenaan in {zijn} contactlijst, en houdt je daar."
   ],
   "epi.neutral": [
    "{name} stuurt af en toe een kort bericht."
   ],
   "epi.cold": [
    "{name} heeft je voorgoed uit {zijn} netwerk verwijderd."
   ]
  }
 }
};
# Changelog

## [1.11.7] - 2026-09-06

### Fixed
- **"Bezoek de Squirrel-pagina voor meer info" gaf een 404.** De link wees naar
  `github.com/wwkv/addons/familiebudget`, en dat pad bestaat niet: GitHub heeft
  geen route van repository rechtstreeks naar een map, daar hoort
  `/tree/<branch>/` tussen. Nu komt de link uit bij de map zelf.

## [1.11.6] - 2026-09-06

### Added
- **Onderaan Instellingen staat nu welke versie je draait.** Home Assistant
  bevestigt na een update niet dat de nieuwe versie ook echt geladen is — als
  de repository-cache verouderd is blijft het gewoon de oude build serveren,
  terwijl de winkel het nieuwe nummer toont. Van binnenuit was er geen enkele
  manier om die twee uit elkaar te houden. Nu wel. Het staat onder de tabbladen
  in plaats van ín het tabblad Data, dus je vindt het vanaf elke plek in
  Instellingen.

## [1.11.5] - 2026-09-06

### Added
- **De uitgavenlijst zegt nu ook of een bedrag normaal is.** Een ranglijst
  vertelt je hoe gróót een post is, niet of hij ongewoon is: €1.380 aan
  Kinderen zegt weinig als je niet weet dat het er meestal €430 zijn. Zodra je
  op een maand (of een paar maanden) staat, komt er rechts van het bedrag een
  pijl met een percentage — afgezet tegen de rest van hetzelfde jaar, per maand
  herrekend zodat één maand eerlijk tegen zeven andere kan worden gehouden.
  De tooltip geeft beide bedragen.

  Op "Heel jaar" staat er niets, en dat is met opzet: de lijst ís dan het hele
  jaar, dus er is geen rest om tegen af te zetten. Verschillen onder de 10%
  blijven ook leeg — dat is ruis op deze schaal, en een kolom vol "+3%" leer je
  binnen een week negeren.

  De pijl is bewust grijs. Rood en groen betekenen in deze app een teken — geld
  erin of eruit — en meer uitgeven aan Kinderen in augustus is geen verlies.

### Fixed
- **De uitgavenregels konden op een telefoon door elkaar schuiven.** De
  mobiele opmaak wees de cellen aan op positie ("de tweede", "de vierde") in
  plaats van op naam. Dat klopte zolang een regel precies vier cellen had; de
  kolom hierboven maakt er vijf van, en dan wijst "de vierde" iets anders aan.
  Nu staan de namen in de opmaak zelf, dus een extra cel kan de rest niet meer
  verschuiven.

## [1.11.4] - 2026-09-06

### Changed
- **"Waar ging je geld heen" en "Grootste uitgaven" zijn één kaart geworden.**
  Ze stonden een half scherm uit elkaar en vertelden hetzelfde verhaal twee
  keer: de legende onder de balken was de ranglijst, alleen dan zonder
  rangschikking. Dezelfde namen, dezelfde bedragen, dezelfde kleuren — en de
  ranglijst kon je bovendien aanklikken. De legende is dus verdwenen en de
  ranglijst staat nu direct onder de balken, in dezelfde kaart.

  De balken bleven omdat ze iets doen wat een lijst niet kan: ze staan allebei
  op dezelfde schaal, dus een maand waarin je meer uitgaf dan er binnenkwam
  tekent zichtbaar langer aan de onderkant. Dat is een vraag over in-versus-uit
  die je uit een ranglijst nooit kan aflezen.

- **De ranglijst laat nu al je uitgaven zien, niet alleen de ingedeelde.**
  "Nog niet ingedeeld" staat er als eigen regel tussen, op zijn plek in de
  rangschikking — bij een lage dekkingsgraad is dat vaak een van de grootste
  posten, en die zag je eerder alleen als voetnoot. Er is ook een regel
  "Overig" voor uitgaven die onder een inkomsten-categorie of een verwijderde
  categorie staan. De regels tellen daardoor precies op tot het bedrag dat
  bovenaan bij Uitgaven staat.

## [1.11.3] - 2026-09-05

### Fixed
- **Het budgettabblad heeft een eigen jaarkiezer, het tabblad Vergelijk gebruikt
  het jaar uit de kopbalk.** Dat is met opzet — je plant volgend jaar terwijl je
  de rest van de app op dit jaar laat staan — maar niets zei dat. Wie het budget
  van 2027 invulde en dan ging vergelijken, kreeg zwijgend 2026 te zien. De
  kiezer heet nu "Budget voor", en zodra de twee jaren verschillen staat er één
  regel uitleg boven de tabel.
- **"Nieuwe categorie" deed niets in de desktop-app.** Electron heeft geen
  `window.prompt()` — Chromium ondersteunt het niet in een ingebedde app. De
  knop vroeg om een naam, kreeg niets terug, en stopte er stilzwijgend mee:
  geen venster, geen foutmelding, niets. In de browser (Home Assistant) werkte
  hij wel, dus het viel nergens anders op.

  Het waren er **vijf**, niet één: categorie toevoegen, subcategorie toevoegen,
  categorie hernoemen, subcategorie hernoemen, en een patroon handmatig
  toevoegen. Allemaal dood in de standalone app. Er is nu een eigen
  invoervenster (`components/TextPrompt.jsx`) dat overal werkt — met Enter om
  te bevestigen, Escape om te annuleren, en bij hernoemen staat de huidige naam
  al ingevuld en geselecteerd.
- **Een handmatig patroon vroeg vroeger om een "Categorie ID" en een "Sub
  ID"** — interne identificatiecodes die je onmogelijk uit je hoofd kan weten.
  Nu tik je de tekst in en kies je de categorie met dezelfde kiezer als overal
  elders in de app.
- **Paars vierkantje op het setupscherm.** Linksboven stond een gekleurd blokje
  als tijdelijke plaatshouder. De hernoeming naar Squirrel heeft het logo in de
  zijbalk vervangen maar dit vergeten, dus het allereerste scherm dat een
  nieuwe gebruiker ziet toonde een lege paarse tegel. Nu staat de eekhoorn er.

## [1.11.2] - 2026-09-05

### Desktop-app (macOS)
- **De Mac-versie meldde zich als "beschadigd".** Dat is het ergste wat macOS
  kan zeggen: het klinkt als een kapotte download en er is geen knop om het
  alsnog te openen. De oorzaak was niet dat de app ongetekend is, maar dat de
  handtekening die de linker achterliet niet klopte met de inhoud van het
  pakket — `spctl` noemde het letterlijk *"code has no resources but signature
  indicates they must be present"*. Dat is een geldigheidsfout, geen
  vertrouwenskwestie.

  De app wordt nu na het bouwen ad-hoc ondertekend (`electron/afterPack.js`).
  Daarmee klopt de verzegeling, heet hij weer `be.ward.familiebudget` in plaats
  van `Electron`, en zegt macOS het normale *"onbekende ontwikkelaar"* — met
  rechtermuisklik → Openen kan je er wél doorheen. Dat is één keer klikken in
  plaats van een doodlopende straat.
- **Geen auto-update op de Mac, met opzet.** macOS vervangt een app alleen als
  die met een Apple Developer ID ondertekend is. Zonder dat certificaat zou de
  app bij elke nieuwe versie ~100 MB downloaden en die daarna moeten weggooien,
  telkens opnieuw en zonder iets te zeggen. Hij probeert het nu niet meer en
  zet één regel in het startlogje. Op Windows werkt bijwerken wél.
- `README-desktop.md` beschrijft nu allebei de platformen: welke `.dmg` je
  nodig hebt (Apple Silicon of Intel), hoe je er de eerste keer doorheen komt,
  en waar je database staat op elk systeem.

## [1.11.1] - 2026-09-05

### Fixed
- **De agenda-hints waren stuk, en niemand kon dat zien.** Bij het herschrijven
  van `server.js` voor de KBO-opzoeking (commit f09309b) zijn
  `/api/calendar/list` en `/api/calendar/events` per ongeluk verdwenen. De
  frontend vangt een mislukte oproep netjes op met een lege lijst — precies wat
  je wil als er écht geen agenda is, maar daardoor zag een ontbrekende route er
  exact hetzelfde uit als een niet-ingestelde agenda. Beide routes staan er
  weer, inclusief de controle die voorkomt dat een entiteitsnaam zomaar in het
  Supervisor-pad terechtkomt.

### Desktop-app (Windows)
- **Er is voor het eerst écht een installer.** De Windows-build werkte al sinds
  april, maar de upload erna niet: bij release 1.0.20 werd een werkende `.exe`
  gebouwd en daarna weggegooid. Zowel 1.0.15 als 1.0.20 hebben nul bestanden.
  Het artefact wordt nu als eerste bewaard en met `if: always()`, zodat een
  mislukte publicatie nooit meer een geslaagde build vernietigt.
- **De app werkt zichzelf bij.** Bij het opstarten wordt gekeken of er een
  nieuwe versie is; die wordt op de achtergrond gedownload en bij de volgende
  herstart geïnstalleerd. Mislukt de controle, dan gebeurt er stilletjes niets.
- **Twee kopieën tegelijk kan niet meer misgaan.** Zonder slot probeerde de
  tweede de poort te pakken, mislukte dat, en kreeg je een foutmelding. Nu
  springt gewoon het bestaande venster naar voren.
- **Vrije poort in plaats van vast 3001.** En belangrijker: de controle keek op
  `127.0.0.1` terwijl de server op `0.0.0.0` luistert. Een bezette poort leek
  daardoor vrij, waarna de app vrolijk verbond met wat er al draaide — en dus
  díe gegevens toonde.
- **Je gegevens staan nu in `%APPDATA%\Squirrel`**, niet in
  `%APPDATA%\squirrel-desktop`. electron-builder neemt `productName` niet over
  in het gepakte pakket, dus viel de naam terug op de technische projectnaam.
- **Een echt eekhoorn-icoon op de app.** `win.icon` wees naar een `icon.ico` die
  nooit bestaan heeft, dus alle builds tot nu toe droegen het standaard
  Electron-logo.
- **Een startlogje** in `%APPDATA%\Squirrel\startup.log`, met het pad ernaartoe
  in de foutmelding. Een gepakte app heeft geen console: "hij start niet" was
  daardoor niet te onderzoeken.
- Installer heet nu `Squirrel-Setup-<versie>.exe` zonder spaties. Met spaties
  had één bestand drie namen — op schijf, in `latest.yml`, en zoals GitHub het
  opslaat — en liep de auto-update op een 404.
- `README-desktop.md`: installeren, de SmartScreen-waarschuwing, waar je
  database staat, en welke twee functies alleen onder Home Assistant bestaan.

## [1.11.0] - 2026-09-04

### Changed
- **Een echte eekhoorn als add-on-icoon.** Er stond helemaal geen `icon.png` in
  de add-on, en dan toont Home Assistant een puzzelstukje — vandaar het
  legopoppetje in het add-on-overzicht. Nu staan er een `icon.png` en een
  `logo.png` met dezelfde eekhoorn die ook linksboven in de app staat
  (letterlijk hetzelfde pad uit lucide), in de kleuren van de app.
- **Zijbalkicoon is nu `mdi:rodent`** in plaats van een pinda. Material Design
  Icons heeft geen eekhoorn — alle 7.447 iconen nagekeken — en Home Assistant
  laat voor de zijbalk alleen `mdi:`-namen toe, geen eigen afbeelding. `rodent`
  is een knaagdier mét gekrulde staart en komt daarmee het dichtst in de buurt.
- Beschrijving is nu gewoon "Huishoudbudget".

### Added
- **Budget opbouwen uit je historiek.** Het budgettabblad was tot nu toe 120
  lege vakjes en de vraag om te gokken — en dat was ook te zien: er stond nog
  nooit één budget in. De knop "Opbouwen uit historiek" leest nu je echte
  uitgaven en vult het jaar in.
- **Elke betaler krijgt een ritme.** Maandelijks, per kwartaal, jaarlijks,
  seizoensgebonden, doorlopend variabel of eenmalig — en het bedrag komt in de
  maanden waarin het écht valt, niet uitgesmeerd over twaalf. Dat is het hele
  verschil: alles gemiddeld × 12 gaf €47.971, met ritme €35.976. Overige
  Verzekeringen alleen al ging van €4.457 naar €1.717, omdat daar één
  maandpremie naast twee jaarpremies van AXA staat.
- **Drie stappen, en er wordt niets geschreven tot je "Overnemen" klikt**:
  welke jaren als bron, dan alles nakijken (onzekere rijen bovenaan, met een
  strip van twaalf vakjes die toont wat er in het raster komt), dan het
  jaaroverzicht.
- **Gestopte inkomsten worden niet doorgetrokken.** Als een betaler in dezelfde
  subcategorie wordt opgevolgd door een andere — VOXDALE stopt in juni,
  BLACKBIRDS begint in juli — staat dat erbij en telt de oude niet meer mee.
  Zonder dat stond er €44.571 aan loon in het budget dat niemand nog verdient.
- **Jaaroverzicht boven het raster**: inkomsten, uitgaven, netto en de zwaarste
  maanden ("juni €4.233 tegenover €2.997 gemiddeld"). Allemaal afgeleid van het
  raster zelf, dus elke wijziging in een cel beweegt mee.
- Achter elke rij die niet alle twaalf maanden vult staat nu een merkteken
  (J, K, 4×), zodat één bedrag in december leest als een jaarfactuur en niet
  als elf vergeten vakjes.
- `backend/tools/check-rhythm.mjs` controleert de indeling tegen een echte
  database. Zes invarianten, waaronder "er mag geen euro verdwijnen".

### Fixed
- **Rondklikken door de jaren schreef lege jaren weg.** Laden en opslaan
  hingen allebei aan het geselecteerde jaar; duurde het laden langer dan de 500
  ms van de autosave, dan werden de cijfers van het vórige jaar in het nieuwe
  geschreven. Zo zijn de lege schillen voor 2025 en 2027 in de database
  ontstaan zonder dat er ooit iets ingevuld is. Er wordt nu pas opgeslagen als
  het laden gelukt is én je zelf iets gewijzigd hebt.
- **Een mislukte lading werd als leeg budget opgeslagen.** Nu blokkeert dat het
  opslaan en staat er een waarschuwing.
- **Ongeldige invoer schreef `null` in de database.** `Math.max(0, NaN)` is
  `NaN`; op het scherm werd dat weer 0, dus het zag er goed uit terwijl de
  opgeslagen rij stuk was.
- **Een cel ging dood na Enter.** De invoer hield de focus, maar de component
  dacht van niet — elke volgende toetsaanslag werd genegeerd. Typen, Enter,
  typfout zien en opnieuw typen deed niets. Enter blijft nu in bewerkmodus.
- Gearchiveerde categorieën verschenen alsnog in het budgetraster.
- Bedragen gebruiken nu hetzelfde minteken als de rest van de app
  (−€500 in plaats van €-500).
- De grijze balk achter elke maandcel toont eindelijk wat je in die maand
  werkelijk uitgaf. Die stond al drie versies klaar maar werd nooit getekend.

## [1.10.0] - 2026-09-04

### Changed
- **De app heet nu Squirrel.** Naar het prentenboek met de twee eekhoorns: de
  ene legt de hele herfst nootjes aan voor de winter, de andere feest gewoon
  door. Een eekhoorn moet ook budgetteren.
- Nieuw icoon in de HA-zijbalk (een nootje — Material Design heeft geen
  eekhoorn) en een echte eekhoorn als logo linksboven in de app.
- De interne naam van de add-on blijft `familiebudget`. Die gebruikt Home
  Assistant als identiteit én als pad naar je database
  (`/addon_configs/{repo}_familiebudget`); hem hernoemen zou er een nieuwe
  add-on van maken en je gegevens achterlaten. Je ziet die naam nergens.

## [1.9.2] - 2026-09-04

### Fixed
- **Zelfs Colruyt werd niet gevonden.** De bank schrijft "COLRUYT ANTWERPEN 1"
  en "3573 COLRUYT ANTWERPEN ANTWERPEN 1" — dat filiaalnummer bleef aan de naam
  plakken, waardoor geen enkele bron iets vond. Losse cijfers vooraan (3 of meer)
  en achteraan worden nu weggehaald. "COLRUYT ANTWERPEN" vindt nu gewoon een
  supermarkt.
- **Betaalplatformen die hun domein vooraan zetten** in plaats van een sterretje:
  "pay.nl fietsen de geus" leverde niets op, "fietsen de geus" is een
  fietsenwinkel. Nu herkend voor pay.nl, mollie.com, ccv.eu, sumup.com,
  buckaroo.nl, adyen.com en payconiq.com. Namen die écht op .com eindigen
  (Bol.com, Zara.com) blijven ongemoeid.
- **Platformen die achteraan staan**: "De Groeispurters via Mollie" wordt nu
  "De Groeispurters".

## [1.9.1] - 2026-09-04

### Added
- **Afgekorte namen worden nu ook herkend.** De bank kapt de tegenpartij af
  ("CAMPAGNE COMPAGN", "KLIM EN BOULDERZAAL THE I"), waardoor het opzoeken
  niets vond. Er wordt nu ook op het begin van de naam gezocht, en alleen als
  er precies één bedrijf op past. Dat lost er zeven extra op, waaronder
  CAMPAGNE COMPAGN → cultureel onderwijs.

### Fixed
- **"SP " voor een naam werd niet weggehaald.** De bank schrijft "SP IN DEN
  OLIFANT BV" en "SP BRAUZZ. BV"; met dat voorvoegsel erbij vindt geen enkele
  bron iets. Zonder is "in den olifant" gewoon een speelgoedwinkel. Namen die
  écht met SP beginnen (SPAR) blijven ongemoeid.
- **BANKSYS-transacties bleven bij elke import terugkomen.** De bank geeft er
  niets bij: lege mededeling, altijd hetzelfde type. De app weigert daarom een
  patroon te onthouden voor dat soort verzamelnamen. Je kon dat al forceren met
  ⌘/Shift+klik, maar dat werkte overal behalve op het sorteerscherm — precies
  waar je ze tegenkomt — en niemand kon het weten. Nu staat het erbij, en het
  werkt: één keer met ⌘ een categorie kiezen zet alle 58 goed én zorgt dat ze
  niet meer terugkomen. Zonder ⌘ blijft het gedrag zoals het was.

## [1.9.0] - 2026-09-04

### Added
- **Het handelsregister (KBO) als tweede bron bij de ?-knop.** OpenStreetMap
  vindt vooral winkels die je zelf al herkent; de namen die écht raadselachtig
  zijn, zijn vennootschapsnamen. Die staan in de KBO met hun geregistreerde
  activiteit — dezelfde info die je op het Staatsblad vindt als je ze googelt.
  Koffieland, Konditori, House of FAMM, Vroom & Vroom, 'T Stad Leest en De
  Bloemerie worden nu wél herkend; OpenStreetMap kon geen van die zes plaatsen.
- Beide bronnen worden **tegelijk** bevraagd en elk resultaat verschijnt zodra
  het binnen is, met de bron erbij. Zo zie je ook wanneer ze het oneens zijn:
  bij Vroom & Vroom wees OpenStreetMap naar een kunstencentrum in Brussel (fout,
  wordt verworpen) terwijl de KBO "restaurant" zegt.
- **De KBO-zoekactie gaat nergens naartoe.** De index staat lokaal op je eigen
  machine, dus die werkt ook als je het online opzoeken uit laat staan. De
  instelling gaat voortaan alleen nog over OpenStreetMap.

### Setup
De index bouw je zelf uit je eigen KBO-download (je moet daarvoor geregistreerd
zijn — de licentie staat gebruik toe, geen herverdeling, en er zitten namen van
eenmanszaken in):

    node backend/tools/build-kbo-index.mjs ~/Downloads/KboOpenData_..._Full ~/kbo-index.db

Duurt ongeveer een halve minuut en levert één bestand van 81 MB. Kopieer dat
naar /config van Home Assistant, naast budget.db. Zonder dat bestand werkt
alles gewoon verder, alleen zonder deze bron.

## [1.8.0] - 2026-09-04

### Added
- **"?"-knop bij elke transactie** die opzoekt wat voor zaak een tegenpartij is.
  Klik je erop, dan krijg je een zin als "Sportwinkel in de Willem Tellstraat,
  Antwerpen" en, als het type herkend wordt, één knop om meteen de juiste
  categorie te zetten. Er wordt nooit iets automatisch weggeschreven.
- **Staat standaard uit.** Dit is de enige functie die iets naar buiten stuurt,
  dus je zet ze zelf aan in Instellingen › Regels. Daar staat ook precies wat er
  verstuurd wordt (naam van de zaak en de gemeente, naar OpenStreetMap) en een
  **logboek van elke opzoeking** die je gedaan hebt.
- Ongeveer één op vier zaken wordt gevonden. Kleine, afgekorte en online namen
  staan meestal niet op de kaart; dan zegt de app gewoon dat er niets gevonden is.

## [1.7.0] - 2026-09-03

### Added
- **Wie heeft er betaald.** De bank zet het kaartnummer bij elke kaart- en
  Google Pay-betaling. In Instellingen › Regels koppel je een naam aan elke
  kaart die in je data voorkomt; daarna zie je bij het sorteren en in de hover
  van de transactielijst wie er betaald heeft. Vaak is dat net wat de
  subcategorie bepaalt — dezelfde kledingwinkel is iets anders naargelang wie
  er ging.

### Fixed
- Bij Google Pay-betalingen stond alleen "Google Pay" en verdween het
  kaartnummer. Dat trof 277 van de 366 kaarttransacties — precies die waar de
  kaart het nuttige signaal is. De persoon staat er nu altijd bij; de wallet is
  maar een betaalkanaal.

## [1.6.0] - 2026-09-03

### Fixed
- **Het spaarsaldo telde te veel.** Het keek naar de hele categorie "Sparen &
  Beleggen", dus alles onder Pensioensparen, Beleggingen en Spaarrekening
  Kinderen kwam in hetzelfde bedrag terecht als je gewone spaarrekening. De
  Sparen-pagina volgt nu alleen nog de subcategorie **Spaarrekening**. De
  spaarbuffer blijft ongewijzigd: die negeert nog steeds álle spaartransacties,
  want geld opzij zetten is geen uitgave.
- **Je kon potjes niet herverdelen.** "Verdeel geld" was uitgeschakeld zodra er
  niets meer te verdelen was — precies wanneer je geld tussen twee potjes wil
  verschuiven. Je kan nu altijd verdelen zolang er iets te verplaatsen is: haal
  €250 uit het ene potje en zet het in het andere.
- De min-knop van een potje keek naar het toegewezen bedrag in plaats van naar
  wat je erin gestoken hebt, waardoor een potje dat nog achter de buffer wacht
  helemaal niet aanpasbaar was.

### Changed
- Het bolletje bij Sparen (en de melding na het sorteren) verschijnt pas vanaf
  €250 — onder dat bedrag valt er toch niets te verdelen, dus vroeg het om iets
  wat je niet kon doen.

## [1.5.3] - 2026-09-03

### Fixed
- **"Overgehouden" in de geldstroom-balk kwam niet overeen met het Netto-bedrag
  bovenaan.** De balk bouwt zijn uitgaven op uit de categorie-totalen, en die
  slaan inkomsten-categorieën helemaal over. Een negatief bedrag dat onder
  Inkomsten staat — bijvoorbeeld loon dat je terugbetaalt — verlaagde dus wél je
  netto, maar was onzichtbaar in de balk, waardoor "Overgehouden" te hoog uitviel.
  Hetzelfde gold voor transacties op een categorie die niet meer bestaat.
  Die bedragen krijgen nu een eigen segment "Overig" (met uitleg bij het
  aanwijzen), zodat de balk altijd optelt tot je Uitgaven-KPI en "Overgehouden"
  altijd gelijk is aan je Netto.

## [1.5.2] - 2026-09-03

### Fixed
- **Spaarverkeer telde weer mee als uitgave in de geldstroom-balk** — precies
  wat je met de uitsluiting van "Spaarrekening" wilde vermijden. Erger nog: het
  telde alleen het geld dat érnaartoe ging (€16.980) en niet wat terugkwam
  (€6.511), omdat dat als inkomst wordt uitgesloten. Daardoor verscheen een
  "uit reserves" van €3.731 terwijl je in werkelijkheid €2.780 overhield.
  Sparen zit nu helemaal niet meer in de balk: de uitgavenbalk is exact je
  Uitgaven-KPI en wat overblijft is exact je Netto.
- Wat er met het overschot gebeurde staat er nu onder, zonder in een totaal
  mee te tellen — en netto, dus een bedrag dat heen en weer gaat valt weg
  tegen elkaar. In mei zette je €5.000 opzij terwijl je €3.977,89 overhield;
  dat verschil van €1.022,11 kwam wél uit bestaand saldo, en dat staat er nu
  ook zo. Haal je geld van de spaarrekening, dan staat dát er.
- Een maandelijkse spaaropdracht kon bij de "vaste betalers" belanden en het
  maandbedrag opdrijven. Uitgesloten subcategorieën worden daar nu overgeslagen.

## [1.5.1] - 2026-09-03

### Changed
- **"Vaste lasten" heet nu "Wat je elke maand nodig hebt"** en telt ook
  boodschappen, bakker, apotheek en brandstof mee — niet alleen de
  domiciliëringen. Het bedrag is gesplitst in vaste lasten en de rest, zodat je
  ziet waar het uit bestaat.
- **Dit is exact het bedrag waar je spaarbuffer op gebaseerd is**, en dat staat
  er nu bij: "je spaarbuffer is 5× dit bedrag". Op de Sparen-pagina stond
  "5× gem. vaste lasten", maar dat werd gerekend met álle noodzakelijke
  uitgaven — die tekst klopte niet en is aangepast.

### Fixed
- "Uit reserves" in de geldstroom-balk was niet te herleiden. Er staat nu bij
  hoe het bedrag ontstaat: wat er de rekening uit ging, wat er binnenkwam,
  hoeveel daarvan naar de spaarrekening ging, en dus wat er uit bestaand saldo
  kwam.
- Ook het bedrag dat per maand vrij overblijft toont nu zijn eigen som
  (inkomsten − nodig = vrij) in plaats van alleen een uitkomst.
- Dat vrije bedrag vergeleek de inkomsten van één maand met een gemiddelde over
  meerdere maanden zodra je op een maand filterde; beide kanten gebruiken nu
  hetzelfde jaargemiddelde.

## [1.5.0] - 2026-09-03

Het overzicht beantwoordt nu vier vragen die het eerder niet kon.

### Added
- **Waar ging je geld heen** — twee balken op dezelfde schaal: wat er binnenkwam
  en waar het heen ging, inclusief een gearceerd stuk voor wat nog niet is
  ingedeeld en een stuk voor wat naar de spaarrekening ging. Geef je meer uit
  dan er binnenkomt, dan is de onderste balk zichtbaar langer.
- **Vaste lasten** — wat er elke maand al vastligt voordat je iets beslist
  (nu ~€2.100). Herkend aan de domiciliëringen die de bank zelf aanduidt en aan
  betalingen die maandelijks terugkomen, niet aan de vast/variabel-labels: die
  zetten energie en abonnementen ten onrechte onder "variabel". Verzamel-
  rekeningen zoals PayPal en losse gewoontes worden apart gezet en niet
  meegeteld — zichtbaar, zodat je het bedrag kunt controleren.
- **Doelen** — spaarbuffer en potjes staan nu ook op het overzicht, met dezelfde
  cijfers als op de Sparen-pagina.
- **Datadekking** — het overzicht toonde twee verschillende uitgavencijfers naast
  elkaar (alles wat je uitgaf, én alleen het ingedeelde deel) zonder het verschil
  te verklaren. Nu staat overal bij hoeveel van je geld een categorie heeft.

### Fixed
- Spaarbuffer en potjes werden op twee plaatsen apart uitgerekend en konden uit
  elkaar lopen; dat is nu één berekening.

## [1.4.1] - 2026-09-02
### Fixed
- De hover-popup was één blok cursieve tekst waarin dag, agenda en de ruwe
  banklijn door elkaar liepen. Nu met duidelijke secties: bovenaan de dag (en
  wanneer de bank hem boekte als dat verschilt), daaronder AGENDA met de uren
  netjes onder elkaar, dan je eigen MEDEDELING, en onderaan plaats en kaart.
  De ruwe banklijn met kaartnummer en landcode wordt niet meer getoond.
- De popup werd afgeknipt door de tabelcel en was daardoor nauwelijks
  leesbaar; hij hangt nu los van de tabel en wijkt uit als hij niet past.

## [1.4.0] - 2026-09-02

### Added
- **Dag en agenda in de hover** van de transactielijst: zweef over een
  tegenpartij en je ziet welke dag het écht was plus wat er die dag op de
  agenda stond — "zaterdag 06/06 · 13:00 K2 klimschoenen · 15:00 mama en papa
  · 19:00 30 jarig feest Marie". De dag wordt altijd getoond, ook zonder
  agenda: weten dat het zaterdag was is op zichzelf al een aanwijzing.
- **Mededelingen worden slimmer gelezen.** Regels kijken nu ook naar de
  richting van het geld, want hetzelfde woord betekent het omgekeerde:
  "cadeau" op een betaling is er één die jij kocht, op een storting één die je
  kreeg. Daarmee worden 40 huwelijkscadeaus ("proficiat", "huwelijk", "kado
  voor jullie", "leve de liefde") correct als Inkomsten › Gift herkend in
  plaats van als aankoop.

### Fixed
- "Vakantiegeld" werd als vakantie-uitgave gelezen in plaats van als loon; die
  regel geldt nu alleen nog voor uitgaven.

## [1.3.0] - 2026-09-02

### Added
- **Agenda als hint**: toont bij het sorteren wat er in je agenda stond toen je
  betaalde — "Klimmen 🧗", "Brunch Franne", "K2 klimschoenen". Alleen als hint,
  er wordt nooit automatisch een categorie op gezet: een afspraak zegt wat je
  aan het doen was, niet waar het geld heen ging. Aan te zetten in
  Instellingen › Regels, waar je zelf kiest welke agenda's meetellen
  (werkagenda's geven vooral ruis). Leest via Home Assistant — de add-on praat
  met Supervisor over het interne netwerk, HA regelt de Google-koppeling; er
  gaat niets naar buiten. Niet beschikbaar in de desktop-app, die heeft geen
  Home Assistant.

### Fixed
- **De dag van de week klopte niet.** Die werd afgeleid uit de datum waarop de
  bank de betaling boekte, en dat loopt bij kaartbetalingen 1 tot 6 dagen achter
  op je aankoop (gemeten: 331 van 366 kaartlijnen, mediaan 2 dagen). "Koffieland,
  maandag" ging dus over een koffie van vrijdagochtend. De echte datum stond al
  in de mededeling en wordt nu gebruikt.
- Groepen telden dagen op dezelfde verkeerde manier: één namiddag winkelen die
  over drie dagen werd geboekt las als "3 dagen".

## [1.2.0] - 2026-09-01

Categoriseren is nu een stuk minder giswerk. Alles gebeurt offline — geen
internet, geen API, geen kosten.

### Added
- **Herkenningslijst**: een ingebouwde lijst van winkelketens (Kruidvat, HEMA,
  Action, Decathlon…) en algemene vakwoorden (bakker, koffie, klimzaal,
  tandarts…) die tegenpartijen automatisch aan een categorie koppelt. Ketens
  worden meteen toegepast, vakwoorden alleen voorgesteld — die zijn te vaag om
  blind te vertrouwen.
- **Controlelijst voor je iets opslaat**: "Sorteer" toont eerst een lijst met
  elke voorgestelde transactie, de categorie én *waarom* die is gekozen
  ("Herkend: woonwinkel", "Bevat colruyt"). Vink uit wat niet klopt; alleen
  het aangevinkte wordt opgeslagen. Er wordt niets geschreven tot je op
  Toepassen klikt.
- **Aanwijzingen tijdens het sorteren**: plaats, dag en tijdstip stonden al in
  de bankgegevens maar werden nooit getoond. Nu wel — "Koffieland · woensdag
  08:52 · Antwerpen" zegt een stuk meer dan "Koffieland" alleen. Bij groepen
  over meerdere dagen wordt een tijdsbereik getoond in plaats van één
  misleidende dag.
- **Heranalyseer alles** in Instellingen › Regels: doorloopt de bestaande
  achterstand opnieuw met de huidige regels en herkenningslijst. Nodig omdat
  de automatische herberekening alleen liep bij een nieuw geleerd patroon,
  waardoor een bijgewerkte herkenningslijst anders onzichtbaar bleef.

### Changed
- "Sorteer" op het transactietabblad doet nu eerst de automatische controle en
  toont de lijst; daarna ga je door naar het handmatige doorloopscherm voor de
  rest. Stond eerst weggestopt in Instellingen.

### Fixed
- Twee regels (`kredietlasten`, `beheren rek coop`) konden nooit werken: ze
  zochten in tegenpartij + mededeling, terwijl die tekst uitsluitend in het
  `type`-veld van de bank staat. Dat veld wordt nu wél gelezen.

## [1.1.1] - 2026-08-31
### Fixed
- Add-on updates appeared not to apply. Express served the frontend with no
  `Cache-Control` header at all, so browsers fell back to heuristic caching
  and held on to `index.html` — the file that names the content-hashed JS and
  CSS bundles. A stale copy kept loading the previous version's assets even
  though the container had been rebuilt, which looked exactly like the update
  failing. `index.html` is now sent `no-cache` (revalidate, still a cheap 304
  when unchanged) and the hashed assets under `/assets/` are marked immutable,
  since a changed file always gets a new URL

## [1.1.0] - 2026-08-31

Full visual overhaul plus a new comparison tab. Two of the fixes below are
data-safety issues that were silently live in 1.0.22 — see **Fixed**.

### Added
- **Vergelijk tab**: compare any two periods — month vs month, a month vs the
  rest of the year, actual vs budget, or your spending against the average
  Belgian household. Periods of unequal length are normalised to a per-month
  average automatically. A "Kies zelf" mode picks month and year for both
  sides independently, with a swap button
- National benchmark uses Statbel's Household Budget Survey (2024). It
  compares **share of spending**, not euro amounts: Statbel publishes the
  distribution as percentages and does not publish absolute figures by
  household composition, so a euro-level "family of four" comparison would
  have been invented. Shares are also income-neutral. The view warns when
  under 80% of spending is categorised, since the percentages are not
  representative below that
- Comparison ranks the biggest movers in both directions rather than only
  showing a total, so you can see *what* changed
- **First-run onboarding**: household profile, starter categories and an
  optional first budget pass. Everything it sets stays editable afterwards
  in Settings › Profiel
- **Guided processing funnel** replacing the standalone Tinder mode:
  progress overview → fast batch sorting by counterparty → one-by-one review
  of the ambiguous rest → handoff into Sparen
- Dashboard month strip: click a month to scope, shift/⌘-click for several.
  Previously the month filter existed but could only be driven from the
  Transactions tab
- Net trend chart with a labelled zero line and a dashed average reference
- Savings transfers (Sparen & Beleggen) are excluded from spending by
  default, as seeded entries on the Settings exclusion list — remove any of
  them to count that transfer type as spending again
- Responsive layout: the icon rail becomes a bottom tab bar on phones, with
  iOS safe-area handling, and the category picker opens as a bottom sheet
  instead of a desktop-sized popover

### Fixed
- **Automatic backups had never once run.** `backup.js` called `existsSync()`
  without importing it, so every `createBackup()` threw and was swallowed by
  its own try/catch, logging only "[Backup] Failed". The daily snapshot and
  the safety snapshot taken before a restore had both silently no-opped since
  the feature shipped, leaving `/config/backups/` empty
- **Restoring a backup silently discarded all budgets.** Two restore paths had
  diverged; the one reachable from the Importeer button only set local state
  and never called the endpoint that restores budgets (they live under their
  own state key) or takes the pre-import snapshot
- Loading state had no HTTP error check, so a failed read looked identical to
  an empty database and armed the autosave to overwrite the real one with
  empty defaults. A failed read now blocks and reports instead of saving
- Exporting a backup could download an HTTP error body as a "backup" file
- Settings is a real tab now, not a full-screen dialog
- Category picker rendered detached from its button when the trigger sat left
  of centre, and did not follow the button when the view scrolled or zoomed
- Budget tab: overlapping text from three stacked sticky rows at guessed
  offsets; rebuilt as a table with fixed-height frozen rows
- Number fields (known savings balance, pot targets) could not be cleared —
  clearing produced 0, which immediately re-rendered as an undeletable "0"
- Net trend chart drew months with no data as €0, inventing a flat line
  across the rest of the year, and had a visibly uneven stroke width
- Spaarquote card navigated to Transactions instead of Sparen, a leftover
  from when it showed the uncategorised count
- Dashboard KPI cards and expense rows overflowed the screen on mobile
- Quick-categorise button appeared on every tab instead of only Transactions

### Changed
- New visual system: deep indigo dark mode, warm cream light mode, violet
  accent across both, Instrument Serif headings, real icons throughout (no
  emoji)
- Green and red are now reserved strictly for signed euro amounts. Comparison
  deltas use a direction arrow and neutral text, since a delta breaks the
  positive/negative mapping
- Backup export/import format is unchanged from 1.0.22 and round-trips in
  both directions, so rolling back is safe

## [1.0.22] - 2026-08-20
### Fixed
- HA add-on build: added missing `build.yaml` — Supervisor was no longer falling back to a default base image when none was specified, so `docker build` failed with "base name ($BUILD_FROM) should not be blank" and the 1.0.21 update could not install

## [1.0.21] - 2026-08-20
### Added
- Transactions: month and category filters now support selecting multiple values at once (previously single-select only)
- PayPal import: merged transactions are now flagged with `paypalMerged`, shown as a "PP" badge next to the counterparty, and findable by searching "paypal" even though the counterparty was renamed to the real merchant
- PayPal import: re-importing a historical PayPal CSV retroactively backfills the `paypalMerged` marker onto transactions that were merged before this feature existed, shown as "🏷️ Markeer als PayPal" in the import preview
- Transactions: right-click → "🚫 Verwijder categorie" clears a transaction's category, making it uncategorized again
- Categories tab: rename, delete (with a transaction-count warning), and archive for both categories and subcategories — archived items are hidden from the category picker but stay visible (dimmed) in the Categories tab and remain intact in stats/history
- New `IDEAS.md` backlog file for future feature ideas
### Fixed
- PayPal import: uploading a "Balance Reconciliation Report" (a different PayPal export format with no transaction data) now shows a clear explanation and points to the correct export instead of a generic "no transactions found" message
- Tinder mode: skipping a transaction now leaves it truly uncategorized instead of dumping it into the "Nog te verwerken" parking category

## [1.0.20] - 2026-04-08
### Fixed
- Auto-categorization: `/r\.?v\.?a\.?/` matched `rva` inside `vervaldag`, silently misfiling "vervaldag krediet" transactions as Inkomsten › Andere; regex now uses lookbehind/lookahead so RVA only matches as a standalone token
- Auto-categorization: `huur\b` matched the end of `verhuur`, potentially misfiling rental income as Wonen › Lening; fixed to `\bhuur\b`
- Auto-categorization: `eten\b` matched inside `winkelketen`; fixed to `\beten\b`
- CatPicker dropdown cut off at top/bottom of screen; replaced flip logic with viewport-clamped positioning (open below if room, otherwise above, always clamped)
- Dashboard percentage mismatch between pie chart and category bar list; income categories are now excluded from `totalExp`
- Category detail modal: subcategories now sorted by size (largest first), and percentages are relative to total expenses instead of the category total
- Category detail modal: clicking outside the modal now closes it; background scroll is locked while open
- CatPicker dropdown clipped by scroll containers; rebuilt with React portal + `position: fixed`
- Electron: daily backup crashed on second launch because today's backup already existed; now skips gracefully
- Electron: app reopened after closing; now always quits on window-all-closed (all platforms)
### Added
- Auto-categorization: new rule for `vervaldag krediet` / `échéance crédit` descriptions → Wonen › Lening (certain confidence)
- Transactions: right-click context menu now includes "🔍 Toon alle transacties: [tegenpartij]" — filters to that counterparty across all years, clearing all other filters
- Year dropdown: added "Alle jaren" option to view transactions across all years at once
- GitHub Actions: upgraded Node.js from 20 to 22

## [1.0.19] - 2026-04-04
### Fixed
- Electron: app crashed silently before showing any error dialog because `app.getPath('userData')` was called synchronously at module load time, before the app was ready; moved env var setup inside `app.whenReady()`

## [1.0.18] - 2026-04-04
### Fixed
- Electron: app still bounced without opening because ESM `import()` cannot resolve modules across the asar virtual filesystem boundary (e.g. `express` in `app.asar` was unreachable from unpacked `backend/`); disabled asar entirely so all files are real paths on disk

## [1.0.17] - 2026-04-04
### Fixed
- Electron: app bounced in dock and never opened because ESM `import()` cannot read files from inside the asar virtual filesystem; backend files are now unpacked to a real directory (`app.asar.unpacked/backend/`) and `main.js` resolves the correct path when packaged
- Electron: startup errors now show a dialog with the error message instead of silently quitting

## [1.0.16] - 2026-04-04
### Fixed
- Electron build CI: add missing `repository` field to `package.json` and pass `--publish never` to prevent electron-builder from trying to publish directly (upload is handled by the workflow instead)

## [1.0.15] - 2026-04-04
### Fixed
- Desktop layout: header year/theme/settings buttons no longer overlap nav tabs
- Dashboard: pie chart legends no longer get cut off in narrow panels
### Added
- Electron desktop app: self-contained `.exe` (Windows) and `.dmg` (macOS) installers built automatically on each GitHub release — no Home Assistant required

## [1.0.14] - 2026-04-04
### Fixed
- PayPal auto-categorization: now runs autoCat() when a Crelan match exists but has no category assigned
- Mobile layout: header nav scrolls horizontally on small screens; A+/A− zoom buttons hidden on mobile
- Mobile layout: Sorteer button no longer wraps to two lines
- Mobile layout: Dashboard grid collapses to single column on small screens
- Mobile layout: Transaction table scrolls horizontally instead of squishing
- Mobile layout: Budget table scrolls horizontally; column header, Netto Balans, and Inkomsten/Uitgaven rows are sticky
- Mobile layout: Patronen tables scroll horizontally
- Mobile layout: Sparen stats bar wraps instead of overflowing

## [1.0.13] - 2026-04-03
### Fixed
- PayPal import: detect US date format (M/D/YYYY) automatically so March transactions are no longer misread as invalid dates
- PayPal import: support new "Omschrijving" column layout so "Bankstorting" rows are correctly filtered in both old and new PayPal CSV exports

## [1.0.12] - 2026-04-03
### Fixed
- Data no longer lost after update — database now stored in HA persistent config directory

## [1.0.11] - 2026-04-01
### Added
- Added `repository.json` so the add-on is discoverable via the HA add-on store

## [1.0.10] - 2026-03-04
### Added
- Budget tab data is now included in export and wiped by "Verwijder alle data"
- Settings modal redesigned as a tabbed layout (Regels / Patronen / Data)

## [1.0.9] - 2026-03-04
### Fixed
- Fixed split transaction feature crashing due to missing `fD` import
### Added
- Added "Verwijder alle data" button in settings with automatic backup before deletion
- Added `.gitignore` and `launch.json` dev server configurations

## [1.0.8] - 2026-03-02
### Fixed
- Fixed `/run.sh: not found` error by ensuring correct `COPY` path in Dockerfile.
- Restored `nodejs` and `npm` to the `apk add` command (previously missing).
- Deleted problematic `build.yaml` to fix Supervisor regex parsing errors.

## [1.0.7] - 2026-03-02
### Changed
- Attempted dependency fix (failed build due to missing Node.js in Dockerfile).

## [1.0.2] - 2026-03-01
### Changed
- Updated `vite.config.js` with `base: './'` for Home Assistant Ingress compatibility.
- Fixed asset 404 errors in the Web UI.

## [1.0.1] - 2026-03-01
### Fixed
- Set `init: false` in `config.yaml` to resolve `s6-overlay-suexec` PID 1 fatality.
- Added `python3`, `make`, and `g++` to `Dockerfile` for `better-sqlite3` ARM64 compilation.

## [1.0.0] - 2026-03-01
### Added
- Initial local add-on structure for FamilieBudget.
# Squirrel op Windows en macOS

Squirrel draait normaal als Home Assistant add-on, maar hij werkt net zo goed
als gewone app op Windows of macOS. Alles zit erin: de app, de database, de
server. Je hebt geen Home Assistant nodig en er gaat niets naar het internet.

## Installeren op Windows

1. Dubbelklik `Squirrel-Setup-<versie>.exe`.
2. **Windows zegt "Windows heeft uw pc beveiligd".** Dat is te verwachten —
   klik **Meer informatie** en dan **Toch uitvoeren**.

   Dat waarschuwingsscherm betekent niet dat er iets mis is met het bestand. Het
   betekent dat de installer niet ondertekend is met een betaald
   code-signing-certificaat (een paar honderd euro per jaar). Windows kent de
   maker niet en waarschuwt dan standaard.
3. Kies waar hij komt te staan en klik door. Je krijgt een snelkoppeling op je
   bureaublad en in het startmenu.

**De eerste start kan een halve minuut duren.** Windows scant een nieuwe,
onondertekende app één keer helemaal. Daarna start hij in een seconde.

## Installeren op een Mac

Kies het juiste bestand:

- **`Squirrel-<versie>-arm64.dmg`** voor een Mac met Apple Silicon (M1 t/m M4).
- **`Squirrel-<versie>-x64.dmg`** voor een oudere Mac met Intel.

Weet je het niet: appelmenu → *Over deze Mac*. Staat er "Apple M…", dan arm64.

1. Open de `.dmg` en sleep **Squirrel** naar **Programma's**.
2. **Start hem de eerste keer met rechtermuisklik → Openen** (niet met een
   dubbelklik). Bevestig daarna met **Openen** in het venster dat verschijnt.

   Dat moet omdat de app niet ondertekend is met een Apple Developer ID.
   Dubbelklik je gewoon, dan weigert macOS zonder bruikbare knop. Via
   rechtermuisklik → Openen krijg je die knop wél, en je hoeft dit maar één
   keer te doen.

   Lukt het zo niet, dan staat de knop in **Systeeminstellingen → Privacy en
   beveiliging**, onderaan: *"Squirrel is geblokkeerd" → Toch openen*.

Zegt macOS dat de app **beschadigd** is, dan is de download stukgelopen —
download opnieuw. Een correct gedownloade Squirrel meldt "onbekende
ontwikkelaar", nooit "beschadigd".

### Updates op de Mac

**De Mac-versie werkt zichzelf niet bij.** macOS wil een app alleen vervangen
als die met een Apple Developer ID ondertekend is, en dat certificaat hebben we
niet. De app doet daarom geen moeite: hij zou telkens 100 MB downloaden om die
daarna te moeten weggooien.

Nieuwe versie: download de nieuwe `.dmg` en sleep hem er weer overheen. Je
gegevens staan los van de app en blijven gewoon staan.

Op Windows werkt bijwerken wél automatisch.

## De eerste keer

Je begint met een lege app en wordt door een korte setup geleid: welke
categorieën je wil gebruiken en wat je ongeveer uitgeeft aan wonen,
boodschappen en vervoer. Dat mag ruw — je past het later toch aan.

Daarna: **Importeer** rechtsboven, en kies de CSV die je bij je bank downloadt.

## Waar staan je gegevens

**Windows:**
```
%APPDATA%\Squirrel\data\budget.db
```
Plak dat pad in de adresbalk van Verkenner om er te komen.

**macOS:**
```
~/Library/Application Support/Squirrel/data/budget.db
```
In de Finder: *Ga → Ga naar map…* en plak het pad.

Alles staat in dat ene bestand: transacties, categorieën, budgetten,
spaarpotjes.

- **Back-up**: kopieer `budget.db` ergens anders heen. Meer is het niet.
  De app maakt zelf ook dagelijks een kopie in `data\backups\`.
- **Verhuizen naar een andere computer**: installeer Squirrel daar en zet je
  `budget.db` op dezelfde plek terug, met de app afgesloten. Dat werkt ook
  tussen Windows en Mac — het is hetzelfde bestandsformaat.
- Of gebruik **Instellingen → Back-up** in de app zelf, dat exporteert één
  bestand dat je later weer kan inlezen.

Je gegevens verlaten je computer niet. Er is geen account, geen cloud, geen
synchronisatie.

## Updates

**Op Windows** kijkt de app bij het opstarten of er een nieuwe versie is,
downloadt die op de achtergrond en installeert hem bij de volgende herstart. Je
hoeft niets te doen. Werkt het internet even niet, dan slaat hij het stil over.

**Op macOS niet** — zie hierboven bij *Updates op de Mac*.

## Wat je niet ziet (en waarom)

Twee dingen bestaan alleen in de Home Assistant-versie. Ze zijn niet stuk — ze
kunnen daar gewoon niet werken:

- **Agenda-hints** bij een transactie ("wat stond er in je agenda toen je dit
  betaalde") komen uit de agenda's van Home Assistant. Zonder Home Assistant is
  er geen agenda om te bevragen.
- De **"?"-knop** die opzoekt wat voor zaak een onbekende naam is, gebruikt
  deels een lokale kopie van het KBO-register. Die is ~81 MB, moet je zelf
  aanmaken uit een download waarvoor je je moet registreren, en mag niet zomaar
  meegeleverd worden. Zonder die kopie werkt de OpenStreetMap-helft nog wel.

## Als hij niet opstart

Er wordt bij elke start een logje weggeschreven:

```
Windows:  %APPDATA%\Squirrel\startup.log
macOS:    ~/Library/Application Support/Squirrel/startup.log
```

Daar staat precies hoe ver hij kwam. Stuur dat door en het is meestal meteen
duidelijk. Start de app twee keer, dan springt gewoon het bestaande venster naar
voren — dat hoort zo.

## Zelf bouwen

De installers worden gebouwd door GitHub Actions
(`.github/workflows/electron-build.yml`), op een echte Windows- en macOS-machine,
omdat `better-sqlite3` per platform gecompileerd moet worden.

```bash
# lokaal, voor het platform waar je op zit
cd familiebudget
npm ci
(cd frontend && npm ci && npm run build)
mkdir -p backend/public && cp -r frontend/dist/* backend/public/
npm run electron:build:win     # of :mac / :linux
```

Op macOS kan je geen Windows-installer maken: `better-sqlite3` is een
native-module en heeft de doel-toolchain nodig. Draai daarvoor de workflow.

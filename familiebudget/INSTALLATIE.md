# FamilieBudget — Installatie op Home Assistant

## Wat heb je nodig?

- Je Home Assistant draait op een Raspberry Pi met HAOS
- Een computer op hetzelfde WiFi-netwerk als je Pi
- Je bestaande budget backup (JSON bestand) als je die hebt

---

## Stap 1: Samba Add-on installeren

De Samba add-on maakt de mappen van je Pi zichtbaar als netwerkschijf op je computer.
Zo kun je bestanden slepen en neerzetten — geen terminal nodig.

1. Open Home Assistant in je browser (`http://homeassistant.local:8123`)
2. Ga naar **Settings** → **Add-ons** → **Add-on Store** (knop rechtsonder)
3. Zoek naar **"Samba share"**
4. Klik op **"Samba share"** (de officiële van Home Assistant)
5. Klik **Install**
6. Na installatie: ga naar het **Configuration** tabblad
7. Stel een gebruikersnaam en wachtwoord in, bijvoorbeeld:
   ```
   username: ward
   password: jouw-wachtwoord
   ```
8. Klik **Save**
9. Ga terug naar het **Info** tabblad en klik **Start**

### Verbinden vanuit Windows

1. Open **Verkenner** (Windows + E)
2. Typ in de adresbalk: `\\homeassistant.local` en druk Enter
3. Voer je Samba gebruikersnaam en wachtwoord in
4. Je ziet nu mappen zoals: `addons`, `backup`, `config`, `share`, `media`

> **Tip:** Klik met de rechtermuisknop op de `addons` map → "Pin to Quick Access"
> zodat je deze later makkelijk terugvindt.

### Verbinden vanuit macOS

1. Open **Finder**
2. Druk **Cmd + K** (of menu: Ga → Verbind met server)
3. Typ: `smb://homeassistant.local`
4. Voer je Samba gebruikersnaam en wachtwoord in
5. Kies de map `addons`

---

## Stap 2: FamilieBudget kopiëren naar de Pi

1. Pak het ZIP-bestand `familiebudget-addon.zip` uit op je computer
2. Open de `addons` netwerkmap (uit stap 1)
3. Sleep de hele map `familiebudget` naar `addons`

Het resultaat moet er zo uitzien:

```
addons/
  └── familiebudget/
      ├── config.yaml
      ├── Dockerfile
      ├── build.yaml
      ├── run.sh
      ├── backend/
      │   ├── server.js
      │   ├── db.js
      │   ├── backup.js
      │   ├── migrate.js
      │   └── package.json
      └── frontend/
          ├── package.json
          ├── vite.config.js
          ├── index.html
          └── src/
              ├── App.jsx
              ├── budget-v5a.jsx
              ├── main.jsx
              └── index.css
```

---

## Stap 3: Add-on installeren in Home Assistant

1. Ga naar **Settings** → **Add-ons**
2. Klik rechtsonder op **Add-on Store**
3. Klik rechtsboven op de **⋮** (drie puntjes) → **Check for updates**
4. Scroll naar beneden — je zou een sectie **"Local add-ons"** moeten zien
5. Klik op **FamilieBudget**
6. Klik **Install**

> ⏳ De eerste keer duurt dit **5-15 minuten** op een Pi 4.
> HA bouwt de hele app: Node.js, dependencies, frontend compilatie.
> Dit is eenmalig — updates zijn sneller.

7. Na installatie: klik **Start**
8. Klik op **"OPEN WEB UI"** of kijk in je zijbalk — daar staat nu **"Budget"**

---

## Stap 4: Je data importeren

Als je een bestaande JSON backup hebt van de browser-versie:

1. Open FamilieBudget (via de zijbalk of "Open Web UI")
2. Ga naar **⚙️ Instellingen** (tandwiel icoon)
3. Klik **Import Backup**
4. Selecteer je JSON bestand
5. Bevestig de import

Klaar! Al je transacties, regels en categorieën zijn nu op de Pi.

---

## Updates installeren

Wanneer we nieuwe code bouwen:

1. Download het nieuwe ZIP-bestand
2. Pak het uit
3. Open de `addons` netwerkmap via Verkenner/Finder
4. Verwijder de bestaande `familiebudget` map
5. Sleep de nieuwe `familiebudget` map naar `addons`
6. Ga in HA naar **Settings** → **Add-ons** → **FamilieBudget**
7. Klik op **Rebuild** (of Uninstall → Install als Rebuild niet zichtbaar is)

> Je data blijft bewaard — die zit in een aparte map die HA beheert (`/data`),
> niet in de add-on map zelf.

---

## Backups

- **Automatisch:** De app maakt elke dag een backup (laatste 7 dagen bewaard)
- **Handmatig:** Via ⚙️ → Export Backup in de app
- **HA Snapshots:** Als je een HA snapshot maakt, wordt de budget-data automatisch meegenomen

---

## Problemen?

### "FamilieBudget verschijnt niet bij Local add-ons"
- Controleer of de mapstructuur klopt (config.yaml moet DIRECT in `addons/familiebudget/` staan, niet in een sub-map)
- Klik nog een keer op ⋮ → Check for updates

### "Install duurt heel lang"
- Dit is normaal op een Pi 4 (5-15 min eerste keer)
- Kijk in het **Log** tabblad van de add-on voor voortgang

### "Open Web UI" geeft een fout
- Wacht 10-20 seconden na het starten — de server moet even opstarten
- Check het **Log** tabblad voor foutmeldingen

### Ik wil de app ook op mijn telefoon gebruiken
- Open gewoon je Home Assistant app → de Budget-knop staat in de zijbalk
- Of ga naar `http://homeassistant.local:8123` op je telefoon

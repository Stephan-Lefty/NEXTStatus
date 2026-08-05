# Firefox Add-ons (AMO) – Listing-Texte

Zum Kopieren beim Einreichen im [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
Anders als beim Chrome Web Store ist die Registrierung bei Mozilla
kostenlos (Mozilla-Konto genügt).

## Deutsch

**Zusammenfassung** (kurz, erscheint in der Ergebnisliste):

```
Ampel-Status für mehrere Nextcloud-Konten: zeigt auf einen Blick, ob neue Benachrichtigungen, Mail oder Talk-Erwähnungen warten.
```

**Ausführliche Beschreibung**: identisch zur Chrome-Web-Store-Version, siehe
[chrome-web-store-listing.md](chrome-web-store-listing.md) (Abschnitt
"Deutsch" → "Ausführliche Beschreibung") – einfach von dort übernehmen.

## Englisch

**Summary**:

```
Traffic-light status for multiple Nextcloud accounts: see at a glance if new notifications, mail, or Talk mentions are waiting.
```

**Detailed description**: identical to the Chrome Web Store version, see
[chrome-web-store-listing.md](chrome-web-store-listing.md) (English section
→ "Detailed description") – reuse from there.

## Weitere Angaben im Formular

- **Kategorie**: Productivity (Produktivität)
- **Lizenz**: MIT, siehe [`LICENSE`](../LICENSE) im Repository
- **Datenschutzerklärung**: Text aus [`PRIVACY.md`](../PRIVACY.md) bzw.
  [`PRIVACY.en.md`](../PRIVACY.en.md) einfügen, oder als Link:
  `https://github.com/Stephan-Lefty/NEXTStatus/blob/main/PRIVACY.md`
- **Icon**: `browser-extension/icons/icon128.png` (bereits vorhanden)
- **Screenshot**: derselbe wie beim Chrome Web Store lässt sich
  wiederverwenden: [`chrome-web-store/screenshot-de.png`](chrome-web-store/screenshot-de.png)
  (bzw. `screenshot-en.png`)
- **Sichtbarkeit**: "Listed" (öffentlich im Store auffindbar) - wie
  gewünscht
- **Berechtigungen**: AMO fragt beim Hochladen ggf. ebenfalls nach kurzen
  Begründungen je Berechtigung - dieselben Texte wie in
  [chrome-web-store-listing.md](chrome-web-store-listing.md) unter
  "Berechtigungsbegründungen" verwenden.

**Hinweis zu `offscreen`:** Diese Berechtigung ist Chrome-/Chromium-
spezifisch (Firefox braucht sie nicht, da der Hintergrund dort kein
Service Worker ohne DOM ist, siehe README "Technischer Hintergrund").
`manifest.json` enthält sie trotzdem für beide Browser gemeinsam - AMO
ignoriert unbekannte/nicht benötigte Chrome-Berechtigungen normalerweise,
sollte aber im Review-Kommentarfeld kurz erwähnt werden, falls
nachgefragt wird.

## Quellcode-Einreichung

Firefox verlangt bei manchen Reviews zusätzlich den **unveränderten
Quellcode** zum Abgleich mit dem hochgeladenen Paket (v.a. wenn ein
Build-Schritt/Minifizierung erkannt wird). Da diese Erweiterung ohne
Build-Prozess auskommt (reines, unverändertes JS/HTML/CSS), sollte das
hier normalerweise nicht nötig sein - falls AMO trotzdem danach fragt,
reicht ein ZIP desselben `browser-extension`-Ordners (identisch mit dem
eingereichten Paket).

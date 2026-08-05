# Chrome Web Store – Listing-Texte

Zum Kopieren in das [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
beim Anlegen des Eintrags. Zeichen-Limits sind vom Dashboard vorgegeben,
hier bereits geprüft.

## Deutsch

**Kurzbeschreibung** (max. 132 Zeichen, aktuell 128):

```
Ampel-Status für mehrere Nextcloud-Konten: zeigt auf einen Blick, ob neue Benachrichtigungen, Mail oder Talk-Erwähnungen warten.
```

**Ausführliche Beschreibung**:

```
NEXTStatus zeigt dir für mehrere Nextcloud-Konten auf einen Blick, ob
etwas Neues auf dich wartet – als Ampel neben dem Erweiterungs-Symbol,
ganz ohne eigenen Zwischenserver.

FUNKTIONEN
• Beliebig viele Nextcloud-Konten gleichzeitig im Blick, auch mehrere
  Nutzer derselben Nextcloud.
• Ampel pro Konto: Grün = nichts Neues, Rot = neue Benachrichtigungen.
  Das Symbol in der Symbolleiste wechselt zusätzlich selbst auf Rot.
• Klick auf die Ampel öffnet das Dashboard in einem neuen Tab und
  schaltet sofort auf Orange ("angeschaut, Bestätigung folgt") - der
  nächste Check bestätigt Grün oder zeigt erneut Rot.
• Drei Kategorien einzeln pro Konto ein-/ausschaltbar: Benachrichtigungen
  (Glocke), Mail und Talk. Bei Talk zählen dabei gezielt nur echte
  Erwähnungen, nicht jede Nachricht in jeder Gruppe.
• Konto abmelden, ohne den Eintrag zu verlieren - jederzeit mit nur dem
  Passwort wieder aktivierbar.
• Eigener, garantiert hörbarer Hinweiston beim Wechsel auf Rot
  (unabhängig von Browser-eigenen Benachrichtigungs-Einstellungen), mit
  Test-Knopf.
• Deutsch und Englisch.

EINFACHE ANMELDUNG, KEIN ZWISCHENSERVER
Benutzername und Passwort werden nur für den einmaligen Anmeldeschritt
verwendet und nie gespeichert - die Erweiterung merkt sich stattdessen
ein automatisch erzeugtes, in Nextcloud jederzeit widerrufbares
App-Passwort. Alle Anfragen gehen ausschließlich an die von dir selbst
eingetragene Nextcloud-Adresse, es gibt keinen Server der Entwickler
dazwischen und keinerlei Tracking. Details siehe Datenschutzerklärung.

QUELLOFFEN
Der komplette Code ist auf GitHub einsehbar:
github.com/Stephan-Lefty/NEXTStatus
```

## Englisch

**Short description** (max. 132 characters, currently 127):

```
Traffic-light status for multiple Nextcloud accounts: see at a glance if new notifications, mail, or Talk mentions are waiting.
```

**Detailed description**:

```
NEXTStatus shows you at a glance, for multiple Nextcloud accounts,
whether anything new is waiting for you - as a traffic light next to the
extension icon, with no middleman server of its own.

FEATURES
• Keep track of any number of Nextcloud accounts at once, including
  multiple users of the same Nextcloud.
• Traffic light per account: green = nothing new, red = new
  notifications. The toolbar icon itself also switches to red.
• Clicking the light opens the dashboard in a new tab and immediately
  switches to orange ("just checked, confirmation pending") - the next
  check confirms green or shows red again.
• Three categories toggleable per account: notifications (bell), mail,
  and Talk. For Talk, only real mentions count - not every message in
  every group.
• Sign out of an account without losing the entry - reactivate anytime
  with just the password.
• A dedicated, reliably audible alert sound when switching to red
  (independent of the browser's own notification settings), with a test
  button.
• German and English.

SIMPLE SIGN-IN, NO MIDDLEMAN SERVER
Username and password are only used for the one-time sign-in step and
never stored - the extension keeps an automatically generated app
password instead, which can be revoked in Nextcloud at any time. All
requests go exclusively to the Nextcloud address you configure yourself;
there's no server run by the developers in between, and no tracking of
any kind. See the privacy policy for details.

OPEN SOURCE
The full code is available on GitHub:
github.com/Stephan-Lefty/NEXTStatus
```

## Weitere Store-Metadaten

- **Kategorie**: Produktivität (Productivity)
- **Datenschutzerklärung-URL**: `https://github.com/Stephan-Lefty/NEXTStatus/blob/main/PRIVACY.md`
  (bzw. `PRIVACY.en.md` für die englische Version)
- **Single-Purpose-Beschreibung** (falls im Dashboard verlangt): "Zeigt den
  Benachrichtigungsstatus einer oder mehrerer vom Nutzer selbst
  konfigurierter Nextcloud-Instanzen an."
- **Berechtigungsbegründungen** (Permission justifications im Dashboard):
  - `storage`: Kontodaten und Einstellungen lokal speichern.
  - `alarms`: periodische Hintergrund-Prüfung (Standard alle 5 Minuten).
  - `notifications`: System-Benachrichtigung beim Wechsel auf Rot bzw.
    beim Test-Knopf.
  - `offscreen`: Wiedergabe des Hinweistons, da der Hintergrundprozess
    (Service Worker) selbst kein Audio abspielen kann.
  - `optional_host_permissions` (https://*/*, http://localhost/*): wird
    erst zur Laufzeit für die vom Nutzer beim Hinzufügen eines Kontos
    eingetragene Nextcloud-Domain angefragt, nicht pauschal beim
    Installieren - siehe Datenschutzerklärung.
- **Icon**: `browser-extension/icons/icon128.png` (bereits vorhanden)
- **Screenshots** (max. 5, 1280x800 oder 640x400, JPEG/24-Bit-PNG ohne
  Alphakanal – alle Dateien unten bereits geprüft, RGB ohne Alpha):
  in `docs/chrome-web-store/`
  1. `store-1-popup.png` – Popup mit mehreren Konten
  2. `store-2-accounts.png` – Konten & Einstellungen (Übersicht)
  3. `store-3-legend.png` – Farberklärung
  4. `store-4-add-account.png` – Konto hinzufügen
  5. `store-5-preferences.png` – Prüfintervall & Hinweiston

  `screenshot-de.png`/`screenshot-en.png` sind zusätzliche Werbegrafiken
  (falls das Dashboard ein separates Promo-Bild anbietet) – keine der
  fünf Pflicht-Screenshots.

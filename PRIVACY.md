[Deutsch](PRIVACY.md) | [English](PRIVACY.en.md)

# Datenschutzerklärung – NEXTStatus

Diese Erklärung gilt für die Browser-Erweiterung "NEXTStatus".

## Welche Daten verarbeitet werden

- **Zugangsdaten je Konto**: Nextcloud-Server-Adresse, Benutzername sowie
  ein App-spezifisches Passwort. Das eingegebene *echte* Nextcloud-Passwort
  wird nur für den einmaligen Anmeldeschritt verwendet und **nicht
  gespeichert** – die Erweiterung erzeugt dabei über den
  Nextcloud-Endpunkt `getapppassword` ein separates, jederzeit
  widerrufbares App-Passwort und speichert nur dieses.
- **Benachrichtigungs-Metadaten**: Zeitstempel und Anzahl ungelesener
  Einträge aus der Nextcloud Notifications-API sowie ungelesene
  Nachrichten aus der Nextcloud Talk-API – nicht die Inhalte der
  Benachrichtigungen/Nachrichten selbst.
- **Favicon-URL** des jeweiligen Nextcloud-Servers, um das Icon im
  Popup/den Einstellungen anzuzeigen.

## Wo diese Daten gespeichert und hingeschickt werden

- **Lokal im Browser**: Alle Kontodaten (Server-Adresse, Benutzername,
  App-Passwort, zuletzt bekannter Status) liegen ausschließlich in
  `browser.storage.local` auf diesem Gerät – **nicht** über die
  Browser-eigene Konto-Synchronisation (`storage.sync`), also nicht
  automatisch auf andere Geräte übertragen.
- **Nextcloud-Server**: Anfragen (Anmeldung, Benachrichtigungs-Abfrage,
  Talk-Abfrage) gehen ausschließlich an die **von dir selbst
  eingetragene** Nextcloud-Adresse. Es gibt keinen von den Entwicklern
  betriebenen Zwischenserver.
- **Keine weiteren Dritten**: Es findet keine Übertragung an die
  Entwickler von NEXTStatus, an Analyse-/Tracking-Dienste oder sonstige
  Dritte statt. Die Erweiterung enthält keinerlei Analytics, Tracking
  oder Telemetrie.
- **Hinweiston**: Die abgespielte Sound-Datei ist Teil der Erweiterung
  selbst (`sounds/alert.mp3`) – dafür werden keine Daten irgendwohin
  übertragen.

## Berechtigungen

- **Speicher**: um Kontodaten und Einstellungen lokal abzulegen.
- **Alarme**: für die periodische Hintergrund-Prüfung.
- **Benachrichtigungen**: für die System-Benachrichtigung beim Wechsel
  auf Rot bzw. beim Test-Knopf.
- **Offscreen** (nur Chrome/Vivaldi/Edge): um den Hinweiston abzuspielen,
  da der Hintergrundprozess dort (Service Worker) selbst kein Audio
  wiedergeben kann.
- **Website-Zugriff (optional, pro Domain)**: wird erst angefragt, wenn
  du ein Konto mit einer bestimmten Nextcloud-Adresse hinzufügst – und
  dann nur für genau diese Domain, nicht für "alle Websites".

## Kontrolle über deine Daten

- Du bestimmst selbst, mit welchen Nextcloud-Servern sich die Erweiterung
  verbindet.
- Über "Abmelden" in den Einstellungen wird das App-Passwort auf dem
  Server widerrufen (best effort) und lokal entfernt; der Konto-Eintrag
  selbst bleibt bestehen, bis er über "✕ entfernen" endgültig gelöscht
  wird.
- Löschst du die Erweiterung, werden alle lokal gespeicherten
  Zugangsdaten mit entfernt. Auf dem Server erzeugte App-Passwörter
  bleiben davon unberührt und sollten bei Bedarf zusätzlich in Nextcloud
  unter *Einstellungen → Sicherheit* widerrufen werden.

## Kontakt

Fragen oder Anliegen zum Datenschutz: bitte als Issue im GitHub-Repository
einreichen –
[github.com/Stephan-Lefty/nextstatus/issues](https://github.com/Stephan-Lefty/nextstatus/issues).

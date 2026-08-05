// Chrome/Edge laden den Hintergrund als echten Service Worker (MV3
// "service_worker") - dort ist importScripts() der einzige Weg, den Shim
// nachzuladen. Firefox nutzt für denselben Manifest-Eintrag stattdessen
// die MV3-Variante "background.scripts" (kein Service Worker, sondern
// eine klassische Hintergrundseite ohne importScripts) - dort wurde
// browser-polyfill-shim.js bereits vorher als eigener Eintrag im
// scripts-Array geladen, siehe manifest.json.
if (typeof importScripts === 'function') {
    importScripts('browser-polyfill-shim.js');
}

// =====================================================================
// NEXTStatus – Hintergrund-Logik
// =====================================================================
// Verwaltet mehrere Nextcloud-Konten (gespeichert in browser.storage.local
// unter dem Schlüssel "accounts") und prüft periodisch per Notifications-
// API, ob ungelesene Benachrichtigungen vorliegen. Für jedes Konto wird
// zusätzlich "acknowledgedAt" gespeichert: der Zeitpunkt, zu dem der
// Nutzer zuletzt das Dashboard angeschaut hat. Nur Benachrichtigungen, die
// NACH diesem Zeitpunkt entstanden sind, zählen als "neu" (rotes Licht).
// So bleiben ältere, dem Nutzer bereits bekannte Benachrichtigungen nicht
// dauerhaft rot hängen, ohne dass wir sie serverseitig löschen müssen.
// =====================================================================

const CHECK_ALARM_NAME = 'nextstatus-check';
const DEFAULT_INTERVAL_MINUTES = 5;

// ---- Konten laden/speichern -------------------------------------------

async function getAccounts() {
    const { accounts } = await browser.storage.local.get(['accounts']);
    return accounts || [];
}

async function saveAccounts(accounts) {
    await browser.storage.local.set({ accounts });
}

// Alle Änderungen an der Kontenliste laufen über diese Warteschlange statt
// direkt über getAccounts()+saveAccounts(). Grund: checkAllAccounts() prüft
// mehrere Konten parallel (Promise.allSettled) - ohne Warteschlange würden
// zwei gleichzeitig laufende "lies gesamte Liste, ändere einen Eintrag,
// schreibe gesamte Liste zurück"-Zyklen sich gegenseitig überschreiben, weil
// beide von derselben (alten) gelesenen Liste ausgehen. Genau das führte
// dazu, dass bei zwei Konten der Status eines davon nach einer Prüfung auf
// dem alten Stand stehenblieb.
let accountsQueue = Promise.resolve();

function mutateAccounts(mutator) {
    const run = accountsQueue.then(async () => {
        const accounts = await getAccounts();
        const updated = (await mutator(accounts)) || accounts;
        await saveAccounts(updated);
        return updated;
    });
    // Falls ein Mutator wirft, muss die Warteschlange trotzdem weiterlaufen -
    // sonst blockieren alle späteren Änderungen dauerhaft.
    accountsQueue = run.catch(() => {});
    return run;
}

async function updateAccount(id, changes) {
    const updated = await mutateAccounts(accounts => {
        const index = accounts.findIndex(a => a.id === id);
        if (index === -1) return accounts;
        accounts[index] = { ...accounts[index], ...changes };
        return accounts;
    });
    return updated.find(a => a.id === id) || null;
}

// ---- Nextcloud-Anmeldung: Benutzername + Passwort -----------------------
//
// Statt eines Login-Flows im Browser-Tab wird direkt mit dem eingegebenen
// Benutzername/Passwort einmalig der Nextcloud-Endpunkt
// "getapppassword" per Basic-Auth aufgerufen. Der liefert ein frisches,
// App-spezifisches Passwort zurück - NUR dieses wird gespeichert, das
// eingegebene echte Passwort wird danach sofort verworfen. Siehe:
// https://docs.nextcloud.com/server/latest/developer_manual/client_apis/LoginFlow/index.html
//
// EINSCHRÄNKUNG: Funktioniert nicht bei aktivierter Zwei-Faktor-
// Authentifizierung (Nextcloud verlangt dann zwingend den browserbasierten
// Login Flow) - der Server antwortet in dem Fall mit 401.
async function requestAppPassword(server, username, password) {
    const originPattern = originPatternFor(server);
    if (!originPattern) throw new Error(chrome.i18n.getMessage('errorInvalidServerUrl'));

    // Muss als direkte Reaktion auf den Klick passieren, sonst blockiert
    // der Browser den Berechtigungs-Dialog.
    const granted = await browser.permissions.request({ origins: [originPattern] });
    if (!granted) throw new Error(chrome.i18n.getMessage('errorPermissionDenied'));

    const response = await fetch(`${server}/ocs/v2.php/core/getapppassword`, {
        credentials: 'omit',
        headers: {
            'Authorization': authHeader(username, password),
            'OCS-APIRequest': 'true',
            'Accept': 'application/json',
        },
    });

    if (response.status === 401) {
        throw new Error(chrome.i18n.getMessage('errorLoginFailed401'));
    }
    if (!response.ok) throw new Error(chrome.i18n.getMessage('errorServerStatus', [String(response.status)]));

    const body = await response.json();
    const appPassword = body?.ocs?.data?.apppassword;
    if (!appPassword) throw new Error(chrome.i18n.getMessage('errorNoAppPassword'));
    return appPassword;
}

// Ermittelt den kanonischen internen Benutzernamen (kann vom eingegebenen
// Login abweichen, z.B. wenn per E-Mail-Adresse angemeldet wurde) - damit
// spätere API-Aufrufe zuverlässig denselben Wert verwenden wie Nextclouds
// eigene Clients.
async function fetchCanonicalUserId(server, username, appPassword) {
    const response = await fetch(`${server}/ocs/v1.php/cloud/user`, {
        credentials: 'omit',
        headers: {
            'Authorization': authHeader(username, appPassword),
            'OCS-APIRequest': 'true',
            'Accept': 'application/json',
        },
    });
    if (!response.ok) return username;
    const body = await response.json();
    return body?.ocs?.data?.id || username;
}

function originPatternFor(server) {
    try {
        const url = new URL(server);
        return `${url.protocol}//${url.host}/*`;
    } catch {
        return null;
    }
}

// ---- Notifications-API abfragen ----------------------------------------

function authHeader(loginName, appPassword) {
    return 'Basic ' + btoa(`${loginName}:${appPassword}`);
}

// Optionaler Hinweiston beim Wechsel auf Rot: Zusätzlich zur System-
// Benachrichtigung (die z.B. bei Vivaldi/Linux manchmal nur als eigenes,
// stummes Browser-Popup landet statt als echte System-Benachrichtigung
// mit Ton) spielt die Erweiterung eine eigene, mitgelieferte Sound-Datei
// ab - das funktioniert unabhängig davon, wie der Browser Benachrichtigungen
// sonst behandelt.
// Zwei Schalter steuern, ob das passiert: ein globaler ("soundEnabled" in
// den Einstellungen) und ein Konto-eigener ("muted") - stummgeschaltete
// Konten zeigen weiterhin ganz normal Rot/Grün und zählen auch fürs
// Symbol/Badge, nur der Ton bleibt für sie aus.
async function notifyIfEnabled(account) {
    if (account.muted) return;
    const { soundEnabled } = await browser.storage.local.get(['soundEnabled']);
    if (!soundEnabled) return;

    await browser.notifications.create(`nextstatus-${account.id}-${Date.now()}`, {
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/icon128-alert.png'),
        title: 'NEXTStatus',
        message: chrome.i18n.getMessage('notificationNewMessage', [account.displayName, account.server]),
    });
    playAlertSound();
}

// Für den "Testen"-Knopf in den Einstellungen: löst unabhängig von
// soundEnabled/muted eine echte Benachrichtigung samt Ton aus, damit man
// vorher hören/sehen kann, wie sie aussieht/klingt.
async function testNotification() {
    await browser.notifications.create(`nextstatus-test-${Date.now()}`, {
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/icon128-alert.png'),
        title: 'NEXTStatus',
        message: chrome.i18n.getMessage('notificationTestMessage'),
    });
    await playAlertSound();
}

// ---- Eigenen Sound abspielen (browserabhängig) ---------------------------
//
// Firefox: Der Hintergrund läuft (siehe Kommentar ganz oben) als klassische
// Seite mit echtem DOM, "document"/"Audio" sind also direkt vorhanden.
// Chrome/Vivaldi: Der Hintergrund ist ein Service Worker ohne DOM - Audio
// kann dort nur über ein separates "Offscreen-Dokument" abgespielt werden
// (offscreen.html/offscreen.js). Pro Erweiterung ist immer nur ein
// Offscreen-Dokument gleichzeitig erlaubt, deshalb laufen alle Aufrufe
// über eine Warteschlange - sonst würde ein zweiter Ton (z.B. wenn kurz
// hintereinander zwei Konten rot werden) mit "document already exists"
// fehlschlagen, während der erste noch läuft.
let soundQueue = Promise.resolve();

async function playAlertSound() {
    const soundUrl = browser.runtime.getURL('sounds/alert.mp3');

    if (typeof document !== 'undefined') {
        try { await new Audio(soundUrl).play(); } catch { /* z.B. Autoplay blockiert */ }
        return;
    }

    soundQueue = soundQueue.then(() => playViaOffscreenDocument(soundUrl)).catch(() => {});
    await soundQueue;
}

async function playViaOffscreenDocument(soundUrl) {
    if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
    }
    await chrome.offscreen.createDocument({
        url: `offscreen.html?sound=${encodeURIComponent(soundUrl)}`,
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Kurzen Hinweiston bei neuen Nextcloud-Benachrichtigungen abspielen',
    });

    // Erst weitermachen (und damit ggf. der Warteschlange den nächsten Ton
    // erlauben), wenn offscreen.js das Ende der Wiedergabe gemeldet hat -
    // sonst würde ein schnell nachfolgender zweiter Ton dieses Dokument
    // mitten in der Wiedergabe schließen und den ersten Ton abschneiden.
    // Zeitlimit als Sicherheitsnetz, falls die Meldung aus irgendeinem
    // Grund nie ankommt (sonst bliebe die Warteschlange für immer stehen).
    await Promise.race([
        new Promise((resolve) => {
            function listener(message) {
                if (message.action === 'offscreenSoundDone') {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve();
                }
            }
            chrome.runtime.onMessage.addListener(listener);
        }),
        new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);

    await chrome.offscreen.closeDocument().catch(() => {});
}

// Nextcloud Talk trägt neue Nachrichten nicht immer in die Glocke ein -
// je nach Konversations-Einstellung (z.B. Gruppen-Chats ohne Erwähnung)
// bleibt das dort stumm. Die Talk-eigene API kennt den tatsächlichen
// Lesestatus jeder Unterhaltung direkt, unabhängig von diesen
// Einstellungen. Gezählt werden bewusst nur Unterhaltungen mit
// "unreadMention" (Talk-eigenes Feld für "du wurdest erwähnt" - bei
// Einzelgesprächen gilt dabei jede neue Nachricht automatisch als
// Erwähnung), NICHT die allgemeine "unreadMessages"-Zahl - sonst würde
// jede noch so unwichtige neue Nachricht in einer großen Gruppe die
// Ampel auf Rot springen lassen, nicht nur wenn man selbst gemeint ist.
// Fehlt die Talk-App auf dem Server oder schlägt die Anfrage fehl, wird
// das nicht als Fehler des ganzen Kontos gewertet - dann zählt einfach
// nur die Glocke wie bisher.
async function fetchTalkUnreadCount(account) {
    try {
        const response = await fetch(`${account.server}/ocs/v2.php/apps/spreed/api/v4/room`, {
            credentials: 'omit',
            headers: {
                'Authorization': authHeader(account.loginName, account.appPassword),
                'OCS-APIRequest': 'true',
                'Accept': 'application/json',
            },
        });
        if (!response.ok) return 0;
        const body = await response.json();
        const rooms = body?.ocs?.data || [];
        return rooms.filter(room => room.unreadMention).length;
    } catch {
        return 0;
    }
}

async function checkAccount(account) {
    // Abgemeldete Konten haben kein App-Passwort mehr - nicht erst einen
    // Anfrage-Fehlschlag produzieren, sondern direkt nichts tun.
    if (account.loggedOut) return null;
    try {
        // Talk-Anfrage nur stellen, wenn diese Kategorie für das Konto
        // überhaupt zählen soll - spart eine Anfrage, wenn nicht.
        const talkEnabled = account.notifyTalk !== false;
        const [response, talkUnread] = await Promise.all([
            fetch(`${account.server}/ocs/v2.php/apps/notifications/api/v2/notifications`, {
                credentials: 'omit',
                headers: {
                    'Authorization': authHeader(account.loginName, account.appPassword),
                    'OCS-APIRequest': 'true',
                    'Accept': 'application/json',
                },
            }),
            talkEnabled ? fetchTalkUnreadCount(account) : Promise.resolve(0),
        ]);

        if (!response.ok) {
            return updateAccount(account.id, {
                status: 'error',
                lastError: chrome.i18n.getMessage('errorServerStatus', [String(response.status)]),
                lastCheckedAt: Date.now(),
            });
        }

        const body = await response.json();
        const notifications = body?.ocs?.data || [];

        // Die beiden Netzwerk-Anfragen oben brauchen etwas Zeit - in der
        // Zwischenzeit kann sich z.B. "acknowledgedAt" bereits geändert
        // haben, weil der Nutzer währenddessen auf die Ampel geklickt hat
        // (siehe openDashboard()). Deshalb hier den aktuellsten Stand aus
        // dem Speicher nachlesen statt der Momentaufnahme vom Anfang zu
        // vertrauen - sonst würde ein länger laufender Hintergrund-Check
        // ein frisch gesetztes "angeschaut" wieder mit einem veralteten
        // "Rot" überschreiben.
        const current = (await getAccounts()).find(a => a.id === account.id) || account;
        const acknowledgedAt = current.acknowledgedAt || 0;
        const isNew = n => new Date(n.datetime).getTime() > acknowledgedAt;

        // Die Glocken-Einträge tragen ein "app"-Feld (z.B. "mail",
        // "spreed", "files_sharing", ...) - darüber lassen sie sich den
        // drei Kategorien zuordnen. "spreed" (Talk) wird hier immer
        // ausgeklammert, weil Talk stattdessen über die genauere
        // Talk-eigene Zählung oben läuft - sonst würde eine Talk-
        // Erwähnung doppelt zählen (einmal hier, einmal in talkUnread).
        const mailCount = notifications.filter(n => n.app === 'mail' && isNew(n)).length;
        const otherCount = notifications.filter(n => n.app !== 'mail' && n.app !== 'spreed' && isNew(n)).length;

        const newCount =
            (talkEnabled ? talkUnread : 0) +
            (current.notifyMail !== false ? mailCount : 0) +
            (current.notifyOther !== false ? otherCount : 0);
        const newStatus = newCount > 0 ? 'red' : 'green';

        // Nur bei einem ECHTEN Wechsel auf Rot benachrichtigen (aus Grün
        // oder einem Fehlerzustand) - nicht bei jeder periodischen Prüfung,
        // solange es bereits rot war, und ausdrücklich auch nicht aus
        // Orange heraus: Ein Klick auf die Ampel setzt sie kurz auf Orange
        // ("angeschaut, Bestätigung steht aus"); bestätigt die nächste
        // Prüfung dann, dass die Sache (z.B. eine Talk-Nachricht)
        // tatsächlich noch nicht erledigt ist, wäre Orange->Rot sonst
        // fälschlich ein "gerade neu rot geworden" - dabei ist es derselbe,
        // weiterhin ungelöste Fall, kein neuer Grund für einen Hinweiston.
        if (newStatus === 'red' && current.status !== 'red' && current.status !== 'orange') {
            notifyIfEnabled(current);
        }

        return updateAccount(account.id, {
            status: newStatus,
            unreadCount: newCount,
            lastError: null,
            lastCheckedAt: Date.now(),
        });
    } catch (err) {
        return updateAccount(account.id, {
            status: 'error',
            lastError: err.message,
            lastCheckedAt: Date.now(),
        });
    }
}

async function checkAllAccounts() {
    const accounts = await getAccounts();
    await Promise.allSettled(accounts.map(checkAccount));
    await updateBadge();
}

// ---- Symbolleisten-Icon & Badge -------------------------------------------
//
// Damit man nicht erst das Dropdown öffnen muss, um zu sehen, ob irgendwo
// etwas Neues anliegt, wechselt das Symbol selbst auf Rot, sobald
// mindestens ein Konto ungelesene Benachrichtigungen hat - nicht nur die
// kleine Badge-Zahl obendrauf.
const ICONS = {
    normal: { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' },
    alert: { 16: 'icons/icon16-alert.png', 48: 'icons/icon48-alert.png', 128: 'icons/icon128-alert.png' },
};

async function updateBadge() {
    const accounts = await getAccounts();
    const redCount = accounts.filter(a => a.status === 'red').length;
    await browser.action.setBadgeText({ text: redCount > 0 ? String(redCount) : '' });
    await browser.action.setBadgeBackgroundColor({ color: '#d9363e' });
    await browser.action.setIcon({ path: redCount > 0 ? ICONS.alert : ICONS.normal });
}

// ---- Dashboard öffnen & Tab-Verfolgung ----------------------------------
//
// Wird der von uns geöffnete Dashboard-Tab wieder geschlossen, werten wir
// das als "Nutzer hat sich das Dashboard angeschaut" und setzen
// "acknowledgedAt" auf jetzt. Die Zuordnung Tab->Konto liegt in
// storage.local statt nur im Arbeitsspeicher, damit sie einen Neustart
// des Service Workers (MV3 beendet ihn nach Leerlauf) übersteht.

async function openDashboard(accountId) {
    const accounts = await getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    // Sofort auf Orange ("angeschaut, Bestätigung steht noch aus") setzen
    // und den Zeitpunkt als "angeschaut" merken - ab jetzt zählen nur noch
    // wirklich neu hinzugekommene Benachrichtigungen/Talk-Nachrichten. Der
    // nächste reguläre Prüf-Durchlauf (oder das Schließen dieses Tabs,
    // siehe unten) bestätigt das dann endgültig als Grün - oder zeigt
    // wieder Rot, falls der eigentliche Auslöser (z.B. eine noch
    // ungelesene Talk-Unterhaltung) tatsächlich noch nicht erledigt ist.
    await updateAccount(accountId, { status: 'orange', acknowledgedAt: Date.now() });
    await updateBadge();

    const tab = await browser.tabs.create({ url: `${account.server}/index.php/apps/dashboard/` });
    const { openTabs } = await browser.storage.local.get(['openTabs']);
    await browser.storage.local.set({ openTabs: { ...(openTabs || {}), [tab.id]: accountId } });
}

browser.tabs.onRemoved.addListener(async (tabId) => {
    const { openTabs } = await browser.storage.local.get(['openTabs']);
    const accountId = openTabs?.[tabId];
    if (!accountId) return;

    const remaining = { ...openTabs };
    delete remaining[tabId];
    await browser.storage.local.set({ openTabs: remaining });

    const account = (await getAccounts()).find(a => a.id === accountId);
    if (!account) return;
    // acknowledgedAt wurde schon beim Öffnen gesetzt (siehe openDashboard) -
    // hier nur nochmal prüfen, ob sich seitdem etwas Neues angesammelt hat,
    // damit man nicht unbedingt bis zum nächsten Intervall warten muss.
    await checkAccount(account);
    await updateBadge();
});

// Merkt sich das ID des per popup.js geöffneten "Konten & Einstellungen"-
// Fensters (dort in storage.local abgelegt), damit ein erneuter Klick auf
// den Button dieses Fenster nur nach vorne holt statt ein weiteres zu
// öffnen. Wird es geschlossen, muss die gemerkte ID wieder verschwinden -
// sonst würde windows.update() später gegen eine nicht mehr existierende
// ID laufen (das wird zwar in popup.js abgefangen, aber ohne Aufräumen
// bliebe die veraltete ID unnötig liegen).
browser.windows.onRemoved.addListener(async (windowId) => {
    const { optionsWindowId } = await browser.storage.local.get(['optionsWindowId']);
    if (optionsWindowId === windowId) {
        await browser.storage.local.remove('optionsWindowId');
    }
});

// ---- Konto hinzufügen/entfernen/abmelden ---------------------------------

async function addAccount(server, username, password) {
    const normalizedServer = server.replace(/\/$/, '');
    const appPassword = await requestAppPassword(normalizedServer, username, password);
    const loginName = await fetchCanonicalUserId(normalizedServer, username, appPassword);

    const account = {
        id: crypto.randomUUID(),
        server: normalizedServer,
        loginName,
        appPassword,
        displayName: loginName,
        faviconUrl: `${normalizedServer}/favicon.ico`,
        status: 'error',
        unreadCount: 0,
        lastError: null,
        lastCheckedAt: null,
        acknowledgedAt: 0,
        muted: false,
        loggedOut: false,
        notifyTalk: true,
        notifyMail: true,
        notifyOther: true,
    };

    await mutateAccounts(accounts => { accounts.push(account); return accounts; });

    await checkAccount(account);
    await updateBadge();
    return account;
}

// Widerruft das App-Passwort auf dem Server selbst (Basic-Auth mit dem
// Token, das dabei widerrufen wird - Standardmuster für "dieses Gerät
// abmelden"). Bewusst "best effort": Schlägt der Widerruf fehl (Server
// nicht erreichbar o.ä.), wird trotzdem lokal abgemeldet - sonst könnte
// man ein Konto ohne Internetverbindung zum Server gar nicht mehr los werden.
async function revokeAppPassword(account) {
    if (!account.appPassword) return true; // nichts zu widerrufen
    try {
        const response = await fetch(`${account.server}/ocs/v2.php/core/apppassword`, {
            method: 'DELETE',
            credentials: 'omit',
            headers: {
                'Authorization': authHeader(account.loginName, account.appPassword),
                'OCS-APIRequest': 'true',
                'Accept': 'application/json',
            },
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Abmelden lässt den Eintrag in der Liste stehen (Server, Benutzername,
// Favicon bleiben sichtbar) - nur das App-Passwort wird entfernt/widerrufen.
// Über "Wieder anmelden" (reloginAccount) lässt sich dasselbe Konto später
// erneut aktivieren, ohne Server-Adresse/Benutzername neu eintippen zu
// müssen.
async function logoutAccount(accountId) {
    const account = (await getAccounts()).find(a => a.id === accountId);
    if (!account) return { revoked: false };

    const revoked = await revokeAppPassword(account);
    await updateAccount(accountId, {
        loggedOut: true,
        appPassword: '',
        status: 'loggedOut',
        unreadCount: 0,
        lastError: null,
    });
    await updateBadge();
    return { revoked };
}

async function reloginAccount(accountId, password) {
    const account = (await getAccounts()).find(a => a.id === accountId);
    if (!account) throw new Error(chrome.i18n.getMessage('errorAccountNotFound'));

    const appPassword = await requestAppPassword(account.server, account.loginName, password);
    const updated = await updateAccount(accountId, {
        appPassword,
        loggedOut: false,
        lastError: null,
    });
    await checkAccount(updated);
    await updateBadge();
}

async function removeAccount(accountId) {
    const account = (await getAccounts()).find(a => a.id === accountId);
    if (account) await revokeAppPassword(account);
    await mutateAccounts(accounts => accounts.filter(a => a.id !== accountId));
    await updateBadge();
}

// ---- Nachrichten von Popup/Optionen --------------------------------------

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkAllNow') {
        checkAllAccounts().then(() => sendResponse({ success: true }));
        return true;
    }
    if (message.action === 'openDashboard') {
        openDashboard(message.accountId).then(() => sendResponse({ success: true }));
        return true;
    }
    if (message.action === 'addAccount') {
        addAccount(message.server, message.username, message.password)
            .then(account => sendResponse({ success: true, account }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (message.action === 'removeAccount') {
        removeAccount(message.accountId).then(() => sendResponse({ success: true }));
        return true;
    }
    if (message.action === 'logoutAccount') {
        logoutAccount(message.accountId).then(({ revoked }) => sendResponse({ success: true, revoked }));
        return true;
    }
    if (message.action === 'reloginAccount') {
        reloginAccount(message.accountId, message.password)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (message.action === 'setMuted') {
        updateAccount(message.accountId, { muted: message.muted })
            .then(() => sendResponse({ success: true }));
        return true;
    }
    if (message.action === 'setAccountFlag') {
        // Generischer Schalter für die Kategorien notifyTalk/notifyMail/
        // notifyOther - ändert direkt, was als "neu" zählt, deshalb sofort
        // neu prüfen statt bis zum nächsten Intervall zu warten.
        updateAccount(message.accountId, { [message.key]: message.value })
            .then(updated => checkAccount(updated))
            .then(() => updateBadge())
            .then(() => sendResponse({ success: true }));
        return true;
    }
    if (message.action === 'setInterval') {
        browser.storage.local.set({ intervalMinutes: message.minutes })
            .then(setupAlarm)
            .then(() => sendResponse({ success: true }));
        return true;
    }
    if (message.action === 'testSound') {
        testNotification()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    // 'offscreenSoundDone' wird direkt in playViaOffscreenDocument() oben
    // per eigenem, gezieltem Listener behandelt (dort wartet die
    // Warteschlange darauf) - hier keine weitere Behandlung nötig.
});

// ---- Periodische Prüfung --------------------------------------------------

async function setupAlarm() {
    const { intervalMinutes } = await browser.storage.local.get(['intervalMinutes']);
    browser.alarms.create(CHECK_ALARM_NAME, { periodInMinutes: intervalMinutes || DEFAULT_INTERVAL_MINUTES });
}

browser.runtime.onInstalled.addListener(setupAlarm);
browser.runtime.onStartup.addListener(setupAlarm);
setupAlarm();

browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== CHECK_ALARM_NAME) return;
    checkAllAccounts().catch(err => console.error('Prüfung fehlgeschlagen:', err));
});

// Direkt nach dem Laden des Service Workers einmal prüfen (z.B. nach
// Browserstart oder Reaktivierung nach Leerlauf), damit die Anzeige nicht
// erst nach dem ersten Alarm-Intervall aktuell ist.
checkAllAccounts().catch(() => {});

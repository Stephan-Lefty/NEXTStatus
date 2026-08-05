// Firefox stellt das promise-basierte "browser.*"-API global bereit.
// Chrome/Edge kennen nur "chrome.*", teilweise noch callback-basiert.
// Dieser kleine Shim sorgt dafür, dass der Rest des Codes einheitlich
// "browser.*" mit Promises verwenden kann – egal in welchem Browser.
// (Für ein "echtes" Projekt würde man stattdessen die fertige Bibliothek
// "webextension-polyfill" von Mozilla einbinden.)

if (typeof browser === 'undefined') {
    self.browser = {
        storage: {
            local: {
                get: (keys) => new Promise(resolve => chrome.storage.local.get(keys, resolve)),
                set: (items) => new Promise(resolve => chrome.storage.local.set(items, resolve)),
                remove: (keys) => new Promise(resolve => chrome.storage.local.remove(keys, resolve)),
            },
            onChanged: chrome.storage.onChanged,
        },
        runtime: {
            sendMessage: (...args) => chrome.runtime.sendMessage(...args),
            onMessage: chrome.runtime.onMessage,
            onInstalled: chrome.runtime.onInstalled,
            onStartup: chrome.runtime.onStartup,
            getURL: (path) => chrome.runtime.getURL(path),
            openOptionsPage: () => new Promise(resolve => chrome.runtime.openOptionsPage(resolve)),
        },
        alarms: {
            create: (name, info) => chrome.alarms.create(name, info),
            onAlarm: chrome.alarms.onAlarm,
        },
        windows: {
            create: (details) => new Promise(resolve => chrome.windows.create(details, resolve)),
            update: (id, info) => new Promise((resolve, reject) => chrome.windows.update(id, info, (win) => {
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve(win);
            })),
            getCurrent: () => new Promise(resolve => chrome.windows.getCurrent(resolve)),
            onRemoved: chrome.windows.onRemoved,
        },
        tabs: {
            create: (details) => new Promise(resolve => chrome.tabs.create(details, resolve)),
            onRemoved: chrome.tabs.onRemoved,
        },
        action: {
            setBadgeText: (details) => new Promise(resolve => chrome.action.setBadgeText(details, resolve)),
            setBadgeBackgroundColor: (details) => new Promise(resolve => chrome.action.setBadgeBackgroundColor(details, resolve)),
            setIcon: (details) => new Promise(resolve => chrome.action.setIcon(details, resolve)),
        },
        permissions: {
            request: (perms) => new Promise(resolve => chrome.permissions.request(perms, resolve)),
            contains: (perms) => new Promise(resolve => chrome.permissions.contains(perms, resolve)),
        },
        notifications: {
            // Prüft chrome.runtime.lastError statt es zu ignorieren - sonst
            // "gelingt" der Aufruf aus Sicht des restlichen Codes immer,
            // auch wenn im Hintergrund z.B. die Berechtigung fehlt oder das
            // Betriebssystem die Anzeige verweigert.
            create: (id, options) => new Promise((resolve, reject) => {
                chrome.notifications.create(id, options, (notificationId) => {
                    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                    else resolve(notificationId);
                });
            }),
        },
    };
}

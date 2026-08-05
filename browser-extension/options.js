function shortServer(server) {
    return server.replace(/^https?:\/\//, '');
}

function statusLabel(account) {
    if (account.loggedOut) return chrome.i18n.getMessage('statusLoggedOut');
    if (account.status === 'error') return account.lastError || chrome.i18n.getMessage('statusCheckErrorFallback');
    if (account.status === 'orange') return chrome.i18n.getMessage('statusOrange');
    if (!account.lastCheckedAt) return chrome.i18n.getMessage('statusChecking');
    if (account.status === 'red') return chrome.i18n.getMessage('statusNewCount', [String(account.unreadCount)]);
    return chrome.i18n.getMessage('statusNoNewNotifications');
}

// Konto, dessen "Wieder anmelden"-Passwortfeld gerade eingeblendet ist
// (immer höchstens eines gleichzeitig).
let reloginAccountId = null;

// Baut die Zeile mit den drei Kategorie-Schaltern (Talk/Mail/Sonstige) -
// steuert pro Konto einzeln, welche Quellen das Licht auf Rot schalten
// dürfen. Ausschalten heißt hier "zählt nicht mehr fürs Licht", nicht
// "wird nicht mehr abgefragt" (außer bei Talk, das spart dann sogar eine
// Anfrage - siehe background.js).
function buildCategoriesRow(account) {
    const row = document.createElement('div');
    row.className = 'categories-row';

    const fields = [
        ['notifyTalk', 'categoryTalk'],
        ['notifyMail', 'categoryMail'],
        ['notifyOther', 'categoryOther'],
    ];

    for (const [key, messageKey] of fields) {
        const wrapper = document.createElement('label');
        wrapper.className = 'category-toggle';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = account[key] !== false;
        checkbox.addEventListener('change', async () => {
            await browser.runtime.sendMessage({ action: 'setAccountFlag', accountId: account.id, key, value: checkbox.checked });
        });

        wrapper.append(checkbox, document.createTextNode(' ' + chrome.i18n.getMessage(messageKey)));
        row.appendChild(wrapper);
    }

    return row;
}

async function renderAccounts() {
    const { accounts } = await browser.storage.local.get(['accounts']);
    const list = accounts || [];
    const container = document.getElementById('accountList');
    const emptyHint = document.getElementById('emptyHint');

    container.querySelectorAll('.account-row').forEach(el => el.remove());
    emptyHint.hidden = list.length > 0;

    // DOM-Knoten statt innerHTML: displayName/server stammen vom
    // Nextcloud-Server und dürfen nicht ungeprüft als HTML interpretiert
    // werden (XSS-Risiko bei einem manipulierten/kompromittierten Server).
    for (const account of list) {
        const row = document.createElement('div');
        row.className = 'account-row';

        const img = document.createElement('img');
        img.src = account.faviconUrl;
        img.alt = '';
        img.addEventListener('error', () => { img.style.visibility = 'hidden'; });

        const dot = document.createElement('span');
        dot.className = `dot ${account.loggedOut ? 'loggedOut' : account.status}`;

        const info = document.createElement('div');
        info.className = 'info';
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = `${account.displayName} — ${shortServer(account.server)}`;
        const statusText = document.createElement('div');
        statusText.className = 'server';
        statusText.textContent = statusLabel(account);
        info.append(name, statusText);

        const controls = document.createElement('div');
        controls.className = 'controls';

        let categoriesRow = null;

        if (!account.loggedOut) {
            categoriesRow = buildCategoriesRow(account);

            const muteBtn = document.createElement('button');
            muteBtn.className = 'icon-btn';
            muteBtn.title = chrome.i18n.getMessage(account.muted ? 'muteEnableTitle' : 'muteDisableTitle');
            muteBtn.textContent = account.muted ? '🔕' : '🔔';
            muteBtn.addEventListener('click', async () => {
                await browser.runtime.sendMessage({ action: 'setMuted', accountId: account.id, muted: !account.muted });
                renderAccounts();
            });
            controls.appendChild(muteBtn);

            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'text-btn';
            logoutBtn.textContent = chrome.i18n.getMessage('logoutButton');
            logoutBtn.addEventListener('click', async () => {
                logoutBtn.disabled = true;
                const result = await browser.runtime.sendMessage({ action: 'logoutAccount', accountId: account.id });
                if (result?.success && result.revoked === false) {
                    document.getElementById('addStatus').textContent =
                        chrome.i18n.getMessage('logoutRevokeFailedStatus', [account.displayName]);
                }
                renderAccounts();
            });
            controls.appendChild(logoutBtn);
        } else if (reloginAccountId === account.id) {
            const errorText = document.createElement('div');
            errorText.className = 'relogin-error';

            const pwInput = document.createElement('input');
            pwInput.type = 'password';
            pwInput.placeholder = chrome.i18n.getMessage('reloginPasswordPlaceholder');
            pwInput.className = 'relogin-input';

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'text-btn';
            confirmBtn.textContent = chrome.i18n.getMessage('genericOk');
            confirmBtn.addEventListener('click', async () => {
                const password = pwInput.value;
                pwInput.value = '';
                if (!password) return;
                confirmBtn.disabled = true;
                const result = await browser.runtime.sendMessage({ action: 'reloginAccount', accountId: account.id, password });
                if (result?.success) {
                    reloginAccountId = null;
                    renderAccounts();
                } else {
                    confirmBtn.disabled = false;
                    errorText.textContent = result?.error || chrome.i18n.getMessage('reloginFailedFallback');
                }
            });

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'icon-btn';
            cancelBtn.title = chrome.i18n.getMessage('genericCancel');
            cancelBtn.textContent = '×';
            cancelBtn.addEventListener('click', () => { reloginAccountId = null; renderAccounts(); });

            controls.append(pwInput, confirmBtn, cancelBtn);
            row.append(img, dot, info, controls, errorText);
            container.appendChild(row);
            continue;
        } else {
            const reloginBtn = document.createElement('button');
            reloginBtn.className = 'text-btn';
            reloginBtn.textContent = chrome.i18n.getMessage('reloginButton');
            reloginBtn.addEventListener('click', () => { reloginAccountId = account.id; renderAccounts(); });
            controls.appendChild(reloginBtn);
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.title = chrome.i18n.getMessage('removeAccountTitle');
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', async () => {
            await browser.runtime.sendMessage({ action: 'removeAccount', accountId: account.id });
            renderAccounts();
        });
        controls.appendChild(removeBtn);

        row.append(img, dot, info, controls);
        if (categoriesRow) row.append(categoriesRow);
        container.appendChild(row);
    }

    fitWindowToContent();
}

// Aktualisiert die Liste live, wenn sich der Status im Hintergrund ändert
// (z.B. nach einer periodischen Prüfung), ohne dass die Seite neu geladen
// werden muss.
browser.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.accounts) renderAccounts();
});

// Passt die Fensterhöhe nach jedem Rendern an den tatsächlichen Inhalt an
// (Kontenliste ist unterschiedlich lang, Wieder-anmelden-Formular ändert
// die Höhe usw.) - so muss man nie scrollen, ohne die Höhe fest zu
// verdrahten.
// Bündelt mehrere kurz hintereinander ausgelöste Aufrufe (z.B. beim
// ersten Öffnen: Formular-Status setzen + Kontenliste rendern lösen
// beide je einen Aufruf aus) zu höchstens zwei tatsächlichen Durchläufen -
// einem laufenden und danach genau einem abschließenden, der garantiert
// den zuletzt gültigen Zustand misst. Eine einfache Warteschlange (jeder
// Aufruf läuft einzeln nacheinander) hat das Problem, dass mehrere volle,
// je bis zu 1 Sekunde dauernde Fenstergrößen-Anpassungen hintereinander
// laufen (jede Größenänderung kann die gerade erst "eingeschwungene"
// Fenster-Dekoration wieder kurz durcheinanderbringen) - das führte dazu,
// dass das Ergebnis von Versuch zu Versuch unterschiedlich ausfiel.
let fitBusy = false;
let fitPending = false;
async function fitWindowToContent() {
    fitPending = true;
    if (fitBusy) return;
    fitBusy = true;
    try {
        while (fitPending) {
            fitPending = false;
            await runFit();
        }
    } finally {
        fitBusy = false;
    }
}

async function runFit() {
    // Zwei Frames abwarten, damit das Layout nach dem DOM-Update
    // vollständig stabilisiert ist, bevor gemessen wird.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const accountListEl = document.getElementById('accountList');
    // Eine evtl. von einem früheren (volleren) Zustand übrig gebliebene
    // Begrenzung zuerst zurücksetzen - sonst würde z.B. nach dem
    // Entfernen eines Kontos die Liste künstlich klein gemessen und das
    // Fenster bliebe unnötig kompakt.
    accountListEl.style.maxHeight = '';
    accountListEl.style.overflowY = '';

    // Manche Browser (z.B. Vivaldi) zeigen bei "popup"-Fenstern trotzdem
    // Titel-/Adressleiste an, die zusätzlich zum reinen Seiteninhalt
    // Platz braucht - wie viel genau, lässt sich nicht vorhersehen,
    // sondern nur live aus der Differenz zwischen Außen- und
    // Innenmaßen des aktuellen Fensters berechnen. Direkt nach dem Öffnen
    // eines NEUEN Fensters hat der Browser diese Dekoration manchmal noch
    // nicht fertig eingerechnet - deshalb hier auf einen stabilen (zweimal
    // identischen) Messwert warten statt blind der ersten Messung zu
    // vertrauen. Bei einem bereits offenen, eingeschwungenen Fenster
    // (z.B. beim Auf-/Zuklappen eines Abschnitts) ist der Wert sofort
    // stabil, die Schleife bricht dann gleich beim ersten Durchlauf ab.
    let chromeWidth = window.outerWidth - window.innerWidth;
    let chromeHeight = window.outerHeight - window.innerHeight;
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const newChromeWidth = window.outerWidth - window.innerWidth;
        const newChromeHeight = window.outerHeight - window.innerHeight;
        if (newChromeWidth === chromeWidth && newChromeHeight === chromeHeight) break;
        chromeWidth = newChromeWidth;
        chromeHeight = newChromeHeight;
    }
    // Bei der Breite lieber etwas großzügiger puffern: ein paar Pixel
    // ungenutzter Rand rechts fallen kaum auf, ein horizontaler
    // Scrollbalken (bei zu wenig Puffer) dagegen schon.
    const BUFFER_WIDTH = 32;
    const BUFFER_HEIGHT = 18;
    const maxHeight = window.screen.availHeight - 40;

    let contentRect = document.body.getBoundingClientRect();
    let targetHeight = Math.round(contentRect.height + chromeHeight) + BUFFER_HEIGHT;

    // Passt der volle Inhalt nicht auf den Bildschirm (z.B. sehr viele
    // Konten), bekommt nur die Kontenliste einen eigenen Scrollbalken -
    // dafür bleiben "Konto hinzufügen" und die Einstellungen darunter
    // immer erreichbar, ohne das ganze Fenster über den Bildschirmrand
    // hinauswachsen zu lassen. In allen anderen (normalen) Fällen bleibt
    // die Liste unbegrenzt, und es muss nirgends gescrollt werden.
    if (targetHeight > maxHeight) {
        const excess = targetHeight - maxHeight;
        const listHeight = accountListEl.getBoundingClientRect().height;
        accountListEl.style.maxHeight = Math.max(listHeight - excess, 80) + 'px';
        accountListEl.style.overflowY = 'auto';

        contentRect = document.body.getBoundingClientRect();
        targetHeight = Math.min(Math.round(contentRect.height + chromeHeight) + BUFFER_HEIGHT, maxHeight);
    }

    const targetWidth = Math.round(contentRect.width + chromeWidth) + BUFFER_WIDTH;

    const win = await browser.windows.getCurrent();
    await browser.windows.update(win.id, { width: targetWidth, height: targetHeight });
}

// ---- Konto hinzufügen ----------------------------------------------------

let addInProgress = false;

document.getElementById('addAccount').addEventListener('click', async () => {
    if (addInProgress) return;
    const serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '');
    const username = document.getElementById('username').value.trim();
    const passwordEl = document.getElementById('password');
    const password = passwordEl.value;
    const statusEl = document.getElementById('addStatus');
    const addBtn = document.getElementById('addAccount');

    if (!serverUrl || !username || !password) {
        statusEl.textContent = chrome.i18n.getMessage('addAccountMissingFieldsError');
        return;
    }

    addInProgress = true;
    addBtn.disabled = true;
    statusEl.textContent = chrome.i18n.getMessage('addAccountCheckingStatus');

    const result = await browser.runtime.sendMessage({ action: 'addAccount', server: serverUrl, username, password });

    // Passwortfeld in jedem Fall sofort leeren - es wird nirgends gespeichert.
    passwordEl.value = '';
    addInProgress = false;
    addBtn.disabled = false;

    if (result?.success) {
        statusEl.textContent = chrome.i18n.getMessage('addAccountSuccessStatus');
        document.getElementById('serverUrl').value = '';
        document.getElementById('username').value = '';
        setAddFormExpanded(false); // erledigt - Platz für die Kontenliste wieder freigeben
        renderAccounts();
    } else {
        statusEl.textContent = result?.error || chrome.i18n.getMessage('genericUnknownError');
    }
});

// ---- "Was bedeuten die Farben?" auf-/zuklappen -----------------------------
//
// Standardmäßig eingeklappt wie die anderen Bereiche - einmal nachlesen
// reicht in der Regel, danach soll es nicht dauerhaft Platz wegnehmen.
function setLegendExpanded(expanded, skipFit) {
    document.getElementById('legendContent').hidden = !expanded;
    document.getElementById('toggleLegendIcon').textContent = expanded ? '▾' : '▸';
    if (!skipFit) fitWindowToContent();
}

document.getElementById('toggleLegend').addEventListener('click', () => {
    setLegendExpanded(document.getElementById('legendContent').hidden);
});

// ---- "Konto hinzufügen" auf-/zuklappen ------------------------------------
//
// Standardmäßig eingeklappt, damit das Fenster nicht wegen eines Formulars
// aufgebläht wird, das man nach der Ersteinrichtung kaum noch braucht - nur
// wenn noch gar kein Konto eingerichtet ist, startet es aufgeklappt (siehe
// DOMContentLoaded unten).
function setAddFormExpanded(expanded, skipFit) {
    document.getElementById('addAccountForm').hidden = !expanded;
    document.getElementById('toggleAddAccountIcon').textContent = expanded ? '▾' : '▸';
    if (!skipFit) fitWindowToContent();
}

document.getElementById('toggleAddAccount').addEventListener('click', () => {
    setAddFormExpanded(document.getElementById('addAccountForm').hidden);
});

// ---- "Einstellungen" auf-/zuklappen ----------------------------------------
//
// Ebenfalls standardmäßig eingeklappt - Prüfintervall und Hinweiston werden
// einmal eingestellt und dann selten wieder angefasst.
function setSettingsExpanded(expanded, skipFit) {
    document.getElementById('settingsForm').hidden = !expanded;
    document.getElementById('toggleSettingsIcon').textContent = expanded ? '▾' : '▸';
    if (!skipFit) fitWindowToContent();
}

document.getElementById('toggleSettings').addEventListener('click', () => {
    setSettingsExpanded(document.getElementById('settingsForm').hidden);
});

// ---- Prüfintervall & Hinweiston ---------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    const { intervalMinutes, soundEnabled, accounts } = await browser.storage.local.get(['intervalMinutes', 'soundEnabled', 'accounts']);
    document.getElementById('intervalMinutes').value = String(intervalMinutes || 5);
    document.getElementById('soundEnabled').checked = !!soundEnabled;
    // skipFit=true: erst renderAccounts() unten löst die tatsächliche
    // Größenanpassung aus - ein einziges Mal mit dem vollständig
    // fertigen Anfangszustand, statt hier schon zwei separate (und damit
    // überflüssige) Anpassungsdurchläufe zu starten.
    setLegendExpanded(false, true);
    setAddFormExpanded(!accounts || accounts.length === 0, true);
    setSettingsExpanded(false, true);
    renderAccounts();
});

document.getElementById('intervalMinutes').addEventListener('change', async (event) => {
    await browser.runtime.sendMessage({ action: 'setInterval', minutes: Number(event.target.value) });
});

document.getElementById('soundEnabled').addEventListener('change', async (event) => {
    await browser.storage.local.set({ soundEnabled: event.target.checked });
});

document.getElementById('testSound').addEventListener('click', async () => {
    const statusEl = document.getElementById('soundTestStatus');
    statusEl.textContent = '';
    const result = await browser.runtime.sendMessage({ action: 'testSound' });
    if (result?.success === false) {
        statusEl.textContent = chrome.i18n.getMessage('soundTestFailedStatus', [result.error]);
    } else {
        statusEl.textContent = chrome.i18n.getMessage('soundTestSentStatus');
    }
});

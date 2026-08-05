function shortServer(server) {
    return server.replace(/^https?:\/\//, '');
}

function subLabel(account) {
    if (account.loggedOut) return chrome.i18n.getMessage('statusLoggedOut');
    let label;
    if (account.status === 'error') label = account.lastError || chrome.i18n.getMessage('statusCheckErrorFallback');
    else if (account.status === 'orange') label = chrome.i18n.getMessage('statusOrange');
    else if (!account.lastCheckedAt) label = chrome.i18n.getMessage('statusChecking');
    else if (account.status === 'red') label = chrome.i18n.getMessage('statusNewCount', [String(account.unreadCount)]);
    else label = chrome.i18n.getMessage('statusAllRead');
    return account.muted ? `🔕 ${label}` : label;
}

async function renderAccounts() {
    const { accounts } = await browser.storage.local.get(['accounts']);
    const list = accounts || [];
    const container = document.getElementById('accountList');
    const emptyHint = document.getElementById('emptyHint');

    container.querySelectorAll('.account-row').forEach(el => el.remove());
    emptyHint.hidden = list.length > 0;

    for (const account of list) {
        const row = document.createElement('button');
        row.className = 'account-row';

        const img = document.createElement('img');
        img.src = account.faviconUrl;
        img.alt = '';
        img.addEventListener('error', () => { img.style.visibility = 'hidden'; });

        const info = document.createElement('div');
        info.className = 'info';
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = `${account.displayName} — ${shortServer(account.server)}`;
        const sub = document.createElement('div');
        sub.className = 'sub';
        sub.textContent = subLabel(account);
        info.append(name, sub);

        const dot = document.createElement('span');
        dot.className = `dot ${account.loggedOut ? 'loggedOut' : account.status}`;
        dot.title = chrome.i18n.getMessage('popupDotTitle');

        row.append(img, info, dot);
        row.addEventListener('click', async () => {
            await browser.runtime.sendMessage({ action: 'openDashboard', accountId: account.id });
            window.close();
        });

        container.appendChild(row);
    }
}

browser.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.accounts) renderAccounts();
});

document.getElementById('refreshNow').addEventListener('click', async () => {
    const btn = document.getElementById('refreshNow');
    btn.disabled = true;
    await browser.runtime.sendMessage({ action: 'checkAllNow' });
    btn.disabled = false;
});

document.getElementById('openSettings').addEventListener('click', async () => {
    // Ist bereits ein Einstellungen-Fenster offen (ID in storage.local
    // gemerkt, siehe background.js), dieses nur nach vorne holen statt
    // ein weiteres zu öffnen - windows.update() auf eine ID, die es nicht
    // mehr gibt (Fenster inzwischen geschlossen), wirft einen Fehler,
    // dann läuft es normal weiter unten und öffnet ein neues Fenster.
    const { optionsWindowId } = await browser.storage.local.get(['optionsWindowId']);
    if (optionsWindowId != null) {
        try {
            await browser.windows.update(optionsWindowId, { focused: true });
            window.close();
            return;
        } catch { /* Fenster existiert nicht mehr - neues öffnen */ }
    }

    // Statt openOptionsPage() (öffnet meist einen vollen Browser-Tab) ein
    // kleines, auf dem Bildschirm zentriertes Fenster - dafür braucht es
    // die tatsächliche Bildschirmgröße, die dem Popup selbst zur Verfügung
    // steht (window.screen), nicht die des viel kleineren Popup-Fensters.
    const width = 640;
    const height = 800;
    const left = Math.round((window.screen.availWidth - width) / 2 + (window.screen.availLeft || 0));
    const top = Math.round((window.screen.availHeight - height) / 2 + (window.screen.availTop || 0));

    const win = await browser.windows.create({
        url: browser.runtime.getURL('options.html'),
        type: 'popup',
        width, height, left, top,
    });
    await browser.storage.local.set({ optionsWindowId: win.id });
    window.close();
});

document.addEventListener('DOMContentLoaded', renderAccounts);

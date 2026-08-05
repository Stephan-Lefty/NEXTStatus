// Läuft in einem "Offscreen-Dokument" (nur Chrome/Vivaldi - Service Worker
// haben kein DOM und können deshalb kein <audio> abspielen). Die Sound-URL
// kommt als Query-Parameter mit, damit direkt beim Laden abgespielt werden
// kann, ohne auf eine erst noch zu registrierende Message-Listener-Race
// warten zu müssen. Nach dem Abspielen meldet sich die Seite bei
// background.js zurück, damit das Dokument wieder geschlossen wird - ein
// offenes Offscreen-Dokument würde sonst unnötig Speicher belegen und das
// Erzeugen eines neuen für den nächsten Ton verhindern (pro Erweiterung
// ist immer nur eines gleichzeitig erlaubt).
const params = new URLSearchParams(location.search);
const soundUrl = params.get('sound');

function done() {
    chrome.runtime.sendMessage({ action: 'offscreenSoundDone' }).catch(() => {});
}

if (soundUrl) {
    const audio = new Audio(soundUrl);
    audio.addEventListener('ended', done);
    audio.play().catch(done);
} else {
    done();
}

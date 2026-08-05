[Deutsch](PRIVACY.md) | [English](PRIVACY.en.md)

# Privacy Policy – NEXTStatus

This policy applies to the "NEXTStatus" browser extension.

## What data is processed

- **Credentials per account**: Nextcloud server address, username, and an
  app-specific password. The *real* Nextcloud password you enter is only
  used for the one-time sign-in step and **never stored** – the extension
  uses the Nextcloud endpoint `getapppassword` to generate a separate,
  individually revocable app password and stores only that.
- **Notification metadata**: timestamps and counts of unread entries from
  the Nextcloud Notifications API, as well as unread messages from the
  Nextcloud Talk API – not the content of the notifications/messages
  themselves.
- **Favicon URL** of the respective Nextcloud server, to display the icon
  in the popup/settings.

## Where this data is stored and sent

- **Locally in the browser**: all account data (server address, username,
  app password, last known status) lives exclusively in
  `browser.storage.local` on this device – **not** via the browser's own
  account sync (`storage.sync`), so it is not automatically transferred
  to other devices.
- **Nextcloud server**: requests (sign-in, notification check, Talk
  check) go exclusively to the Nextcloud address **you entered
  yourself**. There is no intermediary server operated by the developers.
- **No other third parties**: there is no transmission to the developers
  of NEXTStatus, to analytics/tracking services, or to any other third
  party. The extension contains no analytics, tracking, or telemetry
  whatsoever.
- **Alert sound**: the sound file that gets played is part of the
  extension itself (`sounds/alert.mp3`) – no data is transmitted anywhere
  for this.

## Permissions

- **Storage**: to keep account data and settings locally.
- **Alarms**: for the periodic background check.
- **Notifications**: for the system notification when switching to red,
  or when using the test button.
- **Offscreen** (Chrome/Vivaldi/Edge only): to play the alert sound,
  since the background process there (service worker) cannot play audio
  itself.
- **Website access (optional, per domain)**: only requested when you add
  an account with a specific Nextcloud address – and then only for that
  exact domain, not for "all websites".

## Control over your data

- You decide yourself which Nextcloud servers the extension connects to.
- "Sign out" in the settings revokes the app password on the server
  (best effort) and removes it locally; the account entry itself remains
  until permanently deleted via "✕ remove".
- If you delete the extension, all locally stored credentials are removed
  with it. App passwords created on the server are not affected by this
  and should additionally be revoked in Nextcloud under *Settings →
  Security* if needed.

## Contact

Questions or concerns about privacy: please file an issue in the GitHub
repository –
[github.com/Stephan-Lefty/nextstatus/issues](https://github.com/Stephan-Lefty/nextstatus/issues).

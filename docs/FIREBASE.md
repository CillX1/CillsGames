# Firebase einrichten

CillsGames nutzt Firebase für **Login** (Authentication) und **Spielstände** (Cloud Firestore).
Die Website selbst läuft auf GitHub Pages.

Die Werte in `js/firebase-config.js` sind öffentlich und dürfen im Repo stehen –
wer was darf, regeln die [Sicherheitsregeln](../firestore.rules) auf dem Server.

## Einmalige Einrichtung

1. **Login aktivieren:** Firebase Console → Authentication → Sign-in method → *E-Mail/Passwort* aktivieren.
2. **Domain erlauben:** Authentication → Einstellungen → Autorisierte Domains → `cillx1.github.io` hinzufügen.
3. **Regeln veröffentlichen:** Firestore Database → Regeln → Inhalt von `firestore.rules` einfügen → Veröffentlichen.

### Regeln automatisch deployen (optional)
Firebase → Projekteinstellungen → Dienstkonten → *Neuen privaten Schlüssel generieren*.
Den Inhalt der Datei als GitHub-Secret `FIREBASE_SERVICE_ACCOUNT` speichern (Settings → Secrets and variables → Actions)
und die Datei danach löschen – sie darf nie ins Repo.
Ab dann werden Änderungen an `firestore.rules` getestet und automatisch eingespielt.

## Rollen
- **Admin:** Besitzer-Konto einloggen → Menü → Admin → Passwort.
- **Leiter:** werden im Admin-Panel vergeben und melden sich mit ihrem normalen Konto an.

## Admin-Passwort ändern
```bash
node scripts/admin-hash.mjs "neuesPasswort"
```
Den ausgegebenen Wert in `js/admin-auth.js` bei `ADMIN_PASSWORD_HASH` eintragen.

## Probleme?
| Problem | Lösung |
|---|---|
| Login geht nur lokal, nicht auf github.io | Schritt 2 |
| „Speichern fehlgeschlagen" | Schritt 3 |
| Gelbes Band „Offline-Modus" | Firebase nicht erreichbar (Netz, Adblocker) |

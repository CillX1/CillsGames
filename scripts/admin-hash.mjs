#!/usr/bin/env node
// Erzeugt den Fingerabdruck für ein neues Admin-Passwort.
// Benutzung:  node scripts/admin-hash.mjs "meinNeuesPasswort"
// Den ausgegebenen Wert in js/admin-auth.js bei ADMIN_PASSWORD_HASH einfügen.
import { webcrypto } from 'node:crypto';
import { hashAdminPassword } from '../js/admin-auth.js';

const pw = process.argv[2];
if (!pw) {
  console.error('Bitte Passwort angeben:  node scripts/admin-hash.mjs "meinNeuesPasswort"');
  process.exit(1);
}
console.log(await hashAdminPassword(pw, webcrypto.subtle));

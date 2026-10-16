// Öffentliche Firebase-Web-Konfiguration. Diese Werte dürfen im Code stehen – sie sind keine
// Passwörter. Die Sicherheit kommt aus den Firestore-Regeln (firestore.rules).
export const firebaseConfig = {
  apiKey: 'AIzaSyBhaEpoSSYelxpUFF-2lien-nlsEFlElaI',
  authDomain: 'cillsgames.firebaseapp.com',
  projectId: 'cillsgames',
  storageBucket: 'cillsgames.firebasestorage.app',
  messagingSenderId: '561881361973',
  appId: '1:561881361973:web:89f61aa5a0a7ae8147cb7c',
};

// Diese Benutzernamen dürfen sich selbst zum Admin machen (Knopf im Admin-Bereich).
// Muss mit `ownerEmails()` in firestore.rules übereinstimmen!
export const OWNER_USERNAMES = ['CillX1', 'CillX11'];

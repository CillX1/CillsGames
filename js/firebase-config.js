// Öffentliche Firebase-Web-Konfiguration. Diese Werte dürfen im Code stehen – sie sind keine
// Passwörter. Die Sicherheit kommt aus den Firestore-Regeln (firestore.rules).
export const firebaseConfig = {
  apiKey: 'AIzaSyBHTc2iq9YVZv40GGaJztecZLv47dTRWTU',
  authDomain: 'cillsgames-a6441.firebaseapp.com',
  projectId: 'cillsgames-a6441',
  storageBucket: 'cillsgames-a6441.firebasestorage.app',
  messagingSenderId: '548419124930',
  appId: '1:548419124930:web:7f4706758a5253cfa1055b',
};

// Diese Benutzernamen dürfen sich selbst zum Admin machen (Knopf im Admin-Bereich).
// Muss mit `isOwnerAccount()` in firestore.rules übereinstimmen!
export const OWNER_USERNAMES = ['CillX1', 'CillX11'];

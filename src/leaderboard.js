// Leaderboard — localStorage now, Firebase later
//
// ═══════════════════════════════════════════════════════════
// FIREBASE_CONFIG — fill this in when ready to enable online leaderboard
//
// import { initializeApp } from 'firebase/app';
// import { getFirestore, collection, addDoc, getDocs, orderBy, query, limit } from 'firebase/firestore';
//
// const FIREBASE_CONFIG = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_PROJECT.firebaseapp.com",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_PROJECT.appspot.com",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId: "YOUR_APP_ID"
// };
//
// To enable: uncomment the firebase imports above and the Firebase methods below,
// replace the localStorage stubs with Firestore calls.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'kickflip_leaderboard';
const MAX_ENTRIES = 50;

export class Leaderboard {
  constructor() {
    this.playerName = localStorage.getItem('kickflip_name') || 'SKATER';
    this._entries = this._load();
    this.online = false; // flip to true when Firebase configured
  }

  setPlayerName(name) {
    this.playerName = name.toUpperCase().slice(0, 10);
    localStorage.setItem('kickflip_name', this.playerName);
  }

  async submitScore(score, combo, multiplier) {
    const entry = {
      name: this.playerName,
      score,
      combo,
      multiplier,
      date: Date.now(),
      id: Math.random().toString(36).slice(2),
    };

    this._entries.push(entry);
    this._entries.sort((a, b) => b.score - a.score);
    this._entries = this._entries.slice(0, MAX_ENTRIES);
    this._save();

    // TODO: when Firebase is configured, also call:
    // await addDoc(collection(db, 'scores'), entry);

    return entry;
  }

  async getTopScores(n = 10) {
    // TODO: when Firebase configured, replace with:
    // const q = query(collection(db, 'scores'), orderBy('score','desc'), limit(n));
    // const snap = await getDocs(q);
    // return snap.docs.map(d => d.data());

    return this._entries.slice(0, n);
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
  }

  getPlayerName() { return this.playerName; }
}

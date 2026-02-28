// ══════════════════════════════════════════════
//  SIPYORA ATTENDANCE APP — FIREBASE CONFIG
//  Use the SAME Firebase project as the main
//  Sipyora management system so data is shared.
// ══════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyAc7gMEuMTYI5GKWhdQhIJCQ35ZehTiB-c",
    authDomain: "sipyora.firebaseapp.com",
    projectId: "sipyora",
    storageBucket: "sipyora.firebasestorage.app",
    messagingSenderId: "265841398933",
    appId: "1:265841398933:web:36b736d8a8f765152df79c",
    measurementId: "G-TSNTZ7XN5Y"
};

// ── MUST match the admin email in the main system ──
const ADMIN_EMAIL = "admin@sipyora.com";

// Initialize
firebase.initializeApp(firebaseConfig);
const auth  = firebase.auth();
const db    = firebase.firestore();

// ── HELPERS ──
function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getMonthStr(dateStr) {
  return dateStr.substring(0, 7);
}

function toast(msg, type) {
  var wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  var icons = { ok: '✅', err: '❌', info: 'ℹ️' };
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span><span>' + msg + '</span>';
  wrap.appendChild(el);
  setTimeout(function () { el.remove(); }, 3200);
}
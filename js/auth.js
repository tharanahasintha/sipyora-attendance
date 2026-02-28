// ══════════════════════════════════════════════
//  AUTH.JS — Sipyora Attendance App
// ══════════════════════════════════════════════

var currentUser   = null;
var teacherDoc    = null;

function initAuth(onTeacherReady, onLoggedOut) {
  auth.onAuthStateChanged(function (user) {
    if (user) {
      currentUser = user;

      // Block admin — wrong app
      if (user.email === ADMIN_EMAIL) {
        toast('Admin should use the main management system.', 'err');
        auth.signOut();
        return;
      }

      // Fetch teacher profile
      db.collection('teachers').where('email', '==', user.email).limit(1).get()
        .then(function (snap) {
          if (snap.empty) {
            toast('Teacher profile not found. Ask admin to add you.', 'err');
            auth.signOut();
            return;
          }
          teacherDoc = Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
          if (onTeacherReady) onTeacherReady(user, teacherDoc);
        })
        .catch(function (e) { toast('Error loading profile: ' + e.message, 'err'); });

    } else {
      currentUser = null;
      teacherDoc  = null;
      if (onLoggedOut) onLoggedOut();
    }
  });
}

function doLogin(email, pass, onSuccess, onError) {
  auth.signInWithEmailAndPassword(email, pass)
    .then(function () { if (onSuccess) onSuccess(); })
    .catch(function (e) { if (onError) onError(e); });
}

function doLogout() {
  auth.signOut();
}
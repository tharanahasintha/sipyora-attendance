// ══════════════════════════════════════════════
//  APP.JS — Sipyora Attendance App
//  Main controller — wires auth, data, and UI
// ══════════════════════════════════════════════

// ── BOOT ──
initAuth(
  function onTeacherReady(user, teacher) {
    populateHero(teacher);
    populateSheet(teacher, user.email);
    buildSubjectChips(teacher.subjects || []);
    showScreen('homeScreen');

    loadTeacherStudents(teacher, function (students) {
      loadTodayAttendance(user.email, function () {
        renderStudentList();
        updateSavedNotice();
        document.getElementById('saveBar').style.display = '';
      });
    });
  },
  function onLoggedOut() {
    allStudents   = [];
    attMap        = {};
    activeSubject = '';
    activeGrade   = '';
    document.getElementById('studentList').innerHTML = '';
    document.getElementById('savedNotice').innerHTML = '';
    document.getElementById('saveBar').style.display = 'none';
    // Reset login form
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value  = '';
    document.getElementById('loginErr').style.display = 'none';
    showScreen('loginScreen');
  }
);

// ── LOGIN FORM ──
function handleLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pass  = document.getElementById('loginPass').value;
  var btn   = document.getElementById('loginBtn');
  var err   = document.getElementById('loginErr');

  if (!email || !pass) {
    err.textContent = 'Please enter your email and password.';
    err.style.display = 'block';
    return;
  }

  btn.textContent = 'Signing in…';
  btn.disabled = true;
  err.style.display = 'none';

  doLogin(email, pass,
    function () {
      // success — onAuthStateChanged handles the rest
    },
    function (e) {
      err.textContent = 'Incorrect email or password.';
      err.style.display = 'block';
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  );
}

// ── SAVE BUTTON ──
function handleSave() {
  var btn = document.getElementById('saveBtn');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  saveAttendance(
    currentUser.email,
    function (count, hasUnmarked) {
      toast('Saved ' + count + ' attendance records!', 'ok');
      if (hasUnmarked) toast('Some students are still unmarked', 'info');
      btn.textContent = '💾 Save';
      btn.disabled = false;
      updateSavedNotice();
    },
    function (errMsg) {
      if (errMsg === 'no_records') {
        toast('Mark at least one student first', 'info');
      } else {
        toast('Error: ' + errMsg, 'err');
      }
      btn.textContent = '💾 Save';
      btn.disabled = false;
    }
  );
}

// ── LOGOUT ──
function handleLogout() {
  closeSheet();
  doLogout();
}
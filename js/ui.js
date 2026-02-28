// ══════════════════════════════════════════════
//  UI.JS — Sipyora Attendance App
//  All DOM rendering and screen management
// ══════════════════════════════════════════════

var activeSubject = '';   // '' = all
var activeGrade   = '';   // '' = all

/* ── SCREEN TRANSITIONS ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.remove('active');
  });
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ── BOTTOM SHEET ── */
function openSheet() {
  document.getElementById('profileSheet').classList.add('open');
}
function closeSheet(e) {
  if (!e || e.target === document.getElementById('profileSheet')) {
    document.getElementById('profileSheet').classList.remove('open');
  }
}

/* ── POPULATE PROFILE SHEET ── */
function populateSheet(teacher, email) {
  document.getElementById('sheetName').textContent   = teacher.name || 'Teacher';
  document.getElementById('sheetEmail').textContent  = email || '—';
  document.getElementById('sheetDate').textContent   = formatDate(today);
  document.getElementById('sheetSubjects').textContent = (teacher.subjects || []).join(', ') || '—';
  document.getElementById('sheetGrades').textContent =
    (teacher.grades || []).length > 0
      ? (teacher.grades || []).map(function (g) { return 'G' + g; }).join(', ')
      : 'All Grades';
}

/* ── BUILD SUBJECT CHIP STRIP ── */
function buildSubjectChips(subjects) {
  var wrap = document.getElementById('subjectChips');
  if (!subjects || subjects.length === 0) {
    wrap.innerHTML = '<span style="color:var(--muted);font-size:0.82rem;padding:8px 0;">No subjects assigned</span>';
    return;
  }
  var html = '<button class="subj-chip active" data-s="" onclick="filterSubject(this,\'\')">All</button>';
  subjects.forEach(function (s) {
    html += '<button class="subj-chip" data-s="' + s + '" onclick="filterSubject(this,\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</button>';
  });
  wrap.innerHTML = html;
}

/* ── SUBJECT FILTER ── */
function filterSubject(btn, sub) {
  activeSubject = sub;
  document.querySelectorAll('#subjectChips .subj-chip').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderStudentList();
}

/* ── GRADE FILTER ── */
function filterGrade(btn, g) {
  activeGrade = g;
  document.querySelectorAll('#gradeButtons .grade-btn').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderStudentList();
}

/* ── RENDER STUDENT LIST ── */
function renderStudentList() {
  var listEl  = document.getElementById('studentList');
  var searchQ = (document.getElementById('stuSearch').value || '').toLowerCase().trim();
  var tSubj   = teacherDoc ? (teacherDoc.subjects || []) : [];

  // Filter
  var filtered = allStudents.filter(function (s) {
    var gradeOk = !activeGrade || String(s.grade) === String(activeGrade);
    var nameOk  = !searchQ   || s.name.toLowerCase().indexOf(searchQ) !== -1;
    var subOk   = !activeSubject || (s.subjects || []).indexOf(activeSubject) !== -1;
    return gradeOk && nameOk && subOk;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="center-msg"><div class="icon">🔍</div><p>No students match.<br>Try adjusting filters.</p></div>';
    updateSaveBar([]);
    return;
  }

  // Group by grade
  var gradeMap = {};
  var gradeOrder = [];
  filtered.forEach(function (s) {
    if (!gradeMap[s.grade]) { gradeMap[s.grade] = []; gradeOrder.push(s.grade); }
    gradeMap[s.grade].push(s);
  });
  gradeOrder.sort(function (a, b) { return a - b; });

  var visibleKeys = [];
  var html = '';

  gradeOrder.forEach(function (g) {
    var students = gradeMap[g];
    if (!activeGrade || String(activeGrade) === String(g)) {
      html += '<div class="grade-divider"><span>Grade ' + g + '</span></div>';
    }

    students.forEach(function (s) {
      var relevantSubs = (s.subjects || []).filter(function (sub) {
        var teacherHas = tSubj.length === 0 || tSubj.indexOf(sub) !== -1;
        var filterOk   = !activeSubject || sub === activeSubject;
        return teacherHas && filterOk;
      });

      relevantSubs.forEach(function (sub) {
        var key     = s.id + '_' + sub;
        var rec     = attMap[key];
        var status  = rec ? rec.status : '';
        var nameHtml = searchQ ? hlText(s.name, searchQ) : s.name;
        var initials = s.name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().substring(0, 2);

        visibleKeys.push(key);
        html += buildStudentCard(s.id, sub, initials, nameHtml, s.grade, status);
      });
    });
  });

  listEl.innerHTML = html;
  updateSaveBar(visibleKeys);
  updateSavedNotice();
}

function buildStudentCard(studentId, subject, initials, nameHtml, grade, status) {
  var cardClass = status === 'present' ? 'present' : (status === 'absent' ? 'absent' : '');
  var encSub    = encodeURIComponent(subject);
  var safeSub   = subject.replace(/'/g, "\\'");
  return '\
    <div class="s-card ' + cardClass + '" id="card_' + studentId + '_' + encSub + '">\
      <div class="s-avatar">' + initials + '</div>\
      <div class="s-info">\
        <div class="s-name">' + nameHtml + '</div>\
        <div class="s-meta">G' + grade + ' · ' + subject + '</div>\
      </div>\
      <div class="att-pair">\
        <button class="att-btn p-btn ' + (status === 'present' ? 'on' : '') + '" \
          onclick="markAtt(\'' + studentId + '\',\'' + safeSub + '\',\'present\',this)">✓</button>\
        <button class="att-btn a-btn ' + (status === 'absent' ? 'on' : '') + '" \
          onclick="markAtt(\'' + studentId + '\',\'' + safeSub + '\',\'absent\',this)">✗</button>\
      </div>\
    </div>';
}

/* ── MARK ATTENDANCE (called from card buttons) ── */
function markAtt(studentId, subject, status, btn) {
  setAttendanceLocal(studentId, subject, status);

  var encSub = encodeURIComponent(subject);
  var card   = document.getElementById('card_' + studentId + '_' + encSub);
  if (card) {
    card.className = 's-card ' + status;
    card.querySelectorAll('.att-btn').forEach(function (b) { b.classList.remove('on'); });
    btn.classList.add('on');
  }

  // Recompute save bar
  var searchQ  = (document.getElementById('stuSearch').value || '').toLowerCase().trim();
  var tSubj    = teacherDoc ? (teacherDoc.subjects || []) : [];
  var filtered = allStudents.filter(function (s) {
    var gradeOk = !activeGrade || String(s.grade) === String(activeGrade);
    var nameOk  = !searchQ    || s.name.toLowerCase().indexOf(searchQ) !== -1;
    var subOk   = !activeSubject || (s.subjects || []).indexOf(activeSubject) !== -1;
    return gradeOk && nameOk && subOk;
  });
  var keys = [];
  filtered.forEach(function (s) {
    (s.subjects || []).forEach(function (sub) {
      var teacherHas = tSubj.length === 0 || tSubj.indexOf(sub) !== -1;
      var filterOk   = !activeSubject || sub === activeSubject;
      if (teacherHas && filterOk) keys.push(s.id + '_' + sub);
    });
  });
  updateSaveBar(keys);

  if (navigator.vibrate) navigator.vibrate(25);
}

/* ── FLOATING SAVE BAR ── */
function updateSaveBar(visibleKeys) {
  var stats = computeSummary(visibleKeys || []);
  document.getElementById('statP').textContent = stats.present;
  document.getElementById('statA').textContent = stats.absent;
  document.getElementById('statU').textContent = stats.unmarked;
}

/* ── SAVED NOTICE ── */
function updateSavedNotice() {
  var noticeEl = document.getElementById('savedNotice');
  var saved = Object.values(attMap).filter(function (v) { return v && v.docId; }).length;
  if (saved > 0) {
    noticeEl.innerHTML = '<div class="saved-notice">✅ ' + saved + ' records already saved today — tap to update</div>';
  } else {
    noticeEl.innerHTML = '';
  }
}

/* ── HIGHLIGHT SEARCH MATCH ── */
function hlText(text, q) {
  var idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return text.substring(0, idx) +
    '<mark>' + text.substring(idx, idx + q.length) + '</mark>' +
    text.substring(idx + q.length);
}

/* ── HOME SCREEN HERO ── */
function populateHero(teacher) {
  var firstName = (teacher.name || 'Teacher').split(' ')[0];
  document.getElementById('heroName').textContent = firstName;
  document.getElementById('avatarLetter').textContent = firstName.charAt(0).toUpperCase();
  document.getElementById('heroDateChip').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long'
  });
  document.getElementById('topbarSub').textContent = formatDate(today);
}
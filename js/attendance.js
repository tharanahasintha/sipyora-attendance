// ══════════════════════════════════════════════
//  ATTENDANCE.JS — Sipyora Attendance App
//  All Firestore read/write for attendance
// ══════════════════════════════════════════════

var allStudents   = [];   // students belonging to this teacher
var attMap        = {};   // key: "studentId_subject" → { status, docId? }
var today         = getTodayStr();

// ── Load teacher's students ──
function loadTeacherStudents(teacherDoc, onDone) {
  var tSubjects = teacherDoc.subjects || [];
  var tGrades   = teacherDoc.grades   || [];

  db.collection('students').orderBy('grade').get()
    .then(function (snap) {
      var all = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

      // Keep only students that match this teacher's subjects AND grades
      allStudents = all.filter(function (s) {
        var subMatch = tSubjects.length === 0 ||
          (s.subjects || []).some(function (sub) { return tSubjects.indexOf(sub) !== -1; });
        var gradeMatch = tGrades.length === 0 || tGrades.indexOf(s.grade) !== -1;
        return subMatch && gradeMatch;
      });

      // Sort grade asc → name asc
      allStudents.sort(function (a, b) {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.name.localeCompare(b.name);
      });

      if (onDone) onDone(allStudents);
    })
    .catch(function (e) { toast('Error loading students: ' + e.message, 'err'); });
}

// ── Load existing attendance for today by this teacher ──
function loadTodayAttendance(markedBy, onDone) {
  db.collection('attendance')
    .where('date',     '==', today)
    .where('markedBy', '==', markedBy)
    .get()
    .then(function (snap) {
      attMap = {};
      snap.docs.forEach(function (d) {
        var data = d.data();
        attMap[data.studentId + '_' + data.subject] = { status: data.status, docId: d.id };
      });
      if (onDone) onDone(attMap);
    })
    .catch(function (e) { toast('Error loading attendance: ' + e.message, 'err'); });
}

// ── Set attendance for one student/subject in memory ──
function setAttendanceLocal(studentId, subject, status) {
  var key = studentId + '_' + subject;
  if (!attMap[key]) attMap[key] = {};
  attMap[key].status = status;
}

// ── Save all marked attendance to Firestore ──
function saveAttendance(markedBy, onSuccess, onError) {
  var batch = db.batch();
  var count = 0;
  var hasUnmarked = false;

  Object.keys(attMap).forEach(function (key) {
    var rec = attMap[key];
    if (!rec || !rec.status) { hasUnmarked = true; return; }

    var parts     = key.split('_');
    var studentId = parts[0];
    var subject   = parts.slice(1).join('_');
    count++;

    if (rec.docId) {
      // Update existing record
      batch.update(db.collection('attendance').doc(rec.docId), {
        status:    rec.status,
        markedBy:  markedBy,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create new record
      var ref = db.collection('attendance').doc();
      batch.set(ref, {
        studentId: studentId,
        subject:   subject,
        date:      today,
        month:     getMonthStr(today),
        status:    rec.status,
        markedBy:  markedBy,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });

  if (count === 0) {
    if (onError) onError('no_records');
    return;
  }

  batch.commit()
    .then(function () {
      // After saving, reload to get docIds for future updates
      loadTodayAttendance(markedBy, function () {});
      if (onSuccess) onSuccess(count, hasUnmarked);
    })
    .catch(function (e) { if (onError) onError(e.message); });
}

// ── Compute summary counts for visible student rows ──
function computeSummary(visibleKeys) {
  var p = 0, a = 0, u = 0;
  visibleKeys.forEach(function (key) {
    var rec = attMap[key];
    if (!rec || !rec.status) u++;
    else if (rec.status === 'present') p++;
    else a++;
  });
  return { present: p, absent: a, unmarked: u };
}
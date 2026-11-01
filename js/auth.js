// ===== DEMO DATA (localStorage simulation) =====
const DEMO_ACCOUNTS = {
  parent01: { password: '1234', role: 'parent', name: 'นาง สมหญิง รักลูก', studentId: 'S001' },
  parent02: { password: '1234', role: 'parent', name: 'นาย สมชาย ใจดี', studentId: 'S002' },
  parent03: { password: '1234', role: 'parent', name: 'นาง วิภา ศรีสวัสดิ์', studentId: 'S003' },
  teacher01: { password: '5678', role: 'teacher', name: 'ครู พิมพ์ใจ สุขเสมอ' },
  admin: { password: 'admin', role: 'teacher', name: 'ผู้ดูแลระบบ' },
};

let currentRole = 'parent';

function setRole(role) {
  currentRole = role;
  document.getElementById('tab-parent').classList.toggle('active', role === 'parent');
  document.getElementById('tab-teacher').classList.toggle('active', role === 'teacher');

  if (role === 'parent') {
    document.getElementById('login-title').textContent = 'เข้าสู่ระบบผู้ปกครอง';
    document.getElementById('login-sub').textContent = 'กรุณาใช้บัญชีที่ได้รับจากโรงเรียน';
    document.getElementById('demo-info').innerHTML = `
      <strong>🔑 บัญชีสาธิต (ผู้ปกครอง):</strong><br/>
      ชื่อผู้ใช้: <strong>parent01</strong> | รหัสผ่าน: <strong>1234</strong><br/>
      ชื่อผู้ใช้: <strong>parent02</strong> | รหัสผ่าน: <strong>1234</strong>`;
  } else {
    document.getElementById('login-title').textContent = 'เข้าสู่ระบบครู/ผู้ดูแล';
    document.getElementById('login-sub').textContent = 'สำหรับครูและเจ้าหน้าที่โรงเรียนเท่านั้น';
    document.getElementById('demo-info').innerHTML = `
      <strong>🔑 บัญชีสาธิต (ครู/ผู้ดูแล):</strong><br/>
      ชื่อผู้ใช้: <strong>teacher01</strong> | รหัสผ่าน: <strong>5678</strong><br/>
      ชื่อผู้ใช้: <strong>admin</strong> | รหัสผ่าน: <strong>admin</strong>`;
  }

  document.getElementById('error-msg').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

function togglePassword() {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
  document.getElementById('toggle-password').textContent = pw.type === 'password' ? '👁️' : '🙈';
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const errMsg = document.getElementById('error-msg');

  errMsg.style.display = 'none';
  btn.classList.add('loading');
  btn.innerHTML = '<span>กำลังตรวจสอบ...</span>';

  setTimeout(() => {
    const account = DEMO_ACCOUNTS[username];
    if (!account) {
      showError('ไม่พบชื่อผู้ใช้นี้ในระบบ');
      btn.classList.remove('loading');
      btn.innerHTML = '<span>เข้าสู่ระบบ</span><span>→</span>';
      return;
    }
    if (account.password !== password) {
      showError('รหัสผ่านไม่ถูกต้อง');
      btn.classList.remove('loading');
      btn.innerHTML = '<span>เข้าสู่ระบบ</span><span>→</span>';
      return;
    }
    if (account.role !== currentRole) {
      showError(`บัญชีนี้เป็นบัญชี${account.role === 'parent' ? 'ผู้ปกครอง' : 'ครู'} ไม่ใช่บัญชี${currentRole === 'parent' ? 'ผู้ปกครอง' : 'ครู'}`);
      btn.classList.remove('loading');
      btn.innerHTML = '<span>เข้าสู่ระบบ</span><span>→</span>';
      return;
    }

    // Save session
    sessionStorage.setItem('user', JSON.stringify({
      username,
      role: account.role,
      name: account.name,
      studentId: account.studentId || null,
    }));

    btn.innerHTML = '<span>✅ สำเร็จ!</span>';
    setTimeout(() => {
      if (account.role === 'teacher') {
        window.location.href = 'teacher-dashboard.html';
      } else {
        window.location.href = 'parent-dashboard.html';
      }
    }, 600);
  }, 900);
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = '❌ ' + msg;
  el.style.display = 'block';
}

// Auto-select role from URL param
const params = new URLSearchParams(window.location.search);
if (params.get('role') === 'teacher') setRole('teacher');

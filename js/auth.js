// ===== SUPABASE AUTHENTICATION =====
let currentRole = 'parent';

function setRole(role) {
  currentRole = role;
  document.getElementById('tab-parent').classList.toggle('active', role === 'parent');
  document.getElementById('tab-teacher').classList.toggle('active', role === 'teacher');

  if (role === 'parent') {
    document.getElementById('login-title').textContent = 'เข้าสู่ระบบนักเรียน';
    document.getElementById('login-sub').textContent = 'กรุณาใช้ชื่อผู้ใช้และรหัสผ่านที่โรงเรียนกำหนด';
    document.getElementById('demo-info').innerHTML =
      'บัญชีนักเรียนใช้เลขประจำตัว เช่น <strong>691231</strong> และรหัสผ่านที่ได้รับจากโรงเรียน';
    document.getElementById('username').placeholder = 'กรอกเลขประจำตัวนักเรียน';
  } else {
    document.getElementById('login-title').textContent = 'เข้าสู่ระบบครู/ผู้ดูแล';
    document.getElementById('login-sub').textContent = 'สำหรับครูและผู้ดูแลระบบเท่านั้น';
    document.getElementById('demo-info').innerHTML =
      'กรอกชื่อผู้ใช้เจ้าหน้าที่ที่ได้รับจากผู้ดูแลระบบ';
    document.getElementById('username').placeholder = 'กรอกชื่อผู้ใช้เจ้าหน้าที่';
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

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const errMsg = document.getElementById('error-msg');

  errMsg.style.display = 'none';
  btn.disabled = true;
  btn.classList.add('loading');
  btn.innerHTML = '<span>กำลังตรวจสอบ...</span>';

  try {
    if (!window.supabaseClient) throw new Error('ยังไม่ได้โหลด Supabase กรุณารีเฟรชหน้าเว็บ');

    // Usernames map to the non-deliverable demo email identifiers created in Supabase Auth.
    const email = `${username}@schoolpickup.test`.toLowerCase();
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data?.user) throw new Error('ไม่พบข้อมูลผู้ใช้งาน');

    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('display_name, role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ในระบบ โปรดติดต่อผู้ดูแล');

    const isStaff = ['admin', 'teacher'].includes(profile.role);
    if ((currentRole === 'parent' && profile.role !== 'parent') ||
        (currentRole === 'teacher' && !isStaff)) {
      await window.supabaseClient.auth.signOut();
      throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบในบทบาทที่เลือก');
    }

    let studentId = null;
    if (profile.role === 'parent') {
      const { data: account, error: accountError } = await window.supabaseClient
        .from('student_accounts')
        .select('student_code')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();
      if (accountError) throw accountError;
      if (!account) throw new Error('บัญชียังไม่ได้ผูกกับข้อมูลนักเรียน');
      studentId = account.student_code;
    }

    sessionStorage.setItem('user', JSON.stringify({
      id: data.user.id,
      username,
      role: profile.role,
      name: profile.display_name || username,
      displayName: profile.display_name || username,
      studentId
    }));

    btn.innerHTML = '<span>✅ สำเร็จ!</span>';
    window.location.href = isStaff ? 'teacher-dashboard.html' : 'parent-dashboard.html';
  } catch (error) {
    await window.supabaseClient?.auth.signOut();
    showError(error.message || 'เข้าสู่ระบบไม่สำเร็จ');
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = '<span>เข้าสู่ระบบ</span><span>→</span>';
  }
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = '❌ ' + msg;
  el.style.display = 'block';
}

const params = new URLSearchParams(window.location.search);
if (params.get('role') === 'teacher') setRole('teacher');

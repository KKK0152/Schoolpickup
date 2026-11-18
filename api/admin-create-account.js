import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

function send(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return send(res, 500, { error: 'Server Supabase environment variables are not configured.' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!accessToken) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบใหม่' });

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !authData?.user) return send(res, 401, { error: 'เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileError || profile?.role !== 'admin') {
      return send(res, 403, { error: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เพิ่มบัญชีนักเรียนได้' });
    }

    const { username, password, name, studentId } = req.body || {};
    if (
      typeof username !== 'string' || !/^\d{4,20}$/.test(username.trim()) ||
      typeof password !== 'string' || password.length < 8 ||
      typeof name !== 'string' || !name.trim() ||
      typeof studentId !== 'string' || !/^S\d{3,}$/.test(studentId)
    ) {
      return send(res, 400, { error: 'กรุณาตรวจสอบชื่อผู้ใช้ รหัสผ่าน (อย่างน้อย 8 ตัวอักษร) ชื่อผู้ปกครอง และรหัสนักเรียน' });
    }

    const cleanUsername = username.trim();
    const cleanName = name.trim();
    const email = `${cleanUsername}@schoolpickup.test`.toLowerCase();

    const { data: student, error: studentError } = await admin
      .from('students')
      .select('student_code')
      .eq('student_code', studentId)
      .maybeSingle();
    if (studentError || !student) return send(res, 404, { error: 'ไม่พบรหัสนักเรียนในฐานข้อมูล' });

    const { data: existingAccount, error: existingError } = await admin
      .from('student_accounts')
      .select('student_code, auth_user_id')
      .eq('student_code', studentId)
      .maybeSingle();
    if (existingError) return send(res, 500, { error: existingError.message });
    if (existingAccount?.auth_user_id) return send(res, 409, { error: 'นักเรียนคนนี้มีบัญชีเข้าสู่ระบบแล้ว' });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername, student_code: studentId, guardian_name: cleanName }
    });
    if (createError) return send(res, 400, { error: createError.message });

    const authUserId = created.user.id;
    const { error: accountError } = await admin
      .from('student_accounts')
      .upsert({
        student_code: studentId,
        username: cleanUsername,
        auth_user_id: authUserId
      }, { onConflict: 'student_code' });

    if (accountError) {
      await admin.auth.admin.deleteUser(authUserId);
      return send(res, 400, { error: accountError.message });
    }

    const { error: guardianError } = await admin
      .from('guardians')
      .upsert({ student_code: studentId, guardian_name: cleanName }, { onConflict: 'student_code' });
    if (guardianError) {
      await admin.from('student_accounts').update({ auth_user_id: null }).eq('student_code', studentId);
      await admin.auth.admin.deleteUser(authUserId);
      return send(res, 400, { error: guardianError.message });
    }

    const { error: profileSaveError } = await admin
      .from('profiles')
      .upsert({ user_id: authUserId, display_name: cleanName, role: 'parent' }, { onConflict: 'user_id' });
    if (profileSaveError) {
      await admin.from('student_accounts').update({ auth_user_id: null }).eq('student_code', studentId);
      await admin.auth.admin.deleteUser(authUserId);
      return send(res, 400, { error: profileSaveError.message });
    }

    return send(res, 201, { ok: true, username: cleanUsername, studentId });
  } catch (error) {
    console.error('create student account error:', error);
    return send(res, 500, { error: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองอีกครั้ง' });
  }
}

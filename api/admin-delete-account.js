import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({ error: 'Server Supabase environment variables are not configured.' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบใหม่' });

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'เซสชันไม่ถูกต้อง' });

    const { data: profile } = await admin
      .from('profiles').select('role').eq('user_id', authData.user.id).maybeSingle();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'เฉพาะ Admin เท่านั้น' });

    const username = String(req.body?.username || '').trim();
    if (!/^\d{4,20}$/.test(username)) return res.status(400).json({ error: 'ชื่อผู้ใช้ไม่ถูกต้อง' });

    const { data: account, error: accountError } = await admin
      .from('student_accounts')
      .select('student_code, auth_user_id')
      .eq('username', username)
      .maybeSingle();
    if (accountError) return res.status(500).json({ error: accountError.message });
    if (!account) return res.status(404).json({ error: 'ไม่พบบัญชีนี้' });

    if (account.auth_user_id) {
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(account.auth_user_id);
      if (deleteUserError) return res.status(400).json({ error: deleteUserError.message });
    }

    const { error: deleteAccountError } = await admin
      .from('student_accounts').delete().eq('username', username);
    if (deleteAccountError) return res.status(400).json({ error: deleteAccountError.message });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('delete student account error:', error);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

# คู่มือตั้งค่า Supabase สำหรับ Schoolpickup

เอกสารนี้ใช้กับ branch `supabase-online-integration` และโค้ด Vercel แบบ static + serverless API

## 0) หมุนเวียน Secret key ที่เคยเปิดเผย

คีย์ `sb_secret_` ที่เคยส่งในแชตถือว่าเปิดเผยแล้ว ให้เพิกถอน/หมุนเวียนใน Supabase > Project Settings > API Keys ก่อนใช้งาน API ฝั่งเซิร์ฟเวอร์ จากนั้นเก็บคีย์ใหม่ไว้ใน Vercel Environment Variables เท่านั้น ห้าม commit ลง Git และห้ามใส่ในไฟล์ JavaScript ฝั่ง browser

## 1) สร้างบัญชีผู้ดูแลระบบใน Supabase Auth

เปิด Supabase > Authentication > Users > Add user > Create new user

- Email: `admin@schoolpickup.test`
- Password: ตั้งรหัสผ่านใหม่ที่แข็งแรงและเก็บเป็นความลับ
- เปิด Auto Confirm / Email Confirmed หากมีตัวเลือก
- Create user

ห้ามใช้รหัสผ่านตัวอย่างที่เปิดเผยในโค้ดเก่า

## 2) เปิดใช้นโยบาย RLS

เปิด Supabase > SQL Editor > New query แล้วคัดลอกเนื้อหาไฟล์ `supabase/setup-rls-and-staff.sql` มาวางและกด Run

ท้ายคำสั่งควรแสดงจำนวน profile ของ role admin อย่างน้อย 1 รายการ หลังจากสร้างผู้ใช้ admin ในขั้นตอนที่ 1 แล้ว

สคริปต์นี้:
- เปิดสิทธิ์อ่านข้อมูลนักเรียน/ผู้ปกครองเฉพาะเจ้าหน้าที่หรือผู้ปกครองที่ผูกกับนักเรียน
- ให้ผู้ปกครองอ่านและจัดการเฉพาะคำขอรับ-ส่งของนักเรียนที่ผูกบัญชี
- ให้ admin/teacher ดูแลข้อมูลทั้งหมด
- ไม่อนุญาตให้ผู้ใช้ยกระดับ role ของตนเองผ่านเบราว์เซอร์

## 3) ตั้งค่า Vercel Environment Variables

ใน Vercel > Project Schoolpickup > Settings > Environment Variables ให้เพิ่ม:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SECRET_KEY` | Secret key ใหม่ที่เพิ่งหมุนเวียน |

ตั้งค่าให้ครบ Environment ที่ใช้งานจริง (Production; Preview ตามต้องการ) แล้ว Save

Publishable key สำหรับ browser อยู่ใน `js/supabase-config.js` เท่านั้น คีย์นี้ไม่ใช่ความลับ แต่ต้องใช้ร่วมกับ RLS ที่กำหนดอย่างถูกต้อง

## 4) Deploy

Merge pull request ของ branch `supabase-online-integration` เข้าสู่ `main` แล้วตรวจ Vercel Deploy ให้สำเร็จ

## 5) บัญชีนักเรียน

บัญชีที่มีอยู่แล้วใช้รูปแบบ:
- Username: `691231` ถึง `691240`
- Auth email: `{username}@schoolpickup.test`
- Password: ใช้รหัสผ่านที่ตั้งไว้ตอนสร้างบัญชี Auth ใน Supabase

ระบบไม่สามารถอ่านหรือแสดงรหัสผ่านเดิมจาก Supabase Auth ได้ หากจำไม่ได้ต้องตั้งรหัสผ่านใหม่ผ่านช่องทางผู้ดูแลที่ปลอดภัย

## 6) ข้อจำกัดของอีเมลจำลอง

โดเมน `schoolpickup.test` ใช้เป็นตัวระบุบัญชีเพื่อสาธิตเท่านั้น ไม่สามารถรับอีเมลจริงหรืออีเมลรีเซ็ตรหัสผ่านได้ ก่อนใช้งานกับผู้ปกครองจริง ให้เปลี่ยนเป็นอีเมล/โทรศัพท์ที่ผู้ปกครองควบคุมได้และกำหนดขั้นตอนกู้คืนบัญชี

## 7) ตรวจสอบหลัง Deploy

- ล็อกอิน Admin ด้วย `admin` + รหัสผ่านที่ตั้งใน Auth
- หน้า Admin > บัญชีนักเรียน ต้องแสดง 10 บัญชี
- ล็อกอินนักเรียนด้วยเลขประจำตัว + รหัสผ่านที่ตั้งไว้ใน Auth
- สร้างคำขอรับ-ส่งทดสอบ และตรวจว่าแสดงจากบัญชีครู
- ทดสอบจากเบราว์เซอร์/อุปกรณ์อีกเครื่องเพื่อยืนยันว่าอ่านข้อมูลจากฐานข้อมูลออนไลน์ ไม่ใช่ localStorage

## หมายเหตุทางเทคนิค

- `api/admin-create-account.js` และ `api/admin-delete-account.js` เป็น Vercel Serverless Functions ที่ใช้ Secret key ฝั่งเซิร์ฟเวอร์
- Secret key ไม่อยู่ใน GitHub
- รหัสผ่านไม่มีการบันทึกลง `student_accounts` หรือแสดงในหน้า Admin
- การเพิ่มบัญชีจากหน้า Admin จำกัดเฉพาะ profile ที่มี role `admin`

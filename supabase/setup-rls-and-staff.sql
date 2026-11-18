-- Schoolpickup Supabase security policies
-- Run in Supabase SQL Editor after creating the admin Auth user.

create or replace function public.schoolpickup_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'teacher')
  );
$$;

create or replace function public.schoolpickup_owns_student(p_student_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.student_accounts sa
    where sa.student_code = p_student_code
      and sa.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.schoolpickup_is_staff() from public, anon;
revoke all on function public.schoolpickup_owns_student(text) from public, anon;
grant execute on function public.schoolpickup_is_staff() to authenticated;
grant execute on function public.schoolpickup_owns_student(text) to authenticated;

-- Support every existing request mode in Schoolpickup.
alter table public.pickup_requests
  drop constraint if exists pickup_requests_request_type_check;
alter table public.pickup_requests
  add constraint pickup_requests_request_type_check
  check (request_type in ('pickup', 'bus', 'walk'));

-- Remove old policies so this script can be safely rerun.
drop policy if exists "students_select_own_or_staff" on public.students;
drop policy if exists "students_staff_write" on public.students;
drop policy if exists "guardians_select_own_or_staff" on public.guardians;
drop policy if exists "guardians_staff_write" on public.guardians;
drop policy if exists "student_accounts_select_own_or_staff" on public.student_accounts;
drop policy if exists "student_accounts_staff_write" on public.student_accounts;
drop policy if exists "profiles_select_self_or_staff" on public.profiles;
drop policy if exists "pickup_requests_select_own_or_staff" on public.pickup_requests;
drop policy if exists "pickup_requests_insert_own_or_staff" on public.pickup_requests;
drop policy if exists "pickup_requests_update_own_or_staff" on public.pickup_requests;

-- No anonymous access to student, guardian, account or pickup information.
revoke all on public.students, public.guardians, public.student_accounts,
  public.profiles, public.pickup_requests from anon;

grant select, insert, update, delete on public.students, public.guardians,
  public.student_accounts, public.profiles, public.pickup_requests to authenticated;

-- Students: staff can manage all; a parent can read only their own student.
create policy "students_select_own_or_staff"
on public.students for select to authenticated
using (public.schoolpickup_is_staff() or public.schoolpickup_owns_student(student_code));

create policy "students_staff_write"
on public.students for all to authenticated
using (public.schoolpickup_is_staff())
with check (public.schoolpickup_is_staff());

-- Guardians: staff can see/manage all; parents can read their linked guardian record.
create policy "guardians_select_own_or_staff"
on public.guardians for select to authenticated
using (public.schoolpickup_is_staff() or public.schoolpickup_owns_student(student_code));

create policy "guardians_staff_write"
on public.guardians for all to authenticated
using (public.schoolpickup_is_staff())
with check (public.schoolpickup_is_staff());

-- Student account mapping: parents can read only their own mapping; staff can read/manage all.
create policy "student_accounts_select_own_or_staff"
on public.student_accounts for select to authenticated
using (public.schoolpickup_is_staff() or auth_user_id = auth.uid());

create policy "student_accounts_staff_write"
on public.student_accounts for all to authenticated
using (public.schoolpickup_is_staff())
with check (public.schoolpickup_is_staff());

-- Profiles: users see their own profile; staff can see all profiles.
create policy "profiles_select_self_or_staff"
on public.profiles for select to authenticated
using (user_id = auth.uid() or public.schoolpickup_is_staff());

-- Pickup requests: staff can see all; parents can see requests for their own child.
create policy "pickup_requests_select_own_or_staff"
on public.pickup_requests for select to authenticated
using (public.schoolpickup_is_staff() or public.schoolpickup_owns_student(student_code));

create policy "pickup_requests_insert_own_or_staff"
on public.pickup_requests for insert to authenticated
with check (
  public.schoolpickup_is_staff()
  or (created_by = auth.uid() and public.schoolpickup_owns_student(student_code))
);

create policy "pickup_requests_update_own_or_staff"
on public.pickup_requests for update to authenticated
using (
  public.schoolpickup_is_staff()
  or (public.schoolpickup_owns_student(student_code) and status = 'pending')
)
with check (
  public.schoolpickup_is_staff()
  or (created_by = auth.uid() and public.schoolpickup_owns_student(student_code))
);

-- Bootstrap the administrator profile if the Auth user already exists.
-- Create admin@schoolpickup.test in Authentication > Users first.
insert into public.profiles (user_id, display_name, role)
select id, 'ผู้ดูแลระบบ Schoolpickup', 'admin'
from auth.users
where lower(email) = 'admin@schoolpickup.test'
on conflict (user_id) do update
set display_name = excluded.display_name, role = 'admin';

-- Optional teacher account; create teacher01@schoolpickup.test in Auth > Users first.
insert into public.profiles (user_id, display_name, role)
select id, 'ครูผู้ดูแล Schoolpickup', 'teacher'
from auth.users
where lower(email) = 'teacher01@schoolpickup.test'
on conflict (user_id) do update
set display_name = excluded.display_name, role = 'teacher';

-- Verification: role and table counts.
select role, count(*) as account_count
from public.profiles
group by role
order by role;

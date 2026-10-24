-- =====================================================================
-- Ứng dụng gia sư Vật lý – Schema + Row Level Security + Storage
-- Chạy toàn bộ file này trong Supabase Dashboard > SQL Editor.
-- File chạy lại nhiều lần được (idempotent): không xóa dữ liệu cũ.
-- =====================================================================


-- =====================================================================
-- 1. BẢNG
-- =====================================================================

-- Hồ sơ người dùng (1-1 với auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'student' check (role in ('tutor', 'student')),
  group_name  text check (group_name in ('A', 'B', 'C', 'D', 'E')),
  grade       int  check (grade in (11, 12)),
  subjects    text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Bài giảng
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content_md  text not null default '',
  file_path   text,            -- đường dẫn trong bucket 'lesson-files'
  video_url   text,
  created_at  timestamptz not null default now()
);

-- Bài giảng giao cho từng học sinh
create table if not exists public.lesson_recipients (
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (lesson_id, student_id)
);

-- Bài tập
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid references public.lessons (id) on delete set null,
  title       text not null,
  type        text not null default 'homework' check (type in ('classwork', 'homework')),
  due_date    date,
  created_at  timestamptz not null default now()
);

-- Câu hỏi trong bài tập (KHÔNG chứa đáp án)
create table if not exists public.exercises (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  sort_order     int not null default 0,
  question_md    text not null
);

-- Đáp án tách bảng riêng để RLS chặn được trước khi nộp
create table if not exists public.answer_keys (
  exercise_id  uuid primary key references public.exercises (id) on delete cascade,
  answer_md    text not null default '',
  method_md    text not null default ''
);

-- Bài tập giao cho từng học sinh + trạng thái nộp / chấm
create table if not exists public.assignment_recipients (
  assignment_id    uuid not null references public.assignments (id) on delete cascade,
  student_id       uuid not null references public.profiles (id) on delete cascade,
  status           text not null default 'todo' check (status in ('todo', 'done', 'checked')),
  submission_path  text,          -- thư mục ảnh trong bucket 'submissions': <student_id>/<assignment_id>
  submitted_at     timestamptz,
  score            numeric(5, 2),
  feedback         text,
  primary key (assignment_id, student_id)
);

-- ---- Nâng cấp: câu trắc nghiệm / điền khuyết (an toàn khi chạy lại trên CSDL cũ) ----
-- kind: 'essay' (tự luận), 'mcq' (trắc nghiệm), 'fill_blank' (điền khuyết)
-- options: mcq → [{"label":"A","text":"..."}], fill_blank → [{"id":"a","statement":"..."}]
-- options KHÔNG chứa đáp án; đáp án máy chấm nằm ở answer_keys.correct
alter table public.exercises add column if not exists kind text not null default 'essay';
alter table public.exercises add column if not exists options jsonb;
-- true_false (đúng/sai, kiểu THPT): options → [{"id":"a","statement":"..."}, ... 4 ý], correct → {"a":true,"b":false,...}
-- short (trả lời ngắn): options null, correct → "1,89" (nhiều cách viết chấp nhận: "1,89; 1,9")
alter table public.exercises drop constraint if exists exercises_kind_check;
alter table public.exercises add constraint exercises_kind_check check (kind in ('essay', 'mcq', 'fill_blank', 'true_false', 'short'));

-- correct: mcq → "B", fill_blank → {"a":"...","b":"..."}
alter table public.answer_keys add column if not exists correct jsonb;

-- ---- Nâng cấp: đề thi chấm theo thang điểm THPT ----
-- is_exam: gia sư đánh dấu bài là đề thi. Khi đó điểm máy chấm tính theo thang THPT:
--   trắc nghiệm 0,25/câu; đúng-sai: đúng 1/2/3/4 ý được 0,1/0,25/0,5/1; trả lời ngắn 0,25/câu.
alter table public.assignments add column if not exists is_exam boolean not null default false;

-- ---- Nâng cấp: tính giờ làm đề thi ----
-- time_limit_minutes: số phút làm bài (đề THPT chuẩn 50). null = không tính giờ. Chỉ dùng khi is_exam.
-- started_at: lúc học sinh bấm "Bắt đầu làm bài" (máy chủ ghi, học sinh không tự sửa được)
alter table public.assignments add column if not exists time_limit_minutes int;
alter table public.assignments drop constraint if exists assignments_time_limit_check;
alter table public.assignments add constraint assignments_time_limit_check
  check (time_limit_minutes is null or time_limit_minutes between 1 and 600);
alter table public.assignment_recipients add column if not exists started_at timestamptz;

-- Câu trả lời học sinh gõ / chọn trực tiếp trong app
create table if not exists public.submission_answers (
  assignment_id  uuid not null,
  student_id     uuid not null,
  exercise_id    uuid not null references public.exercises (id) on delete cascade,
  answer         jsonb not null,   -- {"choice":"B"} | {"blanks":{"a":"..."}} | {"text":"..."}
  is_correct     boolean,          -- true/false: máy chấm; null: gia sư tự xem
  primary key (exercise_id, student_id),
  foreign key (assignment_id, student_id)
    references public.assignment_recipients (assignment_id, student_id) on delete cascade
);

create index if not exists submission_answers_rec_idx on public.submission_answers (assignment_id, student_id);
-- points: điểm câu này theo thang THPT (chỉ tính cho trắc nghiệm, đúng-sai, trả lời ngắn)
alter table public.submission_answers add column if not exists points numeric(5, 2);

-- ---- Nâng cấp: chương ----
-- Chương gom bài giảng + bài tập của cùng một nội dung (vd. "Chủ đề 4: Giao thoa sóng cơ").
-- section: nhóm lớn hơn để xếp các chương (vd. "Chuyên đề 2: Sóng").
create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  section     text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---- Nâng cấp: học sinh lớp bất kỳ (trước chỉ 11, 12), để mở thêm lớp 10... ----
alter table public.profiles drop constraint if exists profiles_grade_check;
alter table public.profiles add constraint profiles_grade_check check (grade between 1 and 12);

-- ---- Nâng cấp: Lớp › Môn › Chuyên đề › Chương ----
-- grade: lớp (1–12), subject: môn (vd. "Vật lý"). Để trống = "Chưa rõ lớp/môn".
alter table public.chapters add column if not exists grade   int;
alter table public.chapters add column if not exists subject text;
alter table public.chapters drop constraint if exists chapters_grade_check;
alter table public.chapters add constraint chapters_grade_check check (grade between 1 and 12);

-- Tên chương chỉ cần không trùng trong cùng lớp + môn ("Chủ đề 2" lớp 11 khác "Chủ đề 2" lớp 12)
drop index if exists public.chapters_title_key;
create unique index if not exists chapters_scope_title_key
  on public.chapters (coalesce(grade, 0), lower(coalesce(subject, '')), lower(title));

-- Chương cũ chưa có lớp: đoán từ tên chuyên đề, vd. "L11_Chuyên đề 1" hay "Lớp 12 - ..."
update public.chapters
   set grade = (regexp_match(section, '(^|[^[:alpha:]])l(ớp)?[ _.:-]*(1[0-2]|[1-9])([^0-9]|$)', 'i'))[3]::int
 where grade is null
   and section ~* '(^|[^[:alpha:]])l(ớp)?[ _.:-]*(1[0-2]|[1-9])([^0-9]|$)';

alter table public.lessons     add column if not exists chapter_id uuid references public.chapters (id) on delete set null;
alter table public.assignments add column if not exists chapter_id uuid references public.chapters (id) on delete set null;
-- ---- Nâng cấp: thông báo bài mới cho học sinh ----
-- assigned_at: lúc bài được giao cho học sinh đó (bài giao trước đây lấy theo ngày tạo bài)
alter table public.lesson_recipients     add column if not exists assigned_at timestamptz;
alter table public.assignment_recipients add column if not exists assigned_at timestamptz;
update public.lesson_recipients lr set assigned_at = l.created_at
  from public.lessons l where l.id = lr.lesson_id and lr.assigned_at is null;
update public.assignment_recipients ar set assigned_at = a.created_at
  from public.assignments a where a.id = ar.assignment_id and ar.assigned_at is null;
alter table public.lesson_recipients     alter column assigned_at set default now();
alter table public.assignment_recipients alter column assigned_at set default now();
alter table public.lesson_recipients     alter column assigned_at set not null;
alter table public.assignment_recipients alter column assigned_at set not null;
-- notif_seen_at: lần cuối học sinh mở chuông thông báo (đổi qua hàm mark_notifications_seen)
alter table public.profiles add column if not exists notif_seen_at timestamptz;

create index if not exists lessons_chapter_idx     on public.lessons (chapter_id);
create index if not exists assignments_chapter_idx on public.assignments (chapter_id);
create index if not exists lesson_recipients_student_idx     on public.lesson_recipients (student_id);
create index if not exists assignment_recipients_student_idx on public.assignment_recipients (student_id);
create index if not exists exercises_assignment_idx          on public.exercises (assignment_id, sort_order);
create index if not exists assignments_lesson_idx            on public.assignments (lesson_id);


-- =====================================================================
-- 2. HÀM is_tutor()
-- security definer: đọc profiles mà không bị RLS của profiles chặn
-- (tránh đệ quy vô hạn khi policy của profiles gọi lại is_tutor()).
-- =====================================================================
create or replace function public.is_tutor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'tutor'
  );
$$;

revoke all on function public.is_tutor() from public;
grant execute on function public.is_tutor() to authenticated;


-- =====================================================================
-- 3. TỰ TẠO HỒ SƠ KHI CÓ TÀI KHOẢN MỚI
-- Mặc định role = 'student'. Gia sư tự đổi role của mình bằng SQL (README).
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tạo hồ sơ cho các tài khoản đã có trước khi chạy file này
insert into public.profiles (id, full_name)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;


-- =====================================================================
-- 4. CHỐT CHẶN CẬP NHẬT BÀI NỘP
-- Học sinh KHÔNG có quyền UPDATE trực tiếp bảng assignment_recipients.
-- Muốn nộp bài phải gọi hàm submit_assignment() (mục 6), hàm này bật cờ
-- 'app.submitting' trong transaction. Trigger chặn mọi cập nhật khác
-- không phải của gia sư (phòng hờ nếu sau này lỡ thêm policy UPDATE).
-- =====================================================================
create or replace function public.guard_assignment_recipient_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- SQL Editor / service role (không có auth.uid()), gia sư, hoặc đi qua submit_assignment()
  if auth.uid() is null
     or public.is_tutor()
     or coalesce(current_setting('app.submitting', true), '') = 'on' then
    return new;
  end if;
  raise exception 'Hãy nộp bài bằng nút "Nộp bài" trong ứng dụng';
end;
$$;

drop trigger if exists guard_assignment_recipient_update on public.assignment_recipients;
create trigger guard_assignment_recipient_update
  before update on public.assignment_recipients
  for each row execute function public.guard_assignment_recipient_update();


-- =====================================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.lessons               enable row level security;
alter table public.lesson_recipients     enable row level security;
alter table public.assignments           enable row level security;
alter table public.exercises             enable row level security;
alter table public.answer_keys           enable row level security;
alter table public.assignment_recipients enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_tutor_all   on public.profiles;
drop policy if exists profiles_self_select on public.profiles;

create policy profiles_tutor_all on public.profiles
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

-- Học sinh chỉ đọc hồ sơ của mình, không sửa được (không đổi được role)
create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- ---------- lessons ----------
drop policy if exists lessons_tutor_all      on public.lessons;
drop policy if exists lessons_student_select on public.lessons;

create policy lessons_tutor_all on public.lessons
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

create policy lessons_student_select on public.lessons
  for select to authenticated
  using (exists (
    select 1 from public.lesson_recipients lr
    where lr.lesson_id = lessons.id and lr.student_id = auth.uid()
  ));

-- ---------- lesson_recipients ----------
drop policy if exists lesson_recipients_tutor_all      on public.lesson_recipients;
drop policy if exists lesson_recipients_student_select on public.lesson_recipients;

create policy lesson_recipients_tutor_all on public.lesson_recipients
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

create policy lesson_recipients_student_select on public.lesson_recipients
  for select to authenticated
  using (student_id = auth.uid());

-- ---------- assignments ----------
drop policy if exists assignments_tutor_all      on public.assignments;
drop policy if exists assignments_student_select on public.assignments;

create policy assignments_tutor_all on public.assignments
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

create policy assignments_student_select on public.assignments
  for select to authenticated
  using (exists (
    select 1 from public.assignment_recipients ar
    where ar.assignment_id = assignments.id and ar.student_id = auth.uid()
  ));

-- ---------- exercises ----------
drop policy if exists exercises_tutor_all      on public.exercises;
drop policy if exists exercises_student_select on public.exercises;

create policy exercises_tutor_all on public.exercises
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

create policy exercises_student_select on public.exercises
  for select to authenticated
  using (exists (
    select 1 from public.assignment_recipients ar
    where ar.assignment_id = exercises.assignment_id and ar.student_id = auth.uid()
  ));

-- ---------- answer_keys ----------
-- Đáp án CHỈ đọc được khi bài của học sinh đã ở trạng thái done/checked.
-- Trước khi nộp, truy vấn answer_keys trả về rỗng: đáp án không bao giờ
-- được gửi xuống trình duyệt học sinh.
drop policy if exists answer_keys_tutor_all      on public.answer_keys;
drop policy if exists answer_keys_student_select on public.answer_keys;

create policy answer_keys_tutor_all on public.answer_keys
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

create policy answer_keys_student_select on public.answer_keys
  for select to authenticated
  using (exists (
    select 1
    from public.exercises e
    join public.assignment_recipients ar on ar.assignment_id = e.assignment_id
    where e.id = answer_keys.exercise_id
      and ar.student_id = auth.uid()
      and ar.status in ('done', 'checked')
  ));

-- ---------- assignment_recipients ----------
drop policy if exists assignment_recipients_tutor_all      on public.assignment_recipients;
drop policy if exists assignment_recipients_student_select on public.assignment_recipients;
drop policy if exists assignment_recipients_student_update on public.assignment_recipients;

create policy assignment_recipients_tutor_all on public.assignment_recipients
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

create policy assignment_recipients_student_select on public.assignment_recipients
  for select to authenticated
  using (student_id = auth.uid());

-- Học sinh KHÔNG có policy INSERT/UPDATE/DELETE: không tự giao bài, không sửa
-- điểm/nhận xét. Việc nộp bài (status, submission_path, submitted_at) chỉ đi
-- qua hàm submit_assignment() ở mục 6, hàm này tự kiểm tra quyền.

-- ---------- submission_answers ----------
alter table public.submission_answers enable row level security;

drop policy if exists submission_answers_tutor_all      on public.submission_answers;
drop policy if exists submission_answers_student_select on public.submission_answers;

create policy submission_answers_tutor_all on public.submission_answers
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

-- Học sinh chỉ đọc câu trả lời của chính mình; ghi thì qua submit_assignment()
create policy submission_answers_student_select on public.submission_answers
  for select to authenticated
  using (student_id = auth.uid());

-- ---------- chapters ----------
alter table public.chapters enable row level security;

drop policy if exists chapters_tutor_all      on public.chapters;
drop policy if exists chapters_student_select on public.chapters;

create policy chapters_tutor_all on public.chapters
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

-- Học sinh chỉ thấy tên các chương có bài giảng / bài tập được giao cho mình
create policy chapters_student_select on public.chapters
  for select to authenticated
  using (
    exists (
      select 1 from public.lessons l
      join public.lesson_recipients lr on lr.lesson_id = l.id
      where l.chapter_id = chapters.id and lr.student_id = auth.uid()
    )
    or exists (
      select 1 from public.assignments a
      join public.assignment_recipients ar on ar.assignment_id = a.id
      where a.chapter_id = chapters.id and ar.student_id = auth.uid()
    )
  );


-- =====================================================================
-- 6. HÀM LƯU BÀI GIẢNG / BÀI TẬP (gói trong 1 transaction)
-- Lưu bài tập gồm nhiều bảng (assignments, exercises, answer_keys,
-- recipients). Dùng hàm để nếu lỗi giữa chừng thì không để lại dữ liệu dở.
-- =====================================================================
create or replace function public.save_lesson(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_students uuid[];
begin
  if not public.is_tutor() then
    raise exception 'Chỉ gia sư mới được lưu bài giảng';
  end if;
  if coalesce(trim(p ->> 'title'), '') = '' then
    raise exception 'Bài giảng cần có tiêu đề';
  end if;

  if v_id is null then
    insert into lessons (title, content_md, file_path, video_url, chapter_id)
    values (trim(p ->> 'title'), coalesce(p ->> 'content_md', ''),
            nullif(p ->> 'file_path', ''), nullif(trim(p ->> 'video_url'), ''),
            nullif(p ->> 'chapter_id', '')::uuid)
    returning id into v_id;
  else
    update lessons
       set title = trim(p ->> 'title'),
           content_md = coalesce(p ->> 'content_md', ''),
           file_path = nullif(p ->> 'file_path', ''),
           video_url = nullif(trim(p ->> 'video_url'), ''),
           chapter_id = nullif(p ->> 'chapter_id', '')::uuid
     where id = v_id;
    if not found then
      raise exception 'Không tìm thấy bài giảng để cập nhật';
    end if;
  end if;

  -- Đồng bộ danh sách học sinh nhận
  select coalesce(array_agg(x::uuid), '{}')
    into v_students
    from jsonb_array_elements_text(coalesce(p -> 'student_ids', '[]'::jsonb)) as x;

  delete from lesson_recipients
   where lesson_id = v_id and student_id <> all (v_students);
  insert into lesson_recipients (lesson_id, student_id)
  select v_id, s from unnest(v_students) as s
  on conflict do nothing;

  return v_id;
end;
$$;

create or replace function public.save_assignment(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_students uuid[];
  v_ex jsonb;
  v_ex_id uuid;
  v_kind text;
  v_i int := 0;
begin
  if not public.is_tutor() then
    raise exception 'Chỉ gia sư mới được lưu bài tập';
  end if;
  if coalesce(trim(p ->> 'title'), '') = '' then
    raise exception 'Bài tập cần có tiêu đề';
  end if;
  if coalesce(p ->> 'type', '') not in ('classwork', 'homework') then
    raise exception 'Loại bài tập phải là classwork hoặc homework';
  end if;
  if jsonb_array_length(coalesce(p -> 'exercises', '[]'::jsonb)) = 0 then
    raise exception 'Bài tập cần ít nhất 1 câu hỏi';
  end if;

  if v_id is null then
    insert into assignments (lesson_id, title, type, due_date, chapter_id, is_exam, time_limit_minutes)
    values (nullif(p ->> 'lesson_id', '')::uuid, trim(p ->> 'title'), p ->> 'type',
            nullif(p ->> 'due_date', '')::date, nullif(p ->> 'chapter_id', '')::uuid,
            coalesce((p ->> 'is_exam')::boolean, false),
            case when coalesce((p ->> 'is_exam')::boolean, false) then nullif(p ->> 'time_limit_minutes', '')::int end)
    returning id into v_id;
  else
    update assignments
       set lesson_id = nullif(p ->> 'lesson_id', '')::uuid,
           title = trim(p ->> 'title'),
           type = p ->> 'type',
           due_date = nullif(p ->> 'due_date', '')::date,
           chapter_id = nullif(p ->> 'chapter_id', '')::uuid,
           is_exam = coalesce((p ->> 'is_exam')::boolean, false),
           time_limit_minutes = case when coalesce((p ->> 'is_exam')::boolean, false)
                                     then nullif(p ->> 'time_limit_minutes', '')::int end
     where id = v_id;
    if not found then
      raise exception 'Không tìm thấy bài tập để cập nhật';
    end if;
    -- Sửa bài: xóa các câu không còn trong danh sách; câu còn giữ được cập nhật
    -- tại chỗ để KHÔNG mất câu trả lời học sinh đã nộp.
    delete from exercises e
     where e.assignment_id = v_id
       and e.id::text not in (
         select coalesce(x ->> 'id', '') from jsonb_array_elements(p -> 'exercises') as x
       );
  end if;

  for v_ex in select value from jsonb_array_elements(p -> 'exercises') loop
    v_i := v_i + 1;
    v_kind := coalesce(nullif(v_ex ->> 'kind', ''), 'essay');
    if v_kind not in ('essay', 'mcq', 'fill_blank', 'true_false', 'short') then
      raise exception 'Câu %: loại câu không hợp lệ (%)', v_i, v_kind;
    end if;
    if coalesce(trim(v_ex ->> 'question_md'), '') = '' then
      raise exception 'Câu % chưa có đề bài', v_i;
    end if;
    if v_kind = 'mcq' then
      if jsonb_typeof(v_ex -> 'options') <> 'array' or jsonb_array_length(v_ex -> 'options') < 2 then
        raise exception 'Câu % (trắc nghiệm) cần ít nhất 2 phương án', v_i;
      end if;
      if not exists (
        select 1 from jsonb_array_elements(v_ex -> 'options') o
        where o ->> 'label' = v_ex ->> 'correct'
      ) then
        raise exception 'Câu % (trắc nghiệm) chưa chọn phương án đúng', v_i;
      end if;
    elsif v_kind = 'fill_blank' then
      if jsonb_typeof(v_ex -> 'options') <> 'array' or jsonb_array_length(v_ex -> 'options') < 1 then
        raise exception 'Câu % (điền khuyết) cần ít nhất 1 chỗ trống', v_i;
      end if;
    elsif v_kind = 'true_false' then
      if jsonb_typeof(v_ex -> 'options') <> 'array' or jsonb_array_length(v_ex -> 'options') not between 1 and 4 then
        raise exception 'Câu % (đúng/sai) cần từ 1 đến 4 ý', v_i;
      end if;
      if jsonb_typeof(v_ex -> 'correct') <> 'object' or exists (
        select 1 from jsonb_array_elements(v_ex -> 'options') o
        where jsonb_typeof(v_ex -> 'correct' -> (o ->> 'id')) is distinct from 'boolean'
      ) then
        raise exception 'Câu % (đúng/sai): mỗi ý cần chọn Đúng hoặc Sai', v_i;
      end if;
    elsif v_kind = 'short' then
      if coalesce(trim(v_ex ->> 'correct'), '') = '' then
        raise exception 'Câu % (trả lời ngắn) chưa có đáp án', v_i;
      end if;
    end if;

    -- Cập nhật câu cũ (nếu id thuộc bài này), không thì thêm câu mới
    update exercises
       set sort_order = v_i, kind = v_kind, question_md = v_ex ->> 'question_md',
           options = case when v_kind in ('essay', 'short') then null else v_ex -> 'options' end
     where id::text = coalesce(v_ex ->> 'id', '') and assignment_id = v_id
    returning id into v_ex_id;
    if v_ex_id is null then
      insert into exercises (assignment_id, sort_order, kind, question_md, options)
      values (v_id, v_i, v_kind, v_ex ->> 'question_md',
              case when v_kind in ('essay', 'short') then null else v_ex -> 'options' end)
      returning id into v_ex_id;
    end if;

    insert into answer_keys (exercise_id, answer_md, method_md, correct)
    values (v_ex_id, coalesce(v_ex ->> 'answer_md', ''), coalesce(v_ex ->> 'method_md', ''),
            case when v_kind = 'essay' then null else v_ex -> 'correct' end)
    on conflict (exercise_id) do update
      set answer_md = excluded.answer_md, method_md = excluded.method_md, correct = excluded.correct;
    v_ex_id := null;
  end loop;

  -- Sửa đáp án thì chấm lại bài đã nộp (vd. phát hiện đáp án đề tô đỏ bị sai)
  update submission_answers sa
     set is_correct = public.grade_answer(e.kind, k.correct, sa.answer),
         points = public.answer_points(e.kind, k.correct, sa.answer)
    from exercises e
    left join answer_keys k on k.exercise_id = e.id
   where sa.exercise_id = e.id and e.assignment_id = v_id;

  -- Đồng bộ danh sách học sinh nhận (học sinh mới: status 'todo')
  select coalesce(array_agg(x::uuid), '{}')
    into v_students
    from jsonb_array_elements_text(coalesce(p -> 'student_ids', '[]'::jsonb)) as x;

  delete from assignment_recipients
   where assignment_id = v_id and student_id <> all (v_students);
  insert into assignment_recipients (assignment_id, student_id)
  select v_id, s from unnest(v_students) as s
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.save_lesson(jsonb) from public;
revoke all on function public.save_assignment(jsonb) from public;
grant execute on function public.save_lesson(jsonb) to authenticated;
grant execute on function public.save_assignment(jsonb) to authenticated;

-- Tìm chương theo tên trong cùng lớp + môn (không phân biệt hoa thường), chưa có thì tạo.
-- Chương cũ cùng tên nhưng chưa ghi lớp/môn thì dùng lại và điền lớp/môn vào. Dùng khi nhập JSON.
drop function if exists public.ensure_chapter(text, text);
create or replace function public.ensure_chapter(p_title text, p_section text default null,
                                                 p_grade int default null, p_subject text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_title text := trim(p_title);
  v_subject text := nullif(trim(p_subject), '');
begin
  if not public.is_tutor() then
    raise exception 'Chỉ gia sư mới được tạo chương';
  end if;
  if coalesce(v_title, '') = '' then
    raise exception 'Chương cần có tên';
  end if;

  select id into v_id from chapters
   where lower(title) = lower(v_title)
     and coalesce(grade, 0) = coalesce(p_grade, 0)
     and lower(coalesce(subject, '')) = lower(coalesce(v_subject, ''));
  if v_id is not null then
    return v_id;
  end if;

  -- Chương cũ (trước khi có lớp/môn): bổ sung lớp/môn thay vì tạo trùng
  select id into v_id from chapters
   where lower(title) = lower(v_title)
     and (grade is null or grade = p_grade or p_grade is null)
     and (subject is null or lower(subject) = lower(v_subject) or v_subject is null)
   order by created_at
   limit 1;
  if v_id is not null then
    update chapters
       set grade = coalesce(grade, p_grade),
           subject = coalesce(subject, v_subject),
           section = coalesce(section, nullif(trim(p_section), ''))
     where id = v_id;
    return v_id;
  end if;

  insert into chapters (title, section, grade, subject, sort_order)
  values (v_title, nullif(trim(p_section), ''), p_grade, v_subject,
          coalesce((select max(sort_order) + 1 from chapters), 0))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.ensure_chapter(text, text, int, text) from public;
grant execute on function public.ensure_chapter(text, text, int, text) to authenticated;

-- ---------- Chấm tự động ----------
-- Chuẩn hóa câu trả lời điền khuyết: chữ thường, gộp khoảng trắng, bỏ dấu câu cuối.
-- Giữ nguyên dấu tiếng Việt ("phuong" khác "phương").
create or replace function public.normalize_answer(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(regexp_replace(lower(trim(coalesce(t, ''))), '\s+', ' ', 'g'), '[\s.,;:!]+$', '');
$$;

-- Trả lời ngắn: so từng cách viết được chấp nhận (ngăn bằng ";").
-- Số thì so theo giá trị: "1,89" = "1.89" = "1,890"; "−" (dấu trừ Unicode) = "-".
create or replace function public.short_match(p_correct text, p_given text)
returns boolean
language plpgsql
immutable
as $$
declare
  alt text;
  g text := replace(replace(lower(regexp_replace(coalesce(p_given, ''), '\s+', '', 'g')), ',', '.'), '−', '-');
  c text;
begin
  if g = '' or p_correct is null then
    return false;
  end if;
  for alt in select regexp_split_to_table(p_correct, '\s*;\s*') loop
    c := replace(replace(lower(regexp_replace(alt, '\s+', '', 'g')), ',', '.'), '−', '-');
    if c = '' then
      continue;
    end if;
    if g ~ '^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)$' and c ~ '^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)$' then
      if g::numeric = c::numeric then
        return true;
      end if;
    elsif public.normalize_answer(g) = public.normalize_answer(c) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- Đúng/sai: số ý học sinh chọn đúng
create or replace function public.tf_count(p_correct jsonb, p_answer jsonb)
returns int
language sql
immutable
as $$
  select count(*)::int
    from jsonb_each(coalesce(p_correct, '{}'::jsonb)) as c
   where (p_answer -> 'tf' -> c.key) is not null
     and (p_answer -> 'tf' ->> c.key) = (c.value #>> '{}');
$$;

-- mcq / short: đúng/sai. true_false: true khi đúng cả 4 ý, sai một ý là false.
-- fill_blank: true nếu MỌI chỗ trống khớp, ngược lại null
-- (để gia sư tự xem, vì cách viết khác vẫn có thể đúng). essay: null.
create or replace function public.grade_answer(p_kind text, p_correct jsonb, p_answer jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
begin
  if p_correct is null or p_answer is null then
    return null;
  end if;
  if p_kind = 'mcq' then
    return upper(coalesce(p_answer ->> 'choice', '')) = upper(coalesce(p_correct #>> '{}', ''));
  elsif p_kind = 'short' then
    return public.short_match(p_correct #>> '{}', p_answer ->> 'text');
  elsif p_kind = 'true_false' then
    if jsonb_typeof(p_correct) <> 'object' then
      return null;
    end if;
    return public.tf_count(p_correct, p_answer) = (select count(*) from jsonb_object_keys(p_correct));
  elsif p_kind = 'fill_blank' then
    if jsonb_typeof(p_correct) <> 'object' then
      return null;
    end if;
    for k in select jsonb_object_keys(p_correct) loop
      if public.normalize_answer(p_answer -> 'blanks' ->> k) = ''
         or public.normalize_answer(p_answer -> 'blanks' ->> k) <> public.normalize_answer(p_correct ->> k) then
        return null;
      end if;
    end loop;
    return true;
  end if;
  return null;
end;
$$;

-- Điểm một câu theo thang THPT (dùng khi bài là đề thi; lưu cho mọi bài để gia sư bật/tắt sau vẫn đúng):
--   trắc nghiệm 0,25; trả lời ngắn 0,25; đúng/sai theo số ý đúng: 1 → 0,1; 2 → 0,25; 3 → 0,5; 4 → 1.
--   Tự luận, điền khuyết: null (gia sư tự chấm).
create or replace function public.answer_points(p_kind text, p_correct jsonb, p_answer jsonb)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_correct is null then
    return null;
  end if;
  if p_kind in ('mcq', 'short') then
    return case when coalesce(public.grade_answer(p_kind, p_correct, p_answer), false) then 0.25 else 0 end;
  elsif p_kind = 'true_false' then
    return (array[0, 0.1, 0.25, 0.5, 1])[least(public.tf_count(p_correct, p_answer), 4) + 1];
  end if;
  return null;
end;
$$;

-- Bài đã nộp trước bản cập nhật này: tính điểm từng câu theo thang THPT
update public.submission_answers sa
   set points = public.answer_points(e.kind, k.correct, sa.answer)
  from public.exercises e
  left join public.answer_keys k on k.exercise_id = e.id
 where sa.exercise_id = e.id and sa.points is null and e.kind in ('mcq', 'short', 'true_false');

-- ---------- Nộp bài ----------
-- p_answers: {"<exercise_id>": {"choice":"B"} | {"blanks":{"a":"..."}} | {"text":"..."}}
-- Ảnh bài làm (nếu có) được tải lên Storage TRƯỚC khi gọi hàm này; không bắt buộc.
-- security definer: hàm tự kiểm tra học sinh có được giao bài và bài còn 'todo'.
create or replace function public.submit_assignment(p_assignment_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập để nộp bài';
  end if;

  select status into v_status
    from assignment_recipients
   where assignment_id = p_assignment_id and student_id = v_uid
   for update;
  if not found then
    raise exception 'Bài này không được giao cho bạn';
  end if;
  if v_status <> 'todo' then
    raise exception 'Bài này đã nộp, không thể nộp lại. Hãy nhờ gia sư mở lại nếu cần.';
  end if;

  -- Lưu câu trả lời (chỉ nhận câu thuộc bài này) và chấm luôn
  delete from submission_answers where assignment_id = p_assignment_id and student_id = v_uid;
  insert into submission_answers (assignment_id, student_id, exercise_id, answer, is_correct, points)
  select p_assignment_id, v_uid, e.id, a.value, public.grade_answer(e.kind, k.correct, a.value),
         public.answer_points(e.kind, k.correct, a.value)
    from exercises e
    join jsonb_each(coalesce(p_answers, '{}'::jsonb)) as a on a.key = e.id::text
    left join answer_keys k on k.exercise_id = e.id
   where e.assignment_id = p_assignment_id
     and jsonb_typeof(a.value) = 'object';

  -- Bật cờ để trigger ở mục 4 cho phép cập nhật này (chỉ trong transaction hiện tại)
  perform set_config('app.submitting', 'on', true);
  update assignment_recipients
     set status = 'done',
         submitted_at = now(),
         submission_path = v_uid::text || '/' || p_assignment_id::text
   where assignment_id = p_assignment_id and student_id = v_uid;
  perform set_config('app.submitting', 'off', true);
end;
$$;

revoke all on function public.submit_assignment(uuid, jsonb) from public;
grant execute on function public.submit_assignment(uuid, jsonb) to authenticated;

-- ---------- Bắt đầu làm đề có tính giờ ----------
-- Ghi lúc bắt đầu một lần duy nhất (tải lại trang không được tính lại giờ).
-- Trả về {"started_at": ..., "now": ...}: kèm giờ máy chủ để app bù lệch đồng hồ của máy học sinh.
drop function if exists public.start_assignment(uuid);
create or replace function public.start_assignment(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_started timestamptz;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập để làm bài';
  end if;
  select status, started_at into v_status, v_started
    from assignment_recipients
   where assignment_id = p_assignment_id and student_id = v_uid
   for update;
  if not found then
    raise exception 'Bài này không được giao cho bạn';
  end if;
  if v_started is null and v_status = 'todo' then
    perform set_config('app.submitting', 'on', true);
    update assignment_recipients set started_at = now()
     where assignment_id = p_assignment_id and student_id = v_uid
    returning started_at into v_started;
    perform set_config('app.submitting', 'off', true);
  end if;
  return jsonb_build_object('started_at', v_started, 'now', now());
end;
$$;

revoke all on function public.start_assignment(uuid) from public;
grant execute on function public.start_assignment(uuid) to authenticated;

-- ---------- Thông báo ----------
-- Học sinh không có quyền sửa bảng profiles, nên đánh dấu "đã xem thông báo" đi qua hàm này
-- (chỉ đổi notif_seen_at của chính mình).
create or replace function public.mark_notifications_seen()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update profiles set notif_seen_at = now() where id = auth.uid() returning notif_seen_at;
$$;

revoke all on function public.mark_notifications_seen() from public;
grant execute on function public.mark_notifications_seen() to authenticated;

-- ---------- Báo lỗi đề ----------
-- Học sinh báo một câu bị lỗi (kèm ghi chú); gia sư xem ở trang "Báo lỗi đề" rồi
-- đánh dấu 'fixed' (đã sửa) hoặc 'dismissed' (câu không lỗi).
create table if not exists public.question_reports (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  note         text not null default '',
  status       text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
-- Mỗi học sinh chỉ có 1 báo lỗi đang mở cho mỗi câu (báo lại = sửa ghi chú)
create unique index if not exists question_reports_open_uniq
  on public.question_reports (exercise_id, student_id) where status = 'open';
create index if not exists question_reports_status_idx on public.question_reports (status, created_at desc);

alter table public.question_reports enable row level security;

drop policy if exists question_reports_tutor_all      on public.question_reports;
drop policy if exists question_reports_student_select on public.question_reports;

create policy question_reports_tutor_all on public.question_reports
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

-- Học sinh chỉ xem báo lỗi của mình; gửi thì qua report_exercise()
create policy question_reports_student_select on public.question_reports
  for select to authenticated
  using (student_id = auth.uid());

create or replace function public.report_exercise(p_exercise_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_note text := trim(coalesce(p_note, ''));
  v_row question_reports;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập để báo lỗi';
  end if;
  if v_note = '' then
    raise exception 'Hãy ghi rõ câu này bị lỗi như thế nào';
  end if;
  if length(v_note) > 2000 then
    raise exception 'Ghi chú quá dài (tối đa 2000 ký tự)';
  end if;
  if not exists (
    select 1 from exercises e
    join assignment_recipients ar on ar.assignment_id = e.assignment_id
    where e.id = p_exercise_id and ar.student_id = v_uid
  ) then
    raise exception 'Câu này không thuộc bài được giao cho bạn';
  end if;

  insert into question_reports (exercise_id, student_id, note)
  values (p_exercise_id, v_uid, v_note)
  on conflict (exercise_id, student_id) where status = 'open'
  do update set note = excluded.note, created_at = now()
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.report_exercise(uuid, text) from public;
grant execute on function public.report_exercise(uuid, text) to authenticated;

-- ---------- Góp ý của người dùng ----------
-- Học sinh gửi góp ý (nút "Góp ý" ở góc trái dưới); gia sư xem hết ở trang "Góp ý".
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null default 'idea' check (kind in ('idea', 'bug', 'praise', 'other')),
  rating      smallint check (rating between 1 and 5),
  message     text not null check (length(trim(message)) > 0 and length(message) <= 2000),
  page        text,
  seen        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists feedback_tutor_all  on public.feedback;
drop policy if exists feedback_own_insert on public.feedback;
drop policy if exists feedback_own_select on public.feedback;

create policy feedback_tutor_all on public.feedback
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

-- Người dùng chỉ gửi góp ý dưới tên mình, chưa đánh dấu đã xem; không sửa/xóa
create policy feedback_own_insert on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid() and seen = false);

create policy feedback_own_select on public.feedback
  for select to authenticated
  using (user_id = auth.uid());

-- ---------- Chương đang học ----------
-- Lưu theo học sinh. Tự đổi khi học sinh mở một bài tập chưa nộp để làm (chương của bài tập đó),
-- hoặc khi học sinh tự bấm "Đánh dấu đang học" ở một chương / bài giảng. Không làm gì thì giữ nguyên.
alter table public.profiles add column if not exists study_chapter_id uuid references public.chapters (id) on delete set null;
alter table public.profiles add column if not exists study_chapter_at timestamptz;

-- Học sinh không sửa được bảng profiles → đổi qua hàm này (chỉ chương có bài được giao cho mình; null = bỏ đánh dấu)
create or replace function public.set_study_chapter(p_chapter_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập';
  end if;
  if p_chapter_id is not null and not exists (
    select 1 from lessons l join lesson_recipients lr on lr.lesson_id = l.id
     where l.chapter_id = p_chapter_id and lr.student_id = v_uid
    union all
    select 1 from assignments a join assignment_recipients ar on ar.assignment_id = a.id
     where a.chapter_id = p_chapter_id and ar.student_id = v_uid
  ) then
    raise exception 'Chương này chưa có bài nào được giao cho bạn';
  end if;
  update profiles set study_chapter_id = p_chapter_id, study_chapter_at = now() where id = v_uid;
  return p_chapter_id;
end;
$$;

revoke all on function public.set_study_chapter(uuid) from public;
grant execute on function public.set_study_chapter(uuid) to authenticated;

-- ---------- Câu khó (học sinh tự đánh dấu) ----------
-- Học sinh bấm "Câu khó" khi làm / xem lại bài; câu nằm ở mục "Câu khó" của trang Ôn tập
-- cho tới khi học sinh bấm "Bỏ đánh dấu". Làm lại ở đó bao nhiêu lần cũng được, không tính điểm.
create table if not exists public.question_marks (
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  student_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (exercise_id, student_id)
);
create index if not exists question_marks_student_idx on public.question_marks (student_id, created_at desc);
-- note: ghi chú riêng của học sinh cho câu khó (kiến thức cần nhớ để làm bài). Bỏ đánh dấu thì mất cả ghi chú.
alter table public.question_marks add column if not exists note text not null default '';
alter table public.question_marks drop constraint if exists question_marks_note_len;
alter table public.question_marks add constraint question_marks_note_len check (length(note) <= 4000);

alter table public.question_marks enable row level security;

-- Câu khó + ghi chú là của riêng học sinh: gia sư KHÔNG có policy đọc (bỏ policy cũ question_marks_tutor_all)
drop policy if exists question_marks_tutor_all  on public.question_marks;
drop policy if exists question_marks_own_select on public.question_marks;
drop policy if exists question_marks_own_insert on public.question_marks;
drop policy if exists question_marks_own_update on public.question_marks;
drop policy if exists question_marks_own_delete on public.question_marks;

-- Sửa ghi chú câu khó của mình
create policy question_marks_own_update on public.question_marks
  for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy question_marks_own_select on public.question_marks
  for select to authenticated
  using (student_id = auth.uid());

-- Chỉ đánh dấu câu thuộc bài được giao cho mình
create policy question_marks_own_insert on public.question_marks
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.exercises e
      join public.assignment_recipients ar on ar.assignment_id = e.assignment_id
      where e.id = question_marks.exercise_id and ar.student_id = auth.uid()
    )
  );

create policy question_marks_own_delete on public.question_marks
  for delete to authenticated
  using (student_id = auth.uid());

-- ---------- Làm lại bài đã nộp (luyện thêm, tối đa 3 lần) ----------
-- Điểm chính thức vẫn là lần nộp đầu (assignment_recipients + submission_answers); lần làm lại chỉ lưu ở đây.
-- Gia sư bấm "Cho nộp lại" thì lần nộp kế tiếp (qua submit_assignment) mới thay bài chính thức.
-- answers: {"<exercise_id>": {"answer": {...}, "is_correct": true|false|null, "points": 0.25|null}}
create table if not exists public.assignment_retries (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null,
  student_id     uuid not null,
  attempt_no     int not null check (attempt_no between 1 and 3),
  answers        jsonb not null default '{}'::jsonb,
  correct        int not null default 0,              -- số câu máy chấm đúng
  auto_total     int not null default 0,              -- số câu máy chấm được trong bài
  points         numeric(5, 2) not null default 0,    -- tổng điểm thang THPT (đề thi)
  max_points     numeric(5, 2) not null default 0,    -- điểm tối đa thang THPT của bài
  submitted_at   timestamptz not null default now(),
  unique (assignment_id, student_id, attempt_no),
  foreign key (assignment_id, student_id)
    references public.assignment_recipients (assignment_id, student_id) on delete cascade
);

alter table public.assignment_retries enable row level security;

drop policy if exists assignment_retries_tutor_all  on public.assignment_retries;
drop policy if exists assignment_retries_own_select on public.assignment_retries;

create policy assignment_retries_tutor_all on public.assignment_retries
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

-- Học sinh chỉ đọc lần làm lại của mình; ghi thì qua submit_retry()
create policy assignment_retries_own_select on public.assignment_retries
  for select to authenticated
  using (student_id = auth.uid());

create or replace function public.submit_retry(p_assignment_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_no int;
  v_answers jsonb;
  v_row assignment_retries;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập để nộp bài';
  end if;
  -- Khóa dòng giao bài để hai lần bấm nộp cùng lúc không vượt quá 3 lần
  select status into v_status
    from assignment_recipients
   where assignment_id = p_assignment_id and student_id = v_uid
   for update;
  if not found then
    raise exception 'Bài này không được giao cho bạn';
  end if;
  if v_status = 'todo' then
    raise exception 'Hãy nộp bài lần đầu trước khi làm lại';
  end if;
  select count(*) + 1 into v_no
    from assignment_retries
   where assignment_id = p_assignment_id and student_id = v_uid;
  if v_no > 3 then
    raise exception 'Bạn đã làm lại đủ 3 lần cho bài này';
  end if;

  select coalesce(jsonb_object_agg(e.id::text, jsonb_build_object(
           'answer', a.value,
           'is_correct', public.grade_answer(e.kind, k.correct, a.value),
           'points', public.answer_points(e.kind, k.correct, a.value))), '{}'::jsonb)
    into v_answers
    from exercises e
    join jsonb_each(coalesce(p_answers, '{}'::jsonb)) as a on a.key = e.id::text
    left join answer_keys k on k.exercise_id = e.id
   where e.assignment_id = p_assignment_id
     and jsonb_typeof(a.value) = 'object';

  insert into assignment_retries (assignment_id, student_id, attempt_no, answers, correct, auto_total, points, max_points)
  select p_assignment_id, v_uid, v_no, v_answers,
         (select count(*) from jsonb_each(v_answers) x where x.value ->> 'is_correct' = 'true'),
         (select count(*) from exercises e
           where e.assignment_id = p_assignment_id and e.kind in ('mcq', 'fill_blank', 'true_false', 'short')),
         (select coalesce(sum((x.value ->> 'points')::numeric), 0) from jsonb_each(v_answers) x
           where jsonb_typeof(x.value -> 'points') = 'number'),
         (select coalesce(sum(case when e.kind in ('mcq', 'short') then 0.25 when e.kind = 'true_false' then 1 else 0 end), 0)
            from exercises e where e.assignment_id = p_assignment_id)
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.submit_retry(uuid, jsonb) from public;
grant execute on function public.submit_retry(uuid, jsonb) to authenticated;


-- =====================================================================
-- 7. STORAGE (bucket riêng tư + policy)
-- lesson-files: <thư mục ngẫu nhiên>/<tên file>   – gia sư tải lên
-- submissions : <student_id>/<assignment_id>/<ảnh> – học sinh tải lên
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('lesson-files', 'lesson-files', false, 52428800, null),          -- tối đa 50MB
  ('submissions',  'submissions',  false, 15728640,                 -- tối đa 15MB/ảnh
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

drop policy if exists lesson_files_tutor_all      on storage.objects;
drop policy if exists lesson_files_student_read   on storage.objects;
drop policy if exists submissions_tutor_all       on storage.objects;
drop policy if exists submissions_student_read    on storage.objects;
drop policy if exists submissions_student_insert  on storage.objects;

create policy lesson_files_tutor_all on storage.objects
  for all to authenticated
  using (bucket_id = 'lesson-files' and public.is_tutor())
  with check (bucket_id = 'lesson-files' and public.is_tutor());

-- Học sinh chỉ tải được file của bài giảng giao cho mình
create policy lesson_files_student_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lesson-files'
    and exists (
      select 1
      from public.lessons l
      join public.lesson_recipients lr on lr.lesson_id = l.id
      where l.file_path = storage.objects.name
        and lr.student_id = auth.uid()
    )
  );

create policy submissions_tutor_all on storage.objects
  for all to authenticated
  using (bucket_id = 'submissions' and public.is_tutor())
  with check (bucket_id = 'submissions' and public.is_tutor());

-- Học sinh chỉ xem ảnh trong thư mục của chính mình
create policy submissions_student_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Học sinh chỉ tải ảnh lên thư mục của mình, cho bài được giao và CHƯA nộp
create policy submissions_student_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.assignment_recipients ar
      where ar.student_id = auth.uid()
        and ar.assignment_id::text = (storage.foldername(name))[2]
        and ar.status = 'todo'
    )
  );

-- Báo API (PostgREST) đọc lại cấu trúc bảng ngay, tránh lỗi "schema cache" sau khi nâng cấp
notify pgrst, 'reload schema';

-- Hết. Bước tiếp theo: gán role 'tutor' cho tài khoản của bạn (xem README).

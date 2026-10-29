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

-- ---------- Lời phê từng câu ("Giáo viên chấm:") ----------
-- Gia sư ghi khi chấm; học sinh chỉ đọc (cả lúc gia sư "Cho nộp lại" để biết sửa chỗ nào).
-- Tách khỏi submission_answers vì nộp lại sẽ xóa/ghi lại câu trả lời, và câu bỏ trống vẫn phê được.
create table if not exists public.answer_comments (
  assignment_id  uuid not null,
  student_id     uuid not null,
  exercise_id    uuid not null references public.exercises (id) on delete cascade,
  note           text not null,
  updated_at     timestamptz not null default now(),
  primary key (exercise_id, student_id),
  foreign key (assignment_id, student_id)
    references public.assignment_recipients (assignment_id, student_id) on delete cascade
);

create index if not exists answer_comments_rec_idx on public.answer_comments (assignment_id, student_id);

alter table public.answer_comments enable row level security;

drop policy if exists answer_comments_tutor_all  on public.answer_comments;
drop policy if exists answer_comments_own_select on public.answer_comments;

create policy answer_comments_tutor_all on public.answer_comments
  for all to authenticated
  using (public.is_tutor()) with check (public.is_tutor());

create policy answer_comments_own_select on public.answer_comments
  for select to authenticated
  using (student_id = auth.uid());


-- ---------- Kinh tế: Xu 🪙 · Sao ⭐ · Chuỗi 🔥 · Ôn tập mỗi ngày ----------
-- Xu: tiêu được (mua trang phục, khiên chuỗi). Sao: tiến trình, chỉ tăng, không bao giờ trừ.
-- Sổ cái economy_ledger là nguồn sự thật: mỗi dòng có reward_key DUY NHẤT → bấm nhiều lần / tải lại /
-- hai yêu cầu cùng lúc cũng chỉ ghi được một lần. economy_wallets chỉ là số dư cộng dồn (cập nhật cùng transaction).
-- Học sinh chỉ ĐỌC các bảng này; mọi thay đổi đi qua hàm security definer bên dưới (máy chủ tự chấm, tự tính ngày).
-- Ngày chuỗi / Ôn tập theo giờ Việt Nam (Asia/Ho_Chi_Minh), không dùng giờ máy học sinh.

-- Cấu hình: số mặc định nằm trong econ_cfg(). Owner đổi số bằng cách ghi đè khoá cấp 1 vào economy_settings.overrides
-- (chạy lại file này không xoá phần ghi đè), vd.:
--   update public.economy_settings set overrides = overrides || '{"daily_coins": 15}' where id = 1;
--   update public.economy_settings set overrides = overrides || '{"shield": {"price": 40, "max_held": 2, "cooldown_days": 7}}' where id = 1;
create table if not exists public.economy_settings (
  id          int primary key default 1 check (id = 1),
  overrides   jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.economy_settings (id) values (1) on conflict (id) do nothing;

-- Ví: số dư hiện tại (khớp tổng sổ cái). Không âm.
create table if not exists public.economy_wallets (
  student_id       uuid primary key references public.profiles (id) on delete cascade,
  coins            int not null default 0 check (coins >= 0),
  stars            int not null default 0 check (stars >= 0),
  shields          int not null default 0 check (shields >= 0),
  equipped_outfit  text not null default 'student',
  rewards_seen_id  bigint not null default 0,   -- dòng sổ cái cuối cùng đã báo cho học sinh (gấu nói "+10 Xu")
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Sổ cái. resource: coin | star | shield. amount âm = tiêu (Sao không bao giờ âm).
-- source: starting (Xu khởi đầu), daily, official_score, progress_milestone, streak_milestone,
--         outfit_purchase, shield_purchase, shield_use, flight_coin (Xu nhặt khi Bay tự do), tutor_reward (sau này)
-- reward_key ví dụ: daily:<hs>:<ngày> · score:<hs>:<bài>:<lần nộp>:<mốc điểm>:coin · ms:streak:<hs>:30:star
--                   outfit:<hs>:<bộ> · shield_buy:<hs>:<mã yêu cầu>:coin · shield_use:<hs>:<ngày>
create table if not exists public.economy_ledger (
  id          bigserial primary key,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  resource    text not null check (resource in ('coin', 'star', 'shield')),
  amount      int not null check (amount <> 0),
  source      text not null,
  reward_key  text not null unique,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  check (resource <> 'star' or amount > 0)
);
create index if not exists economy_ledger_student_idx on public.economy_ledger (student_id, id);

-- Mốc thành tích trọn đời (mỗi mốc nhận đúng 1 lần, chuỗi đứt rồi đạt lại cũng không nhận lại).
-- kind: progress (số bài chính thức đã hoàn thành) | streak (số ngày chuỗi). badge: vd. "Đồng hành 1 năm".
create table if not exists public.student_achievements (
  student_id   uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('progress', 'streak')),
  milestone    int not null,
  badge        text,
  achieved_at  timestamptz not null default now(),
  primary key (student_id, kind, milestone)
);

-- Chuỗi ngày Ôn tập. settled_through: các ngày ≤ ngày này đã xét xong (đứt / dùng khiên / hoàn thành).
-- miss_run: số ngày bỏ liên tiếp tính tới settled_through (0 sau một ngày hoàn thành).
create table if not exists public.student_streaks (
  student_id           uuid primary key references public.profiles (id) on delete cascade,
  current_streak       int not null default 0,
  longest_streak       int not null default 0,
  last_completed_date  date,
  settled_through      date,
  miss_run             int not null default 0,
  last_shield_date     date,   -- ngày gần nhất khiên tự đỡ chuỗi
  updated_at           timestamptz not null default now()
);

-- Trang phục đã mua (bộ mặc định không cần dòng: ai cũng có)
create table if not exists public.panda_owned_outfits (
  student_id   uuid not null references public.profiles (id) on delete cascade,
  outfit_id    text not null,
  price_paid   int not null default 0,
  acquired_at  timestamptz not null default now(),
  primary key (student_id, outfit_id)
);

-- Ôn tập mỗi ngày: bộ câu cố định theo học sinh + ngày (tải lại / đổi máy không đổi câu)
create table if not exists public.daily_reviews (
  student_id    uuid not null references public.profiles (id) on delete cascade,
  review_date   date not null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  primary key (student_id, review_date)
);

create table if not exists public.daily_review_items (
  student_id   uuid not null,
  review_date  date not null,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  position     int not null,
  tries        int not null default 0,
  wrong        int not null default 0,
  solved_at    timestamptz,
  last_answer  jsonb,          -- câu trả lời đúng lần đầu (hiện lại khi mở trang)
  primary key (student_id, review_date, exercise_id),
  foreign key (student_id, review_date) references public.daily_reviews (student_id, review_date) on delete cascade
);
create index if not exists daily_review_items_ex_idx on public.daily_review_items (student_id, exercise_id);

-- Lần nộp chính thức: tăng 1 mỗi lần bài chuyển từ "chưa nộp" sang đã nộp / đã chấm
-- (học sinh nộp, gia sư "Cho nộp lại" rồi học sinh nộp lần nữa, hoặc gia sư chấm bài làm trên giấy).
-- Làm lại luyện tập (assignment_retries) và Ôn tập câu sai KHÔNG phải lần nộp chính thức.
alter table public.assignment_recipients add column if not exists attempt_no int not null default 0;
-- Bài đã nộp trước bản nâng cấp: coi là lần nộp chính thức thứ 1 (chạy trước khi tạo trigger, chạy lại không đổi gì)
update public.assignment_recipients set attempt_no = 1 where status in ('done', 'checked') and attempt_no = 0;

alter table public.economy_settings     enable row level security;
alter table public.economy_wallets      enable row level security;
alter table public.economy_ledger       enable row level security;
alter table public.student_achievements enable row level security;
alter table public.student_streaks      enable row level security;
alter table public.panda_owned_outfits  enable row level security;
alter table public.daily_reviews        enable row level security;
alter table public.daily_review_items   enable row level security;

-- Chỉ có policy SELECT: không ai (kể cả gia sư) ghi trực tiếp từ app; ghi qua hàm bên dưới.
drop policy if exists economy_settings_tutor_select on public.economy_settings;
create policy economy_settings_tutor_select on public.economy_settings
  for select to authenticated using (public.is_tutor());

drop policy if exists economy_wallets_select on public.economy_wallets;
create policy economy_wallets_select on public.economy_wallets
  for select to authenticated using (student_id = auth.uid() or public.is_tutor());

drop policy if exists economy_ledger_select on public.economy_ledger;
create policy economy_ledger_select on public.economy_ledger
  for select to authenticated using (student_id = auth.uid() or public.is_tutor());

drop policy if exists student_achievements_select on public.student_achievements;
create policy student_achievements_select on public.student_achievements
  for select to authenticated using (student_id = auth.uid() or public.is_tutor());

drop policy if exists student_streaks_select on public.student_streaks;
create policy student_streaks_select on public.student_streaks
  for select to authenticated using (student_id = auth.uid() or public.is_tutor());

drop policy if exists panda_owned_outfits_select on public.panda_owned_outfits;
create policy panda_owned_outfits_select on public.panda_owned_outfits
  for select to authenticated using (student_id = auth.uid() or public.is_tutor());

drop policy if exists daily_reviews_select on public.daily_reviews;
create policy daily_reviews_select on public.daily_reviews
  for select to authenticated using (student_id = auth.uid() or public.is_tutor());

drop policy if exists daily_review_items_select on public.daily_review_items;
create policy daily_review_items_select on public.daily_review_items
  for select to authenticated using (student_id = auth.uid() or public.is_tutor());

-- Số mặc định (một chỗ duy nhất). Thưởng mốc là đề xuất ban đầu — Owner đổi qua economy_settings.overrides.
-- score_tiers: tổng thưởng của một lần nộp chính thức theo điểm (thang 10): ≥8: 5 Xu · ≥9: 20 Xu + 1 Sao · 10: 30 Xu + 2 Sao; lên mốc được bù phần chênh.
-- outfit_prices: giá trang phục phía máy chủ (khớp lib/outfits.js để hiển thị; mua luôn theo giá ở đây).
create or replace function public.econ_cfg()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'timezone', 'Asia/Ho_Chi_Minh',
    'starting_coins', 300,
    'daily_coins', 10,
    'daily_size', 5,
    'daily_recent_window', 3,
    'daily_kinds', '["mcq"]'::jsonb,
    'score_tiers', '[{"min": 8, "coins": 5, "stars": 0}, {"min": 9, "coins": 20, "stars": 1}, {"min": 10, "coins": 30, "stars": 2}]'::jsonb,
    'shield', '{"price": 30, "max_held": 2, "cooldown_days": 7}'::jsonb,
    'progress_milestones', '[
      {"at": 5, "stars": 1}, {"at": 10, "stars": 2}, {"at": 20, "stars": 3}, {"at": 50, "stars": 5},
      {"at": 100, "stars": 8}, {"at": 150, "stars": 10}, {"at": 200, "stars": 12}, {"at": 300, "stars": 15},
      {"at": 500, "stars": 25}]'::jsonb,
    'streak_milestones', '[
      {"at": 7, "coins": 20, "stars": 1}, {"at": 30, "coins": 50, "stars": 2}, {"at": 50, "coins": 80, "stars": 3},
      {"at": 100, "coins": 150, "stars": 5}, {"at": 150, "coins": 200, "stars": 6}, {"at": 200, "coins": 250, "stars": 8},
      {"at": 250, "coins": 300, "stars": 10}, {"at": 365, "coins": 500, "stars": 15, "badge": "Đồng hành 1 năm"},
      {"at": 500, "coins": 600, "stars": 18}, {"at": 730, "coins": 1000, "stars": 25, "badge": "Đồng hành 2 năm"},
      {"at": 1000, "coins": 1500, "stars": 30}]'::jsonb,
    'default_outfit', 'student',
    'outfit_prices', '{"student": 0, "sport": 150, "sleep": 200, "artist": 250, "explorer": 400, "scientist": 450,
      "dj": 650, "swordsman": 800, "wizard": 1000, "astronaut": 1500, "galaxy": 2000}'::jsonb
  ) || coalesce((select overrides from economy_settings where id = 1), '{}'::jsonb);
$$;

-- Hôm nay theo giờ Việt Nam
create or replace function public.econ_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

-- Câu máy chấm được (đưa vào Ôn tập mỗi ngày): có đáp án máy chấm đúng dạng
create or replace function public.econ_gradable(p_kind text, p_correct jsonb)
returns boolean
language sql
immutable
as $$
  select p_correct is not null
     and (p_kind in ('mcq', 'short') or (p_kind in ('true_false', 'fill_blank') and jsonb_typeof(p_correct) = 'object'));
$$;

-- Loại câu được đưa vào Ôn tập mỗi ngày (cấu hình daily_kinds, mặc định chỉ 'mcq')
create or replace function public.econ_daily_kind(p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_kind in (select jsonb_array_elements_text(coalesce(econ_cfg() -> 'daily_kinds', '["mcq"]'::jsonb)));
$$;

-- Ghi một dòng sổ cái + cập nhật ví. Trùng reward_key → bỏ qua, trả false (chống thưởng trùng).
-- Ví phải có sẵn (econ_lock / econ_ensure_wallet). Tiêu quá số dư → lỗi do ràng buộc coins >= 0.
create or replace function public.econ_grant(p_uid uuid, p_resource text, p_amount int, p_source text,
                                             p_key text, p_meta jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if coalesce(p_amount, 0) = 0 then
    return false;
  end if;
  insert into economy_ledger (student_id, resource, amount, source, reward_key, meta)
  values (p_uid, p_resource, p_amount, p_source, p_key, coalesce(p_meta, '{}'::jsonb))
  on conflict (reward_key) do nothing
  returning id into v_id;
  if v_id is null then
    return false;
  end if;
  update economy_wallets
     set coins   = coins   + case when p_resource = 'coin'   then p_amount else 0 end,
         stars   = stars   + case when p_resource = 'star'   then p_amount else 0 end,
         shields = shields + case when p_resource = 'shield' then p_amount else 0 end,
         updated_at = now()
   where student_id = p_uid;
  if not found then
    raise exception 'Chưa có ví Xu cho học sinh này';
  end if;
  return true;
end;
$$;

-- Tạo ví lần đầu (kèm Xu khởi đầu, một lần trọn đời). Chỉ học sinh có ví; gia sư xem / mặc mọi bộ không cần Xu.
create or replace function public.econ_ensure_wallet(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if not exists (select 1 from profiles where id = p_uid and role = 'student') then
    raise exception 'Chỉ học sinh mới có ví Xu';
  end if;
  insert into economy_wallets (student_id) values (p_uid) on conflict (student_id) do nothing;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform econ_grant(p_uid, 'coin', (econ_cfg() ->> 'starting_coins')::int, 'starting', 'start:' || p_uid);
  end if;
end;
$$;

-- Khoá ví của học sinh (tạo nếu chưa có). Mọi hàm đổi số dư / chuỗi gọi hàm này TRƯỚC TIÊN
-- → các yêu cầu cùng một học sinh chạy lần lượt, không giẫm lên nhau (và không khoá chéo).
create or replace function public.econ_lock(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform econ_ensure_wallet(p_uid);
  perform 1 from economy_wallets where student_id = p_uid for update;
end;
$$;

-- Điểm chính thức (thang 10) của bài: điểm gia sư chấm → điểm máy khi cả bài chấm máy → null (chờ chấm).
-- Giống pointScore() ở lib/scoreChart.js. Lúc "done" bỏ qua cột score (có thể là điểm của lần nộp trước khi được mở lại).
create or replace function public.econ_official_score(p_aid uuid, p_sid uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_score numeric;
  v_exam boolean;
  v_total int;
  v_auto int;
  v_max numeric;
  v_got numeric;
  v_correct int;
begin
  select status, score into v_status, v_score
    from assignment_recipients where assignment_id = p_aid and student_id = p_sid;
  if v_status is null or v_status not in ('done', 'checked') then
    return null;
  end if;
  if v_status = 'checked' and v_score is not null then
    return v_score;
  end if;
  select is_exam into v_exam from assignments where id = p_aid;
  select count(*),
         count(*) filter (where kind in ('mcq', 'fill_blank', 'true_false', 'short')),
         coalesce(sum(case when kind in ('mcq', 'short') then 0.25 when kind = 'true_false' then 1 else 0 end), 0)
    into v_total, v_auto, v_max
    from exercises where assignment_id = p_aid;
  if v_total = 0 or v_auto < v_total then
    return null;   -- có câu tự luận: chờ gia sư chấm
  end if;
  if v_exam then
    if v_max = 0 then
      return null;
    end if;
    select coalesce(sum(sa.points), 0) into v_got
      from submission_answers sa join exercises e on e.id = sa.exercise_id
     where sa.assignment_id = p_aid and sa.student_id = p_sid and e.kind in ('mcq', 'short', 'true_false');
    return round(v_got / v_max * 10, 2);
  end if;
  select count(*) into v_correct
    from submission_answers where assignment_id = p_aid and student_id = p_sid and is_correct = true;
  return round(v_correct::numeric / v_auto * 10, 2);
end;
$$;

-- Nhận một mốc trọn đời (lần đầu chạm mốc) + thưởng theo cấu hình của mốc
create or replace function public.econ_claim_milestone(p_uid uuid, p_kind text, p_ms jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at int := (p_ms ->> 'at')::int;
  v_n int;
  v_key text := 'ms:' || p_kind || ':' || p_uid || ':' || (p_ms ->> 'at');
  v_meta jsonb := jsonb_build_object('kind', p_kind, 'milestone', v_at, 'badge', p_ms ->> 'badge');
begin
  insert into student_achievements (student_id, kind, milestone, badge)
  values (p_uid, p_kind, v_at, p_ms ->> 'badge')
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return;
  end if;
  perform econ_grant(p_uid, 'coin', greatest(coalesce((p_ms ->> 'coins')::int, 0), 0), p_kind || '_milestone', v_key || ':coin', v_meta);
  perform econ_grant(p_uid, 'star', greatest(coalesce((p_ms ->> 'stars')::int, 0), 0), p_kind || '_milestone', v_key || ':star', v_meta);
end;
$$;

-- Mốc số bài chính thức đã hoàn thành (đếm bài, không đếm lần làm lại / bài giảng / số lần mở bài)
create or replace function public.econ_check_progress(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  m jsonb;
begin
  select count(*) into v_n
    from assignment_recipients
   where student_id = p_uid and status in ('done', 'checked') and attempt_no >= 1;
  for m in select value from jsonb_array_elements(econ_cfg() -> 'progress_milestones') loop
    if v_n >= (m ->> 'at')::int then
      perform econ_claim_milestone(p_uid, 'progress', m);
    end if;
  end loop;
end;
$$;

-- Xét thưởng một lần nộp chính thức: điểm cao (theo từng mốc điểm, key theo lần nộp) + mốc số bài.
-- Gọi lại bao nhiêu lần cũng được (gia sư sửa điểm 9 → 10 thì chỉ được bù phần chênh; hạ điểm không trừ lại).
create or replace function public.econ_eval_official(p_aid uuid, p_sid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no int;
  v_score numeric;
  t jsonb;
  v_c int;
  v_s int;
  v_prev_c int := 0;
  v_prev_s int := 0;
  v_key text;
  v_tier text;
  v_meta jsonb;
begin
  if not exists (select 1 from profiles where id = p_sid and role = 'student') then
    return;
  end if;
  select attempt_no into v_no
    from assignment_recipients
   where assignment_id = p_aid and student_id = p_sid and status in ('done', 'checked');
  if coalesce(v_no, 0) < 1 then
    return;
  end if;
  perform econ_ensure_wallet(p_sid);
  v_score := econ_official_score(p_aid, p_sid);
  if v_score is not null then
    v_meta := jsonb_build_object('assignment_id', p_aid, 'attempt', v_no, 'score', v_score);
    -- Mốc cao nhất đạt được (thưởng mỗi mốc là TỔNG của lần nộp, không cộng dồn các mốc)
    for t in select value from jsonb_array_elements(econ_cfg() -> 'score_tiers') order by (value ->> 'min')::numeric loop
      exit when v_score < (t ->> 'min')::numeric;
      v_c := coalesce((t ->> 'coins')::int, 0);
      v_s := coalesce((t ->> 'stars')::int, 0);
      v_tier := t ->> 'min';
    end loop;
    if v_tier is not null then
      -- Chỉ cấp phần còn thiếu so với đã nhận cho lần nộp này (sửa điểm 8 → 9 → 10 thì bù dần; thêm mốc mới không cộng trùng)
      v_key := 'score:' || p_sid || ':' || p_aid || ':' || v_no || ':';
      select coalesce(sum(amount) filter (where resource = 'coin'), 0), coalesce(sum(amount) filter (where resource = 'star'), 0)
        into v_prev_c, v_prev_s
        from economy_ledger
       where student_id = p_sid and source = 'official_score' and left(reward_key, length(v_key)) = v_key;
      v_key := v_key || v_tier;
      perform econ_grant(p_sid, 'coin', greatest(v_c - v_prev_c, 0), 'official_score', v_key || ':coin', v_meta);
      perform econ_grant(p_sid, 'star', greatest(v_s - v_prev_s, 0), 'official_score', v_key || ':star', v_meta);
    end if;
  end if;
  perform econ_check_progress(p_sid);
end;
$$;

-- Ngày đầu tiên học sinh có câu cho Ôn tập mỗi ngày (bài đã nộp có câu máy chấm). Trước ngày này
-- (pool = 0) không có Ôn tập → không tính là bỏ chuỗi.
create or replace function public.econ_daily_pool_from(p_uid uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select min((coalesce(ar.submitted_at, ar.assigned_at) at time zone 'Asia/Ho_Chi_Minh')::date)
    from assignment_recipients ar
   where ar.student_id = p_uid
     and ar.status in ('done', 'checked')
     and exists (select 1 from exercises e join answer_keys k on k.exercise_id = e.id
                  where e.assignment_id = ar.assignment_id and public.econ_daily_kind(e.kind) and public.econ_gradable(e.kind, k.correct));
$$;

-- Xét các ngày đã qua (tới hôm qua) chưa xét, từng ngày một, đúng như thể xét mỗi đêm:
--   ngày không có Ôn tập (pool = 0) → bỏ qua, không phạt;
--   ngày có Ôn tập mà không hoàn thành → nếu ngày trước đó không bỏ, còn khiên, và đã ≥ cooldown_days từ lần dùng khiên trước
--   thì tự dùng 1 khiên (chuỗi giữ nguyên, KHÔNG tăng, không thưởng); ngược lại chuỗi về 0.
--   → bỏ 2 ngày liên tiếp luôn đứt chuỗi (khiên chỉ đỡ một ngày lẻ).
-- Gọi sau econ_lock().
create or replace function public.econ_settle_streak(p_uid uuid, p_today date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s student_streaks;
  d date;
  v_from date;
  v_shields int;
  v_cd int := coalesce((econ_cfg() -> 'shield' ->> 'cooldown_days')::int, 7);
begin
  insert into student_streaks (student_id) values (p_uid) on conflict (student_id) do nothing;
  select * into s from student_streaks where student_id = p_uid for update;
  if s.settled_through is null or s.settled_through >= p_today - 1 then
    return;
  end if;
  if s.current_streak > 0 then
    v_from := econ_daily_pool_from(p_uid);
    d := s.settled_through + 1;
    while d < p_today and s.current_streak > 0 loop
      if v_from is not null and d >= v_from then
        select shields into v_shields from economy_wallets where student_id = p_uid;
        if s.miss_run = 0 and coalesce(v_shields, 0) > 0
           and (s.last_shield_date is null or d - s.last_shield_date >= v_cd) then
          perform econ_grant(p_uid, 'shield', -1, 'shield_use', 'shield_use:' || p_uid || ':' || d,
                             jsonb_build_object('date', d, 'streak', s.current_streak));
          s.last_shield_date := d;
          s.miss_run := 1;
        else
          s.current_streak := 0;
          s.miss_run := s.miss_run + 1;
        end if;
      end if;
      d := d + 1;
    end loop;
  end if;
  update student_streaks
     set current_streak = s.current_streak, miss_run = s.miss_run, last_shield_date = s.last_shield_date,
         settled_through = p_today - 1, updated_at = now()
   where student_id = p_uid;
end;
$$;

-- Hoàn thành Ôn tập ngày p_day: chuỗi +1 (một lần mỗi ngày) + xét mốc chuỗi. Gọi sau econ_lock().
create or replace function public.econ_complete_day(p_uid uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s student_streaks;
  m jsonb;
begin
  perform econ_settle_streak(p_uid, p_day);
  select * into s from student_streaks where student_id = p_uid for update;
  if s.last_completed_date >= p_day then
    return;
  end if;
  s.current_streak := s.current_streak + 1;
  update student_streaks
     set current_streak = s.current_streak,
         longest_streak = greatest(longest_streak, s.current_streak),
         last_completed_date = p_day, settled_through = p_day, miss_run = 0, updated_at = now()
   where student_id = p_uid;
  for m in select value from jsonb_array_elements(econ_cfg() -> 'streak_milestones') loop
    if s.current_streak >= (m ->> 'at')::int then
      perform econ_claim_milestone(p_uid, 'streak', m);
    end if;
  end loop;
end;
$$;

-- Trigger: đếm lần nộp chính thức (todo → done/checked = lần mới)
create or replace function public.econ_attempt_no()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('done', 'checked') then
    if tg_op = 'INSERT' then
      new.attempt_no := greatest(coalesce(new.attempt_no, 0), 1);
    elsif old.status = 'todo' then
      new.attempt_no := coalesce(old.attempt_no, 0) + 1;
    elsif coalesce(new.attempt_no, 0) < 1 then
      new.attempt_no := 1;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists econ_attempt_no on public.assignment_recipients;
create trigger econ_attempt_no
  before insert or update on public.assignment_recipients
  for each row execute function public.econ_attempt_no();

-- Trigger: nộp bài / gia sư chấm / sửa điểm → xét thưởng. Lỗi tính thưởng không được làm hỏng việc nộp / chấm.
create or replace function public.econ_on_recipient_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('done', 'checked')
     and (tg_op = 'INSERT' or new.status is distinct from old.status or new.score is distinct from old.score
          or new.attempt_no is distinct from old.attempt_no) then
    begin
      perform econ_eval_official(new.assignment_id, new.student_id);
    exception when others then
      raise warning 'Không tính được thưởng Xu/Sao: %', sqlerrm;
    end;
  end if;
  return null;
end;
$$;

drop trigger if exists econ_on_recipient_change on public.assignment_recipients;
create trigger econ_on_recipient_change
  after insert or update on public.assignment_recipients
  for each row execute function public.econ_on_recipient_change();

-- Học sinh đang đăng nhập (chặn gia sư / khách ở các hàm dành cho học sinh)
create or replace function public.econ_student()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'Chức năng này dành cho học sinh';
  end if;
  return v_uid;
end;
$$;

-- Tài khoản Xu/Sao/Chuỗi cho app (HUD, cửa hàng). Gia sư: chỉ trả bảng giá (toàn quyền xem/mặc ở app, không có ví).
-- unseen: các khoản thưởng chưa báo cho học sinh (app cho gấu nói rồi gọi mark_rewards_seen).
create or replace function public.get_economy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb := econ_cfg();
  v_today date := econ_today();
  w economy_wallets;
  s student_streaks;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập';
  end if;
  if public.is_tutor() then
    return jsonb_build_object('role', 'tutor', 'prices', v_cfg -> 'outfit_prices', 'shield', v_cfg -> 'shield');
  end if;
  v_uid := econ_student();
  perform econ_lock(v_uid);
  perform econ_settle_streak(v_uid, v_today);
  select * into w from economy_wallets where student_id = v_uid;
  select * into s from student_streaks where student_id = v_uid;
  return jsonb_build_object(
    'role', 'student',
    'today', v_today,
    'coins', w.coins,
    'stars', w.stars,
    'shields', w.shields,
    'equipped_outfit', w.equipped_outfit,
    'owned', (select coalesce(jsonb_agg(outfit_id), '[]'::jsonb) from panda_owned_outfits where student_id = v_uid),
    'prices', v_cfg -> 'outfit_prices',
    'shield', v_cfg -> 'shield',
    'default_outfit', v_cfg ->> 'default_outfit',
    'daily_available', econ_daily_pool_from(v_uid) is not null,
    'streak', jsonb_build_object(
      'current', s.current_streak,
      'longest', s.longest_streak,
      'last_completed_date', s.last_completed_date,
      'done_today', coalesce(s.last_completed_date = v_today, false),
      'last_shield_date', s.last_shield_date,
      'shield_ready', s.last_shield_date is null
                      or v_today - s.last_shield_date >= coalesce((v_cfg -> 'shield' ->> 'cooldown_days')::int, 7)),
    'achievements', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'milestone', milestone, 'badge', badge,
                                                                  'achieved_at', achieved_at) order by achieved_at), '[]'::jsonb)
                       from student_achievements where student_id = v_uid),
    'unseen', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'resource', resource, 'amount', amount,
                                                            'source', source, 'meta', meta) order by id), '[]'::jsonb)
                 from economy_ledger
                where student_id = v_uid and id > w.rewards_seen_id
                  and (amount > 0 or source = 'shield_use') and source <> 'shield_purchase')
  );
end;
$$;

create or replace function public.mark_rewards_seen(p_upto bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := econ_student();
begin
  update economy_wallets
     set rewards_seen_id = greatest(rewards_seen_id,
           least(p_upto, (select coalesce(max(id), 0) from economy_ledger where student_id = v_uid)))
   where student_id = v_uid;
end;
$$;

-- Ôn tập mỗi ngày: lấy (hoặc tạo lần đầu trong ngày) bộ câu hôm nay.
-- Pool = câu máy chấm được, đúng loại daily_kinds (mặc định chỉ trắc nghiệm), trong các bài chính thức đã nộp
-- (đáp án học sinh đã được xem). Pool 0 → không có Ôn tập.
-- Chọn tối đa daily_size câu: tránh câu của daily_recent_window lần Ôn tập gần nhất (khi còn đủ câu khác),
-- ưu tiên câu từng sai → câu lâu chưa ra → ngẫu nhiên.
create or replace function public.get_daily_review()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := econ_student();
  v_cfg jsonb := econ_cfg();
  v_today date := econ_today();
  v_ids uuid[];
  v_done timestamptz;
begin
  perform econ_lock(v_uid);
  perform econ_settle_streak(v_uid, v_today);
  if not exists (select 1 from daily_reviews where student_id = v_uid and review_date = v_today) then
    select array_agg(x.id order by x.rn) into v_ids
      from (
        select p.id, row_number() over (order by p.recent, p.wrong desc, p.last_seen nulls first, random()) as rn
          from (
            select e.id,
                   exists (select 1 from daily_review_items i
                            where i.student_id = v_uid and i.exercise_id = e.id
                              and i.review_date in (select r.review_date from daily_reviews r
                                                     where r.student_id = v_uid and r.review_date < v_today
                                                     order by r.review_date desc
                                                     limit coalesce((v_cfg ->> 'daily_recent_window')::int, 3))) as recent,
                   (exists (select 1 from submission_answers sa
                             where sa.student_id = v_uid and sa.exercise_id = e.id and sa.is_correct is not true)
                    or exists (select 1 from daily_review_items i
                                where i.student_id = v_uid and i.exercise_id = e.id and i.wrong > 0)) as wrong,
                   (select max(i.review_date) from daily_review_items i
                     where i.student_id = v_uid and i.exercise_id = e.id) as last_seen
              from exercises e
              join assignment_recipients ar
                on ar.assignment_id = e.assignment_id and ar.student_id = v_uid and ar.status in ('done', 'checked')
              join answer_keys k on k.exercise_id = e.id
             where public.econ_daily_kind(e.kind) and public.econ_gradable(e.kind, k.correct)
          ) p
      ) x
     where x.rn <= coalesce((v_cfg ->> 'daily_size')::int, 5);
    if coalesce(cardinality(v_ids), 0) = 0 then
      return jsonb_build_object('date', v_today, 'pool', 0, 'items', '[]'::jsonb, 'completed', false);
    end if;
    insert into daily_reviews (student_id, review_date) values (v_uid, v_today);
    insert into daily_review_items (student_id, review_date, exercise_id, position)
    select v_uid, v_today, t.id, t.n from unnest(v_ids) with ordinality as t (id, n);
  end if;
  select completed_at into v_done from daily_reviews where student_id = v_uid and review_date = v_today;
  return jsonb_build_object(
    'date', v_today,
    'completed', v_done is not null,
    'coins', (v_cfg ->> 'daily_coins')::int,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'exercise_id', e.id, 'kind', e.kind, 'question_md', e.question_md, 'options', e.options,
                'assignment_id', a.id, 'assignment_title', a.title,
                'solved', i.solved_at is not null, 'tries', i.tries, 'answer', i.last_answer) order by i.position), '[]'::jsonb)
                from daily_review_items i
                join exercises e on e.id = i.exercise_id
                join assignments a on a.id = e.assignment_id
               where i.student_id = v_uid and i.review_date = v_today)
  );
end;
$$;

-- Trả lời một câu Ôn tập hôm nay (máy chủ chấm). Sai thì thử lại tới khi đúng.
-- Câu cuối cùng đúng → hoàn thành (một lần): +daily_coins Xu, chuỗi +1, xét mốc chuỗi. Không thưởng Sao.
-- Qua nửa đêm (giờ VN) mà còn gửi câu của hôm qua → expired (app tải bộ câu mới).
create or replace function public.answer_daily_review(p_exercise_id uuid, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := econ_student();
  v_today date := econ_today();
  v_done timestamptz;
  v_kind text;
  v_correct jsonb;
  v_ok boolean;
  v_just boolean := false;
begin
  if p_answer is null or jsonb_typeof(p_answer) <> 'object' then
    raise exception 'Câu trả lời không hợp lệ';
  end if;
  perform econ_lock(v_uid);
  select completed_at into v_done
    from daily_reviews where student_id = v_uid and review_date = v_today for update;
  if not found or not exists (select 1 from daily_review_items
                               where student_id = v_uid and review_date = v_today and exercise_id = p_exercise_id) then
    return jsonb_build_object('expired', true);
  end if;
  select e.kind, k.correct into v_kind, v_correct
    from exercises e left join answer_keys k on k.exercise_id = e.id
   where e.id = p_exercise_id;
  v_ok := coalesce(public.grade_answer(v_kind, v_correct, p_answer), false);
  update daily_review_items
     set tries = tries + 1,
         wrong = wrong + case when v_ok then 0 else 1 end,
         last_answer = case when v_ok and solved_at is null then p_answer else last_answer end,
         solved_at = case when v_ok then coalesce(solved_at, now()) else solved_at end
   where student_id = v_uid and review_date = v_today and exercise_id = p_exercise_id;
  if v_done is null and not exists (select 1 from daily_review_items
                                     where student_id = v_uid and review_date = v_today and solved_at is null) then
    update daily_reviews set completed_at = now() where student_id = v_uid and review_date = v_today;
    perform econ_grant(v_uid, 'coin', (econ_cfg() ->> 'daily_coins')::int, 'daily', 'daily:' || v_uid || ':' || v_today,
                       jsonb_build_object('date', v_today));
    perform econ_complete_day(v_uid, v_today);
    v_just := true;
  end if;
  return jsonb_build_object(
    'correct', v_ok,
    'completed', v_just or v_done is not null,
    'just_completed', v_just,
    'streak', (select current_streak from student_streaks where student_id = v_uid)
  );
end;
$$;

-- Mua khiên bảo vệ chuỗi. p_request_id: mã một lần bấm (gửi lại cùng mã = không mua thêm).
create or replace function public.buy_streak_shield(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := econ_student();
  v_cfg jsonb := econ_cfg();
  v_price int := (v_cfg -> 'shield' ->> 'price')::int;
  v_max int := (v_cfg -> 'shield' ->> 'max_held')::int;
  v_key text := 'shield_buy:' || v_uid || ':' || p_request_id;
  w economy_wallets;
begin
  if p_request_id is null then
    raise exception 'Thiếu mã giao dịch';
  end if;
  perform econ_lock(v_uid);
  -- Xét chuỗi trước: mua khiên sau khi đã bỏ ngày không cứu được ngày đó
  perform econ_settle_streak(v_uid, econ_today());
  select * into w from economy_wallets where student_id = v_uid;
  if exists (select 1 from economy_ledger where reward_key = v_key || ':shield') then
    return jsonb_build_object('coins', w.coins, 'shields', w.shields, 'repeated', true);
  end if;
  if w.shields >= v_max then
    raise exception 'Bạn đang giữ tối đa % khiên bảo vệ chuỗi', v_max;
  end if;
  if w.coins < v_price then
    raise exception 'Chưa đủ Xu: khiên giá % Xu, bạn có % Xu', v_price, w.coins;
  end if;
  perform econ_grant(v_uid, 'coin', -v_price, 'shield_purchase', v_key || ':coin', jsonb_build_object('price', v_price));
  perform econ_grant(v_uid, 'shield', 1, 'shield_purchase', v_key || ':shield', jsonb_build_object('price', v_price));
  select * into w from economy_wallets where student_id = v_uid;
  return jsonb_build_object('coins', w.coins, 'shields', w.shields, 'repeated', false);
end;
$$;

-- Mua trang phục: máy chủ quyết định giá (econ_cfg.outfit_prices), mỗi bộ chỉ mua được một lần.
create or replace function public.buy_outfit(p_outfit_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := econ_student();
  v_cfg jsonb := econ_cfg();
  v_price int := (v_cfg -> 'outfit_prices' ->> p_outfit_id)::int;
  w economy_wallets;
begin
  if v_price is null or v_price < 0 then
    raise exception 'Không có trang phục này trong cửa hàng';
  end if;
  perform econ_lock(v_uid);
  select * into w from economy_wallets where student_id = v_uid;
  if p_outfit_id = v_cfg ->> 'default_outfit'
     or exists (select 1 from panda_owned_outfits where student_id = v_uid and outfit_id = p_outfit_id) then
    return jsonb_build_object('coins', w.coins, 'already_owned', true);
  end if;
  if w.coins < v_price then
    raise exception 'Chưa đủ Xu: bộ này giá % Xu, bạn có % Xu', v_price, w.coins;
  end if;
  insert into panda_owned_outfits (student_id, outfit_id, price_paid) values (v_uid, p_outfit_id, v_price);
  perform econ_grant(v_uid, 'coin', -v_price, 'outfit_purchase', 'outfit:' || v_uid || ':' || p_outfit_id,
                     jsonb_build_object('outfit_id', p_outfit_id, 'price', v_price));
  select * into w from economy_wallets where student_id = v_uid;
  return jsonb_build_object('coins', w.coins, 'already_owned', false);
end;
$$;

-- Mặc trang phục đã sở hữu (học sinh). Gia sư mặc thử nhớ trên máy (lib/pandaShop.js).
create or replace function public.equip_outfit(p_outfit_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := econ_student();
begin
  if p_outfit_id is distinct from econ_cfg() ->> 'default_outfit'
     and not exists (select 1 from panda_owned_outfits where student_id = v_uid and outfit_id = p_outfit_id) then
    raise exception 'Bạn chưa sở hữu bộ này';
  end if;
  perform econ_lock(v_uid);
  update economy_wallets set equipped_outfit = p_outfit_id, updated_at = now() where student_id = v_uid;
end;
$$;

-- ---------- Xu nhặt khi Bay tự do (Kính thiên văn) ----------
-- Mỗi hệ sao rải (ngưỡng Sao × 5) đồng Xu, mỗi đồng 1 Xu, nhặt được MỘT lần trọn đời (reward_key theo từng đồng).
-- Đồng đã nhặt không hiện lại; đồng chưa nhặt còn đó cho lần bay sau. Ngưỡng Sao khớp PLACES trong src/lib/telescope.js:
-- đổi ngưỡng ở đó thì đổi ở đây. Máy chủ kiểm: là học sinh, đủ Sao mở hệ đó, số thứ tự đồng hợp lệ.
-- (Máy chủ không kiểm được đường bay của tàu: tối đa mỗi học sinh nhận đủ số Xu của các hệ đã mở, một lần.)
create or replace function public.flight_place(p_place text)
returns jsonb
language sql
immutable
as $$
  select case p_place
    when 'alpha-centauri' then '{"stars": 5, "coins": 25}'::jsonb
    when 'trappist-1'     then '{"stars": 12, "coins": 60}'::jsonb
    when 'kepler-90'      then '{"stars": 20, "coins": 100}'::jsonb
  end
$$;

-- Các đồng đã nhặt ở một hệ. Gia sư không có ví → total 0 (không hiện Xu).
create or replace function public.get_flight_coins(p_place text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb := flight_place(p_place);
  v_pre text;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập';
  end if;
  if v_cfg is null then
    raise exception 'Không có địa điểm bay này';
  end if;
  if public.is_tutor() then
    return jsonb_build_object('total', 0, 'collected', '[]'::jsonb);
  end if;
  v_uid := econ_student();
  v_pre := 'flight:' || v_uid || ':' || p_place || ':';
  return jsonb_build_object(
    'total', (v_cfg ->> 'coins')::int,
    'collected', (select coalesce(jsonb_agg(substr(reward_key, length(v_pre) + 1)::int order by id), '[]'::jsonb)
                    from economy_ledger
                   where student_id = v_uid and source = 'flight_coin' and left(reward_key, length(v_pre)) = v_pre)
  );
end;
$$;

-- Nhặt các đồng p_coins (số thứ tự 0..total-1) ở hệ p_place. Đồng đã nhặt → bỏ qua (không cộng lần 2).
-- Trả { coins: số dư, added: số Xu vừa cộng }.
create or replace function public.collect_flight_coins(p_place text, p_coins int[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := econ_student();
  v_cfg jsonb := flight_place(p_place);
  v_total int;
  v_added int := 0;
  v_i int;
  w economy_wallets;
begin
  if v_cfg is null then
    raise exception 'Không có địa điểm bay này';
  end if;
  v_total := (v_cfg ->> 'coins')::int;
  if p_coins is null or cardinality(p_coins) = 0 or cardinality(p_coins) > v_total then
    raise exception 'Danh sách Xu không hợp lệ';
  end if;
  perform econ_lock(v_uid);
  select * into w from economy_wallets where student_id = v_uid;
  if w.stars < (v_cfg ->> 'stars')::int then
    raise exception 'Chưa đủ Sao để bay ở hệ này';
  end if;
  foreach v_i in array (select array_agg(distinct x) from unnest(p_coins) x) loop
    if v_i is null or v_i < 0 or v_i >= v_total then
      raise exception 'Số thứ tự Xu không hợp lệ: %', v_i;
    end if;
    if econ_grant(v_uid, 'coin', 1, 'flight_coin', 'flight:' || v_uid || ':' || p_place || ':' || v_i,
                  jsonb_build_object('place', p_place, 'coin', v_i)) then
      v_added := v_added + 1;
    end if;
  end loop;
  select * into w from economy_wallets where student_id = v_uid;
  return jsonb_build_object('coins', w.coins, 'added', v_added);
end;
$$;

-- Hàm nội bộ: không ai gọi trực tiếp qua API (Supabase mặc định cấp EXECUTE cho anon/authenticated)
revoke all on function public.econ_grant(uuid, text, int, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.econ_ensure_wallet(uuid) from public, anon, authenticated;
revoke all on function public.econ_lock(uuid) from public, anon, authenticated;
revoke all on function public.econ_official_score(uuid, uuid) from public, anon, authenticated;
revoke all on function public.econ_claim_milestone(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.econ_check_progress(uuid) from public, anon, authenticated;
revoke all on function public.econ_eval_official(uuid, uuid) from public, anon, authenticated;
revoke all on function public.econ_daily_pool_from(uuid) from public, anon, authenticated;
revoke all on function public.econ_daily_kind(text) from public, anon, authenticated;
revoke all on function public.econ_settle_streak(uuid, date) from public, anon, authenticated;
revoke all on function public.econ_complete_day(uuid, date) from public, anon, authenticated;
revoke all on function public.econ_attempt_no() from public, anon, authenticated;
revoke all on function public.econ_on_recipient_change() from public, anon, authenticated;
revoke all on function public.econ_student() from public, anon, authenticated;
revoke all on function public.econ_cfg() from public, anon;
grant execute on function public.econ_cfg() to authenticated;

revoke all on function public.get_economy() from public, anon;
revoke all on function public.mark_rewards_seen(bigint) from public, anon;
revoke all on function public.get_daily_review() from public, anon;
revoke all on function public.answer_daily_review(uuid, jsonb) from public, anon;
revoke all on function public.buy_streak_shield(uuid) from public, anon;
revoke all on function public.buy_outfit(text) from public, anon;
revoke all on function public.equip_outfit(text) from public, anon;
revoke all on function public.get_flight_coins(text) from public, anon;
revoke all on function public.collect_flight_coins(text, int[]) from public, anon;
grant execute on function public.get_economy() to authenticated;
grant execute on function public.mark_rewards_seen(bigint) to authenticated;
grant execute on function public.get_daily_review() to authenticated;
grant execute on function public.answer_daily_review(uuid, jsonb) to authenticated;
grant execute on function public.buy_streak_shield(uuid) to authenticated;
grant execute on function public.buy_outfit(text) to authenticated;
grant execute on function public.equip_outfit(text) to authenticated;
grant execute on function public.get_flight_coins(text) to authenticated;
grant execute on function public.collect_flight_coins(text, int[]) to authenticated;

-- Dữ liệu cũ (chỉ phần kiểm chứng được, chạy lại không cộng trùng):
--   mọi học sinh có ví + Xu khởi đầu; thưởng điểm cao + mốc số bài theo lần nộp chính thức hiện tại của từng bài.
--   Không suy ra được: Ôn tập / chuỗi các ngày trước (chưa có dữ liệu) và các lần nộp đã bị "Cho nộp lại" ghi đè.
do $$
declare
  r record;
begin
  perform public.econ_ensure_wallet(p.id) from public.profiles p where p.role = 'student';
  for r in
    select ar.assignment_id, ar.student_id
      from public.assignment_recipients ar
      join public.profiles p on p.id = ar.student_id and p.role = 'student'
     where ar.status in ('done', 'checked')
  loop
    perform public.econ_eval_official(r.assignment_id, r.student_id);
  end loop;
end;
$$;

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

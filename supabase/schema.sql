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
alter table public.exercises drop constraint if exists exercises_kind_check;
alter table public.exercises add constraint exercises_kind_check check (kind in ('essay', 'mcq', 'fill_blank'));

-- correct: mcq → "B", fill_blank → {"a":"...","b":"..."}
alter table public.answer_keys add column if not exists correct jsonb;

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
create unique index if not exists chapters_title_key on public.chapters (lower(title));

alter table public.lessons     add column if not exists chapter_id uuid references public.chapters (id) on delete set null;
alter table public.assignments add column if not exists chapter_id uuid references public.chapters (id) on delete set null;
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
    insert into assignments (lesson_id, title, type, due_date, chapter_id)
    values (nullif(p ->> 'lesson_id', '')::uuid, trim(p ->> 'title'), p ->> 'type',
            nullif(p ->> 'due_date', '')::date, nullif(p ->> 'chapter_id', '')::uuid)
    returning id into v_id;
  else
    update assignments
       set lesson_id = nullif(p ->> 'lesson_id', '')::uuid,
           title = trim(p ->> 'title'),
           type = p ->> 'type',
           due_date = nullif(p ->> 'due_date', '')::date,
           chapter_id = nullif(p ->> 'chapter_id', '')::uuid
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
    if v_kind not in ('essay', 'mcq', 'fill_blank') then
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
    end if;

    -- Cập nhật câu cũ (nếu id thuộc bài này), không thì thêm câu mới
    update exercises
       set sort_order = v_i, kind = v_kind, question_md = v_ex ->> 'question_md',
           options = case when v_kind = 'essay' then null else v_ex -> 'options' end
     where id::text = coalesce(v_ex ->> 'id', '') and assignment_id = v_id
    returning id into v_ex_id;
    if v_ex_id is null then
      insert into exercises (assignment_id, sort_order, kind, question_md, options)
      values (v_id, v_i, v_kind, v_ex ->> 'question_md',
              case when v_kind = 'essay' then null else v_ex -> 'options' end)
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
     set is_correct = public.grade_answer(e.kind, k.correct, sa.answer)
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

-- Tìm chương theo tên (không phân biệt hoa thường), chưa có thì tạo. Dùng khi nhập JSON.
create or replace function public.ensure_chapter(p_title text, p_section text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_tutor() then
    raise exception 'Chỉ gia sư mới được tạo chương';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'Chương cần có tên';
  end if;
  select id into v_id from chapters where lower(title) = lower(trim(p_title));
  if v_id is null then
    insert into chapters (title, section, sort_order)
    values (trim(p_title), nullif(trim(p_section), ''),
            coalesce((select max(sort_order) + 1 from chapters), 0))
    on conflict ((lower(title))) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from chapters where lower(title) = lower(trim(p_title));
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.ensure_chapter(text, text) from public;
grant execute on function public.ensure_chapter(text, text) to authenticated;

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

-- mcq: đúng/sai. fill_blank: true nếu MỌI chỗ trống khớp, ngược lại null
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
  insert into submission_answers (assignment_id, student_id, exercise_id, answer, is_correct)
  select p_assignment_id, v_uid, e.id, a.value, public.grade_answer(e.kind, k.correct, a.value)
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

-- Hết. Bước tiếp theo: gán role 'tutor' cho tài khoản của bạn (xem README).

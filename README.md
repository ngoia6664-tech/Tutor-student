# Gia sư Vật lý: ứng dụng quản lý bài giảng và bài tập

Ứng dụng web cho 1 gia sư và 6 học sinh (nhóm A, B, C, D có 1 em; nhóm E có 2 em).
Bài giảng và bài tập được giao **theo từng học sinh**. Nhóm chỉ dùng để lọc và chọn nhanh.

- **Gia sư** (`/tutor`): quản lý học sinh, soạn bài giảng (Markdown + công thức, file, video), soạn bài tập (đề, đáp án, phương pháp giải), nhập nhanh bằng JSON, theo dõi bài nộp, xem ảnh, chấm điểm và nhận xét.
- **Học sinh** (`/student`): xem bài cần làm (hạn gần nhất lên đầu), làm bài ngay trong app (trắc nghiệm chọn phương án, điền khuyết gõ đáp án, tự luận gõ hoặc chụp ảnh) rồi nộp, xem đáp án và kết quả máy chấm **sau khi nộp**, xem điểm và nhận xét, xem bài giảng.
- Giao diện tông tím – hồng, mặc định tối, có nút ☀/☾ để chuyển sang giao diện sáng; lựa chọn được nhớ trên từng máy.

Công nghệ: React + Vite (JavaScript), React Router, Supabase (Auth, PostgreSQL, Storage), KaTeX, react-markdown.

---

## 1. Cây thư mục

```
.
├── .env.example              # mẫu biến môi trường (copy thành .env)
├── index.html
├── package.json
├── vercel.json               # cho Vercel trả index.html với mọi đường dẫn (SPA)
├── vite.config.js
├── public/
│   └── favicon.svg
├── supabase/
│   └── schema.sql            # bảng + RLS + trigger + hàm + Storage (chạy trong SQL Editor)
└── src/
    ├── main.jsx              # điểm vào; báo lỗi nếu thiếu .env
    ├── App.jsx               # khai báo route /login, /tutor/..., /student/...
    ├── index.css             # giao diện (responsive, ưu tiên điện thoại)
    ├── contexts/
    │   └── AuthContext.jsx   # phiên đăng nhập + hồ sơ (role)
    ├── lib/
    │   ├── supabase.js       # tạo client Supabase từ biến môi trường
    │   ├── useAsync.js       # hook tải dữ liệu (loading / error / reload)
    │   ├── errors.js         # đổi lỗi kỹ thuật sang tiếng Việt
    │   ├── format.js         # định dạng ngày, hạn nộp, nhãn
    │   ├── files.js          # tên file an toàn, nén ảnh chụp
    │   ├── importJson.js     # đọc và kiểm tra JSON, tự sửa dấu \ của LaTeX
    │   ├── students.js       # danh sách học sinh, nhóm
    │   ├── assignments.js    # tải và xóa bài tập (kèm ảnh nộp)
    │   ├── lessons.js        # tải lên, xóa và lấy link file bài giảng
    │   └── submissions.js    # lấy ảnh bài nộp (link tạm thời)
    ├── components/
    │   ├── Layout.jsx        # thanh trên + menu theo vai trò
    │   ├── ProtectedRoute.jsx# chặn trang theo vai trò
    │   ├── RootRedirect.jsx  # "/" → trang đúng vai trò
    │   ├── Loading.jsx, ErrorBox.jsx, ErrorBoundary.jsx
    │   ├── Markdown.jsx      # Markdown + KaTeX
    │   ├── MarkdownField.jsx # ô soạn có nút xem trước
    │   ├── StudentPicker.jsx # chọn học sinh nhận bài
    │   ├── LessonView.jsx, VideoEmbed.jsx, ImageGallery.jsx, Badges.jsx
    └── pages/
        ├── Login.jsx, NotFound.jsx, ConfigError.jsx
        ├── student/
        │   ├── StudentHome.jsx        # bài cần làm
        │   ├── StudentAssignment.jsx  # làm bài, nộp, xem đáp án, điểm
        │   ├── SubmitPanel.jsx        # ảnh (không bắt buộc) + Nộp bài
        │   ├── StudentResults.jsx     # điểm và nhận xét
        │   ├── StudentLessons.jsx     # danh sách bài giảng
        │   └── StudentLesson.jsx      # xem một bài giảng
        └── tutor/
            ├── TutorStudents.jsx      # danh sách học sinh, lọc nhóm, sửa hồ sơ
            ├── TutorAssignments.jsx   # danh sách bài tập + thống kê
            ├── AssignmentEditor.jsx   # soạn/sửa bài tập
            ├── AssignmentTracking.jsx # theo dõi, xem bài làm + ảnh, điểm máy chấm, chấm điểm
            ├── TutorLessons.jsx       # danh sách bài giảng
            ├── TutorLessonView.jsx    # xem bài giảng + ai đã nhận
            ├── LessonEditor.jsx       # soạn/sửa bài giảng
            └── ImportJson.jsx         # Dán JSON → xem trước → soạn
```

### Các route

| Đường dẫn | Ai dùng | Nội dung |
|---|---|---|
| `/login` | mọi người | Đăng nhập email + mật khẩu |
| `/tutor` | gia sư | Danh sách học sinh |
| `/tutor/assignments`, `/new`, `/:id`, `/:id/edit` | gia sư | Bài tập: danh sách, soạn, theo dõi/chấm, sửa |
| `/tutor/lessons`, `/new`, `/:id`, `/:id/edit` | gia sư | Bài giảng |
| `/tutor/import` | gia sư | Dán JSON |
| `/student` | học sinh | Bài cần làm |
| `/student/assignments/:id` | học sinh | Làm và nộp bài |
| `/student/results` | học sinh | Điểm và nhận xét |
| `/student/lessons`, `/:id` | học sinh | Bài giảng |

Học sinh gõ `/tutor/...` sẽ bị chuyển về `/student`. Gia sư gõ `/student/...` sẽ bị chuyển về `/tutor`.

---

## 2. Cài đặt từng bước

> Những bước có ghi **[Dashboard]** là bạn tự làm trên trang web Supabase hoặc Vercel. Ứng dụng không làm thay được các bước này.

### Bước 1: Tạo project Supabase [Dashboard]

1. Vào <https://supabase.com>, đăng nhập rồi bấm **New project**.
2. Đặt tên (ví dụ `gia-su-vat-ly`), đặt **Database Password** (lưu lại), chọn Region gần Việt Nam (ví dụ **Southeast Asia (Singapore)**).
3. Bấm **Create new project** và đợi 1–2 phút cho project khởi tạo xong.

### Bước 2: Chạy `schema.sql` [Dashboard]

1. Ở menu trái chọn **SQL Editor**, rồi bấm **New query**.
2. Mở file `supabase/schema.sql`, copy **toàn bộ** nội dung và dán vào ô soạn.
3. Bấm **Run**. Kết quả đúng là `Success. No rows returned`.

File này tạo 8 bảng (thêm `submission_answers` lưu câu trả lời), bật RLS cho tất cả, tạo hàm `is_tutor()`, trigger tự tạo hồ sơ khi có tài khoản mới, trigger chặn cập nhật bài nộp trái phép, các hàm `save_lesson`, `save_assignment`, `submit_assignment` (nộp bài + chấm tự động) và 2 bucket Storage riêng tư (`lesson-files`, `submissions`).

> **Nâng cấp từ bản trước:** nếu bạn đã chạy `schema.sql` cũ, chỉ cần **chạy lại toàn bộ file mới** trong SQL Editor. Dữ liệu cũ được giữ, các câu cũ thành câu "Tự luận". Riêng những bài đã nhập từ file `tutor-lesson/v1` *trước bản cập nhật này*, trắc nghiệm vẫn là văn bản, chưa có nút chọn. Hãy xóa các bài đó và nhập lại file để có câu trắc nghiệm, điền khuyết thật.
Có thể chạy lại file nhiều lần mà không mất dữ liệu.

### Bước 3: Tắt tự đăng ký (khuyên dùng) [Dashboard]

Chỉ gia sư được cấp tài khoản, nên hãy tắt chức năng người lạ tự đăng ký:
**Authentication → Sign In / Providers** (hoặc **Providers → Email** ở giao diện cũ) → tắt **Allow new users to sign up** → **Save**.
Tắt mục này không ảnh hưởng việc bạn tạo tài khoản ở bước 4.

### Bước 4: Tạo 7 tài khoản (1 gia sư + 6 học sinh) [Dashboard]

1. Vào **Authentication → Users**, bấm **Add user → Create new user**.
2. Nhập **Email** và **Password**, **tick ô "Auto Confirm User"** (nếu không tick, tài khoản không đăng nhập được), rồi bấm **Create user**.
3. Lặp lại cho đủ 7 tài khoản: 1 cho bạn và 6 cho học sinh.

Nếu học sinh không có email, bạn có thể dùng địa chỉ tự đặt, ví dụ `an@giasu.local`, vì đã tick Auto Confirm nên không cần hộp thư thật.
Mỗi tài khoản mới được tự tạo một dòng trong bảng `profiles` với `role = 'student'`.

### Bước 5: Gán role `tutor` cho tài khoản của bạn [Dashboard → SQL Editor]

Thay email trong câu lệnh bằng email của bạn rồi bấm **Run**:

```sql
update public.profiles
set role = 'tutor', full_name = 'Tên của bạn'
where id = (select id from auth.users where email = 'email-cua-ban@gmail.com');

-- Kiểm tra: phải thấy đúng 1 dòng role = tutor
select p.full_name, p.role, u.email
from public.profiles p join auth.users u on u.id = p.id
order by p.role desc, u.email;
```

### Bước 6: Nhập tên, nhóm, lớp, môn cho học sinh

**Cách A (dễ):** chạy app (bước 8), đăng nhập bằng tài khoản gia sư, vào **Học sinh** và bấm **Sửa** ở từng em.

**Cách B (SQL):** sửa email và tên cho đúng, rồi chạy:

```sql
update public.profiles p set full_name = v.full_name, group_name = v.group_name, grade = v.grade, subjects = v.subjects
from (values
  ('hs-a@giasu.local',  'Học sinh A',  'A', 11, array['Vật lý']),
  ('hs-b@giasu.local',  'Học sinh B',  'B', 12, array['Vật lý']),
  ('hs-c@giasu.local',  'Học sinh C',  'C', 11, array['Vật lý']),
  ('hs-d@giasu.local',  'Học sinh D',  'D', 12, array['Vật lý']),
  ('hs-e1@giasu.local', 'Học sinh E1', 'E', 12, array['Vật lý']),
  ('hs-e2@giasu.local', 'Học sinh E2', 'E', 12, array['Vật lý'])
) as v(email, full_name, group_name, grade, subjects)
join auth.users u on u.email = v.email
where p.id = u.id;
```

### Bước 7: Lấy key và điền `.env` [Dashboard]

1. Vào **Project Settings → API** (giao diện mới: **Project Settings → Data API** để lấy URL và **API Keys** để lấy key).
2. Copy **Project URL** (dạng `https://xxxx.supabase.co`).
3. Copy khóa công khai: **`anon` `public`** (giao diện cũ) hoặc **Publishable key** `sb_publishable_...` (giao diện mới). Cả hai đều dùng được.
   ⚠️ **Không bao giờ** dùng `service_role` hay **Secret key**: khóa đó bỏ qua RLS.
4. Trong thư mục dự án, copy `.env.example` thành `.env` rồi điền:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   (hoặc sb_publishable_...)
```

File `.env` đã nằm trong `.gitignore`, nên không bị đưa lên Git.

### Bước 8: Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở <http://localhost:5173>. Nếu thiếu `.env`, trang sẽ báo "Chưa cấu hình Supabase" thay vì để trắng.

Nếu muốn học sinh thử trên điện thoại trong cùng mạng Wi-Fi: chạy `npm run dev -- --host` rồi mở địa chỉ `Network` hiện ra.
Lưu ý: camera và một số chức năng chỉ chạy ổn qua HTTPS, nên muốn dùng thật thì nên deploy (bước 9).

### Bước 9: Deploy lên Vercel [Dashboard]

1. Đưa code lên GitHub (repo riêng tư cũng được):
   ```bash
   git remote add origin https://github.com/<tai-khoan>/<repo>.git
   git push -u origin master
   ```
2. Vào <https://vercel.com> → **Add New… → Project** → chọn repo vừa đẩy → **Import**.
3. Framework Preset: **Vite** (Vercel tự nhận). Build Command `npm run build`, Output Directory `dist`.
4. Mở **Environment Variables** và thêm 2 biến `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` với giá trị giống file `.env`.
5. Bấm **Deploy**. Xong sẽ có địa chỉ dạng `https://ten-du-an.vercel.app`, gửi địa chỉ này cho học sinh.
6. (Không bắt buộc) Trong Supabase vào **Authentication → URL Configuration**, đặt **Site URL** là địa chỉ Vercel. App chỉ dùng đăng nhập bằng mật khẩu nên bỏ qua bước này vẫn chạy.

File `vercel.json` đã cấu hình để mở trực tiếp các link như `/student/lessons/...` không bị lỗi 404.
Nếu đổi biến môi trường trên Vercel, phải **Redeploy** thì giá trị mới mới có hiệu lực.

---

## 3. Định dạng "Dán JSON"

Bài giảng:

```json
{"kind":"lesson","title":"Dao động điều hòa","content_md":"Li độ: $x = A\\cos(\\omega t + \\varphi)$"}
```

Bài tập:

```json
{"kind":"assignment","title":"BT dao động","type":"classwork","due_date":"2026-10-20",
 "exercises":[{"question_md":"Tính $T$ khi $\\omega = 4\\pi$","method_md":"$T = \\frac{2\\pi}{\\omega}$","answer_md":"$T = 0{,}5$ s"}]}
```

Một câu có thể là một trong 3 loại:

```json
{"question_md":"Tính T...", "answer_md":"...", "method_md":"..."}
{"question_md":"Chu kì phụ thuộc vào", "options":["biên độ","khối lượng và độ cứng","pha"], "correct":"B", "method_md":"..."}
{"question_md":"Điền vào chỗ trống:", "blanks":[{"id":"a","statement":"Đơn vị tần số là ......","answer":"Hz"}]}
```

| Loại | Nhận diện | Học sinh làm | Máy chấm |
|---|---|---|---|
| Tự luận | không có `options`, `blanks` | gõ bài làm và/hoặc chụp ảnh (không bắt buộc) | không, gia sư chấm |
| Trắc nghiệm | có `options` (mảng chữ, hoặc `{"label","text"}`) + `correct` | chọn 1 phương án (nút tròn) | đúng / sai |
| Điền khuyết | có `blanks` | gõ đáp án vào từng ô | "khớp" khi giống đáp án (không phân biệt hoa thường, khoảng trắng, dấu câu cuối); không khớp thì để gia sư xem |

- `type`: `classwork` (làm trên lớp) hoặc `homework` (về nhà). `due_date`: `YYYY-MM-DD`, có thể bỏ trống.
- Bài giảng có thể thêm `"video_url": "https://..."`.
- **Dấu `\` trong JSON phải viết đôi**: `\\frac`, `\\omega`. Nếu bạn quên (viết `\frac`), JSON sẽ hiểu `\f` là ký tự đặc biệt và công thức bị hỏng mà không báo lỗi. App tự nhận ra và sửa các lệnh LaTeX phổ biến, đồng thời hiện cảnh báo "Đã tự sửa N dấu \\". Hãy xem kỹ bản xem trước.
- Có thể dán nguyên khối có bọc ` ```json ... ``` `, app tự bỏ phần bọc.

### Dạng đầy đủ `tutor-lesson/v1` (một file cho cả chủ đề)

```json
{"schema":"tutor-lesson/v1","lesson":{"topic":"Chủ đề 4: Giao thoa sóng cơ","chapter":"...","grade":"11",
 "theory":{"plan":"...","sections":[{"title":"...","explain":"...","analogy":"...","key_points":[],"formulas":[],"common_mistakes":[]}],"summary_1_min":[]},
 "exercises":{
   "fill_blank":[{"assignment":"classwork","items":[{"id":"a","statement":"...","answer":"..."}]}],
   "mcq":[{"assignment":"classwork","level":"nhận biết","stem":"...","options":[{"label":"A","text":"...","reason":"..."}],"answer":"A","core":"...","note":""}],
   "problem_types":[{"title":"Dạng 1: ...","method":["..."],"problems":[{"assignment":"homework","statement":"...","solution":["..."],"answer":"...","note":""}]}]},
 "review_flags":["..."]}}
```

App chuyển một file như vậy thành:

| Trong file | Thành |
|---|---|
| `theory` + `method` của từng `problem_types` | **1 bài giảng**, tiêu đề = `topic – part` (có `part` thì dễ phân biệt các ngày). Đầu bài: dòng thông tin `subject · Lớp grade · chapter · part` và khung `plan`. **Mỗi mục `sections[]` là một thẻ riêng** gồm: `explain`, `paragraphs`, hình, rồi các tiêu đề nhỏ Hình dung dễ hiểu / Ý chính / Công thức / Ví dụ / Ghi nhớ / Lỗi hay gặp. Cuối bài: thẻ Tóm tắt 1 phút và thẻ Phương pháp giải từng dạng |
| `sections[].paragraphs` | Các đoạn giảng dài, đặt ngay sau `explain` trong thẻ của mục |
| `sections[].diagrams` (`src`, `caption`) | Hình minh họa có chú thích, đặt sau phần giảng. `src` là ảnh base64 (`data:image/svg+xml;base64,...`, png, jpg, webp, gif) hoặc link `https://`; loại khác bị bỏ qua và có cảnh báo. Hình SVG **đổi màu theo nút ☀/☾ của app** (không theo cài đặt máy) |
| `theory.sections` rỗng (file chỉ có bài tập, vd. `type: "bai_tap_tren_lop"`, `"btvn"`) | **Không tạo bài giảng**, chỉ tạo bài tập. Ở bước lưu có ô **Liên kết với bài giảng có sẵn** (vd. gắn "Ngày 1 – Bài tập trên lớp" với "Ngày 1 – Bài giảng") |
| Câu có `"assignment":"classwork"` | Bài tập **"<topic> – Bài tập trên lớp"** |
| Câu có `"assignment":"homework"` | Bài tập **"<topic> – Bài tập về nhà"** |
| `mcq` | Câu **trắc nghiệm** có nút chọn A/B/C/D, máy chấm theo `answer`. Phương pháp giải = `core` + phân tích từng phương án (`reason`); lý do đúng sai **không** gửi cho học sinh trước khi nộp. Nếu `answer` không khớp phương án nào, câu đó thành tự luận và có cảnh báo |
| `fill_blank` | Mỗi nhóm thành 1 câu **điền khuyết**, mỗi ý (a, b, c…) có một ô gõ đáp án |
| `problems` | Đề = `statement`; đáp án = `answer`; phương pháp giải = các bước `solution` |
| `note` của từng câu | Thêm vào lời giải dưới dạng "Lưu ý" (có ô tick để tắt) |
| `review_flags` | Chỉ hiện cho gia sư ở bước xem trước, **không** lưu và không gửi cho học sinh |

Quy trình: **📂 Chọn file .json** (hoặc dán) → **Kiểm tra & xem trước** → mở từng phần để đọc lại, đặt hạn nộp cho từng bài tập → chọn học sinh → **Lưu N phần đã chọn**. Bài tập được tự liên kết với bài giảng của cùng file.
Muốn sửa một phần trước khi lưu (hoặc gắn file PDF, video vào bài giảng), bấm **Sửa trong trang soạn** ở phần đó. Nếu lưu bị lỗi giữa chừng, phần đã lưu được đánh dấu ✅, và bấm lưu lại chỉ lưu những phần còn thiếu.

Với dạng ngắn (`"kind"`), quy trình giống hệt: xem trước → chọn học sinh → **Lưu**.

---

## 4. Bảo mật: đáp án được giấu thế nào

- Câu hỏi (`exercises`) và đáp án (`answer_keys`) nằm ở **2 bảng riêng**.
- RLS của `answer_keys` chỉ cho học sinh đọc khi dòng `assignment_recipients` của chính em đó có `status` là `done` hoặc `checked`. Trước khi nộp, máy chủ trả về **rỗng**, nên đáp án không bao giờ được gửi xuống trình duyệt, kể cả khi học sinh tự gọi API.
- Phương án trắc nghiệm (`exercises.options`) chỉ chứa chữ cái và nội dung. Phương án đúng nằm ở `answer_keys.correct`, nên cũng bị giấu như trên.
- Học sinh **không có quyền UPDATE** bảng `assignment_recipients` và không có quyền ghi bảng `submission_answers`. Cách duy nhất để nộp là gọi hàm `submit_assignment()` phía máy chủ. Hàm này:
  - chỉ nhận bài được giao cho chính học sinh đó và đang ở trạng thái `todo` (không nộp lại sau khi đã nộp);
  - lưu câu trả lời, **chấm trắc nghiệm / điền khuyết ở máy chủ** (trình duyệt không bao giờ cần biết đáp án để chấm);
  - tự ghi `status = 'done'`, `submitted_at`, `submission_path`; học sinh không chạm được `score`, `feedback`.
- Trigger `guard_assignment_recipient_update` chặn thêm một lớp: mọi cập nhật không đến từ gia sư hoặc từ `submit_assignment()` đều bị từ chối.
- Hệ quả của việc nộp không cần ảnh: học sinh có thể bấm nộp với bài trống để xem đáp án. Khi đó bài vẫn hiện "Đã nộp" với các câu "Không trả lời", và gia sư thấy rõ trong trang chấm.
- Storage: học sinh chỉ tải ảnh vào thư mục `submissions/<id của mình>/<id bài được giao>/` và chỉ khi bài còn `todo`. Học sinh chỉ đọc được ảnh của mình và file của bài giảng được giao cho mình. Cả 2 bucket đều riêng tư, link xem là link tạm có hạn 1 giờ.
- Học sinh không có quyền sửa `profiles`, nên không tự đổi được `role`.

---

## 5. Các quyết định đã tự chọn (và lý do)

| Điểm chưa rõ trong yêu cầu | Cách làm | Lý do |
|---|---|---|
| Cách nộp bài | Làm ngay trong app: trắc nghiệm chọn nút tròn, điền khuyết gõ vào ô, tự luận gõ chữ. Ảnh **không bắt buộc** | Nộp nhanh trên điện thoại; trắc nghiệm được chấm ngay |
| Lưu nháp | Câu trả lời đang làm được lưu trên máy (localStorage), tải lại trang không mất; nộp xong thì xóa | Học sinh hay bị gián đoạn khi làm trên điện thoại |
| Chấm điền khuyết | Chỉ đánh "khớp" khi giống hệt đáp án (bỏ qua hoa thường, khoảng trắng, dấu câu cuối). Không khớp thì **không** đánh sai mà để "Cần xem" | Cùng một ý có nhiều cách viết, máy không nên phạt oan |
| Điểm | Gia sư vẫn quyết định điểm cuối. Có nút **Dùng điểm máy chấm** = số câu đúng / số câu máy chấm × 10, làm tròn 0,25 | Bài có cả tự luận thì điểm máy chỉ là gợi ý |
| Sửa đáp án sau khi đã nộp | Câu được cập nhật tại chỗ (giữ câu trả lời), và bài đã nộp được **chấm lại** theo đáp án mới | File nguồn có vài đáp án đề tô đỏ bị nghi sai (`review_flags`) |
| Bài giảng nhiều mục | Mỗi tiêu đề `## ...` trong nội dung là một thẻ riêng khi xem (áp dụng cả cho bài giảng soạn tay). Ảnh nhúng trong ô soạn hiện gọn là `(hinh-1)`, `(hinh-2)`... | Bài dài dễ đọc trên điện thoại; ô soạn không bị mã ảnh dài hàng chục nghìn ký tự che hết nội dung |
| Giao diện | Tông tím – hồng: nền xanh tím than có quầng sáng (tối, mặc định) hoặc nền oải hương (sáng), nút và menu dạng viên thuốc, nút chính chuyển màu tím → hồng có quầng sáng; nút ☀/☾ đổi giao diện; font Be Vietnam Pro | Theo mẫu tuhoc.cc bạn gửi; font thiết kế riêng cho dấu tiếng Việt |
| Độ mượt | Trang mới hiện ra mờ dần; khi tải lại sau lúc lưu thì giữ nội dung cũ trên màn hình (không nháy); lúc chờ tải hiện khung xương thay vòng xoay; sau đăng nhập tự tải sẵn các trang để bấm menu là hiện ngay; nút nhích lên/nhún nhẹ khi bấm. Máy bật "giảm chuyển động" thì tắt hết hiệu ứng | Thao tác trên điện thoại cảm giác nhanh và liền mạch |
| Nộp 1 hay nhiều ảnh? | Nhiều ảnh (tối đa 15), lưu chung thư mục `<student_id>/<assignment_id>`; `submission_path` là đường dẫn thư mục | Bài làm thường có nhiều trang |
| Nút chụp ảnh | 2 nút: **Chụp ảnh** (mở thẳng camera sau) và **Chọn từ thư viện** (chọn được nhiều ảnh) | Trên điện thoại, `capture` mở camera nhưng không chọn được ảnh có sẵn |
| Ảnh điện thoại nặng 3–8MB | Thu nhỏ còn cạnh dài 1800px (JPEG) trước khi tải lên | Nộp nhanh hơn với mạng 4G, tiết kiệm dung lượng Storage miễn phí |
| Nộp lại? | Học sinh **không** tự nộp lại (vì đã thấy đáp án). Gia sư có nút **Cho nộp lại** (xóa ảnh cũ, đưa về `todo`) | Giữ ý nghĩa "đáp án chỉ hiện sau khi nộp" |
| Gia sư chấm khi học sinh chưa nộp | Cho phép, có hỏi xác nhận | Bài "làm trên lớp" có thể chấm trực tiếp trên giấy |
| Trạng thái `checked` | Tự đặt khi gia sư bấm **Lưu chấm** | Một thao tác vừa lưu điểm vừa đánh dấu đã chấm |
| Lưu bài tập (nhiều bảng) | Dùng hàm SQL `save_assignment` / `save_lesson` (một transaction) | Nếu lỗi giữa chừng thì không để lại bài tập thiếu câu hoặc thiếu đáp án |
| Sửa bài tập đã giao | Câu còn giữ được cập nhật tại chỗ, câu bị xóa thì mất câu trả lời của câu đó; bỏ chọn học sinh thì xóa bài nộp của em đó (có cảnh báo) | Không mất bài làm của học sinh khi chỉ sửa lỗi chính tả |
| Hồ sơ học sinh | Trigger tự tạo `profiles` (role `student`) khi tạo tài khoản; gia sư sửa tên/nhóm/lớp/môn ngay trong app | Không phải chạy SQL cho từng em |
| Bài "đang đến hạn" | Trang chủ hiện **mọi** bài chưa nộp, hạn gần nhất lên đầu, bài quá hạn tô đỏ, bài không có hạn để cuối | Không bỏ sót bài quá hạn |
| Nhận xét | Văn bản thường (giữ xuống dòng) | Gia sư gõ nhanh trên điện thoại |
| Video | Link YouTube được nhúng; link khác hiện nút "Mở video" | YouTube phổ biến nhất |
| Dung lượng file | File bài giảng ≤ 50MB, mỗi ảnh nộp ≤ 15MB | Bản Supabase miễn phí giới hạn 50MB/file |

---

## 6. Kiểm thử

### 6.1. Đã kiểm tra tự động khi phát triển

- `npm run build` thành công.
- `schema.sql` được chạy 2 lần liên tiếp trên PostgreSQL (PGlite, có giả lập `auth.uid()` và `storage.objects` của Supabase), cùng **42 kiểm tra RLS**, tất cả đều đạt. Các kiểm tra gồm:
  - học sinh không thấy đáp án (kể cả phương án đúng của trắc nghiệm) trước khi nộp, và thấy sau khi nộp;
  - học sinh không tự sửa điểm hay trạng thái, không ghi câu trả lời trực tiếp, không nộp bài không được giao, không nộp lại;
  - nộp được khi không có ảnh;
  - chấm đúng: trắc nghiệm sai, điền khuyết khớp dù khác hoa thường/khoảng trắng, tự luận để trống điểm máy;
  - sửa đáp án thì bài đã nộp được chấm lại;
  - không xem được câu trả lời của bạn khác.
- Chạy `schema.sql` bản cũ có dữ liệu, rồi chạy bản mới đè lên: dữ liệu được giữ, quyền UPDATE trực tiếp của học sinh bị gỡ.
- Chạy thử giao diện trên Chrome cỡ màn hình điện thoại với API Supabase giả lập, tất cả đều đạt:
  - phân quyền và điều hướng;
  - làm bài trắc nghiệm / điền khuyết, nháp còn sau khi tải lại, nộp không ảnh, xem kết quả máy chấm;
  - đổi và nhớ giao diện sáng/tối;
  - trang chấm và trang soạn của gia sư;
  - nhập file `song-c4-giao-thoa.json`.

Những kiểm tra trên **chưa chạy trên một project Supabase thật**, vì cần key của bạn. Hãy làm các bước ở mục 6.2 sau khi cài đặt xong.

### 6.2. Các bước bạn tự kiểm tra

Chuẩn bị: đăng nhập gia sư, tạo 1 bài tập 2 câu (có đáp án) giao cho **học sinh A**, và 1 bài giảng có file PDF giao cho **học sinh A**.

**Phân quyền và điều hướng**

1. Mở `/tutor` khi chưa đăng nhập → bị chuyển về `/login`.
2. Đăng nhập sai mật khẩu → hiện "Email hoặc mật khẩu không đúng."
3. Đăng nhập bằng học sinh A → tự vào `/student`.
4. Học sinh A gõ `/tutor` (hoặc `/tutor/assignments`) trên thanh địa chỉ → bị chuyển về `/student`.
5. Đăng nhập gia sư rồi gõ `/student` → bị chuyển về `/tutor`.

**Đáp án chỉ hiện sau khi nộp**

6. Học sinh A mở bài tập: thấy đề và công thức, **không** thấy đáp án.
7. Bấm F12 → tab **Network**, tải lại trang: **không** có request nào tới `answer_keys`. Mở các response `exercises`: chỉ có `question_md`, không có đáp án.
8. Thử "lách" bằng SQL (giả làm học sinh A, không thay đổi dữ liệu). Lấy id của A bằng `select id from auth.users where email='...'`, rồi chạy trong SQL Editor:
   ```sql
   begin;
   select set_config('request.jwt.claims', '{"sub":"<ID_HOC_SINH_A>","role":"authenticated"}', true);
   set local role authenticated;
   select * from public.answer_keys;                 -- Chưa nộp: phải ra 0 dòng
   update public.assignment_recipients set score = 10
     where student_id = '<ID_HOC_SINH_A>';           -- Phải ra UPDATE 0 (học sinh không có quyền sửa)
   rollback;
   ```
9. Với bài có câu trắc nghiệm: chọn một phương án → vòng chữ cái được tô. Gõ vào ô điền khuyết, rồi tải lại trang → câu trả lời vẫn còn (nháp).
10. Bấm **Nộp bài** khi còn câu bỏ trống → app nhắc "Còn N câu chưa trả lời". Bấm đồng ý (không cần ảnh) → hiện "Đã nộp…", điểm máy chấm "x/y", phương án đúng tô xanh, phương án sai tô đỏ, cùng đáp án + phương pháp giải từng câu. Thử thêm trên điện thoại: **Chụp ảnh** mở camera và ảnh nộp kèm hiện ở cuối trang.
11. Chạy lại đoạn SQL ở bước 8 → lần này `answer_keys` trả về các dòng đáp án, còn lệnh sửa điểm vẫn ra `UPDATE 0`.
12. Đăng nhập **học sinh B** → không thấy bài tập và bài giảng của A. Gõ thẳng đường dẫn bài của A (`/student/assignments/<id>`) → báo "không được giao cho bạn".

**Chấm điểm**

13. Gia sư vào **Bài tập** → bài vừa giao hiện "1 chờ chấm" → **Theo dõi & chấm** → thấy "Máy chấm: x/y" → **Xem bài làm** (từng câu có nhãn Đúng / Sai / Cần xem) → **Xem ảnh nộp kèm**.
14. Bấm **Dùng điểm máy chấm** hoặc tự nhập điểm 8.5, ghi nhận xét, bấm **Lưu chấm** → trạng thái thành "Đã chấm".
15. Học sinh A vào **Kết quả** → thấy điểm 8.5 và nhận xét.
16. Gia sư bấm **Cho nộp lại** → bài của A trở về "Chưa nộp" và hiện lại trên trang chủ của A.

**Bài giảng, JSON, giao diện**

17. Học sinh A vào **Bài giảng** → mở bài → công thức hiển thị đúng, bấm file PDF tải được, video YouTube phát được.
18. Gia sư vào **Dán JSON**, bấm **📂 Chọn file .json** và chọn `song-c4-giao-thoa.json` → **Kiểm tra & xem trước** → thấy 3 phần (bài giảng, 19 câu trên lớp, 37 câu về nhà) và 9 ghi chú cần kiểm tra → đặt hạn nộp, chọn học sinh A → **Lưu 3 phần đã chọn**. Đăng nhập học sinh A: thấy 2 bài tập và 1 bài giảng; trong bài tập có link "Xem bài giảng liên quan".
19. Dán JSON có lỗi (ví dụ thiếu dấu `}` hoặc `"type":"abc"`) → hiện lỗi rõ ràng bằng tiếng Việt.
20. Thử trên điện thoại: chữ không bị tràn ngang, các nút đủ lớn để bấm, menu trên cùng cuộn ngang được.
21. Tắt mạng rồi tải một trang → hiện lỗi "Không kết nối được máy chủ" cùng nút **Thử lại**, không bị trắng trang.
22. Bấm nút ☀ ở góc trên → chuyển sang giao diện sáng. Tải lại trang → vẫn sáng, không bị nháy màu tối trước. Bấm ☾ để về giao diện tối.

---

## 7. Gặp lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| "Chưa cấu hình Supabase" | Thiếu `.env` hoặc sai tên biến. Sửa xong phải tắt `npm run dev` và chạy lại |
| "Email chưa được xác nhận" | Khi tạo user chưa tick **Auto Confirm User**. Vào Users → chọn user → **Confirm email**, hoặc xóa đi tạo lại |
| "Tài khoản này chưa có hồ sơ…" | User được tạo trước khi chạy `schema.sql`. Chạy lại `schema.sql`, phần cuối mục 3 sẽ tạo hồ sơ còn thiếu |
| Đăng nhập gia sư nhưng vào trang học sinh | Chưa chạy SQL ở bước 5, hoặc gõ sai email |
| "Bạn không có quyền thực hiện thao tác này" | Đang dùng sai tài khoản, hoặc chưa chạy `schema.sql` mới nhất |
| Trên Vercel mở link trực tiếp bị 404 | Kiểm tra `vercel.json` đã có trong repo |
| Công thức hiện chữ đỏ | Lỗi cú pháp LaTeX trong nội dung. Bấm **Xem trước** khi soạn để kiểm tra |

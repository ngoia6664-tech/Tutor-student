// Nội dung Hỏi đáp cho giáo viên. Câu trả lời viết Markdown. Luồng trong app đổi thì sửa theo ở đây.
/** @type {{ title: string, icon: import('../../components/Icon.jsx').IconName, items: { q: string, a: string }[] }[]} */
export const TUTOR_HELP = [
  {
    title: 'Giao bài và quản lý',
    icon: 'users',
    items: [
      {
        q: 'Tôi có thể giao một bài cho nhiều học sinh không?',
        a: 'Có. Chọn bài, bấm **Giao**, rồi chọn các học sinh nhận bài. Nhóm học sinh chỉ là nút chọn nhanh.',
      },
      {
        q: 'Làm sao chuyển chủ đề hoặc giao nhiều bài cùng lúc?',
        a: 'Bấm **Sửa nhiều** (ở trang Chấm bài nằm trong menu **⋯**, hoặc trong một chủ đề của Thư viện), chọn các bài, rồi bấm **Chuyển chủ đề** hoặc **Giao cho...**. Trong Thư viện còn chuyển được vào thư mục. Chuyển chủ đề chỉ đổi chỗ xếp bài, nội dung và danh sách học sinh giữ nguyên.',
      },
      {
        q: 'Khóa học là gì, giao cả khóa thế nào?',
        a: 'Khóa nằm giữa Môn và Chương (vd. Lớp 12 › Vật lý › Khóa cơ bản). Ở trang một môn trong **Thư viện**, mở menu **⋯** → **Thêm khóa**; chủ đề xếp vào khóa bằng ô **Khóa** khi thêm / sửa chủ đề. Vào trang khóa, bấm **Giao khóa** và chọn học sinh: các bạn tự thấy mọi bài đang mở trong khóa, kể cả bài thêm sau, làm tự do không hạn nộp. Bài tự học được máy chấm luôn, không vào hàng chấm của bạn.',
      },
      {
        q: 'Bài trong khóa chưa dạy tới thì làm sao để học sinh chưa thấy?',
        a: 'Trong chủ đề thuộc khóa, mỗi bài có nút **Ẩn** / **Mở**. Bài đang ẩn thì học sinh có khóa không thấy (bài các bạn đã làm vẫn giữ). Bấm **Báo** ở một bài, hoặc **Báo học sinh…** ở đầu chủ đề để báo nhiều bài cùng lúc, rồi chọn học sinh / nhóm cần báo. Khi mở bài, app cũng mở bảng này. Báo thì các bạn nhận chuông, bài hiện ở **Bài cần làm** và bài nộp vào hàng chấm; không báo thì bài chỉ nằm sẵn trong khóa để tự học.',
      },
      {
        q: 'Làm sao biết học sinh nào chưa nộp?',
        a: 'Vào **Chấm bài**, chọn bài. Bảng hiện trạng thái của từng học sinh: Chưa nộp, Quá hạn, Chờ chấm, Đã chấm.',
      },
      {
        q: 'Tôi lọc học sinh theo nhóm thế nào?',
        a: 'Vào **Học sinh**, chọn nhóm ở hàng chip lọc phía trên.',
      },
    ],
  },
  {
    title: 'Chấm bài và điểm',
    icon: 'grade',
    items: [
      {
        q: 'Chấm bài theo thứ tự nào?',
        a: 'Bộ lọc **Có bài chờ chấm** ở trang Chấm bài hiện các bài có học sinh đã nộp nhưng chưa chấm. Cột phải hiện hàng đợi, bài nộp sớm nhất lên trước. Bấm tên học sinh để mở bài, chấm từng câu, viết lời phê từng câu, rồi bấm **Lưu chấm**.',
      },
      {
        q: 'Điểm chấm bài lấy từ đâu?',
        a: 'Trong bài của học sinh có hai cách:\n\n- **Dùng điểm máy chấm**: điền sẵn điểm máy vào ô điểm. Sau đó bấm **Lưu chấm** để lưu.\n- **Nhập điểm**: tự nhập điểm theo ý bạn, rồi bấm **Lưu chấm**.\n\nĐiểm chỉ được ghi nhận khi bạn bấm **Lưu chấm**. Học sinh chỉ thấy điểm sau khi bạn lưu.',
      },
      {
        q: 'Cho học sinh nộp lại thế nào?',
        a: 'Trong bài của học sinh, bấm **Cho nộp lại**. Nhận xét và lời phê được giữ để học sinh thấy khi sửa. Bài quay về trạng thái chưa nộp, ảnh nộp cũ bị xóa.',
      },
      {
        q: 'Học sinh làm lại có ảnh hưởng điểm không?',
        a: 'Không. Các lần làm lại hiện dưới bài tập, ghi "Tự làm lại: lần 1 …", nhưng không thay đổi điểm chính thức.',
      },
      {
        q: 'Điểm máy chấm đề thi được tính thế nào?',
        a: 'Đề đúng chuẩn 18 – 4 – 6 thì điểm máy chấm theo thang THPT. Câu tự luận và điền khuyết do gia sư tự chấm, không tính vào điểm máy. Đề không đúng chuẩn vẫn lưu được, điểm máy sẽ quy về thang 10.',
      },
    ],
  },
  {
    title: 'Báo lỗi và thông báo',
    icon: 'bell',
    items: [
      {
        q: 'Học sinh báo lỗi câu hỏi thì xem ở đâu?',
        a: 'Trong mục **Báo lỗi đề**. Mục này có số đếm báo lỗi chưa xử lý.',
      },
      {
        q: 'Chuông thông báo báo gì?',
        a: 'Chuông báo khi học sinh nộp bài, kể cả lần nộp lại sau khi bạn cho nộp lại.',
      },
      {
        q: 'Nút "Bảng bên" dùng để làm gì?',
        a: 'Trên điện thoại hoặc màn hình hẹp, nút **Bảng bên** mở cột thông tin phụ. Cột này hiện việc cần xử lý (bài chờ chấm, báo lỗi) và bài vừa giao. Trên màn hình rộng, cột này luôn hiện sẵn bên phải.',
      },
      {
        q: 'Cửa hàng gấu trong mục gia sư để làm gì?',
        a: 'Gia sư xem và thử mọi trang phục. Gia sư không có Xu hay Sao, và không ảnh hưởng đến học sinh.',
      },
    ],
  },
]

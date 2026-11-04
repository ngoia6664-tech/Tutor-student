// Nội dung Hỏi đáp cho học sinh. Câu trả lời viết Markdown. Luồng hoặc số Xu trong app đổi thì sửa theo ở đây.
/** @type {{ title: string, icon: import('../../components/Icon.jsx').IconName, items: { q: string, a: string }[] }[]} */
export const STUDENT_HELP = [
  {
    title: 'Nộp bài và điểm',
    icon: 'assignment',
    items: [
      {
        q: 'Bài đã nộp của tôi đi đâu rồi?',
        a: 'Bài đã nộp chuyển sang mục **Kết quả**. Nếu giáo viên cho nộp lại, bài sẽ quay về **Bài cần làm** kèm nhận xét để bạn sửa.',
      },
      {
        q: 'Tôi làm dở bài thì làm sao?',
        a: 'Vào **Bài cần làm → Đang làm dở → Làm tiếp**. Bản nháp chỉ lưu trên trình duyệt của máy đang dùng, nên đổi máy hoặc xóa dữ liệu trình duyệt thì sẽ không thấy bản nháp đó.',
      },
      {
        q: 'Nộp bài rồi tôi thấy gì?',
        a: 'Ngay sau khi nộp, bạn thấy câu nào đúng, câu nào sai, câu nào chưa làm, và đáp án của bài. **Điểm chỉ hiện sau khi giáo viên bấm Lưu chấm.** Sau khi nộp, bài không sửa được trừ khi giáo viên cho nộp lại.',
      },
      {
        q: 'Khi nào giáo viên cho tôi nộp lại?',
        a: 'Khi giáo viên bấm **Cho nộp lại**, bài quay về **Bài cần làm** kèm nhận xét và lời phê của giáo viên. Câu trả lời cũ được giữ nguyên để bạn sửa rồi nộp lại. Ảnh bài nộp lần trước sẽ bị xóa.',
      },
      {
        q: '"Làm lại" là gì, khác "Cho nộp lại" thế nào?',
        a: '- **Cho nộp lại** do giáo viên quyết định. Bài là bài chính thức và có thể đổi điểm.\n- **Làm lại** do bạn tự chọn để luyện tập, tối đa 3 lần cho mỗi bài. Mỗi lần bắt đầu từ bài trống, không tính giờ, không đính kèm ảnh. Kết quả làm lại không thay đổi điểm chính thức.',
      },
      {
        q: 'Trạng thái của bài nghĩa là gì?',
        a: '- **Chưa nộp**: còn hạn làm.\n- **Quá hạn**: đã qua hạn nộp và chưa nộp.\n- **Chờ chấm**: đã nộp, giáo viên chưa lưu điểm.\n- **Đã chấm**: đã có điểm chính thức.',
      },
      {
        q: 'Bài tập có giới hạn thời gian không?',
        a: 'Có thể có. Khi hết giờ, bài tự động nộp với các câu bạn đã làm.',
      },
      {
        q: 'Tôi có nộp ảnh bài làm được không?',
        a: 'Được, ảnh là không bắt buộc. Câu tự luận có thể gõ trực tiếp hoặc chụp ảnh bài làm.',
      },
      {
        q: 'Bảng ô số trong bài làm dùng để làm gì?',
        a: 'Bảng ô số hiện mọi câu trong bài, ô nào đã làm sẽ được tô màu. Bấm một ô để nhảy tới câu đó.',
      },
      {
        q: 'Tôi báo lỗi câu hỏi thế nào?',
        a: 'Ở đầu mỗi câu có nút **Báo lỗi đề**. Bạn có thể ghi chú thêm. Giáo viên sẽ xem trong mục Báo lỗi đề của họ.',
      },
      {
        q: 'Bài cần làm khác Thư viện thế nào?',
        a: '**Bài cần làm** chỉ chứa bài chưa hoàn thành. **Thư viện** chứa toàn bộ bài tập và bài giảng đã được giao, sắp theo Môn › Chương › Chủ đề.',
      },
    ],
  },
  {
    title: 'Ôn tập, chuỗi và Xu',
    icon: 'refresh',
    items: [
      {
        q: 'Ôn tập có những mục nào?',
        a: '- **Câu sai**: các câu máy chấm là sai trong những bài bạn đã nộp. Khi bạn ôn đúng một câu, câu đó được ẩn đi. Bật **Hiện cả câu đã ôn đúng** để xem lại.\n- **Câu khó**: câu bạn tự đánh dấu ☆ lúc làm bài hoặc xem bài. Bấm **Bỏ đánh dấu** để gỡ câu khỏi danh sách.\n\nÔn tập chấm ngay trên máy và không ảnh hưởng điểm. Câu tự luận không nằm trong Câu sai.',
      },
      {
        q: 'Ôn tập mỗi ngày và chuỗi 🔥 là gì?',
        a: 'Mỗi ngày, làm **Ôn tập hôm nay** để giữ chuỗi. Trên điện thoại, bấm nút ngay dưới ngọn lửa 🔥 ở góc trên bên phải. Trên máy tính, bấm **Ôn tập giữ chuỗi** trong khối **Hôm nay** của Bảng bên. Hoàn thành Ôn tập hôm nay thì được +10 Xu.',
      },
      {
        q: 'Chuỗi bị đứt thì sao? Khiên là gì?',
        a: '- Nếu bỏ một ngày, **khiên** tự dùng để giữ chuỗi (nếu bạn còn khiên).\n- Nếu bỏ hai ngày liền, chuỗi đứt.\n- Khiên mua bằng Xu, giữ tối đa 2 cái, và chỉ mua được 1 cái trong 7 ngày.',
      },
      {
        q: 'Xu và Sao lấy ở đâu, dùng để làm gì?',
        a: '- **Xu**: bắt đầu với 300 Xu. Được thêm Xu khi hoàn thành Ôn tập hôm nay và khi giáo viên lưu điểm bài đạt từ 8 trở lên. Xu dùng để mua trang phục cho gấu và mua khiên.\n- **Sao**: tích lũy, không bị trừ. Sao được thưởng khi giáo viên lưu điểm từ 9 trở lên, và dùng để mở khóa một số địa điểm trong chế độ ngắm vũ trụ.\n- Xu và Sao chỉ tính theo điểm giáo viên đã lưu, nên bài nộp xong chưa có điểm thì chưa có thưởng.',
      },
      {
        q: 'Cửa hàng gấu để làm gì?',
        a: 'Dùng Xu để mua trang phục cho Giáo sư Gấu Trúc, thử đồ và mặc. Trên máy tính mở từ thanh bên. Trên điện thoại mở từ ngăn kéo menu ☰.',
      },
    ],
  },
  {
    title: 'Thư viện và khác',
    icon: 'library',
    items: [
      {
        q: '"Đánh dấu đang học" là gì?',
        a: 'Trong Thư viện, bấm **Đánh dấu đang học** ở một chủ đề. Sau đó trang Thư viện và cột phải sẽ nhắc bạn đang học đến chương nào, chủ đề nào.',
      },
      {
        q: 'Chuông thông báo báo gì?',
        a: 'Chuông báo khi giáo viên giao bài tập hoặc bài giảng mới cho bạn.',
      },
      {
        q: 'Tôi góp ý về app bằng cách nào?',
        a: 'Bấm **Góp ý** trong thanh bên (máy tính) hoặc trong ngăn kéo menu (điện thoại). Góp ý được gửi tới người quản trị app.',
      },
      {
        q: 'Nút "Bảng bên" dùng để làm gì?',
        a: 'Nút **Bảng bên** mở cột thông tin phụ, gồm chuỗi, Xu, Sao và việc đang làm dở (tùy trang). Trên màn hình rộng, cột này luôn hiện sẵn bên phải. Trên điện thoại hoặc màn hình hẹp, bạn bấm nút Bảng bên để mở.',
      },
    ],
  },
]

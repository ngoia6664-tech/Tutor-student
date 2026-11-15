# Quy ước viết công thức trong file JSON bài giảng / bài tập

Dành cho agent soạn bài và agent sửa file JSON cũ. Mục tiêu: công thức hiển thị đúng ở mọi môn (Toán, Lý, Hóa...), không phụ thuộc việc app "đoán".
Ví dụ mẫu chạy được: `AI/MAU_CONG_THUC.json` (nhập được vào app; 59 công thức đã kiểm tra bằng KaTeX). Đọc file đó cùng tài liệu này.

## 1. Quy tắc vàng

1. **Mọi công thức nằm trong `$...$`** (LaTeX, vẽ bằng KaTeX). Công thức riêng một dòng lớn: `$$...$$`.
2. **Không viết phân số bằng dấu `/` trong chữ thường** (`3/2kT`, `1/2π`, `a/2b`). App tự đoán nên dễ đọc sai mẫu số. Dùng `$\frac{3}{2}kT$`.
3. Chữ tiếng Việt trong công thức bọc `\text{...}`: `$m_{\text{khí}}$`, `$x = 5\ \text{cm}$`.
4. Công thức hóa học và đơn vị bọc `\mathrm{...}` (chữ thẳng đứng).
5. Số thập phân trong công thức: `1{,}38` (dấu phẩy trong `{ }` để không bị cách).
6. KHÔNG dùng `\ce{...}` (app không có mhchem). Dùng `\mathrm{...}`.
7. Ngoặc to tự co: `\left( ... \right)`.

## 2. Viết trong file JSON

JSON bắt buộc gấp đôi dấu gạch ngược: LaTeX `\frac` phải gõ **`\\frac`** trong chuỗi JSON.

```json
"stem": "Động năng tịnh tiến trung bình của phân tử là $\\overline{E_d} = \\frac{3}{2}kT$."
```

- Xuống dòng trong chuỗi: `\n`. Dấu nháy kép trong chuỗi: `\"`.
- Sau khi sửa phải kiểm tra file còn là JSON hợp lệ (`node -e "JSON.parse(require('fs').readFileSync('file.json','utf8'))"`).
- Đừng để `$` đơn lẻ trong chuỗi (ví dụ viết giá tiền); `$` luôn đi thành cặp.

## 3. Bảng quy đổi (gõ gì → ra gì)

### Phân số
| Cần | Gõ trong LaTeX | Ghi chú |
|---|---|---|
| (3/2)·kT | `\frac{3}{2}kT` | tử 3, mẫu 2, rồi nhân kT |
| 3 trên 2kT | `\frac{3}{2kT}` | khác dòng trên |
| λD/a | `\frac{\lambda D}{a}` | |
| 1/(2π) | `\frac{1}{2\pi}` | |
| phân số lồng | `\frac{\frac{1}{2}mv^2}{kT}` | |
| nhỏ trong dòng chữ | `\tfrac{1}{2}` | cỡ lớn: `\dfrac{a}{b}` |

### Căn, lũy thừa
| Cần | Gõ |
|---|---|
| √x | `\sqrt{x}` |
| căn bậc n | `\sqrt[n]{x}` |
| √(3kT/m) | `\sqrt{\frac{3kT}{m}}` |
| x² | `x^2` |
| xⁿ⁺¹ (nhiều ký tự phải có `{ }`) | `x^{n+1}` |
| 10⁻²³ | `10^{-23}` |
| 1,38×10⁻²³ | `1{,}38 \times 10^{-23}` |
| eˣ | `e^{-\lambda t}` |

### Chỉ số dưới / trên
| Cần | Gõ |
|---|---|
| x₁, T₂ | `x_1`, `T_2` |
| N_A, I_max | `N_A`, `I_{\max}` |
| chỉ số là chữ Việt / từ | `m_{\text{khí}}`, `v_{\text{rms}}`, `Q_{\text{thu}}`, `c_{\text{nước}}` |
| **chỉ số là tên chất / nguyên tố** (như QAl: Al nhỏ, thẳng, ở góc dưới của Q) | `Q_{\mathrm{Al}}`, `m_{\mathrm{Cu}}`, `n_{\mathrm{H_2}}`, `V_{\mathrm{CO_2}}` |
| xₙ₊₁ | `x_{n+1}` |
| vừa dưới vừa trên | `x_i^2` |

**Quy ước chỉ số dưới (bắt buộc):** chữ đứng sau ký hiệu để chỉ *đối tượng* (nguyên tố, chất, từ) luôn là chỉ số dưới, nhỏ, **thẳng đứng**, nằm ở góc dưới bên phải của ký hiệu đứng trước, giống chỉ số trong hóa học.
- Tên nguyên tố / chất / công thức hóa học → `_{\mathrm{...}}`: `Q_{\mathrm{Al}}`, `m_{\mathrm{Fe}}`, `n_{\mathrm{H_2O}}`.
- Từ tiếng Việt hoặc tiếng Anh → `_{\text{...}}`: `Q_{\text{thu}}`, `v_{\text{rms}}`.
- Chỉ số chỉ là biến hay số (thứ tự, vị trí) giữ nghiêng: `x_1`, `a_n`, `x_{n+1}`.
- KHÔNG viết `Q_{Al}` hoặc `QAl` hoặc `Q_Al` không bọc `\mathrm`/`\text`: `Al` thành chữ nghiêng `A·l` (như hai biến nhân nhau) và ký hiệu sai.
- Chỉ số nhiều ký tự luôn có `{ }`: `Q_{\mathrm{Al}}`, không phải `Q_\mathrm{Al}`.
- Khi sửa file cũ, mọi `QAl`, `Q_Al`, `mCu`, `nH2`, `VCO2` (đối tượng dính sau ký hiệu) đổi thành dạng trên.

### Logarit
`\log_a b` · `\lg x` · `\ln x` · `\log_{10} x` · `\log_a (bc) = \log_a b + \log_a c`

### Giá trị trung bình (gạch ngang trên đầu), vectơ, góc
| Cần | Gõ |
|---|---|
| E trung bình (có gạch trên) | `\overline{E}` |
| động năng trung bình | `\overline{E_d}` |
| trung bình bình phương | `\overline{v^2}` |
| một chữ đơn | `\bar{x}` |
| ⟨Eđ⟩ (ngoặc nhọn, kiểu cũ) | `\langle E_d \rangle` — chọn MỘT kiểu cho cả bộ, ưu tiên `\overline` |
| vectơ | `\vec{F}`, `\overrightarrow{AB}` |
| góc | `\widehat{ABC}`, `30^\circ` |
| trị tuyệt đối | `\left|\frac{a}{b}\right|` |

### Hóa học (chỉ số con ở dưới, điện tích ở trên)
Số nguyên tử là chỉ số **dưới** `_`; điện tích ion là chỉ số **trên** `^`; **hệ số đứng trước viết bình thường**.
| Cần | Gõ |
|---|---|
| Cu(OH)₂ | `\mathrm{Cu(OH)_2}` |
| H₂SO₄ | `\mathrm{H_2SO_4}` |
| Al₂(SO₄)₃ | `\mathrm{Al_2(SO_4)_3}` |
| SO₄²⁻, Fe³⁺, Na⁺ | `\mathrm{SO_4^{2-}}`, `\mathrm{Fe^{3+}}`, `\mathrm{Na^+}` |
| phản ứng | `\mathrm{2H_2 + O_2 \xrightarrow{t^\circ} 2H_2O}` |
| kết tủa / khí | `\mathrm{CaCO_3 \downarrow}`, `\mathrm{CO_2 \uparrow}` |
| thuận nghịch | `\mathrm{N_2 + 3H_2 \rightleftharpoons 2NH_3}` |
| đồng vị | `{}^{14}_{6}\mathrm{C}` |

### Ký hiệu, đơn vị
- Hy Lạp: `\alpha \beta \lambda \mu \rho \omega \pi \Delta \Omega`
- So sánh / phép toán: `\le \ge \ne \approx \times \cdot \pm`
- Đơn vị ghép: `\mathrm{m/s^2}`, `\mathrm{J/(mol\cdot K)}`, `\mathrm{kg\cdot m^{-3}}`
- Số kèm đơn vị: `8{,}31\ \mathrm{J/(mol\cdot K)}` (`\ ` là dấu cách)
- Tổng, tích phân, giới hạn: `\sum_{i=1}^{n}`, `\int_0^1 x^2\,dx`, `\lim_{x \to 0}`
- Hệ phương trình: `\begin{cases} x + y = 5 \\ x - y = 1 \end{cases}` (trong JSON: `\\begin{cases} ... \\\\ ... \\end{cases}`)

## 4. Cách sửa một file JSON cũ

Chỉ sửa **chữ**; giữ nguyên mọi thứ điều khiển chấm điểm.

1. Chạy rà soát: `node scripts/audit-math.mjs "<thư mục hoặc file>"` (trong dự án portal). Nó liệt kê dòng có phân số chữ thường mà mẫu nhiều nhân tử. Đây là chỗ app dễ đoán sai. Danh sách ngắn, xem hết.
2. Ngoài danh sách đó, tự tìm trong file: `/` giữa các biến, `1/2mv²`, `1/2π`, `p=1/3Nmv²/V`, `⟨ ⟩`, `Eđ` có gạch trên, `Cu(OH)2`, `H2SO4`, số mũ / chỉ số viết bằng chữ thường.
3. Thay bằng `$...$` theo mục 3. Công thức đã đúng ở dạng `$...$` thì để nguyên.
4. Không dùng tìm-và-thay hàng loạt mù quáng. Đọc từng chỗ: `kg/mol`, `m/s`, `A/B/C/D`, ngày `12/10`, mã câu `cd6-m4-tn-21` KHÔNG phải phân số.

### TUYỆT ĐỐI không đổi (nhập lại sẽ cập nhật tại chỗ và giữ bài làm học sinh)
- Mọi `id` (id bài `lesson.id`, id câu, id ý đúng/sai a–d, id điền khuyết). App ghép câu cũ ↔ câu mới theo `id`.
- Thứ tự câu, số câu (bớt / thêm câu = xóa / thêm câu, mất bài làm của câu bị bỏ).
- `answer` / `correct`, `label` và số phương án trắc nghiệm, thứ tự phương án. Nếu đổi, app dừng lại hỏi vì điểm học sinh đã chấm có thể lệch.
- Tiêu đề bài (`part`, `topic`): bài cũ chưa có mã được ghép theo tiêu đề.

Nếu bắt buộc phải đổi những mục trên (ví dụ đáp án sai), ghi riêng thành danh sách để gia sư duyệt, không tự ý đổi lẫn với việc sửa công thức.

## 5. Kiểm tra trước khi giao lại

- `JSON.parse` thành công.
- Chạy lại `node scripts/audit-math.mjs` trên file đã sửa: không còn dòng mơ hồ nào chưa xử lý.
- Cặp `$` luôn chẵn trong từng chuỗi; `{ }` trong công thức cân nhau.
- Mở app, Nhập bài, xem trước: các công thức vừa sửa hiển thị đúng (đặc biệt phân số, gạch trên, chỉ số hóa học).
- Báo cáo ngắn: số file đã sửa, số công thức đã đổi, danh sách chỗ nghi ngờ chưa chắc.

## 6. Công thức chữ thường cũ (chỉ để hiểu)

Bài cũ chưa có `$...$` vẫn hiển thị nhờ `src/lib/autoMath.js` tự đoán lúc hiển thị (không sửa dữ liệu). Nó đoán đúng phần lớn nhưng không đáng tin với phân số mẫu nhiều nhân tử, chữ Hy Lạp dính sau số (`2/3μm`), và ký hiệu trung bình. Đó là lý do chuyển sang `$...$`.

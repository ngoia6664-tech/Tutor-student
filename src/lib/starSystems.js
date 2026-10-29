// Nội dung các hệ sao ngoài Hệ Mặt Trời trong Kính thiên văn — hiển thị Y HỆT Hệ Mặt Trời (SpaceExplorer):
// cảnh 3D kéo xoay / phóng to (components/telescope/AltSolar.jsx, cùng class .solar-* của nền), bấm thiên thể thì gấu giải thích.
// Danh sách địa điểm + ngưỡng Sao ở lib/telescope.js; file này chỉ chứa địa điểm đã làm xong.
// Số liệu làm tròn từ NASA Exoplanet Archive, ESO, các bài báo phát hiện (Agol 2021 cho TRAPPIST-1, Shallue & Vanderburg 2018 cho Kepler-90).
//
// Mỗi hệ:
//   center  — sao ở giữa { key, size px } (Alpha Centauri không có: A, B cùng quay quanh khối tâm)
//   orbits  — [{ key, d: đường kính quỹ đạo px, size px, period giây, start độ, moon? }] (như PLANETS của SpaceBackdrop)
//             Kích thước + khoảng cách KHÔNG theo tỷ lệ; tỉ lệ chu kỳ giữa các hành tinh theo số thật.
//   bodies  — { key: { name, tag, g?, stats, about, related?, look } } giống BODIES của Hệ Mặt Trời.
//             look = { type: 'star' | 'rock' | 'mini' | 'gas', c: [sáng, giữa, tối] } → màu trên cảnh + chân dung (PlanetPortrait)
//   facts   — gấu kể chuyện (bấm gấu / Mục lục), [tiêu đề, nội dung]
//   greeting — lời chào trong bong bóng gấu

// g bề mặt từ khối lượng + bán kính (lần Trái Đất): g = 9,8·M/R²
const gOf = (mass, radius) => Math.round((98 * mass) / radius ** 2) / 10

const ALPHA = {
  greeting: 'Chào mừng tới hàng xóm gần nhất của Mặt Trời! Ở đây có tới ba ngôi sao. Bấm vào mình để nghe chuyện, hoặc bấm một ngôi sao để mình giải thích nhé!',
  orbits: [
    // A nặng hơn B (≈ 1,1 : 0,9) → vòng quay quanh khối tâm nhỏ hơn; A, B luôn ở hai phía đối diện
    { key: 'alpha-a', d: 170, size: 80, period: 40, start: 0 },
    { key: 'alpha-b', d: 210, size: 64, period: 40, start: 180 },
    // Proxima ở rất xa (khoảng cách đã rút ngắn rất nhiều), Proxima b quay sát nó
    { key: 'proxima', d: 900, size: 40, period: 900, start: 35, moon: { key: 'proxima-b', r: 20, size: 6, period: 5 } },
  ],
  bodies: {
    'alpha-a': {
      name: 'Alpha Centauri A',
      tag: 'Sao vàng lớp G2, "anh em" của Mặt Trời',
      look: { type: 'star', c: ['#fff1b8', '#f5c542', '#c2770c'] },
      stats: [['Khối lượng', '≈ 1,1 lần Mặt Trời'], ['Bán kính', '≈ 1,2 lần Mặt Trời'], ['Độ sáng', '≈ 1,5 lần Mặt Trời'], ['Nhiệt độ', 'bề mặt ≈ 5 800 K'], ['Cách Trái Đất', '≈ 4,37 năm ánh sáng']],
      about: [
        'A cùng loại sao vàng với Mặt Trời, chỉ lớn và sáng hơn một chút.',
        'A và B là một hệ sao đôi: cả hai cùng quay quanh khối tâm chung, mỗi vòng khoảng 80 năm. A nặng hơn nên vòng quay của A quanh khối tâm nhỏ hơn của B — giống như người nặng ngồi gần điểm tựa của bập bênh hơn.',
      ],
      related: 'alpha-b',
    },
    'alpha-b': {
      name: 'Alpha Centauri B',
      tag: 'Sao cam lớp K1, nhỏ và mát hơn Mặt Trời',
      look: { type: 'star', c: ['#ffd29a', '#f59e42', '#b4530e'] },
      stats: [['Khối lượng', '≈ 0,9 lần Mặt Trời'], ['Bán kính', '≈ 0,86 lần Mặt Trời'], ['Độ sáng', '≈ 0,5 lần Mặt Trời'], ['Nhiệt độ', 'bề mặt ≈ 5 300 K'], ['Chu kỳ quanh A', '≈ 80 năm']],
      about: [
        'Quỹ đạo của cặp A–B khá dẹt nên khoảng cách giữa hai sao thay đổi từ khoảng 11 AU đến 36 AU (1 AU ≈ khoảng cách Trái Đất – Mặt Trời). Trung bình khoảng 23 AU, xa hơn từ Mặt Trời tới Sao Thiên Vương một chút.',
        'Nhìn bằng mắt thường, A và B hòa thành một chấm sáng — sáng thứ ba trên bầu trời đêm, sau Sirius và Canopus.',
      ],
      related: 'alpha-a',
    },
    proxima: {
      name: 'Proxima Centauri',
      tag: 'Sao lùn đỏ, ngôi sao gần Mặt Trời nhất',
      look: { type: 'star', c: ['#ffb199', '#ef5a3c', '#8f1d0c'] },
      stats: [['Khối lượng', '≈ 0,12 lần Mặt Trời'], ['Bán kính', '≈ 0,15 lần Mặt Trời'], ['Nhiệt độ', 'bề mặt ≈ 3 000 K'], ['Cách Trái Đất', '≈ 4,24 năm ánh sáng'], ['Cách cặp A–B', '≈ 13 000 AU (≈ 0,2 năm ánh sáng)']],
      about: [
        'Trên màn hình, Proxima đã được kéo lại gần cho vừa khung nhìn. Thật ra nó cách cặp A–B hơn 500 lần khoảng cách trung bình giữa A và B.',
        'Proxima được cho là quay quanh cặp A–B, mỗi vòng khoảng 550 000 năm.',
        'Dù là sao gần ta nhất, Proxima quá mờ để nhìn bằng mắt thường. Nó là sao lóe sáng: thỉnh thoảng bùng sáng rất mạnh trong thời gian ngắn.',
      ],
      related: 'proxima-b',
    },
    'proxima-b': {
      name: 'Proxima b',
      tag: 'Hành tinh quay quanh Proxima Centauri',
      look: { type: 'rock', c: ['#a9c6ff', '#5b7fc4', '#2c3f6b'] },
      stats: [['Phát hiện', '2016, đo sao "lắc lư" do lực hút của hành tinh'], ['Khối lượng', '≥ 1,07 lần Trái Đất'], ['Một năm', '≈ 11,2 ngày'], ['Cách sao', '≈ 0,05 AU (gần sao hơn Sao Thủy gần Mặt Trời ≈ 8 lần)']],
      about: [
        'Vì Proxima rất mờ, Proxima b dù ở sát sao vẫn nằm trong vùng có thể có nước lỏng trên bề mặt — nếu có khí quyển phù hợp.',
        'Chưa biết Proxima b có khí quyển hay nước không. Hành tinh hứng nhiều tia X và các đợt lóe sáng mạnh từ Proxima, điều có thể thổi bay khí quyển.',
        'Chưa đo được bán kính vì nhìn từ Trái Đất, hành tinh không đi ngang qua trước mặt sao; nên cũng chưa tính được g trên bề mặt.',
      ],
      related: 'proxima',
    },
  },
  facts: [
    ['Hệ ba sao', 'Alpha Centauri gồm 3 ngôi sao: A và B ở gần nhau tạo thành hệ sao đôi, Proxima là thành viên thứ ba ở rất xa. Cả hệ cách Trái Đất khoảng 4,2–4,4 năm ánh sáng, nằm ở chòm Bán Nhân Mã trên bầu trời phía nam.'],
    ['Sao đôi quay thế nào?', 'Hai sao hút nhau bằng lực hấp dẫn và cùng quay quanh khối tâm chung. Khối tâm gần sao nặng hơn: `m_A·r_A = m_B·r_B`. A nặng ≈ 1,1 lần Mặt Trời, B ≈ 0,9 lần, nên A đi vòng nhỏ hơn B. Một vòng mất khoảng 80 năm.'],
    ['Năm ánh sáng là gì?', 'Năm ánh sáng đo quãng đường, không đo thời gian: đó là quãng đường ánh sáng đi trong một năm, `s = c·t ≈ 3·10⁸ m/s × 3,15·10⁷ s ≈ 9,46·10¹⁵ m`. Ánh sáng từ Proxima phải đi khoảng 4,24 năm mới tới mắt ta, nên ta đang thấy Proxima của hơn 4 năm trước.'],
    ['Xa đến mức nào?', 'Tàu Voyager 1 bay khoảng 17 km/s, là một trong những vật nhanh nhất con người từng phóng xa. Với tốc độ đó, đi tới Proxima mất hơn 70 000 năm.'],
    ['Khoảng cách trên màn hình', 'Để vừa khung nhìn, Proxima đã được kéo lại rất gần. Thật ra Proxima cách cặp A–B khoảng 13 000 AU (≈ 0,2 năm ánh sáng), gấp hơn 500 lần khoảng cách trung bình giữa A và B.'],
    ['Proxima b', 'Năm 2016, các nhà thiên văn thấy Proxima hơi "lắc lư" đều đặn mỗi 11,2 ngày: dấu hiệu có một hành tinh nặng ít nhất bằng Trái Đất đang kéo nó. Hành tinh này nằm trong vùng có thể có nước lỏng, nhưng chưa ai biết nó có khí quyển hay nước thật không.'],
  ],
}

// Hành tinh TRAPPIST-1: [chữ, bán kính, khối lượng (lần Trái Đất), chu kỳ (ngày), năng lượng nhận (lần Trái Đất), tag, màu, about]
const TRAPPIST_PLANETS = [
  ['b', 1.12, 1.37, 1.511, 4.2, 'Gần sao nhất, quá nóng', ['#f7c1a0', '#d9774e', '#7a3418'], ['Nhận năng lượng từ sao gấp khoảng 4 lần Trái Đất nhận từ Mặt Trời.', 'Kính James Webb (2023) đo mặt ban ngày của b nóng khoảng 500 K (≈ 230 °C) và chưa thấy dấu hiệu khí quyển dày.']],
  ['c', 1.1, 1.31, 2.422, 2.2, 'Hành tinh đá nóng', ['#ead0b2', '#bf8a5e', '#6b4527'], ['Nhận năng lượng gấp khoảng 2 lần Trái Đất.', 'Quan sát của kính James Webb (2023) cho thấy c không có khí quyển dày giàu CO₂ như Sao Kim.']],
  ['d', 0.79, 0.39, 4.05, 1.1, 'Nhỏ, sát mép trong vùng nước lỏng', ['#f1dfc0', '#c9a777', '#7b6140'], ['d nhỏ hơn Trái Đất (≈ 0,8 lần bán kính) và nhẹ hơn nhiều (≈ 0,4 lần khối lượng).', 'Nhận năng lượng gần bằng Trái Đất, nhưng có nước lỏng hay không còn tùy khí quyển — hiện chưa biết.']],
  ['e', 0.92, 0.69, 6.101, 0.65, 'Trong vùng có thể có nước lỏng', ['#b9dcff', '#4f8fd1', '#1f4a7a'], ['e có kích thước và mật độ khá giống Trái Đất nên hay được nhắc tới khi tìm hành tinh giống Trái Đất.', 'Nằm trong vùng có thể có nước lỏng không có nghĩa là có nước: chưa xác nhận nước lỏng hay sự sống trên e.']],
  ['f', 1.05, 1.04, 9.208, 0.38, 'Trong vùng có thể có nước lỏng', ['#c7f0e8', '#5fb7a8', '#24594f'], ['f nhận khoảng 40 % năng lượng so với Trái Đất; nếu không có khí quyển giữ nhiệt, bề mặt sẽ rất lạnh.', 'Chưa xác nhận f có nước lỏng hay sự sống.']],
  ['g', 1.13, 1.32, 12.352, 0.26, 'Lớn nhất hệ, mép ngoài vùng nước lỏng', ['#d4e0ff', '#7f98da', '#3a4a80'], ['g là hành tinh lớn nhất của TRAPPIST-1, bán kính lớn hơn Trái Đất khoảng 13 %.', 'Chỉ nhận khoảng một phần tư năng lượng so với Trái Đất.']],
  ['h', 0.76, 0.33, 18.773, 0.15, 'Xa nhất, nhỏ nhất, lạnh nhất', ['#e4dcf5', '#a493cc', '#54467a'], ['h nhỏ nhất hệ (≈ 0,76 bán kính Trái Đất) và chỉ nhận khoảng 15 % năng lượng so với Trái Đất.', 'Dù xa nhất, một năm trên h cũng chỉ dài khoảng 19 ngày.']],
]

const vn = (n, digits) => (digits === undefined ? String(n) : n.toFixed(digits)).replace('.', ',')

const TRAPPIST = {
  greeting: 'Ánh sáng đỏ ấm thế này là của một sao lùn đỏ siêu mát! Bảy hành tinh cỡ Trái Đất quay rất sát nó. Bấm vào mình để nghe chuyện, hoặc bấm một hành tinh nhé!',
  center: { key: 'trappist-1', size: 120 },
  orbits: TRAPPIST_PLANETS.map(([k, radius, , period], i) => ({
    key: k,
    d: 230 + i * 95,
    size: Math.round(10 * radius),
    period: Math.round(period * 8), // 8 giây cho mỗi ngày thật: tỉ lệ chu kỳ đúng như số thật
    start: (i * 137) % 360,
  })),
  bodies: {
    'trappist-1': {
      name: 'Sao TRAPPIST-1',
      tag: 'Sao lùn đỏ siêu mát lớp M8',
      look: { type: 'star', c: ['#ffb08a', '#ff5a2a', '#8c1a05'] },
      stats: [['Khối lượng', '≈ 0,09 lần Mặt Trời'], ['Bán kính', '≈ 0,12 lần Mặt Trời (lớn hơn Sao Mộc một chút)'], ['Nhiệt độ', 'bề mặt ≈ 2 570 K'], ['Độ sáng', '≈ 0,05 % Mặt Trời'], ['Cách Trái Đất', '≈ 40 năm ánh sáng']],
      about: [
        'Ngôi sao mờ và mát đến mức phát phần lớn năng lượng ở vùng hồng ngoại, mắt người không thấy được.',
        'Sao lùn đỏ "đốt" nhiên liệu rất chậm nên có thể sống lâu hơn Mặt Trời hàng trăm lần.',
      ],
    },
    ...Object.fromEntries(
      TRAPPIST_PLANETS.map(([k, radius, mass, period, flux, tag, c, about]) => [
        k,
        {
          name: `TRAPPIST-1${k}`,
          tag,
          g: gOf(mass, radius),
          look: { type: 'rock', c },
          stats: [
            ['Bán kính', `≈ ${vn(radius)} lần Trái Đất`],
            ['Khối lượng', `≈ ${vn(mass)} lần Trái Đất`],
            ['Một năm', `≈ ${vn(period, 1)} ngày`],
            ['Năng lượng nhận', `≈ ${vn(flux)} lần Trái Đất`],
          ],
          about,
        },
      ])
    ),
  },
  facts: [
    ['7 hành tinh cỡ Trái Đất', 'TRAPPIST-1 cách ta khoảng 40 năm ánh sáng, ở chòm Bảo Bình. Năm 2016–2017, kính TRAPPIST và kính không gian Spitzer tìm ra 7 hành tinh đá quay quanh nó, đặt tên từ b tới h theo thứ tự từ trong ra ngoài.'],
    ['Tìm hành tinh bằng "bóng"', 'Các hành tinh được phát hiện bằng phương pháp quá cảnh: mỗi lần một hành tinh đi ngang qua trước sao, ánh sáng sao mờ đi một chút. Độ mờ cho biết kích thước hành tinh, khoảng thời gian giữa hai lần mờ là chu kỳ quỹ đạo.'],
    ['Cả hệ nhỏ hơn quỹ đạo Sao Thủy', 'Hành tinh xa nhất (h) chỉ cách sao khoảng 0,06 AU, trong khi Sao Thủy cách Mặt Trời khoảng 0,39 AU. Đứng trên một hành tinh, các hành tinh khác có thể hiện trên trời to hơn Mặt Trăng nhìn từ Trái Đất.'],
    ['Vùng có thể có nước lỏng', 'Là khoảng cách tới sao mà ở đó, nếu hành tinh có khí quyển phù hợp, nước có thể ở thể lỏng trên bề mặt — không nóng tới mức sôi hết, không lạnh tới mức đóng băng hết. Ở TRAPPIST-1, e, f, g thường được xếp vào vùng này. Đây chỉ là điều kiện cần: chưa hành tinh nào được xác nhận có nước lỏng hay sự sống.'],
    ['Chuỗi cộng hưởng quỹ đạo', 'Chu kỳ của các hành tinh liền kề gần đúng theo tỉ số nguyên, như 8:5, 5:3, 3:2. Nhờ vậy các hành tinh kéo nhau đều đặn mà không va vào nhau, như một dàn nhạc giữ nhịp. Trên màn hình, tỉ lệ tốc độ giữa các hành tinh đúng theo chu kỳ thật.'],
    ['Luôn một mặt về phía sao', 'Ở quá gần sao, các hành tinh có lẽ bị khóa thủy triều: luôn quay một mặt về phía sao, giống Mặt Trăng luôn quay một mặt về Trái Đất. Một nửa luôn là ngày, nửa kia luôn là đêm.'],
    ['Tính g từ khối lượng và bán kính', 'Gia tốc trọng trường trên bề mặt `g = GM/R²`. So với Trái Đất: `g = 9,8·(M/M_TĐ)/(R/R_TĐ)²`. Ví dụ TRAPPIST-1e có M ≈ 0,69 và R ≈ 0,92 lần Trái Đất nên `g ≈ 9,8·0,69/0,92² ≈ 8 m/s²`. Bấm từng hành tinh để xem g của nó.'],
  ],
}

// Hành tinh Kepler-90: [chữ, bán kính (lần Trái Đất), chu kỳ (ngày), bán trục lớn (AU), tag, look, about]
const KEPLER_PLANETS = [
  ['b', 1.31, 7.008, 0.074, 'Hành tinh nhỏ, nóng, gần sao nhất', { type: 'rock', c: ['#e8cdb0', '#b88760', '#5e3f26'] }, ['Lớn hơn Trái Đất một chút, quay sát sao nên rất nóng. Một năm chỉ khoảng 7 ngày.']],
  ['c', 1.18, 8.719, 0.089, 'Hành tinh nhỏ nhất hệ', { type: 'rock', c: ['#dcd6cf', '#a49c92', '#57514a'] }, ['Bán kính chỉ lớn hơn Trái Đất khoảng 18 %, quay ngay sau b.']],
  ['i', 1.32, 14.449, 0.107, 'Hành tinh thứ 8, tìm ra nhờ AI (2017)', { type: 'rock', c: ['#f3c99a', '#d0834a', '#7a4019'] }, ['Các nhà nghiên cứu ở Google và NASA dùng mạng nơ-ron (học máy) soi lại dữ liệu kính Kepler và tìm ra tín hiệu rất mờ của Kepler-90i.', 'Hành tinh rất nóng: bề mặt ước tính trên 400 °C.']],
  ['d', 2.88, 59.737, 0.32, 'Cỡ "tiểu Hải Vương"', { type: 'mini', c: ['#cfe6f7', '#79aedb', '#3b6d99'] }, ['Lớn gần gấp 3 Trái Đất — cỡ hành tinh nằm giữa Trái Đất và Sao Hải Vương, loại không có trong Hệ Mặt Trời.']],
  ['e', 2.67, 91.939, 0.42, 'Cỡ "tiểu Hải Vương"', { type: 'mini', c: ['#d4f1ee', '#80c4bf', '#3b7c77'] }, ['Cùng nhóm kích thước với d và f. Một năm khoảng 92 ngày.']],
  ['f', 2.89, 124.914, 0.48, 'Cỡ "tiểu Hải Vương"', { type: 'mini', c: ['#dfe3fb', '#94a2e0', '#46549a'] }, ['Cách sao khoảng 0,48 AU — xa hơn khoảng cách Sao Thủy tới Mặt Trời (≈ 0,39 AU) một chút.']],
  ['g', 8.13, 210.607, 0.71, 'Hành tinh khí khổng lồ', { type: 'gas', c: ['#f2dfc0', '#d2ad7c', '#9a7346'] }, ['Bán kính khoảng 8 lần Trái Đất, gần bằng Sao Thổ (≈ 0,86 lần).', 'Chưa đo chắc khối lượng nên chưa tính được g.']],
  ['h', 11.32, 331.601, 1.01, 'Lớn nhất hệ, cỡ Sao Mộc', { type: 'gas', c: ['#f6e3c6', '#d9a873', '#a0662f'] }, ['Gần bằng Sao Mộc và quay quanh sao ở khoảng 1 AU — bằng khoảng cách Trái Đất – Mặt Trời. Một năm khoảng 332 ngày.']],
]

const KEPLER = {
  greeting: 'Hệ này xa tới khoảng 2 500 năm ánh sáng mà có tới 8 hành tinh, bằng Hệ Mặt Trời! Bấm vào mình để nghe chuyện, hoặc bấm một hành tinh nhé!',
  center: { key: 'kepler-90', size: 150 },
  orbits: KEPLER_PLANETS.map(([k, radius, period], i) => ({
    key: k,
    d: [210, 275, 340, 455, 565, 675, 805, 955][i],
    size: Math.round(6 + 5 * radius ** 0.6),
    period: Math.round(period * 1.2), // tỉ lệ chu kỳ đúng như số thật
    start: (i * 97 + 30) % 360,
  })),
  bodies: {
    'kepler-90': {
      name: 'Sao Kepler-90',
      tag: 'Sao giống Mặt Trời, hơi lớn và nóng hơn',
      look: { type: 'star', c: ['#fff4d6', '#f7d27a', '#c98a1c'] },
      stats: [['Khối lượng', '≈ 1,1–1,2 lần Mặt Trời'], ['Bán kính', '≈ 1,2 lần Mặt Trời'], ['Nhiệt độ', 'bề mặt ≈ 6 000 K'], ['Cách Trái Đất', '≈ 2 500 năm ánh sáng'], ['Chòm sao', 'Thiên Long (Draco)']],
      about: [
        'Ánh sáng từ Kepler-90 phải đi khoảng 2 500 năm mới tới Trái Đất: ta đang thấy ngôi sao này của 2 500 năm trước.',
        'Ngôi sao quá mờ để nhìn bằng mắt thường; kính Kepler tìm ra các hành tinh nhờ đo ánh sáng sao mờ đi rất ít mỗi khi một hành tinh đi ngang qua.',
      ],
    },
    ...Object.fromEntries(
      KEPLER_PLANETS.map(([k, radius, period, au, tag, look, about]) => [
        k,
        {
          name: `Kepler-90${k}`,
          tag,
          look,
          stats: [['Bán kính', `≈ ${vn(radius, 1)} lần Trái Đất`], ['Một năm', `≈ ${vn(period, 0)} ngày`], ['Cách sao', `≈ ${vn(au)} AU`]],
          about,
        },
      ])
    ),
  },
  facts: [
    ['8 hành tinh, bằng Hệ Mặt Trời', 'Kepler-90 thuộc nhóm hệ ngoại hành tinh có nhiều hành tinh nhất từng được biết: 8 hành tinh, bằng Hệ Mặt Trời. Tất cả được kính không gian Kepler phát hiện bằng phương pháp quá cảnh.'],
    ['Một Hệ Mặt Trời "thu nhỏ"', 'Giống Hệ Mặt Trời: hành tinh nhỏ ở phía trong, hành tinh khí khổng lồ ở phía ngoài. Khác: cả 8 hành tinh chen trong khoảng 1 AU — trong cùng khoảng đó, Hệ Mặt Trời chỉ có Sao Thủy, Sao Kim và Trái Đất. Sao Hải Vương của ta cách Mặt Trời tới khoảng 30 AU.'],
    ['Hành tinh tìm ra nhờ AI', 'Năm 2017, các nhà nghiên cứu ở Google và NASA huấn luyện mạng nơ-ron nhận ra tín hiệu quá cảnh, rồi cho nó soi lại dữ liệu cũ của kính Kepler. Nó tìm ra một tín hiệu rất mờ: hành tinh thứ 8, Kepler-90i.'],
    ['Tiểu Hải Vương', 'd, e, f có bán kính gần gấp 3 Trái Đất — lớn hơn hành tinh đá nhưng nhỏ hơn Sao Hải Vương. Loại hành tinh này rất phổ biến trong Ngân Hà nhưng Hệ Mặt Trời lại không có cái nào.'],
    ['Kepler III ở hệ khác', 'Định luật Kepler III `T² ~ a³` đúng cho mọi hệ hành tinh. Kepler-90h cách sao khoảng 1 AU mà một năm ≈ 332 ngày, ngắn hơn năm Trái Đất một chút, vì sao Kepler-90 nặng hơn Mặt Trời: `T² = a³/M` (T tính bằng năm, a bằng AU, M bằng khối lượng Mặt Trời).'],
    ['Khoảng cách trên màn hình', 'Để dễ nhìn, quỹ đạo được vẽ giãn đều và hành tinh được phóng to; khoảng cách thật không theo tỷ lệ này. Tỉ lệ tốc độ giữa các hành tinh thì đúng theo chu kỳ thật: b quay khoảng 47 vòng trong lúc h quay 1 vòng.'],
  ],
}

export const SYSTEMS = {
  'alpha-centauri': ALPHA,
  'trappist-1': TRAPPIST,
  'kepler-90': KEPLER,
}

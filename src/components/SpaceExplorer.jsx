import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { FrontPanda } from './PandaArt.jsx'
import PlanetPortrait from './PlanetPortrait.jsx'
import SpaceMusic from './SpaceMusic.jsx'
import {
  getMusicStatus,
  getVolume,
  isSoundOn,
  onMusicStatus,
  playFocus,
  playPandaTalk,
  playWhoosh,
  setSoundOn,
  setVolume,
  startAmbient,
  startMusic,
  stopAmbient,
  stopMusic,
} from '../lib/spaceSound.js'
import '../styles/explorer.css'

// Chế độ ngắm vũ trụ (tải lười từ Layout): dùng lại chính hệ Mặt Trời của nền (SpaceBackdrop), không vẽ thêm.
// Kéo để xoay góc nhìn, lăn chuột / chụm 2 ngón để phóng to, bấm hành tinh xem số liệu Vật lý. Esc để thoát.
const G_EARTH = 9.8
// Bấm hành tinh / Mặt Trời: gấu giải thích trong bong bóng. stats = [nhãn, giá trị], about = các đoạn giải thích
const BODIES = {
  sun: {
    name: 'Mặt Trời',
    tag: 'Ngôi sao duy nhất của hệ',
    g: 274,
    stats: [['Bán kính', '696 000 km (≈ 109 lần Trái Đất)'], ['Nhiệt độ', 'bề mặt ≈ 5 500 °C, lõi ≈ 15 triệu °C'], ['Tự quay', '≈ 25 ngày (ở xích đạo)']],
    about: [
      'Mặt Trời là một ngôi sao, chiếm khoảng 99,86% khối lượng cả hệ. Vì nặng như vậy nên lực hấp dẫn của nó giữ được mọi hành tinh, tiểu hành tinh và sao chổi quay quanh.',
      'Năng lượng sinh ra ở lõi nhờ phản ứng nhiệt hạch: 4 hạt nhân hiđrô tổng hợp thành 1 hạt nhân heli, phần khối lượng hao hụt (khoảng 0,7%) biến thành năng lượng theo E = mc².',
      'Mặt Trời không có bề mặt rắn, nó là khối plasma nóng nên quay không đều: xích đạo quay hết khoảng 25 ngày, gần hai cực mất tới khoảng 35 ngày.',
      'Ánh sáng đi từ Mặt Trời tới Trái Đất mất khoảng 8 phút 20 giây, nên khi nhìn Mặt Trời ta đang thấy nó của hơn 8 phút trước.',
    ],
  },
  mercury: {
    name: 'Sao Thủy',
    tag: 'Nhỏ nhất, nhanh nhất',
    g: 3.7,
    stats: [['Cách Mặt Trời', '≈ 0,39 AU (58 triệu km)'], ['Một năm', '88 ngày'], ['Tự quay', '≈ 59 ngày']],
    about: [
      'Hành tinh nhỏ nhất và gần Mặt Trời nhất. Theo định luật Kepler III, quỹ đạo càng nhỏ thì chu kì càng ngắn, nên một năm ở đây chỉ 88 ngày Trái Đất.',
      'Sao Thủy gần như không có khí quyển để giữ nhiệt: phía ban ngày nóng khoảng 430 °C, phía ban đêm lạnh tới khoảng −180 °C, chênh lệch hơn 600 °C.',
      'Bề mặt đầy hố va chạm giống Mặt Trăng, vì không có gió hay nước để bào mòn dấu vết thiên thạch rơi xuống.',
    ],
  },
  venus: {
    name: 'Sao Kim',
    tag: 'Lò nhà kính rực sáng',
    g: 8.9,
    stats: [['Cách Mặt Trời', '≈ 0,72 AU (108 triệu km)'], ['Một năm', '225 ngày'], ['Tự quay', '243 ngày, quay ngược chiều']],
    about: [
      'Sao Kim gần bằng Trái Đất về kích thước và khối lượng, nhưng khí quyển dày đặc CO₂ với áp suất bề mặt gấp khoảng 92 lần Trái Đất.',
      'Hiệu ứng nhà kính cực mạnh giữ nhiệt lại, làm Sao Kim nóng khoảng 465 °C, nóng hơn cả Sao Thủy dù ở xa Mặt Trời hơn.',
      'Nó tự quay rất chậm và ngược chiều các hành tinh khác: một ngày (243 ngày Trái Đất) dài hơn cả một năm (225 ngày), Mặt Trời mọc ở phía tây.',
      'Đây là thiên thể sáng nhất bầu trời đêm sau Mặt Trăng, thường gọi là sao Hôm (chiều tối) hoặc sao Mai (sáng sớm).',
    ],
  },
  earth: {
    name: 'Trái Đất',
    tag: 'Hành tinh xanh của chúng ta',
    g: 9.8,
    related: 'moon',
    stats: [
      ['Cách Mặt Trời', '1 AU ≈ 150 triệu km'],
      ['Một năm', '365,25 ngày'],
      ['Tự quay', '≈ 23 giờ 56 phút'],
      ['Bán kính', '≈ 6 371 km'],
      ['Khối lượng', '≈ 5,97·10²⁴ kg'],
      ['Tuổi', '≈ 4,54 tỉ năm'],
    ],
    about: [
      'Trái Đất nằm trong "vùng có thể sống được": không quá nóng, không quá lạnh để nước tồn tại ở thể lỏng. Khoảng 71% bề mặt là nước, nên nhìn từ vũ trụ nó là một viên bi xanh.',
      '"Cân" Trái Đất bằng Vật lý: từ g = GM/R² suy ra M = gR²/G. Thay g = 9,8 m/s², R = 6,37·10⁶ m, G = 6,67·10⁻¹¹ được M ≈ 6·10²⁴ kg. Năm 1798, Cavendish đo được G bằng cân xoắn, nên ông được gọi là "người đầu tiên cân Trái Đất".',
      'Trái Đất không tròn tuyệt đối: do tự quay, nó hơi phình ở xích đạo, bán kính xích đạo lớn hơn bán kính cực khoảng 21 km. Cộng thêm hiệu ứng quay, g ở xích đạo khoảng 9,78 m/s², ở hai cực khoảng 9,83 m/s².',
      'Đứng yên mà bạn vẫn đang bay rất nhanh: người ở xích đạo quay theo Trái Đất với tốc độ khoảng 465 m/s (≈ 1 670 km/h), và cả Trái Đất lao quanh Mặt Trời với khoảng 30 km/s. Lực hấp dẫn của Mặt Trời đóng vai trò lực hướng tâm: GMm/r² = mv²/r.',
      'Khí quyển gồm khoảng 78% nitơ, 21% ôxi. Bầu trời màu xanh vì phân tử khí tán xạ ánh sáng bước sóng ngắn mạnh hơn nhiều (cường độ tán xạ tỉ lệ 1/λ⁴, tán xạ Rayleigh). Lúc hoàng hôn ánh sáng đi qua lớp khí dày, màu xanh bị tán xạ hết, còn lại đỏ cam.',
      'Bên trong gồm vỏ mỏng, lớp manti đá nóng, lõi ngoài sắt – niken lỏng và lõi trong rắn nóng khoảng 5 400 °C (ngang bề mặt Mặt Trời). Kim loại lỏng chuyển động ở lõi ngoài tạo ra từ trường, như tấm khiên làm lệch gió Mặt Trời và sinh ra cực quang.',
      'Trục quay nghiêng khoảng 23,5° nên có bốn mùa. Chính Mặt Trăng giữ cho độ nghiêng này khá ổn định qua hàng triệu năm, nhờ vậy khí hậu Trái Đất không bị đảo lộn thất thường.',
      'Ngày đang dài ra: ma sát thủy triều do Mặt Trăng gây ra hãm dần sự tự quay, mỗi thế kỉ một ngày dài thêm khoảng 2 mili giây. Cuối thời khủng long (khoảng 70 triệu năm trước), một ngày chỉ khoảng 23,5 giờ.',
    ],
  },
  moon: {
    name: 'Mặt Trăng',
    tag: 'Người bạn đồng hành',
    g: 1.62,
    related: 'earth',
    stats: [
      ['Cách Trái Đất', '≈ 384 400 km (≈ 60 lần bán kính TĐ)'],
      ['Quay quanh TĐ', '≈ 27,3 ngày'],
      ['Tuần trăng', '≈ 29,5 ngày'],
      ['Bán kính', '≈ 1 737 km (≈ 0,27 lần TĐ)'],
      ['Khối lượng', '≈ 7,35·10²² kg (≈ 1/81 TĐ)'],
      ['Nhiệt độ', 'ngày ≈ 120 °C, đêm ≈ −170 °C'],
    ],
    about: [
      'Mặt Trăng có lẽ sinh ra từ một vụ va chạm khổng lồ khoảng 4,5 tỉ năm trước: một thiên thể cỡ Sao Hỏa (gọi là Theia) đâm vào Trái Đất trẻ, vật chất văng ra quay quanh Trái Đất rồi kết tụ thành Mặt Trăng.',
      '"Phép thử Mặt Trăng" của Newton: Mặt Trăng cách tâm Trái Đất khoảng 60 lần bán kính, nên nếu lực hấp dẫn giảm theo 1/r² thì gia tốc của nó phải bằng g/60² ≈ 0,0027 m/s². Tính từ chu kì 27,3 ngày đúng ra a = 4π²r/T² ≈ 0,0027 m/s². Quả táo rơi và Mặt Trăng quay cùng chung một lực!',
      'Mặt Trăng luôn quay một mặt về Trái Đất vì chu kì tự quay bằng chu kì quay quanh Trái Đất (khóa thủy triều). Mặt sau không phải "mặt tối": nó vẫn được Mặt Trời chiếu sáng, chỉ là ta không bao giờ thấy từ Trái Đất.',
      'Không có khí quyển nên không có lực cản: năm 1971, phi hành gia David Scott (Apollo 15) thả một cái búa và một chiếc lông chim cùng lúc, cả hai chạm đất cùng lúc, đúng như Galilê dự đoán: mọi vật rơi tự do với cùng gia tốc.',
      'Cũng vì không có khí quyển giữ nhiệt và không có gió, nhiệt độ chênh lệch cực lớn giữa ngày và đêm, còn dấu chân phi hành gia Apollo có thể tồn tại hàng triệu năm.',
      'Trọng lực chỉ bằng khoảng 1/6 Trái Đất: với cùng vận tốc bật nhảy, độ cao h = v²/(2g) gấp khoảng 6 lần, nên phi hành gia đi lại bằng những bước nhảy lò cò.',
      'Mặt Trăng đang rời xa ta khoảng 3,8 cm mỗi năm, đo được nhờ chiếu laser vào các gương phản xạ các phi hành gia Apollo để lại và đo thời gian ánh sáng đi – về (khoảng 2,6 s). Mômen động lượng Trái Đất mất do ngày dài ra được chuyển sang cho Mặt Trăng.',
      'Các vùng tối ta thấy trên mặt trăng (hình "chú Cuội ngồi gốc cây đa") là các "biển" (maria): đồng bằng dung nham bazan đông cứng từ hàng tỉ năm trước, chứ không có nước.',
    ],
  },
  mars: {
    name: 'Sao Hỏa',
    tag: 'Hành tinh đỏ',
    g: 3.7,
    stats: [['Cách Mặt Trời', '≈ 1,52 AU (228 triệu km)'], ['Một năm', '687 ngày'], ['Tự quay', '≈ 24 giờ 37 phút']],
    about: [
      'Màu đỏ đặc trưng là do bề mặt phủ nhiều bụi oxit sắt, giống như gỉ sắt.',
      'Một ngày ở Sao Hỏa gần bằng Trái Đất, trục cũng nghiêng khoảng 25° nên Sao Hỏa cũng có bốn mùa, nhưng mỗi mùa dài gần gấp đôi.',
      'Ở đây có núi lửa cao nhất hệ Mặt Trời là Olympus Mons, cao khoảng 22 km, gần gấp 2,5 lần đỉnh Everest. Trọng lực yếu nên núi có thể cao như vậy mà không sụp.',
      'Khí quyển rất loãng (áp suất chưa tới 1% Trái Đất) nên nước lỏng không tồn tại lâu, nhưng dưới hai cực có nhiều băng nước.',
    ],
  },
  jupiter: {
    name: 'Sao Mộc',
    tag: 'Gã khổng lồ khí',
    g: 24.8,
    stats: [['Cách Mặt Trời', '≈ 5,2 AU (778 triệu km)'], ['Một năm', '≈ 11,9 năm'], ['Tự quay', '≈ 9 giờ 56 phút']],
    about: [
      'Hành tinh lớn nhất: khối lượng gấp khoảng 318 lần Trái Đất, gấp hơn 2 lần tất cả các hành tinh khác cộng lại. Nó chủ yếu là hiđrô và heli, không có bề mặt rắn.',
      'Tự quay nhanh nhất hệ Mặt Trời (chưa tới 10 giờ), nên bị dẹt rõ ở hai cực và khí quyển kéo thành những dải mây song song.',
      'Vết Đỏ Lớn là một cơn bão xoáy rộng hơn cả Trái Đất, đã tồn tại ít nhất vài trăm năm.',
      'Lực hấp dẫn khổng lồ của Sao Mộc hút hoặc làm lệch hướng nhiều sao chổi, tiểu hành tinh, phần nào che chắn cho các hành tinh bên trong.',
    ],
  },
  saturn: {
    name: 'Sao Thổ',
    tag: 'Chúa tể vành đai',
    g: 10.4,
    stats: [['Cách Mặt Trời', '≈ 9,5 AU (1,4 tỉ km)'], ['Một năm', '≈ 29,5 năm'], ['Tự quay', '≈ 10 giờ 33 phút']],
    about: [
      'Khối lượng riêng trung bình chỉ khoảng 0,69 g/cm³, nhỏ hơn nước (1 g/cm³). Nếu có bể nước đủ lớn, Sao Thổ sẽ nổi!',
      'Vành đai rộng tới hàng trăm nghìn km nhưng chỉ dày khoảng vài chục mét, gồm vô số mảnh băng và đá từ hạt bụi tới tảng to như ngôi nhà.',
      'Mỗi mảnh trong vành đai là một "vệ tinh tí hon" chuyển động theo định luật Kepler: mảnh ở trong quay nhanh hơn mảnh ở ngoài.',
      'Sao Thổ có hơn 140 vệ tinh đã biết; Titan là vệ tinh duy nhất trong hệ Mặt Trời có khí quyển dày.',
    ],
  },
}

// Gấu kể chuyện vũ trụ: bấm gấu sang câu kế tiếp, nút "Mục lục" xem cả danh sách. [tiêu đề, nội dung]
const SPACE_FACTS = [
  ['Hệ Mặt Trời ra đời thế nào?', 'Khoảng 4,6 tỉ năm trước, một đám mây khí và bụi co lại do lực hấp dẫn. Khi co lại nó quay nhanh dần (bảo toàn mômen động lượng) và dẹt thành một cái đĩa. Phần giữa nóng và đặc nhất thành Mặt Trời, phần còn lại trong đĩa kết tụ thành hành tinh. Vì vậy các hành tinh gần như cùng một mặt phẳng và cùng quay một chiều.'],
  ['8 hành tinh, 2 nhóm', 'Thủy, Kim, Trái Đất, Hỏa là hành tinh đá: nhỏ, đặc, ở gần. Mộc, Thổ, Thiên Vương, Hải Vương là hành tinh khí / băng khổng lồ ở xa. Lý do: gần Mặt Trời quá nóng, chỉ đá và kim loại ngưng tụ được; ở xa đủ lạnh để băng đóng lại, các lõi lớn dần và hút thêm rất nhiều hiđrô, heli.'],
  ['Mặt Trời phát sáng nhờ đâu?', 'Ở lõi Mặt Trời nhiệt độ khoảng 15 triệu °C, các hạt nhân hiđrô chuyển động nhanh tới mức thắng được lực đẩy tĩnh điện và tổng hợp thành heli. Đó là phản ứng nhiệt hạch. Khối lượng heli tạo thành nhỏ hơn tổng khối lượng hiđrô ban đầu khoảng 0,7%, phần hụt này biến thành năng lượng theo E = mc².'],
  ['Mặt Trời đang "giảm cân"', 'Mỗi giây Mặt Trời biến khoảng 4 triệu tấn khối lượng thành năng lượng bức xạ. Nghe rất nhiều, nhưng khối lượng Mặt Trời tới khoảng 2·10³⁰ kg, nên nó vẫn đủ "nhiên liệu" để sáng ổn định thêm khoảng 5 tỉ năm nữa.'],
  ['Ánh sáng đi 8 phút', 'Khoảng cách Trái Đất – Mặt Trời khoảng 1,5·10¹¹ m, tốc độ ánh sáng 3·10⁸ m/s, nên t = s/v ≈ 500 s ≈ 8 phút 20 giây. Nhìn lên trời là nhìn về quá khứ: nếu Mặt Trời đột ngột tắt, hơn 8 phút sau ta mới biết.'],
  ['Định luật vạn vật hấp dẫn', 'Newton phát hiện hai vật bất kì hút nhau với lực F = G·m₁m₂/r², với G ≈ 6,67·10⁻¹¹ N·m²/kg². Lực tỉ lệ với tích khối lượng và giảm theo bình phương khoảng cách: xa gấp đôi thì lực chỉ còn 1/4. Cũng lực này làm quả táo rơi và giữ Mặt Trăng quay quanh Trái Đất.'],
  ['Vì sao hành tinh không rơi vào Mặt Trời?', 'Hành tinh vẫn đang "rơi" về Mặt Trời, nhưng nó có vận tốc ngang rất lớn nên rơi mãi mà không chạm. Lực hấp dẫn đóng vai trò lực hướng tâm: GMm/r² = mv²/r, suy ra v = √(GM/r). Hành tinh càng xa thì chạy càng chậm: Trái Đất khoảng 30 km/s, Sao Hải Vương chỉ khoảng 5,4 km/s.'],
  ['Định luật Kepler I: quỹ đạo elip', 'Mỗi hành tinh chuyển động trên một elip, Mặt Trời nằm ở một tiêu điểm. Elip của Trái Đất rất gần tròn: gần Mặt Trời nhất khoảng 147 triệu km (đầu tháng 1), xa nhất khoảng 152 triệu km (đầu tháng 7). Lạ là Bắc bán cầu lại đang mùa đông khi Trái Đất gần Mặt Trời nhất!'],
  ['Định luật Kepler II: quét diện tích đều', 'Đoạn thẳng nối Mặt Trời với hành tinh quét những diện tích bằng nhau trong những khoảng thời gian bằng nhau. Hệ quả: hành tinh chạy nhanh khi ở gần Mặt Trời và chậm khi ở xa. Đây thực chất là định luật bảo toàn mômen động lượng.'],
  ['Định luật Kepler III: T² ~ a³', 'Bình phương chu kì tỉ lệ với lập phương bán trục lớn quỹ đạo. Nếu đo T bằng năm và a bằng AU thì T² = a³. Ví dụ Sao Mộc có a ≈ 5,2 AU thì T ≈ √(5,2³) ≈ 11,9 năm. Từ định luật này, biết chu kì và khoảng cách còn tính được khối lượng Mặt Trời.'],
  ['AU và năm ánh sáng', '1 đơn vị thiên văn (AU) là khoảng cách trung bình Trái Đất – Mặt Trời, khoảng 1,5·10¹¹ m. 1 năm ánh sáng là quãng đường ánh sáng đi trong một năm, khoảng 9,46·10¹⁵ m (≈ 63 000 AU). Ngôi sao gần nhất ngoài Mặt Trời là Proxima Centauri, cách khoảng 4,2 năm ánh sáng.'],
  ['Vì sao có bốn mùa?', 'Không phải do Trái Đất lúc gần lúc xa Mặt Trời, mà do trục quay nghiêng khoảng 23,5°. Bán cầu nào nghiêng về phía Mặt Trời thì nhận ánh sáng chiếu gần thẳng góc hơn (năng lượng tập trung trên diện tích nhỏ) và ngày dài hơn, nên đó là mùa hè. Bằng chứng: Nam bán cầu luôn ngược mùa với Bắc bán cầu.'],
  ['Ngày và đêm', 'Trái Đất tự quay quanh trục từ tây sang đông, nên ta thấy Mặt Trời và các sao mọc ở đông, lặn ở tây. Quay một vòng so với các sao xa mất khoảng 23 giờ 56 phút; nhưng vì Trái Đất cũng đi trên quỹ đạo, phải quay thêm chút nữa mới thấy Mặt Trời về đúng chỗ cũ, nên một ngày là 24 giờ.'],
  ['Mặt Trăng chỉ có một mặt', 'Mặt Trăng tự quay một vòng mất khoảng 27,3 ngày, đúng bằng thời gian nó quay quanh Trái Đất, nên luôn hướng một mặt về phía ta. Đây là hiện tượng "khóa thủy triều": lực hấp dẫn của Trái Đất làm Mặt Trăng hơi méo, và ma sát bên trong đã hãm dần sự tự quay cho tới khi hai chu kì bằng nhau.'],
  ['Trăng tròn, trăng khuyết', 'Mặt Trăng không tự phát sáng, nó phản chiếu ánh sáng Mặt Trời. Luôn có một nửa được chiếu sáng, nhưng tùy vị trí trên quỹ đạo mà ta thấy nhiều hay ít phần sáng đó. Một chu kì tuần trăng là khoảng 29,5 ngày, dài hơn 27,3 ngày vì Trái Đất cũng đã đi thêm một đoạn quanh Mặt Trời.'],
  ['Nhật thực và nguyệt thực', 'Mặt Trời to gấp khoảng 400 lần Mặt Trăng nhưng cũng xa gấp khoảng 400 lần, nên hai đĩa nhìn từ Trái Đất gần như bằng nhau, nhờ vậy Mặt Trăng có thể che kín Mặt Trời (nhật thực toàn phần). Quỹ đạo Mặt Trăng nghiêng khoảng 5° so với quỹ đạo Trái Đất, nên không phải tháng nào cũng có nhật thực hay nguyệt thực.'],
  ['Thủy triều', 'Lực hấp dẫn của Mặt Trăng lên phía gần nó mạnh hơn phía xa, sự chênh lệch này kéo nước đại dương phình ra ở cả hai phía. Trái Đất quay qua hai chỗ phình nên mỗi ngày thường có hai lần nước lớn. Khi Mặt Trời, Trái Đất, Mặt Trăng thẳng hàng (trăng tròn, trăng mới), hai tác dụng cộng lại thành triều cường.'],
  ['Vận tốc vũ trụ', 'Muốn bay vòng quanh Trái Đất sát mặt đất cần v₁ = √(gR) ≈ 7,9 km/s (vận tốc vũ trụ cấp I). Muốn thoát hẳn khỏi lực hút Trái Đất cần v₂ = √(2gR) ≈ 11,2 km/s (cấp II). Muốn bay ra khỏi cả hệ Mặt Trời từ Trái Đất cần khoảng 16,7 km/s (cấp III).'],
  ['Vệ tinh địa tĩnh', 'Theo định luật Kepler III, quỹ đạo càng cao thì chu kì càng dài. Ở độ cao khoảng 36 000 km trên xích đạo, vệ tinh quay một vòng mất đúng 24 giờ, cùng nhịp với Trái Đất tự quay, nên nhìn từ mặt đất nó như đứng yên. Vì vậy chảo thu truyền hình chỉ cần hướng cố định một chỗ.'],
  ['Phi hành gia có "mất trọng lực"?', 'Trạm vũ trụ ISS bay ở độ cao khoảng 400 km, ở đó gia tốc trọng trường vẫn còn khoảng 8,7 m/s², gần 90% so với mặt đất. Phi hành gia lơ lửng không phải vì hết trọng lực, mà vì cả người lẫn trạm đều đang rơi tự do quanh Trái Đất với cùng gia tốc: đó là trạng thái không trọng lượng.'],
  ['Gió Mặt Trời và cực quang', 'Mặt Trời liên tục thổi ra dòng hạt mang điện (gió Mặt Trời) với tốc độ khoảng 400 km/s. Từ trường Trái Đất làm lệch hướng các hạt này (lực Lorentz) và dẫn chúng về gần hai cực. Tại đó chúng va chạm với nguyên tử ôxi, nitơ trong khí quyển, làm các nguyên tử phát sáng xanh lục, đỏ: đó là cực quang.'],
  ['Vành đai tiểu hành tinh', 'Giữa Sao Hỏa và Sao Mộc có hàng triệu thiên thể đá nhỏ quay quanh Mặt Trời. Phim ảnh vẽ chúng chen chúc, nhưng thực ra chúng cách nhau trung bình hàng trăm nghìn km. Tổng khối lượng cả vành đai chỉ khoảng 3% Mặt Trăng; lực hấp dẫn của Sao Mộc đã ngăn chúng kết tụ thành một hành tinh.'],
  ['Sao chổi và cái đuôi', 'Sao chổi là khối băng trộn bụi đá, đến từ vùng rất xa của hệ Mặt Trời. Khi lại gần Mặt Trời, băng thăng hoa thành khí kéo theo bụi, tạo đầu sao chổi và đuôi dài hàng triệu km. Đuôi luôn hướng ra xa Mặt Trời (do gió Mặt Trời và áp suất ánh sáng đẩy), chứ không phải kéo theo sau đường bay.'],
  ['Sao Diêm Vương bị "giáng chức"', 'Năm 2006, Hiệp hội Thiên văn Quốc tế quy định một hành tinh phải: quay quanh Mặt Trời, đủ nặng để có dạng gần cầu, và đã "dọn sạch" vùng quỹ đạo của mình. Sao Diêm Vương không đạt điều thứ ba vì chia quỹ đạo với nhiều thiên thể khác ở vành đai Kuiper, nên được xếp là hành tinh lùn.'],
  ['Hải Vương: tìm ra nhờ tính toán', 'Các nhà thiên văn thấy Sao Thiên Vương chạy lệch khỏi quỹ đạo tính theo định luật Newton. Năm 1846, Le Verrier tính ra phải có một hành tinh chưa biết đang hút nó, và chỉ ra vị trí. Ngay đêm được báo tin, Sao Hải Vương được tìm thấy cách vị trí dự đoán chưa tới 1°, một chiến thắng lớn của cơ học Newton.'],
]

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const fmt = (n) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })

export default function SpaceExplorer({ onClose }) {
  const [picked, setPicked] = useState(null)
  const view = useRef({ tilt: 55, turn: 0, zoom: 1.4 })
  // Giữ onClose mới nhất mà không phải gắn lại sự kiện mỗi lần Layout render
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // Lúc mở soi hành tinh: Android bắn thêm "click" sau khi nhấc tay, rơi trúng lớp nền tối vừa hiện và đóng ngay → bỏ qua click quá sớm
  const openedAt = useRef(0)
  const pickedRef = useRef(picked)
  pickedRef.current = picked

  useEffect(() => {
    const solar = document.querySelector('.solar')
    const space = document.querySelector('.space')
    if (!solar || !space) return
    const saved = { tilt: solar.style.getPropertyValue('--tilt'), turn: solar.style.getPropertyValue('--turn') }
    const root = document.documentElement
    root.classList.add('space-exploring')
    playWhoosh()

    let frame = 0
    const apply = () => {
      frame = 0
      const v = view.current
      solar.style.setProperty('--tilt', `${v.tilt}deg`)
      solar.style.setProperty('--turn', `${v.turn}deg`)
      solar.style.setProperty('--zoom', v.zoom)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }
    apply()

    // Kéo (1 ngón / chuột) xoay; 2 ngón chụm để phóng to
    const pointers = new Map()
    let moved = 0
    let pinch = 0
    let downHit = null
    // Thiên thể dưới điểm bấm (hoặc null)
    const bodyAt = (x, y) => {
      const hit = document.elementFromPoint(x, y)?.closest('.solar-moon, .solar-planet, .solar-sun')
      const key = hit && (hit.classList.contains('solar-sun') ? 'sun' : [...hit.classList].find((c) => c.startsWith('solar-') && c !== 'solar-planet')?.slice(6))
      return key && BODIES[key] ? key : null
    }
    const down = (e) => {
      if (e.target.closest('.explorer-ui')) return
      // Chặn hành vi mặc định (bôi đen / kéo-thả chữ): nếu không, trình duyệt có lúc hiện con trỏ "cấm" và không xoay được
      e.preventDefault()
      window.getSelection?.()?.removeAllRanges()
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      moved = 0
      // Nhớ thiên thể lúc chạm xuống: hành tinh đang chạy trên quỹ đạo, lúc nhấc tay có thể đã lệch khỏi ngón
      downHit = bodyAt(e.clientX, e.clientY)
      space.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const v = view.current
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d0 = Math.hypot(a.x - b.x, a.y - b.y)
        p.x = e.clientX
        p.y = e.clientY
        const [c, d] = [...pointers.values()]
        const d1 = Math.hypot(c.x - d.x, c.y - d.y)
        if (d0 > 0) v.zoom = clamp(v.zoom * (d1 / d0), 0.5, 3)
        pinch = 1
      } else {
        const dx = e.clientX - p.x
        const dy = e.clientY - p.y
        p.x = e.clientX
        p.y = e.clientY
        moved += Math.abs(dx) + Math.abs(dy)
        v.turn += dx * 0.35
        v.tilt = clamp(v.tilt - dy * 0.3, -80, 89)
      }
      schedule()
    }
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      // Bấm (không kéo) vào hành tinh / Mặt Trời: xem số liệu. Ngón tay rung nhiều hơn chuột nên ngưỡng "kéo" rộng hơn
      if (moved < (e.pointerType === 'mouse' ? 6 : 14) && !pinch) {
        const key = bodyAt(e.clientX, e.clientY) || downHit
        if (key) openedAt.current = performance.now()
        setPicked(key)
        // Chạm vùng trống trên điện thoại: thu bong bóng gấu lại cho thoáng màn hình
        if (!key && e.pointerType !== 'mouse') setMode(null)
      }
      if (!pointers.size) pinch = 0
    }
    const cancel = (e) => {
      pointers.delete(e.pointerId)
      if (!pointers.size) pinch = 0
    }
    const wheel = (e) => {
      e.preventDefault()
      view.current.zoom = clamp(view.current.zoom * (1 - e.deltaY * 0.0012), 0.5, 3)
      schedule()
    }
    // Esc: đang soi một hành tinh thì thoát soi trước, lần nữa mới thoát chế độ ngắm
    const key = (e) => e.key === 'Escape' && (pickedRef.current ? setPicked(null) : closeRef.current())
    const noDrag = (e) => e.preventDefault()

    space.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    space.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('keydown', key)
    window.addEventListener('dragstart', noDrag)
    window.addEventListener('selectstart', noDrag)
    return () => {
      window.removeEventListener('dragstart', noDrag)
      window.removeEventListener('selectstart', noDrag)
      cancelAnimationFrame(frame)
      space.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      space.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
      root.classList.remove('space-exploring')
      stopAmbient()
      stopMusic()
      solar.style.setProperty('--tilt', saved.tilt)
      solar.style.setProperty('--turn', saved.turn)
      solar.style.removeProperty('--zoom')
      document.querySelectorAll('.solar .is-picked').forEach((el) => el.classList.remove('is-picked'))
    }
  }, [])

  // Đánh dấu hành tinh đang xem
  useEffect(() => {
    document.querySelectorAll('.solar .is-picked').forEach((el) => el.classList.remove('is-picked'))
    if (picked) document.querySelector(picked === 'sun' ? '.solar-sun' : `.solar-${picked}`)?.classList.add('is-picked')
  }, [picked])

  function zoomBy(f) {
    const v = view.current
    v.zoom = clamp(v.zoom * f, 0.5, 3)
    document.querySelector('.solar')?.style.setProperty('--zoom', v.zoom)
  }

  const b = picked && BODIES[picked]

  // Bong bóng của gấu. mode: 'hint' lời chào | 'fact' một câu | 'menu' mục lục | 'body' giải thích hành tinh | null đóng
  const [mode, setMode] = useState('hint')
  // Âm thanh (nền vũ trụ + tiếng gấu), nhớ lựa chọn giữa các lần mở
  const [sound, setSound] = useState(isSoundOn)
  const [volume, setVol] = useState(getVolume)
  // Nguồn nhạc nền: 'file' (mp3 trong app, Layout đã bắt đầu phát ngay trong cú bấm kính viễn vọng)
  // → không có file thì 'youtube' → YouTube lỗi (chặn nhúng / mất mạng) thì 'synth' (tiếng vũ trụ tổng hợp)
  const [musicMode, setMusicMode] = useState(() => (getMusicStatus() === 'missing' ? 'youtube' : 'file'))
  useEffect(() => onMusicStatus((s) => s === 'missing' && setMusicMode((m) => (m === 'file' ? 'youtube' : m))), [])
  function toggleSound() {
    setSoundOn(!sound)
    setSound(!sound)
    if (!sound) {
      if (musicMode === 'file') startMusic()
      if (musicMode === 'synth') startAmbient()
      playPandaTalk()
    }
  }
  function changeVolume(v) {
    setVolume(v)
    setVol(v)
  }
  function musicFail() {
    setMusicMode('synth')
    startAmbient()
  }
  const [factIdx, setFactIdx] = useState(-1)
  const bubbleRef = useRef(null)
  const total = SPACE_FACTS.length
  function showFact(i) {
    playPandaTalk()
    setFactIdx((i + total) % total)
    setMode('fact')
    setPicked(null)
  }
  function closeBubble() {
    setMode(null)
    setPicked(null)
  }
  // Bấm hành tinh thì gấu chuyển sang giải thích; bỏ chọn thì đóng phần giải thích
  useEffect(() => {
    if (picked) {
      setMode('body')
      playFocus()
    } else setMode((m) => (m === 'body' ? null : m))
  }, [picked])
  // Nội dung mới: cuộn bong bóng về đầu
  useEffect(() => {
    bubbleRef.current?.scrollTo(0, 0)
  }, [mode, factIdx, picked])
  const pandaPose = mode === 'body' || mode === 'menu' ? 'teach' : factIdx % 2 ? 'cheer' : 'teach'
  const fact = factIdx >= 0 && SPACE_FACTS[factIdx]

  return createPortal(
    <div className={`explorer-ui${b ? ' is-focus' : ''}`} role="dialog" aria-label="Ngắm hệ Mặt Trời">
      <div className="explorer-top">
        <div>
          <h2 className="explorer-title">Hệ Mặt Trời</h2>
          <p className="explorer-hint">Kéo để xoay, lăn chuột hoặc chụm hai ngón để phóng to, bấm vào hành tinh để gấu giải thích.</p>
        </div>
        <div className="explorer-actions">
          <button type="button" className="btn btn-ghost theme-toggle" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'} title={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}>
            <Icon name={sound ? 'sound' : 'mute'} />
          </button>
          <input
            type="range"
            className="explorer-volume"
            min="0"
            max="100"
            step="5"
            value={volume}
            disabled={!sound}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Âm lượng"
            title={`Âm lượng ${volume}%`}
            style={{ '--vol': `${volume}%` }}
          />
          <button type="button" className="btn btn-primary btn-small" onClick={onClose}>
            <Icon name="close" /> Quay lại học
          </button>
        </div>
      </div>

      {musicMode === 'youtube' && <SpaceMusic volume={volume} muted={!sound} onFail={musicFail} />}

      {/* Soi một hành tinh: phủ tối mọi thứ (z 100), chỉ gấu và chân dung hành tinh nổi lên trên (z 101) */}
      {b && (
        <>
          <div className="explorer-dim" onClick={() => performance.now() - openedAt.current > 500 && setPicked(null)} aria-hidden="true" />
          <figure className={`explorer-focus is-${picked}`} key={picked}>
            <PlanetPortrait body={picked} />
            <figcaption>
              <strong>{b.name}</strong>
              <span>{b.tag}</span>
            </figcaption>
          </figure>
        </>
      )}

      <div className={`explorer-panda is-${pandaPose}`}>
        {mode && (
          <div className="explorer-bubble" key={`${mode}-${factIdx}-${picked}`} role="status">
            <button type="button" className="explorer-card-x" onClick={closeBubble} aria-label="Đóng">
              ×
            </button>
            <div className="explorer-bubble-body" ref={bubbleRef}>
              {mode === 'hint' && <p>Chào bạn! Bấm vào mình để nghe chuyện về hệ Mặt Trời, hoặc bấm vào một hành tinh để mình giải thích nhé!</p>}

              {mode === 'fact' && fact && (
                <>
                  <h3>
                    <span className="explorer-num">{factIdx + 1}.</span> {fact[0]}
                  </h3>
                  <p>{fact[1]}</p>
                </>
              )}

              {mode === 'menu' && (
                <>
                  <h3>Mục lục ({total} câu)</h3>
                  <ol className="explorer-menu">
                    {SPACE_FACTS.map(([title], i) => (
                      <li key={title}>
                        <button type="button" className={i === factIdx ? 'is-current' : ''} onClick={() => showFact(i)}>
                          <span className="explorer-num">{i + 1}.</span> {title}
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {mode === 'body' && b && (
                <>
                  <h3>{b.name}</h3>
                  <p className="explorer-g">
                    g ≈ {fmt(b.g)} m/s²
                    {picked !== 'earth' && <span className="muted"> ({fmt(b.g / G_EARTH)} lần Trái Đất)</span>}
                  </p>
                  {picked !== 'earth' && picked !== 'sun' && (
                    <p>
                      Bạn nặng 50 kg ở Trái Đất thì ở đây cảm giác nặng như <b>{fmt((50 * b.g) / G_EARTH)} kg</b>.
                    </p>
                  )}
                  <dl className="explorer-stats">
                    {b.stats.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {b.about.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </>
              )}
            </div>

            <div className="explorer-bubble-nav">
              {mode === 'fact' ? (
                <>
                  <button type="button" onClick={() => showFact(factIdx - 1)} aria-label="Câu trước">
                    ‹
                  </button>
                  <span className="explorer-bubble-count">
                    {factIdx + 1}/{total}
                  </span>
                  <button type="button" onClick={() => showFact(factIdx + 1)} aria-label="Câu tiếp">
                    ›
                  </button>
                </>
              ) : mode === 'body' && b?.related ? (
                <button type="button" onClick={() => setPicked(b.related)}>
                  Xem {BODIES[b.related].name} ›
                </button>
              ) : (
                <span className="explorer-bubble-count">{mode === 'body' ? 'Bấm vùng tối để xem hành tinh khác' : 'Bấm gấu để nghe một câu'}</span>
              )}
              <button type="button" className="explorer-menu-btn" onClick={() => setMode(mode === 'menu' ? (fact ? 'fact' : 'hint') : 'menu')}>
                {mode === 'menu' ? 'Đóng mục lục' : '☰ Mục lục'}
              </button>
            </div>
          </div>
        )}
        <button type="button" className="explorer-panda-btn" onClick={() => showFact(factIdx + 1)} aria-label="Gấu kể chuyện vũ trụ">
          <FrontPanda pose={pandaPose} />
        </button>
      </div>

      <div className="explorer-zoom">
        <button type="button" className="btn btn-ghost theme-toggle" onClick={() => zoomBy(1.25)} aria-label="Phóng to">
          <Icon name="plus" />
        </button>
        <button type="button" className="btn btn-ghost theme-toggle" onClick={() => zoomBy(0.8)} aria-label="Thu nhỏ">
          <span aria-hidden="true">−</span>
        </button>
      </div>
    </div>,
    document.body
  )
}

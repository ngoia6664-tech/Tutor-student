import { useState } from 'react'
import Icon from '../Icon.jsx'

// Nội dung từng món đồ trong phòng. scope = nhãn nút mở kính thiên văn ngay từ hộp này (nếu có)
/** @type {Record<string, { title: string, desc: string, items: [string, string][], close: string, scope?: string }>} */
const CONTENT = {
  shelf: {
    title: 'Tủ sách học thuật và bản đồ sao cổ',
    desc: 'Giá sách gỗ sồi kịch trần lưu giữ những trước tác vĩ đại nhất lịch sử Vật lý và Thiên văn học:',
    items: [
      ['Philosophiæ Naturalis Principia Mathematica (1687)', 'Tác phẩm kinh điển của Isaac Newton đặt nền móng cho cơ học cổ điển và định luật vạn vật hấp dẫn, chứng minh lực giữ Mặt Trăng trên quỹ đạo cũng chính là lực làm quả táo rơi.'],
      ['Sidereus Nuncius, Sứ Giả Các Vì Sao (Galileo, 1610)', 'Những trang bản thảo đầu tiên ghi lại hình ảnh núi trên Mặt Trăng và 4 vệ tinh lớn của Sao Mộc nhìn qua kính thiên văn khúc xạ.'],
      ['Quả địa cầu thiên văn và đồng hồ cát', 'Giúp xác định tọa độ xích kinh, xích vĩ của các chòm sao trước khi hướng ống kính thiên văn ra bầu trời đêm.'],
    ],
    close: 'Đóng tủ sách',
  },
  cabinet: {
    title: 'Tủ mẫu vật và mô hình Hệ Mặt Trời',
    desc: 'Chiếc tủ gỗ 8 ngăn kéo của Giáo sư Gấu Trúc bảo quản các mẫu khoáng thạch quý và dụng cụ đo đạc:',
    items: [
      ['Mô hình Hệ Mặt Trời cơ khí (Orrery)', 'Hệ thống bánh răng đồng mô phỏng chu kì quay của Trái Đất, Sao Kim và Sao Hỏa quanh Mặt Trời theo định luật III Kepler: T² tỉ lệ thuận với a³.'],
      ['Ngăn kéo thiên thạch và lăng kính', 'Chứa các mảnh thiên thạch sắt-niken, lăng kính thủy tinh tán sắc ánh sáng trắng thành dải quang phổ 7 màu và bộ thị kính tiêu cự 25mm, 10mm.'],
    ],
    close: 'Đóng ngăn tủ',
    scope: 'Nhìn Hệ Mặt Trời thật qua kính',
  },
  board: {
    title: 'Bảng đen công thức',
    desc: 'Các phương trình cốt lõi được Giáo sư Gấu Trúc ghi chú trên bảng:',
    items: [
      ['F = G · (m₁m₂ / r²)', 'Định luật vạn vật hấp dẫn: lực hút giữa hai thiên thể tỉ lệ thuận với tích khối lượng và tỉ lệ nghịch với bình phương khoảng cách giữa chúng.'],
      ['λ = v / f = c / f', 'Bước sóng bức xạ điện từ: phân tích vạch phổ phát xạ giúp biết được nhiệt độ và thành phần nguyên tố của các ngôi sao cách xa hàng trăm năm ánh sáng.'],
      ['E = m · c²', 'Hệ thức Einstein giải thích nguồn năng lượng nhiệt hạch khổng lồ trong lõi Mặt Trời và các ngôi sao.'],
    ],
    close: 'Đã hiểu',
    scope: 'Kiểm chứng qua kính thiên văn',
  },
  journal: {
    title: 'Sổ tay nghiên cứu của Giáo sư Gấu Trúc',
    desc: '“Mỗi đêm nhìn qua vòm kính gác mái này, mình lại thấy những định luật Vật lý trên trang giấy hiện lên sống động giữa các vì sao!”',
    items: [
      ['Nhật ký quan sát đêm nay', 'Bầu trời quang đãng, nhìn rất xa, hợp để quan sát Hệ Mặt Trời. Thử bấm vào bình cầu trên bàn để xem phản ứng phát sáng, rồi ghé mắt vào chiếc kính thiên văn đồng thau bên cửa vòm.'],
    ],
    close: 'Gấp sổ lại',
    scope: 'Nhìn qua kính thiên văn',
  },
}

/** Thí nghiệm con lắc đơn: kéo độ dài dây treo, xem chu kì đổi theo */
function Pendulum() {
  const [length, setLength] = useState(1)
  const period = (2 * Math.PI * Math.sqrt(length / 9.8)).toFixed(2)
  return (
    <div className="sci-modal-box">
      <label className="sci-slider-row" htmlFor="sci-pendulum-length">
        <span>Chiều dài dây treo (l)</span>
        <strong>{length.toFixed(1)} m</strong>
      </label>
      <input
        id="sci-pendulum-length"
        type="range"
        min="0.2"
        max="3.0"
        step="0.1"
        value={length}
        onChange={(e) => setLength(parseFloat(e.target.value))}
        className="sci-range-input"
      />
      <div className="sci-slider-row">
        <span>Chu kì T (g = 9,8 m/s²)</span>
        <strong>{period} giây</strong>
      </div>
    </div>
  )
}

/** Mảnh giấy hiện cạnh món đồ sau khi camera bay đến.
 * @param {{ id: string, onClose: () => void, onScope: () => void }} props */
export default function LabModal({ id, onClose, onScope }) {
  const data = CONTENT[id]
  const clockCard = id === 'clock'
  const title = clockCard ? 'Thí nghiệm con lắc đơn' : data?.title
  return (
    <div className="sci-note-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sci-note">
        <button type="button" className="sci-note-x" onClick={onClose} aria-label="Đóng">
          <Icon name="close" />
        </button>
        <h3>{title}</h3>
        {clockCard ? (
          <>
            <p>Đồng hồ quả lắc chạy đều nhờ chu kì T = 2π√(l/g), do Huygens ứng dụng năm 1656. Đổi chiều dài dây để xem chu kì thay đổi:</p>
            <Pendulum />
          </>
        ) : (
          <>
            <p>{data.desc}</p>
            {data.items.map(([head, sub]) => (
              <div className="sci-modal-box" key={head}>
                <strong>{head}</strong>
                <span>{sub}</span>
              </div>
            ))}
          </>
        )}
        <div className="sci-note-actions">
          {data?.scope && (
            <button type="button" className="sci-btn sci-btn-line" onClick={onScope}>
              {data.scope}
            </button>
          )}
          <button type="button" className="sci-btn" onClick={onClose} autoFocus>
            {clockCard ? 'Xong thí nghiệm' : data.close}
          </button>
        </div>
      </div>
    </div>
  )
}

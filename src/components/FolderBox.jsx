import Icon from './Icon.jsx'

// Một thư mục trong chương (gia sư: ChapterDetail, học sinh: StudentLibrary): khối gập / mở được,
// bên trong bài giảng + bài tập chung một danh sách. actions: nút Đổi tên / Xóa của gia sư (bấm không làm gập khối).

/** @param {{ name: string, count: number, actions?: import('react').ReactNode, children?: import('react').ReactNode }} props */
export default function FolderBox({ name, count, actions, children }) {
  return (
    <details className="folder-box" open>
      <summary>
        <Icon name="folder" />
        <span className="folder-name">{name}</span>
        <span className="badge">{count} bài</span>
        {actions && (
          <span className="folder-actions" onClick={(e) => e.preventDefault()}>
            {actions}
          </span>
        )}
      </summary>
      {count === 0 ? (
        <div className="empty small">Thư mục trống. Bấm Sửa nhiều, tick các bài rồi chọn thư mục này ở thanh dưới màn hình.</div>
      ) : (
        <div className="list">{children}</div>
      )}
    </details>
  )
}

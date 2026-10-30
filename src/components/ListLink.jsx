import { Link } from 'react-router-dom'
import { listUrl } from '../lib/navMemory.js'

// Link "← Danh sách": về đúng chương / bộ lọc / vị trí cuộn lần trước của tab đó (lib/navMemory.js)
export const RESTORE = { restore: true }

export default function ListLink({ to, ...rest }) {
  return <Link to={listUrl(to)} state={RESTORE} {...rest} />
}

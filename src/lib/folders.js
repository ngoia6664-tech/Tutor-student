// Thư mục trong chủ đề (bảng chapter_folders, cột folder_id của bài giảng / bài tập): gom bài của một chủ đề theo thư mục.

/**
 * [{ folder, lessons, assignments }] theo thứ tự thư mục, cuối cùng là nhóm "Chưa xếp" (folder: null).
 * Bài trỏ tới thư mục không có trong danh sách cũng vào "Chưa xếp".
 * folderOf: lấy folder_id của một bài (trang học sinh: bài lồng trong dòng nhận bài)
 * @param {{ id: string, name: string }[]} folders
 * @param {any[]} lessons
 * @param {any[]} assignments
 * @param {(x: any) => string | null | undefined} [folderOf]
 */
export function groupByFolder(folders, lessons, assignments, folderOf = (x) => x.folder_id) {
  const ids = new Set(folders.map((f) => f.id))
  /** @param {any[]} list @param {string | null} id */
  const pick = (list, id) => list.filter((x) => (ids.has(folderOf(x)) ? folderOf(x) : null) === id)
  return [...folders, null].map((folder) => ({ folder, lessons: pick(lessons, folder?.id ?? null), assignments: pick(assignments, folder?.id ?? null) }))
}

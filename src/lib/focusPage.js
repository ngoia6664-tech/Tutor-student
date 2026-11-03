// Trang làm một bài / đọc một bài giảng của học sinh: Layout ẩn thanh tab dưới để tập trung (styles/shell.css)
const FOCUS = /^\/student\/(assignments|lessons)\/[^/]+/

/** @param {string} pathname */
export const isFocusPage = (pathname) => FOCUS.test(pathname)

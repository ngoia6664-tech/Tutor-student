import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { isSafeImageDataUri, lightOnlySvg } from '../lib/svg.js'

// Mặc định react-markdown chặn mọi link "data:". Cho phép riêng ẢNH nhúng base64
// (hình vẽ SVG trong bài giảng); ảnh trong <img> không chạy được script.
function urlTransform(url, key, node) {
  if (key === 'src' && node?.tagName === 'img' && isSafeImageDataUri(url)) return url
  return defaultUrlTransform(url)
}

// Ảnh có chú thích: ![mô tả](src "Hình 1. ...") → khung hình + chú thích bên dưới
function Figure({ node: _node, src, alt, title }) {
  if (!src) return null
  return (
    <span className="figure">
      <img src={lightOnlySvg(src)} alt={alt || title || ''} loading="lazy" />
      {title && <span className="figcaption">{title}</span>}
    </span>
  )
}

// Hiển thị Markdown có công thức: $...$ (cùng dòng) và $$...$$ (riêng dòng)
export default function Markdown({ children, className = '' }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        urlTransform={urlTransform}
        components={{
          // Link mở tab mới để học sinh không bị thoát khỏi ứng dụng
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          img: Figure,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Hiển thị Markdown có công thức: $...$ (cùng dòng) và $$...$$ (riêng dòng)
export default function Markdown({ children, className = '' }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          // Link mở tab mới để học sinh không bị thoát khỏi ứng dụng
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}

// Kiểm chứng component thật với dữ liệu tổng hợp; không ghi backend.
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs/promises'

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: AnswerProgress } = await server.ssrLoadModule('/src/components/AnswerProgress.jsx')
  const { questionLabels } = await server.ssrLoadModule('/src/lib/exam.js')
  const exercises = [1, 2, 3].map(n => ({ id: `qa-${n}`, kind: 'mcq', options: [] }))
  const chips = (answers, labels) => [...renderToStaticMarkup(React.createElement(AnswerProgress, { exercises, answers, labels })).matchAll(/class="ap-chip">([^<]+)<\/button>/g)].map(m => m[1])
  const results = [
    { case: 'Bài thường: nhãn số', actual: chips({}, questionLabels(exercises, false)), expected: ['1', '2', '3'] },
    { case: 'Đề thi: nhãn phần', actual: chips({}, questionLabels(exercises, true)), expected: ['I.1', 'I.2', 'I.3'] },
    { case: 'Câu 2 đã trả lời: chỉ còn 1 và 3', actual: chips({ 'qa-2': { choice: 'A' } }, questionLabels(exercises, false)), expected: ['1', '3'] },
  ].map(r => ({ ...r, pass: JSON.stringify(r.actual) === JSON.stringify(r.expected) }))
  await fs.writeFile('AI/CODEX/evidence/2026-10-25/answer-progress-component.json', JSON.stringify(results, null, 2) + '\n')
  console.log(JSON.stringify(results, null, 2))
  if (results.some(r => !r.pass)) process.exitCode = 1
} finally {
  await server.close()
}

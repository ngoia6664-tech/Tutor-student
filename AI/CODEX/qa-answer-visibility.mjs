// Kiểm chứng component thật trong Node, không thay source hoặc database.
import { createServer } from 'vite'
import fs from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: ExerciseBody } = await server.ssrLoadModule('/src/components/ExerciseBody.jsx')
  const ex = { id: 'qa-mcq', kind: 'mcq', question_md: 'Câu kiểm thử', options: [{ label: 'A', text: 'Sai' }, { label: 'B', text: 'Đúng' }] }
  const render = (correct) => renderToStaticMarkup(React.createElement(ExerciseBody, { ex, mode: 'review', name: 'qa', value: { choice: 'B' }, correct }))
  const shown = render('B')
  const hidden = render(null)
  const result = {
    case: 'Câu trắc nghiệm trả lời đúng B; AnswerSheet ẩn đáp án bằng correct=null',
    shown: { right: shown.includes('is-picked is-right'), wrong: shown.includes('is-picked is-wrong') },
    hidden: { right: hidden.includes('is-picked is-right'), wrong: hidden.includes('is-picked is-wrong') },
    expectedHiddenWrong: false,
    result: hidden.includes('is-picked is-wrong') ? 'BUG_REPRODUCED' : 'PASS',
  }
  await fs.mkdir('AI/CODEX/evidence', { recursive: true })
  await fs.writeFile('AI/CODEX/evidence/qa-answer-visibility.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally {
  await server.close()
}

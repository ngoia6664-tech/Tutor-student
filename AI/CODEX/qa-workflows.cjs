// Luồng QA chỉ thao tác các bản ghi có tên QA E2E.
const qa=require('./qa-browser.cjs')
const {assert,check,ready,dimensions,out}=qa
const normal='d5935a94-f6a1-4760-91b1-5460bce9e6bd'
const exam='218c08c3-02c5-4cc9-bff1-f52e4ff6a79b'
const legacy='8c2985b8-48ed-49ee-ab84-d19b5afbf3d4'
async function ordinary(p,base,label){
  await check(`${label} 5 kinds, draft, cancel, image, submit`,async()=>{
    await p.goto(`${base}/student/assignments/${normal}`);await ready(p)
    const text=await p.locator('main').innerText();assert.ok(!text.includes('Cộng hai với hai.'));assert.ok(!text.includes('Cần thống nhất đơn vị trước khi tính.'))
    assert.equal(await p.locator('.question').count(),5)
    await p.getByRole('radio',{name:'A 3',exact:true}).check()
    await p.getByRole('textbox',{name:'Đáp án ý a',exact:true}).fill(' Hz. ')
    for(const [id,val] of [['a','Đúng'],['b','Sai'],['c','Sai'],['d','Sai']])await p.getByRole('radio',{name:`Ý ${id}: ${val}`,exact:true}).check()
    await p.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('0.500')
    await p.getByPlaceholder('Gõ bài làm (không bắt buộc – có thể chụp ảnh bài làm ở cuối trang)').fill('Cần thống nhất đơn vị trước khi tính toán. Đây là bài làm QA.')
    await p.reload();await ready(p);assert.equal(await p.getByRole('radio',{name:'A 3',exact:true}).isChecked(),true);assert.equal(await p.getByRole('textbox',{name:'Câu trả lời',exact:true}).inputValue(),'0.500')
    await p.getByRole('button',{name:'Cài đặt',exact:true}).click();await p.getByRole('radio',{name:/Tối ưu/}).click();await p.getByRole('button',{name:'Đóng',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:'Câu trả lời',exact:true}).inputValue(),'0.500')
    const lock=p.getByRole('button',{name:'Ngắm vũ trụ (mở sau khi nộp bài)',exact:true});await lock.click();assert.equal(await p.locator('.explorer-ui').count(),0)
    let dialog='';p.once('dialog',async d=>{dialog=d.message();await d.dismiss()});await p.getByRole('button',{name:'Nộp bài',exact:true}).click();assert.ok(dialog.includes('không sửa được'));assert.equal(await p.getByRole('button',{name:'Nộp bài',exact:true}).count(),1)
    const image=await p.locator('main h1').screenshot();const gallery=p.locator('input[type=file][multiple]');await gallery.setInputFiles({name:'qa-answer.png',mimeType:'image/png',buffer:image});await p.getByRole('button',{name:'Bỏ ảnh 1'}).waitFor();await p.getByRole('button',{name:'Bỏ ảnh 1'}).click();await p.locator('.thumb').waitFor({state:'detached'});await gallery.setInputFiles({name:'qa-answer.png',mimeType:'image/png',buffer:image})
    await p.screenshot({path:`${out}/${label}-answers-before-submit.png`,fullPage:true})
    p.once('dialog',async d=>await d.accept());await p.getByRole('button',{name:'Nộp bài',exact:true}).click();await p.getByRole('button',{name:'Nộp bài',exact:true}).waitFor({state:'detached',timeout:25000});await ready(p)
    const result=await p.locator('main').innerText();assert.ok(result.includes('Cộng hai với hai.'));assert.ok(result.includes('Chờ chấm'));assert.ok(result.includes('2/4'));assert.equal(await p.locator('.confetti').count(),0)
    await p.screenshot({path:`${out}/${label}-submission-result.png`,fullPage:true});return {text:result,layout:await dimensions(p)}
  })
}
async function startExam(p,base,label){
  await check(`${label} exam gate/start/reload`,async()=>{
    await p.goto(`${base}/student/assignments/${exam}`);await ready(p);assert.equal(await p.locator('.question').count(),0)
    await p.getByRole('button',{name:'Bắt đầu làm bài',exact:true}).click();await p.locator('.question').first().waitFor();assert.equal(await p.locator('.question').count(),3)
    await p.getByRole('radio',{name:'B 4',exact:true}).check()
    for(const [id,val] of [['a','Đúng'],['b','Sai'],['c','Đúng'],['d','Đúng']])await p.getByRole('radio',{name:`Ý ${id}: ${val}`,exact:true}).check()
    await p.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('0,5')
    const before=await p.locator('.exam-timer-num').innerText();await p.reload();await ready(p);const after=await p.locator('.exam-timer-num').innerText();assert.equal(await p.getByRole('radio',{name:'B 4',exact:true}).isChecked(),true);assert.ok(after<=before)
    await p.screenshot({path:`${out}/${label}-timed-exam.png`,fullPage:true});return {before,after,layout:await dimensions(p)}
  })
}
async function legacyLesson(p,base,label){
  await check(`${label} legacy lesson backwards compatibility`,async()=>{
    await p.goto(`${base}/student/lessons/${legacy}`);await ready(p);assert.equal(await p.locator('.lesson-pager-select').count(),0);assert.ok((await p.locator('main').innerText()).includes('Nội dung trang hai.'))
    await p.getByRole('button',{name:'Xem theo trang',exact:true}).click();await p.locator('.lesson-pager-select').first().waitFor();await p.locator('.lesson-pager-select').first().selectOption('1');await p.waitForFunction(()=>document.querySelector('.lesson-pager-select')?.value==='1');await p.waitForTimeout(200)
    const text=await p.locator('article').innerText();assert.ok(text.includes('Nội dung trang hai.'));assert.ok(!text.includes('Công thức'));const size=await dimensions(p);assert.ok(size.scroll<=size.width+2,JSON.stringify(size));return size
  })
}
module.exports={ordinary,startExam,legacyLesson,normal,exam,legacy}

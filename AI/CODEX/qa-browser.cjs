// Công cụ QA độc lập; không sửa source, không lưu thông tin đăng nhập.
const fs = require('node:fs/promises')
const assert = require('node:assert/strict')
const out = 'AI/CODEX/evidence'
const results = []
async function check(name, fn) {
  const start = Date.now()
  try { const detail = await fn(); results.push({ name, status: 'PASS', ms: Date.now()-start, detail }); console.log('PASS', name, JSON.stringify(detail ?? '')) }
  catch (e) { results.push({name,status:'FAIL',ms:Date.now()-start,error:e.message}); console.log('FAIL',name,e.message.slice(0,500)) }
  await fs.mkdir(out,{recursive:true})
  await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2))
}
async function ready(p) {
  await p.locator('main h1').first().waitFor({timeout:20000})
  await p.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{})
  await p.waitForTimeout(300)
}
async function dimensions(p) {
  return p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,height:innerHeight,overflow:[...document.querySelectorAll('main *, .topbar *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0 && s.position!=='fixed' && r.right>innerWidth+2}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.innerText?.slice(0,60),right:Math.round(e.getBoundingClientRect().right)}))}))
}
async function scan(p, base, label) {
  for(const route of ['/student','/student/results','/student/mistakes','/student/library']) {
    await check(`${label} ${route}`,async()=>{await p.goto(base+route);await ready(p);const text=await p.locator('main').innerText();assert.ok(!/Có lỗi xảy ra|Không tải được|Failed to fetch/.test(text),text);const size=await dimensions(p);assert.ok(size.scroll<=size.width+2,JSON.stringify(size));return {heading:await p.locator('main h1').first().innerText(),...size}})
  }
}
async function settings(p,label) {
  await check(`${label} Settings preset/persistence/reset`,async()=>{
    await p.getByRole('button',{name:'Cài đặt',exact:true}).click()
    await p.getByRole('radio',{name:/Tối ưu/}).click()
    let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('app-settings')))
    assert.equal(s.animatedBackground,false);assert.equal(s.mascotAnimation,false);assert.equal(s.celebration,false)
    const lite=await p.evaluate(()=>[...document.querySelectorAll('.space-bg *')].filter(e=>getComputedStyle(e).animationName!=='none').length)
    await p.getByRole('switch',{name:/Linh vật Panda/}).click();assert.equal(await p.locator('.mascot').count(),0);assert.equal(await p.getByRole('switch',{name:/Animation của Panda/}).isDisabled(),true)
    await p.getByRole('switch',{name:/Nhạc nền Phát/}).click();assert.equal(await p.getByRole('slider').isDisabled(),true)
    await p.getByRole('button',{name:'Đóng',exact:true}).click();await p.reload();await ready(p)
    assert.equal(await p.locator('.mascot').count(),0)
    await p.getByRole('button',{name:'Cài đặt',exact:true}).click();assert.equal(await p.getByRole('radio',{name:/Tối ưu/}).getAttribute('aria-checked'),'true')
    await p.getByRole('button',{name:'Khôi phục mặc định',exact:true}).click();await p.getByRole('button',{name:'Bấm lần nữa để khôi phục',exact:true}).click()
    s=await p.evaluate(()=>JSON.parse(localStorage.getItem('app-settings')));assert.equal(s.music,true);assert.equal(s.musicVolume,60);assert.equal(s.mascot,true)
    const size=await dimensions(p);assert.ok(size.scroll<=size.width+2,JSON.stringify(size));await p.screenshot({path:`${out}/${label}-settings.png`,fullPage:true});await p.getByRole('button',{name:'Đóng',exact:true}).click();return {settings:s,liteAnimations:lite,...size}
  })
}
async function lesson(p,base,label,id='e5edd03d-88e6-4d8e-ace6-74069bd1767d') {
  await check(`${label} lesson pagination`,async()=>{
    await p.goto(`${base}/student/lessons/${id}`);await ready(p)
    const select=p.locator('.lesson-pager-select').first();await select.waitFor();const options=await select.locator('option').allTextContents();assert.ok(options.length>=3)
    await p.getByRole('button',{name:'Sau →',exact:true}).first().click();assert.equal(await select.inputValue(),'1');assert.match(p.url(),/trang=2/)
    await p.reload();await ready(p);assert.equal(await p.locator('.lesson-pager-select').first().inputValue(),'1')
    await p.getByRole('button',{name:'Xem cả bài',exact:true}).click();await p.locator('.lesson-pager-select').first().waitFor({state:'detached'});assert.equal(await p.locator('.lesson-pager-select').count(),0)
    await p.getByRole('button',{name:'Xem theo trang',exact:true}).click();await p.locator('.lesson-pager-select').first().selectOption(String(options.length-1));await p.waitForFunction(()=>document.querySelector('.lesson-pager button:last-child')?.disabled);assert.equal(await p.getByRole('button',{name:'Sau →',exact:true}).first().isDisabled(),true)
    await p.goto(`${base}/student/lessons/${id}?xem=trang&trang=999`);await ready(p);assert.equal(await p.locator('.lesson-pager-select').first().inputValue(),String(options.length-1))
    const size=await dimensions(p);assert.ok(size.scroll<=size.width+2,JSON.stringify(size));await p.screenshot({path:`${out}/${label}-lesson.png`,fullPage:true});return {options,...size}
  })
}
module.exports={check,ready,dimensions,scan,settings,lesson,results,out,assert}

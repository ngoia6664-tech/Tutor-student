const qa=require('./qa-browser.cjs')
const {assert,check,ready,out}=qa
async function install(p){
 await p.addInitScript(()=>{
   window.__qaAudio=[];window.__qaMedia=[];window.__qaIntervals=new Map()
   const AC=window.AudioContext;if(AC)window.AudioContext=new Proxy(AC,{construct(T,args){const c=new T(...args);window.__qaAudio.push(c);return c}})
   const A=window.Audio;window.Audio=new Proxy(A,{construct(T,args){const a=new T(...args);window.__qaMedia.push(a);return a}})
   const si=window.setInterval,ci=window.clearInterval
   window.setInterval=(fn,ms,...rest)=>{const id=si(fn,ms,...rest);window.__qaIntervals.set(id,{ms,stack:new Error().stack});return id}
   window.clearInterval=id=>{window.__qaIntervals.delete(id);return ci(id)}
 })
}
async function state(p){return p.evaluate(async()=>({playing:(await import('/src/lib/spaceSound.js')).isMusicPlaying(),status:(await import('/src/lib/spaceSound.js')).getMusicStatus(),contexts:window.__qaAudio?.map(c=>c.state),media:window.__qaMedia?.map(a=>({paused:a.paused,time:a.currentTime,error:a.error?.code})),iframes:document.querySelectorAll('.explorer-music-frame iframe').length,hidden:document.hidden}))}
async function run(p,base,label){
 await check(`${label} explorer real player`,async()=>{
   await install(p);await p.goto(base+'/student');await ready(p)
   await p.getByRole('button',{name:'Ngắm vũ trụ',exact:true}).click();await p.locator('.explorer-ui').waitFor();await p.waitForTimeout(10000)
   const initial=await state(p);await p.screenshot({path:`${out}/${label}-explorer.png`,fullPage:false})
   if(initial.playing){await p.getByRole('button',{name:'Tạm dừng nhạc',exact:true}).click();await p.getByRole('button',{name:'Phát nhạc',exact:true}).waitFor()}
   const paused=await state(p);assert.equal(paused.playing,false)
   await p.getByRole('button',{name:'Phát nhạc',exact:true}).click();await p.waitForTimeout(2500);const resumed=await state(p)
   await p.getByRole('button',{name:'Quay lại học',exact:true}).click();await p.locator('.explorer-ui').waitFor({state:'detached'});await p.waitForTimeout(1600);const closed=await state(p);assert.equal(closed.playing,false);assert.ok(closed.contexts?.every(s=>s==='suspended'));assert.equal(closed.iframes,0)
   return {initial,paused,resumed,closed,frames:p.frames().map(f=>f.url()).filter(s=>s.includes('youtube'))}
 })
 await check(`${label} reopen explorer eight times`,async()=>{
   const samples=[]
   for(let i=0;i<8;i++){
     await p.getByRole('button',{name:'Ngắm vũ trụ',exact:true}).click();await p.locator('.explorer-ui').waitFor();await p.waitForTimeout(450);const s=await state(p);assert.ok(s.iframes<=1);samples.push(s.iframes)
     await p.getByRole('button',{name:'Quay lại học',exact:true}).click();await p.locator('.explorer-ui').waitFor({state:'detached'});assert.equal((await state(p)).iframes,0)
   }
   await p.waitForTimeout(1600);return {samples,closed:await state(p)}
 })
 await check(`${label} mascot disabled cleans intervals`,async()=>{
   await p.getByRole('button',{name:'Cài đặt',exact:true}).click();await p.getByRole('radio',{name:/Đầy đủ/}).click();await p.waitForTimeout(300)
   const before=await p.evaluate(()=>[...window.__qaIntervals.values()].map(x=>({ms:x.ms,mascot:x.stack.includes('Mascot')})))
   await p.getByRole('switch',{name:/Linh vật Panda/}).click();await p.locator('.mascot').waitFor({state:'detached'});const after=await p.evaluate(()=>[...window.__qaIntervals.values()].map(x=>({ms:x.ms,mascot:x.stack.includes('Mascot')})))
   assert.equal(after.filter(x=>x.mascot).length,0)
   await p.getByRole('switch',{name:/Linh vật Panda/}).click();await p.getByRole('button',{name:'Đóng',exact:true}).click();return {before,after}
 })
}
module.exports={install,state,run}

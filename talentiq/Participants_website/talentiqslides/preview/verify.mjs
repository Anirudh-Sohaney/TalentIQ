import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9224',
  '--user-data-dir=' + process.cwd() + '\\preview\\chrome-v2-profile', 'about:blank'
], { windowsHide: true, stdio: 'ignore' });

let ws;
try {
  let target;
  for (let i=0;i<60;i++) {
    try { target=(await (await fetch('http://127.0.0.1:9224/json/list')).json()).find(x=>x.type==='page');if(target)break } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  if(!target)throw new Error('Chrome debugger did not start');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let id=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}});
  function send(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
  await send('Page.enable');
  for(const size of [{name:'desktop',width:1440,height:900,mobile:false},{name:'present',width:1280,height:720,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
    await send('Emulation.setDeviceMetricsOverride',{width:size.width,height:size.height,deviceScaleFactor:1,mobile:size.mobile});
    for(let slide=1;slide<=6;slide++){
      await send('Page.navigate',{url:`http://localhost:6969/?slide=${slide}&qa=${Date.now()}-${size.name}`});
      await new Promise(r=>setTimeout(r,950));
      const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(`preview/v2-${size.name}-${slide}.png`,Buffer.from(png.data,'base64'));
      const {result}=await send('Runtime.evaluate',{expression:`JSON.stringify((()=>{const s=document.querySelector('.slide.active'),r=x=>{const a=x?.getBoundingClientRect();return a?{x:Math.round(a.x),y:Math.round(a.y),w:Math.round(a.width),h:Math.round(a.height),right:Math.round(a.right),bottom:Math.round(a.bottom)}:null};return{slide:${slide},w:innerWidth,h:innerHeight,images:[...s.querySelectorAll('img')].map(x=>({loaded:x.complete&&x.naturalWidth>0,src:x.getAttribute('src')})),top:r(s.querySelector('.topbar')),head:r(s.querySelector('.head')),body:r(s.querySelector('.flow-body,.check-body,.transform-body,.search-body,.hero-copy,.close-copy')),note:r(s.querySelector('.support-note')),extras:[...s.querySelectorAll('.check-photo,.form-card,.check-facts,.timezone')].map(e=>({className:e.className,box:r(e)})),controls:r(document.querySelector('.controls')),scrollW:document.documentElement.scrollWidth}})())`,returnByValue:true});
      const data=JSON.parse(result.value);
      console.log(size.name,result.value);
      if(data.scrollW>size.width||data.images.some(x=>!x.loaded)||[data.top,data.head,data.body,data.note,...data.extras.map(x=>x.box)].filter(Boolean).some(x=>x.right>size.width||x.bottom>data.controls.y-8))throw new Error(`Layout check failed at ${size.name} slide ${slide}`);
    }
  }
  await send('Page.navigate',{url:'http://localhost:6969/'});await new Promise(r=>setTimeout(r,500));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  const nav=await send('Runtime.evaluate',{expression:`document.querySelector('#slideCount').textContent`,returnByValue:true});
  console.log('keyboard:',nav.result.value);
}finally{ws?.close();chrome.kill()}

const CLASSIC=['#e0f8d0','#88c070','#346856','#081820'];
const GAMES=[
{m:'pulse',id:'tetris',name:'Tetris',ac:'#7a4dff',p:[['#f4f7ff','#6ecbff','#6a4dff','#0e1230'],['#fff6e0','#ffd24d','#ff5a3c','#1a0b22'],['#fff6e0','#ffd24d','#ff5a3c','#1a0b22']],ic:['01000000','11100110','00000110','00111000','00100000','00100000']},
{m:'hold',id:'space',name:'Space Invaders',ac:'#1f9a6b',p:[['#ecfff4','#86e8b6','#1f9a6b','#05241a'],['#ecfff4','#ffe27a','#ff7a3c','#05241a'],['#ecfff4','#ffe27a','#ff7a3c','#05241a']],ic:['00100000100','00010001000','00111111100','01101110110','11111111111','10111111101','10100000101','00011011000']},
{m:'pulse',id:'tron',name:'Tron',ac:'#1b86e0',p:[['#eaf8ff','#72d6ff','#1b7fd1','#06182e'],['#fff3e2','#ffb257','#e8590c','#2a0e00'],['#fff3e2','#ffb257','#e8590c','#2a0e00']],ic:['1111111','0000001','0111101','0100001','0101111','0100000','0111111']},
{m:'hold',id:'qix',name:'QIX',ac:'#d6336c',p:[['#fff1f7','#ff93c4','#d6336c','#2b0a1c'],['#fffbe0','#ffe14d','#ff9f1c','#2b0a1c'],['#e8fbff','#6fe0ff','#1593c4','#2b0a1c']],ic:['10000001','01000010','00100100','00011000','00011000','00100100','01000010','10000001']}];
const $=s=>document.querySelector(s),abgr=h=>(0xFF000000|(parseInt(h.slice(5,7),16)<<16)|(parseInt(h.slice(3,5),16)<<8)|parseInt(h.slice(1,3),16))>>>0;
const mk=p=>p.map(a=>a.map(abgr));
function icon(m,c){let r='';m.forEach((row,y)=>[...row].forEach((v,x)=>{if(v=='1')r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`}));return `<svg viewBox="0 0 ${m[0].length} ${m.length}" fill="${c}">${r}</svg>`}
$('#grid').innerHTML=GAMES.map((g,i)=>`<button class="card" data-i="${i}" style="--ac:${g.ac}"><div class="thumb" style="--bg0:${g.p[0][0]}">${icon(g.ic,g.p[0][3])}</div><b>${g.name}</b><div class="sw">${g.p[0].map(c=>`<i style="background:${c}"></i>`).join('')}</div><span class="go">Jetzt spielen</span></button>`).join('');
const cv=$('#cv'),ctx=cv.getContext('2d'),img=new ImageData(160,144),fb=new Uint32Array(img.data.buffer);
let gb=null,cur=null,raf=0,last=0,acc=0,classic=false;
const pals=()=>classic?mk([CLASSIC,CLASSIC,CLASSIC].map(a=>a)):mk(cur.p);
function boot(){const rom=Uint8Array.from(atob(ROMS[cur.id]),c=>c.charCodeAt(0));fb.fill(0xFF000000);gb=GB(rom,pals(),fb);}
function loop(t){raf=requestAnimationFrame(loop);acc+=Math.min(t-last,50);last=t;let n=0;while(acc>=16.74&&n<3){gb.frame();acc-=16.74;n++}if(n==3)acc=0;if(n)ctx.putImageData(img,0,0)}
function open(i){cur=GAMES[i];$('#play').style.setProperty('--ac',cur.ac);$('#gname').textContent=cur.name;$('#play').classList.add('on');boot();last=performance.now();acc=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);$('#back').focus()}
function close(){setDir(null);cancelAnimationFrame(raf);gb=null;$('#play').classList.remove('on')}
$('#grid').onclick=e=>{const c=e.target.closest('.card');if(c)open(+c.dataset.i)};
$('#back').onclick=close;$('#reset').onclick=boot;
$('#col').onclick=()=>{classic=!classic;$('#col').textContent=classic?'Farbe':'Original-Grün';gb.setPal(pals())};
const KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyX:'a',KeyK:'a',KeyZ:'b',KeyJ:'b',Enter:'start',ShiftLeft:'select',ShiftRight:'select',Backspace:'select'};
function kh(d){return e=>{if(!gb)return;if(e.code=='Escape'&&d){close();return}const k=KM[e.code];if(k){e.preventDefault();gb.key(k,d)}}}
addEventListener('keydown',kh(true));addEventListener('keyup',kh(false));

const sg=$('#play'),tp=new Map(),pt={};let dirOn=null;
function pulse(k,ms){if(!gb)return;clearTimeout(pt[k]);gb.key(k,true);pt[k]=setTimeout(()=>gb&&gb.key(k,false),ms)}
function setDir(d){if(dirOn==d)return;if(dirOn&&gb)gb.key(dirOn,false);dirOn=d;if(d&&gb)gb.key(d,true)}
$('#st').onclick=()=>pulse('start',120);$('#se').onclick=()=>pulse('select',120);
sg.addEventListener('pointerdown',e=>{if(!gb||e.pointerType=='mouse'||e.target.closest('.bar'))return;e.preventDefault();
const t={ax:e.clientX,ay:e.clientY,t0:performance.now(),moved:0,main:tp.size==0,lp:0};tp.set(e.pointerId,t);
if(!t.main){t.moved=1;pulse('a',110);return}
t.lp=setTimeout(()=>{if(!t.moved){t.moved=1;pulse('b',130)}},450)});
sg.addEventListener('pointermove',e=>{const t=tp.get(e.pointerId);if(!t||!t.main||!gb)return;
const dx=e.clientX-t.ax,dy=e.clientY-t.ay;if(Math.hypot(dx,dy)<26)return;
t.moved=1;clearTimeout(t.lp);t.ax=e.clientX;t.ay=e.clientY;
const d=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
if(cur.m=='hold')setDir(d);else pulse(d,80)});
function pup(e){const t=tp.get(e.pointerId);if(!t)return;tp.delete(e.pointerId);clearTimeout(t.lp);
if(t.main){setDir(null);if(!t.moved&&e.type=='pointerup'&&performance.now()-t.t0<300)pulse('a',110)}}
sg.addEventListener('pointerup',pup);sg.addEventListener('pointercancel',pup);
document.addEventListener('visibilitychange',()=>{acc=0});
function GB(rom,pl,fb){
const vram=new Uint8Array(8192),wram=new Uint8Array(8192),oam=new Uint8Array(160),hram=new Uint8Array(128),io=new Uint8Array(128),R=new Uint8Array(8),ram=new Uint8Array(32768),bgi=new Uint8Array(160);
const ct=rom[0x147],mbc=ct==0?0:ct<=3?1:(ct>=0x19&&ct<=0x1E)?5:0,nb=Math.max(2,rom.length>>14);
let pals=pl,lo=1,hi=0,rb=0,ramOn=0,SP=0xFFFE,PC=0x100,fz=1,fn=0,fh=1,fc=1,ime=0,eiP=0,halt=0,ie=0,divc=0,tc=0,ly=0,lc=0,drawn=0,fd=0,wl=0,jb=0,jd=0;
R[7]=1;R[1]=0x13;R[3]=0xD8;R[4]=1;R[5]=0x4D;
io[0x40]=0x91;io[0x47]=0xFC;io[0x48]=0xFF;io[0x49]=0xFF;io[15]=0xE1;
const bank=()=>mbc==1?((hi<<5)|lo)%nb:mbc==5?((hi<<8)|lo)%nb:1;
function rio(r){switch(r){
case 0:{const s=io[0];let n=15;if(!(s&16))n&=~jd;if(!(s&32))n&=~jb;return 0xC0|(s&0x30)|(n&15);}
case 4:return (divc>>8)&255;
case 15:return io[15]|0xE0;
case 0x41:if(!(io[0x40]&128))return (io[0x41]&0x78)|0x80;return (io[0x41]&0x78)|0x80|(ly==io[0x45]?4:0)|(ly>=144?1:lc<80?2:lc<252?3:0);
case 0x44:return ly;
default:return io[r];}}
function rd(a){a&=65535;
if(a<0x4000)return rom[a];
if(a<0x8000)return rom[(bank()<<14)+a-0x4000];
if(a<0xA000)return vram[a-0x8000];
if(a<0xC000)return ramOn?ram[(rb<<13)+a-0xA000]:255;
if(a<0xFE00)return wram[a&8191];
if(a<0xFEA0)return oam[a-0xFE00];
if(a<0xFF00)return 255;
if(a<0xFF80)return rio(a&127);
if(a==0xFFFF)return ie;
return hram[a-0xFF80];}
function wio(r,v){switch(r){
case 0:io[0]=v&0x30;break;
case 4:divc=0;break;
case 15:io[15]=v&31;break;
case 0x40:if(!(v&128)&&(io[0x40]&128)){ly=0;lc=0;drawn=0;}io[0x40]=v;break;
case 0x41:io[0x41]=v&0x78;break;
case 0x44:break;
case 0x46:for(let i=0;i<160;i++)oam[i]=rd((v<<8)+i);io[0x46]=v;break;
default:io[r]=v;}}
function wr(a,v){a&=65535;v&=255;
if(a<0x8000){
if(mbc==1){if(a<0x2000)ramOn=(v&15)==10;else if(a<0x4000)lo=(v&31)||1;else if(a<0x6000){hi=v&3;rb=hi;}}
else if(mbc==5){if(a<0x2000)ramOn=(v&15)==10;else if(a<0x3000)lo=v;else if(a<0x4000)hi=v&1;else if(a<0x6000)rb=v&15;}
return;}
if(a<0xA000)vram[a-0x8000]=v;
else if(a<0xC000){if(ramOn)ram[(rb<<13)+a-0xA000]=v;}
else if(a<0xFE00)wram[a&8191]=v;
else if(a<0xFEA0)oam[a-0xFE00]=v;
else if(a<0xFF00){}
else if(a<0xFF80)wio(a&127,v);
else if(a==0xFFFF)ie=v;
else hram[a-0xFF80]=v;}
const n8=()=>{const v=rd(PC);PC=(PC+1)&65535;return v;},n16=()=>n8()|(n8()<<8);
const g8=i=>i==6?rd((R[4]<<8)|R[5]):R[i],s8=(i,v)=>{if(i==6)wr((R[4]<<8)|R[5],v);else R[i]=v;};
const gr=i=>i==3?SP:(R[i*2]<<8)|R[i*2+1],sr=(i,v)=>{v&=65535;if(i==3)SP=v;else{R[i*2]=v>>8;R[i*2+1]=v&255;}};
const push=v=>{SP=(SP-1)&65535;wr(SP,v>>8);SP=(SP-1)&65535;wr(SP,v&255);},pop=()=>{const v=rd(SP)|(rd(SP+1)<<8);SP=(SP+2)&65535;return v;};
const cc=i=>i==0?!fz:i==1?!!fz:i==2?!fc:!!fc;
function alu(k,v){const a=R[7];let r;
switch(k){
case 0:r=a+v;fh=((a&15)+(v&15))>15?1:0;fc=r>255?1:0;fn=0;break;
case 1:{const c=fc;r=a+v+c;fh=((a&15)+(v&15)+c)>15?1:0;fc=r>255?1:0;fn=0;break;}
case 2:r=a-v;fh=(a&15)<(v&15)?1:0;fc=r<0?1:0;fn=1;break;
case 3:{const c=fc;r=a-v-c;fh=(a&15)<((v&15)+c)?1:0;fc=r<0?1:0;fn=1;break;}
case 4:r=a&v;fh=1;fc=0;fn=0;break;
case 5:r=a^v;fh=0;fc=0;fn=0;break;
case 6:r=a|v;fh=0;fc=0;fn=0;break;
default:r=a-v;fh=(a&15)<(v&15)?1:0;fc=r<0?1:0;fn=1;fz=(r&255)==0?1:0;return;}
r&=255;fz=r==0?1:0;R[7]=r;}
function rot(k,v){let r,c;
switch(k){
case 0:c=v>>7;r=((v<<1)|c)&255;break;
case 1:c=v&1;r=(v>>1)|(c<<7);break;
case 2:c=v>>7;r=((v<<1)|fc)&255;break;
case 3:c=v&1;r=(v>>1)|(fc<<7);break;
case 4:c=v>>7;r=(v<<1)&255;break;
case 5:c=v&1;r=(v>>1)|(v&128);break;
case 6:c=0;r=((v<<4)|(v>>4))&255;break;
default:c=v&1;r=v>>1;}
fz=r==0?1:0;fn=0;fh=0;fc=c;return r;}
function cbx(){const op=n8(),r=op&7,k=(op>>3)&7,v=g8(r),h=r==6;
switch(op>>6){
case 0:s8(r,rot(k,v));return h?16:8;
case 1:fz=((v>>k)&1)?0:1;fn=0;fh=1;return h?12:8;
case 2:s8(r,v&~(1<<k));return h?16:8;
default:s8(r,v|(1<<k));return h?16:8;}}
function spe(){const e=(n8()<<24)>>24,r=SP+e;fz=0;fn=0;fh=((SP&15)+(e&15))>15?1:0;fc=((SP&255)+(e&255))>255?1:0;return r&65535;}
function exec(){const op=n8();
if(op<0x40){
switch(op){
case 0:return 4;
case 0x10:n8();return 4;
case 8:{const a=n16();wr(a,SP&255);wr(a+1,SP>>8);return 20;}
case 0x18:{const e=(n8()<<24)>>24;PC=(PC+e)&65535;return 12;}
case 7:case 15:case 0x17:case 0x1F:R[7]=rot((op>>3)&3,R[7]);fz=0;return 4;
case 0x27:{let a=R[7];if(!fn){if(fc||a>0x99){a+=0x60;fc=1;}if(fh||(a&15)>9)a+=6;}else{if(fc)a-=0x60;if(fh)a-=6;}R[7]=a&255;fz=(a&255)==0?1:0;fh=0;return 4;}
case 0x2F:R[7]^=255;fn=1;fh=1;return 4;
case 0x37:fc=1;fn=0;fh=0;return 4;
case 0x3F:fc^=1;fn=0;fh=0;return 4;}
if((op&0xE7)==0x20){const e=(n8()<<24)>>24;if(cc((op>>3)&3)){PC=(PC+e)&65535;return 12;}return 8;}
const i=op>>4;
switch(op&15){
case 1:sr(i,n16());return 12;
case 2:{let ad;if(i<2)ad=gr(i);else{ad=gr(2);sr(2,ad+(i==2?1:-1));}wr(ad,R[7]);return 8;}
case 10:{let ad;if(i<2)ad=gr(i);else{ad=gr(2);sr(2,ad+(i==2?1:-1));}R[7]=rd(ad);return 8;}
case 3:sr(i,gr(i)+1);return 8;
case 11:sr(i,gr(i)-1);return 8;
case 9:{const h=gr(2),v=gr(i),r=h+v;fn=0;fh=((h&0xFFF)+(v&0xFFF))>0xFFF?1:0;fc=r>0xFFFF?1:0;sr(2,r);return 8;}}
const r=(op>>3)&7;
switch(op&7){
case 4:{const v=g8(r),x=(v+1)&255;fz=x==0?1:0;fn=0;fh=(v&15)==15?1:0;s8(r,x);return r==6?12:4;}
case 5:{const v=g8(r),x=(v-1)&255;fz=x==0?1:0;fn=1;fh=(v&15)==0?1:0;s8(r,x);return r==6?12:4;}
case 6:s8(r,n8());return r==6?12:8;}
return 4;}
if(op<0x80){if(op==0x76){halt=1;return 4;}const d=(op>>3)&7,s=op&7;s8(d,g8(s));return(d==6||s==6)?8:4;}
if(op<0xC0){alu((op>>3)&7,g8(op&7));return(op&7)==6?8:4;}
switch(op){
case 0xC3:PC=n16();return 16;
case 0xC9:PC=pop();return 16;
case 0xD9:PC=pop();ime=1;return 16;
case 0xCD:{const a=n16();push(PC);PC=a;return 24;}
case 0xCB:return cbx();
case 0xE0:wr(0xFF00+n8(),R[7]);return 12;
case 0xF0:R[7]=rd(0xFF00+n8());return 12;
case 0xE2:wr(0xFF00+R[1],R[7]);return 8;
case 0xF2:R[7]=rd(0xFF00+R[1]);return 8;
case 0xEA:wr(n16(),R[7]);return 16;
case 0xFA:R[7]=rd(n16());return 16;
case 0xE9:PC=gr(2);return 4;
case 0xF9:SP=gr(2);return 8;
case 0xF3:ime=0;eiP=0;return 4;
case 0xFB:eiP=2;return 4;
case 0xE8:SP=spe();return 16;
case 0xF8:sr(2,spe());return 12;}
const lo4=op&15,i=(op>>4)&3;
if(lo4==1){if(i==3){const v=pop();R[7]=v>>8;fz=(v>>7)&1;fn=(v>>6)&1;fh=(v>>5)&1;fc=(v>>4)&1;}else sr(i,pop());return 12;}
if(lo4==5){if(i==3)push((R[7]<<8)|(fz<<7)|(fn<<6)|(fh<<5)|(fc<<4));else push(gr(i));return 16;}
if((op&0xE7)==0xC0){if(cc((op>>3)&3)){PC=pop();return 20;}return 8;}
if((op&0xE7)==0xC2){const a=n16();if(cc((op>>3)&3)){PC=a;return 16;}return 12;}
if((op&0xE7)==0xC4){const a=n16();if(cc((op>>3)&3)){push(PC);PC=a;return 24;}return 12;}
if((op&7)==6){alu((op>>3)&7,n8());return 8;}
if((op&7)==7){push(PC);PC=op&0x38;return 16;}
return 4;}
function step(){const p=io[15]&ie&31;
if(p){halt=0;if(ime){for(let i=0;i<5;i++)if((p>>i)&1){io[15]&=~(1<<i);ime=0;push(PC);PC=0x40+i*8;return 20;}}}
if(halt)return 4;
const c=exec();if(eiP&&--eiP==0)ime=1;return c;}
function line(y){const L=io[0x40],bgp=io[0x47],o=y*160,P0=pals[0];
if(L&1){const scx=io[0x43],scy=io[0x42],wy=io[0x4A],wx=io[0x4B]-7,uw=(L&32)&&y>=wy&&wx<160;
for(let x=0;x<160;x++){let tx,ty,map;
if(uw&&x>=wx){map=(L&64)?0x1C00:0x1800;tx=x-wx;ty=wl;}else{map=(L&8)?0x1C00:0x1800;tx=(x+scx)&255;ty=(y+scy)&255;}
const t=vram[map+((ty>>3)<<5)+(tx>>3)],r=((L&16)?t*16:0x1000+((t<<24)>>24)*16)+((ty&7)<<1),b=7-(tx&7),idx=((vram[r]>>b)&1)|(((vram[r+1]>>b)&1)<<1);
bgi[x]=idx;fb[o+x]=P0[(bgp>>(idx*2))&3];}
if(uw)wl++;}
else for(let x=0;x<160;x++){bgi[x]=0;fb[o+x]=P0[bgp&3];}
if(L&2){const h=(L&4)?16:8,sp=[];
for(let i=0;i<40&&sp.length<10;i++){const sy=oam[i*4]-16;if(y>=sy&&y<sy+h)sp.push(i);}
sp.sort((a,b)=>(oam[b*4+1]-oam[a*4+1])||(b-a));
for(const i of sp){const sy=oam[i*4]-16,sx=oam[i*4+1]-8,f=oam[i*4+3];let t=oam[i*4+2],yy=y-sy;
if(f&64)yy=h-1-yy;if(h==16)t&=0xFE;
const r=t*16+yy*2,pp=pals[(f&16)?2:1],pg=io[(f&16)?0x49:0x48];
for(let px=0;px<8;px++){const x=sx+px;if(x<0||x>=160)continue;
const b=(f&32)?px:7-px,idx=((vram[r]>>b)&1)|(((vram[r+1]>>b)&1)<<1);
if(!idx||((f&128)&&bgi[x]))continue;fb[o+x]=pp[(pg>>(idx*2))&3];}}}}
function tick(c){divc=(divc+c)&65535;
if(io[7]&4){tc+=c;const p=[1024,16,64,256][io[7]&3];while(tc>=p){tc-=p;if(++io[5]>255){io[5]=io[6];io[15]|=4;}}}
if(!(io[0x40]&128))return;
lc+=c;
if(ly<144&&!drawn&&lc>=252){drawn=1;line(ly);if(io[0x41]&8)io[15]|=2;}
if(lc>=456){lc-=456;drawn=0;ly++;
if(ly==144){io[15]|=1;if(io[0x41]&16)io[15]|=2;fd=1;}
else if(ly>153){ly=0;wl=0;}
if(ly<144&&(io[0x41]&32))io[15]|=2;
if(ly==io[0x45]&&(io[0x41]&64))io[15]|=2;}}
const K={right:[0,1],left:[1,1],up:[2,1],down:[3,1],a:[0,0],b:[1,0],select:[2,0],start:[3,0]};
return{
frame(){fd=0;let n=0;while(!fd&&n++<200000){tick(step());if(!(io[0x40]&128)&&n>17556){fb.fill(pals[0][0]);break;}}},
setPal(p){pals=p;},
key(nm,d){const[bit,dir]=K[nm],m=1<<bit;if(dir){if(d)jd|=m;else jd&=~m;}else{if(d)jb|=m;else jb&=~m;}if(d)io[15]|=16;}};}


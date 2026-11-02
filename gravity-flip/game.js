'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const WORLD={w:1000,h:430,top:62,bottom:368},player={x:175,y:354,vy:0,r:12};
let state='ready',gravity=1,time=0,distance=0,bonus=0,best=0,speed=330,next=510,obstacles=[],shards=[],particles=[],trail=[],last=0,scroll=0,patternStep=0,lastSide=null,sideRun=0;
try{best=Number(localStorage.getItem('gravity-flip-best'))||0}catch{}
function resize(){const d=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=r.width*d;canvas.height=r.height*d}new ResizeObserver(resize).observe(canvas);
function show(title,message,button){$('overlay').classList.remove('hidden');$('title').textContent=title;$('message').textContent=message;$('play').textContent=button}
function start(){$('play').blur();state='playing';gravity=1;time=distance=bonus=scroll=patternStep=0;speed=330;next=510;lastSide=null;sideRun=0;obstacles=[];shards=[];particles=[];trail=[];player.y=WORLD.bottom-player.r;player.vy=0;$('overlay').classList.add('hidden');$('pause').disabled=false;$('pause').textContent='Pause';$('pause').setAttribute('aria-label','Pause game');hud();}
function flip(){if(state!=='playing')return;gravity*=-1;player.vy=gravity*240;hud()}
function pause(){if(state==='playing'){state='paused';show('Paused','Take a breath.','Resume');$('pause').textContent='Resume';$('pause').setAttribute('aria-label','Resume game')}else if(state==='paused'){state='playing';$('overlay').classList.add('hidden');$('pause').textContent='Pause';$('pause').setAttribute('aria-label','Pause game')}}
function action(){if(state==='ready'||state==='over')start();else if(state==='paused')pause();else flip()}
function burst(x,y,color,count=18){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*170;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.6,color})}}
function die(){if(state!=='playing')return;state='over';burst(player.x,player.y,'#b5ffdb',32);const score=Math.floor(distance+bonus),record=score>best;if(record){best=score;try{localStorage.setItem('gravity-flip-best',best)}catch{}}show('Game over',`Score ${score} · Best ${best}`,'Play again');$('pause').disabled=true}

function hud(){$('distance').textContent=String(Math.floor(distance+bonus))}
// Five clusters per section; all spacing is measured in world pixels.
const SECTIONS = ['open', 'passages', 'switchbacks', 'moving'];
const railY = side => side === 'floor' ? WORLD.bottom - 14 : WORLD.top + 14;
function goldTrail(x, side, count = 5, spacing = 34) {
  for (let i = 0; i < count; i++)
    shards.push({x: x + i * spacing, y: railY(side), r: 8});
}
function spike(x, side, h = 64, w = 56) {
  const opposite = value => value === 'floor' ? 'ceiling' : 'floor';
  const count = value => obstacles.filter(o => o.side === value && o.x + o.w > 0).length;
  if ((side === lastSide && sideRun >= 3) || count(side) >= 3) side = opposite(side);
  if (count(side) >= 3 || (side === lastSide && sideRun >= 3)) return null;
  sideRun = side === lastSide ? sideRun + 1 : 1;
  lastSide = side;
  obstacles.push({x, w, y: side === 'floor' ? WORLD.bottom - h : WORLD.top,
    h, side, kind: 'spike'});
  return side;
}
// Most clusters have one collectible; only one in six gets a short trail.
function placeGold(x, side) {
  if (Math.random() < 1 / 6) goldTrail(x, side, 3, 28);
  else shards.push({x: x + 28, y: railY(side), r: 8});
}
function runSpeed(seconds) {
  return 330 + 390 * (1 - Math.exp(-seconds / 65));
}
function spawn() {
  const section = SECTIONS[Math.floor(patternStep / 5) % SECTIONS.length];
  const step = patternStep % 5, x = 1060;
  let gap;
  if (section === 'open') {
    // A brief recovery stretch between denser sections.
    const side = Math.random() < .5 ? 'floor' : 'ceiling';
    spike(x, side, 62 + Math.random() * 28);
    placeGold(x - 15, lastSide === 'floor' ? 'ceiling' : 'floor');
    gap = 340;
  } else if (section === 'passages') {
    // Staggered tall obstacles overlap vertically, forcing complete crossings.
    const side = step % 2 ? 'ceiling' : 'floor';
    spike(x, side, 170 + Math.random() * 42, 64);
    placeGold(x - 15, lastSide === 'floor' ? 'ceiling' : 'floor');
    gap = 255;
  } else if (section === 'switchbacks') {
    // Alternating hazards reward a steady rhythm of full crossings.
    const side = step % 2 ? 'ceiling' : 'floor';
    spike(x, side, Math.random() < .4 ? 165 + Math.random() * 25 : 80, 48);
    placeGold(x - 10, lastSide === 'floor' ? 'ceiling' : 'floor');
    gap = 270;
  } else {
    // Full-height sweeps reach the ceiling and floor, opening the opposite route.
    const h = 100 + Math.random() * 38;
    obstacles.push({x, w: 38, y: 150, h, kind: 'barrier',
      moving: true, phase: step * 1.4, age: 0,
      centerY: (WORLD.top + WORLD.bottom - h) / 2,
      amplitude: (WORLD.bottom - WORLD.top - h) / 2});
    placeGold(x - 100, step % 2 ? 'floor' : 'ceiling');
    gap = 300;
  }
  patternStep++;
  // Extra space separates sections and gives time to read the next pattern.
  // Reserve a full crossing plus hazard clearance as speed rises.
  // Same-side passages can be tighter because they require no crossing.
  const minimum = speed * .58 + 72;
  next = Math.max(gap, minimum) + (patternStep % 5 === 0 ? 70 : 0);
}
function moveObstacle(o, dt) {
  o.x -= speed * dt;
  if (o.moving) {
    o.age += dt;
    o.y = o.centerY + Math.sin(o.age * 1.8 + o.phase) * o.amplitude;
  }
}
function circleRect(x,y,r,o){const dx=x-Math.max(o.x,Math.min(x,o.x+o.w)),dy=y-Math.max(o.y,Math.min(y,o.y+o.h));return dx*dx+dy*dy<r*r}
function inTriangle(px,py,a,b,c){const s=(p,q,r)=>(p.x-r.x)*(q.y-r.y)-(q.x-r.x)*(p.y-r.y),p={x:px,y:py},d=[s(p,a,b),s(p,b,c),s(p,c,a)];return !(d.some(v=>v<0)&&d.some(v=>v>0))}
function segmentDistance(px,py,a,b){let t=((px-a.x)*(b.x-a.x)+(py-a.y)*(b.y-a.y))/((b.x-a.x)**2+(b.y-a.y)**2);t=Math.max(0,Math.min(1,t));return Math.hypot(px-a.x-t*(b.x-a.x),py-a.y-t*(b.y-a.y))}
function triangle(o){const base=o.side==='floor'?WORLD.bottom:WORLD.top,tip=o.side==='floor'?o.y:o.y+o.h;return [{x:o.x,y:base},{x:o.x+o.w/2,y:tip},{x:o.x+o.w,y:base}]}
function hit(o){if(o.kind==='barrier')return circleRect(player.x,player.y,player.r-2,o);const a=triangle(o);return inTriangle(player.x,player.y,...a)||a.some((p,i)=>segmentDistance(player.x,player.y,p,a[(i+1)%3])<player.r-2)}
function update(dt){if(state==='playing'){time+=dt;speed=runSpeed(time);scroll+=speed*dt;distance+=speed*dt/18;player.vy+=gravity*1700*dt;player.y+=player.vy*dt;if(player.y<WORLD.top+player.r){player.y=WORLD.top+player.r;player.vy=0}if(player.y>WORLD.bottom-player.r){player.y=WORLD.bottom-player.r;player.vy=0}next-=speed*dt;if(next<=0)spawn();for(const o of obstacles){moveObstacle(o,dt);if(hit(o)){die();return}}for(const s of shards){s.x-=speed*dt;if(Math.hypot(s.x-player.x,s.y-player.y)<player.r+s.r){s.x=-100;bonus+=25;burst(player.x,player.y,'#f7ce77',12);}}obstacles=obstacles.filter(o=>o.x+o.w>0);shards=shards.filter(s=>s.x>-20);trail.push({x:player.x,y:player.y,life:.25});hud()}if(state!=='paused'){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);for(const p of trail){p.x-=speed*dt;p.life-=dt}trail=trail.filter(p=>p.life>0)}}
function draw(t){const sx=canvas.width/WORLD.w,sy=canvas.height/WORLD.h;ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,1000,430);ctx.fillStyle='#111923';ctx.fillRect(0,0,1000,430);ctx.fillStyle='#27313c';ctx.fillRect(0,45,1000,17);ctx.fillRect(0,368,1000,17);ctx.fillStyle='#b5ffdb';ctx.shadowColor='#83ffb9';ctx.shadowBlur=0;ctx.fillRect(0,61,1000,1);ctx.fillRect(0,368,1000,1);ctx.shadowBlur=0;
const obs=obstacles;for(const o of obs){ctx.fillStyle='#a677ff33';ctx.strokeStyle='#bd90ff';ctx.shadowColor='#ac75ff';ctx.shadowBlur=0;ctx.lineWidth=2;if(o.kind==='spike'){const a=triangle(o);ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);ctx.lineTo(a[1].x,a[1].y);ctx.lineTo(a[2].x,a[2].y);ctx.closePath();ctx.fill();ctx.stroke()}else{ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeRect(o.x,o.y,o.w,o.h);ctx.beginPath();ctx.moveTo(o.x+6,o.y+8);ctx.lineTo(o.x+o.w-6,o.y+o.h-8);ctx.stroke()}ctx.shadowBlur=0}
for(const s of shards){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#f7ce7733';ctx.strokeStyle='#f7ce77';ctx.shadowColor='#f7ce77';ctx.shadowBlur=0;ctx.fillRect(-6,-6,12,12);ctx.strokeRect(-6,-6,12,12);ctx.restore()}if(state!=='over'){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(time*2*(gravity===1?1:-1));ctx.shadowColor='#b5ffdb';ctx.shadowBlur=0;ctx.fillStyle='#b5ffdb';ctx.fillRect(-10,-10,20,20);ctx.shadowBlur=0;ctx.fillStyle='#193824';ctx.fillRect(-4,-4,8,8);ctx.restore()}for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.6);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1}
function frame(t){const dt=Math.min((t-last)/1000||0,.033);last=t;update(dt);draw(t);requestAnimationFrame(frame)}requestAnimationFrame(frame);
$('play').onclick=e=>{e.stopPropagation();state==='paused'?pause():start()};$('pause').onclick=pause;canvas.addEventListener('pointerdown',e=>{e.preventDefault();action()});addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&e.key===' ')return;if([' ','ArrowUp','w','W','p','P','Escape'].includes(e.key)){e.preventDefault();if(e.repeat)return;if(['p','P','Escape'].includes(e.key))pause();else action()}});addEventListener('blur',()=>{if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});

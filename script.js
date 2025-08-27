
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', {alpha:false});
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('highscore');
  const livesEl = document.getElementById('lives');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const difficultySel = document.getElementById('difficulty');
  const overlay = document.getElementById('overlay');
  const finalScore = document.getElementById('final-score');
  const playAgain = document.getElementById('playAgain');
  const watermark = document.getElementById('watermark');

  function fitCanvas() {
    // full available viewport size (account for device pixel ratio)
    const DPR = window.devicePixelRatio || 1;
    const w = Math.max(320, Math.floor(window.innerWidth * DPR));
    const h = Math.max(480, Math.floor((window.innerHeight - 160) * DPR));
    canvas.width = w; canvas.height = h;
  }
  window.addEventListener('resize', () => { fitCanvas(); draw(); });

  let running=false, score=0, highscore=loadHS(), lives=3;
  let items=[], basket={x:0,y:0,w:120,h:30,speed:8}, lastSpawn=0, spawnInterval=1200, gravity=2.0, lastTime=0;
  let difficulty='medium';

  const TYPES=[{id:'apple',emoji:'🍎',p:1,prob:40},{id:'banana',emoji:'🍌',p:2,prob:30},{id:'grape',emoji:'🍇',p:3,prob:20},{id:'straw',emoji:'🍓',p:4,prob:8},{id:'bomb',emoji:'💣',p:0,prob:2,bomb:true}];

  function pick(){const total=TYPES.reduce((s,t)=>s+t.prob,0);let r=Math.random()*total,acc=0;for(let t of TYPES){acc+=t.prob;if(r<=acc) return t}return TYPES[0]}

  function resetState(){
    fitCanvas();
    score=0;lives=3;items=[];
    spawnInterval = difficulty==='hard'?900:(difficulty==='easy'?1500:1200);
    gravity = difficulty==='hard'?2.4:(difficulty==='easy'?1.6:2.0);
    const W = canvas.width / (window.devicePixelRatio||1);
    const H = canvas.height / (window.devicePixelRatio||1);
    basket.w = Math.max(80, Math.floor(W/6)); basket.h = Math.max(24, Math.floor(basket.w/4));
    basket.x = (W - basket.w)/2; basket.y = H - basket.h - 12;
    updateHUD(); updateHigh();
  }
  function loadHS(){const v=localStorage.getItem('ctf_hs');return v?parseInt(v,10):0}
  function saveHS(v){localStorage.setItem('ctf_hs',String(v))}
  function updateHigh(){document.getElementById('highscore').textContent = highscore}
  function updateHUD(){scoreEl.textContent=score; livesEl.textContent=lives}

  function spawn(){
    const t = pick();
    const DPR=window.devicePixelRatio||1;
    const W = canvas.width / DPR;
    const size = Math.max(28, Math.floor(W/(6+Math.random()*6)));
    const x = Math.random()*(W - size);
    const speed = gravity * (1 + Math.random()*0.7);
    items.push({type:t.id,emoji:t.emoji,x:x,y:-size,w:size,h:size,vy:speed,points:t.p,bomb:!!t.bomb});
  }

  function draw(){
    const DPR=window.devicePixelRatio||1;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    // background gradient
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#60a5fa'); g.addColorStop(1,'#a7f3d0');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    ctx.save(); ctx.scale(DPR,DPR);
    // items
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '28px serif';
    items.forEach(it => { ctx.fillText(it.emoji, it.x, it.y + it.h - 6); });
    // basket
    ctx.fillStyle = '#7c3aed'; roundRect(ctx, basket.x, basket.y, basket.w, basket.h, 8); ctx.fill();
    ctx.fillStyle = '#6ee7b7'; ctx.fillRect(basket.x+6, basket.y-6, basket.w-12, 6);

    // ground line
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, (canvas.height/DPR)-2, (canvas.width/DPR), 2);

    ctx.restore();
  }
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}

  function loop(ts){
    if(!running){ lastTime=ts; requestAnimationFrame(loop); return; }
    const delta = ts - lastTime; lastTime = ts;
    if (ts - lastSpawn > spawnInterval){ spawn(); lastSpawn = ts; spawnInterval = Math.max(450, spawnInterval * 0.995); }
    for (let i=items.length-1;i>=0;i--){
      const it = items[i]; it.y += it.vy * (delta/16);
      const DPR=window.devicePixelRatio||1;
      const H = canvas.height / DPR;
      if (it.y + it.h >= basket.y && it.x + it.w > basket.x && it.x < basket.x + basket.w){
        if (it.bomb){ lives--; play('bomb'); } else { score += it.points; play('catch'); spawnInterval = Math.max(450, spawnInterval - (it.points*4)); }
        items.splice(i,1); updateHUD(); if (lives<=0) return endGame();
        continue;
      }
      if (it.y > H + 100){ if (!it.bomb){ lives--; updateHUD(); play('miss'); if (lives<=0) return endGame(); } items.splice(i,1); }
    }
    draw();
    requestAnimationFrame(loop);
  }

  function start(){ if (!running){ running=true; lastTime=performance.now(); requestAnimationFrame(loop); } }
  function pause(){ running=false }
  function reset(){ running=false; resetState(); draw(); overlay.classList.add('hidden'); }

  function endGame(){ running=false; if (score>highscore){ highscore=score; saveHS(highscore); updateHigh(); } document.getElementById('final-score').textContent = score; overlay.classList.remove('hidden'); }

  function moveBasket(dir){ basket.x += dir * basket.speed * 8; const W = canvas.width / (window.devicePixelRatio||1); basket.x = Math.max(0, Math.min(basket.x, W - basket.w)); draw(); }
  window.addEventListener('keydown',(e)=>{ if(e.key==='ArrowLeft') moveBasket(-1); if(e.key==='ArrowRight') moveBasket(1); if(e.key===' ') { if (running) pause(); else start(); } });

  // touch controls: tap halves and swipe
  let touchStart=null;
  canvas.addEventListener('touchstart',(e)=>{ e.preventDefault(); const t=e.touches[0]; touchStart={x:t.clientX,y:t.clientY}; const w=window.innerWidth; if (t.clientX < w/2) moveBasket(-1); else moveBasket(1); }, {passive:false});
  canvas.addEventListener('touchend',(e)=>{ if(!touchStart) return; const t=e.changedTouches[0]; const dx=t.clientX-touchStart.x, dy=t.clientY-touchStart.y; if(Math.abs(dx)>30 && Math.abs(dx)>Math.abs(dy)) moveBasket(dx>0?1:-1); touchStart=null; }, {passive:true});

  startBtn.addEventListener('click', ()=> start());
  pauseBtn.addEventListener('click', ()=> pause());
  resetBtn.addEventListener('click', ()=> reset());
  playAgain.addEventListener('click', ()=> { reset(); start(); });
  document.getElementById('gotoHome').addEventListener('click', ()=> { overlay.classList.add('hidden'); reset(); });

  difficultySel.addEventListener('change', ()=> { difficulty = difficultySel.value; resetState(); draw(); });

  function play(name){ try{ const ctxA = new (window.AudioContext||window.webkitAudioContext)(); const o = ctxA.createOscillator(); const g = ctxA.createGain(); o.connect(g); g.connect(ctxA.destination); if(name==='catch'){ o.type='sine'; o.frequency.value=880; g.gain.value=0.06; } if(name==='bomb'){ o.type='square'; o.frequency.value=120; g.gain.value=0.12;} if(name==='miss'){ o.type='sawtooth'; o.frequency.value=240; g.gain.value=0.04;} o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + 0.18); setTimeout(()=>{ o.stop(); ctxA.close(); },220);}catch(e){} }

  // watermark blinking: every 30s show for 4s
  function watermarkLoop(){
    setTimeout(()=>{
      function cycle(){ watermark.classList.add('show'); setTimeout(()=>watermark.classList.remove('show'),4000); setTimeout(cycle,30000); }
      cycle();
    },30000);
  }

  // init
  fitCanvas(); resetState(); draw(); watermarkLoop(); updateHigh();
  window.game = {start:start,pause:pause,reset:reset};
})();

(() => {
"use strict";

const COLS = 10, ROWS = 20, CELL = 30;
const board = document.getElementById("board");
const ctx = board.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
const holdCanvas = document.getElementById("hold");
const holdCtx = holdCanvas.getContext("2d");

const COLORS = {
  I:"#25d8ff", J:"#4f73ff", L:"#ff9b3d", O:"#ffd23f",
  S:"#48d597", Z:"#ff5f70", T:"#b66cff"
};

const SHAPES = {
  I:[[1,1,1,1]],
  J:[[1,0,0],[1,1,1]],
  L:[[0,0,1],[1,1,1]],
  O:[[1,1],[1,1]],
  S:[[0,1,1],[1,1,0]],
  Z:[[1,1,0],[0,1,1]],
  T:[[0,1,0],[1,1,1]]
};

let matrix, bag, queue, current, holdType;
let canHold, score, lines, level, paused, gameOver;
let lastTime = 0, gravityTimer = 0, raf = 0;
let lastActionWasRotate = false;
let lockTimer = 0;

function makeMatrix() {
  return Array.from({length: ROWS}, () => Array(COLS).fill(null));
}

function cloneShape(shape) {
  return shape.map(row => row.slice());
}

function shuffle(a) {
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function fillBag() {
  bag.push(...shuffle(Object.keys(SHAPES).slice()));
}

function nextType() {
  if(bag.length === 0) fillBag();
  return bag.shift();
}

function refillQueue() {
  while(queue.length < 5) queue.push(nextType());
}

function spawn(type = queue.shift()) {
  refillQueue();
  const shape = cloneShape(SHAPES[type]);
  current = {
    type,
    shape,
    x: Math.floor((COLS - shape[0].length)/2),
    y: -getTopEmptyRows(shape)
  };
  canHold = canHold !== false;
  lockTimer = 0;
  lastActionWasRotate = false;

  if(collides(current,0,0)) {
    gameOver = true;
    showMessage("GAME OVER","Novo jogo");
  }
}

function getTopEmptyRows(shape) {
  let n=0;
  for(const row of shape){
    if(row.some(Boolean)) break;
    n++;
  }
  return n;
}

function collides(p,dx,dy,shape=p.shape) {
  for(let y=0;y<shape.length;y++){
    for(let x=0;x<shape[y].length;x++){
      if(!shape[y][x]) continue;
      const nx=p.x+x+dx, ny=p.y+y+dy;
      if(nx<0 || nx>=COLS || ny>=ROWS) return true;
      if(ny>=0 && matrix[ny][nx]) return true;
    }
  }
  return false;
}

function move(dx) {
  if(paused || gameOver) return;
  if(!collides(current,dx,0)){
    current.x += dx;
    lockTimer=0;
    lastActionWasRotate=false;
    render();
  }
}

function softDrop() {
  if(paused || gameOver) return;
  if(!collides(current,0,1)){
    current.y++;
    score += 1;
    gravityTimer=0;
    lockTimer=0;
  } else {
    lockTimer += 100;
    if(lockTimer >= 450) lockPiece();
  }
  render();
}

function hardDrop() {
  if(paused || gameOver) return;
  let distance=0;
  while(!collides(current,0,distance+1)) distance++;
  current.y += distance;
  score += distance*2;
  lockPiece();
  render();
}

function rotateCW() {
  rotate(true);
}

function rotateCCW() {
  rotate(false);
}

function rotate(clockwise) {
  if(paused || gameOver) return;

  const old = current.shape;
  let rotated;
  if(clockwise){
    rotated = old[0].map((_,i)=>old.map(row=>row[i]).reverse());
  }else{
    rotated = old[0].map((_,i)=>old.map(row=>row[row.length-1-i]));
  }

  // Practical SRS-style kick attempts.
  const kicks = [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1]];
  for(const [kx,ky] of kicks){
    if(!collides(current,kx,ky,rotated)){
      current.shape=rotated;
      current.x+=kx;
      current.y+=ky;
      lastActionWasRotate=true;
      lockTimer=0;
      render();
      return;
    }
  }
}

function hold() {
  if(paused || gameOver || !canHold) return;
  const old = current.type;
  if(!holdType){
    holdType=old;
    spawn();
  }else{
    const swap=holdType;
    holdType=old;
    spawn(swap);
  }
  canHold=false;
  render();
}

function lockPiece() {
  for(let y=0;y<current.shape.length;y++){
    for(let x=0;x<current.shape[y].length;x++){
      if(!current.shape[y][x]) continue;
      const ny=current.y+y;
      if(ny>=0 && ny<ROWS) matrix[ny][current.x+x]=current.type;
    }
  }

  const cleared=clearLines();
  scoreLines(cleared);
  spawn();
  canHold=true;
  gravityTimer=0;
  lockTimer=0;
}

function clearLines() {
  let cleared=0;
  matrix = matrix.filter(row => {
    if(row.every(Boolean)){ cleared++; return false; }
    return true;
  });
  while(matrix.length<ROWS) matrix.unshift(Array(COLS).fill(null));
  lines += cleared;
  return cleared;
}

function scoreLines(n) {
  if(!n) return;
  const base=[0,100,300,500,800][n] || 0;
  score += base * level;
  level = 1 + Math.floor(lines/10);
}

function togglePause() {
  if(gameOver) return;
  paused=!paused;
  if(paused) showMessage("PAUSADO","Continuar");
  else hideMessage();
  lastTime=performance.now();
  gravityTimer=0;
  render();
}

function newGame() {
  cancelAnimationFrame(raf);
  matrix=makeMatrix();
  bag=[];
  queue=[];
  holdType=null;
  canHold=true;
  score=0;
  lines=0;
  level=1;
  paused=false;
  gameOver=false;
  lastActionWasRotate=false;
  lockTimer=0;
  fillBag();
  refillQueue();
  spawn();
  hideMessage();
  lastTime=performance.now();
  render();
  raf=requestAnimationFrame(loop);
  board.focus();
}

function gravityInterval() {
  // Guideline-style exponential gravity curve, clamped for usability.
  return Math.max(55, 1000 * Math.pow(0.8 - 0.007*(level-1), level-1));
}

function ghostY() {
  let d=0;
  while(!collides(current,0,d+1)) d++;
  return current.y+d;
}

function drawCell(c,x,y,type,alpha=1) {
  if(y<0) return;
  c.globalAlpha=alpha;
  c.fillStyle=COLORS[type];
  c.fillRect(x*CELL+2,y*CELL+2,CELL-4,CELL-4);
  c.strokeStyle="rgba(255,255,255,.22)";
  c.strokeRect(x*CELL+2,y*CELL+2,CELL-4,CELL-4);
  c.globalAlpha=1;
}

function drawBoard() {
  ctx.clearRect(0,0,board.width,board.height);
  ctx.fillStyle="#080c17";
  ctx.fillRect(0,0,board.width,board.height);

  ctx.strokeStyle="rgba(255,255,255,.045)";
  ctx.lineWidth=1;
  for(let x=1;x<COLS;x++){
    ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,ROWS*CELL);ctx.stroke();
  }
  for(let y=1;y<ROWS;y++){
    ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(COLS*CELL,y*CELL);ctx.stroke();
  }

  for(let y=0;y<ROWS;y++)
    for(let x=0;x<COLS;x++)
      if(matrix[y][x]) drawCell(ctx,x,y,matrix[y][x]);

  if(current){
    const gy=ghostY();
    for(let y=0;y<current.shape.length;y++)
      for(let x=0;x<current.shape[y].length;x++)
        if(current.shape[y][x]) drawCell(ctx,current.x+x,gy+y,current.type,.22);

    for(let y=0;y<current.shape.length;y++)
      for(let x=0;x<current.shape[y].length;x++)
        if(current.shape[y][x]) drawCell(ctx,current.x+x,current.y+y,current.type,1);
  }
}

function drawMini(c,type,w,h,cellSize=22){
  c.clearRect(0,0,w,h);
  c.fillStyle="#080c17";
  c.fillRect(0,0,w,h);
  if(!type) return;
  const s=SHAPES[type];
  const ox=(w-s[0].length*cellSize)/2;
  const oy=(h-s.length*cellSize)/2;
  c.fillStyle=COLORS[type];
  for(let y=0;y<s.length;y++)
    for(let x=0;x<s[y].length;x++)
      if(s[y][x]){
        c.fillRect(ox+x*cellSize+2,oy+y*cellSize+2,cellSize-4,cellSize-4);
      }
}

function render() {
  drawBoard();
  drawMini(holdCtx,holdType,120,90,22);
  nextCtx.clearRect(0,0,150,310);
  for(let i=0;i<Math.min(5,queue.length);i++){
    const type=queue[i], s=SHAPES[type], cell=20;
    const ox=(150-s[0].length*cell)/2, oy=i*61+(61-s.length*cell)/2;
    nextCtx.fillStyle=COLORS[type];
    for(let y=0;y<s.length;y++)
      for(let x=0;x<s[y].length;x++)
        if(s[y][x]) nextCtx.fillRect(ox+x*cell+2,oy+y*cell+2,cell-4,cell-4);
  }
  document.getElementById("score").textContent=score.toLocaleString("pt-BR");
  document.getElementById("lines").textContent=lines;
  document.getElementById("level").textContent=level;
}

function loop(time) {
  if(!paused && !gameOver){
    const dt=Math.min(100,time-lastTime);
    lastTime=time;
    gravityTimer+=dt;
    if(gravityTimer>=gravityInterval()){
      gravityTimer=0;
      if(!collides(current,0,1)){
        current.y++;
        lockTimer=0;
      }else{
        lockTimer+=gravityInterval();
        if(lockTimer>=450) lockPiece();
      }
    }
    render();
  }else{
    lastTime=time;
  }
  raf=requestAnimationFrame(loop);
}

function showMessage(title,buttonText){
  document.getElementById("messageTitle").textContent=title;
  document.getElementById("messageButton").textContent=buttonText;
  document.getElementById("message").classList.remove("hidden");
}
function hideMessage(){document.getElementById("message").classList.add("hidden");}

function action(a){
  if(a==="left") move(-1);
  else if(a==="right") move(1);
  else if(a==="down") softDrop();
  else if(a==="drop") hardDrop();
  else if(a==="rotateCW") rotateCW();
  else if(a==="rotateCCW") rotateCCW();
  else if(a==="hold") hold();
  else if(a==="pause") togglePause();
}

document.querySelectorAll("[data-action]").forEach(btn=>{
  btn.addEventListener("click",()=>action(btn.dataset.action));
});

document.getElementById("newGame").addEventListener("click",newGame);
document.getElementById("messageButton").addEventListener("click",()=>{
  if(gameOver) newGame(); else togglePause();
});

board.addEventListener("keydown",e=>{
  const k=e.key;
  if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," ","z","Z","x","X","c","C","Shift","p","P","Escape","r","R"].includes(k)) e.preventDefault();

  if(k==="ArrowLeft") move(-1);
  else if(k==="ArrowRight") move(1);
  else if(k==="ArrowDown") softDrop();
  else if(k==="ArrowUp" || k==="x" || k==="X") rotateCW();
  else if(k==="z" || k==="Z") rotateCCW();
  else if(k===" ") hardDrop();
  else if(k==="c" || k==="C" || k==="Shift") hold();
  else if(k==="p" || k==="P" || k==="Escape") togglePause();
  else if(k==="r" || k==="R") newGame();
});

board.addEventListener("click",()=>board.focus());

let touchStart=null;
board.addEventListener("touchstart",e=>{
  const t=e.changedTouches[0];
  touchStart={x:t.clientX,y:t.clientY,time:performance.now()};
},{passive:true});

board.addEventListener("touchend",e=>{
  if(!touchStart)return;
  const t=e.changedTouches[0];
  const dx=t.clientX-touchStart.x, dy=t.clientY-touchStart.y;
  const adx=Math.abs(dx), ady=Math.abs(dy);
  const duration=performance.now()-touchStart.time;
  touchStart=null;

  if(adx<18 && ady<18 && duration<350){ rotateCW(); return; }
  if(adx>ady && adx>25){ move(dx>0?1:-1); return; }
  if(ady>25){
    if(dy>0) hardDrop();
    else rotateCW();
  }
},{passive:true});

newGame();
})();
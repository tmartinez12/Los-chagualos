const titles={
  'pg-inicio':['Buenos días, Tatiana','Jueves 12 de junio · lluvia ayer: 12 mm'],
  'pg-hato':['Hato','80 animales · unidad leche'],
  'pg-potreros':['Potreros','32 potreros · ocupación 1 día (máx 2)'],
  'pg-diario':['Diario de la finca','Quién registró qué — y qué falta'],
  'pg-decisiones':['Decisiones del mes','Junio 2026 · la reunión de finca, lista'],
};
function go(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.pg===id));
  document.getElementById('pgTitle').textContent=titles[id][0];
  document.getElementById('pgSub').textContent=titles[id][1];
  document.querySelector('.content').scrollTop=0;
}
let snackTimer;
function snack(msg){const sb=document.getElementById('snackbar');
  document.getElementById('snackText').textContent=msg;sb.classList.add('show');
  clearTimeout(snackTimer);snackTimer=setTimeout(()=>sb.classList.remove('show'),2600);}
/* 32 potreros ordenados por estado: listos → recuperando → recién pastoreados */
const pots=[];
for(let i=1;i<=32;i++){
  let d;
  if(i===7)d=-2;            // hato aquí
  else if(i===8)d=1; else if(i===9)d=3; else if(i===14)d=2; else if(i===21)d=4;
  else d=5+((i*7)%31);
  pots.push({n:i,d:d});
}
function stateOf(p){if(p.d<0)return'now';if(p.d<=5)return'bad';if(p.d<25)return'warn';return'ok';}
const order={ok:0,warn:1,bad:2,now:3};
pots.sort((a,b)=>{const s=order[stateOf(a)]-order[stateOf(b)];return s!==0?s:b.d-a.d;});
const grid=document.getElementById('pgrid');
pots.forEach(p=>{
  const st=stateOf(p);
  const div=document.createElement('div');
  div.className='pot '+(st==='now'?'bad now':st)+(st==='bad'?' off':'');
  const cap=st==='now'?'día de ocupación':st==='ok'?'listo':st==='warn'?'recuperando':'recién pastoreado';
  const days=st==='now'?'2º':p.d;
  div.innerHTML=(st==='now'?'<div class="p-tag">HATO AQUÍ</div>':'')+
    (p.n===4?'<div class="p-tag">SUGERIDO</div>':'')+
    '<div class="p-top"><span class="p-name">P'+p.n+'</span><span class="dot"></span></div>'+
    '<div class="p-days">'+days+'</div><div class="p-cap">'+cap+'</div>';
  if(p.n===4){div.classList.add('suggested');}
  div.onclick=()=>snack('Potrero '+p.n+': '+(st==='now'?'el hato está aquí (día 2)':p.d+' días de descanso · '+cap));
  grid.appendChild(div);
});

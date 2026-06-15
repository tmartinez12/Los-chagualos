const titles={
  'pg-inicio':['Buenos días, Tatiana','Jueves 12 de junio · lluvia ayer: 12 mm'],
  'pg-leche':['Producción de leche','26 vacas en ordeño · hoy 184 L'],
  'pg-hato':['Hato','80 animales · unidad leche'],
  'pg-potreros':['Potreros','32 potreros · ocupación 1 día (máx 2)'],
  'pg-diario':['Diario de la finca','Quién registró qué — y qué falta'],
  'pg-decisiones':['Decisiones del mes','Junio 2026 · la reunión de finca, lista'],
  'pg-repro':['Reproducción','Monta natural · la palpación manda'],
  'pg-partos':['Partos','Las palpaciones marcan las fechas'],
  'pg-sanitario':['Plan sanitario','Calendario anual · protocolos · soporte ICA'],
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
function snack(msg,accionLabel,accionFn){const sb=document.getElementById('snackbar');
  document.getElementById('snackText').textContent=msg;
  const act=document.getElementById('snackAction');
  if(act){
    if(accionLabel){act.textContent=accionLabel;act.style.display='';
      act.onclick=()=>{act.style.display='none';sb.classList.remove('show');clearTimeout(snackTimer);accionFn&&accionFn();};}
    else{act.style.display='none';act.onclick=null;}
  }
  sb.classList.add('show');
  clearTimeout(snackTimer);snackTimer=setTimeout(()=>sb.classList.remove('show'),accionLabel?5200:2600);}

/* ===== Registrar leche por vaca ===== */
const milkCows=[
  {num:'042',n:'Lucero',  del:'DEL 152 · 3er parto',          ayer:18},
  {num:'038',n:'Mona',    del:'DEL 98 · servida, por palpar', ayer:16},
  {num:'051',n:'Careta',  del:'DEL 121 · 1er parto',          ayer:14},
  {num:'027',n:'Estrella',del:'DEL 64 · pico de lactancia',   ayer:13},
  {num:'017',n:'Azucena', del:'DEL 201 · retiro 2 días más',  ayer:11, retiro:2,
    estado:'<span class="badge bad">retiro 2d</span>', nota:'no vender su leche'},
  {num:'033',n:'Paloma',  del:'DEL 95 · 4to parto',           ayer:9,
    estado:'<span class="badge bad">vacía 132d</span>', nota:'producción muy baja', notaRed:1},
  {num:'029',n:'Pinta',   del:'DEL 412 · lactancia larga',    ayer:5,
    estado:'<span class="badge bad">vacía 150d</span>', nota:'evaluar descarte', notaRed:1}
];
milkCows[0].estado='<span class="badge warn">preñada 6m</span>';milkCows[0].nota='secar ~12 jul';
milkCows[1].estado='<span class="badge">servida</span>';milkCows[1].nota='por confirmar palp.';
milkCows[2].nota='1er parto';milkCows[3].nota='pico de lactancia';
milkCows.forEach(c=>{c.done=false;c.v=null;});
let mi=-1;
function renderMilk(){
  const tb=document.getElementById('milkTbody');if(!tb)return;tb.innerHTML='';
  milkCows.forEach((c,i)=>{
    const tr=document.createElement('tr');
    if(c.done)tr.className='done';
    tr.onclick=()=>openMilk(i);
    let hoy,varCell;
    if(c.done){
      hoy='<span class="reg">'+c.v+' L ✓</span>';
      const d=c.v-c.ayer;
      varCell=d>0?'<span class="up">↑ +'+d+'</span>':d<0?'<span class="down">↓ '+d+'</span>':'<span class="mut">= ayer</span>';
    }else{hoy='<span class="pending">— pend.</span>';varCell='<span class="mut">—</span>';}
    tr.innerHTML='<td><div class="cell-animal"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div></div></div></td>'+
      '<td class="r">'+c.ayer+'</td><td class="r">'+hoy+'</td><td class="r">'+varCell+'</td>'+
      '<td class="r">'+c.del.replace(/DEL (\d+).*/,'$1')+'</td>'+
      '<td>'+(c.estado||'')+'</td>'+
      '<td class="sub"'+(c.notaRed?' style="color:var(--red)"':'')+'>'+(c.nota||'')+'</td>';
    tb.appendChild(tr);
  });
  const done=milkCows.filter(c=>c.done);
  const prog=document.getElementById('milkProg');
  if(prog)prog.textContent=done.length+' de '+milkCows.length+' · Σ '+done.reduce((s,c)=>s+c.v,0)+' L';
}
function openMilk(i){mi=i;const c=milkCows[i];
  document.getElementById('mCow').textContent=c.num+' · '+c.n.toUpperCase();
  document.getElementById('mDel').textContent=c.del;
  const inp=document.getElementById('mInput');inp.value=c.done?c.v:c.ayer;
  const ref=document.getElementById('mRef');
  if(c.retiro){ref.className='m-ref warn';
    ref.textContent='⛔ En retiro '+c.retiro+' días — registra su leche, pero no se vende';}
  else{ref.className='m-ref';
    ref.textContent=c.done?'Ya registrada con '+c.v+' L — puedes corregirla':'Ayer dio '+c.ayer+' L — acepta si dio igual';}
  document.getElementById('scrim').classList.add('show');
  document.getElementById('milkModal').classList.add('show');
  setTimeout(()=>{inp.focus();inp.select();},60);
}
function closeMilk(){document.getElementById('milkModal').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');mi=-1;}
function saveMilk(){
  if(mi<0)return;
  const c=milkCows[mi];
  const v=Math.max(0,Math.min(60,parseInt(document.getElementById('mInput').value)||0));
  const prev={done:c.done,v:c.v};
  const drop=!c.done&&c.ayer>0&&v<=c.ayer*0.75;
  c.done=true;c.v=v;
  closeMilk();renderMilk();
  if(drop)snack('Atención: '+c.n+' bajó '+(c.ayer-v)+' L vs ayer — ¿mastitis, celo, comida?','Deshacer',()=>{
    c.done=prev.done;c.v=prev.v;renderMilk();snack('Registro deshecho');});
  else snack(c.n+': '+v+' L guardados','Deshacer',()=>{
    c.done=prev.done;c.v=prev.v;renderMilk();snack('Registro deshecho');});
  if(milkCows.every(x=>x.done)){
    const tot=milkCows.reduce((s,x)=>s+x.v,0);
    setTimeout(()=>snack('Ordeño completo: '+tot+' L en estas '+milkCows.length+' vacas — siguiente: entregas a los lecheros'),1600);
  }
}
renderMilk();
/* ===== Producción mensual por vaca ===== */
const mensualData=[
  {num:'042',n:'Lucero',   m:[null,null,12.5,14.8,17.2,18.0], partos:'parió ene'},
  {num:'038',n:'Mona',     m:[14.2,14.0,15.1,14.8,15.5,16.0]},
  {num:'051',n:'Careta',   m:[null,null,10.2,12.0,13.6,14.0], partos:'parió feb, 1er parto'},
  {num:'027',n:'Estrella', m:[null,null,null,null,11.8,13.0], partos:'parió abr'},
  {num:'017',n:'Azucena',  m:[14.0,13.5,9.0,10.5,11.0,11.0], nota:'mastitis mar → baja'},
  {num:'033',n:'Paloma',   m:[11.0,10.2,9.8,8.5,7.0,6.0],    nota:'bajando — vacía'},
  {num:'029',n:'Pinta',    m:[8.0,7.5,7.0,6.2,5.5,5.0],      nota:'lactancia >400d — vacía'},
];
let mensualVista='promedio';
function toggleMensual(v){mensualVista=v;renderMensual();
  document.querySelectorAll('.section-label .btn.outl.small').forEach(b=>{
    if(b.textContent.includes('Total'))b.style.cssText=v==='total'?'font-weight:700;border-color:var(--ink)':'';
    if(b.textContent.includes('L/día'))b.style.cssText=v==='promedio'?'font-weight:700;border-color:var(--ink)':'';
  });}
function renderMensual(){
  const tb=document.getElementById('mensualBody');if(!tb)return;tb.innerHTML='';
  const totales=[0,0,0,0,0,0];const conteos=[0,0,0,0,0,0];
  mensualData.forEach(c=>{
    c.m.forEach((v,i)=>{if(v!==null){totales[i]+=v;conteos[i]++;}});
  });
  mensualData.forEach(c=>{
    const tr=document.createElement('tr');
    const vals=c.m.map(v=>v!==null?v:null);
    const activos=vals.filter(v=>v!==null);
    const prom=activos.length?activos.reduce((a,b)=>a+b,0)/activos.length:0;
    const total=activos.reduce((a,b)=>a+b,0);
    const diasMes=[31,28,31,30,31,12];
    const totalL=vals.map((v,i)=>v!==null?Math.round(v*diasMes[i]):0).reduce((a,b)=>a+b,0);
    let cells='<td><div class="cell-animal"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div>'+
      (c.nota?'<div class="cs" style="color:var(--red)">'+c.nota+'</div>':
       c.partos?'<div class="cs">'+c.partos+'</div>':'')+
      '</div></div></td>';
    vals.forEach((v,i)=>{
      if(v===null){cells+='<td class="r"><span class="pending">—</span></td>';}
      else{
        const val=mensualVista==='total'?Math.round(v*diasMes[i]):v.toFixed(1);
        const promHato=conteos[i]?totales[i]/conteos[i]:0;
        let cls='';
        if(v<promHato*0.65)cls=' class="down"';
        else if(v>promHato*1.15)cls=' class="up"';
        cells+='<td class="r"><span'+cls+'>'+(mensualVista==='total'?val:val)+
          (mensualVista==='promedio'?'':'')+'</span></td>';
      }
    });
    const promVal=mensualVista==='total'?Math.round(totalL/Math.max(1,activos.length)):prom.toFixed(1);
    cells+='<td class="r" style="font-weight:700">'+promVal+'</td>';
    cells+='<td class="r" style="font-weight:700">'+(mensualVista==='total'?totalL:Math.round(totalL))+' L</td>';
    tr.innerHTML=cells;
    tr.onclick=()=>snack('Ficha de '+c.n+' — curva de lactancia completa, historia y datos por mes');
    tb.appendChild(tr);
  });
  const trT=document.createElement('tr');
  trT.style.cssText='background:var(--surface);font-weight:700';
  let tc='<td style="font-weight:700;padding-left:14px">HATO ('+mensualData.length+' vacas)</td>';
  const diasMes=[31,28,31,30,31,12];
  let grandTotal=0;
  totales.forEach((t,i)=>{
    if(conteos[i]===0)tc+='<td class="r">—</td>';
    else{const val=mensualVista==='total'?Math.round(t*diasMes[i]/conteos[i]*conteos[i]):
      (t/conteos[i]).toFixed(1);
      const tl=Math.round(t*diasMes[i]/conteos[i]*conteos[i]);
      grandTotal+=tl;
      tc+='<td class="r">'+(mensualVista==='total'?Math.round(t*diasMes[i]/conteos[i]*conteos[i]):val)+'</td>';}
  });
  tc+='<td class="r" style="font-weight:800">'+(mensualVista==='total'?Math.round(grandTotal/6):
    (totales.reduce((a,b)=>a+b,0)/conteos.reduce((a,b)=>a+b,0)).toFixed(1))+'</td>';
  tc+='<td class="r" style="font-weight:800">'+grandTotal+' L</td>';
  trT.innerHTML=tc;
  tb.appendChild(trT);
}
renderMensual();

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

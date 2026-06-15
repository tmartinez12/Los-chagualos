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
/* ===== Producción mensual por vaca (resumen) y diaria (detalle del mes) ===== */
const MESES_L=['Ene','Feb','Mar','Abr','May','Jun'];
const DIAS_MES=[31,28,31,30,31,12];   // junio: al día (12 jun)
const mensualData=[
  {num:'042',n:'Lucero',   m:[null,null,12.5,14.8,17.2,18.0], partos:'parió ene'},
  {num:'038',n:'Mona',     m:[14.2,14.0,15.1,14.8,15.5,16.0]},
  {num:'051',n:'Careta',   m:[null,null,10.2,12.0,13.6,14.0], partos:'parió feb, 1er parto'},
  {num:'027',n:'Estrella', m:[null,null,null,null,11.8,13.0], partos:'parió abr'},
  {num:'017',n:'Azucena',  m:[14.0,13.5,9.0,10.5,11.0,11.0], nota:'mastitis mar → baja'},
  {num:'033',n:'Paloma',   m:[11.0,10.2,9.8,8.5,7.0,6.0],    nota:'bajando — vacía'},
  {num:'029',n:'Pinta',    m:[8.0,7.5,7.0,6.2,5.5,5.0],      nota:'lactancia >400d — vacía'},
];
let mensualVista='promedio';   // 'promedio' | 'total' (solo aplica al resumen)
let mensualMes=-1;             // -1 = resumen 2026; 0..5 = detalle diario del mes
/* día concreto, determinista: oscila alrededor del promedio del mes */
function diaVal(numStr,monthIdx,day){
  const avg=mensualData.find(c=>c.num===numStr).m[monthIdx];
  if(avg===null)return null;
  const seed=parseInt(numStr)*13+monthIdx*101+day*7;
  const wobble=Math.sin(seed)*0.5+Math.sin(seed*2.3)*0.3;   // -0.8..0.8 aprox
  return Math.max(0,Math.round((avg+wobble*avg*0.16)*10)/10);
}
function toggleMensual(v){mensualVista=v;
  document.getElementById('btnTotal').style.cssText=v==='total'?'font-weight:700;border-color:var(--ink)':'';
  document.getElementById('btnProm').style.cssText=v==='promedio'?'font-weight:700;border-color:var(--ink)':'';
  renderMensual();}
function renderMesPicker(){
  const p=document.getElementById('mesPicker');if(!p)return;p.innerHTML='';
  const items=[{i:-1,t:'Resumen 2026'}].concat(MESES_L.map((m,i)=>({i:i,t:m})));
  items.forEach(it=>{
    const b=document.createElement('button');b.className='btn outl small';
    b.textContent=it.t;
    if(it.i===mensualMes)b.style.cssText='font-weight:700;background:var(--black);color:#fff;border-color:var(--black)';
    b.onclick=()=>{mensualMes=it.i;renderMesPicker();renderMensual();};
    p.appendChild(b);
  });
}
function renderMensual(){
  const head=document.getElementById('mensualHead'),tb=document.getElementById('mensualBody');
  if(!tb||!head)return;tb.innerHTML='';head.innerHTML='';
  const tit=document.getElementById('mensualTitulo');
  const hint=document.getElementById('mensualHint');
  const btnT=document.getElementById('btnTotal'),btnP=document.getElementById('btnProm');
  if(mensualMes>=0){   /* ---- vista DIARIA del mes elegido ---- */
    if(btnT)btnT.style.display='none';if(btnP)btnP.style.display='none';
    const n=DIAS_MES[mensualMes];
    if(tit)tit.textContent='Producción diaria · '+MESES_L[mensualMes]+' 2026 (L/día por vaca)';
    if(hint)hint.textContent='Cada columna es un día · ‹ Resumen 2026 › para volver · toca una vaca para su ficha';
    let h='<tr><th>Animal</th>';
    for(let d=1;d<=n;d++)h+='<th class="r" style="padding:8px 6px">'+d+'</th>';
    h+='<th class="r" style="font-weight:800">Prom</th><th class="r" style="font-weight:800">Total</th></tr>';
    head.innerHTML=h;
    const sumDia=new Array(n).fill(0),cntDia=new Array(n).fill(0);
    mensualData.forEach(c=>{for(let d=1;d<=n;d++){const v=diaVal(c.num,mensualMes,d);
      if(v!==null){sumDia[d-1]+=v;cntDia[d-1]++;}}});
    mensualData.forEach(c=>{
      const avg=c.m[mensualMes];
      const tr=document.createElement('tr');
      let cells='<td><div class="cell-animal"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div>'+
        (c.nota?'<div class="cs" style="color:var(--red)">'+c.nota+'</div>':'')+'</div></div></td>';
      let suma=0,dias=0;
      for(let d=1;d<=n;d++){const v=diaVal(c.num,mensualMes,d);
        if(v===null){cells+='<td class="r" style="padding:8px 6px"><span class="pending">—</span></td>';}
        else{suma+=v;dias++;let cls='';
          if(v<avg*0.85)cls=' class="down"';else if(v>avg*1.15)cls=' class="up"';
          cells+='<td class="r" style="padding:8px 6px"><span'+cls+'>'+v.toFixed(1)+'</span></td>';}
      }
      const prom=dias?suma/dias:0;
      cells+='<td class="r" style="font-weight:700">'+(dias?prom.toFixed(1):'—')+'</td>';
      cells+='<td class="r" style="font-weight:700">'+(dias?Math.round(suma):0)+' L</td>';
      tr.innerHTML=cells;
      tr.onclick=()=>snack(c.n+' · '+MESES_L[mensualMes]+': '+(dias?prom.toFixed(1)+' L/día prom · '+Math.round(suma)+' L en el mes':'sin ordeño este mes'));
      tb.appendChild(tr);
    });
    const trT=document.createElement('tr');trT.style.cssText='background:var(--surface);font-weight:700';
    let tc='<td style="font-weight:700;padding-left:14px">HATO</td>';let gTot=0,gSum=0,gDias=0;
    for(let d=0;d<n;d++){if(cntDia[d]===0){tc+='<td class="r" style="padding:8px 6px">—</td>';}
      else{tc+='<td class="r" style="padding:8px 6px">'+Math.round(sumDia[d])+'</td>';gTot+=sumDia[d];gSum+=sumDia[d]/cntDia[d];gDias++;}}
    tc+='<td class="r" style="font-weight:800">'+(gDias?(gSum/gDias).toFixed(1):'—')+'</td>';
    tc+='<td class="r" style="font-weight:800">'+Math.round(gTot)+' L</td>';
    trT.innerHTML=tc;tb.appendChild(trT);
    return;
  }
  /* ---- vista RESUMEN 2026 (mensual) ---- */
  if(btnT)btnT.style.display='';if(btnP)btnP.style.display='';
  if(tit)tit.textContent='Producción por vaca · resumen 2026';
  if(hint)hint.textContent='Toca un mes para ver el detalle día por día · toca una vaca para su ficha completa';
  let h='<tr><th>Animal</th>';
  MESES_L.forEach(m=>h+='<th class="r">'+m+'</th>');
  h+='<th class="r" style="font-weight:800">Prom. 2026</th><th class="r" style="font-weight:800">Total 2026</th></tr>';
  head.innerHTML=h;
  const totales=[0,0,0,0,0,0],conteos=[0,0,0,0,0,0];
  mensualData.forEach(c=>c.m.forEach((v,i)=>{if(v!==null){totales[i]+=v;conteos[i]++;}}));
  mensualData.forEach(c=>{
    const tr=document.createElement('tr');
    const activos=c.m.filter(v=>v!==null);
    const prom=activos.length?activos.reduce((a,b)=>a+b,0)/activos.length:0;
    const totalL=c.m.map((v,i)=>v!==null?Math.round(v*DIAS_MES[i]):0).reduce((a,b)=>a+b,0);
    let cells='<td><div class="cell-animal"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div>'+
      (c.nota?'<div class="cs" style="color:var(--red)">'+c.nota+'</div>':
       c.partos?'<div class="cs">'+c.partos+'</div>':'')+'</div></div></td>';
    c.m.forEach((v,i)=>{
      if(v===null){cells+='<td class="r"><span class="pending">—</span></td>';}
      else{const promHato=conteos[i]?totales[i]/conteos[i]:0;let cls='';
        if(v<promHato*0.65)cls=' class="down"';else if(v>promHato*1.15)cls=' class="up"';
        const val=mensualVista==='total'?Math.round(v*DIAS_MES[i]):v.toFixed(1);
        cells+='<td class="r"><span'+cls+'>'+val+'</span></td>';}
    });
    cells+='<td class="r" style="font-weight:700">'+(mensualVista==='total'?Math.round(totalL/Math.max(1,activos.length)):prom.toFixed(1))+'</td>';
    cells+='<td class="r" style="font-weight:700">'+totalL+' L</td>';
    tr.innerHTML=cells;
    tr.onclick=()=>snack('Ficha de '+c.n+' — curva de lactancia completa, historia y datos por mes');
    tb.appendChild(tr);
  });
  const trT=document.createElement('tr');trT.style.cssText='background:var(--surface);font-weight:700';
  let tc='<td style="font-weight:700;padding-left:14px">HATO ('+mensualData.length+' vacas)</td>';let grandTotal=0;
  totales.forEach((t,i)=>{
    if(conteos[i]===0){tc+='<td class="r">—</td>';}
    else{const promMes=t/conteos[i];const tl=Math.round(promMes*DIAS_MES[i]*conteos[i]);grandTotal+=tl;
      tc+='<td class="r">'+(mensualVista==='total'?tl:promMes.toFixed(1))+'</td>';}
  });
  const promAnual=totales.reduce((a,b)=>a+b,0)/conteos.reduce((a,b)=>a+b,0);
  tc+='<td class="r" style="font-weight:800">'+(mensualVista==='total'?Math.round(grandTotal/6):promAnual.toFixed(1))+'</td>';
  tc+='<td class="r" style="font-weight:800">'+grandTotal+' L</td>';
  trT.innerHTML=tc;tb.appendChild(trT);
}
renderMesPicker();renderMensual();

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

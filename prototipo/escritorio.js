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
const diaOverrides={};         // clave "num-mes-dia" → valor editado
function diaKey(num,m,d){return num+'-'+m+'-'+d;}
function diaVal(numStr,monthIdx,day){
  const k=diaKey(numStr,monthIdx,day);
  if(k in diaOverrides)return diaOverrides[k];
  const avg=mensualData.find(c=>c.num===numStr).m[monthIdx];
  if(avg===null)return null;
  const seed=parseInt(numStr)*13+monthIdx*101+day*7;
  const wobble=Math.sin(seed)*0.5+Math.sin(seed*2.3)*0.3;
  return Math.max(0,Math.round((avg+wobble*avg*0.16)*10)/10);
}
function editDiaCell(td,cow,day,oldVal){
  if(td.querySelector('input'))return;
  const inp=document.createElement('input');
  inp.type='number';inp.step='0.1';inp.min='0';inp.value=oldVal.toFixed(1);
  inp.style.cssText='width:52px;border:none;border-bottom:2px solid var(--green);background:transparent;font-family:inherit;font-size:13px;font-weight:700;text-align:center;color:var(--ink);outline:none;padding:2px';
  td.innerHTML='';td.appendChild(inp);inp.focus();inp.select();
  function save(){
    const raw=parseFloat(inp.value);
    if(isNaN(raw)||raw<0){renderMensual();return;}
    const nv=Math.round(raw*10)/10;
    const k=diaKey(cow.num,mensualMes,day);
    const prev=k in diaOverrides?diaOverrides[k]:null;
    diaOverrides[k]=nv;
    renderMensual();
    snack(cow.n+' · día '+day+' '+MESES_L[mensualMes]+': '+oldVal.toFixed(1)+' → '+nv.toFixed(1)+' L','Deshacer',()=>{
      if(prev!==null)diaOverrides[k]=prev;else delete diaOverrides[k];renderMensual();});
  }
  inp.onblur=save;
  inp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();inp.blur();}
    if(e.key==='Escape'){e.preventDefault();renderMensual();}};
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
    if(hint)hint.textContent='Clic en un valor para editarlo · ‹ Resumen 2026 › para volver';
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
      const tdAnimal=document.createElement('td');tdAnimal.style.cursor='pointer';
      tdAnimal.innerHTML='<div class="cell-animal"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div>'+
        (c.nota?'<div class="cs" style="color:var(--red)">'+c.nota+'</div>':'')+'</div></div>';
      tdAnimal.onclick=(function(num){return function(e){e.stopPropagation();goVaca(num,'pg-leche');};})(c.num);
      tr.appendChild(tdAnimal);
      let suma=0,dias=0;
      for(let d=1;d<=n;d++){const v=diaVal(c.num,mensualMes,d);
        const td=document.createElement('td');td.className='r';td.style.cssText='padding:8px 6px;cursor:pointer';
        if(v===null){td.innerHTML='<span class="pending">—</span>';td.style.cursor='default';}
        else{suma+=v;dias++;let cls='';
          if(v<avg*0.85)cls=' class="down"';else if(v>avg*1.15)cls=' class="up"';
          td.innerHTML='<span'+cls+'>'+v.toFixed(1)+'</span>';
          td.onclick=(function(cow,day,val){return function(e){e.stopPropagation();editDiaCell(this,cow,day,val);};})(c,d,v);
        }
        tr.appendChild(td);
      }
      const prom=dias?suma/dias:0;
      const tdProm=document.createElement('td');tdProm.className='r';tdProm.style.fontWeight='700';
      tdProm.textContent=dias?prom.toFixed(1):'—';tr.appendChild(tdProm);
      const tdTot=document.createElement('td');tdTot.className='r';tdTot.style.fontWeight='700';
      tdTot.textContent=(dias?Math.round(suma):0)+' L';tr.appendChild(tdTot);
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
    tr.onclick=()=>goVaca(c.num,'pg-leche');
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

/* ===== Ficha de vaca ===== */
const fichas={
  '042':{num:'042',n:'Lucero',raza:'Holstein × Gyr',edad:'5,2 años',grupo:'En ordeño',origen:'Nació en finca',
    del:152,parto:3,ayer:18,peso:'480 kg (abr)',madre:'017 Azucena',padre:'Sansón',
    crias:['038 Mona','051 Careta','064'],
    repro:{badge:'warn',text:'Preñada · 6 meses (palpación 2 may)',sub:'Parto probable ~12 sep · Secar ~12 jul'},
    sanidad:'Sanidad al día — vacunas ok (aftosa may 2026) · sin tratamientos ni retiros activos',sanOk:true,
    historia:[
      {fecha:'02 MAY 2026',texto:'Palpación: <b>preñada 6 meses</b>',sub:'Dr. Restrepo · parto calculado ~12 sep'},
      {fecha:'15 MAR 2026',texto:'Mastitis — tratamiento + retiro 4 días'},
      {fecha:'11 ENE 2026',texto:'Parto #3 — nació la 064 · arranca lactancia (DEL 0)'},
      {fecha:'03 DIC 2025',texto:'Monta de Sansón vista'}],
    curva:[[0,52],[40,20],[60,16],[90,18],[120,22],[152,24]],curvaHoy:{del:152,l:18}},
  '038':{num:'038',n:'Mona',raza:'Gyrolando',edad:'4,1 años',grupo:'En ordeño',origen:'Nació en finca',
    del:98,parto:2,ayer:16,peso:'460 kg (abr)',madre:'011 Violeta',padre:'Sansón',crias:['064'],
    repro:{badge:'',text:'Servida · por palpar',sub:'Monta observada 10 abr — palpación pendiente'},
    sanidad:'Sanidad al día — vacunas ok · sin retiros',sanOk:true,
    historia:[
      {fecha:'10 ABR 2026',texto:'Monta de Sansón observada'},
      {fecha:'08 MAR 2026',texto:'Parto #2 — nació la 064'},
      {fecha:'MAY 2025',texto:'Desparasitación'}],
    curva:[[0,48],[30,22],[60,16],[98,18]],curvaHoy:{del:98,l:16}},
  '051':{num:'051',n:'Careta',raza:'Holstein × Gyr',edad:'3,2 años',grupo:'En ordeño',origen:'Nació en finca',
    del:121,parto:1,ayer:14,peso:'420 kg (mar)',madre:'033 Paloma',padre:'Sansón',crias:[],
    repro:{badge:'',text:'1er parto · vacía',sub:'Esperar mínimo 60 días postparto para servicio'},
    sanidad:'Sanidad al día — vacunas ok · sin retiros',sanOk:true,
    historia:[
      {fecha:'12 FEB 2026',texto:'Parto #1 — arranca lactancia'},
      {fecha:'MAY 2025',texto:'Desparasitación'}],
    curva:[[0,46],[30,24],[60,16],[90,14],[121,14]],curvaHoy:{del:121,l:14}},
  '027':{num:'027',n:'Estrella',raza:'Gyrolando',edad:'3,8 años',grupo:'En ordeño',origen:'Nació en finca',
    del:64,parto:1,ayer:13,peso:'440 kg (may)',madre:'038 Mona',padre:'Sansón',crias:[],
    repro:{badge:'ok',text:'Pico de lactancia · 1er parto',sub:'DEL 64 — esperar para servicio'},
    sanidad:'Sanidad al día — vacunas ok · sin retiros',sanOk:true,
    historia:[
      {fecha:'11 ABR 2026',texto:'Parto #1 — arranca lactancia'},
      {fecha:'MAY 2025',texto:'Aftosa ICA'}],
    curva:[[0,42],[30,18],[64,14]],curvaHoy:{del:64,l:13}},
  '017':{num:'017',n:'Azucena',raza:'Holstein',edad:'8 años',grupo:'En ordeño',origen:'Nació en finca',
    del:201,parto:5,ayer:11,peso:'510 kg (abr)',madre:'—',padre:'—',crias:['042 Lucero','039','044'],
    repro:{badge:'warn',text:'Preñada · 4 meses',sub:'Pendiente: confirmar palpación siguiente'},
    sanidad:'Retiro activo — mastitis jun · antibiótico · no vender leche hasta sáb 14',sanOk:false,
    historia:[
      {fecha:'10 JUN 2026',texto:'Mastitis — inicio tratamiento + retiro 4 días',miss:true},
      {fecha:'01 MAY 2026',texto:'Palpación: <b>preñada 4 meses</b>'},
      {fecha:'ENE 2026',texto:'Parto #5'}],
    curva:[[0,50],[40,22],[100,16],[150,13],[201,12]],curvaHoy:{del:201,l:11}},
  '033':{num:'033',n:'Paloma',raza:'Normando',edad:'6,5 años',grupo:'En ordeño',origen:'Nació en finca',
    del:95,parto:4,ayer:6,peso:'490 kg (may)',madre:'—',padre:'—',crias:['051 Careta','046','048'],
    repro:{badge:'bad',text:'Vacía 132 días · producción muy baja',sub:'Evaluar descarte o tratamiento reproductivo'},
    sanidad:'Sanidad al día — vacunas ok · sin retiros',sanOk:true,
    historia:[
      {fecha:'02 MAY 2026',texto:'Palpación: <b>vacía</b>',sub:'132 días vacía — alerta'},
      {fecha:'FEB 2026',texto:'Parto #4 — producción bajó'},
      {fecha:'DIC 2025',texto:'Desparasitación'}],
    curva:[[0,48],[30,18],[60,12],[95,8]],curvaHoy:{del:95,l:6}},
  '029':{num:'029',n:'Pinta',raza:'Holstein × Gyr',edad:'7 años',grupo:'En ordeño',origen:'Comprada',
    del:412,parto:5,ayer:5,peso:'470 kg (may)',madre:'—',padre:'—',crias:['052','053','056'],
    repro:{badge:'bad',text:'Vacía 150 días · lactancia >400 DEL',sub:'Urgente: palpar o evaluar descarte'},
    sanidad:'Sanidad al día — vacunas ok · sin retiros',sanOk:true,
    historia:[
      {fecha:'02 MAY 2026',texto:'Palpación: <b>vacía</b>',sub:'150 días vacía — alerta crítica'},
      {fecha:'ABR 2025',texto:'Parto #5 — lactancia extendida'}],
    curva:[[0,50],[60,14],[150,10],[300,7],[412,5]],curvaHoy:{del:412,l:5}},
};
let vacaFrom='pg-hato';
const cowFotos={};   // num → dataURL de la foto subida
let vacaActual=null;
function setVacaFoto(input){
  const f=input.files&&input.files[0];if(!f||!vacaActual)return;
  const r=new FileReader();
  r.onload=e=>{cowFotos[vacaActual]=e.target.result;
    const foto=document.getElementById('vacaFoto'),fimg=document.getElementById('vacaFotoImg');
    fimg.src=e.target.result;foto.classList.add('has-img');
    snack('Foto de '+vacaActual+' guardada','Quitar',()=>{
      delete cowFotos[vacaActual];fimg.removeAttribute('src');foto.classList.remove('has-img');});};
  r.readAsDataURL(f);
}
function goVaca(num,from){
  const cow=fichas[num];if(!cow)return snack('Ficha de '+num+' — próximamente');
  vacaFrom=from||'pg-hato';vacaActual=cow.num;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('pg-vaca').classList.add('active');
  document.querySelectorAll('#nav a').forEach(a=>a.classList.remove('active'));
  document.getElementById('pgTitle').textContent='Ficha: '+cow.num+' · '+cow.n;
  document.getElementById('pgSub').textContent=cow.raza+' · '+cow.edad+' · '+cow.grupo;
  document.querySelector('.content').scrollTop=0;
  const backLabels={'pg-hato':'Volver al hato','pg-leche':'Volver a producción','pg-repro':'Volver a reproducción'};
  document.getElementById('vacaBackLabel').textContent=backLabels[vacaFrom]||'Volver';
  document.getElementById('vacaBack').onclick=()=>go(vacaFrom,document.querySelector('[data-pg="'+vacaFrom+'"]'));
  /* foto: muestra la guardada para esta vaca, o el placeholder */
  const foto=document.getElementById('vacaFoto'),fimg=document.getElementById('vacaFotoImg');
  if(cowFotos[cow.num]){fimg.src=cowFotos[cow.num];foto.classList.add('has-img');}
  else{fimg.removeAttribute('src');foto.classList.remove('has-img');}
  document.getElementById('vacaFotoInput').value='';
  document.getElementById('vacaNombre').textContent=cow.num+' · '+cow.n;
  document.getElementById('vacaSub').textContent=cow.raza+' · '+cow.edad+' · '+cow.grupo+' · '+cow.origen;
  const bd=document.getElementById('vacaBadge');
  if(cow.repro.badge)bd.innerHTML='<span class="badge '+cow.repro.badge+'">'+cow.repro.text.split('·')[0].trim()+'</span>';
  else bd.innerHTML='';
  const al=document.getElementById('vacaAlerta');
  al.innerHTML='<div class="alert '+(cow.repro.badge==='bad'?'urgent':cow.repro.badge==='warn'?'warn':'info')+'">'+
    '<div style="flex:1"><div class="a-title">'+cow.repro.text+'</div>'+
    '<div class="a-sub">'+cow.repro.sub+'</div></div></div>';
  const kpis=document.getElementById('vacaKpis');
  kpis.innerHTML=
    '<div class="card kpi"><div class="k-label">Ayer · DEL</div><div class="k-value">'+cow.ayer+' L <span class="k-unit">· DEL '+cow.del+'</span></div></div>'+
    '<div class="card kpi"><div class="k-label">Peso</div><div class="k-value" style="font-size:20px">'+cow.peso+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Partos · crías</div><div class="k-value" style="font-size:20px">'+cow.parto+(cow.crias.length?' · ('+cow.crias.join(', ')+')':' · sin crías')+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Madre · padre</div><div class="k-value" style="font-size:20px">'+cow.madre+' · '+cow.padre+'</div></div>';
  /* curva de lactancia */
  const svg=document.getElementById('vacaCurva');
  const maxDel=Math.max(cow.del+30,180);
  const pts=cow.curva.map(p=>{const x=20+p[0]/maxDel*520;const y=80-p[1]/25*60;return x+','+y;}).join(' ');
  const hx=20+cow.curvaHoy.del/maxDel*520,hy=80-cow.curvaHoy.l/25*60;
  svg.innerHTML='<polyline points="'+pts+'" fill="none" stroke="#2F7E33" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<circle cx="'+hx+'" cy="'+hy+'" r="4.5" fill="#2F7E33"/>'+
    '<g font-family="Work Sans,sans-serif" font-size="10" fill="#A8ACA0">'+
    '<text x="20" y="88">DEL 0</text><text x="'+(20+60/maxDel*520)+'" y="88">60</text>'+
    '<text x="'+(20+120/maxDel*520)+'" y="88">120</text><text x="'+(20+180/maxDel*520)+'" y="88">180</text>'+
    (maxDel>240?'<text x="'+(20+240/maxDel*520)+'" y="88">240</text>':'')+
    (maxDel>360?'<text x="'+(20+360/maxDel*520)+'" y="88">360</text>':'')+
    '<text x="'+(hx+6)+'" y="'+(hy-6)+'" fill="#16181B" font-weight="700">hoy: '+cow.ayer+' L</text></g>';
  document.getElementById('vacaCurvaSub').textContent='Hoy va en DEL '+cow.del+' · '+cow.parto+(cow.parto===1?'er':'°')+' parto';
  /* sanidad */
  const san=document.getElementById('vacaSanidad');
  san.innerHTML='<svg class="ic-s ic" style="color:var('+(cow.sanOk?'--green':'--red')+')"><use href="#i-shield"/></svg>'+
    '<div style="font-size:12.5px;color:var(--ink-2)"><b style="color:var(--ink)">'+(cow.sanOk?'Sanidad al día':'Alerta sanitaria')+'</b> — '+cow.sanidad+'</div>';
  /* historia */
  const hist=document.getElementById('vacaHistoria');hist.innerHTML='';
  cow.historia.forEach((h,i)=>{
    hist.innerHTML+='<div class="f-item'+(h.miss?' miss':'')+'">'+
      '<span class="f-time" style="width:auto;font-size:10px;white-space:nowrap">'+h.fecha+'</span>'+
      '<span class="f-text">'+h.texto+(h.sub?'<br><span class="sub">'+h.sub+'</span>':'')+'</span></div>';
  });
  /* produccion mensual individual */
  const md=mensualData.find(c=>c.num===num);
  const mtb=document.getElementById('vacaMensualTb');mtb.innerHTML='';
  if(md){
    let total=0;
    md.m.forEach((v,i)=>{
      const tr=document.createElement('tr');
      if(v===null){tr.innerHTML='<td>'+MESES_L[i]+' 2026</td><td class="r pending">—</td><td class="r pending">—</td><td class="r pending">—</td><td class="sub">sin ordeño</td>';}
      else{const t=Math.round(v*DIAS_MES[i]);total+=t;
        tr.innerHTML='<td><b>'+MESES_L[i]+' 2026</b></td><td class="r">'+v.toFixed(1)+'</td><td class="r"><b>'+t+' L</b></td><td class="r">'+DIAS_MES[i]+'</td><td class="sub">'+(v<8?'bajo':'normal')+'</td>';}
      tr.style.cursor='pointer';
      tr.onclick=()=>{mensualMes=i;renderMesPicker();renderMensual();go('pg-leche',document.querySelector('[data-pg="pg-leche"]'));
        document.querySelector('.content').scrollTop=document.getElementById('mesPicker').offsetTop-60;};
      mtb.appendChild(tr);
    });
    const avgM=md.m.filter(v=>v!==null);
    const trT=document.createElement('tr');trT.style.cssText='font-weight:700;background:var(--surface)';
    trT.innerHTML='<td>Total 2026</td><td class="r">'+(avgM.length?(avgM.reduce((a,b)=>a+b,0)/avgM.length).toFixed(1):'—')+'</td><td class="r">'+total+' L</td><td class="r">'+DIAS_MES.slice(0,md.m.filter(v=>v!==null).length).reduce((a,b)=>a+b,0)+'</td><td></td>';
    mtb.appendChild(trT);
  }
}

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

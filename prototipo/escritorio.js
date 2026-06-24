/* Bandera para ocultar Potreros por ahora (poner true para reactivarlo). */
const POTREROS_VISIBLE=false;
const titles={
  'pg-inicio':['Buenos días, Tatiana','Jueves 12 de junio · lluvia ayer: 12 mm'],
  'pg-leche':['Producción de leche','26 vacas en ordeño · hoy 184 L'],
  'pg-hato':['Hato','80 animales · unidad leche'],
  'pg-potreros':['Potreros','32 potreros · ocupación 1 día (máx 2)'],
  'pg-repro':['Reproducción','Monta natural · la palpación manda'],
  'pg-partos':['Partos','Las palpaciones marcan las fechas'],
  'pg-sanitario':['Plan sanitario','Calendario anual · protocolos · soporte ICA'],
};
let currentPg='pg-inicio';
/* subtítulo dinámico: refleja el estado real en vez de un valor fijo */
function subFor(id){
  try{
    if(id==='pg-inicio'){
      const done=milkCows.filter(c=>c.done);
      return 'Jueves 12 de junio · '+(done.length?'ordeño en curso: '+done.length+'/'+milkCows.length+' de la muestra':'ordeño pendiente');
    }
    if(id==='pg-leche'){
      const done=milkCows.filter(c=>c.done);
      const tot=done.reduce((s,c)=>s+c.v,0);
      return done.length+'/'+milkCows.length+' de la muestra registradas · '+tot+' L';
    }
    if(id==='pg-hato'){
      const ordeño=hato.filter(a=>a.grupo==='En ordeño').length;
      const prenadas=hato.filter(a=>a.tags.includes('prenada')).length;
      return hato.length+' animales · '+ordeño+' en ordeño · '+prenadas+' preñadas';
    }
    if(id==='pg-partos'){
      return partosRecientes.length+' partos en 2026 · '+proximosPartos.length+' por parir';
    }
    if(id==='pg-repro'){
      return vacasVacias.length+' vacías por decidir · '+palpCandidatas.length+' por palpar';
    }
  }catch(e){}
  return titles[id][1];
}
function go(id,el){
  currentPg=id;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.pg===id));
  document.getElementById('pgTitle').textContent=titles[id][0];
  document.getElementById('pgSub').textContent=subFor(id);
  if(id==='pg-inicio')renderInicio();
  document.querySelector('.content').scrollTop=0;
}
/* refresca el subtítulo si estamos en la página afectada */
function refreshHeader(){
  if(titles[currentPg])document.getElementById('pgSub').textContent=subFor(currentPg);
}
/* badges del sidebar: reflejan pendientes reales y se actualizan al registrar */
function setNavBadge(id,n){
  const el=document.getElementById(id);if(!el)return;
  if(n>0){el.textContent=n;el.style.display='';}else{el.style.display='none';}
}
function renderNavBadges(){
  try{
    const milkPend=milkCows.filter(c=>!c.done).length;
    const entPend=lecheros.filter(l=>!l.done).length;
    setNavBadge('navBadgeLeche',milkPend+entPend);
    setNavBadge('navBadgeRepro',vacasVacias.length);
    setNavBadge('navBadgeSan',tratamientos.length);
  }catch(e){}
}
/* Dashboard de inicio: KPIs y alertas derivadas del estado real. */
function renderInicio(){
  const kp=document.getElementById('inicioKpis');
  if(kp){
    let doneM=[],lecheHoy=0,ayerM=0,allM=false;
    try{doneM=milkCows.filter(c=>c.done);lecheHoy=doneM.reduce((s,c)=>s+c.v,0);
      ayerM=milkCows.reduce((s,c)=>s+(typeof c.ayer==='number'?c.ayer:0),0);
      allM=milkCows.length&&doneM.length===milkCows.length;}catch(e){}
    let doneE=[],entHoy=0,allE=false;
    try{doneE=lecheros.filter(l=>l.done);entHoy=doneE.reduce((s,l)=>s+l.hoy,0);
      allE=lecheros.length&&doneE.length===lecheros.length;}catch(e){}
    const trendM=allM?(lecheHoy>ayerM?'<div class="k-trend up">↑ '+(lecheHoy-ayerM)+' L vs ayer</div>':
        lecheHoy<ayerM?'<div class="k-trend down">↓ '+(ayerM-lecheHoy)+' L vs ayer</div>':'<div class="k-trend mut">= que ayer</div>')
      :'<div class="k-trend mut">registrando…</div>';
    kp.innerHTML=
      '<div class="card kpi"><div class="k-label">Leche hoy</div>'+
        '<div class="k-value">'+(allM?lecheHoy+' <span class="k-unit">L</span>':doneM.length+'<span class="k-unit"> de '+milkCows.length+'</span>')+'</div>'+trendM+'</div>'+
      '<div class="card kpi"><div class="k-label">Entregado a lecheros</div>'+
        '<div class="k-value">'+(allE?entHoy+' <span class="k-unit">L</span>':doneE.length+'<span class="k-unit"> de '+lecheros.length+'</span>')+'</div>'+
        '<div class="k-trend '+(allE?'up':'mut')+'">'+(allE?'balance cuadra ✓':'entregas pendientes')+'</div></div>';
  }
  const al=document.getElementById('inicioAlertas');
  if(al){
    const alertas=[];
    if(POTREROS_VISIBLE)try{const occ=pots.find(p=>p.d<0);const sug=pots.find(p=>p.sugerido);
      if(occ)alertas.push({cls:'urgent',title:'Hato: día '+Math.abs(occ.d)+' en el potrero '+occ.n+' — mover hoy',
        sub:sug?'Sugerido: P'+sug.n+' · '+sug.d+' días de descanso':'Revisar potreros disponibles',btn:'Ver potreros',pg:'pg-potreros'});
    }catch(e){}
    try{Object.values(animalesPorId).filter(a=>a.grupo==='ordeño'&&a.prenez&&a.prenez.meses>=7).slice(0,2).forEach(a=>{
      alertas.push({cls:'warn',title:'Vaca '+a.id+' "'+a.nombre+'": programar secado',
        sub:'Preñada '+a.prenez.meses+' meses — secar ~2 meses antes del parto'});});
    }catch(e){}
    try{Object.values(animalesPorId).filter(a=>a.retiroLecheHasta&&diasHasta(a.retiroLecheHasta)>=0).slice(0,2).forEach(a=>{
      const d=diasHasta(a.retiroLecheHasta);
      alertas.push({cls:'info',title:'Retiro de leche: vaca '+a.id+(d===1?' — falta 1 día':' — faltan '+d+' días'),
        sub:'No vender su leche hasta '+fmtFechaCorta(a.retiroLecheHasta)});});
    }catch(e){}
    if(alertas.length)al.innerHTML=alertas.map(a=>'<div class="alert '+a.cls+'"><div style="flex:1">'+
      '<div class="a-title">'+a.title+'</div><div class="a-sub">'+a.sub+'</div>'+
      (a.btn?'<button class="btn outl small" style="margin-top:8px" onclick="go(\''+a.pg+'\')">'+a.btn+'</button>':'')+
      '</div></div>').join('');
  }
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

/* ===== Tabs de producción ===== */
function switchLecheTab(id,btn){
  document.querySelectorAll('.ltab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ltab').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

/* ===== KPIs dinámicos de producción ===== */
function renderLecheKpis(){
  const box=document.getElementById('lecheKpis');if(!box)return;
  const done=milkCows.filter(c=>c.done);
  const total=done.reduce((s,c)=>s+c.v,0);
  const ayerTotal=milkCows.reduce((s,c)=>s+c.ayer,0);
  const allDone=done.length===milkCows.length;
  let entDone=[],entTotal=0,entCount=0;
  try{entDone=lecheros.filter(l=>l.done);entTotal=entDone.reduce((s,l)=>s+l.hoy,0);entCount=lecheros.length;}catch(e){}

  const trendOrdenio=allDone
    ?(total>ayerTotal?'<span class="up">↑ '+(total-ayerTotal)+' L vs ayer</span>':
      total<ayerTotal?'<span class="down">↓ '+(ayerTotal-total)+' L vs ayer</span>':
      '<span class="mut">= que ayer</span>')
    :'<span class="mut">registrando…</span>';

  box.innerHTML=
    '<div class="card kpi"><div class="k-label">Ordeño hoy</div>'+
      '<div class="k-value">'+(allDone?total+'<span class="k-unit"> L</span>':done.length+'<span class="k-unit"> de '+milkCows.length+'</span>')+'</div>'+
      '<div class="k-trend">'+trendOrdenio+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Total registrado</div>'+
      '<div class="k-value">'+total+' <span class="k-unit">L</span></div>'+
      '<div class="k-trend mut">de ~'+ayerTotal+' L esperados</div></div>'+
    '<div class="card kpi"><div class="k-label">L/vaca·día</div>'+
      '<div class="k-value">'+(done.length?(total/done.length).toFixed(1):'—')+'</div>'+
      '<div class="k-trend mut">'+milkCows.length+' vacas en muestra</div></div>'+
    '<div class="card kpi"><div class="k-label">Entregas hoy</div>'+
      '<div class="k-value">'+(entCount&&entDone.length===entCount?entTotal+'<span class="k-unit"> L</span>':entDone.length+'<span class="k-unit"> de '+entCount+'</span>')+'</div>'+
      '<div class="k-trend">'+(entCount&&entDone.length===entCount?'<span class="up">balance cuadra ✓</span>':'<span class="mut">pendientes</span>')+'</div></div>';
  if(typeof refreshHeader==='function')refreshHeader();
  if(typeof renderNavBadges==='function')renderNavBadges();
}

/* ===== Registrar leche por vaca ===== */
let milkCows=[
  {num:'042',n:'Lucero',  del:'DEL 152 · 3er parto',          ayer:18},
  {num:'038',n:'Mona',    del:'DEL 98 · servida, por palpar', ayer:16},
  {num:'051',n:'Careta',  del:'DEL 121 · 1er parto',          ayer:14},
  {num:'027',n:'Estrella',del:'DEL 64 · pico de lactancia',   ayer:13},
  {num:'017',n:'Azucena', del:'DEL 201 · retiro 2 días más',  ayer:11, retiro:2,
    estado:'<span class="badge bad">retiro 2d</span>', nota:'no vender su leche'},
  {num:'033',n:'Paloma',  del:'DEL 95 · 4to parto',           ayer:6,
    estado:'<span class="badge bad">vacía 132d</span>', nota:'producción muy baja', notaRed:1},
  {num:'029',n:'Pinta',   del:'DEL 412 · lactancia larga',    ayer:5,
    estado:'<span class="badge bad">vacía 150d</span>', nota:'evaluar descarte', notaRed:1}
];
milkCows[0].estado='<span class="badge warn">preñada 6m</span>';milkCows[0].nota='secar ~12 jul';
milkCows[1].estado='<span class="badge">servida</span>';milkCows[1].nota='por confirmar palp.';
milkCows[2].nota='1er parto';milkCows[3].nota='pico de lactancia';
milkCows.forEach(c=>{c.done=false;c.v=null;});
let mi=-1;
/* el scatter depende de `hato`, que se declara más abajo en el archivo.
   Esta bandera evita leerlo antes de tiempo en los renders de la carga inicial. */
let scatterListo=false;
/* ordenamiento de la tabla de ordeño */
let milkSort={key:null,dir:1};
function milkVal(c,key){
  switch(key){
    case 'animal':return parseInt(c.num);
    case 'ayer':return c.ayer;
    case 'hoy':return c.done?c.v:null;
    case 'var':return c.done?c.v-c.ayer:null;
    case 'del':return parseInt(c.del.replace(/DEL (\d+).*/,'$1'));
  }
  return null;
}
function sortMilk(key){
  milkSort.dir=milkSort.key===key?-milkSort.dir:1;
  milkSort.key=key;
  renderMilk();
}
function cmpVals(a,b,dir){
  if(a===null||a===undefined||(typeof a==='number'&&isNaN(a)))return 1;   // nulos al final
  if(b===null||b===undefined||(typeof b==='number'&&isNaN(b)))return -1;
  if(a<b)return -dir;if(a>b)return dir;return 0;
}
function paintSortArrows(prefix,sort){
  ['animal','ayer','hoy','var','del','grupo','edad'].forEach(k=>{
    const el=document.getElementById(prefix+k);if(el)el.textContent=sort.key===k?(sort.dir>0?'▲':'▼'):'';
  });
}
function renderMilk(){
  const tb=document.getElementById('milkTbody');if(!tb)return;tb.innerHTML='';
  let rows=milkCows.map((c,i)=>({c,i}));
  if(milkSort.key)rows.sort((x,y)=>cmpVals(milkVal(x.c,milkSort.key),milkVal(y.c,milkSort.key),milkSort.dir));
  paintSortArrows('ms-',milkSort);
  rows.forEach(({c,i})=>{
    const tr=document.createElement('tr');
    if(c.done)tr.className='done';
    let hoy,varCell;
    if(c.done){
      hoy='<span class="reg">'+c.v+' L ✓</span><span class="edit-ic" title="Corregir">✎</span>';
      const d=c.v-c.ayer;
      varCell=d>0?'<span class="up">↑ +'+d+'</span>':d<0?'<span class="down">↓ '+d+'</span>':'<span class="mut">= ayer</span>';
    }else{hoy='<button class="btn outl small reg-btn">Registrar</button>';varCell='<span class="mut">—</span>';}
    tr.innerHTML='<td><div class="cell-animal cell-link"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div></div></div></td>'+
      '<td class="r">'+c.ayer+'</td><td class="r">'+hoy+'</td><td class="r">'+varCell+'</td>'+
      '<td class="r">'+c.del.replace(/DEL (\d+).*/,'$1')+'</td>'+
      '<td>'+(c.estado||'')+'</td>'+
      '<td class="sub"'+(c.notaRed?' style="color:var(--red)"':'')+'>'+(c.nota||'')+'</td>';
    /* ver: el animal lleva a su ficha · registrar/corregir: acción explícita */
    const link=tr.querySelector('.cell-link');if(link)link.onclick=()=>goVaca(c.num,'pg-leche');
    const act=tr.querySelector('.reg-btn')||tr.querySelector('.edit-ic');
    if(act)act.onclick=e=>{e.stopPropagation();openMilk(i);};
    tb.appendChild(tr);
  });
  renderLecheKpis();
  if(typeof renderScatters==='function')renderScatters();
}
function openMilk(i){mi=i;const c=milkCows[i];
  /* el #milkModal se comparte con las entregas: al abrir una vaca, re-fijamos
     siempre las acciones de leche por si quedó configurado para una entrega */
  document.getElementById('scrim').onclick=()=>closeMilk();
  const saveBtn=document.querySelector('#milkModal .btn.filled');if(saveBtn)saveBtn.onclick=()=>saveMilk();
  document.getElementById('mCow').textContent=c.num+' · '+c.n.toUpperCase();
  document.getElementById('mDel').textContent=c.del;
  const inp=document.getElementById('mInput');inp.value=c.done?c.v:c.ayer;
  inp.onkeydown=e=>{if(e.key==='Enter')saveMilk();};
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
  const drop=!c.done&&LCRules.esBajonLeche(c.ayer,v);
  c.done=true;c.v=v;
  closeMilk();renderMilk();
  /* persistir en Supabase (optimista: ya se guardó local) */
  if(typeof LCStore!=='undefined'){
    LCStore.registrarOrdeno(c.num,v).catch(e=>{
      console.warn('No se pudo guardar el ordeño en la base:',e.message||e);
      snack('⚠ '+c.n+': guardado local, falta sincronizar');
    });
  }
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

/* ===== Cableado a Supabase: tabla de ordeño (con respaldo local) ===== */
function ordinalParto(n){const m={1:'1er',2:'2do',3:'3er',4:'4to',5:'5to',6:'6to',7:'7mo',8:'8vo',9:'9no'};return (m[n]||n+'to')+' parto';}
function animalAMilk(a){
  const ctx=a.del>300?'lactancia larga':(a.partos?ordinalParto(a.partos):'');
  const delTxt='DEL '+(a.del==null?'—':a.del)+(ctx?' · '+ctx:'');
  const retiroD=a.retiroLecheHasta?diasHasta(a.retiroLecheHasta):null;
  let estado='',nota='',notaRed=0;
  if(retiroD!=null&&retiroD>=0){estado='<span class="badge bad">retiro '+retiroD+'d</span>';nota='no vender su leche';}
  else if(a.estadoRepro==='prenada'&&a.prenez){estado='<span class="badge warn">preñada '+a.prenez.meses+'m</span>';
    if(a.secarEstimado){const d=new Date(a.secarEstimado+'T00:00:00');nota='secar ~'+d.getDate()+' '+LCRules.MESC[d.getMonth()];}}
  else if(a.estadoRepro==='servida'){estado='<span class="badge">servida</span>';nota='por confirmar palp.';}
  else if(a.estadoRepro==='vacia'){estado='<span class="badge bad">vacía'+(a.diasVacia?' '+a.diasVacia+'d':'')+'</span>';
    if(a.leche&&a.leche.ayer!=null&&a.leche.ayer<7){nota=a.del>300?'evaluar descarte':'producción muy baja';notaRed=1;}}
  const row={num:a.id,n:a.nombre,del:delTxt,ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer:0),
    estado,nota,notaRed,done:false,v:null};
  if(retiroD!=null&&retiroD>=0)row.retiro=retiroD;
  return row;
}
(async function cargarMilkDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const animales=await LCStore.getAnimales('ordeño');
    if(!animales)return;
    milkCows=animales.map(animalAMilk);
    /* marcar las que ya tienen ordeño registrado hoy */
    try{const hoy=await LCStore.getOrdenosFecha();
      milkCows.forEach(c=>{if(hoy[c.num]!=null){c.done=true;c.v=hoy[c.num];}});
    }catch(_){/* sin ordeños hoy o sin conexión: sigue sin marcar */}
    renderMilk();renderInicio();
  }catch(e){console.warn('Ordeño: usando datos locales:',e.message||e);}
})();

/* ===== Scatter: Producción vs DEL (todas las vacas en ordeño del hato) ===== */
function scatterCows(){
  let cows=[];
  try{
    cows=hato.filter(a=>a.grupo==='En ordeño'&&a.del!=='—'&&a.del!==undefined&&a.ayer!=='—').map(a=>{
      // si la vaca ya tiene ordeño registrado hoy en la muestra, usa ese valor
      const m=milkCows.find(c=>c.num===a.num&&c.done);
      return {num:a.num,n:a.n,del:parseInt(a.del),l:m?m.v:a.ayer,
        prenada:a.tags.includes('prenada'),vacia:a.tags.includes('vacia'),retiro:a.tags.includes('tratamiento')};
    });
  }catch(e){ /* hato aún no definido en la carga inicial */ }
  return cows;
}
function renderScatter(svgId){
  const svg=document.getElementById(svgId);if(!svg)return;
  const cows=scatterCows();
  if(!cows.length){svg.innerHTML='';return;}
  const pad={l:45,r:15,t:12,b:28},w=560,h=180;
  const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  const maxDel=Math.max(450,...cows.map(c=>c.del+20));
  const maxL=Math.max(22,...cows.map(c=>c.l+2));
  function x(del){return pad.l+del/maxDel*pw;}
  function y(l){return pad.t+(1-l/maxL)*ph;}
  let out='';
  // grid lines
  for(let v=5;v<=maxL;v+=5)out+='<line x1="'+pad.l+'" y1="'+y(v)+'" x2="'+(w-pad.r)+'" y2="'+y(v)+'" stroke="#E7E7DF" stroke-width="0.7"/>';
  for(let d=0;d<=maxDel;d+=60)out+='<line x1="'+x(d)+'" y1="'+pad.t+'" x2="'+x(d)+'" y2="'+(h-pad.b)+'" stroke="#E7E7DF" stroke-width="0.7"/>';
  // axes
  out+='<line x1="'+pad.l+'" y1="'+(h-pad.b)+'" x2="'+(w-pad.r)+'" y2="'+(h-pad.b)+'" stroke="#A8ACA0" stroke-width="1"/>';
  out+='<line x1="'+pad.l+'" y1="'+pad.t+'" x2="'+pad.l+'" y2="'+(h-pad.b)+'" stroke="#A8ACA0" stroke-width="1"/>';
  // axis labels
  out+='<g font-family="Work Sans,sans-serif" font-size="9.5" fill="#A8ACA0">';
  for(let d=0;d<=maxDel;d+=60)out+='<text x="'+x(d)+'" y="'+(h-pad.b+14)+'" text-anchor="middle">'+d+'</text>';
  for(let v=5;v<=maxL;v+=5)out+='<text x="'+(pad.l-6)+'" y="'+(y(v)+3)+'" text-anchor="end">'+v+'</text>';
  out+='<text x="'+(w/2)+'" y="'+(h-2)+'" text-anchor="middle" font-weight="600" fill="#70756A">DEL (días en leche)</text>';
  out+='<text x="12" y="'+(h/2)+'" text-anchor="middle" font-weight="600" fill="#70756A" transform="rotate(-90,12,'+(h/2)+')">Litros/día</text>';
  out+='</g>';
  // expected curve (typical: peak ~18L at DEL 60, then decline)
  const curvaPts=[];
  for(let d=0;d<=maxDel;d+=5){
    const expected=d<30?10+d*0.27:18*Math.exp(-0.002*(d-60));
    curvaPts.push(x(d)+','+y(Math.min(expected,maxL)));
  }
  out+='<polyline points="'+curvaPts.join(' ')+'" fill="none" stroke="#A8ACA0" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>';
  // dots
  cows.forEach(c=>{
    const cx=x(c.del),cy=y(c.l);
    const col=c.vacia?'var(--red)':c.retiro?'var(--red)':c.prenada?'var(--green)':'var(--ink-2)';
    const r=4.5;   // todos los círculos del mismo tamaño; el color distingue el estado
    out+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" opacity="0.85" style="cursor:pointer"'+
      ' onclick="goVaca(\''+c.num+'\',\'pg-leche\')"><title>'+c.num+' '+c.n+' · DEL '+c.del+' · '+c.l+' L</title></circle>';
    out+='<text x="'+cx+'" y="'+(cy-r-3)+'" font-family="Work Sans,sans-serif" font-size="8" font-weight="500" fill="#70756A" text-anchor="middle">'+c.num+'</text>';
  });
  svg.innerHTML=out;
  // título con el conteo real de vacas en ordeño
  const titleId=svgId==='scatterInicio'?'scatterInicioTitle':'scatterLecheTitle';
  const t=document.getElementById(titleId);
  if(t)t.textContent='Producción vs DEL · '+cows.length+' vacas en ordeño';
}
function renderScatters(){if(!scatterListo)return;renderScatter('scatterLeche');}

/* ===== Entregas a lecheros ===== */
const MESES_L=['Ene','Feb','Mar','Abr','May','Jun'];
const DIAS_MES=[31,28,31,30,31,12];
let lecheros=[
  {id:'jose',n:'Don José',freq:'Diario',precio:1950,diasSemana:[0,1,2,3,4,5,6],
   ayer:120,hoy:null,done:false},
  {id:'maria',n:'Quesería La María',freq:'Lun · Mié · Vie',precio:1950,diasSemana:[1,3,5],
   ayer:50,hoy:null,done:false},
];
/* derivación lechero canónico (BD) → fila de la UI */
const DOW_ABBR=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
function freqDisplay(l){
  const d=l.dias_semana||[];
  if(d.length>=7)return 'Diario';
  if(!d.length)return l.frecuencia||'';
  return d.slice().sort((a,b)=>a-b).map(x=>DOW_ABBR[x]).join(' · ');
}
function lecheroAFila(l,precio){
  return {id:l.id,n:l.nombre,freq:freqDisplay(l),precio:precio||1950,
    diasSemana:l.dias_semana||[],ayer:l.base_litros||0,hoy:null,done:false};
}
(async function cargarLecherosDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const [ls,tarifa]=await Promise.all([LCStore.getLecheros(),LCStore.getTarifa().catch(()=>null)]);
    if(!ls)return;
    const precio=tarifa?tarifa.precio_litro:1950;
    lecheros=ls.map(l=>lecheroAFila(l,precio));
    try{const hoy=await LCStore.getEntregasFecha();
      lecheros.forEach(l=>{if(hoy[l.id]!=null){l.done=true;l.hoy=hoy[l.id];}});
    }catch(_){/* sin entregas hoy */}
    renderEntregas();renderInicio();
  }catch(e){console.warn('Lecheros: usando datos locales:',e.message||e);}
})();
const entregaOverrides={};
function entregaDiaKey(lid,m,d){return lid+'-'+m+'-'+d;}
function entregaDiaVal(lid,mesIdx,dia){
  const k=entregaDiaKey(lid,mesIdx,dia);
  if(k in entregaOverrides)return entregaOverrides[k];
  const l=lecheros.find(x=>x.id===lid);if(!l)return 0;
  const dow=new Date(2026,mesIdx,dia).getDay();
  if(!l.diasSemana.includes(dow))return 0;
  const base=l.id==='jose'?120:50;
  const seed=lid.charCodeAt(0)*13+mesIdx*101+dia*7;
  const wobble=Math.sin(seed)*0.08;
  return Math.max(0,Math.round(base*(1+wobble)));
}
function renderEntregas(){
  const tb=document.getElementById('entregaTbody');if(!tb)return;tb.innerHTML='';
  let totalHoy=0,totalAyer=0;
  lecheros.forEach((l,i)=>{
    const tr=document.createElement('tr');
    if(l.done)tr.className='done';
    let hoyCell,acumL=0,acumP=0;
    for(let d=1;d<=DIAS_MES[5];d++){const v=entregaDiaVal(l.id,5,d);acumL+=v;acumP+=v*l.precio;}
    if(l.done){
      totalHoy+=l.hoy;
      hoyCell='<span class="reg">'+l.hoy+' L ✓</span><span class="edit-ic" title="Corregir">✎</span>';
    }else{hoyCell='<button class="btn outl small reg-btn">Registrar</button>';}
    totalAyer+=l.ayer;
    tr.innerHTML='<td><b>'+l.n+'</b></td><td>'+l.freq+'</td><td class="r">'+l.ayer+'</td>'+
      '<td class="r">'+hoyCell+'</td><td class="r">'+(acumL+(l.done?l.hoy:0))+' L</td>'+
      '<td class="r">$'+((acumP+(l.done?l.hoy*l.precio:0))/1e6).toFixed(1)+'M</td>';
    const act=tr.querySelector('.reg-btn')||tr.querySelector('.edit-ic');
    if(act)act.onclick=e=>{e.stopPropagation();openEntrega(i);};
    tb.appendChild(tr);
  });
  const done=lecheros.filter(l=>l.done);
  const prog=document.getElementById('entregaProg');
  if(prog)prog.textContent=done.length+' de '+lecheros.length+' · Σ '+done.reduce((s,l)=>s+l.hoy,0)+' L';
  const bal=document.getElementById('entregaBalance');
  if(bal){
    const producida=184;const terneras=12;
    const entregada=done.reduce((s,l)=>s+l.hoy,0);
    const pendientes=lecheros.filter(l=>!l.done);
    const casa=producida-entregada-terneras;
    const cuadra=casa>=0&&pendientes.length===0;
    bal.innerHTML='<div style="font-size:13px;color:var(--ink-2);line-height:1.8">'+
      '<b style="color:var(--ink)">Balance del día:</b><br>'+
      'Producida <b>184 L</b> − entregada <b>'+(entregada||'…')+' L</b> − terneras <b>12 L</b> = casa <b>'+(done.length?casa:'…')+' L</b>'+
      (cuadra?' <span class="up" style="font-weight:700"> ✓ cuadra</span>':pendientes.length?' <span class="mut">(faltan '+pendientes.length+' entregas)</span>':
        casa<0?' <span class="down" style="font-weight:700">⚠ más entregada que producida</span>':'')+'</div>'+
      '<div style="margin-top:12px;font-size:13px;color:var(--ink-2);line-height:1.8">'+
      '<b style="color:var(--ink)">Precio vigente:</b> $1.950/L<br>'+
      '<b style="color:var(--ink)">Total por cobrar (junio):</b> $'+((lecheros.reduce((s,l)=>{
        let t=0;for(let d=1;d<=DIAS_MES[5];d++)t+=entregaDiaVal(l.id,5,d);
        if(l.done)t+=l.hoy;return s+t*l.precio;},0))/1e6).toFixed(2)+'M</div>';
  }
  renderLecheKpis();
}
function openEntrega(i){
  const l=lecheros[i];
  document.getElementById('mCow').textContent=l.n.toUpperCase();
  document.getElementById('mDel').textContent=l.freq+' · $'+l.precio+'/L';
  const inp=document.getElementById('mInput');inp.value=l.done?l.hoy:l.ayer;
  const ref=document.getElementById('mRef');ref.className='m-ref';
  ref.textContent=l.done?'Ya registrada con '+l.hoy+' L — puedes corregirla':'Ayer entregaste '+l.ayer+' L';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('milkModal').classList.add('show');
  document.getElementById('scrim').onclick=()=>closeEntrega();
  const saveBtn=document.querySelector('#milkModal .btn.filled');
  saveBtn.onclick=()=>saveEntrega(i);
  inp.onkeydown=e=>{if(e.key==='Enter')saveEntrega(i);};
  setTimeout(()=>{inp.focus();inp.select();},60);
}
function closeEntrega(){document.getElementById('milkModal').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');
  document.getElementById('scrim').onclick=()=>closeMilk();
  const saveBtn=document.querySelector('#milkModal .btn.filled');
  saveBtn.onclick=()=>saveMilk();
  document.getElementById('mInput').onkeydown=e=>{if(e.key==='Enter')saveMilk();};}
function saveEntrega(i){
  const l=lecheros[i];
  const v=Math.max(0,parseInt(document.getElementById('mInput').value)||0);
  const prev={done:l.done,hoy:l.hoy};
  l.done=true;l.hoy=v;
  closeEntrega();renderEntregas();
  if(typeof LCStore!=='undefined'){
    LCStore.registrarEntrega(l.id,v,l.precio).catch(e=>{
      console.warn('No se pudo guardar la entrega en la base:',e.message||e);
      snack('⚠ '+l.n+': guardado local, falta sincronizar');
    });
  }
  snack(l.n+': '+v+' L registrados','Deshacer',()=>{
    l.done=prev.done;l.hoy=prev.hoy;renderEntregas();});
}
let entregaMesIdx=5;
function renderEntregaMesPicker(){
  const p=document.getElementById('entregaMesPicker');if(!p)return;p.innerHTML='';
  MESES_L.forEach((m,i)=>{
    const b=document.createElement('button');b.className='btn outl small';b.textContent=m;
    if(i===entregaMesIdx)b.style.cssText='font-weight:700;background:var(--black);color:#fff;border-color:var(--black)';
    b.onclick=()=>{entregaMesIdx=i;renderEntregaMesPicker();renderEntregaHist();};
    p.appendChild(b);
  });
}
function renderEntregaHist(){
  const head=document.getElementById('entregaHistHead'),tb=document.getElementById('entregaHistBody');
  if(!head||!tb)return;head.innerHTML='';tb.innerHTML='';
  const tit=document.getElementById('entregaHistTitulo');
  const n=DIAS_MES[entregaMesIdx];
  if(tit)tit.textContent='Historial de entregas · '+MESES_L[entregaMesIdx]+' 2026';
  let h='<tr><th>Día</th>';
  lecheros.forEach(l=>h+='<th class="r">'+l.n+'</th>');
  h+='<th class="r" style="font-weight:800">Total</th></tr>';
  head.innerHTML=h;
  const totPorLechero=new Array(lecheros.length).fill(0);
  let gran=0;
  for(let d=n;d>=1;d--){
    const tr=document.createElement('tr');
    const dow=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(2026,entregaMesIdx,d).getDay()];
    let cells='<td><b>'+d+'</b> <span class="sub">'+dow+'</span></td>';
    let diaTotal=0;
    lecheros.forEach((l,li)=>{
      const v=entregaDiaVal(l.id,entregaMesIdx,d);
      const k=entregaDiaKey(l.id,entregaMesIdx,d);
      if(v===0){cells+='<td class="r"><span class="pending">—</span></td>';}
      else{
        totPorLechero[li]+=v;diaTotal+=v;gran+=v;
        cells+='<td class="r editable" title="Corregir" onclick="editEntregaDia(this,\''+l.id+'\','+entregaMesIdx+','+d+','+v+',\''+l.n+'\')">'+v+' L</td>';
      }
    });
    cells+='<td class="r" style="font-weight:700">'+(diaTotal?diaTotal+' L':'—')+'</td>';
    tr.innerHTML=cells;tb.appendChild(tr);
  }
  const trT=document.createElement('tr');trT.style.cssText='background:var(--surface);font-weight:700';
  let tc='<td style="font-weight:700">TOTAL</td>';
  totPorLechero.forEach(t=>tc+='<td class="r">'+t+' L</td>');
  tc+='<td class="r" style="font-weight:800">'+gran+' L</td>';
  trT.innerHTML=tc;tb.appendChild(trT);
}
function editEntregaDia(td,lid,mes,dia,oldVal,nombre){
  if(td.querySelector('input'))return;
  const inp=document.createElement('input');inp.type='number';inp.step='1';inp.min='0';inp.value=oldVal;
  inp.style.cssText='width:52px;border:none;border-bottom:2px solid var(--green);background:transparent;font-family:inherit;font-size:13px;font-weight:700;text-align:center;color:var(--ink);outline:none;padding:2px';
  td.innerHTML='';td.appendChild(inp);inp.focus();inp.select();
  function save(){
    const raw=parseInt(inp.value);
    if(isNaN(raw)||raw<0){renderEntregaHist();return;}
    const k=entregaDiaKey(lid,mes,dia);
    const prev=k in entregaOverrides?entregaOverrides[k]:null;
    entregaOverrides[k]=raw;
    renderEntregaHist();renderEntregas();
    snack(nombre+' · día '+dia+' '+MESES_L[mes]+': '+oldVal+' → '+raw+' L','Deshacer',()=>{
      if(prev!==null)entregaOverrides[k]=prev;else delete entregaOverrides[k];renderEntregaHist();renderEntregas();});
  }
  inp.onblur=save;
  inp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();inp.blur();}
    if(e.key==='Escape'){e.preventDefault();renderEntregaHist();}};
}
renderEntregas();renderEntregaMesPicker();renderEntregaHist();

/* ===== Producción mensual por vaca (resumen) y diaria (detalle del mes) ===== */
let mensualData=[
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
          td.className='r editable';td.title='Corregir';
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
/* ===== Cableado a Supabase: producción mensual ===== */
(async function cargarMensualDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const filas=await LCStore.getProduccionMensual();
    if(!filas)return;
    const meses=['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
    const porAnimal={};
    filas.forEach(f=>{
      if(!porAnimal[f.animal_id])porAnimal[f.animal_id]={num:f.animal_id,
        n:(f.animales&&f.animales.nombre)||f.animal_id,m:[null,null,null,null,null,null]};
      const i=meses.indexOf(f.mes);if(i>=0)porAnimal[f.animal_id].m[i]=f.litros_dia;
    });
    mensualData=Object.values(porAnimal);
    renderMensual();
  }catch(e){console.warn('Producción mensual: usando datos locales:',e.message||e);}
})();

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
/* Dibuja la curva de lactancia en #vacaCurva: ejes, gridlines, curva típica
   de referencia, curva de esta vaca (modelo de Wood) y marcas de pico y hoy. */
function renderVacaCurva(del,ayer){
  const svg=document.getElementById('vacaCurva');if(!svg)return;
  const W=560,H=150,ml=38,mr=14,mt=12,mb=26,pw=W-ml-mr,ph=H-mt-mb;
  const maxDia=Math.ceil(Math.max(del+20,180)/60)*60;
  const cowC=LCRules.curvaLactancia({delActual:del,lActual:ayer,maxDia});
  const tipica=LCRules.curvaLactancia({picoL:18,maxDia});
  const maxL=Math.max(5,Math.ceil(Math.max(cowC.picoL,18,ayer)/5)*5);
  const X=t=>ml+t/maxDia*pw, Y=l=>mt+(1-l/maxL)*ph;
  const path=c=>c.puntos.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
  let o='';
  o+='<g font-family="Work Sans,sans-serif" font-size="9" fill="#A8ACA0">';
  for(let l=0;l<=maxL;l+=5){const y=Y(l);
    o+='<line x1="'+ml+'" y1="'+y+'" x2="'+(W-mr)+'" y2="'+y+'" stroke="#EEF0E4" stroke-width="1"/>';
    o+='<text x="'+(ml-6)+'" y="'+(y+3)+'" text-anchor="end">'+l+'</text>';}
  for(let d=0;d<=maxDia;d+=60){const x=X(d);
    o+='<line x1="'+x+'" y1="'+mt+'" x2="'+x+'" y2="'+(mt+ph)+'" stroke="#F4F5EE" stroke-width="1"/>';
    o+='<text x="'+x+'" y="'+(H-9)+'" text-anchor="middle">'+d+'</text>';}
  o+='<text x="'+(ml+pw/2)+'" y="'+H+'" text-anchor="middle" font-weight="600" fill="#70756A">DEL · días en leche</text>';
  o+='<text x="10" y="'+(mt+ph/2)+'" text-anchor="middle" font-weight="600" fill="#70756A" transform="rotate(-90,10,'+(mt+ph/2)+')">L/día</text>';
  o+='</g>';
  // curva típica del hato (referencia)
  o+='<path d="'+path(tipica)+'" fill="none" stroke="#C7CBBC" stroke-width="1.6" stroke-dasharray="4,3"/>';
  // curva de esta vaca
  o+='<path d="'+path(cowC)+'" fill="none" stroke="#2F7E33" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  // marca del pico
  const px=X(cowC.picoDia),py=Y(cowC.picoL);
  o+='<circle cx="'+px+'" cy="'+py+'" r="2.6" fill="#2F7E33" opacity="0.5"/>';
  o+='<text x="'+px+'" y="'+(py-6)+'" font-family="Work Sans,sans-serif" font-size="9" fill="#70756A" text-anchor="middle">pico ~'+Math.round(cowC.picoL)+' L</text>';
  // hoy
  const hx=X(del),hy=Y(ayer);
  o+='<circle cx="'+hx+'" cy="'+hy+'" r="4.5" fill="#2F7E33"/>';
  const ta=hx>W-90?'end':'start',dx=hx>W-90?-7:7;
  o+='<text x="'+(hx+dx)+'" y="'+(hy-7)+'" font-family="Work Sans,sans-serif" font-size="10" font-weight="700" fill="#16181B" text-anchor="'+ta+'">hoy: '+ayer+' L</text>';
  // leyenda
  o+='<g font-family="Work Sans,sans-serif" font-size="8.5">'+
     '<line x1="'+(ml+6)+'" y1="'+(mt+4)+'" x2="'+(ml+22)+'" y2="'+(mt+4)+'" stroke="#2F7E33" stroke-width="2.5"/>'+
     '<text x="'+(ml+26)+'" y="'+(mt+7)+'" fill="#70756A">esta vaca</text>'+
     '<line x1="'+(ml+86)+'" y1="'+(mt+4)+'" x2="'+(ml+102)+'" y2="'+(mt+4)+'" stroke="#C7CBBC" stroke-width="1.6" stroke-dasharray="4,3"/>'+
     '<text x="'+(ml+106)+'" y="'+(mt+7)+'" fill="#70756A">típica del hato</text></g>';
  svg.innerHTML=o;
}
function fmtEdadLarga(a){
  const n=a.edadAnios;if(n==null)return '—';
  const enMeses=a.grupo==='levante'||a.grupo==='ternera'||(a.grupo==='macho'&&n<1.5)||n<1;
  if(enMeses)return Math.round(n*12)+' meses';
  return (n%1===0?String(n):n.toFixed(1).replace('.',','))+' años';
}
function nombreRef(id){const x=animalesPorId[id];return x?(id+' '+x.nombre):id;}
function deriveReproFicha(a){
  const retiroD=a.retiroLecheHasta?diasHasta(a.retiroLecheHasta):null;
  if(retiroD!=null&&retiroD>=0)return {badge:'bad',text:'Retiro de leche · '+retiroD+(retiroD===1?' día':' días')+' más',sub:'No vender su leche hasta terminar el retiro'};
  if(a.estadoRepro==='prenada'&&a.prenez){
    const m=a.prenez.meses;let sub='';
    if(a.prenez.partoEstimado){const d=new Date(a.prenez.partoEstimado+'T00:00:00');sub='Parto probable ~'+d.getDate()+' '+LCRules.MESC[d.getMonth()];}
    if(a.secarEstimado){const d=new Date(a.secarEstimado+'T00:00:00');sub+=(sub?' · ':'')+'Secar ~'+d.getDate()+' '+LCRules.MESC[d.getMonth()];}
    return {badge:m>=8?'ok':'warn',text:'Preñada · '+m+' meses',sub:sub||'Gestación en curso'};
  }
  if(a.estadoRepro==='servida')return {badge:'',text:'Servida · por palpar',sub:'Confirmar preñez en la próxima palpación'};
  if(a.estadoRepro==='vacia')return {badge:'bad',text:'Vacía'+(a.diasVacia?' '+a.diasVacia+' días':''),sub:a.diasVacia>120?'Evaluar descarte o tratamiento reproductivo':'Esperar para servicio'};
  if(a.grupo==='novilla')return {badge:a.listaServicio?'warn':'',text:a.listaServicio?'Novilla lista para servicio':'Novilla en desarrollo',sub:a.pesoKg?a.pesoKg+' kg':''};
  if(a.grupo==='macho'&&a.rolToro)return {badge:'',text:'Toro reproductor activo',sub:(a.hijasVivas?a.hijasVivas+' hijas vivas':'')};
  return {badge:'',text:a.grupo,sub:''};
}
function buildFichaBasica(a){
  const crias=Object.values(animalesPorId).filter(x=>x.madreId===a.id).map(x=>x.id+' '+x.nombre);
  const retiroD=a.retiroLecheHasta?diasHasta(a.retiroLecheHasta):null;
  const sanOk=!(retiroD!=null&&retiroD>=0);
  const historia=[];
  if(a.prenez&&a.prenez.ultimaPalpacion){const d=new Date(a.prenez.ultimaPalpacion+'T00:00:00');
    historia.push({fecha:d.getDate()+' '+LCRules.MESC[d.getMonth()].toUpperCase()+' '+d.getFullYear(),texto:'Palpación: <b>preñada '+a.prenez.meses+' meses</b>'});}
  if(!sanOk)historia.push({fecha:'EN CURSO',texto:'Tratamiento con retiro de leche',miss:true});
  if(a.partos)historia.push({fecha:'—',texto:a.partos+(a.partos===1?'er':'°')+' parto registrado'});
  return {num:a.id,n:a.nombre,raza:a.raza||'—',edad:fmtEdadLarga(a),grupo:GRUPO_DISPLAY[a.grupo]||a.grupo,
    origen:a.origen==='comprado'?'Comprada':a.origen==='nacido_finca'?'Nació en finca':'—',
    del:(a.del==null?0:a.del),parto:a.partos||0,ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer:0),
    peso:a.pesoKg?a.pesoKg+' kg':'—',
    madre:a.madreId?nombreRef(a.madreId):'—',padre:a.padreId?(a.padreId==='T01'?'Sansón':nombreRef(a.padreId)):'—',
    crias:crias,repro:deriveReproFicha(a),
    sanidad:sanOk?'Sanidad al día — sin retiros activos':'Retiro de leche activo — no vender su leche',sanOk:sanOk,
    historia:historia};
}
function goVaca(num,from){
  let cow=fichas[num];
  if(!cow&&animalesPorId[num])cow=buildFichaBasica(animalesPorId[num]);
  if(!cow)return snack('Ficha de '+num+' — próximamente');
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
    '<div class="card kpi"><div class="k-label">Producción ayer</div><div class="k-value">'+cow.ayer+' <span class="k-unit">L</span></div></div>'+
    '<div class="card kpi"><div class="k-label">DEL</div><div class="k-value">'+cow.del+' <span class="k-unit">días</span></div></div>'+
    '<div class="card kpi"><div class="k-label">Peso</div><div class="k-value" style="font-size:20px">'+cow.peso+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Partos</div><div class="k-value">'+cow.parto+'</div></div>';
  /* genealogía y crías: datos de familia, fuera de los KPIs */
  document.getElementById('vacaGenea').innerHTML=
    '<b style="color:var(--ink)">Nacimiento:</b> '+fmtNacimiento(animalesPorId[cow.num])+'<br>'+
    '<b style="color:var(--ink)">Madre:</b> '+cow.madre+' &nbsp;·&nbsp; <b style="color:var(--ink)">Padre:</b> '+cow.padre+
    '<br><b style="color:var(--ink)">Crías:</b> '+(cow.crias.length?cow.crias.join(', '):'sin crías registradas');
  /* curva de lactancia (modelo de Wood) */
  renderVacaCurva(cow.del,cow.ayer);
  document.getElementById('vacaCurvaSub').textContent='Hoy va en DEL '+cow.del+' · pico típico ~DEL 55 · '+cow.parto+(cow.parto===1?'er':'°')+' parto';
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

/* ===== Palpación: la fuente de verdad de la reproducción ===== */
/* reglas puras compartidas (core/rules.js) */
const MESC=LCRules.MESC;
const fechaParto=LCRules.fechaParto;
/* candidatas a palpar (la lista se arma sola) */
let palpCandidatas=[
  {cow:'027 · Estrella',motivo:'celo sin repetir — ¿preñada?'},
  {cow:'051 · Careta',motivo:'parida hace 121 días, sin celo visto'},
  {cow:'038 · Mona',motivo:'servida 3 jun, por confirmar'},
  {cow:'033 · Paloma',motivo:'vacía hace 132 días'},
  {cow:'029 · Pinta',motivo:'vacía hace 150 días'},
];
/* próximos partos (salen de las palpaciones) */
let proximosPartos=[
  {cow:'011 · Violeta',prenez:'8,5 meses',parto:'~3 jul',badge:'warn'},
  {cow:'019 · Canela',prenez:'8 meses',parto:'~18 jul'},
  {cow:'045 · Morena',prenez:'7,5 meses',parto:'~2 ago'},
  {cow:'008 · Golondrina',prenez:'7 meses',parto:'~12 sep'},
];
/* partos recientes 2026 */
let partosRecientes=[
  {madre:'042 Lucero',cria:'064',fecha:'12 ene',sexo:'H',peso:36,tipo:'normal',estado:'viva',grupo:'Terneras'},
  {madre:'027 Estrella',cria:'069',fecha:'28 feb',sexo:'H',peso:34,tipo:'normal',estado:'viva',grupo:'Terneras'},
  {madre:'033 Paloma',cria:'—',fecha:'20 abr',sexo:'H',peso:0,tipo:'asistido',estado:'muerta',grupo:null},
];
function renderPartosRecientes(){
  const tb=document.getElementById('partosRecientesTbody');if(!tb)return;tb.innerHTML='';
  partosRecientes.forEach(p=>{
    const tr=document.createElement('tr');
    if(p.estado==='viva'){
      tr.innerHTML='<td>'+p.madre+' → '+p.cria+'</td><td>'+p.fecha+'</td>'+
        '<td class="r"><span class="badge ok">'+(p.sexo==='H'?'♀':'♂')+' en '+p.grupo+'</span></td>';
    }else{
      tr.innerHTML='<td>'+p.madre+' → cría</td><td>'+p.fecha+'</td>'+
        '<td class="r"><span class="badge bad">mortinato</span></td>';
    }
    tb.appendChild(tr);
  });
}
function renderPartosKpis(){
  const box=document.getElementById('partosKpis');if(!box)return;
  const total=partosRecientes.length;
  const vivas=partosRecientes.filter(p=>p.estado==='viva').length;
  const mortinatos=total-vivas;
  const porParir=proximosPartos.length;
  const prox=proximosPartos.length?proximosPartos[0]:null;
  box.innerHTML=
    '<div class="card kpi"><div class="k-label">Partos 2026</div><div class="k-value">'+total+'</div><div class="k-trend up">'+vivas+' crías vivas</div></div>'+
    '<div class="card kpi"><div class="k-label">Por parir</div><div class="k-value">'+porParir+'</div><div class="k-trend mut">de las palpaciones</div></div>'+
    '<div class="card kpi"><div class="k-label">Próximo</div><div class="k-value" style="font-size:20px">'+(prox?prox.parto:'—')+'</div><div class="k-trend mut">'+(prox?prox.cow:'sin próximos')+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Mortinatos 2026</div><div class="k-value'+(mortinatos?' down':'')+'">'+mortinatos+'</div><div class="k-trend mut">de '+total+' partos</div></div>';
  refreshHeader();
}
/* vacas vacías que requieren decisión */
let vacasVacias=[
  {cow:'033 · Paloma',num:'033',del:95,sub:'4to parto · Normando',dias:132,ultima:'3 feb 2026',
   ayer:'6 L',rec:'Producción muy baja para su etapa — evaluar descarte'},
  {cow:'029 · Pinta',num:'029',del:412,sub:'Lactancia larga · Holstein × Gyr',dias:150,ultima:'18 ene 2026',
   ayer:'5 L',rec:'Lactancia extendida sin preñez — evaluar descarte'},
];
function renderPartos(){
  const tb=document.getElementById('partosTbody');if(!tb)return;tb.innerHTML='';
  proximosPartos.forEach(p=>{
    const tr=document.createElement('tr');
    const num=p.cow.split('·')[0].trim();
    tr.onclick=()=>goVaca(num,'pg-partos');
    tr.innerHTML='<td>'+p.cow+'</td><td>'+p.prenez+'</td>'+
      '<td class="r">'+(p.badge?'<span class="badge '+p.badge+'">'+p.parto+'</span>':p.parto)+'</td>';
    tb.appendChild(tr);
  });
}
function renderVacias(){
  const tb=document.getElementById('vaciasTbody');if(!tb)return;tb.innerHTML='';
  vacasVacias.forEach(v=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td><div class="cell-animal"><div class="cini">'+v.num+'</div><div><div class="cn">'+
      v.cow.split('·')[1].trim()+'</div><div class="cs">'+v.sub+'</div></div></div></td>'+
      '<td class="r">'+v.del+'</td><td class="r"><span class="badge bad">'+v.dias+' d</span></td>'+
      '<td>'+v.ultima+' → vacía</td><td class="r"><b>'+v.ayer+'</b></td>'+
      '<td style="color:var(--red);font-size:12px">'+v.rec+'</td>'+
      '<td class="r" style="white-space:nowrap"><button class="btn outl small vPalp">Palpar</button> '+
      '<button class="btn outl small vSeca">Secar</button> '+
      '<button class="btn outl small vBaja" style="color:var(--red);border-color:var(--red)">Baja</button></td>';
    tr.querySelector('.vPalp').onclick=e=>{e.stopPropagation();openPalp(v.cow);};
    tr.querySelector('.vSeca').onclick=e=>{e.stopPropagation();openSeca(v.cow);};
    tr.querySelector('.vBaja').onclick=e=>{e.stopPropagation();openBaja(v.cow);};
    tb.appendChild(tr);
  });
  const lbl=document.getElementById('vaciasLabel');
  if(lbl)lbl.textContent='Vacas vacías · '+vacasVacias.length+(vacasVacias.length===1?' requiere':' requieren')+' decisión';
  refreshHeader();renderNavBadges();
}

/* ===== Tratamientos / sanidad del animal ===== */
let tratamientos=[
  {num:'017',n:'Azucena',desc:'Mastitis · antibiótico (3er día de 5)',
   retiro:'retiro de leche hasta sáb 14',badge:'retiro 2 d',badgeCls:'bad'},
];
/* derivación tratamiento canónico (BD) → tarjeta de la UI */
function tratamientoAFila(t){
  const desc=(t.problema||'')+(t.medicamento?' · '+t.medicamento.toLowerCase():'');
  const retiroD=t.retiro_leche_hasta?Math.round((new Date(t.retiro_leche_hasta+'T00:00:00')-HOY_LC)/86400000):null;
  const conRetiro=retiroD!=null&&retiroD>=0;
  return {id:t.id,num:t.animal_id,n:(t.animales&&t.animales.nombre)||t.animal_id,desc:desc,
    retiro:conRetiro?'retiro de leche hasta '+fmtFechaCorta(t.retiro_leche_hasta):'',
    badge:conRetiro?'retiro '+retiroD+'d':'sin retiro',badgeCls:conRetiro?'bad':'ok'};
}
(async function cargarTratamientosDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const ts=await LCStore.getTratamientos(true);
    if(!ts)return;
    tratamientos=ts.map(tratamientoAFila);
    renderTratamientos();
  }catch(e){console.warn('Tratamientos: usando datos locales:',e.message||e);}
})();
function renderTratamientos(){
  const cont=document.getElementById('tratActivos');if(!cont)return;cont.innerHTML='';
  tratamientos.forEach((t,i)=>{
    const card=document.createElement('div');card.className='card';card.style.cssText='margin-bottom:10px';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px">'+
      '<div class="cell-animal" style="display:flex;gap:10px;align-items:center">'+
        '<div class="cini">'+t.num+'</div>'+
        '<div><div class="cn">'+t.n+'</div><div class="cs">'+t.desc+
        (t.retiro?' · <b style="color:var(--red)">'+t.retiro+'</b>':'')+'</div></div>'+
      '</div>'+
      (t.badge?'<span class="badge '+(t.badgeCls||'')+'">'+t.badge+'</span>':'')+'</div>';
    const acts=document.createElement('div');acts.style.cssText='display:flex;gap:8px;margin-top:12px';
    const bFin=document.createElement('button');bFin.className='btn outl small';bFin.textContent='Marcar terminado';
    bFin.onclick=()=>{const removed=tratamientos.splice(i,1)[0];renderTratamientos();
      if(typeof LCStore!=='undefined'&&removed.id)LCStore.terminarTratamiento(removed.id).catch(()=>{});
      snack(removed.n+': tratamiento marcado como terminado','Deshacer',()=>{
        tratamientos.splice(Math.min(i,tratamientos.length),0,removed);renderTratamientos();
        if(typeof LCStore!=='undefined'&&removed.id)LCStore.reactivarTratamiento(removed.id).catch(()=>{});});};
    const bVer=document.createElement('button');bVer.className='btn outl small';bVer.textContent='Ver ficha';
    bVer.onclick=()=>goVaca(t.num,'pg-sanitario');
    acts.appendChild(bFin);acts.appendChild(bVer);card.appendChild(acts);
    cont.appendChild(card);
  });
  const cnt=document.getElementById('tratCount');if(cnt)cnt.textContent=tratamientos.length;
  const lbl=cnt?cnt.parentElement:null;
  if(lbl)lbl.style.color=tratamientos.length?'':'var(--ink-3)';
  renderNavBadges();
}
/* aplica los tratamientos detectados en la palpación: quedan en sanidad y en la ficha */
function aplicarTratamientos(num,nombre,trats,contexto){
  if(!trats||!trats.length)return null;
  const desc='Aplicado en palpación: '+trats.join(', ')+(contexto?' ('+contexto+')':'');
  const reg={num:num,n:nombre,desc:desc,retiro:'',badge:'aplicado hoy',badgeCls:'ok'};
  tratamientos.push(reg);
  /* persistir en la BD (sanidad lee de Supabase); el undo abajo es solo local */
  if(typeof LCStore!=='undefined'){
    LCStore.registrarTratamiento({animalId:num,problema:'Aplicado en palpación',
      medicamento:trats.join(', '),diasRetiro:0,retiroLecheHasta:null})
      .then(r=>{if(r&&r.id)reg.id=r.id;}).catch(()=>{});
  }
  /* queda en la historia clínica de la ficha del animal */
  const fi=fichas[num];let histAdded=false;
  if(fi){fi.historia.unshift({fecha:'13 JUN 2026',
    texto:'Tratamiento: <b>'+trats.join(', ')+'</b>',
    sub:contexto?'En palpación · '+contexto:'Aplicado en palpación'});histAdded=true;}
  renderTratamientos();
  /* función para deshacer lo aplicado (revierte sanidad + historia) */
  return function(){
    const i=tratamientos.indexOf(reg);if(i>=0)tratamientos.splice(i,1);
    if(fi&&histAdded)fi.historia.shift();
    renderTratamientos();
  };
}
const palp={cow:'027 · Estrella',nota:'',parsed:null};
function renderPalpCows(){
  const c=document.getElementById('palpCows');if(!c)return;c.innerHTML='';
  palpCandidatas.forEach(it=>{
    const b=document.createElement('button');b.className='pchip';
    b.textContent=it.cow.replace(' · ',' ');
    if(it.cow===palp.cow)b.classList.add('sel');
    b.onclick=()=>{palp.cow=it.cow;
      document.getElementById('palpInfo').textContent=it.motivo;
      renderPalpCows();};
    c.appendChild(b);
  });
}
const parsePalpNota=LCRules.parsePalpNota;
const parseTrat=LCRules.parseTrat;
const interpCol={prenada:'var(--green)',vacia:'var(--red)',observacion:'var(--amber)',
  celo:'var(--green)',servida:'var(--amber)',parida:'var(--ink-2)',tratamiento:'var(--amber)',otro:'var(--ink-2)'};
const interpTag={prenada:'✓ Preñada',vacia:'✗ Vacía',observacion:'⊘ Observación',
  celo:'♀ Celo',servida:'↻ Servida',parida:'★ Parida',tratamiento:'💊 Tratamiento',otro:'📝 Registrada'};
function renderPalpInterp(){
  const box=document.getElementById('palpInterp');
  const extra=document.getElementById('palpExtraWrap');
  const btn=document.getElementById('palpSaveBtn');
  const p=palp.parsed;
  if(!p){box.innerHTML='<div style="font-size:12.5px;color:var(--ink-3)">Escribe la anotación tal como la dice el veterinario</div>';
    extra.style.display='none';btn.disabled=true;return;}
  btn.disabled=false;
  const col=interpCol[p.tipo]||'var(--ink-2)';
  let h='<div style="display:flex;gap:10px;align-items:flex-start">'+
    '<span style="font-size:12px;font-weight:700;color:'+col+';background:'+col+'18;padding:4px 10px;border-radius:100px;white-space:nowrap">'+
    (interpTag[p.tipo]||p.tipo)+'</span>'+
    '<div><div style="font-size:13.5px;font-weight:600;color:var(--ink)">'+p.label+'</div>';
  if(p.tipo==='prenada'){
    const f=fechaParto(Math.round(p.meses));
    h+='<div style="font-size:12px;color:var(--green);font-weight:600;margin-top:4px">Parto estimado: '+f.larga+'</div>';
  }
  h+='</div></div>';
  box.innerHTML=h;
  if(p.trat&&p.trat.length){
    extra.style.display='';
    const chips=document.getElementById('palpTratChips');chips.innerHTML='';
    p.trat.forEach(t=>{const b=document.createElement('span');b.className='pchip sel';
      b.style.cssText='font-size:12px;cursor:default;background:var(--amber);border-color:var(--amber)';
      b.textContent='💊 '+t;chips.appendChild(b);});
  }else{extra.style.display='none';}
}
function openPalp(cow){
  if(cow)palp.cow=cow;
  else if(!palpCandidatas.find(x=>x.cow===palp.cow)&&palpCandidatas.length)palp.cow=palpCandidatas[0].cow;
  palp.nota='';palp.parsed=null;
  const info=palpCandidatas.find(x=>x.cow===palp.cow);
  document.getElementById('palpInfo').textContent=info?info.motivo:'Confirma el resultado de la palpación';
  document.getElementById('palpNota').value='';
  renderPalpCows();renderPalpInterp();
  document.getElementById('palpScrim').classList.add('show');
  document.getElementById('palpModal').classList.add('show');
  setTimeout(()=>document.getElementById('palpNota').focus(),100);
}
document.addEventListener('DOMContentLoaded',()=>{
  const inp=document.getElementById('palpNota');
  if(inp)inp.addEventListener('input',()=>{palp.nota=inp.value;palp.parsed=parsePalpNota(inp.value);renderPalpInterp();});
});
function closePalp(){document.getElementById('palpModal').classList.remove('show');
  document.getElementById('palpScrim').classList.remove('show');}
function savePalp(){
  const cow=palp.cow,nombre=cow.split('·')[1].trim();
  const num=cow.split('·')[0].trim();
  const p=palp.parsed;if(!p)return;
  const nota=palp.nota.trim();
  closePalp();
  /* quitar de la lista de candidatas */
  const ci=palpCandidatas.findIndex(c=>c.cow===cow);
  const removedCand=ci>=0?palpCandidatas.splice(ci,1)[0]:null;
  /* los tratamientos aplicados quedan en la sanidad del animal, sea cual sea el resultado */
  const undoTrat=aplicarTratamientos(num,nombre,p.trat,nota);
  /* persistir la palpación y el nuevo estado reproductivo en Supabase */
  let pSavePalp=Promise.resolve(),palpId=null;
  const reproAntes=animalesPorId[num]?snapshotReproDB(animalesPorId[num]):null;
  if(typeof LCStore!=='undefined'){
    const campos={ultima_palpacion:isoHoy()};let prenezMeses=null;
    if(p.tipo==='prenada'){const m=Math.round(p.meses);prenezMeses=m;
      campos.estado_repro='prenada';campos.prenez_meses=m;campos.parto_estimado=isoParto(m);campos.dias_vacia=null;}
    else if(p.tipo==='vacia'){campos.estado_repro='vacia';campos.prenez_meses=null;campos.parto_estimado=null;campos.dias_vacia=1;}
    pSavePalp=LCStore.registrarPalpacion({animalId:num,resultado:nota,
      motivo:removedCand?removedCand.motivo:null,prenezMeses:prenezMeses})
      .then(r=>{palpId=r&&r.id;return LCStore.updateAnimalCampos(num,campos);})
      .catch(e=>{console.warn('Palpación no guardada en la base:',e.message||e);
        snack('⚠ Palpación guardada local, falta sincronizar');});
  }
  /* compensación en la base al deshacer (usada por ambas ramas) */
  const revertirPalpEnBase=()=>{ if(typeof LCStore==='undefined')return;
    pSavePalp.then(()=>Promise.all([
      palpId?LCStore.deletePalpacion(palpId):null,
      reproAntes?LCStore.updateAnimalCampos(num,reproAntes):null,
    ])).catch(e=>console.warn('No se pudo revertir la palpación en la base:',e.message||e)); };
  if(p.tipo==='prenada'){
    const meses=Math.round(p.meses);
    const f=fechaParto(meses);
    const nuevo={cow:cow,prenez:p.dias+' días (~'+meses+' m)',parto:f.corta,badge:meses>=8?'warn':''};
    const pi=proximosPartos.findIndex(pp=>pp.cow===cow);
    const prevParto=pi>=0?proximosPartos[pi]:null;
    if(pi>=0)proximosPartos[pi]=nuevo; else proximosPartos.push(nuevo);
    const vi=vacasVacias.findIndex(v=>v.cow===cow);
    const removedVacia=vi>=0?vacasVacias.splice(vi,1)[0]:null;
    renderPartos();renderPartosKpis();renderVacias();renderPalpLista();go('pg-partos',document.querySelector('[data-pg="pg-partos"]'));
    const trats=p.trat.length?' · Trat: '+p.trat.join(', '):'';
    snack(nombre+': '+nota+' → preñada ~'+p.dias+'d — parto '+f.corta+trats,'Deshacer',()=>{
      const j=proximosPartos.findIndex(pp=>pp.cow===cow);
      if(j>=0)proximosPartos.splice(j,1);
      if(prevParto)proximosPartos.push(prevParto);
      if(removedVacia)vacasVacias.splice(Math.min(vi,vacasVacias.length),0,removedVacia);
      if(removedCand)palpCandidatas.splice(Math.min(ci,palpCandidatas.length),0,removedCand);
      if(undoTrat)undoTrat();
      revertirPalpEnBase();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();});
    return;
  }
  if(p.tipo==='vacia'){
    const pi=proximosPartos.findIndex(pp=>pp.cow===cow);
    const prevParto=pi>=0?proximosPartos.splice(pi,1)[0]:null;
    let added=null;
    if(!vacasVacias.find(v=>v.cow===cow)){
      const num=cow.split('·')[0].trim();const fi=fichas[num];
      added={cow:cow,num:num,del:fi?fi.del:'—',sub:fi?(fi.parto+'° parto · '+fi.raza):'—',
        dias:1,ultima:'13 jun 2026',ayer:fi?fi.ayer+' L':'—',
        rec:p.subtipo==='fisiologica'?'Vacía fisiológica — programar servicio':'Vacía — evaluar siguiente paso'};
      vacasVacias.push(added);
    }
    renderPartos();renderPartosKpis();renderVacias();renderPalpLista();go('pg-repro',document.querySelector('[data-pg="pg-repro"]'));
    snack(nombre+': '+nota+' → vacía — lista para servicio','Deshacer',()=>{
      if(added){const ai=vacasVacias.findIndex(v=>v.cow===cow);if(ai>=0)vacasVacias.splice(ai,1);}
      if(prevParto)proximosPartos.splice(Math.min(pi,proximosPartos.length),0,prevParto);
      if(removedCand)palpCandidatas.splice(Math.min(ci,palpCandidatas.length),0,removedCand);
      if(undoTrat)undoTrat();
      revertirPalpEnBase();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();});
    return;
  }
  renderPalpLista();
  const trats=p.trat.length?' · tratamiento aplicado: '+p.trat.join(', '):'';
  snack(nombre+': '+nota+' → '+p.label+trats);
}
function renderPalpLista(){
  const box=document.getElementById('palpListaBox');if(!box)return;
  if(!palpCandidatas.length){box.innerHTML='<span class="mut">No hay candidatas para palpar</span>';return;}
  box.innerHTML=palpCandidatas.map(c=>'<b style="color:var(--ink)">'+c.cow.replace(' · ',' ')+'</b> — '+c.motivo).join('<br>');
}
renderPartos();renderPartosRecientes();renderPartosKpis();renderVacias();renderPalpLista();renderTratamientos();
/* ===== Cableado a Supabase: reproducción y partos ===== */
function fmtFechaCorta(iso){if(!iso)return '—';const d=new Date(iso+'T00:00:00');return d.getDate()+' '+LCRules.MESC[d.getMonth()];}
(async function cargarReproDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const [animales,partos]=await Promise.all([LCStore.getAnimales(),LCStore.getPartos()]);
    if(!animales)return;
    const porId={};animales.forEach(a=>porId[a.id]=a);
    const ref=id=>porId[id]?(id+' '+porId[id].nombre):id;
    const refPunto=id=>porId[id]?(id+' · '+porId[id].nombre):id;
    /* próximos partos: preñadas con fecha estimada, más cercanas primero */
    proximosPartos=animales
      .filter(a=>a.estadoRepro==='prenada'&&a.prenez&&a.prenez.partoEstimado)
      .sort((x,y)=>x.prenez.partoEstimado<y.prenez.partoEstimado?-1:1)
      .map(a=>{const m=a.prenez.meses;return {cow:refPunto(a.id),
        prenez:(String(m).replace('.',','))+' meses',parto:'~'+fmtFechaCorta(a.prenez.partoEstimado),
        badge:m>=8?'warn':undefined};});
    /* candidatas a palpar: servidas (confirmar) y vacías de largo */
    palpCandidatas=animales.filter(a=>a.estadoRepro==='servida'||a.estadoRepro==='vacia')
      .map(a=>({cow:refPunto(a.id),
        motivo:a.estadoRepro==='servida'?'servida, por confirmar'
          :'vacía'+(a.diasVacia?' hace '+a.diasVacia+' días':', confirmar estado')}));
    /* vacas vacías que requieren decisión */
    vacasVacias=animales.filter(a=>a.estadoRepro==='vacia'&&a.diasVacia&&a.diasVacia>=120)
      .map(a=>({cow:refPunto(a.id),num:a.id,del:a.del,
        sub:(a.partos?ordinalParto(a.partos):'')+(a.raza?' · '+a.raza:''),
        dias:a.diasVacia,ultima:fmtFechaCorta(a.ultimaPalpacion),
        ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer+' L':'—'),
        rec:a.del>300?'Lactancia extendida sin preñez — evaluar descarte':'Producción muy baja para su etapa — evaluar descarte'}));
    /* partos recientes desde la tabla partos (vacío si no hay) */
    const GP={ternera:'Terneras',macho:'Machos'};
    partosRecientes=(partos||[]).map(p=>{
      const criaGrupo=p.cria_id&&porId[p.cria_id]?(GP[porId[p.cria_id].grupo]||'Terneras')
        :(p.sexo_cria==='M'?'Machos':'Terneras');
      return {madre:ref(p.madre_id),cria:p.cria_id||'—',fecha:fmtFechaCorta(p.fecha),
        sexo:p.sexo_cria,peso:p.peso_kg||0,tipo:p.tipo,
        estado:p.estado_cria,grupo:p.estado_cria==='viva'?criaGrupo:null};
    });
    renderPartos();renderPartosRecientes();renderPartosKpis();renderVacias();renderPalpLista();
  }catch(e){console.warn('Reproducción: usando datos locales:',e.message||e);}
})();

/* ===== Hato: tabla con filtros funcionales ===== */
let hato=[
  /* En ordeño (26 representadas con muestra) */
  {num:'042',n:'Lucero',raza:'Holstein × Gyr',grupo:'En ordeño',edad:'5,2 a',repro:'<span class="badge warn">preñada 6 m</span> <span class="sub">secar ~12 jul</span>',del:152,ayer:18,var:'+1',vc:'up',tags:['prenada']},
  {num:'038',n:'Mona',raza:'Gyrolando',grupo:'En ordeño',edad:'4,1 a',repro:'<span class="badge">servida · por palpar</span>',del:98,ayer:16,var:'= ayer',vc:'mut',tags:[]},
  {num:'051',n:'Careta',raza:'Holstein × Gyr',grupo:'En ordeño',edad:'3,2 a',repro:'<span class="badge">1er parto · vacía</span>',del:121,ayer:14,var:'+2',vc:'up',tags:['vacia']},
  {num:'027',n:'Estrella',raza:'Gyrolando',grupo:'En ordeño',edad:'3,8 a',repro:'<span class="badge ok">celo sin repetir</span>',del:64,ayer:13,var:'= ayer',vc:'mut',tags:[]},
  {num:'017',n:'Azucena',raza:'Holstein',grupo:'En ordeño',edad:'8 a',repro:'<span class="badge bad">retiro 2 días más</span>',del:201,ayer:11,var:'= ayer',vc:'mut',tags:['tratamiento','prenada']},
  {num:'033',n:'Paloma',raza:'Normando',grupo:'En ordeño',edad:'6,5 a',repro:'<span class="badge bad">vacía 132 días</span>',del:95,ayer:6,var:'-3',vc:'down',tags:['vacia']},
  {num:'029',n:'Pinta',raza:'Holstein × Gyr',grupo:'En ordeño',edad:'7 a',repro:'<span class="badge bad">vacía 150 días</span>',del:412,ayer:5,var:'-1',vc:'down',tags:['vacia']},
  {num:'015',n:'Mariposa',raza:'Gyrolando',grupo:'En ordeño',edad:'5 a',repro:'<span class="badge warn">preñada 4 m</span>',del:180,ayer:10,var:'= ayer',vc:'mut',tags:['prenada']},
  {num:'023',n:'Candelaria',raza:'Holstein',grupo:'En ordeño',edad:'6 a',repro:'<span class="badge warn">preñada 3 m</span>',del:142,ayer:12,var:'+1',vc:'up',tags:['prenada']},
  {num:'035',n:'Rocío',raza:'Normando',grupo:'En ordeño',edad:'4,5 a',repro:'<span class="badge warn">preñada 5 m</span>',del:110,ayer:14,var:'= ayer',vc:'mut',tags:['prenada']},
  {num:'040',n:'Nieve',raza:'Holstein × Gyr',grupo:'En ordeño',edad:'3,5 a',repro:'<span class="badge warn">preñada 2 m</span>',del:88,ayer:15,var:'+1',vc:'up',tags:['prenada']},
  {num:'046',n:'Esperanza',raza:'Gyrolando',grupo:'En ordeño',edad:'5,8 a',repro:'<span class="badge warn">preñada 7 m</span> <span class="sub">secar ~jul</span>',del:195,ayer:9,var:'-1',vc:'down',tags:['prenada']},
  /* Horras (9) */
  {num:'011',n:'Violeta',raza:'Gyrolando',grupo:'Horra',edad:'7 a',repro:'<span class="badge ok">preñada 8,5 m · parto ~3 jul</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'019',n:'Canela',raza:'Holstein × Gyr',grupo:'Horra',edad:'6 a',repro:'<span class="badge ok">preñada 8 m · parto ~18 jul</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'045',n:'Morena',raza:'Normando',grupo:'Horra',edad:'5,5 a',repro:'<span class="badge">preñada 7,5 m · parto ~2 ago</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'008',n:'Golondrina',raza:'Holstein',grupo:'Horra',edad:'9 a',repro:'<span class="badge">preñada 7 m · parto ~12 sep</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'036',n:'Cereza',raza:'Gyrolando',grupo:'Horra',edad:'4 a',repro:'<span class="badge">preñada 7 m · parto ~15 sep</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'041',n:'Garza',raza:'Holstein × Gyr',grupo:'Horra',edad:'5,2 a',repro:'<span class="badge">preñada 6,5 m · parto ~28 sep</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'014',n:'Nube',raza:'Gyrolando',grupo:'Horra',edad:'6,8 a',repro:'<span class="badge">preñada 6 m · parto ~10 oct</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'048',n:'Flor',raza:'Normando',grupo:'Horra',edad:'3,8 a',repro:'<span class="badge">preñada 5,5 m · parto ~25 oct</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  {num:'022',n:'Luna',raza:'Holstein',grupo:'Horra',edad:'7,5 a',repro:'<span class="badge">preñada 5 m · parto ~8 nov</span>',del:'—',ayer:'—',var:'—',vc:'',tags:['prenada']},
  /* Novillas (14 — muestra) */
  {num:'055',n:'Princesa',raza:'Gyrolando',grupo:'Novilla',edad:'2,1 a',repro:'<span class="badge warn">lista para servicio · hija de Sansón</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'058',n:'Alondra',raza:'Holstein × Gyr',grupo:'Novilla',edad:'2 a',repro:'<span class="badge warn">lista para servicio</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'061',n:'Café',raza:'Normando',grupo:'Novilla',edad:'1,9 a',repro:'<span class="sub">318 kg · le faltan ~12 kg</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'063',n:'Dalia',raza:'Gyrolando',grupo:'Novilla',edad:'1,7 a',repro:'<span class="sub">295 kg</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'067',n:'Sirena',raza:'Holstein',grupo:'Novilla',edad:'1,5 a',repro:'<span class="sub">275 kg</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  /* Levante (18 — muestra) */
  {num:'066',n:'Esmeralda',raza:'Gyrolando',grupo:'Levante',edad:'14 m',repro:'<span class="sub">218 kg · 480 g/día</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'068',n:'Perla',raza:'Holstein × Gyr',grupo:'Levante',edad:'13 m',repro:'<span class="sub">201 kg · 470 g/día</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'070',n:'Coral',raza:'Normando',grupo:'Levante',edad:'11 m',repro:'<span class="sub">178 kg · 490 g/día</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  /* Terneras (11 — muestra) */
  {num:'064',n:'(cría de Lucero)',raza:'Holstein × Gyr',grupo:'Ternera',edad:'5 m',repro:'<span class="badge warn">destete próximo</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'071',n:'(cría de Canela)',raza:'Holstein × Gyr',grupo:'Ternera',edad:'4,5 m',repro:'<span class="badge warn">destete próximo</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'073',n:'(cría de Morena)',raza:'Normando',grupo:'Ternera',edad:'3 m',repro:'',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  /* Machos (2) */
  {num:'T01',n:'Sansón',raza:'Toro · Gyr',grupo:'Macho',edad:'6 a',repro:'<span class="badge">toro activo · 23 hijas</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
  {num:'T02',n:'Torete',raza:'Gyr',grupo:'Macho',edad:'11 m',repro:'<span class="sub">venta programada ago</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]},
];
scatterListo=true;   // `hato` ya está definido: el scatter puede leerlo sin riesgo
const hatoGrupos=['En ordeño','Horra','Novilla','Levante','Ternera','Macho'];
const hatoFiltrosEstado=[
  {id:'todas',label:null},
  {id:'prenada',label:'Preñadas',test:a=>a.tags.includes('prenada')},
  {id:'vacia',label:'Vacías',test:a=>a.tags.includes('vacia')},
  {id:'tratamiento',label:'En tratamiento',test:a=>a.tags.includes('tratamiento')},
];
let hatoFiltro='todas';
function contarFiltro(id){
  const f=hatoFiltrosEstado.find(x=>x.id===id);
  return f&&f.test?hato.filter(f.test).length:hato.length;
}
function renderHatoFiltros(){
  const cont=document.getElementById('hatoFiltros');if(!cont)return;cont.innerHTML='';
  /* grupos */
  hatoGrupos.forEach(g=>{
    const cnt=hato.filter(a=>a.grupo===g).length;
    const b=document.createElement('span');b.className='badge';b.style.cursor='pointer';
    b.textContent=g+' ('+cnt+')';
    if(hatoFiltro===g)b.style.cssText='cursor:pointer;background:var(--black);color:#fff;border-color:var(--black)';
    b.onclick=()=>{hatoFiltro=hatoFiltro===g?'todas':g;renderHatoFiltros();renderHato();};
    cont.appendChild(b);
  });
  /* separador visual */
  const sep=document.createElement('span');sep.style.cssText='width:1px;height:18px;background:var(--border);margin:0 2px';
  cont.appendChild(sep);
  /* estados */
  hatoFiltrosEstado.forEach(f=>{
    if(f.id==='todas')return;
    const cnt=contarFiltro(f.id);
    const b=document.createElement('span');b.className='badge';b.style.cursor='pointer';
    b.textContent=f.label+' ('+cnt+')';
    if(hatoFiltro===f.id)b.style.cssText='cursor:pointer;background:var(--black);color:#fff;border-color:var(--black)';
    b.onclick=()=>{hatoFiltro=hatoFiltro===f.id?'todas':f.id;renderHatoFiltros();renderHato();};
    cont.appendChild(b);
  });
}
let hatoSort={key:null,dir:1};
function edadAnios(s){
  if(!s||s==='—')return null;
  const m=s.replace(',','.').match(/([\d.]+)/);if(!m)return null;
  const n=parseFloat(m[1]);
  return s.includes('m')&&!s.includes('a')?n/12:n;
}
function hatoVal(a,key){
  switch(key){
    case 'animal':return parseInt(a.num);
    case 'grupo':return a.grupo;
    case 'edad':return edadAnios(a.edad);
    case 'del':return a.del==='—'||a.del===undefined?null:parseInt(a.del);
    case 'ayer':return a.ayer==='—'?null:a.ayer;
    case 'var':return (a.var==='—'||a.var==='= ayer')?null:parseInt(a.var.replace('+',''));
  }
  return null;
}
function sortHato(key){
  hatoSort.dir=hatoSort.key===key?-hatoSort.dir:1;
  hatoSort.key=key;
  renderHato();
}
function renderHato(){
  const tb=document.getElementById('hatoTbody');if(!tb)return;tb.innerHTML='';
  let filtered;
  const grupoMatch=hatoGrupos.find(g=>g===hatoFiltro);
  if(grupoMatch){filtered=hato.filter(a=>a.grupo===grupoMatch);}
  else{const f=hatoFiltrosEstado.find(x=>x.id===hatoFiltro);
    filtered=f&&f.test?hato.filter(f.test):hato;}
  /* búsqueda por número o nombre */
  const buscarInp=document.getElementById('hatoBuscar');
  const q=buscarInp?buscarInp.value.trim().toLowerCase():'';
  const clearBtn=document.getElementById('hatoBuscarClear');
  if(clearBtn)clearBtn.style.display=q?'':'none';
  if(q)filtered=filtered.filter(a=>a.num.toLowerCase().includes(q)||a.n.toLowerCase().includes(q));
  if(hatoSort.key){filtered=filtered.slice().sort((x,y)=>cmpVals(hatoVal(x,hatoSort.key),hatoVal(y,hatoSort.key),hatoSort.dir));}
  paintSortArrows('hs-',hatoSort);
  const res=document.getElementById('hatoResumen');
  if(res){
    if(q)res.textContent=filtered.length+(filtered.length===1?' resultado':' resultados')+' para "'+q+'"';
    else res.textContent=filtered.length+' de '+hato.length+' animales'+(hatoFiltro!=='todas'?' · filtro: '+(grupoMatch||hatoFiltrosEstado.find(x=>x.id===hatoFiltro).label):'');
  }
  if(!filtered.length){
    tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--ink-3)">Sin resultados'+(q?' para "'+q+'"':'')+'</td></tr>';
    return;
  }
  filtered.forEach(a=>{
    const tr=document.createElement('tr');
    tr.onclick=()=>goVaca(a.num,'pg-hato');
    const varHtml=a.var==='—'?'—':a.var.startsWith('+')?'<span class="up">↑ '+a.var+'</span>':
      a.var.startsWith('-')?'<span class="down">↓ '+a.var+'</span>':'<span class="mut">'+a.var+'</span>';
    tr.innerHTML='<td><div class="cell-animal"><div class="cini">'+a.num+'</div><div><div class="cn">'+a.n+'</div><div class="cs">'+a.raza+'</div></div></div></td>'+
      '<td>'+a.grupo+'</td><td class="r">'+a.edad+'</td>'+
      '<td>'+a.repro+'</td>'+
      '<td class="r">'+(a.del===''||a.del==null||a.del==='—'?'—':a.del)+'</td><td class="r">'+(a.ayer==='—'?'—':'<b>'+a.ayer+' L</b>')+'</td>'+
      '<td class="r">'+varHtml+'</td>'+
      '<td class="r"><svg class="ic-s ic" style="color:var(--ink-3)"><use href="#i-dots"/></svg></td>';
    tb.appendChild(tr);
  });
  refreshHeader();renderScatters();
}
renderHatoFiltros();renderHato();

/* ===== Cableado a Supabase: el hato lee de la base (con respaldo local) =====
 * Convierte un animal en forma canónica (core/model) a la fila que la tabla
 * del hato espera (con presentación derivada: grupo, edad, badges, tags).   */
const GRUPO_DISPLAY={'ordeño':'En ordeño','horra':'Horra','novilla':'Novilla',
  'levante':'Levante','ternera':'Ternera','macho':'Macho','baja':'Baja'};
/* inverso: display de la UI → valor del modelo/BD */
const GRUPO_MODELO={'En ordeño':'ordeño','Horra':'horra','Novilla':'novilla',
  'Levante':'levante','Ternera':'ternera','Macho':'macho','Baja':'baja'};
/* "Hoy" del prototipo = 2026-06-13 (igual que HOY_LC, que se usa al LEER/derivar
   días de retiro y vacía). Anclamos las escrituras a esta misma base para que
   diasHasta() lea consistente. Formateo local para evitar corrimientos de zona. */
function isoDe(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+dd;}
function isoHoy(){return isoDe(HOY_LC);}
function isoMasDias(n){const d=new Date(HOY_LC.getTime());d.setDate(d.getDate()+(n||0));return isoDe(d);}
/* fecha estimada de parto: hoy + lo que falta de gestación (~9 meses) */
function isoParto(meses){const d=new Date(HOY_LC.getTime());d.setMonth(d.getMonth()+Math.max(0,Math.round(9-meses)));return isoDe(d);}
/* snapshot de los campos reproductivos de un animal (forma BD) para poder
   revertir en Supabase si se deshace un parto o una palpación. */
function snapshotReproDB(a){
  return {grupo:a.grupo, del:a.del, estado_repro:a.estadoRepro,
    prenez_meses:a.prenez?a.prenez.meses:null,
    parto_estimado:a.prenez?a.prenez.partoEstimado:null,
    ultima_palpacion:a.ultimaPalpacion||(a.prenez?a.prenez.ultimaPalpacion:null),
    dias_vacia:a.diasVacia, leche_ayer:a.leche?a.leche.ayer:null};
}
/* fecha de nacimiento: exacta si se conoce; si no, estimada desde la edad */
function fmtNacimiento(a){
  if(a&&a.nacimiento){const d=new Date(a.nacimiento+'T00:00:00');return d.getDate()+' '+LCRules.MESC[d.getMonth()]+' '+d.getFullYear();}
  if(a&&a.edadAnios!=null){const d=new Date(HOY_LC.getTime());d.setMonth(d.getMonth()-Math.round(a.edadAnios*12));return '~'+LCRules.MESC[d.getMonth()]+' '+d.getFullYear()+' (estimada)';}
  return '—';
}
const HOY_LC=new Date(2026,5,13);
function fmtEdad(a){
  const n=a.edadAnios;if(n==null)return '—';
  const enMeses=a.grupo==='levante'||a.grupo==='ternera'||(a.grupo==='macho'&&n<1.5)||n<1;
  if(enMeses)return Math.round(n*12)+' m';
  return (n%1===0?String(n):n.toFixed(1).replace('.',','))+' a';
}
function diasHasta(iso){if(!iso)return null;const d=new Date(iso+'T00:00:00');return Math.round((d-HOY_LC)/86400000);}
function deriveRepro(a){
  /* retiro de leche por tratamiento (prioridad: alerta sanitaria) */
  if(a.retiroLecheHasta){const d=diasHasta(a.retiroLecheHasta);
    if(d!=null&&d>=0)return '<span class="badge bad">retiro '+d+(d===1?' día':' días')+' más</span>';}
  /* preñada */
  if(a.estadoRepro==='prenada'&&a.prenez){
    const m=a.prenez.meses;const mTxt=(m%1===0?String(m):String(m).replace('.',','))+' m';
    let cls=m>=8?'ok':(m>=6?'warn':'');
    let extra='';
    if(a.prenez.partoEstimado){const d=new Date(a.prenez.partoEstimado+'T00:00:00');extra=' · parto ~'+d.getDate()+' '+LCRules.MESC[d.getMonth()];}
    else if(a.secarEstimado){const d=new Date(a.secarEstimado+'T00:00:00');extra='</span> <span class="sub">secar ~'+d.getDate()+' '+LCRules.MESC[d.getMonth()];}
    return '<span class="badge '+cls+'">preñada '+mTxt+extra+'</span>';
  }
  if(a.estadoRepro==='servida')return '<span class="badge">servida · por palpar</span>';
  if(a.estadoRepro==='vacia'){
    if(a.diasVacia)return '<span class="badge bad">vacía '+a.diasVacia+' días</span>';
    return '<span class="badge">1er parto · vacía</span>';}
  if(a.grupo==='novilla')return a.listaServicio
    ?'<span class="badge warn">lista para servicio</span>'
    :(a.pesoKg?'<span class="sub">'+a.pesoKg+' kg</span>':'');
  if(a.grupo==='levante'){const g=a.gananciaDiaG?' · '+a.gananciaDiaG+' g/día':'';
    return a.pesoKg?'<span class="sub">'+a.pesoKg+' kg'+g+'</span>':'';}
  if(a.grupo==='ternera')return a.desteteProximo?'<span class="badge warn">destete próximo</span>':'';
  if(a.grupo==='macho')return a.rolToro
    ?'<span class="badge">toro activo'+(a.hijasVivas?' · '+a.hijasVivas+' hijas':'')+'</span>'
    :(a.ventaProgramada?'<span class="sub">venta programada</span>':'');
  return '';
}
function deriveTags(a){
  const t=[];
  if(a.estadoRepro==='prenada')t.push('prenada');
  if(a.estadoRepro==='vacia')t.push('vacia');
  if(a.retiroLecheHasta&&diasHasta(a.retiroLecheHasta)>=0)t.push('tratamiento');
  return t;
}
function animalAFila(a){
  return {num:a.id,n:a.nombre,raza:a.raza,grupo:GRUPO_DISPLAY[a.grupo]||a.grupo,
    edad:fmtEdad(a),repro:deriveRepro(a),
    del:(a.del==null?'—':a.del),ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer:'—'),
    var:'—',vc:'',tags:deriveTags(a)};
}
let animalesPorId={};   // cache id→animal (forma canónica) para fichas y genealogía
(async function cargarHatoDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const animales=await LCStore.getAnimales();
    if(!animales)return; /* base vacía: conservo respaldo local */
    animales.forEach(a=>{animalesPorId[a.id]=a;});
    /* evitar colisión de IDs: los contadores de cría/compra arrancan tras el
       mayor ID numérico que ya exista en la base */
    const maxNum=Math.max(0,...animales.map(a=>parseInt(a.id,10)).filter(n=>!isNaN(n)));
    if(typeof criaSeq!=='undefined'&&maxNum>criaSeq)criaSeq=maxNum;
    if(typeof altaSeq!=='undefined'&&maxNum>altaSeq)altaSeq=maxNum;
    hato=animales.filter(a=>a.grupo!=='baja').map(animalAFila);
    renderHatoFiltros();renderHato();renderInicio();
    if(typeof snack==='function')snack('Hato actualizado desde la base ('+hato.length+')');
  }catch(e){console.warn('Hato: usando datos locales (Supabase no disponible):',e.message||e);}
})();

/* ===== Flujos de registro (tratamiento, secado, parto, alta, baja) ===== */
const fechaDias=LCRules.fechaDias;
function navFor(id){return document.querySelector('[data-pg="'+id+'"]');}
function openReg(title,sub){
  document.getElementById('regTitle').textContent=title;
  document.getElementById('regSub').textContent=sub||'';
  document.getElementById('regActions').style.display='';
  document.getElementById('regSaveBtn').disabled=false;
  document.getElementById('regScrim').classList.add('show');
  document.getElementById('regModal').classList.add('show');
}
function closeReg(){document.getElementById('regModal').classList.remove('show');
  document.getElementById('regScrim').classList.remove('show');}
function regLabel(text){const d=document.createElement('div');d.className='p-label';d.textContent=text;return d;}
function regChips(items,current,onPick){
  const wrap=document.createElement('div');wrap.className='pchips';
  items.forEach(it=>{
    const b=document.createElement('button');b.className='pchip';b.textContent=it.label;
    if(it.val===current)b.classList.add('sel');
    b.onclick=()=>{onPick(it.val);[...wrap.children].forEach(c=>c.classList.toggle('sel',c===b));};
    wrap.appendChild(b);
  });
  return wrap;
}
function regStepper(getVal,setVal,min,max,unit){
  const wrap=document.createElement('div');wrap.className='pchips';wrap.style.alignItems='center';
  const minus=document.createElement('button');minus.className='pchip';minus.style.cssText='font-size:18px;padding:6px 14px';minus.textContent='−';
  const val=document.createElement('span');val.style.cssText='font-weight:700;min-width:90px;text-align:center;font-size:15px';
  const plus=document.createElement('button');plus.className='pchip';plus.style.cssText='font-size:18px;padding:6px 14px';plus.textContent='＋';
  function paint(){val.textContent=getVal()+' '+unit;}
  minus.onclick=()=>{setVal(Math.max(min,getVal()-1));paint();};
  plus.onclick=()=>{setVal(Math.min(max,getVal()+1));paint();};
  paint();wrap.appendChild(minus);wrap.appendChild(val);wrap.appendChild(plus);
  return wrap;
}
function regHint(text,color){const d=document.createElement('div');d.className='p-hint';
  d.style.cssText='font-weight:500;color:'+(color||'var(--ink-2)');d.textContent=text;return d;}
function nombreDe(num){const a=hato.find(x=>x.num===num);return a?a.n:num;}

/* --- menú de registro rápido --- */
function openMenuRegistro(){
  openReg('¿Qué quieres registrar?','');
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='none';
  const opts=[
    ['🥛 Leche del ordeño',()=>{closeReg();go('pg-leche',navFor('pg-leche'));}],
    ['🚚 Entrega a lechero',()=>{closeReg();go('pg-leche',navFor('pg-leche'));}],
    ['🔬 Palpación',()=>{closeReg();openPalp();}],
    ['💊 Enfermedad / tratamiento',()=>{closeReg();openTrata();}],
    ['🐄 Parto',()=>{closeReg();openParto();}],
    ['🌾 Secar vaca',()=>{closeReg();openSeca();}],
    ['🐄 Vaca nueva (compra / nacida)',()=>{closeReg();openNuevaVaca();}],
    ['↧ Dar de baja',()=>{closeReg();openBaja();}],
  ];
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:8px';
  opts.forEach(([label,fn])=>{const b=document.createElement('button');b.className='btn outl';
    b.style.cssText='justify-content:flex-start;width:100%';b.textContent=label;b.onclick=fn;wrap.appendChild(b);});
  body.appendChild(wrap);
}

/* --- menú de registro enfocado en la vaca de la ficha --- */
function openMenuVaca(){
  const num=vacaActual;if(!num)return;
  const cow=fichas[num]||(animalesPorId[num]?buildFichaBasica(animalesPorId[num]):null);if(!cow)return;
  const ref=num+' · '+cow.n;
  openReg('Registrar en '+ref,'Evento clínico o reproductivo de este animal');
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='none';
  const opts=[
    ['✏️ Editar datos',()=>{closeReg();openEditarVaca(num);}],
    ['🔬 Palpación',()=>{closeReg();openPalp(ref);}],
    ['💊 Enfermedad / tratamiento',()=>{closeReg();openTrata(ref);}],
    ['🌾 Secar',()=>{closeReg();openSeca(ref);}],
    ['🐄 Parto',()=>{closeReg();openParto(ref);}],
    ['↧ Dar de baja',()=>{closeReg();openBaja(ref);}],
  ];
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:8px';
  opts.forEach(([label,fn])=>{const b=document.createElement('button');b.className='btn outl';
    b.style.cssText='justify-content:flex-start;width:100%';b.textContent=label;b.onclick=fn;wrap.appendChild(b);});
  body.appendChild(wrap);
}

/* --- editar datos de la vaca (ficha) --- */
const editState={};
function openEditarVaca(num){
  const a=animalesPorId[num];
  if(!a){snack('No tengo los datos de '+num+' desde la base — sincroniza primero');return;}
  editState.num=num;
  editState.nombre=a.nombre||'';editState.raza=a.raza||'';
  editState.nacimiento=a.nacimiento||'';editState.peso=(a.pesoKg!=null?a.pesoKg:'');
  openReg('Editar datos de '+num,'Cambia la información básica del animal');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regTexto('Nombre','Nombre del animal',v=>editState.nombre=v,'text',editState.nombre));
  body.appendChild(regTexto('Raza','Ej. Holstein × Gyr',v=>editState.raza=v,'text',editState.raza));
  body.appendChild(regTexto('Fecha de nacimiento','',v=>editState.nacimiento=v,'date',editState.nacimiento));
  body.appendChild(regTexto('Peso (kg)','',v=>editState.peso=v,'number',editState.peso));
  body.appendChild(regHint('Para cambios reproductivos (preñez, secado, parto) usa los registros del menú.'));
  document.getElementById('regSaveBtn').onclick=guardarEditarVaca;
}
function guardarEditarVaca(){
  const num=editState.num,a=animalesPorId[num];if(!a)return;
  const nombre=(editState.nombre||'').trim()||a.nombre;
  const raza=(editState.raza||'').trim()||null;
  const nacimiento=editState.nacimiento||null;
  const peso=(editState.peso!==''&&editState.peso!=null)?parseFloat(editState.peso):null;
  closeReg();
  /* persistir en la base */
  const campos={nombre:nombre,raza:raza,nacimiento:nacimiento};
  if(peso!=null&&!isNaN(peso)){campos.peso_kg=peso;campos.fecha_peso=isoHoy();}
  /* actualizar caché, ficha curada y fila del hato para reflejarlo de inmediato */
  Object.assign(a,{nombre:nombre,raza:raza,nacimiento:nacimiento});
  if(peso!=null&&!isNaN(peso)){a.pesoKg=peso;a.fechaPeso=isoHoy();}
  if(fichas[num]){fichas[num].n=nombre;fichas[num].raza=raza;if(peso!=null&&!isNaN(peso))fichas[num].peso=peso+' kg';}
  const h=hato.find(x=>x.num===num);if(h){h.n=nombre;h.raza=raza;}
  goVaca(num,vacaFrom);renderHato();
  if(typeof LCStore!=='undefined')LCStore.updateAnimalCampos(num,campos).catch(e=>{
    console.warn('Edición no guardada en la base:',e.message||e);
    snack('⚠ '+num+': cambios guardados local, falta sincronizar');});
  snack(num+' actualizado');
}

/* --- tratamiento (standalone) --- */
const tratState={};
function openTrata(cow){
  const cands=hato.filter(a=>a.grupo==='En ordeño');
  tratState.num=cow?(''+cow).split('·')[0].trim():cands[0].num;
  tratState.problema='Mastitis';tratState.medicina='Antibiótico';tratState.retiro=4;
  tratState.added=false;
  openReg('Registrar enfermedad / tratamiento','Queda en la sanidad del animal y activa el retiro de leche');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Animal'));
  body.appendChild(regChips(cands.map(a=>({val:a.num,label:a.num+' '+a.n})),tratState.num,v=>tratState.num=v));
  body.appendChild(regLabel('Problema'));
  body.appendChild(regChips(['Mastitis','Cojera','Fiebre','Parásitos','Herida','Otro'].map(p=>({val:p,label:p})),tratState.problema,v=>tratState.problema=v));
  body.appendChild(regLabel('Medicamento'));
  body.appendChild(regChips(['Antibiótico','Antiinflamatorio','Vitaminas','Desparasitante','Otro'].map(m=>({val:m,label:m})),tratState.medicina,v=>tratState.medicina=v));
  body.appendChild(regLabel('Días de retiro de leche'));
  body.appendChild(regStepper(()=>tratState.retiro,v=>tratState.retiro=v,0,10,'días'));
  document.getElementById('regSaveBtn').onclick=saveTrata;
}
function saveTrata(){
  const a=hato.find(x=>x.num===tratState.num);const nombre=a?a.n:tratState.num;
  closeReg();
  const conRetiro=tratState.retiro>0;
  const trat={num:tratState.num,n:nombre,desc:tratState.problema+' · '+tratState.medicina.toLowerCase(),
    retiro:conRetiro?'retiro de leche hasta '+fechaDias(tratState.retiro):'',
    badge:conRetiro?'retiro '+tratState.retiro+'d':'sin retiro',badgeCls:conRetiro?'bad':'ok'};
  tratamientos.push(trat);
  let addedTag=false;
  if(a&&!a.tags.includes('tratamiento')){a.tags.push('tratamiento');addedTag=true;}
  const fi=fichas[tratState.num];let histAdded=false;
  if(fi){fi.historia.unshift({fecha:'13 JUN 2026',texto:'Tratamiento: <b>'+tratState.problema+'</b> · '+tratState.medicina.toLowerCase(),
    sub:conRetiro?'Retiro de leche '+tratState.retiro+' días':'Sin retiro de leche'});histAdded=true;}
  renderTratamientos();renderHatoFiltros();renderHato();
  go('pg-sanitario',navFor('pg-sanitario'));
  if(typeof LCStore!=='undefined'){
    LCStore.registrarTratamiento({animalId:tratState.num,problema:tratState.problema,
      medicamento:tratState.medicina,diasRetiro:tratState.retiro,
      retiroLecheHasta:conRetiro?isoMasDias(tratState.retiro):null}).catch(e=>{
      console.warn('Tratamiento no guardado en la base:',e.message||e);
      snack('⚠ Tratamiento guardado local, falta sincronizar');});
  }
  const retiroTxt=conRetiro?' · retiro '+tratState.retiro+'d (hasta '+fechaDias(tratState.retiro)+')':' · sin retiro';
  snack(nombre+': '+tratState.problema.toLowerCase()+' · '+tratState.medicina.toLowerCase()+retiroTxt,'Deshacer',()=>{
    const i=tratamientos.indexOf(trat);if(i>=0)tratamientos.splice(i,1);
    if(a&&addedTag){const ti=a.tags.indexOf('tratamiento');if(ti>=0)a.tags.splice(ti,1);}
    if(fi&&histAdded)fi.historia.shift();
    renderTratamientos();renderHatoFiltros();renderHato();});
}

/* --- secado (ordeño → horra) --- */
const secaState={};
function openSeca(cow){
  const cands=hato.filter(a=>a.grupo==='En ordeño');
  const pref=hato.find(a=>a.grupo==='En ordeño'&&a.tags.includes('prenada'));
  secaState.num=cow?(''+cow).split('·')[0].trim():(pref||cands[0]).num;
  openReg('Secar vaca','Sale del ordeño y pasa a horras. El secado es para vacas preñadas.');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Vaca en ordeño'));
  body.appendChild(regChips(cands.map(a=>({val:a.num,label:a.num+' '+a.n})),secaState.num,v=>{secaState.num=v;pintaSecaInfo();}));
  const info=regHint('','var(--ink-2)');info.id='secaInfoBox';body.appendChild(info);
  pintaSecaInfo();
  document.getElementById('regSaveBtn').onclick=saveSeca;
}
function pintaSecaInfo(){
  const a=hato.find(x=>x.num===secaState.num);const box=document.getElementById('secaInfoBox');if(!box||!a)return;
  const prenada=a.tags.includes('prenada');
  box.textContent=prenada?'Preñada — lista para secar. Su DEL y producción se cierran.':'⚠ No figura preñada — confirma con palpación antes de secar.';
  box.style.color=prenada?'var(--green)':'var(--red)';
}
function saveSeca(){
  const a=hato.find(x=>x.num===secaState.num);if(!a)return;const nombre=a.n;
  if(!a.tags.includes('prenada')){closeReg();
    snack(nombre+' no figura preñada — el secado es para vacas preñadas. Confírmalo con palpación.');return;}
  closeReg();
  const prev={grupo:a.grupo,del:a.del,ayer:a.ayer,var:a.var,vc:a.vc,repro:a.repro};
  a.grupo='Horra';a.del='—';a.ayer='—';a.var='—';a.vc='';
  a.repro=a.repro.replace(/<span class="sub">[^<]*<\/span>/,'').trim()+' <span class="sub">recién secada</span>';
  hatoFiltro='Horra';renderHatoFiltros();renderHato();
  go('pg-hato',navFor('pg-hato'));
  if(typeof LCStore!=='undefined'){
    LCStore.updateAnimalCampos(secaState.num,{grupo:'horra',del:null,leche_ayer:null,secar_estimado:null}).catch(e=>{
      console.warn('Secado no guardado en la base:',e.message||e);
      snack('⚠ Secado guardado local, falta sincronizar');});
  }
  snack(nombre+' secada · sale del ordeño y pasa a horras','Deshacer',()=>{
    Object.assign(a,prev);renderHatoFiltros();renderHato();
    if(typeof LCStore!=='undefined')LCStore.updateAnimalCampos(secaState.num,
      {grupo:'ordeño',del:(typeof prev.del==='number'?prev.del:null),
       leche_ayer:(typeof prev.ayer==='number'?prev.ayer:null)}).catch(()=>{});});
}

/* --- parto --- */
const partoState={};
let criaSeq=73;
function openParto(cow){
  const cands=hato.filter(a=>a.grupo==='Horra');
  if(!cands.length){snack('No hay vacas horras (preñadas próximas) para registrar parto');return;}
  partoState.num=cow?(''+cow).split('·')[0].trim():cands[0].num;
  partoState.sexo='H';partoState.tipo='normal';partoState.estado='viva';partoState.peso=38;
  openReg('Registrar parto','La cría entra al hato y la madre vuelve al ordeño en DEL 0');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Madre (horra)'));
  body.appendChild(regChips(cands.map(a=>({val:a.num,label:a.num+' '+a.n})),partoState.num,v=>partoState.num=v));
  body.appendChild(regLabel('Sexo de la cría'));
  body.appendChild(regChips([{val:'H',label:'♀ Hembra'},{val:'M',label:'♂ Macho'}],partoState.sexo,v=>partoState.sexo=v));
  body.appendChild(regLabel('Tipo de parto'));
  body.appendChild(regChips([{val:'normal',label:'Normal'},{val:'asistido',label:'Asistido'}],partoState.tipo,v=>partoState.tipo=v));
  body.appendChild(regLabel('Estado de la cría'));
  body.appendChild(regChips([{val:'viva',label:'Viva'},{val:'muerta',label:'Mortinato'}],partoState.estado,v=>partoState.estado=v));
  body.appendChild(regLabel('Peso al nacer'));
  body.appendChild(regStepper(()=>partoState.peso,v=>partoState.peso=v,20,60,'kg'));
  document.getElementById('regSaveBtn').onclick=saveParto;
}
function saveParto(){
  const a=hato.find(x=>x.num===partoState.num);if(!a)return;const nombre=a.n;
  closeReg();
  const sexoTxt=partoState.sexo==='H'?'♀ hembra':'♂ macho';
  const tipoTxt=partoState.tipo==='asistido'?'parto asistido':'parto normal';
  /* snapshot de la madre + parto próximo */
  const prevMadre={grupo:a.grupo,del:a.del,ayer:a.ayer,var:a.var,vc:a.vc,repro:a.repro,tags:a.tags.slice()};
  const pi=proximosPartos.findIndex(p=>p.cow.split('·')[0].trim()===partoState.num);
  const prevParto=pi>=0?proximosPartos[pi]:null;
  if(pi>=0)proximosPartos.splice(pi,1);
  /* la madre vuelve al ordeño en DEL 0 */
  a.grupo='En ordeño';a.del=0;a.ayer=0;a.var='—';a.vc='';
  a.tags=a.tags.filter(t=>t!=='prenada');
  a.repro='<span class="badge ok">recién parida · DEL 0</span>';
  /* la cría viva entra al hato */
  let cria=null;
  const criaGrupo=partoState.sexo==='H'?'Ternera':'Macho';
  if(partoState.estado==='viva'){
    const num=String(++criaSeq).padStart(3,'0');
    cria={num,n:'(cría de '+nombre+')',raza:a.raza,grupo:criaGrupo,edad:'0 m',
      repro:'<span class="badge ok">recién nacid'+(partoState.sexo==='H'?'a':'o')+' · '+partoState.peso+' kg</span>',
      del:'—',ayer:'—',var:'—',vc:'',tags:[]};
    hato.unshift(cria);
  }
  /* registrar en partos recientes */
  const reciente={madre:partoState.num+' '+nombre,cria:cria?cria.num:'—',fecha:'13 jun',
    sexo:partoState.sexo,peso:partoState.peso,tipo:partoState.tipo,
    estado:partoState.estado,grupo:partoState.estado==='viva'?(criaGrupo==='Ternera'?'Terneras':'Machos'):null};
  partosRecientes.push(reciente);
  renderHatoFiltros();renderHato();renderPartos();renderPartosRecientes();renderPartosKpis();
  go('pg-partos',navFor('pg-partos'));
  /* persistencia + datos para revertir en la base si se deshace */
  let pSaveParto=Promise.resolve();
  const partoId='P-'+Date.now();
  const criaId=cria?cria.num:null;
  const numMadre=partoState.num;
  const madreAntes=animalesPorId[numMadre]?snapshotReproDB(animalesPorId[numMadre]):null;
  if(typeof LCStore!=='undefined'){
    /* ORDEN IMPORTANTE: la cría debe existir antes que el parto, porque
       partos.cria_id la referencia por llave foránea. */
    pSaveParto=Promise.resolve()
      .then(()=>{ if(cria)return LCStore.insertAnimal({id:cria.num,nombre:'Cría de '+nombre,
          raza:a.raza,grupo:partoState.sexo==='H'?'ternera':'macho',sexo:partoState.sexo,
          edadAnios:0,origen:'nacido_finca',madreId:partoState.num,pesoKg:partoState.peso}); })
      .then(()=>LCStore.registrarParto({id:partoId,madreId:partoState.num,criaId:criaId,fecha:isoHoy(),
        sexo:partoState.sexo,pesoKg:partoState.peso,tipo:partoState.tipo,estadoCria:partoState.estado}))
      .then(()=>LCStore.updateAnimalCampos(partoState.num,{grupo:'ordeño',del:0,
        estado_repro:null,prenez_meses:null,parto_estimado:null,ultima_palpacion:null,
        dias_vacia:null,leche_ayer:0}))
      .catch(e=>{console.warn('Parto no guardado completo en la base:',e.message||e);
        snack('⚠ Parto guardado local, falta sincronizar');});
  }
  const msg=partoState.estado==='viva'
    ? 'Parto de '+nombre+' · cría '+cria.num+' ('+sexoTxt+', '+partoState.peso+' kg) creada en '+cria.grupo+' · '+nombre+' al ordeño en DEL 0'
    : 'Parto de '+nombre+' · la cría nació muerta — queda en el historial · '+nombre+' al ordeño en DEL 0';
  snack(msg,'Deshacer',()=>{
    Object.assign(a,prevMadre);
    if(cria){const ci=hato.indexOf(cria);if(ci>=0)hato.splice(ci,1);criaSeq--;}
    if(prevParto)proximosPartos.splice(Math.min(pi,proximosPartos.length),0,prevParto);
    const ri=partosRecientes.indexOf(reciente);if(ri>=0)partosRecientes.splice(ri,1);
    renderHatoFiltros();renderHato();renderPartos();renderPartosRecientes();renderPartosKpis();
    /* revertir en la base: esperar a que termine de guardar y compensar */
    if(typeof LCStore!=='undefined')pSaveParto.then(()=>Promise.all([
      LCStore.deleteParto(partoId),
      criaId?LCStore.deleteAnimal(criaId):null,
      madreAntes?LCStore.updateAnimalCampos(numMadre,madreAntes):null,
    ])).catch(e=>console.warn('No se pudo revertir el parto en la base:',e.message||e));
  });
}

/* --- alta (compra / ingreso) --- */
/* --- vaca nueva (comprada o nacida) --- */
const altaGrupoMap={'Novilla':'Novilla','Vaca en ordeño':'En ordeño','Ternera':'Ternera','Levante':'Levante','Toro':'Macho'};
let altaSeq=80;
const compraState={};
/* helper: campo de texto/número dentro del modal de registro */
function regTexto(label,ph,onInput,type,value){
  const wrap=document.createElement('div');
  wrap.appendChild(regLabel(label));
  const inp=document.createElement('input');inp.type=type||'text';inp.placeholder=ph||'';
  if(value!=null&&value!=='')inp.value=value;
  inp.style.cssText='width:100%;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-family:inherit;font-size:14px;color:var(--ink);padding:10px 12px;outline:none';
  inp.oninput=()=>onInput(inp.value);
  wrap.appendChild(inp);return wrap;
}
/* paso 1: ¿de dónde viene el animal? */
function openNuevaVaca(){
  openReg('Registrar vaca nueva','¿De dónde viene el animal?');
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='none';
  const opts=[
    ['🛒 Comprada','Entra de otra finca o feria',()=>openCompra()],
    ['🐄 Nacida en la finca','Se registra como el parto de su madre',()=>{closeReg();openParto();}],
  ];
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:8px';
  opts.forEach(([label,sub,fn])=>{const b=document.createElement('button');b.className='btn outl';
    b.style.cssText='justify-content:flex-start;align-items:flex-start;flex-direction:column;gap:2px;width:100%;padding:12px 14px';
    b.innerHTML='<span style="font-weight:700">'+label+'</span><span style="font-size:11.5px;color:var(--ink-2);font-weight:500">'+sub+'</span>';
    b.onclick=fn;wrap.appendChild(b);});
  body.appendChild(wrap);
}
/* compra: datos del animal que entra */
function openCompra(){
  compraState.tipo='Novilla';compraState.raza='Holstein × Gyr';compraState.edad=2;
  compraState.procedencia='';compraState.valor='';
  openReg('Vaca comprada','Entra al hato; queda con la ficha lista para completar');
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='';
  body.appendChild(regLabel('Tipo de animal'));
  body.appendChild(regChips(Object.keys(altaGrupoMap).map(t=>({val:t,label:t})),compraState.tipo,v=>compraState.tipo=v));
  body.appendChild(regLabel('Raza'));
  body.appendChild(regChips(['Holstein × Gyr','Gyrolando','Holstein','Normando'].map(r=>({val:r,label:r})),compraState.raza,v=>compraState.raza=v));
  body.appendChild(regLabel('Edad aproximada'));
  body.appendChild(regStepper(()=>compraState.edad,v=>compraState.edad=v,0,15,'años'));
  body.appendChild(regTexto('Procedencia (opcional)','Finca o vendedor',v=>compraState.procedencia=v));
  body.appendChild(regTexto('Valor de compra (opcional)','$',v=>compraState.valor=v,'number'));
  document.getElementById('regSaveBtn').onclick=saveCompra;
}
function saveCompra(){
  closeReg();
  const grupo=altaGrupoMap[compraState.tipo];
  const num=grupo==='Macho'?'T0'+(Math.floor(Math.random()*9)+3):String(++altaSeq).padStart(3,'0');
  const nuevo={num,n:'(compra)',raza:compraState.raza,grupo,edad:compraState.edad+' a',
    repro:'<span class="badge">ficha por completar</span>',del:'—',ayer:'—',var:'—',vc:'',tags:[]};
  hato.unshift(nuevo);
  hatoFiltro=grupo;renderHatoFiltros();renderHato();
  go('pg-hato',navFor('pg-hato'));
  if(typeof LCStore!=='undefined'){
    LCStore.insertAnimal({id:num,nombre:'(compra)',raza:compraState.raza,
      grupo:GRUPO_MODELO[grupo]||'novilla',sexo:grupo==='Macho'?'M':'H',
      edadAnios:compraState.edad,origen:'comprado',
      procedencia:compraState.procedencia||null,
      valorCompra:compraState.valor?parseInt(String(compraState.valor).replace(/\D/g,'')):null
    }).catch(e=>{console.warn('Compra no guardada en la base:',e.message||e);
      snack('⚠ Compra guardada local, falta sincronizar');});
  }
  const proc=compraState.procedencia?' · '+compraState.procedencia:'';
  const val=compraState.valor?' · $'+compraState.valor:'';
  snack('Compra: '+num+' ('+compraState.tipo.toLowerCase()+', '+compraState.raza+')'+proc+val+' — entró al hato','Deshacer',()=>{
    const i=hato.indexOf(nuevo);if(i>=0)hato.splice(i,1);if(grupo!=='Macho')altaSeq--;
    renderHatoFiltros();renderHato();
    if(typeof LCStore!=='undefined')LCStore.deleteAnimal(num).catch(()=>{});});
}

/* --- baja (venta / muerte / descarte / pérdida) --- */
const bajaState={};
function openBaja(cow){
  bajaState.num=cow?(''+cow).split('·')[0].trim():hato[0].num;
  bajaState.motivo='Venta';
  openReg('Dar de baja','Sale del hato; su historia se conserva en el histórico');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Animal'));
  body.appendChild(regChips(hato.map(a=>({val:a.num,label:a.num+' '+a.n})),bajaState.num,v=>bajaState.num=v));
  body.appendChild(regLabel('Motivo'));
  body.appendChild(regChips(['Venta','Muerte','Descarte','Pérdida'].map(m=>({val:m,label:m})),bajaState.motivo,v=>bajaState.motivo=v));
  document.getElementById('regSaveBtn').onclick=saveBaja;
}
function saveBaja(){
  const idx=hato.findIndex(x=>x.num===bajaState.num);if(idx<0)return;
  const a=hato[idx];const nombre=a.n;
  closeReg();
  hato.splice(idx,1);renderHatoFiltros();renderHato();
  go('pg-hato',navFor('pg-hato'));
  if(typeof LCStore!=='undefined'){
    LCStore.darDeBaja(bajaState.num,{motivo:bajaState.motivo,fecha:isoHoy()}).catch(e=>{
      console.warn('Baja no guardada en la base:',e.message||e);
      snack('⚠ Baja guardada local, falta sincronizar');});
  }
  snack(nombre+': baja por '+bajaState.motivo.toLowerCase()+' — sale del hato, su historia se conserva','Deshacer',()=>{
    hato.splice(Math.min(idx,hato.length),0,a);renderHatoFiltros();renderHato();
    if(typeof LCStore!=='undefined')LCStore.updateAnimalCampos(bajaState.num,
      {grupo:GRUPO_MODELO[a.grupo]||'ordeño',baja_motivo:null,baja_fecha:null,baja_valor:null,baja_nota:null}).catch(()=>{});});
}

/* 32 potreros ordenados por estado: listos → recuperando → recién pastoreados */
let pots=[];
for(let i=1;i<=32;i++){
  let d;
  if(i===7)d=-2;            // hato aquí
  else if(i===8)d=1; else if(i===9)d=3; else if(i===14)d=2; else if(i===21)d=4;
  else d=5+((i*7)%31);
  pots.push({n:i,d:d,sugerido:i===4});
}
function stateOf(p){if(p.d<0)return'now';if(p.d<=5)return'bad';if(p.d<25)return'warn';return'ok';}
const orderPot={ok:0,warn:1,bad:2,now:3};
function renderPotreros(){
  const grid=document.getElementById('pgrid');if(!grid)return;grid.innerHTML='';
  const lista=pots.slice().sort((a,b)=>{const s=orderPot[stateOf(a)]-orderPot[stateOf(b)];return s!==0?s:b.d-a.d;});
  lista.forEach(p=>{
    const st=stateOf(p);
    const div=document.createElement('div');
    div.className='pot '+(st==='now'?'bad now':st)+(st==='bad'?' off':'');
    const cap=st==='now'?'día de ocupación':st==='ok'?'listo':st==='warn'?'recuperando':'recién pastoreado';
    const days=st==='now'?'2º':p.d;
    div.innerHTML=(st==='now'?'<div class="p-tag">HATO AQUÍ</div>':'')+
      (p.sugerido?'<div class="p-tag">SUGERIDO</div>':'')+
      '<div class="p-top"><span class="p-name">P'+p.n+'</span><span class="dot"></span></div>'+
      '<div class="p-days">'+days+'</div><div class="p-cap">'+cap+'</div>';
    if(p.sugerido){div.classList.add('suggested');}
    div.onclick=()=>snack('Potrero '+p.n+': '+(st==='now'?'el hato está aquí (día 2)':p.d+' días de descanso · '+cap));
    grid.appendChild(div);
  });
}
renderPotreros();
renderInicio();   /* pintado inicial del dashboard (los cargadores lo refinan) */
(async function cargarPotrerosDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const ps=await LCStore.getPotreros();
    if(!ps)return;
    pots=ps.map(p=>({n:p.numero,d:p.dias_descanso,sugerido:!!p.sugerido_siguiente}));
    renderPotreros();renderInicio();
  }catch(e){console.warn('Potreros: usando datos locales:',e.message||e);}
})();

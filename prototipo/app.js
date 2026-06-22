const titles={
  'scr-selector':['Los Chagualos','Elige una línea de negocio'],
  'scr-inicio':['Dashboard','Leche · jue 12 jun · datos clave'],
  'scr-ordeno':['Leche','Producción y ordeño del día'],
  'scr-potreros':['Potreros','12 potreros · ocupación 1 día (máx 2)'],
  'scr-hato':['Hato','80 animales · 26 en ordeño'],
  'scr-vaca':['Ficha del animal','Se consulta mucho, se edita poco'],
  'scr-sanitario':['Sanidad','Tratamientos, retiros y vacunas'],
  'scr-repro':['Reproducción','Monta natural · la palpación manda'],
  'scr-partos':['Partos','Las palpaciones marcan las fechas'],
  'scr-grupo':['Grupo',''],
};
/* drill-down: hato → grupo → animal */
const grupos={
  ordeno:{nombre:'Vacas en ordeño',sub:'26 vacas · ayer 11,4 L/vaca · DEL prom. 164',
    header:'<b>26 vacas en ordeño.</b> Ordenadas como entran al ordeño. Ayer: 296 L en total.',
    animales:[
      ['042 · Lucero','DEL 152 · preñada 6m · ayer 18 L',1],
      ['038 · Mona','DEL 98 · servida (por confirmar) · ayer 16 L'],
      ['051 · Careta','DEL 121 · ayer 14 L'],
      ['027 · Estrella','DEL 64 · pico de lactancia · ayer 13 L'],
      ['017 · Azucena','DEL 201 · retiro 2 días más · ayer 11 L'],
      ['033 · Paloma','DEL 95 · vacía 132 días · ayer 6 L'],
      ['029 · Pinta','DEL 412 · vacía 150 días · ayer 5 L'],
      ['Ver las 19 restantes','',0,1]]},
  horras:{nombre:'Vacas horras (secas)',sub:'9 vacas · 6 paren antes de octubre',
    header:'<b>9 vacas horras.</b> Ordenadas por fecha de parto: las 3 primeras entran al ordeño antes de agosto.',
    animales:[
      ['011 · Violeta','preñada 8,5 meses · parto ~3 jul'],
      ['019 · Canela','preñada 8 meses · parto ~18 jul'],
      ['045 · Morena','preñada 7,5 meses · parto ~2 ago'],
      ['008 · Golondrina','preñada 7 meses · parto ~12 sep'],
      ['036 · Cereza','preñada 7 meses · parto ~15 sep'],
      ['041 · Garza','preñada 6,5 meses · parto ~28 sep'],
      ['014 · Nube','preñada 6 meses · parto ~10 oct'],
      ['048 · Flor','preñada 5,5 meses · parto ~25 oct'],
      ['022 · Luna','preñada 5 meses · parto ~8 nov']]},
  novillas:{nombre:'Novillas de vientre',sub:'14 novillas · 4 listas para servicio',
    header:'<b>14 novillas de vientre.</b> 4 ya tienen peso para servicio (>330 kg).',
    animales:[
      ['055 · Princesa','2,1 años · 342 kg · lista para servicio'],
      ['058 · Alondra','2 años · 335 kg · lista para servicio'],
      ['061 · Café','1,9 años · 318 kg · le faltan ~12 kg'],
      ['Ver las 11 restantes','',0,1]]},
  levante:{nombre:'Hembras de levante',sub:'18 hembras · peso mensual al día',
    header:'<b>18 hembras de levante.</b> Crecimiento promedio: 480 g/día (meta: 500).',
    animales:[
      ['066 · Esmeralda','14 meses · 218 kg'],
      ['068 · Perla','13 meses · 201 kg'],
      ['Ver las 16 restantes','',0,1]]},
  terneras:{nombre:'Terneras',sub:'11 terneras · 2 destetes próximos',
    header:'<b>11 terneras.</b> Consumen 40 L/día de la leche del ordeño.',
    animales:[
      ['064 · (cría de Lucero)','5 meses · destete próximo'],
      ['071 · (cría de Canela)','4,5 meses · destete próximo'],
      ['Ver las 9 restantes','',0,1]]},
  machos:{nombre:'Machos / toros',sub:'2 machos',
    header:'<b>2 machos.</b> Sansón cubre el hato; el torete se vende en agosto.',
    animales:[
      ['T01 · Sansón','Toro · 6 años · sanidad al día'],
      ['T02 · Torete','11 meses · venta programada ago']]},
  bajas:{nombre:'Bajas · histórico',sub:'7 animales fuera del hato · 2026',
    header:'<b>7 bajas en 2026.</b> Vendidas, muertas o perdidas — ya no están en el hato, pero su historia se conserva.',
    animales:[
      ['021 · Lucía','VENDIDA · 4 may · descarte por baja producción ($2,1 M)'],
      ['009 · Manzana','MUERTA · 18 abr · timpanismo'],
      ['T02 · (cría 058)','VENDIDO · 2 abr · ternero macho ($0,9 M)'],
      ['044 · Estrella vieja','MUERTA · 11 mar · parto complicado'],
      ['016 · Perla','VENDIDA · 20 feb · descarte por edad ($1,8 M)'],
      ['033 · (cría de Paloma)','MUERTA · 20 abr · mortinato'],
      ['052 · Nube','PERDIDA · 6 ene · no apareció tras tormenta']]}
};
function openGroup(k){const g=grupos[k];
  titles['scr-grupo']=[g.nombre,g.sub];
  document.getElementById('grpHeader').innerHTML=g.header;
  const list=document.getElementById('grpList');list.innerHTML='';
  g.animales.forEach(a=>{const d=document.createElement('div');d.className='list-item';
    if(a[3]){d.innerHTML='<div class="li-body" style="text-align:center"><div class="li-sub" style="font-weight:600;text-decoration:underline;text-underline-offset:3px">'+a[0]+'</div></div>';
      d.onclick=()=>snack('La lista completa, con scroll, en la app real');}
    else{d.innerHTML='<div class="li-body"><div class="li-title">'+a[0]+'</div>'+
      '<div class="li-sub">'+a[1]+'</div></div><svg class="ic chev"><use href="#i-chev"/></svg>';
      d.onclick=a[2]?openCow:()=>snack('Ficha de '+a[0]+' — misma estructura que la de Lucero');}
    list.appendChild(d);});
  go('scr-grupo');}
/* pestañas de primer nivel y a qué pestaña pertenece cada pantalla hija */
const TABS=['scr-inicio','scr-ordeno','scr-hato','scr-sanitario','scr-repro'];
const tabPadre={'scr-potreros':'scr-inicio',
  'scr-partos':'scr-repro','scr-vaca':'scr-hato','scr-grupo':'scr-hato'};
let histStack=['scr-selector'];
function go(id,navBtn){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const enSelector=id==='scr-selector';
  // el selector es pantalla completa: sin barra inferior ni botón +
  document.querySelector('.navbar').style.display=enSelector?'none':'';
  document.querySelector('.fab').style.display=enSelector?'none':'';
  const tab=tabPadre[id]||id;   // las pantallas hijas iluminan su pestaña madre
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.scr===tab));
  const t=titles[id];
  document.getElementById('barTitle').textContent=t[0];
  document.getElementById('barSub').textContent=t[1];
  // botón superior izquierdo: rejilla (volver al selector) en pestañas, flecha atrás en hijas, nada en el selector
  const back=document.getElementById('backBtn');
  if(enSelector){back.style.display='none';}
  else if(TABS.includes(id)){back.style.display='flex';back.onclick=()=>go('scr-selector');
    back.innerHTML='<svg class="ic"><use href="#i-grid"/></svg>';}
  else{back.style.display='flex';back.onclick=goBack;
    back.innerHTML='<svg class="ic"><use href="#i-back"/></svg>';}
  if(navBtn||enSelector)histStack=[id];                       // cambiar de pestaña o ir al selector reinicia el historial
  else if(histStack[histStack.length-1]!==id)histStack.push(id);
  document.getElementById(id).scrollTop=0;
}
function goBack(){histStack.pop();go(histStack.pop()||'scr-inicio');}
function entrarModulo(m){
  if(m!=='leche'){snack('Esa línea aún no está disponible');return;}
  go('scr-inicio',1);   // entra al módulo Leche, en el Dashboard
}
function openCow(){go('scr-vaca');}
/* Curva de lactancia (modelo de Wood) de la ficha · misma lógica que escritorio */
function renderFichaCurva(del,ayer){
  const svg=document.getElementById('vacaCurvaM');if(!svg||!window.LCRules)return;
  const W=320,H=130,ml=30,mr=10,mt=12,mb=22,pw=W-ml-mr,ph=H-mt-mb;
  const maxDia=Math.ceil(Math.max(del+20,180)/60)*60;
  const cowC=LCRules.curvaLactancia({delActual:del,lActual:ayer,maxDia});
  const tipica=LCRules.curvaLactancia({picoL:18,maxDia});
  const maxL=Math.max(5,Math.ceil(Math.max(cowC.picoL,18,ayer)/5)*5);
  const X=t=>ml+t/maxDia*pw, Y=l=>mt+(1-l/maxL)*ph;
  const path=c=>c.puntos.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
  let o='<g font-family="Work Sans,sans-serif" font-size="8.5" fill="#A8ACA0">';
  for(let l=0;l<=maxL;l+=5){const y=Y(l);
    o+='<line x1="'+ml+'" y1="'+y+'" x2="'+(W-mr)+'" y2="'+y+'" stroke="#EEF0E4" stroke-width="1"/>';
    o+='<text x="'+(ml-5)+'" y="'+(y+3)+'" text-anchor="end">'+l+'</text>';}
  for(let d=0;d<=maxDia;d+=60){const x=X(d);
    o+='<text x="'+x+'" y="'+(H-7)+'" text-anchor="middle">'+d+'</text>';}
  o+='<text x="'+(ml+pw/2)+'" y="'+H+'" text-anchor="middle" font-weight="600" fill="#70756A">DEL</text></g>';
  o+='<path d="'+path(tipica)+'" fill="none" stroke="#C7CBBC" stroke-width="1.5" stroke-dasharray="4,3"/>';
  o+='<path d="'+path(cowC)+'" fill="none" stroke="#2F7E33" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  const hx=X(del),hy=Y(ayer),ta=hx>W-70?'end':'start',dx=hx>W-70?-6:6;
  o+='<circle cx="'+hx+'" cy="'+hy+'" r="4" fill="#2F7E33"/>';
  o+='<text x="'+(hx+dx)+'" y="'+(hy-6)+'" font-family="Work Sans,sans-serif" font-size="9.5" font-weight="700" fill="#16181B" text-anchor="'+ta+'">hoy: '+ayer+' L</text>';
  svg.innerHTML=o;
}
renderFichaCurva(152,18);   // ficha (estática) = Lucero 042
/* rutina de la mañana */
const rutina={ordeno:false,entregas:false,hato:false};
const rutinaIcono={ordeno:'i-drop',entregas:'i-truck',hato:'i-pin'};
function pintaRutina(){const n=Object.values(rutina).filter(Boolean).length;
  document.getElementById('rutinaProg').textContent=n+' de 3'+(n===3?' · día completo':'');}
function markRutina(k){if(rutina[k])return;rutina[k]=true;
  const el=document.getElementById('rut-'+k);
  if(el){el.style.background='var(--green-soft)';el.style.color='var(--green)';
    el.innerHTML='<svg class="ic"><use href="#i-check"/></svg>';}
  pintaRutina();
  if(Object.values(rutina).every(Boolean))snack('Rutina de la mañana completa — buen día de finca');}
function unmarkRutina(k){if(!rutina[k])return;rutina[k]=false;
  const el=document.getElementById('rut-'+k);
  if(el){el.style.background='';el.style.color='';
    el.innerHTML='<svg class="ic"><use href="#'+rutinaIcono[k]+'"/></svg>';}
  pintaRutina();}
function goEntregas(){go('scr-ordeno');
  setTimeout(()=>document.getElementById('entregasSec').scrollIntoView({behavior:'smooth'}),150);}
/* botón + contextual */
function openSheet(){
  const ctx={'scr-vaca':'Registrar en Lucero (042)',
    'scr-sanitario':'Registrar enfermedad o tratamiento',
    'scr-ordeno':'Registrar en el ordeño'};
  const id=document.querySelector('.screen.active').id;
  document.querySelector('#sheet h3').textContent=ctx[id]||'Registrar';
  // subtítulo vivo de la acción de leche: progreso del ordeño de hoy
  const done=cows.filter(c=>c.done);
  document.getElementById('qhMilkSub').textContent = done.length
    ? done.length+' de '+cows.length+' vacas · Σ '+done.reduce((s,c)=>s+c.v,0)+' L'
    : 'Registro vaca por vaca · '+cows.length+' vacas';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('sheet').classList.add('show');}
function closeSheet(){document.getElementById('scrim').classList.remove('show');
  document.getElementById('sheet').classList.remove('show');}
function sheetPick(msg){closeSheet();snack(msg);}
let snackTimer;
function snack(msg,accionLabel,accionFn){const sb=document.getElementById('snackbar');
  document.getElementById('snackText').textContent=msg;
  const act=document.getElementById('snackAction');
  if(accionLabel){act.textContent=accionLabel;act.style.display='';
    act.onclick=()=>{act.style.display='none';sb.classList.remove('show');clearTimeout(snackTimer);accionFn&&accionFn();};}
  else{act.style.display='none';act.onclick=null;}
  sb.classList.add('show');
  clearTimeout(snackTimer);snackTimer=setTimeout(()=>sb.classList.remove('show'),accionLabel?5200:2600);}
/* registrar leche: tú eliges la vaca → litros → aceptar */
const cows=[
  {num:'042', n:'Lucero',  del:'DEL 152 · 3er parto', ayer:18},
  {num:'038', n:'Mona',    del:'DEL 98 · 2do parto',  ayer:16},
  {num:'051', n:'Careta',  del:'DEL 121 · 1er parto', ayer:14},
  {num:'027', n:'Estrella',del:'DEL 64 · pico de lactancia', ayer:13},
  {num:'033', n:'Paloma',  del:'DEL 95 · 4to parto',  ayer:6},
  {num:'029', n:'Pinta',   del:'DEL 412 · lactancia larga', ayer:5}
];
cows.forEach(c=>{c.done=false;c.v=null;});
let ci=-1,typing=false;
function renderCows(){
  const g=document.getElementById('cowGrid');g.innerHTML='';
  cows.forEach((c,i)=>{const d=document.createElement('div');
    d.className='cow-tile'+(c.done?' done':'')+(c.retiro?' retiro':'');
    const sub=c.done?'✓ '+c.v+' L':(c.retiro?'⛔ retiro '+c.retiro+'d':'ayer '+c.ayer+' L');
    d.innerHTML='<div class="ct-num">'+c.num+'</div><div class="ct-name">'+c.n+'</div>'+
      '<div class="ct-sub">'+sub+'</div>';
    d.onclick=()=>pickCow(i);g.appendChild(d);});
  const done=cows.filter(c=>c.done);
  document.getElementById('milkProg').textContent=
    done.length+' de '+cows.length+' · Σ '+done.reduce((s,c)=>s+c.v,0)+' L';
}
function pickCow(i){ci=i;const c=cows[i];typing=false;
  document.getElementById('cowName').textContent=c.num+' · '+c.n.toUpperCase();
  document.getElementById('cowDel').textContent=c.del;
  document.getElementById('milkNum').textContent=c.done?c.v:c.ayer;
  document.getElementById('cowRef').textContent=c.retiro
    ?'⛔ En retiro '+c.retiro+' días — registra su leche, pero no se vende'
    :(c.done
      ?'Ya registrada con '+c.v+' L — puedes corregirla'
      :'Ayer dio '+c.ayer+' L — acepta ✓ si dio igual');
  document.getElementById('scrim').classList.add('show');
  document.getElementById('milkSheet').classList.add('show');}
function closeMilk(){document.getElementById('milkSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function key(n){const el=document.getElementById('milkNum');
  if(!typing){el.textContent='';typing=true;}
  if(el.textContent.length<2)el.textContent+=n;}
function keyClear(){const el=document.getElementById('milkNum');
  el.textContent=el.textContent.slice(0,-1)||'0';typing=true;}
function saveMilk(){
  if(ci<0)return;
  const v=parseInt(document.getElementById('milkNum').textContent)||0;
  const c=cows[ci];const drop=!c.done&&LCRules.esBajonLeche(c.ayer,v);
  c.done=true;c.v=v;renderCows();closeMilk();encolar();
  if(drop)snack('Atención: '+c.n+' bajó '+(c.ayer-v)+' L vs ayer — ¿mastitis, celo, comida?');
  else snack(c.n+': '+v+' L guardados (en cola offline)');
  if(cows.every(x=>x.done)){markRutina('ordeno');
    const tot=cows.reduce((s,x)=>s+x.v,0);
    setTimeout(()=>snack('Ordeño completo: '+tot+' L — siguiente: entregas a los lecheros'),1500);
    setTimeout(()=>document.getElementById('entregasSec').scrollIntoView({behavior:'smooth'}),2600);}
}
renderCows();
/* Maíz: el bloque del inicio solo se muestra si la finca tiene datos del cultivo.
   Si no hay siembra/silo registrado (datosMaiz = null), no se ve nada de maíz. */
let datosMaiz = { siloDias:45, loteDias:38 };   // pon null para simular "sin datos de cultivo"
function aplicarMaiz(){
  const b=document.getElementById('bloque-maiz');
  if(b)b.style.display = datosMaiz ? '' : 'none';
}
aplicarMaiz();
function confirmMove(){
  const yaEstaba=rutina.hato;
  markRutina('hato');encolar();
  snack('Hato movido al P4 · descanso del P7 reiniciado','Deshacer',()=>{
    if(!yaEstaba)unmarkRutina('hato');
    desencolar();snack('Movimiento deshecho');
  });
}
function registrarEntrega(){markRutina('entregas');encolar();
  snack('Entrega registrada — el balance del día cuadra');}
/* sincronización offline: cuántos registros faltan por subir */
let pendientes=3;
function updateSync(){const c=document.getElementById('syncChip');if(!c)return;
  c.textContent=pendientes>0?(pendientes+' sin subir'):'al día ✓';
  c.classList.toggle('pending',pendientes>0);}
function encolar(n){pendientes+=(n||1);updateSync();}
function desencolar(n){pendientes=Math.max(0,pendientes-(n||1));updateSync();}
function sincronizar(){
  snack(pendientes>0
    ? pendientes+' registro(s) en cola — se suben solos cuando haya señal'
    : 'Todo está subido ✓');
}
updateSync();
/* ===== Partos ===== */
const partoInfo={
  '011 · Violeta':'Preñada 8,5 meses · esperado ~3 jul',
  '019 · Canela' :'Preñada 8 meses · esperado ~18 jul',
  '045 · Morena' :'Preñada 7,5 meses · esperado ~2 ago'
};
/* próximos partos (salen de las palpaciones) e historial reciente */
let proximosPartos=[
  {cow:'011 · Violeta',sub:'Preñada 8,5 meses · parto ~3 jul',short:'~3 jul',badge:'~3 sem',bw:'warn'},
  {cow:'019 · Canela', sub:'Preñada 8 meses · parto ~18 jul',short:'~18 jul',badge:'~5 sem',bw:''},
  {cow:'045 · Morena', sub:'Preñada 7,5 meses · parto ~2 ago',short:'~2 ago',badge:'ago',bw:''}
];
let partosRecientes=[
  {t:'042 · Lucero → cría 064',s:'12 ene · ♀ hembra · viva · 36 kg · parto normal',badge:'en Terneras',bw:'ok'},
  {t:'027 · Estrella → cría 069',s:'28 feb · ♀ hembra · viva · 34 kg · parto normal',badge:'en Terneras',bw:'ok'},
  {t:'033 · Paloma → cría',s:'20 abr · ♂ macho · nació muerto · 41 kg · parto asistido',badge:'mortinato',bw:'bad'}
];
let partos2026=7, porParir=9, criaNum=71, nTerneras=11, nMachos=2;
const parto={cow:'011 · Violeta',sexo:'H',tipo:'normal',estado:'viva',peso:38};
function renderPartos(){
  document.getElementById('kpiPartos2026').textContent=partos2026;
  document.getElementById('kpiPorParir').textContent=porParir;
  document.getElementById('kpiProximo').textContent=proximosPartos[0]?proximosPartos[0].short:'—';
  const lp=document.getElementById('listProximos');lp.innerHTML='';
  proximosPartos.forEach(p=>{const d=document.createElement('div');d.className='list-item';
    d.onclick=()=>openParto(p.cow);
    d.innerHTML='<div class="li-leading"><svg class="ic"><use href="#i-sprout"/></svg></div>'+
      '<div class="li-body"><div class="li-title">'+p.cow+'</div><div class="li-sub">'+p.sub+'</div></div>'+
      '<span class="badge '+p.bw+'">'+p.badge+'</span>';
    lp.appendChild(d);});
  const ver=document.createElement('div');ver.className='list-item';
  ver.onclick=()=>snack('Calendario completo de partos: jul · ago · sep · oct · nov · dic — de las palpaciones');
  ver.innerHTML='<div class="li-body" style="text-align:center"><div class="li-sub" style="font-weight:600;text-decoration:underline;text-underline-offset:3px">Ver los '+porParir+' próximos partos</div></div>';
  lp.appendChild(ver);
  const lr=document.getElementById('listRecientes');lr.innerHTML='';
  partosRecientes.forEach((p,i)=>{const row=document.createElement('div');
    row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:8px 0'+
      (i<partosRecientes.length-1?';border-bottom:1px solid var(--border)':'');
    row.innerHTML='<div><div class="li-title">'+p.t+'</div><div class="li-sub">'+p.s+'</div></div>'+
      '<span class="badge '+p.bw+'">'+p.badge+'</span>';
    lr.appendChild(row);});
  const hist=document.createElement('button');hist.className='btn text small mt8';
  hist.style.cssText='width:100%;justify-content:center';hist.textContent='Ver historial completo';
  hist.onclick=()=>snack('Historial completo de partos — cada cría con su fecha, sexo, peso y notas; incluye los mortinatos');
  lr.appendChild(hist);
}
function openParto(cow){
  if(cow)parto.cow=cow;
  parto.sexo='H';parto.tipo='normal';parto.estado='viva';parto.peso=38;
  document.getElementById('partoCow').textContent=parto.cow.toUpperCase();
  document.getElementById('partoDel').textContent=partoInfo[parto.cow]||'Confirma la fecha y los datos de la cría';
  document.getElementById('partoPesoVal').textContent=parto.peso;
  document.querySelectorAll('#partoSheet .chips').forEach(g=>
    g.querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('sel',i===0)));
  document.getElementById('scrim').classList.add('show');
  document.getElementById('partoSheet').classList.add('show');
}
function closeParto(){document.getElementById('partoSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function partoPick(btn,campo,val){parto[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function partoPeso(d){parto.peso=Math.max(20,Math.min(60,parto.peso+d));
  document.getElementById('partoPesoVal').textContent=parto.peso;}
function saveParto(){
  closeParto();
  const nombre=parto.cow.split('·')[1].trim();
  const sexoTxt=parto.sexo==='H'?'♀ hembra':'♂ macho';
  const tipoTxt=parto.tipo==='asistido'?'parto asistido':'parto normal';
  // snapshot para poder deshacer
  const idx=proximosPartos.findIndex(p=>p.cow===parto.cow);
  const removed=idx>=0?proximosPartos[idx]:null;
  const prevPorParir=porParir;
  if(idx>=0)proximosPartos.splice(idx,1);
  if(porParir>0)porParir--;
  partos2026++;
  // la madre sale de horras y vuelve al ordeño (DEL 0)
  const numMadre=parto.cow.split('·')[0].trim();
  const hIdx=grupos.horras.animales.findIndex(a=>a[0].split('·')[0].trim()===numMadre);
  const removedHorra=hIdx>=0?grupos.horras.animales[hIdx]:null;
  if(hIdx>=0){grupos.horras.animales.splice(hIdx,1);nHorras--;subHorras();}
  let deshacerCria=()=>{}, msg;
  if(parto.estado==='viva'){
    const num=String(++criaNum).padStart(3,'0');
    // la cría viva entra sola al Hato: hembra → Terneras, macho → Machos
    const grupo=parto.sexo==='H'?'terneras':'machos';
    const destino=parto.sexo==='H'?'Terneras':'Machos';
    const prevSub=grupos[grupo].sub, prevHeader=grupos[grupo].header;
    if(parto.sexo==='H'){nTerneras++;
      grupos.terneras.sub=nTerneras+' terneras · 2 destetes próximos';
      grupos.terneras.header='<b>'+nTerneras+' terneras.</b> Consumen ~40 L/día de la leche del ordeño.';
    }else{nMachos++;
      grupos.machos.sub=nMachos+' machos';
      grupos.machos.header='<b>'+nMachos+' machos.</b> Sansón cubre el hato; los terneros machos se levantan o se venden.';}
    grupos[grupo].animales.unshift([num+' · (cría de '+nombre+')','recién nacid'+(parto.sexo==='H'?'a':'o')+' · '+parto.peso+' kg · 0 meses',0]);
    partosRecientes.unshift({t:parto.cow+' → cría '+num,
      s:'13 jun · '+sexoTxt+' · viva · '+parto.peso+' kg · '+tipoTxt,badge:'en '+destino,bw:'ok'});
    deshacerCria=()=>{grupos[grupo].animales.shift();grupos[grupo].sub=prevSub;grupos[grupo].header=prevHeader;
      if(parto.sexo==='H')nTerneras--;else nMachos--;criaNum--;};
    msg='Parto de '+nombre+' · cría '+num+' ('+sexoTxt+', '+parto.peso+' kg) creada en '+destino+' y vinculada · '+nombre+' al ordeño en DEL 0';
  }else{
    // mortinato: no entra al hato, pero queda registrado
    partosRecientes.unshift({t:parto.cow+' → cría',
      s:'13 jun · '+sexoTxt+' · nació muerta · '+parto.peso+' kg · '+tipoTxt,badge:'mortinato',bw:'bad'});
    msg='Parto de '+nombre+' · la cría nació muerta — queda en el historial · '+nombre+' al ordeño en DEL 0';
  }
  encolar();
  renderPartos();
  setTimeout(()=>go('scr-partos'),300);
  snack(msg,'Deshacer',()=>{
    partosRecientes.shift();
    partos2026--; porParir=prevPorParir;
    if(removed)proximosPartos.splice(Math.min(idx,proximosPartos.length),0,removed);
    if(removedHorra){grupos.horras.animales.splice(Math.min(hIdx,grupos.horras.animales.length),0,removedHorra);nHorras++;subHorras();}
    deshacerCria(); desencolar();
    renderPartos();
    snack('Parto deshecho');
  });
}
renderPartos();
/* ===== Vacas vacías (se muestran en Reproducción) ===== */
const vacasVacias=[
  {cow:'033 · Paloma',del:95,diasVacia:132,ultimaPalp:'3 feb 2026',resultado:'vacía',
   sub:'DEL 95 · 4to parto · ayer 6 L',accion:'Producción muy baja para su etapa — evaluar descarte'},
  {cow:'029 · Pinta',del:412,diasVacia:150,ultimaPalp:'18 ene 2026',resultado:'vacía',
   sub:'DEL 412 · lactancia larga · ayer 5 L',accion:'Lactancia extendida sin preñez — evaluar descarte'}
];
function renderVacias(){
  const list=document.getElementById('listVacias');if(!list)return;list.innerHTML='';
  const kpi=document.getElementById('kpiVacias');
  if(kpi){kpi.textContent=vacasVacias.length;
    kpi.classList.toggle('down',vacasVacias.length>0);}
  const label=list.previousElementSibling;
  if(label)label.innerHTML='Vacas vacías · <span style="color:var(--red)">'+vacasVacias.length+' requieren decisión</span>';
  if(vacasVacias.length===0){
    list.innerHTML='<div class="card flat" style="text-align:center;color:var(--ink-2);font-size:13px;padding:16px">No hay vacas vacías — todas preñadas o servidas ✓</div>';
    return;}
  vacasVacias.forEach(v=>{
    const d=document.createElement('div');d.className='card';d.style.marginBottom='8px';
    d.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'+
      '<div><div class="li-title">'+v.cow+'</div>'+
      '<div class="li-sub">'+v.sub+'</div></div>'+
      '<span class="badge bad">vacía '+v.diasVacia+'d</span></div>'+
      '<div style="font-size:12px;color:var(--ink-2);margin-top:8px;line-height:1.5">'+
      'Última palpación: <b>'+v.ultimaPalp+'</b> → '+v.resultado+
      '<br>'+v.accion+'</div>'+
      '<div style="display:flex;gap:8px;margin-top:10px">'+
      '<button class="btn filled small" onclick="openPalp(\''+v.cow+'\')">Palpar de nuevo</button>'+
      '<button class="btn outl small" onclick="openBaja(\''+v.cow+'\')">Dar de baja</button>'+
      '<button class="btn text small" onclick="openSeca(\''+v.cow+'\')">Secar</button></div>';
    list.appendChild(d);
  });
}
renderVacias();   // init: tras declarar vacasVacias y renderVacias (evita TDZ)
/* ===== Palpación (la fuente de verdad de la reproducción) ===== */
const palpCandidatas={
  '027 · Estrella':'celo sin repetir — ¿preñada?',
  '051 · Careta':'parida hace 121 días, sin celo visto',
  '033 · Paloma':'vacía hace 132 días',
  '029 · Pinta':'vacía hace 150 días'
};
const palp={cow:'027 · Estrella',resultado:'prenada',meses:2};
/* reglas puras compartidas (core/rules.js) */
const MESC=LCRules.MESC;
const fechaParto=LCRules.fechaParto;
function palpMostrarMeses(){document.getElementById('palpMesesWrap').style.display=
  palp.resultado==='prenada'?'':'none';}
function palpMarcarVaca(){document.querySelectorAll('#palpCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().startsWith(palp.cow.split('·')[0].trim())));}
function openPalp(cow){
  if(cow)palp.cow=cow;
  palp.resultado='prenada';palp.meses=2;
  document.getElementById('palpCow').textContent=palp.cow.toUpperCase();
  document.getElementById('palpInfo').textContent=palpCandidatas[palp.cow]||'Confirma el resultado de la palpación';
  document.getElementById('palpMesesVal').textContent=palp.meses;
  palpMarcarVaca();
  const res=document.querySelectorAll('#palpSheet .chips')[1].querySelectorAll('.chip');
  res.forEach((c,i)=>c.classList.toggle('sel',i===0));
  palpMostrarMeses();
  document.getElementById('scrim').classList.add('show');
  document.getElementById('palpSheet').classList.add('show');
}
function closePalp(){document.getElementById('palpSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function palpCow(cow){palp.cow=cow;
  document.getElementById('palpCow').textContent=cow.toUpperCase();
  document.getElementById('palpInfo').textContent=palpCandidatas[cow]||'Confirma el resultado de la palpación';
  palpMarcarVaca();}
function palpRes(btn,val){palp.resultado=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));
  palpMostrarMeses();}
function palpMes(d){palp.meses=Math.max(1,Math.min(9,palp.meses+d));
  document.getElementById('palpMesesVal').textContent=palp.meses;}
function savePalp(){
  closePalp();
  const nombre=palp.cow.split('·')[1].trim();
  encolar();
  if(palp.resultado==='vacia'){
    renderVacias();
    setTimeout(()=>go('scr-repro'),300);
    snack(nombre+': vacía — queda en la lista para servicio');
    return;
  }
  const f=fechaParto(palp.meses);
  const nuevo={cow:palp.cow,sub:'Preñada '+palp.meses+' meses · parto '+f.corta,
    short:f.corta,badge:f.mes,bw:''};
  const i=proximosPartos.findIndex(p=>p.cow===palp.cow);
  const prev=i>=0?proximosPartos[i]:null;
  if(i>=0)proximosPartos[i]=nuevo; else{proximosPartos.push(nuevo);porParir++;}
  const vi=vacasVacias.findIndex(v=>v.cow===palp.cow);
  const removedVacia=vi>=0?vacasVacias.splice(vi,1)[0]:null;
  renderPartos();renderVacias();
  setTimeout(()=>go('scr-partos'),300);
  snack(nombre+': preñada '+palp.meses+' meses — parto estimado '+f.corta+' · entra a los próximos partos','Deshacer',()=>{
    const j=proximosPartos.findIndex(p=>p.cow===palp.cow);
    if(j>=0)proximosPartos.splice(j,1);
    if(prev)proximosPartos.push(prev); else porParir--;
    if(removedVacia)vacasVacias.splice(Math.min(vi,vacasVacias.length),0,removedVacia);
    desencolar();renderPartos();renderVacias();snack('Palpación deshecha');
  });
}
/* ===== Enfermedad / tratamiento (activa el retiro de leche) ===== */
const fechaDias=LCRules.fechaDias;
const trata={cow:'033 · Paloma',problema:'Mastitis',medicina:'Antibiótico',retiro:4};
function trataMarcarVaca(){document.querySelectorAll('#trataCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().startsWith(trata.cow.split('·')[0].trim())));}
function openTrata(cow){
  if(cow)trata.cow=cow;
  trata.problema='Mastitis';trata.medicina='Antibiótico';trata.retiro=4;
  document.getElementById('trataCow').textContent=trata.cow.toUpperCase();
  const cd=cows.find(c=>trata.cow.startsWith(c.num));
  document.getElementById('trataInfo').textContent=cd?cd.del:'Selecciona el problema y el tratamiento';
  document.getElementById('trataRetiroVal').textContent=trata.retiro;
  trataMarcarVaca();
  // problema y tratamiento vuelven a la primera opción
  const groups=document.querySelectorAll('#trataSheet .chips');
  [1,2].forEach(gi=>groups[gi].querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('sel',i===0)));
  document.getElementById('scrim').classList.add('show');
  document.getElementById('trataSheet').classList.add('show');
}
function closeTrata(){document.getElementById('trataSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function trataCow(cow){trata.cow=cow;
  document.getElementById('trataCow').textContent=cow.toUpperCase();
  const cd=cows.find(c=>cow.startsWith(c.num));
  document.getElementById('trataInfo').textContent=cd?cd.del:'Selecciona el problema y el tratamiento';
  trataMarcarVaca();}
function trataPick(btn,campo,val){trata[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function trataRetiro(d){trata.retiro=Math.max(0,Math.min(10,trata.retiro+d));
  document.getElementById('trataRetiroVal').textContent=trata.retiro;}
function saveTrata(){
  closeTrata();
  const cd=cows.find(c=>trata.cow.startsWith(c.num));
  const nombre=trata.cow.split('·')[1].trim();
  const prev=cd?cd.retiro:undefined;
  if(cd)cd.retiro=trata.retiro||undefined;
  renderCows();encolar();
  setTimeout(()=>go('scr-ordeno'),300);
  const base='Tratamiento de '+trata.problema.toLowerCase()+' en '+nombre+' ('+trata.medicina.toLowerCase()+')';
  const msg=trata.retiro>0
    ? base+' · retiro de leche '+trata.retiro+'d (hasta '+fechaDias(trata.retiro)+') — no vender su leche'
    : base+' · sin retiro de leche';
  snack(msg,'Deshacer',()=>{
    if(cd)cd.retiro=prev;renderCows();desencolar();snack('Tratamiento deshecho');
  });
}
/* ===== Secado (sale del ordeño → pasa a horras) ===== */
const secaInfo={
  '042 · Lucero':'Preñada 6 meses · parto ~12 sep',
  '038 · Mona':'Servida, por confirmar — palpa antes de secar',
  '051 · Careta':'DEL 121 · confirma preñez antes de secar',
  '027 · Estrella':'DEL 64 · muy temprano para secar',
  '033 · Paloma':'Vacía — el secado no aplica',
  '029 · Pinta':'Vacía — el secado no aplica'
};
const secaNoAplica={'033 · Paloma':1,'029 · Pinta':1};
const seca={cow:'042 · Lucero'};
let nHorras=9;
function secaMarcar(){document.querySelectorAll('#secaCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().startsWith(seca.cow.split('·')[0].trim())));}
function openSeca(cow){
  if(cow)seca.cow=cow;
  document.getElementById('secaCow').textContent=seca.cow.toUpperCase();
  document.getElementById('secaInfo').textContent=secaInfo[seca.cow]||'Confirma la preñez antes de secar';
  secaMarcar();
  document.getElementById('scrim').classList.add('show');
  document.getElementById('secaSheet').classList.add('show');
}
function closeSeca(){document.getElementById('secaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function secaCow(cow){seca.cow=cow;
  document.getElementById('secaCow').textContent=cow.toUpperCase();
  document.getElementById('secaInfo').textContent=secaInfo[cow]||'Confirma la preñez antes de secar';
  secaMarcar();}
function saveSeca(){
  const nombre=seca.cow.split('·')[1].trim();
  if(secaNoAplica[seca.cow]){closeSeca();
    snack(nombre+' está vacía — el secado es para vacas preñadas. Confírmalo con palpación.');return;}
  closeSeca();
  const idx=cows.findIndex(c=>seca.cow.startsWith(c.num));
  const removed=idx>=0?cows[idx]:null;
  if(idx>=0)cows.splice(idx,1);
  renderCows();
  const prevSub=grupos.horras.sub, prevHeader=grupos.horras.header;
  nHorras++;
  grupos.horras.sub=nHorras+' vacas · 6 paren antes de octubre';
  grupos.horras.header='<b>'+nHorras+' vacas horras.</b> Ordenadas por fecha de parto; tras parir vuelven al ordeño.';
  grupos.horras.animales.unshift([seca.cow,'recién secada — '+(secaInfo[seca.cow]||'preñada')]);
  encolar();
  setTimeout(()=>openGroup('horras'),300);
  snack(nombre+' secada · sale del ordeño y pasa a horras · '+(secaInfo[seca.cow]||'se planea su parto'),'Deshacer',()=>{
    if(removed)cows.splice(Math.min(idx,cows.length),0,removed);
    renderCows();
    nHorras--; grupos.horras.sub=prevSub; grupos.horras.header=prevHeader; grupos.horras.animales.shift();
    desencolar(); openGroup('horras'); snack('Secado deshecho');
  });
}
/* ===== Alta y Baja (inventario del hato) ===== */
let nOrdeno=26, nNovillas=14, nBajas=7;   // nHorras, nTerneras, nMachos ya existen
function subOrdeno(){grupos.ordeno.sub=nOrdeno+' vacas · ayer 11,4 L/vaca · DEL prom. 164';
  grupos.ordeno.header='<b>'+nOrdeno+' vacas en ordeño.</b> Ordenadas como entran al ordeño.';}
function subNovillas(){grupos.novillas.sub=nNovillas+' novillas · 4 listas para servicio';
  grupos.novillas.header='<b>'+nNovillas+' novillas de vientre.</b> 4 ya tienen peso para servicio (>330 kg).';}
function subTerneras(){grupos.terneras.sub=nTerneras+' terneras · 2 destetes próximos';
  grupos.terneras.header='<b>'+nTerneras+' terneras.</b> Consumen ~40 L/día de la leche del ordeño.';}
function subMachos(){grupos.machos.sub=nMachos+' machos';
  grupos.machos.header='<b>'+nMachos+' machos.</b> Sansón cubre el hato; los terneros machos se levantan o se venden.';}
function subHorras(){grupos.horras.sub=nHorras+' vacas · 6 paren antes de octubre';
  grupos.horras.header='<b>'+nHorras+' vacas horras.</b> Ordenadas por fecha de parto; tras parir vuelven al ordeño.';}
function subBajas(){grupos.bajas.sub=nBajas+' animales fuera del hato · 2026';
  grupos.bajas.header='<b>'+nBajas+' bajas en 2026.</b> Vendidas, muertas o perdidas — su historia se conserva.';}
function incGrupo(g,d){
  if(g==='ordeno'){nOrdeno+=d;subOrdeno();}
  else if(g==='novillas'){nNovillas+=d;subNovillas();}
  else if(g==='terneras'){nTerneras+=d;subTerneras();}
  else if(g==='machos'){nMachos+=d;subMachos();}
  else if(g==='horras'){nHorras+=d;subHorras();}
  else if(g==='bajas'){nBajas+=d;subBajas();}
}
/* --- Vaca nueva: ¿comprada o nacida? --- */
function openNuevaVaca(){document.getElementById('scrim').classList.add('show');
  document.getElementById('nuevaSheet').classList.add('show');}
function closeNueva(){document.getElementById('nuevaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
/* --- Alta (compra) --- */
const altaGrupo={'Vaca en ordeño':'ordeno','Novilla':'novillas','Ternera':'terneras','Toro':'machos'};
const alta={tipo:'Novilla',raza:'Holstein × Gyr',edad:2,procedencia:'',valor:''};
let altaSeq=79, toroSeq=2;
function openAlta(){alta.tipo='Novilla';alta.raza='Holstein × Gyr';alta.edad=2;alta.procedencia='';alta.valor='';
  const grupos2=document.querySelectorAll('#altaSheet .chips');
  grupos2[0].querySelectorAll('.chip').forEach(c=>c.classList.toggle('sel',c.textContent.trim()==='Novilla'));
  grupos2[1].querySelectorAll('.chip').forEach(c=>c.classList.toggle('sel',c.textContent.trim()==='Holstein × Gyr'));
  document.getElementById('altaEdadVal').textContent=alta.edad;
  const p=document.getElementById('altaProc');if(p)p.value='';
  const v=document.getElementById('altaValor');if(v)v.value='';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('altaSheet').classList.add('show');}
function closeAlta(){document.getElementById('altaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function altaPick(btn,campo,val){alta[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function altaEdad(d){alta.edad=Math.max(0,Math.min(15,alta.edad+d));
  document.getElementById('altaEdadVal').textContent=alta.edad;}
function saveAlta(){
  closeAlta();
  const g=altaGrupo[alta.tipo];
  const num=g==='machos'?'T0'+(++toroSeq):String(++altaSeq).padStart(3,'0');
  grupos[g].animales.unshift([num+' · (compra)',alta.raza+' · '+alta.edad+' años · '+alta.tipo.toLowerCase()+' comprada',0]);
  incGrupo(g,1);encolar();
  setTimeout(()=>openGroup(g),300);
  const extra=(alta.procedencia?' · '+alta.procedencia:'')+(alta.valor?' · $'+alta.valor:'');
  snack('Compra: '+num+' ('+alta.tipo.toLowerCase()+', '+alta.raza+')'+extra+' — entró al hato','Deshacer',()=>{
    grupos[g].animales.shift();incGrupo(g,-1);
    if(g==='machos')toroSeq--;else altaSeq--;
    desencolar();openGroup(g);snack('Alta deshecha');
  });
}
/* --- Baja (venta / muerte / descarte / pérdida) --- */
const baja={cow:'033 · Paloma',motivo:'Venta'};
function bajaMarcar(){document.querySelectorAll('#bajaCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().startsWith(baja.cow.split('·')[0].trim())));}
function openBaja(cow){
  if(cow)baja.cow=cow;baja.motivo='Venta';
  document.getElementById('bajaCow').textContent=baja.cow.toUpperCase();
  const cd=cows.find(c=>baja.cow.startsWith(c.num));
  document.getElementById('bajaInfo').textContent=cd?cd.del:'Elige el animal y el motivo';
  bajaMarcar();
  document.querySelectorAll('#bajaSheet .chips')[1].querySelectorAll('.chip')
    .forEach((c,i)=>c.classList.toggle('sel',i===0));
  document.getElementById('scrim').classList.add('show');
  document.getElementById('bajaSheet').classList.add('show');}
function closeBaja(){document.getElementById('bajaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function bajaCow(cow){baja.cow=cow;
  document.getElementById('bajaCow').textContent=cow.toUpperCase();
  const cd=cows.find(c=>cow.startsWith(c.num));
  document.getElementById('bajaInfo').textContent=cd?cd.del:'Elige el animal y el motivo';
  bajaMarcar();}
function bajaPick(btn,campo,val){baja[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function saveBaja(){
  closeBaja();
  const nombre=baja.cow.split('·')[1].trim();
  const idx=cows.findIndex(c=>baja.cow.startsWith(c.num));
  const removed=idx>=0?cows[idx]:null;
  if(idx>=0){cows.splice(idx,1);renderCows();incGrupo('ordeno',-1);}
  nBajas++;subBajas();
  grupos.bajas.animales.unshift([baja.cow,baja.motivo.toUpperCase()+' · 13 jun · registrada']);
  encolar();
  setTimeout(()=>openGroup('bajas'),300);
  snack(nombre+': baja por '+baja.motivo.toLowerCase()+' — sale del hato, su historia se conserva','Deshacer',()=>{
    if(removed){cows.splice(Math.min(idx,cows.length),0,removed);renderCows();incGrupo('ordeno',1);}
    nBajas--;subBajas();grupos.bajas.animales.shift();
    desencolar();openGroup('bajas');snack('Baja deshecha');
  });
}
/* la app arranca en el selector de línea de negocio */
go('scr-selector');

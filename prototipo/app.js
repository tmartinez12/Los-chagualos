const titles={
  'scr-inicio':['Los Chagualos','Jue 12 jun · Lluvia ayer: 12 mm'],
  'scr-ordeno':['Leche','Hoy vs tu promedio de 7 días'],
  'scr-potreros':['Potreros','12 potreros · ocupación 1 día (máx 2)'],
  'scr-hato':['Mi hato','80 animales · 26 en ordeño'],
  'scr-vaca':['Ficha del animal','Se consulta mucho, se edita poco'],
  'scr-decisiones':['Decisiones del mes','Junio 2026 · 4 recomendaciones'],
  'scr-sanitario':['Plan sanitario','Se programa solo · genera las tareas'],
  'scr-repro':['Reproducción','Monta natural · la palpación manda'],
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
      ['T02 · Torete','11 meses · venta programada ago']]}
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
let histStack=['scr-inicio'];
function go(id,navBtn){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.scr===id));
  const t=titles[id];
  document.getElementById('barTitle').textContent=t[0];
  document.getElementById('barSub').textContent=t[1];
  document.getElementById('backBtn').style.display=(id==='scr-inicio')?'none':'flex';
  if(histStack[histStack.length-1]!==id)histStack.push(id);
  document.getElementById(id).scrollTop=0;
}
function goBack(){histStack.pop();go(histStack.pop()||'scr-inicio');}
function openCow(){go('scr-vaca');}
/* rutina de la mañana */
const rutina={ordeno:false,entregas:false,hato:false};
function markRutina(k){if(rutina[k])return;rutina[k]=true;
  const el=document.getElementById('rut-'+k);
  if(el){el.style.background='var(--green-soft)';el.style.color='var(--green)';
    el.innerHTML='<svg class="ic"><use href="#i-check"/></svg>';}
  const n=Object.values(rutina).filter(Boolean).length;
  document.getElementById('rutinaProg').textContent=n+' de 3'+(n===3?' · día completo':'');
  if(n===3)snack('Rutina de la mañana completa — buen día de finca');}
function goEntregas(){go('scr-ordeno');
  setTimeout(()=>document.getElementById('entregasSec').scrollIntoView({behavior:'smooth'}),150);}
/* botón + contextual */
function openSheet(){
  const ctx={'scr-vaca':'Registrar evento en Lucero (042)',
    'scr-repro':'Registrar celo o monta vista',
    'scr-ordeno':'Novedad en el ordeño'};
  const id=document.querySelector('.screen.active').id;
  document.querySelector('#sheet h3').textContent=ctx[id]||'Registrar novedad';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('sheet').classList.add('show');}
function closeSheet(){document.getElementById('scrim').classList.remove('show');
  document.getElementById('sheet').classList.remove('show');}
function sheetPick(msg){closeSheet();snack(msg);}
let snackTimer;
function snack(msg){const sb=document.getElementById('snackbar');
  document.getElementById('snackText').textContent=msg;sb.classList.add('show');
  clearTimeout(snackTimer);snackTimer=setTimeout(()=>sb.classList.remove('show'),2600);}
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
    d.className='cow-tile'+(c.done?' done':'');
    d.innerHTML='<div class="ct-num">'+c.num+'</div><div class="ct-name">'+c.n+'</div>'+
      '<div class="ct-sub">'+(c.done?'✓ '+c.v+' L':'ayer '+c.ayer+' L')+'</div>';
    d.onclick=()=>pickCow(i);g.appendChild(d);});
  const done=cows.filter(c=>c.done);
  document.getElementById('milkProg').textContent=
    done.length+' de '+cows.length+' · Σ '+done.reduce((s,c)=>s+c.v,0)+' L';
}
function pickCow(i){ci=i;const c=cows[i];typing=false;
  document.getElementById('cowName').textContent=c.num+' · '+c.n.toUpperCase();
  document.getElementById('cowDel').textContent=c.del;
  document.getElementById('milkNum').textContent=c.done?c.v:c.ayer;
  document.getElementById('cowRef').textContent=c.done
    ?'Ya registrada con '+c.v+' L — puedes corregirla'
    :'Ayer dio '+c.ayer+' L — acepta ✓ si dio igual';
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
  const c=cows[ci];const drop=!c.done&&c.ayer>0&&v<=c.ayer*0.75;
  c.done=true;c.v=v;renderCows();closeMilk();
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
  markRutina('hato');
  snack('Hato movido al Potrero 4 · descanso del P7 reiniciado');
  setTimeout(()=>go('scr-inicio'),1400);
}

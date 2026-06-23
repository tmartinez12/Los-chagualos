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
      d.onclick=a[2]?(()=>openCow(numDe(a[0]))):()=>snack('Ficha de '+a[0]+' — misma estructura que la de Lucero');}
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
function openCow(num){if(num)renderFicha(num);go('scr-vaca');}
/* Ficha por-animal: rellena scr-vaca con datos reales de la base (cache). */
const GRUPO_DISPLAY_M={'ordeño':'En ordeño','horra':'Horra','novilla':'Novilla','levante':'Levante','ternera':'Ternera','macho':'Macho','baja':'Baja'};
function origenM(a){return a.origen==='comprado'?'Comprada':a.origen==='nacido_finca'?'Nació en finca':'';}
function deriveReproFichaM(a){
  const retiroD=a.retiroLecheHasta?diasHastaM(a.retiroLecheHasta):null;
  if(retiroD!=null&&retiroD>=0)return {cls:'bad',title:'Retiro de leche · '+retiroD+(retiroD===1?' día':' días')+' más',sub:'No vender su leche hasta terminar el retiro'};
  if(a.estadoRepro==='prenada'&&a.prenez){const m=a.prenez.meses;let sub='';
    if(a.prenez.partoEstimado)sub='Parto probable ~'+fmtFechaCortaM(a.prenez.partoEstimado);
    if(a.secarEstimado)sub+=(sub?' · ':'')+'Secar ~'+fmtFechaCortaM(a.secarEstimado);
    return {cls:'warn',title:'Preñada · '+m+' meses',sub:sub||'Gestación en curso',secar:true};}
  if(a.estadoRepro==='servida')return {cls:'',title:'Servida · por palpar',sub:'Confirmar preñez en la próxima palpación'};
  if(a.estadoRepro==='vacia')return {cls:'bad',title:'Vacía'+(a.diasVacia?' '+a.diasVacia+' días':''),sub:a.diasVacia>120?'Evaluar descarte o tratamiento reproductivo':'Esperar para servicio'};
  if(a.grupo==='novilla')return {cls:'',title:a.listaServicio?'Novilla lista para servicio':'Novilla en desarrollo',sub:a.pesoKg?a.pesoKg+' kg':''};
  if(a.grupo==='macho'&&a.rolToro)return {cls:'',title:'Toro reproductor activo',sub:a.hijasVivas?a.hijasVivas+' hijas vivas':''};
  return {cls:'',title:GRUPO_DISPLAY_M[a.grupo]||a.grupo,sub:''};
}
function renderFicha(num){
  const a=animalesPorIdM[num];
  if(!a){snack('Ficha de '+num+' — sincroniza primero');return false;}
  document.getElementById('vmNombre').textContent=a.id+' · '+a.nombre;
  document.getElementById('vmSub').textContent=[a.raza,edadTextoM(a),GRUPO_DISPLAY_M[a.grupo],origenM(a)].filter(Boolean).join(' · ');
  /* alerta reproductiva/sanitaria */
  const r=deriveReproFichaM(a);const al=document.getElementById('vmAlerta');
  al.className='alert '+(r.cls==='bad'?'urgent':r.cls==='warn'?'warn':'info');
  al.innerHTML='<div class="a-icon"><svg class="ic"><use href="#i-cal"/></svg></div>'+
    '<div class="a-body"><div class="a-title">'+r.title+'</div>'+(r.sub?'<div class="a-sub">'+r.sub+'</div>':'')+
    (r.secar?'<button class="btn outl small mt8" onclick="openSeca(\''+a.id+' · '+a.nombre+'\')">Programar secado</button>':'')+'</div>';
  /* stats */
  const ayer=(a.leche&&a.leche.ayer!=null)?a.leche.ayer:0;
  document.getElementById('vmStats').innerHTML=
    '<div class="stat"><div class="s-label">Producción ayer</div><div class="s-value">'+ayer+' L</div></div>'+
    '<div class="stat"><div class="s-label">DEL</div><div class="s-value">'+(a.del==null?'—':a.del+' días')+'</div></div>'+
    '<div class="stat"><div class="s-label">Peso</div><div class="s-value">'+(a.pesoKg?a.pesoKg+' kg':'—')+'</div></div>'+
    '<div class="stat"><div class="s-label">Partos</div><div class="s-value">'+(a.partos||0)+'</div></div>';
  /* genealogía */
  const madre=a.madreId?(animalesPorIdM[a.madreId]?a.madreId+' '+animalesPorIdM[a.madreId].nombre:a.madreId):'—';
  const padre=a.padreId?(a.padreId==='T01'?'Sansón':(animalesPorIdM[a.padreId]?a.padreId+' '+animalesPorIdM[a.padreId].nombre:a.padreId)):'—';
  const crias=Object.values(animalesPorIdM).filter(x=>x.madreId===a.id).map(x=>x.id+' '+x.nombre);
  document.getElementById('vmGenea').innerHTML='<b style="color:var(--ink)">Madre:</b> '+madre+
    ' &nbsp;·&nbsp; <b style="color:var(--ink)">Padre:</b> '+padre+
    '<br><b style="color:var(--ink)">Crías:</b> '+(crias.length?crias.join(', '):'sin crías registradas');
  /* curva */
  renderFichaCurva(a.del||0,ayer);
  document.getElementById('vmCurvaSub').textContent='Pico típico ~DEL 55 · hoy va en DEL '+(a.del==null?'—':a.del);
  /* sanidad */
  const retiroD=a.retiroLecheHasta?diasHastaM(a.retiroLecheHasta):null;const sanOk=!(retiroD!=null&&retiroD>=0);
  document.getElementById('vmSanidad').innerHTML='<svg class="ic-s ic" style="color:var('+(sanOk?'--green':'--red')+')"><use href="#i-shield"/></svg>'+
    '<div style="font-size:12.5px;color:var(--ink-2)"><b style="color:var(--ink)">'+(sanOk?'Sanidad al día':'Retiro de leche activo')+'</b> — '+
    (sanOk?'sin tratamientos ni retiros activos':'no vender su leche hasta '+fmtFechaCortaM(a.retiroLecheHasta))+'</div>';
  /* historia básica */
  const ev=[];
  if(a.prenez&&a.prenez.ultimaPalpacion)ev.push(['Palpación: <b>preñada '+a.prenez.meses+' meses</b>',a.prenez.ultimaPalpacion]);
  if(!sanOk)ev.push(['Tratamiento con retiro de leche',null]);
  if(a.partos)ev.push([a.partos+(a.partos===1?'er':'°')+' parto registrado',null]);
  const hist=document.getElementById('vmHistoria');
  hist.innerHTML=ev.length?ev.map((e,i)=>'<div class="tl-item"'+(i===ev.length-1?' style="padding-bottom:0"':'')+'>'+
    '<div class="tl-date">'+(e[1]?fmtFechaCortaM(e[1]).toUpperCase()+' 2026':'—')+'</div>'+
    '<div class="tl-text">'+e[0]+'</div></div>').join(''):'<div class="tl-item" style="padding-bottom:0"><div class="tl-text" style="color:var(--ink-2)">Sin eventos registrados todavía</div></div>';
  return true;
}
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
/* ===== Helpers compartidos para derivar desde Supabase ===== */
const HOY_LC=new Date(2026,5,13);
function diasHastaM(iso){if(!iso)return null;const d=new Date(iso+'T00:00:00');return Math.round((d-HOY_LC)/86400000);}
function ordinalPartoM(n){const m={1:'1er',2:'2do',3:'3er',4:'4to',5:'5to',6:'6to',7:'7mo',8:'8vo',9:'9no'};return (m[n]||n+'to')+' parto';}
function isoDeM(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+dd;}
function isoHoyM(){return isoDeM(HOY_LC);}
function isoMasDiasM(n){const d=new Date(HOY_LC.getTime());d.setDate(d.getDate()+(n||0));return isoDeM(d);}
function isoPartoM(meses){const d=new Date(HOY_LC.getTime());d.setMonth(d.getMonth()+Math.max(0,Math.round(9-meses)));return isoDeM(d);}
function numDe(cow){return (''+cow).split('·')[0].trim();}
function fmtFechaCortaM(iso){if(!iso)return '—';const d=new Date(iso+'T00:00:00');return d.getDate()+' '+MESC[d.getMonth()];}
function edadTextoM(a){const n=a.edadAnios;if(n==null)return '';
  const enMeses=a.grupo==='levante'||a.grupo==='ternera'||(a.grupo==='macho'&&n<1.5)||n<1;
  return enMeses?Math.round(n*12)+' meses':((n%1===0?String(n):n.toFixed(1).replace('.',','))+' años');}
function subAnimalM(a){
  switch(a.grupo){
    case 'ordeño':return 'DEL '+(a.del==null?'—':a.del)+' · ayer '+((a.leche&&a.leche.ayer!=null)?a.leche.ayer:0)+' L';
    case 'horra':return a.prenez?('preñada '+a.prenez.meses+' meses'+(a.prenez.partoEstimado?' · parto ~'+fmtFechaCortaM(a.prenez.partoEstimado):'')):'horra';
    case 'novilla':return edadTextoM(a)+(a.pesoKg?' · '+a.pesoKg+' kg':'')+(a.listaServicio?' · lista para servicio':'');
    case 'levante':return edadTextoM(a)+(a.pesoKg?' · '+a.pesoKg+' kg':'')+(a.gananciaDiaG?' · '+a.gananciaDiaG+' g/día':'');
    case 'ternera':return edadTextoM(a)+(a.desteteProximo?' · destete próximo':'');
    case 'macho':return a.rolToro?('Toro · '+edadTextoM(a)+(a.sanidadAlDia?' · sanidad al día':'')):(edadTextoM(a)+(a.ventaProgramada?' · venta programada':''));
    case 'baja':return a.baja?((a.baja.motivo||'').toUpperCase()+(a.baja.fecha?' · '+fmtFechaCortaM(a.baja.fecha):'')+(a.baja.nota?' · '+a.baja.nota:'')):'baja';
  }
  return '';
}
const GRUPO_KEY={'ordeño':'ordeno','horra':'horras','novilla':'novillas','levante':'levante','ternera':'terneras','macho':'machos','baja':'bajas'};
const GRUPO_LABEL={ordeno:'vacas en ordeño',horras:'vacas horras',novillas:'novillas',levante:'hembras de levante',terneras:'terneras',machos:'machos',bajas:'bajas en 2026'};
/* cache de todos los animales (genealogía/raza + sincronizar contador de IDs) */
let animalesPorIdM={};
(async function cacheAnimalesMovil(){
  if(typeof LCStore==='undefined')return;
  try{
    const all=await LCStore.getAnimales();if(!all||!all.length)return;
    all.forEach(a=>animalesPorIdM[a.id]=a);
    const maxNum=Math.max(0,...all.map(a=>parseInt(a.id,10)).filter(n=>!isNaN(n)));
    if(typeof criaNum!=='undefined'&&maxNum>criaNum)criaNum=maxNum;
    if(typeof altaSeq!=='undefined'&&maxNum>altaSeq)altaSeq=maxNum;
    /* reconstruir los grupos del hato desde la base */
    Object.keys(grupos).forEach(k=>{grupos[k].animales=[];});
    all.forEach(a=>{const k=GRUPO_KEY[a.grupo];if(!k||!grupos[k])return;
      grupos[k].animales.push([a.id+' · '+a.nombre,subAnimalM(a),1]);});
    Object.keys(grupos).forEach(k=>{const n=grupos[k].animales.length;
      grupos[k].sub=n+' '+GRUPO_LABEL[k];
      grupos[k].header='<b>'+n+' '+GRUPO_LABEL[k]+'.</b>';});
  }catch(e){console.warn('Cache/hato móvil:',e.message||e);}
})();
/* animal canónico (BD) → tarjeta de ordeño de la móvil */
function animalACow(a){
  const ctx=a.del>300?'lactancia larga':(a.del>=40&&a.del<=80?'pico de lactancia':(a.partos?ordinalPartoM(a.partos):''));
  const retiroD=a.retiroLecheHasta?diasHastaM(a.retiroLecheHasta):null;
  const c={num:a.id,n:a.nombre,del:'DEL '+(a.del==null?'—':a.del)+(ctx?' · '+ctx:''),
    ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer:0),done:false,v:null};
  if(retiroD!=null&&retiroD>=0)c.retiro=retiroD;
  return c;
}
(async function cargarCowsDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const animales=await LCStore.getAnimales('ordeño');
    if(!animales||!animales.length)return;
    cows.length=0;animales.forEach(a=>cows.push(animalACow(a)));
    try{const hoy=await LCStore.getOrdenosFecha();
      cows.forEach(c=>{if(hoy[c.num]!=null){c.done=true;c.v=hoy[c.num];}});
    }catch(_){/* sin ordeños hoy */}
    renderCows();
  }catch(e){console.warn('Ordeño móvil: usando datos locales:',e.message||e);}
})();
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
  if(typeof LCStore!=='undefined'){
    LCStore.registrarOrdeno(c.num,v).then(()=>desencolar()).catch(e=>{
      console.warn('Ordeño no guardado en la base:',e.message||e);});
  }
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
  snack('Entrega registrada — el balance del día cuadra');
  if(typeof LCStore!=='undefined'){
    Promise.all([LCStore.getLecheros(),LCStore.getTarifa().catch(()=>null)]).then(([ls,tar])=>{
      const precio=tar?tar.precio_litro:1950;
      return Promise.all((ls||[]).map(l=>LCStore.registrarEntrega(l.id,l.base_litros||0,precio)));
    }).then(()=>desencolar()).catch(e=>console.warn('Entrega móvil no guardada:',e.message||e));
  }}
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
  let deshacerCria=()=>{}, msg, criaIdNueva=null;
  if(parto.estado==='viva'){
    const num=String(++criaNum).padStart(3,'0');criaIdNueva=num;
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
  if(typeof LCStore!=='undefined'){
    const madreRaza=(animalesPorIdM[numMadre]||{}).raza||null;
    Promise.resolve()
      .then(()=>{ if(criaIdNueva)return LCStore.insertAnimal({id:criaIdNueva,nombre:'Cría de '+nombre,
        raza:madreRaza,grupo:parto.sexo==='H'?'ternera':'macho',sexo:parto.sexo,
        edadAnios:0,origen:'nacido_finca',madreId:numMadre,pesoKg:parto.peso}); })
      .then(()=>LCStore.registrarParto({madreId:numMadre,criaId:criaIdNueva,fecha:isoHoyM(),
        sexo:parto.sexo,pesoKg:parto.peso,tipo:parto.tipo,estadoCria:parto.estado}))
      .then(()=>LCStore.updateAnimalCampos(numMadre,{grupo:'ordeño',del:0,estado_repro:null,
        prenez_meses:null,parto_estimado:null,ultima_palpacion:null,dias_vacia:null,leche_ayer:0}))
      .then(()=>desencolar())
      .catch(e=>console.warn('Parto móvil no guardado:',e.message||e));
  }
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
/* ===== Cableado a Supabase: reproducción (móvil) ===== */
(async function cargarReproMovil(){
  if(typeof LCStore==='undefined')return;
  try{
    const [animales,partosDB]=await Promise.all([LCStore.getAnimales(),LCStore.getPartos()]);
    if(!animales||!animales.length)return;
    const porId={};animales.forEach(a=>porId[a.id]=a);
    const refP=id=>porId[id]?(id+' · '+porId[id].nombre):id;
    /* próximos partos */
    proximosPartos=animales.filter(a=>a.estadoRepro==='prenada'&&a.prenez&&a.prenez.partoEstimado)
      .sort((x,y)=>x.prenez.partoEstimado<y.prenez.partoEstimado?-1:1)
      .map(a=>{const m=a.prenez.meses;const f=fmtFechaCortaM(a.prenez.partoEstimado);
        return {cow:refP(a.id),sub:'Preñada '+String(m).replace('.',',')+' meses · parto ~'+f,
          short:'~'+f,badge:MESC[new Date(a.prenez.partoEstimado+'T00:00:00').getMonth()],bw:m>=8?'warn':''};});
    porParir=proximosPartos.length;
    /* partos recientes */
    if(partosDB&&partosDB.length){
      partosRecientes=partosDB.map(p=>{
        const viva=p.estado_cria==='viva';const sx=p.sexo_cria==='H'?'♀ hembra':'♂ macho';
        return {t:refP(p.madre_id)+' → cría'+(p.cria_id?' '+p.cria_id:''),
          s:fmtFechaCortaM(p.fecha)+' · '+sx+' · '+(viva?'viva':'nació muerto')+' · '+(p.peso_kg||0)+' kg · parto '+p.tipo,
          badge:viva?('en '+(p.sexo_cria==='H'?'Terneras':'Machos')):'mortinato',bw:viva?'ok':'bad'};});
      partos2026=partosRecientes.length;
    }
    /* vacías que requieren decisión */
    vacasVacias.length=0;
    animales.filter(a=>a.estadoRepro==='vacia'&&a.diasVacia&&a.diasVacia>=120).forEach(a=>{
      vacasVacias.push({cow:refP(a.id),del:a.del,diasVacia:a.diasVacia,
        ultimaPalp:fmtFechaCortaM(a.ultimaPalpacion),resultado:'vacía',
        sub:'DEL '+(a.del==null?'—':a.del)+' · '+ordinalPartoM(a.partos)+' · ayer '+((a.leche&&a.leche.ayer!=null)?a.leche.ayer:0)+' L',
        accion:a.del>300?'Lactancia extendida sin preñez — evaluar descarte':'Producción muy baja para su etapa — evaluar descarte'});});
    /* candidatas a palpar (objeto cow→motivo) */
    Object.keys(palpCandidatas).forEach(k=>delete palpCandidatas[k]);
    animales.filter(a=>a.estadoRepro==='servida'||a.estadoRepro==='vacia').forEach(a=>{
      palpCandidatas[refP(a.id)]=a.estadoRepro==='servida'?'servida, por confirmar'
        :'vacía'+(a.diasVacia?' hace '+a.diasVacia+' días':', confirmar estado');});
    renderPartos();renderVacias();
  }catch(e){console.warn('Reproducción móvil: usando datos locales:',e.message||e);}
})();
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
  const numPalp=numDe(palp.cow);
  encolar();
  if(typeof LCStore!=='undefined'){
    const esPren=palp.resultado!=='vacia';
    const campos=esPren
      ?{estado_repro:'prenada',prenez_meses:palp.meses,parto_estimado:isoPartoM(palp.meses),ultima_palpacion:isoHoyM(),dias_vacia:null}
      :{estado_repro:'vacia',prenez_meses:null,parto_estimado:null,ultima_palpacion:isoHoyM(),dias_vacia:1};
    LCStore.registrarPalpacion({animalId:numPalp,resultado:palp.resultado,prenezMeses:esPren?palp.meses:null})
      .then(()=>LCStore.updateAnimalCampos(numPalp,campos)).then(()=>desencolar())
      .catch(e=>console.warn('Palpación móvil no guardada:',e.message||e));
  }
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
  if(typeof LCStore!=='undefined'){
    LCStore.registrarTratamiento({animalId:numDe(trata.cow),problema:trata.problema,
      medicamento:trata.medicina,diasRetiro:trata.retiro,
      retiroLecheHasta:trata.retiro>0?isoMasDiasM(trata.retiro):null})
      .then(()=>desencolar()).catch(e=>console.warn('Tratamiento móvil no guardado:',e.message||e));
  }
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
  if(typeof LCStore!=='undefined'){
    LCStore.updateAnimalCampos(numDe(seca.cow),{grupo:'horra',del:null,leche_ayer:null,secar_estimado:null})
      .then(()=>desencolar()).catch(e=>console.warn('Secado móvil no guardado:',e.message||e));
  }
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
  if(typeof LCStore!=='undefined'){
    const GM={ordeno:'ordeño',novillas:'novilla',terneras:'ternera',machos:'macho'};
    LCStore.insertAnimal({id:num,nombre:'(compra)',raza:alta.raza,grupo:GM[g]||'novilla',
      sexo:g==='machos'?'M':'H',edadAnios:alta.edad,origen:'comprado',
      procedencia:alta.procedencia||null,
      valorCompra:alta.valor?parseInt(String(alta.valor).replace(/\D/g,'')):null})
      .then(()=>desencolar()).catch(e=>console.warn('Compra móvil no guardada:',e.message||e));
  }
  setTimeout(()=>openGroup(g),300);
  const extra=(alta.procedencia?' · '+alta.procedencia:'')+(alta.valor?' · $'+alta.valor:'');
  snack('Compra: '+num+' ('+alta.tipo.toLowerCase()+', '+alta.raza+')'+extra+' — entró al hato','Deshacer',()=>{
    grupos[g].animales.shift();incGrupo(g,-1);
    if(g==='machos')toroSeq--;else altaSeq--;
    desencolar();openGroup(g);snack('Alta deshecha');
    if(typeof LCStore!=='undefined')LCStore.deleteAnimal(num).catch(()=>{});
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
  const numBaja=numDe(baja.cow);
  if(typeof LCStore!=='undefined'){
    LCStore.darDeBaja(numBaja,{motivo:baja.motivo,fecha:isoHoyM()})
      .then(()=>desencolar()).catch(e=>console.warn('Baja móvil no guardada:',e.message||e));
  }
  setTimeout(()=>openGroup('bajas'),300);
  snack(nombre+': baja por '+baja.motivo.toLowerCase()+' — sale del hato, su historia se conserva','Deshacer',()=>{
    if(removed){cows.splice(Math.min(idx,cows.length),0,removed);renderCows();incGrupo('ordeno',1);}
    nBajas--;subBajas();grupos.bajas.animales.shift();
    desencolar();openGroup('bajas');snack('Baja deshecha');
    if(typeof LCStore!=='undefined')LCStore.updateAnimalCampos(numBaja,
      {grupo:(animalesPorIdM[numBaja]||{}).grupo||'ordeño',baja_motivo:null,baja_fecha:null,baja_valor:null,baja_nota:null}).catch(()=>{});
  });
}
/* la app arranca en el selector de línea de negocio */
go('scr-selector');

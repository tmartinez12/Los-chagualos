const titles={
  'scr-selector':['Los Chagualos','Elige una línea de negocio'],
  'scr-inicio':['Dashboard','Resumen del día'],
  'scr-ordeno':['Leche','Producción y ordeño del día'],
  'scr-potreros':['Potreros',''],
  'scr-hato':['Hato','Inventario del hato'],
  'scr-vaca':['Ficha del animal','Se consulta mucho, se edita poco'],
  'scr-sanitario':['Sanidad','Tratamientos, retiros y vacunas'],
  'scr-repro':['Reproducción','Monta natural · la palpación manda'],
  'scr-partos':['Partos','Las palpaciones marcan las fechas'],
  'scr-grupo':['Grupo',''],
};
/* Banner de estado de la conexión: "cargando…" al abrir, error visible si la
 * base no responde (antes un fallo de red se veía igual que una finca vacía). */
function estadoBase(txt,esError){
  let b=document.getElementById('estadoBase');
  if(!txt){if(b)b.remove();return;}
  if(!b){b=document.createElement('div');b.id='estadoBase';
    b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:200;text-align:center;font-size:12px;font-weight:600;padding:6px 10px;color:#fff';
    document.body.appendChild(b);}
  b.style.background=esError?'#B3261E':'#5f6659';
  b.innerHTML=txt+(esError?' — <a onclick="location.reload()" style="color:#fff;text-decoration:underline;cursor:pointer">reintentar</a>':'');
}
estadoBase('Cargando los datos de la finca…');

/* drill-down: hato → grupo → animal */
/* Grupos del hato: SOLO la estructura (nombre). Las listas de animales, los
 * subtítulos y los headers se llenan desde Supabase en cacheAnimalesMovil;
 * arrancan vacíos para no mostrar datos inventados. */
const grupos={
  ordeno:{nombre:'Vacas en ordeño',sub:'',header:'',animales:[]},
  horras:{nombre:'Vacas horras (secas)',sub:'',header:'',animales:[]},
  novillas:{nombre:'Novillas de vientre',sub:'',header:'',animales:[]},
  levante:{nombre:'Hembras de levante',sub:'',header:'',animales:[]},
  terneras:{nombre:'Terneras',sub:'',header:'',animales:[]},
  machos:{nombre:'Machos / toros',sub:'',header:'',animales:[]},
  bajas:{nombre:'Bajas · histórico',sub:'',header:'',animales:[]}
};
/* sin demo: las listas de cada grupo arrancan vacías y se llenan desde Supabase */
Object.keys(grupos).forEach(k=>{grupos[k].animales=[];});
/* landing del hato móvil: KPIs y contadores por grupo desde datos reales */
function renderHatoM(){
  const A=Object.values(animalesPorIdM);if(!A.length)return;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('hmTotal',A.filter(a=>a.grupo!=='baja').length);
  set('hmOrdeno',A.filter(a=>a.grupo==='ordeño').length);
  set('hmPrenadas',A.filter(a=>a.estadoRepro==='prenada').length);
  const cnt={};A.forEach(a=>{const k=GRUPO_KEY[a.grupo];if(k)cnt[k]=(cnt[k]||0)+1;});
  ['ordeno','horras','novillas','levante','terneras','machos'].forEach(k=>set('cnt-'+k,cnt[k]||0));
  const ordeno=A.filter(a=>a.grupo==='ordeño'),dels=ordeno.map(a=>a.del).filter(d=>typeof d==='number');
  set('hsub-ordeno',dels.length?('DEL promedio '+Math.round(dels.reduce((s,d)=>s+d,0)/dels.length)):(ordeno.length+' vacas'));
  set('hsub-horras',A.filter(a=>a.grupo==='horra'&&a.estadoRepro==='prenada').length+' preñadas');
  set('hsub-novillas',A.filter(a=>a.grupo==='novilla'&&a.pesoKg>=330).length+' con peso para servicio');
  set('hsub-levante',A.filter(a=>a.grupo==='levante').length+' hembras');
  set('hsub-terneras',A.filter(a=>a.grupo==='ternera'&&a.desteteProximo).length+' con destete próximo');
  set('hsub-machos',A.filter(a=>a.grupo==='macho').map(a=>a.nombre).slice(0,2).join(', ')||'sin machos');
}
function openGroup(k){const g=grupos[k];
  titles['scr-grupo']=[g.nombre,g.sub];
  document.getElementById('grpHeader').innerHTML=g.header;
  const list=document.getElementById('grpList');list.innerHTML='';
  g.animales.forEach(a=>{const d=document.createElement('div');d.className='list-item';
    if(a[3]){d.innerHTML='<div class="li-body" style="text-align:center"><div class="li-sub" style="font-weight:600;text-decoration:underline;text-underline-offset:3px">'+a[0]+'</div></div>';
      d.onclick=()=>snack('Ver la lista completa');}
    else{d.innerHTML='<div class="li-body"><div class="li-title">'+LCRules.esc(a[0])+'</div>'+
      '<div class="li-sub">'+LCRules.esc(a[1])+'</div></div><svg class="ic chev"><use href="#i-chev"/></svg>';
      d.onclick=a[2]?(()=>openCow(numDe(a[0]))):()=>snack('Ficha de '+a[0]);}
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
  document.getElementById('barSub').textContent=(id==='scr-inicio'&&window.LCRules)?LCRules.fechaLarga():t[1];
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
  if(id==='scr-inicio'&&typeof renderInicioM==='function')renderInicioM();
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
function fmtNacimientoM(a){return LCRules.fmtNacimiento(a);}   // canónica en rules.js
/* adaptador: la lógica canónica vive en LCRules.deriveReproFicha (compartida
 * con el escritorio); aquí solo se mapea a la forma {cls,title,sub} móvil. */
function deriveReproFichaM(a){
  const r=LCRules.deriveReproFicha(a,{
    retiroDias:a.retiroLecheHasta?diasHastaM(a.retiroLecheHasta):null,
    hijas:(a.grupo==='macho'&&a.rolToro)?Object.values(animalesPorIdM).filter(x=>x.padreId===a.id&&x.grupo!=='baja').length:0,
    fmtFecha:fmtFechaCortaM});
  return r?{cls:r.nivel==='ok'?'':r.nivel,title:r.titulo,sub:r.sub,secar:r.secar}
          :{cls:'',title:GRUPO_DISPLAY_M[a.grupo]||a.grupo,sub:''};
}
let fichaActualM=null;
function renderFicha(num){
  const a=animalesPorIdM[num];
  if(!a){snack('Ficha de '+num+' — sincroniza primero');return false;}
  fichaActualM=num;
  document.getElementById('vmNombre').textContent=a.id+' · '+a.nombre;
  document.getElementById('vmSub').textContent=[a.raza,a.color,edadTextoM(a),GRUPO_DISPLAY_M[a.grupo],origenM(a)].filter(Boolean).join(' · ');
  /* alerta reproductiva/sanitaria */
  const r=deriveReproFichaM(a);const al=document.getElementById('vmAlerta');
  al.className='alert '+(r.cls==='bad'?'urgent':r.cls==='warn'?'warn':'info');
  al.innerHTML='<div class="a-icon"><svg class="ic"><use href="#i-cal"/></svg></div>'+
    '<div class="a-body"><div class="a-title">'+r.title+'</div>'+(r.sub?'<div class="a-sub">'+r.sub+'</div>':'')+
    (r.secar?'<button class="btn outl small mt8 vmSecarBtn">Programar secado</button>':'')+'</div>';
  if(r.secar){const sb=al.querySelector('.vmSecarBtn');if(sb)sb.onclick=()=>openSeca(a.id+' · '+a.nombre);}
  /* banner de baja: si el animal está dado de baja, mostrar motivo/fecha/valor/nota + revertir */
  (function(){
    const box=document.getElementById('vmBajaBox');if(!box)return;
    const b=a.baja;
    if(!b||a.grupo!=='baja'){box.style.display='none';box.innerHTML='';return;}
    const partes=[fmtFechaCortaM(b.fecha)];
    if(b.valor)partes.push('$'+Number(b.valor).toLocaleString('es-CO'));
    if(b.nota)partes.push(LCRules.esc(b.nota));
    box.style.display='';box.className='alert urgent';
    box.innerHTML='<div class="a-body"><div class="a-title">↧ Baja: '+LCRules.esc(b.motivo||'—')+'</div>'+
      '<div class="a-sub">'+partes.join(' · ')+'</div>'+
      '<button class="btn outl small mt8 vmRevertirBaja">Revertir baja</button></div>';
    const rb=box.querySelector('.vmRevertirBaja');if(rb)rb.onclick=()=>revertirBajaM(a.id);
  })();
  /* partos de esta vaca (para días abiertos, lista de partos e historia) */
  const partosVaca=(_partosM||[]).filter(p=>String(p.madre_id)===String(a.id))
    .sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha)));
  const ultParto=partosVaca.length?partosVaca[0].fecha:null;
  /* días abiertos: desde el último parto y aún sin preñez confirmada */
  const diasAbiertos=(ultParto&&a.estadoRepro!=='prenada')?diasDesdeM(ultParto):null;
  /* stats */
  const ayer=(a.leche&&a.leche.ayer!=null)?a.leche.ayer:0;
  document.getElementById('vmStats').innerHTML=
    '<div class="stat"><div class="s-label">Último ordeño</div><div class="s-value">'+ayer+' L</div></div>'+
    '<div class="stat"><div class="s-label">DEL</div><div class="s-value">'+(a.del==null?'—':a.del+' días')+'</div></div>'+
    '<div class="stat"><div class="s-label">Peso</div><div class="s-value">'+(a.pesoKg?a.pesoKg+' kg':'—')+'</div></div>'+
    '<div class="stat"><div class="s-label">Partos</div><div class="s-value">'+(a.partos||0)+'</div></div>'+
    (diasAbiertos!=null?'<div class="stat"><div class="s-label">Días abiertos</div><div class="s-value'+(diasAbiertos>120?' down':'')+'">'+diasAbiertos+'</div></div>':'')+
    ((a.gananciaDiaG&&(a.grupo==='levante'||a.grupo==='ternera'))?'<div class="stat"><div class="s-label">Ganancia</div><div class="s-value">'+a.gananciaDiaG+' g/día</div></div>':'');
  /* genealogía */
  const madre=a.madreId?(animalesPorIdM[a.madreId]?a.madreId+' '+animalesPorIdM[a.madreId].nombre:a.madreId):'—';
  const padre=a.padreId?(animalesPorIdM[a.padreId]?a.padreId+' '+animalesPorIdM[a.padreId].nombre:a.padreId):'—';
  const crias=Object.values(animalesPorIdM).filter(x=>x.madreId===a.id).map(x=>x.id+' '+x.nombre);
  document.getElementById('vmGenea').innerHTML='<b style="color:var(--ink)">Nacimiento:</b> '+fmtNacimientoM(a)+'<br>'+
    '<b style="color:var(--ink)">Madre:</b> '+LCRules.esc(madre)+
    ' &nbsp;·&nbsp; <b style="color:var(--ink)">Padre:</b> '+LCRules.esc(padre)+
    '<br><b style="color:var(--ink)">Crías:</b> '+(crias.length?LCRules.esc(crias.join(', ')):'sin crías registradas')+
    (a.pesoKg&&a.fechaPeso?'<br><b style="color:var(--ink)">Peso:</b> '+a.pesoKg+' kg <span style="color:var(--ink-3)">('+fmtFechaCortaM(a.fechaPeso)+')</span>':'')+
    (a.diasVacia!=null&&a.estadoRepro==='vacia'?'<br><b style="color:var(--ink)">Días vacía:</b> '+a.diasVacia:'')+
    ((a.procedencia||a.valorCompra)?'<br><b style="color:var(--ink)">Compra:</b> '+LCRules.esc(a.procedencia||'')+(a.valorCompra?' · $'+Number(a.valorCompra).toLocaleString('es-CO'):''):'')+
    (a.nota?'<br><b style="color:var(--ink)">📝 Nota:</b> '+LCRules.esc(a.nota):'');
  /* curva */
  renderFichaCurva(a.del||0,ayer);
  document.getElementById('vmCurvaSub').textContent='Pico típico ~DEL 55 · hoy va en DEL '+(a.del==null?'—':a.del);
  /* sanidad */
  const retiroD=a.retiroLecheHasta?diasHastaM(a.retiroLecheHasta):null;const sanOk=!(retiroD!=null&&retiroD>=0);
  document.getElementById('vmSanidad').innerHTML='<svg class="ic-s ic" style="color:var('+(sanOk?'--green':'--red')+')"><use href="#i-shield"/></svg>'+
    '<div style="font-size:12.5px;color:var(--ink-2)"><b style="color:var(--ink)">'+(sanOk?'Sanidad al día':'Retiro de leche activo')+'</b> — '+
    (sanOk?'sin tratamientos ni retiros activos':'no vender su leche hasta '+fmtFechaCortaM(a.retiroLecheHasta))+'</div>';
  /* historia detallada (P8): partos + palpaciones + tratamientos + vacunas, por fecha */
  const ev=[];
  partosVaca.forEach(p=>{
    const criaTxt=p.cria_id?('cría <b>'+LCRules.esc(p.cria_id)+'</b>'+(p.sexo_cria?' ('+(p.sexo_cria==='H'?'♀':'♂')+')':'')):'sin cría';
    ev.push(['🐄 Parto · '+criaTxt+(p.peso_kg?' · '+p.peso_kg+' kg':'')+(p.estado_cria&&p.estado_cria!=='viva'?' · <span style="color:var(--red)">mortinato</span>':''),p.fecha]);
  });
  (_palpacionesM||[]).filter(x=>String(x.animal_id)===String(a.id)).forEach(x=>{
    const r=x.resultado==='vacia'?'vacía':(x.prenez_meses?'preñada '+x.prenez_meses+' meses':(x.resultado||'palpación'));
    ev.push(['🔬 Palpación: <b>'+LCRules.esc(r)+'</b>',x.fecha]);
  });
  (_tratamientosM||[]).filter(x=>String(x.animal_id)===String(a.id)).forEach(x=>{
    const ret=(x.dias_retiro>0)?' · retiro '+x.dias_retiro+'d':'';
    ev.push(['💊 '+LCRules.esc(x.problema||'Tratamiento')+(x.medicamento?' · '+LCRules.esc(x.medicamento.toLowerCase()):'')+ret+(x.activo?'':' <span style="color:var(--ink-3)">(terminado)</span>'),x.inicio]);
  });
  (_vacunacionesM||[]).filter(v=>String(v.animal_id)===String(a.id)||v.alcance==='hato').forEach(v=>{
    ev.push(['💉 '+LCRules.esc(v.tipo)+(v.alcance==='hato'?' (todo el hato)':'')+(v.lote?' · lote '+LCRules.esc(v.lote):''),v.fecha]);
  });
  ev.sort((x,y)=>String(y[1]||'').localeCompare(String(x[1]||'')));
  const hist=document.getElementById('vmHistoria');
  hist.innerHTML=ev.length?ev.slice(0,20).map((e,i,arr)=>'<div class="tl-item"'+(i===arr.length-1?' style="padding-bottom:0"':'')+'>'+
    '<div class="tl-date">'+(e[1]?fmtFechaCortaM(e[1]).toUpperCase()+' '+String(e[1]).slice(0,4):'—')+'</div>'+
    '<div class="tl-text">'+e[0]+'</div></div>').join(''):'<div class="tl-item" style="padding-bottom:0"><div class="tl-text" style="color:var(--ink-2)">Sin eventos registrados todavía</div></div>';
  return true;
}
/* revertir una baja ya confirmada (más allá del "Deshacer"): vuelve al hato */
function revertirBajaM(num){
  const a=animalesPorIdM[num];if(!a){snack('No tengo los datos de '+num+' — sincroniza primero');return;}
  if(a.grupo!=='baja'){snack(num+' no está dado de baja');return;}
  const destino=a.sexo==='M'?'macho':'ordeño';
  a.grupo=destino;a.baja=null;
  /* sacar del drill-down de bajas y reponer en su grupo destino */
  const ib=grupos.bajas.animales.findIndex(x=>numDe(x[0])===num);
  if(ib>=0)grupos.bajas.animales.splice(ib,1);
  nBajas=Math.max(0,nBajas-1);subBajas();
  const k=GRUPO_KEY[destino];
  if(k&&grupos[k]&&!grupos[k].animales.find(x=>numDe(x[0])===num)){
    grupos[k].animales.unshift([a.id+' · '+a.nombre,subAnimalM(a),1]);incGrupo(k,1);}
  if(destino==='ordeño'&&!cows.find(c=>c.num===num)){cows.push(animalACow(a));renderCows();}
  /* si su estado reproductivo (vacía/servida/preñada) seguía vigente, reaparece
   * en las listas derivadas — ya no está en 'baja' (Estado único). */
  recomputarReproM();
  renderHatoM();renderPartos();renderVacias();renderPalpListaM();
  if(typeof LCStore!=='undefined')LCStore.updateAnimalCampos(num,
    {grupo:destino,baja_motivo:null,baja_fecha:null,baja_valor:null,baja_nota:null}).catch(e=>{
      console.warn('Reversión de baja no guardada:',e.message||e);
      snack('⚠ La reversión NO se guardó en la base — reintenta');});
  renderFicha(num);
  snack(num+' vuelve al hato como "'+(GRUPO_DISPLAY_M[destino]||destino)+'" — revisa el grupo en Editar');
}
/* ===== Editar datos de la vaca (ficha móvil) ===== */
const editM={};
function openEditVaca(){
  const num=fichaActualM;const a=num&&animalesPorIdM[num];
  if(!a){snack('Abre una ficha primero');return;}
  editM.num=num;editM.nombre=a.nombre||'';editM.raza=a.raza||'';editM.color=a.color||'';editM.nota=a.nota||'';
  editM.nacimiento=a.nacimiento||'';editM.peso=(a.pesoKg!=null?a.pesoKg:'');
  editM.inicio=a.inicioLactancia||'';editM.leche=(a.leche&&a.leche.ayer!=null?a.leche.ayer:'');
  editM.grupo=a.grupo||'ordeño';editM.madre=a.madreId||'';
  document.querySelectorAll('#editGrupo .chip').forEach(c=>
    c.classList.toggle('sel',c.textContent.trim()===(GRUPO_DISPLAY_M[editM.grupo]||editM.grupo)));
  const em=document.getElementById('editMadre');if(em)em.value=editM.madre;
  document.getElementById('editCow').textContent=(a.id+' · '+a.nombre).toUpperCase();
  document.getElementById('editNombre').value=editM.nombre;
  document.getElementById('editRaza').value=editM.raza;
  const ec=document.getElementById('editColor');if(ec)ec.value=editM.color;
  const en=document.getElementById('editNota');if(en)en.value=editM.nota;
  document.getElementById('editNac').value=editM.nacimiento||'';
  document.getElementById('editPeso').value=editM.peso;
  document.getElementById('editInicio').value=editM.inicio||'';
  document.getElementById('editLeche').value=editM.leche;
  document.getElementById('scrim').classList.add('show');
  document.getElementById('editSheet').classList.add('show');
}
function closeEdit(){document.getElementById('editSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function editPickGrupo(btn,val){editM.grupo=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function saveEditVaca(){
  const num=editM.num,a=animalesPorIdM[num];if(!a)return;
  const madre=(editM.madre||'').trim()||null;
  if(madre&&!animalesPorIdM[madre]){snack('⚠ La madre '+madre+' no está registrada — corrige el número');return;}
  if(madre===num){snack('⚠ Un animal no puede ser su propia madre');return;}
  const nombre=(editM.nombre||'').trim()||a.nombre;
  const raza=(editM.raza||'').trim()||null;
  const color=(editM.color||'').trim()||null;
  const nota=(editM.nota||'').trim()||null;
  const nacimiento=editM.nacimiento||null;
  const peso=(editM.peso!==''&&editM.peso!=null)?parseFloat(editM.peso):null;
  const inicio=editM.inicio||null;
  const leche=(editM.leche!==''&&editM.leche!=null)?parseFloat(editM.leche):null;
  closeEdit();
  const grupoNuevo=editM.grupo||a.grupo;
  const grupoCambio=grupoNuevo!==a.grupo;
  const campos={nombre:nombre,raza:raza,color:color,nota:nota,nacimiento:nacimiento,inicio_lactancia:inicio,
    grupo:grupoNuevo,madre_id:madre};
  if(peso!=null&&!isNaN(peso)){campos.peso_kg=peso;campos.fecha_peso=isoHoyM();}
  const delCalc=inicio?Math.max(0,Math.round((new Date()-new Date(inicio+'T00:00:00'))/86400000)):a.del;
  Object.assign(a,{nombre:nombre,raza:raza,color:color,nota:nota,nacimiento:nacimiento,inicioLactancia:inicio,del:delCalc,
    grupo:grupoNuevo,madreId:madre});
  a.leche=a.leche||{};if(leche!=null&&!isNaN(leche))a.leche.ayer=leche;
  if(peso!=null&&!isNaN(peso)){a.pesoKg=peso;a.fechaPeso=isoHoyM();}
  /* refrescar la entrada del hato y la tarjeta de ordeño */
  if(grupoCambio){
    /* moverla de grupo en el drill-down y refrescar contadores del hato */
    Object.keys(grupos).forEach(kk=>{const i=grupos[kk].animales.findIndex(x=>numDe(x[0])===num);
      if(i>=0)grupos[kk].animales.splice(i,1);});
    const kN=GRUPO_KEY[grupoNuevo];
    if(kN&&grupos[kN])grupos[kN].animales.unshift([a.id+' · '+a.nombre,subAnimalM(a),1]);
    renderHatoM();
  }else{
    const k=GRUPO_KEY[a.grupo];
    if(k&&grupos[k]){const e=grupos[k].animales.find(x=>numDe(x[0])===num);
      if(e){e[0]=a.id+' · '+a.nombre;e[1]=subAnimalM(a);}}
  }
  const mc=cows.findIndex(c=>c.num===num);
  if(mc>=0){const pd=cows[mc].done,pv=cows[mc].v;cows[mc]=Object.assign(animalACow(a),{done:pd,v:pv});renderCows();renderInicioM();}
  renderFicha(num);encolar();
  if(typeof LCStore!=='undefined'){
    /* concurrencia: solo guarda si la ficha no cambió en otro dispositivo */
    LCStore.updateAnimalCampos(num,campos,a.updatedAt).then(r=>{if(r&&r.updated_at)a.updatedAt=r.updated_at;desencolar();}).catch(e=>{
      desencolar();
      if(e&&e.code==='CONFLICTO'){snack('⚠ '+num+': otro dispositivo cambió esta ficha — recarga para no pisar sus cambios');}
      else{console.warn('Edición móvil no guardada:',e.message||e);snack('⚠ '+num+': los cambios NO se guardaron en la base — reintenta');}});
    if(leche!=null&&!isNaN(leche)){const ay=new Date(isoHoyM()+'T00:00:00');ay.setDate(ay.getDate()-1);
      LCStore.registrarOrdeno(num,leche,isoDeM(ay)).catch(()=>{});}
  }
  snack(num+' actualizado');
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
renderFichaCurva(0,0);   // curva vacía; openCow la redibuja con datos reales
/* rutina de la mañana (Potreros oculto por ahora → sin el paso "mover el hato") */
const rutina={ordeno:false};
const rutinaIcono={ordeno:'i-drop',hato:'i-pin'};
function pintaRutina(){const n=Object.values(rutina).filter(Boolean).length,total=Object.keys(rutina).length;
  document.getElementById('rutinaProg').textContent=n+' de '+total+(n===total?' · día completo':'');}
function markRutina(k){if(!(k in rutina)||rutina[k])return;rutina[k]=true;
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
/* botón + contextual */
function openSheet(){
  const fa=fichaActualM&&animalesPorIdM[fichaActualM];
  const ctx={'scr-vaca':fa?('Registrar en '+fa.id+' · '+fa.nombre):'Registrar en esta vaca',
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
const cows=[];
cows.forEach(c=>{c.done=false;c.v=null;});
/* ===== Helpers compartidos para derivar desde Supabase ===== */
const HOY_LC=new Date();   // hoy real (la base trae datos reales)
const diasHastaM=LCRules.diasHasta;        // compartido en core/rules.js
const ordinalPartoM=LCRules.ordinalParto;  // compartido en core/rules.js
function isoDeM(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+dd;}
/* "hoy" SIEMPRE al momento y en la zona de la finca (America/Bogota) — no la
 * fecha de cuando se abrió la pestaña ni la TZ del dispositivo. */
function isoHoyM(){return (typeof LCStore!=='undefined'&&LCStore.hoyFinca)?LCStore.hoyFinca():isoDeM(new Date());}
/* días transcurridos desde una fecha ISO hasta hoy (hora de la finca) */
function diasDesdeM(iso){if(!iso)return null;const d=new Date(iso+'T00:00:00');
  return Math.max(0,Math.round((new Date(isoHoyM()+'T00:00:00')-d)/86400000));}
function isoMasDiasM(n){const d=new Date(HOY_LC.getTime());d.setDate(d.getDate()+(n||0));return isoDeM(d);}
function isoPartoM(meses){const d=new Date(HOY_LC.getTime());d.setMonth(d.getMonth()+Math.max(0,Math.round(9-meses)));return isoDeM(d);}
function numDe(cow){return (''+cow).split('·')[0].trim();}
const snapshotReproDBM=LCRules.snapshotReproDB;   // compartido en core/rules.js
const fmtFechaCortaM=LCRules.fmtFechaCorta;       // compartido en core/rules.js
function edadTextoM(a){const n=a.edadAnios;if(n==null)return '';
  const enMeses=a.grupo==='levante'||a.grupo==='ternera'||(a.grupo==='macho'&&n<1.5)||n<1;
  return enMeses?Math.round(n*12)+' meses':((n%1===0?String(n):n.toFixed(1).replace('.',','))+' años');}
function subAnimalM(a){
  switch(a.grupo){
    case 'ordeño':return 'DEL '+(a.del==null?'—':a.del)+' · últ. '+((a.leche&&a.leche.ayer!=null)?a.leche.ayer:0)+' L';
    case 'horra':return a.prenez?('preñada '+a.prenez.meses+' meses'+(a.prenez.partoEstimado?' · parto ~'+fmtFechaCortaM(a.prenez.partoEstimado):'')):'horra';
    case 'novilla':return edadTextoM(a)+(a.pesoKg?' · '+a.pesoKg+' kg':'')+(a.listaServicio?' · lista para servicio':'');
    case 'levante':return edadTextoM(a)+(a.pesoKg?' · '+a.pesoKg+' kg':'')+(a.gananciaDiaG?' · '+a.gananciaDiaG+' g/día':'');
    case 'ternera':return edadTextoM(a)+(a.desteteProximo?' · destete próximo':'');
    case 'macho':return (a.rolToro?'Toro · ':'')+edadTextoM(a);
    case 'baja':return a.baja?((a.baja.motivo||'').toUpperCase()+(a.baja.fecha?' · '+fmtFechaCortaM(a.baja.fecha):'')+(a.baja.nota?' · '+a.baja.nota:'')):'baja';
  }
  return '';
}
const GRUPO_KEY={'ordeño':'ordeno','horra':'horras','novilla':'novillas','levante':'levante','ternera':'terneras','macho':'machos','baja':'bajas'};
const GRUPO_LABEL={ordeno:'vacas en ordeño',horras:'vacas horras',novillas:'novillas',levante:'hembras de levante',terneras:'terneras',machos:'machos',bajas:'bajas'};
/* Sanidad: tratamientos activos reales (sin demo). */
function renderTratamientosM(lista){
  const box=document.getElementById('tratListaM');if(!box)return;
  const cnt=document.getElementById('tratCountM');if(cnt)cnt.textContent=lista.length;
  if(!lista.length){box.innerHTML='<div class="card"><div class="li-sub" style="color:var(--ink-3)">Sin tratamientos activos.</div></div>';return;}
  box.innerHTML=lista.map(t=>{
    const retiroD=t.retiro_leche_hasta?diasHastaM(t.retiro_leche_hasta):null;
    const conRetiro=retiroD!=null&&retiroD>=0;
    const nombre=(t.animales&&t.animales.nombre)||t.animal_id;
    return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'+
      '<div><div class="li-title">'+LCRules.esc(t.animal_id)+' · '+LCRules.esc(nombre)+'</div>'+
      '<div class="li-sub">'+LCRules.esc(t.problema||'')+(t.medicamento?' · '+LCRules.esc(t.medicamento.toLowerCase()):'')+
      (conRetiro?' · <b>retiro hasta '+fmtFechaCortaM(t.retiro_leche_hasta)+'</b>':'')+'</div></div>'+
      (conRetiro?'<span class="badge bad">retiro '+retiroD+'d</span>':'<span class="badge ok">sin retiro</span>')+'</div>'+
      '<button class="btn outl small" style="margin-top:10px" onclick="terminarTrataM(\''+LCRules.esc(t.id)+'\')">✓ Marcar terminado</button></div>';
  }).join('');
}
/* recargable: se llama al abrir y tras registrar/terminar/deshacer un tratamiento */
async function cargarTratamientosMovil(){
  if(typeof LCStore==='undefined'){renderTratamientosM([]);return;}
  try{const ts=await LCStore.getTratamientos(true);renderTratamientosM(ts||[]);}
  catch(e){console.warn('Tratamientos móvil:',e.message||e);renderTratamientosM([]);}
}
cargarTratamientosMovil();
/* terminar un tratamiento desde el celular (antes era solo del escritorio) */
function terminarTrataM(id){
  if(typeof LCStore==='undefined')return;
  LCStore.terminarTratamiento(id)
    .then(()=>{snack('Tratamiento terminado — el retiro derivado se recalcula','Deshacer',()=>{
      LCStore.reactivarTratamiento(id).then(()=>cargarTratamientosMovil())
        .catch(()=>snack('⚠ No se pudo reactivar'));});
      cargarTratamientosMovil();})
    .catch(e=>snack('⚠ No se pudo terminar: '+(e.message||e)));
}
/* Lista de candidatas a palpar (se arma sola desde palpCandidatas).
   Declarada aquí arriba para evitar TDZ: el arranque (renderPalpListaM)
   corre antes de la línea donde estaba antes. */
const palpCandidatas={};
function renderPalpListaM(){
  const box=document.getElementById('palpListaM');if(!box)return;
  const keys=Object.keys(palpCandidatas);
  box.innerHTML=keys.length?keys.map(k=>'<b style="color:var(--ink)">'+LCRules.esc(k.replace(' · ',' '))+'</b> — '+palpCandidatas[k]).join('<br>')
    :'<span style="color:var(--ink-3)">No hay vacas pendientes de palpar.</span>';
}
/* Dashboard de inicio (móvil) con datos reales — sin demo. */
function renderInicioM(){
  const done=cows.filter(c=>c.done);
  const elL=document.getElementById('miLecheHoy');
  if(elL)elL.innerHTML=(done.length?done.reduce((s,c)=>s+c.v,0):'—')+' <span class="k-unit">L</span>';
  const elO=document.getElementById('miOrdeno');
  if(elO)elO.textContent=cows.length||'—';
  const al=document.getElementById('miAlertas');if(!al)return;
  const A=[];
  Object.values(animalesPorIdM).filter(a=>a.estadoRepro==='vacia'&&a.diasVacia&&a.diasVacia>=120).slice(0,2).forEach(a=>{
    A.push({c:'urgent',t:'Vaca '+a.id+' "'+a.nombre+'": vacía '+a.diasVacia+' días',
      s:'Requiere decisión: palpar, servir o evaluar descarte',cow:a.id});});
  Object.values(animalesPorIdM).filter(a=>a.retiroLecheHasta&&diasHastaM(a.retiroLecheHasta)>=0).slice(0,2).forEach(a=>{
    const d=diasHastaM(a.retiroLecheHasta);
    A.push({c:'info',t:'Retiro de leche: vaca '+a.id+(d===1?' — falta 1 día':' — faltan '+d+' días'),
      s:'No vender su leche hasta '+fmtFechaCortaM(a.retiroLecheHasta)});});
  Object.values(animalesPorIdM).filter(a=>a.grupo==='ordeño'&&a.prenez&&a.prenez.meses>=7).slice(0,2).forEach(a=>{
    A.push({c:'warn',t:'Vaca '+a.id+' "'+a.nombre+'": programar secado',
      s:'Preñada '+a.prenez.meses+' meses'+(a.secarEstimado?' — secar ~'+fmtFechaCortaM(a.secarEstimado):''),cow:a.id});});
  al.innerHTML=A.map(x=>'<div class="alert '+x.c+'"><div class="a-icon"><svg class="ic"><use href="#i-cal"/></svg></div>'+
    '<div class="a-body"><div class="a-title">'+LCRules.esc(x.t)+'</div><div class="a-sub">'+x.s+'</div>'+
    (x.cow?'<button class="btn outl small mt8 miAlertaVerFicha">Ver ficha</button>':'')+
    '</div></div>').join('');
  const conCow=A.filter(x=>x.cow);
  al.querySelectorAll('.miAlertaVerFicha').forEach((btn,i)=>{
    if(conCow[i])btn.onclick=()=>openCow(conCow[i].cow);
  });
}
/* cache de todos los animales (genealogía/raza + sincronizar contador de IDs) */
let animalesPorIdM={};
(async function cacheAnimalesMovil(){
  if(typeof LCStore==='undefined')return;
  try{
    const all=await LCStore.getAnimales();if(!all)return;
    all.forEach(a=>animalesPorIdM[a.id]=a);
    const maxNum=Math.max(0,...all.map(a=>parseInt(a.id,10)).filter(n=>!isNaN(n)));
    if(typeof criaNum!=='undefined'&&maxNum>criaNum)criaNum=maxNum;
    if(typeof altaSeq!=='undefined'&&maxNum>altaSeq)altaSeq=maxNum;
    /* toros ('T01', 'T02'…): re-sembrar toroSeq del mayor real para que el
     * próximo toro comprado no choque la PK de uno ya existente. */
    const maxToro=Math.max(0,...all.map(a=>{const m=/^T0*(\d+)$/.exec(String(a.id));return m?parseInt(m[1],10):NaN;}).filter(n=>!isNaN(n)));
    if(typeof toroSeq!=='undefined'&&maxToro>toroSeq)toroSeq=maxToro;
    /* reconstruir los grupos del hato desde la base */
    Object.keys(grupos).forEach(k=>{grupos[k].animales=[];});
    all.forEach(a=>{const k=GRUPO_KEY[a.grupo];if(!k||!grupos[k])return;
      grupos[k].animales.push([a.id+' · '+a.nombre,subAnimalM(a),1]);});
    Object.keys(grupos).forEach(k=>{const n=grupos[k].animales.length;
      grupos[k].sub=n+' '+GRUPO_LABEL[k];
      grupos[k].header='<b>'+n+' '+GRUPO_LABEL[k]+'.</b>';});
    /* sincronizar los contadores del hato con los conteos reales, para que las
     * acciones (parto/baja/secado) muestren números correctos y no un demo. */
    if(typeof nOrdeno!=='undefined'){
      nOrdeno=grupos.ordeno.animales.length; nHorras=grupos.horras.animales.length;
      nNovillas=grupos.novillas.animales.length; nTerneras=grupos.terneras.animales.length;
      nMachos=grupos.machos.animales.length; nBajas=grupos.bajas.animales.length;
    }
    renderInicioM();renderSanidadVacunasM();renderHatoM();
    estadoBase(null);   // datos abajo: quitar el "cargando…"
  }catch(e){console.warn('Cache/hato móvil:',e.message||e);
    estadoBase('Sin conexión con la base — lo que ves puede estar vacío o incompleto',true);}
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
    if(!animales)return;
    cows.length=0;animales.forEach(a=>cows.push(animalACow(a)));
    try{const hoy=await LCStore.getOrdenosFecha();
      cows.forEach(c=>{if(hoy[c.num]!=null){c.done=true;c.v=hoy[c.num];}});
    }catch(_){/* sin ordeños hoy */}
    renderCows();renderInicioM();
  }catch(e){console.warn('Ordeño móvil: usando datos locales:',e.message||e);}
})();
let ci=-1,typing=false;
function renderCows(){
  const g=document.getElementById('cowGrid');g.innerHTML='';
  cows.forEach((c,i)=>{const d=document.createElement('div');
    d.className='cow-tile'+(c.done?' done':'')+(c.retiro?' retiro':'');
    const sub=c.done?'✓ '+c.v+' L':(c.retiro?'⛔ retiro '+c.retiro+'d':'últ. '+c.ayer+' L');
    d.innerHTML='<div class="ct-num">'+LCRules.esc(c.num)+'</div><div class="ct-name">'+LCRules.esc(c.n)+'</div>'+
      '<div class="ct-sub">'+LCRules.esc(sub)+'</div>';
    d.onclick=()=>pickCow(i);g.appendChild(d);});
  const done=cows.filter(c=>c.done);
  const totalHoy=done.reduce((s,c)=>s+c.v,0);
  document.getElementById('milkProg').textContent=
    done.length+' de '+cows.length+' · Σ '+totalHoy+' L';
  const th=document.getElementById('ordHoyTotal');if(th)th.textContent=totalHoy;   // cabecera real
}
let milkFechaSel='';
function pickCow(i){ci=i;const c=cows[i];typing=false;
  milkFechaSel=isoHoyM();
  const mf=document.getElementById('milkFecha');if(mf){mf.max=isoHoyM();mf.value=milkFechaSel;}
  document.getElementById('cowName').textContent=c.num+' · '+c.n.toUpperCase();
  document.getElementById('cowDel').textContent=c.del;
  document.getElementById('milkNum').textContent=c.done?c.v:c.ayer;
  document.getElementById('cowRef').textContent=c.retiro
    ?'⛔ En retiro '+c.retiro+' días — registra su leche, pero no se vende'
    :(c.done
      ?'Ya registrada con '+c.v+' L — puedes corregirla'
      :'Último ordeño: '+c.ayer+' L — acepta ✓ si dio igual');
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
  const v=LCRules.clampLitros(document.getElementById('milkNum').textContent);
  const c=cows[ci];
  const fecha=milkFechaSel||isoHoyM();
  const esHoy=fecha===isoHoyM();
  /* fecha pasada: registrar ese día SIN tocar el tablero de hoy (el tile es de hoy).
   * Sin "Deshacer" en el original: no hay tile local que revertir. */
  if(!esHoy){
    LCAcciones.ejecutarConDeshacer({
      aplicar(){closeMilk();encolar();},
      escribir:typeof LCStore!=='undefined'?
        ()=>LCStore.registrarOrdeno(c.num,v,fecha).then(()=>desencolar()):null,
      avisoError:()=>'⚠ '+c.n+': NO se guardó en la base — revisa la señal y reintenta',
      mensaje:c.n+': '+v+' L registrados el '+fmtFechaCortaM(fecha),
      snack,
    });
    return;
  }
  const drop=!c.done&&LCRules.esBajonLeche(c.ayer,v);
  const conocidoPrev=c.done?c.v:c.ayer;   // lo que ESTA pantalla creía tener
  /* sin "Deshacer" en el original: el tile queda done=true y se corrige
   * tocándolo de nuevo, no con un botón de deshacer. */
  LCAcciones.ejecutarConDeshacer({
    aplicar(){c.done=true;c.v=v;renderCows();closeMilk();encolar();},
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.registrarOrdeno(c.num,v).then(r=>{desencolar();
        /* pisado inesperado: otro dispositivo tenía un valor DISTINTO — avisar */
        if(r&&r._pisado&&Number(r._pisado.previo)!==Number(conocidoPrev))
          snack('⚠ '+c.n+': otro registro tenía '+r._pisado.previo+' L de hoy; se reemplazó por '+v+' L');
      }):null,
    avisoError:()=>'⚠ '+c.n+': NO se guardó en la base — revisa la señal y reintenta',
    mensaje:drop?'Atención: '+c.n+' bajó '+(c.ayer-v)+' L vs ayer — ¿mastitis, celo, comida?':c.n+': '+v+' L guardados',
    snack,
  });
  if(cows.every(x=>x.done)){markRutina('ordeno');
    const tot=cows.reduce((s,x)=>s+x.v,0);
    setTimeout(()=>snack('Ordeño completo: '+tot+' L registrados hoy'),1500);}
}
/* Sanidad móvil · vacunas: brucelosis desde terneras reales + mes actual */
function renderSanidadVacunasM(){
  const A=Object.values(animalesPorIdM||{});
  const el=document.getElementById('sanBrucelosisM');
  if(el){const t=A.filter(a=>a.grupo==='ternera'&&a.edadAnios!=null&&a.edadAnios>=0.25&&a.edadAnios<=0.67);
    if(t.length){el.style.display='';
      el.querySelector('.a-title').textContent='Brucelosis: '+t.length+' ternera'+(t.length>1?'s':'')+' en ventana';
      el.querySelector('.a-sub').textContent=t.slice(0,6).map(x=>x.id).join(', ')+' · vacuna única entre los 3 y 8 meses';
    }else el.style.display='none';}
  renderSanCalendarioM();renderSanProximaM();
}
const PROTOCOLO_SAN_M=LCRules.PROTOCOLO_SAN;   // única fuente compartida (rules.js)
let _vacunacionesM=[];
function _ultimaVacM(tipo){const v=(_vacunacionesM||[]).filter(x=>x.tipo===tipo&&x.fecha).sort((a,b)=>a.fecha<b.fecha?1:-1);return v.length?v[0].fecha:null;}
function renderSanCalendarioM(){
  const cal=document.getElementById('sanCalendarioM');if(!cal)return;
  const now=new Date(),mesActual=now.getMonth();
  const hecho={};(_vacunacionesM||[]).forEach(v=>{if(!v.fecha||new Date(v.fecha).getFullYear()!==now.getFullYear())return;
    const m=parseInt(String(v.fecha).slice(5,7),10)-1;(hecho[m]=hecho[m]||new Set()).add(v.tipo);});
  const ABR={aftosa:'aftosa',desparasitacion:'despar.',brucelosis:'brucel.',vitaminas:'vitam.',otra:'otra'};
  let h='';
  for(let m=0;m<12;m++){
    const plan=[];if(PROTOCOLO_SAN_M.despar.includes(m))plan.push('despar.');if(PROTOCOLO_SAN_M.aftosa.includes(m))plan.push('aftosa');
    const hh=hecho[m]?[...hecho[m]].map(t=>ABR[t]||t):[];
    const cls='pot'+(hh.length?'':' off')+(m===mesActual?' now':'');
    const cap=hh.length?'<span style="color:var(--green);font-weight:700">✓ '+hh.join(' + ')+'</span>':(plan.length?plan.join(' + '):'—');
    h+='<div class="'+cls+'"><div class="p-top"><span class="p-name">'+LCRules.MESC[m].toUpperCase()+'</span>'+
       (plan.length&&!hh.length?'<span class="dot"></span>':'')+'</div><div class="p-cap" style="margin-top:6px">'+cap+'</div></div>';
  }
  cal.innerHTML=h;
}
function renderSanProximaM(){
  const tit=document.getElementById('sanProximaTituloM'),sub=document.getElementById('sanProximaSubM');if(!tit||!sub)return;
  const hoy=new Date();hoy.setHours(0,0,0,0);const cands=[];
  const ud=_ultimaVacM('desparasitacion');
  if(ud){const d=new Date(ud+'T00:00:00');d.setMonth(d.getMonth()+3);cands.push({t:'Desparasitación',f:d,b:'última: '+fmtFechaCortaM(ud)});}
  else cands.push({t:'Desparasitación',f:hoy,b:'sin registro aún'});
  const ua=_ultimaVacM('aftosa');
  {let prox=null;for(const m of [4,10,16,22]){const d=new Date(hoy.getFullYear(),m,1);
    const ym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    if(d>=hoy&&(!ua||ym>String(ua).slice(0,7))){prox=d;break;}}
   if(prox)cands.push({t:'Aftosa (ciclo ICA)',f:prox,b:ua?('última: '+fmtFechaCortaM(ua)):'sin registro aún'});}
  cands.sort((a,b)=>a.f-b.f);const p=cands[0],venc=p.f<=hoy;
  tit.innerHTML='Próxima: '+p.t+(venc?' · ya toca':' · ~'+p.f.getDate()+' '+LCRules.MESC[p.f.getMonth()]);
  sub.textContent=p.b+' · despar. cada 3 meses · aftosa may/nov';
}
/* ===== Vacunaciones (móvil) ===== */
const vacM={tipo:'aftosa',alcance:'hato',animal:'',producto:'',lote:'',fecha:'',proxima:'',nota:''};
function vacPick(btn,campo,val){vacM[campo]=val;[...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function openVacunaM(){
  vacM.tipo='aftosa';vacM.alcance='hato';vacM.animal='';vacM.producto='';vacM.lote='';
  vacM.fecha=isoHoyM();vacM.proxima='';vacM.nota='';
  document.querySelectorAll('#vacunaSheet .chips').forEach((g,gi)=>g.querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('sel',i===0)));
  ['vacAnimalM','vacProductoM','vacLoteM','vacProximaM','vacNotaM'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const vf=document.getElementById('vacFechaM');if(vf){vf.max=isoHoyM();vf.value=vacM.fecha;}
  document.getElementById('vacAnimalM').style.display='none';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('vacunaSheet').classList.add('show');
}
function closeVacuna(){document.getElementById('vacunaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function saveVacunaM(){
  closeVacuna();
  const individual=vacM.alcance==='individual';
  const animalId=individual?(vacM.animal||'').trim():null;
  const nAnimales=individual?null:Object.values(animalesPorIdM).filter(a=>a.grupo!=='baja').length;
  encolar();
  if(typeof LCStore!=='undefined'){
    LCStore.registrarVacunacion({tipo:vacM.tipo,alcance:vacM.alcance,animalId:animalId,nAnimales:nAnimales,
      producto:vacM.producto||null,lote:vacM.lote||null,fecha:vacM.fecha||isoHoyM(),
      proxima:vacM.proxima||null,nota:vacM.nota||null})
      .then(()=>{desencolar();cargarVacunacionesM();})
      .catch(e=>{console.warn('Vacunación móvil no guardada:',e.message||e);snack('⚠ La vacunación NO se guardó en la base — reintenta');});
  }
  snack('Vacunación registrada: '+vacM.tipo+(individual?(animalId?' · '+animalId:''):' · todo el hato'));
}
function renderVacunacionesM(lista){
  if(lista)_vacunacionesM=lista;
  renderSanCalendarioM();renderSanProximaM();
  const box=document.getElementById('vacListaHistM');if(!box)return;
  const arr=_vacunacionesM||[];
  if(!arr.length){box.innerHTML='<span style="color:var(--ink-3)">Aún no hay vacunaciones registradas.</span>';return;}
  box.innerHTML=arr.slice(0,8).map(v=>{
    const quien=v.alcance==='individual'
      ?((v.animales&&v.animales.nombre)?v.animal_id+' '+v.animales.nombre:(v.animal_id||'animal'))
      :('todo el hato'+(v.n_animales?' ('+v.n_animales+')':''));
    return '<div><b style="color:var(--ink)">'+fmtFechaCortaM(v.fecha)+'</b> · '+LCRules.esc(v.tipo)+' · '+LCRules.esc(quien)+(v.lote?' · lote '+LCRules.esc(v.lote):'')+'</div>';
  }).join('');
}
async function cargarVacunacionesM(){
  if(typeof LCStore==='undefined')return;
  try{const v=await LCStore.getVacunaciones();renderVacunacionesM(v);}catch(e){console.warn('Vacunaciones móvil:',e.message||e);}
}
cargarVacunacionesM();
/* Historial detallado de la ficha (P8): partos, tratamientos y palpaciones.
 * Se cargan una vez; si hay una ficha abierta se re-pinta al llegar. */
let _partosM=[], _tratamientosM=[], _palpacionesM=[];
async function cargarHistorialM(){
  if(typeof LCStore==='undefined')return;
  try{
    const [pa,tr,pl]=await Promise.all([LCStore.getPartos(),LCStore.getTratamientos(),LCStore.getPalpaciones()]);
    _partosM=pa||[];_tratamientosM=tr||[];_palpacionesM=pl||[];
    /* si el usuario ya está mirando una ficha, refrescar su historia */
    if(fichaActualM&&document.getElementById('scr-vaca')&&document.getElementById('scr-vaca').classList.contains('active'))
      renderFicha(fichaActualM);
  }catch(e){console.warn('Historial móvil:',e.message||e);}
}
cargarHistorialM();
renderCows();renderInicioM();pintaRutina();renderPalpListaM();renderSanidadVacunasM();
/* Maíz: el bloque del inicio solo se muestra si la finca tiene datos del cultivo. */
let datosMaiz = null;   // sin demo de maíz (poner {siloDias,loteDias} cuando haya cultivo)
function aplicarMaiz(){
  const b=document.getElementById('bloque-maiz');
  if(b)b.style.display = datosMaiz ? '' : 'none';
}
aplicarMaiz();
function confirmMove(){
  const yaEstaba=rutina.hato;
  markRutina('hato');encolar();
  snack('Movimiento de potrero registrado','Deshacer',()=>{
    if(!yaEstaba)unmarkRutina('hato');
    desencolar();snack('Movimiento deshecho');
  });
}
/* sincronización offline: cuántos registros faltan por subir */
let pendientes=0;
function updateSync(){const c=document.getElementById('syncChip');if(!c)return;
  c.textContent=pendientes>0?(pendientes+' sin subir'):'al día ✓';
  c.classList.toggle('pending',pendientes>0);}
function encolar(n){pendientes+=(n||1);updateSync();}
function desencolar(n){pendientes=Math.max(0,pendientes-(n||1));updateSync();}
function sincronizar(){
  /* honesto: no hay cola offline real todavía; lo no confirmado pudo perderse */
  snack(pendientes>0
    ? pendientes+' registro(s) sin confirmar en la base — verifica que existan y reintenta'
    : 'Todo está confirmado en la base ✓');
}
updateSync();
/* ===== Partos ===== */
/* próximos partos (salen de las palpaciones) e historial reciente.
 * Arrancan en CERO: los valores reales los pone cargarReproMovil desde la BD.
 * (No hardcodear conteos de demo: si no hay conexión, mejor mostrar 0 que un
 *  número inventado.) */
let proximosPartos=[];
let partosRecientes=[];
let partos2026=0, porParir=0, criaNum=0, nTerneras=0, nMachos=0;
const parto={cow:'',sexo:'H',tipo:'normal',estado:'viva',peso:38,fecha:'',criaNum:'',criaNombre:''};
/* grupos que pueden parir; se prefieren las horras (preñadas próximas) */
const GRUPOS_MADRE_M=['horra','ordeño','novilla'];
function renderPartos(){
  document.getElementById('kpiPartos2026').textContent=partos2026;
  document.getElementById('kpiPorParir').textContent=porParir;
  document.getElementById('kpiProximo').textContent=proximosPartos[0]?proximosPartos[0].short:'—';
  const lp=document.getElementById('listProximos');lp.innerHTML='';
  proximosPartos.forEach(p=>{const d=document.createElement('div');d.className='list-item';
    d.onclick=()=>openParto(p.cow);
    d.innerHTML='<div class="li-leading"><svg class="ic"><use href="#i-sprout"/></svg></div>'+
      '<div class="li-body"><div class="li-title">'+LCRules.esc(p.cow)+'</div><div class="li-sub">'+p.sub+'</div></div>'+
      '<span class="badge '+p.bw+'">'+p.badge+'</span>';
    lp.appendChild(d);});
  const ver=document.createElement('div');ver.className='list-item';
  ver.onclick=()=>snack('Próximos partos según las palpaciones');
  ver.innerHTML='<div class="li-body" style="text-align:center"><div class="li-sub" style="font-weight:600;text-decoration:underline;text-underline-offset:3px">Ver los '+porParir+' próximos partos</div></div>';
  lp.appendChild(ver);
  const lr=document.getElementById('listRecientes');lr.innerHTML='';
  partosRecientes.forEach((p,i)=>{const row=document.createElement('div');
    row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:8px 0'+
      (i<partosRecientes.length-1?';border-bottom:1px solid var(--border)':'');
    row.innerHTML='<div><div class="li-title">'+LCRules.esc(p.t)+'</div><div class="li-sub">'+p.s+'</div></div>'+
      '<span class="badge '+p.bw+'">'+p.badge+'</span>';
    lr.appendChild(row);});
  const hist=document.createElement('button');hist.className='btn text small mt8';
  hist.style.cssText='width:100%;justify-content:center';hist.textContent='Ver historial completo';
  hist.onclick=()=>snack('Historial de partos');
  lr.appendChild(hist);
}
function openParto(cow){
  /* candidatas: cualquier grupo adulto (horras primero), no solo horras */
  const adultas=Object.values(animalesPorIdM).filter(a=>GRUPOS_MADRE_M.includes(a.grupo))
    .sort((x,y)=>GRUPOS_MADRE_M.indexOf(x.grupo)-GRUPOS_MADRE_M.indexOf(y.grupo))
    .map(a=>a.id+' · '+a.nombre);
  parto.cow=cow||adultas[0]||'';
  parto.sexo='H';parto.tipo='normal';parto.estado='viva';parto.peso=38;parto.fecha=isoHoyM();
  parto.criaNum='';parto.criaNombre='';
  pintarCowChips('partoCows',adultas,parto.cow,partoCow);
  const fp=document.getElementById('partoFecha');if(fp){fp.value=parto.fecha;fp.max=isoHoyM();}
  document.getElementById('partoCow').textContent=(parto.cow||'—').toUpperCase();
  document.getElementById('partoDel').textContent=partoAvisoMadre(parto.cow);
  document.getElementById('partoPesoVal').textContent=parto.peso;
  ['partoCriaNum','partoCriaNombre'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  /* seleccionar la primera opción SOLO en los grupos de chips de datos (no en la lista de madres) */
  document.querySelectorAll('#partoSheet .chips').forEach(g=>{if(g.id==='partoCows')return;
    g.querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('sel',i===0));});
  document.getElementById('scrim').classList.add('show');
  document.getElementById('partoSheet').classList.add('show');
}
/* aviso si la madre elegida no es horra (lo normal es parir desde horra) */
function partoAvisoMadre(cow){
  const a=animalesPorIdM[numDe(cow)];if(!a)return'Confirma la fecha y los datos de la cría';
  if(a.grupo==='horra')return 'Horra (preñada próxima) — lo normal para parir';
  return '⚠ '+a.nombre+' está en "'+(GRUPO_DISPLAY_M[a.grupo]||a.grupo)+'", no en horras — confirma que sí parió';
}
function partoCow(cow){parto.cow=cow;
  document.getElementById('partoCow').textContent=cow.toUpperCase();
  document.getElementById('partoDel').textContent=partoAvisoMadre(cow);
  document.querySelectorAll('#partoCows .chip').forEach(c=>
    c.classList.toggle('sel',c.textContent.trim().split(' ')[0]===numDe(cow)));}
function closeParto(){document.getElementById('partoSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function partoPick(btn,campo,val){parto[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function partoPeso(d){parto.peso=Math.max(20,Math.min(60,parto.peso+d));
  document.getElementById('partoPesoVal').textContent=parto.peso;}
function saveParto(){
  if(!parto.cow||parto.cow.indexOf('·')<0){closeParto();
    snack('No hay vaca seleccionada — registra primero el hato');return;}
  const numMadre=parto.cow.split('·')[0].trim();
  /* número de la cría viva: validar ANTES de mutar nada (evita estado a medias) */
  let criaNumFinal=null;const criaAuto=!((parto.criaNum||'').trim());
  if(parto.estado==='viva'){
    const dado=(parto.criaNum||'').trim();
    if(dado){
      if(animalesPorIdM[dado]){snack('⚠ El número '+dado+' ya existe — usa otro');return;}
      criaNumFinal=dado;
    }else{criaNumFinal=String(++criaNum).padStart(3,'0');}
  }
  closeParto();
  const fechaP=parto.fecha||isoHoyM();
  const nombre=parto.cow.split('·')[1].trim();
  const criaNombreDado=(parto.criaNombre||'').trim();
  const sexoTxt=parto.sexo==='H'?'♀ hembra':'♂ macho';
  const tipoTxt=parto.tipo==='asistido'?'parto asistido':'parto normal';
  const criaIdNueva=parto.estado==='viva'?criaNumFinal:null;
  const partoId=LCRules.idUnico('P-');
  // la madre sale de su grupo actual (horra, ordeño o novilla) y vuelve al ordeño (DEL 0)
  const madreCache=animalesPorIdM[numMadre];
  const kMadre=(madreCache&&GRUPO_KEY[madreCache.grupo])||'horras';
  const madreCambiaGrupo=kMadre!=='ordeno';   // si ya estaba en ordeño, se queda ahí
  const madreYaEnCows=!!cows.find(c=>c.num===numMadre);
  const madreRaza=(madreCache||{}).raza||null;
  /* snapshots ANTES de mutar nada — el de la BD (madreAntes) es el que corrige
   * un bug real: antes se tomaba DESPUÉS de mutar la madre, así que "Deshacer"
   * revertía bien la pantalla pero NO la base (volvía a escribir el mismo
   * estado post-parto en vez del previo). */
  const madrePrev=madreCache?{...madreCache}:null;
  const madreAntes=madreCache?snapshotReproDBM(madreCache):null;
  let hIdx,removedHorra,deshacerCria;
  const opciones={
    aplicar(){
      partos2026++;
      hIdx=(madreCambiaGrupo&&grupos[kMadre])?grupos[kMadre].animales.findIndex(a=>numDe(a[0])===numMadre):-1;
      removedHorra=hIdx>=0?grupos[kMadre].animales[hIdx]:null;
      if(hIdx>=0){grupos[kMadre].animales.splice(hIdx,1);incGrupo(kMadre,-1);}
      /* la madre vuelve al ordeño (DEL 0), sin preñez: caché, grupo del hato y
       * lista de leche. proximosPartos/vacasVacias/palpCandidatas se recomputan
       * abajo (Estado único) — ya no se parcha proximosPartos a mano. */
      if(madreCache)Object.assign(madreCache,{grupo:'ordeño',del:0,inicioLactancia:fechaP,estadoRepro:null,prenez:null});
      if(madreCambiaGrupo){grupos.ordeno.animales.unshift([numMadre+' · '+nombre,subAnimalM(madreCache||{grupo:'ordeño'}),1]);incGrupo('ordeno',1);}
      if(!madreYaEnCows&&madreCache){cows.push(animalACow(madreCache));renderCows();}
      deshacerCria=()=>{};
      if(parto.estado==='viva'){
        const num=criaIdNueva;
        // la cría viva entra sola al Hato: hembra → Terneras, macho → Machos
        const grupo=parto.sexo==='H'?'terneras':'machos';
        const destino=parto.sexo==='H'?'Terneras':'Machos';
        const prevSub=grupos[grupo].sub, prevHeader=grupos[grupo].header;
        if(parto.sexo==='H'){nTerneras++;subTerneras();}
        else{nMachos++;subMachos();}
        const nombreCria=criaNombreDado||('cría de '+nombre);
        const filaCria=[num+' · '+nombreCria,'recién nacid'+(parto.sexo==='H'?'a':'o')+' · '+parto.peso+' kg · 0 meses',0];
        grupos[grupo].animales.unshift(filaCria);
        /* clicable y en caché apenas se confirme el guardado (ver escribir) */
        parto._filaCria=filaCria;parto._criaDatos={id:num,nombre:criaNombreDado||('Cría de '+nombre),grupo:parto.sexo==='H'?'ternera':'macho',
          sexo:parto.sexo,pesoKg:parto.peso,nacimiento:fechaP,madreId:numMadre,leche:{},prenez:null};
        partosRecientes.unshift({t:parto.cow+' → cría '+num,
          s:fmtFechaCortaM(fechaP)+' · '+sexoTxt+' · viva · '+parto.peso+' kg · '+tipoTxt,badge:'en '+destino,bw:'ok'});
        deshacerCria=()=>{grupos[grupo].animales.shift();grupos[grupo].sub=prevSub;grupos[grupo].header=prevHeader;
          if(parto.sexo==='H')nTerneras--;else nMachos--;if(criaAuto)criaNum--;};
        opciones.mensaje='Parto de '+nombre+' · cría '+num+' ('+sexoTxt+', '+parto.peso+' kg) creada en '+destino+' y vinculada · '+nombre+' al ordeño en DEL 0';
      }else{
        // mortinato: no entra al hato, pero queda registrado
        partosRecientes.unshift({t:parto.cow+' → cría',
          s:fmtFechaCortaM(fechaP)+' · '+sexoTxt+' · nació muerta · '+parto.peso+' kg · '+tipoTxt,badge:'mortinato',bw:'bad'});
        opciones.mensaje='Parto de '+nombre+' · la cría nació muerta — queda en el historial · '+nombre+' al ordeño en DEL 0';
      }
      recomputarReproM();
      encolar();
      renderPartos();renderVacias();renderPalpListaM();
      setTimeout(()=>go('scr-partos'),300);
    },
    /* UNA transacción en la base (cría + parto + madre): o entra todo o nada */
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.registrarPartoCompleto({id:partoId,madreId:numMadre,fecha:fechaP,
        sexo:parto.sexo,pesoKg:parto.peso,tipo:parto.tipo,estadoCria:parto.estado,
        criaId:criaIdNueva,criaNombre:criaIdNueva?(criaNombreDado||('Cría de '+nombre)):null,criaRaza:madreRaza})
        .then(()=>{desencolar();
          if(criaIdNueva&&parto._criaDatos){animalesPorIdM[criaIdNueva]=parto._criaDatos;
            if(parto._filaCria)parto._filaCria[2]=1;}}):null,
    avisoError:()=>'⚠ El parto NO se guardó en la base — revisa la señal y regístralo de nuevo',
    mensaje:null,   // se fija dentro de aplicar() (depende de si vive o no)
    revertir(){
      partosRecientes.shift();
      partos2026--;
      /* revertir la madre: quitarla de ordeño (grupo+cows) y devolverla a su grupo */
      if(madreCambiaGrupo){const oi=grupos.ordeno.animales.findIndex(a=>numDe(a[0])===numMadre);
        if(oi>=0){grupos.ordeno.animales.splice(oi,1);incGrupo('ordeno',-1);}}
      if(!madreYaEnCows){const ci=cows.findIndex(c=>c.num===numMadre);if(ci>=0){cows.splice(ci,1);renderCows();}}
      if(madreCache&&madrePrev)Object.assign(madreCache,madrePrev);
      if(removedHorra&&grupos[kMadre]){grupos[kMadre].animales.splice(Math.min(hIdx,grupos[kMadre].animales.length),0,removedHorra);incGrupo(kMadre,1);}
      recomputarReproM();
      deshacerCria(); desencolar();
      renderPartos();renderVacias();renderPalpListaM();
      snack('Parto deshecho');
    },
    compensarBD:typeof LCStore!=='undefined'?
      ()=>Promise.all([
        LCStore.deleteParto(partoId),
        criaIdNueva?LCStore.deleteAnimal(criaIdNueva):null,
        madreAntes?LCStore.updateAnimalCampos(numMadre,madreAntes):null,
      ]):null,
    snack,
  };
  LCAcciones.ejecutarConDeshacer(opciones);
}
renderPartos();
/* ===== Vacas vacías (se muestran en Reproducción) ===== */
const vacasVacias=[];
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
      '<div><div class="li-title">'+LCRules.esc(v.cow)+'</div>'+
      '<div class="li-sub">'+LCRules.esc(v.sub)+'</div></div>'+
      '<span class="badge bad">vacía '+v.diasVacia+'d</span></div>'+
      '<div style="font-size:12px;color:var(--ink-2);margin-top:8px;line-height:1.5">'+
      'Última palpación: <b>'+v.ultimaPalp+'</b> → '+v.resultado+
      '<br>'+v.accion+'</div>'+
      '<div style="display:flex;gap:8px;margin-top:10px">'+
      '<button class="btn filled small vPalpM">Palpar de nuevo</button>'+
      '<button class="btn outl small vBajaM">Dar de baja</button>'+
      '<button class="btn text small vSecaM">Secar</button></div>';
    d.querySelector('.vPalpM').onclick=()=>openPalp(v.cow);
    d.querySelector('.vBajaM').onclick=()=>openBaja(v.cow);
    d.querySelector('.vSecaM').onclick=()=>openSeca(v.cow);
    list.appendChild(d);
  });
}
renderVacias();   // init: tras declarar vacasVacias y renderVacias (evita TDZ)
/* ===== Palpación (la fuente de verdad de la reproducción) ===== */
const palp={cow:'',resultado:'prenada',meses:2,fecha:''};
/* reglas puras compartidas (core/rules.js) */
const MESC=LCRules.MESC;
const fechaParto=LCRules.fechaParto;
/* ===== Estado único (Fase 6, paso 3): mismo patrón que escritorio — próximos
 * partos / vacías / candidatas a palpar YA NO se parchan a mano por cada
 * acción, se DERIVAN de animalesPorIdM. Formas propias del móvil (distintas de
 * escritorio): vacasVacias solo trae vacías con ≥120 días (no servidas —
 * pantalla de "requieren decisión", no de "todo lo pendiente"); palpCandidatas
 * es un objeto cow→motivo, no un array. */
function derivarProximosPartosM(){
  return Object.values(animalesPorIdM)
    .filter(a=>a.grupo!=='baja'&&a.estadoRepro==='prenada'&&a.prenez&&a.prenez.partoEstimado)
    .sort((x,y)=>x.prenez.partoEstimado<y.prenez.partoEstimado?-1:1)
    .map(a=>{const m=a.prenez.meses;const f=fmtFechaCortaM(a.prenez.partoEstimado);
      return {cow:a.id+' · '+a.nombre,sub:'Preñada '+String(m).replace('.',',')+' meses · parto ~'+f,
        short:'~'+f,badge:MESC[new Date(a.prenez.partoEstimado+'T00:00:00').getMonth()],bw:m>=8?'warn':''};});
}
function derivarVaciasM(){
  return Object.values(animalesPorIdM)
    .filter(a=>a.grupo!=='baja'&&a.estadoRepro==='vacia'&&a.diasVacia&&a.diasVacia>=120)
    .map(a=>({cow:a.id+' · '+a.nombre,del:a.del,diasVacia:a.diasVacia,
      ultimaPalp:fmtFechaCortaM(a.ultimaPalpacion),resultado:'vacía',
      sub:'DEL '+(a.del==null?'—':a.del)+' · '+ordinalPartoM(a.partos)+' · últ. '+((a.leche&&a.leche.ayer!=null)?a.leche.ayer:0)+' L',
      accion:a.del>300?'Lactancia extendida sin preñez — evaluar descarte':'Producción muy baja para su etapa — evaluar descarte'}));
}
function derivarPalpCandidatasM(){
  const out={};
  Object.values(animalesPorIdM).filter(a=>a.grupo!=='baja'&&(a.estadoRepro==='servida'||a.estadoRepro==='vacia')).forEach(a=>{
    out[a.id+' · '+a.nombre]=a.estadoRepro==='servida'?'servida, por confirmar'
      :'vacía'+(a.diasVacia?' hace '+a.diasVacia+' días':', confirmar estado');
  });
  return out;
}
/* llamar SIEMPRE que animalesPorIdM cambie algo reproductivo, antes de
 * renderPartos/renderVacias/renderPalpListaM. proximosPartos es `let`
 * (reasignable); vacasVacias/palpCandidatas son `const` (se limpian y
 * rellenan en el lugar, mismo patrón que ya usaba cargarReproMovil). */
function recomputarReproM(){
  proximosPartos=derivarProximosPartosM();
  porParir=proximosPartos.length;
  vacasVacias.length=0;
  derivarVaciasM().forEach(v=>vacasVacias.push(v));
  Object.keys(palpCandidatas).forEach(k=>delete palpCandidatas[k]);
  Object.assign(palpCandidatas,derivarPalpCandidatasM());
}
/* ===== Cableado a Supabase: reproducción (móvil) ===== */
(async function cargarReproMovil(){
  if(typeof LCStore==='undefined')return;
  try{
    const [animales,partosDB]=await Promise.all([LCStore.getAnimales(),LCStore.getPartos()]);
    if(!animales)return;
    /* llenar la caché canónica GLOBAL (no una copia local): derivarProximosPartosM
     * /derivarVaciasM/derivarPalpCandidatasM leen de animalesPorIdM. Antes este
     * cargador usaba su propia lista local para evitar una carrera con el otro
     * cargador (cacheAnimalesMovil) — ahora cada uno llena la MISMA caché con lo
     * que trae, así que no importa cuál gane. */
    animales.forEach(a=>{animalesPorIdM[a.id]=a;});
    const refP=id=>animalesPorIdM[id]?(id+' · '+animalesPorIdM[id].nombre):id;
    /* próximos partos / vacías / candidatas: derivados de la caché ya llena
     * (Estado único, Fase 6 — ver recomputarReproM). */
    recomputarReproM();
    /* partos recientes (vacío si no hay) */
    partosRecientes=(partosDB||[]).map(p=>{
      const viva=p.estado_cria==='viva';const sx=p.sexo_cria==='H'?'♀ hembra':'♂ macho';
      return {t:refP(p.madre_id)+' → cría'+(p.cria_id?' '+p.cria_id:''),
        s:fmtFechaCortaM(p.fecha)+' · '+sx+' · '+(viva?'viva':'nació muerto')+' · '+(p.peso_kg||0)+' kg · parto '+p.tipo,
        badge:viva?('en '+(p.sexo_cria==='H'?'Terneras':'Machos')):'mortinato',bw:viva?'ok':'bad'};});
    partos2026=partosRecientes.length;
    const A=animales;
    /* KPIs reproductivos reales: preñez % e intervalo entre partos */
    const eleg=A.filter(a=>a.sexo==='H'&&['ordeño','horra','novilla'].includes(a.grupo));
    const pren=eleg.filter(a=>a.estadoRepro==='prenada').length;
    const kPz=document.getElementById('kpiPrenez');
    if(kPz)kPz.innerHTML=(eleg.length?Math.round(pren/eleg.length*100):0)+'<span class="k-unit">%</span>';
    /* intervalo entre partos (meses) desde las fechas reales */
    const porMadre={};(partosDB||[]).forEach(p=>{if(p.madre_id&&p.fecha)(porMadre[p.madre_id]=porMadre[p.madre_id]||[]).push(p.fecha);});
    const gaps=[];Object.values(porMadre).forEach(fs=>{if(fs.length<2)return;const s=fs.slice().sort();
      for(let i=1;i<s.length;i++)gaps.push((new Date(s[i])-new Date(s[i-1]))/86400000);});
    const kIv=document.getElementById('kpiIntervalo');
    if(kIv)kIv.innerHTML=(gaps.length?(gaps.reduce((a,b)=>a+b,0)/gaps.length/30.44).toFixed(1).replace('.',','):'—')+'<span class="k-unit">m</span>';
    const pEl=document.getElementById('reproPartosM');
    if(pEl)pEl.textContent=porParir+' por parir'+(proximosPartos[0]?' · próximo '+proximosPartos[0].short:'');
    /* alerta del próximo parto (real, no fija) */
    const pa=document.getElementById('partoProxAlerta'),pt=document.getElementById('partoProxTitulo');
    if(pa&&pt){ if(proximosPartos[0]){pa.style.display='';pt.textContent=proximosPartos[0].cow.replace(' · ',' ')+' — próximo parto '+proximosPartos[0].short;}
      else pa.style.display='none'; }
    renderPartos();renderVacias();renderPalpListaM();
  }catch(e){console.warn('Reproducción móvil: usando datos locales:',e.message||e);}
})();
function palpMostrarMeses(){document.getElementById('palpMesesWrap').style.display=
  palp.resultado==='prenada'?'':'none';}
/* pinta chips de vacas reales (formato 'id · nombre') en un contenedor */
function pintarCowChips(containerId,lista,current,onPick){
  const c=document.getElementById(containerId);if(!c)return;
  c.innerHTML='';
  if(!lista.length){c.innerHTML='<span style="font-size:12.5px;color:var(--ink-3)">No hay animales disponibles</span>';return;}
  lista.forEach(cw=>{const b=document.createElement('button');b.className='chip'+(cw===current?' sel':'');
    b.textContent=cw.replace(' · ',' ');b.onclick=()=>onPick(cw);c.appendChild(b);});
}
function listaCows(){return cows.map(c=>c.num+' · '+c.n);}
function listaTodos(){return Object.values(animalesPorIdM).filter(a=>a.grupo!=='baja').map(a=>a.id+' · '+a.nombre);}
function palpMarcarVaca(){document.querySelectorAll('#palpCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().split(' ')[0]===numDe(palp.cow)));}
function openPalp(cow){
  const lista=Object.keys(palpCandidatas).length?Object.keys(palpCandidatas):listaCows();
  palp.cow=cow||lista[0]||'';
  palp.resultado='prenada';palp.meses=2;palp.fecha=isoHoyM();
  pintarCowChips('palpCows',lista,palp.cow,palpCow);
  document.getElementById('palpCow').textContent=(palp.cow||'—').toUpperCase();
  document.getElementById('palpInfo').textContent=palpCandidatas[palp.cow]||'Confirma el resultado de la palpación';
  document.getElementById('palpMesesVal').textContent=palp.meses;
  const pf=document.getElementById('palpFecha');if(pf){pf.max=isoHoyM();pf.value=palp.fecha;}
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
  if(!palp.cow||palp.cow.indexOf('·')<0){closePalp();
    snack('No hay vaca seleccionada para palpar');return;}
  closePalp();
  const nombre=palp.cow.split('·')[1].trim();
  const numPalp=numDe(palp.cow);
  const fechaPalp=palp.fecha||isoHoyM();
  const esVacia=palp.resultado==='vacia';
  /* Estado único: snapshot COMPLETO para poder restaurar animalesPorIdM entero
   * al deshacer; proximosPartos/vacasVacias/palpCandidatas se DERIVAN de ella. */
  const animalPrev=animalesPorIdM[numPalp]?{...animalesPorIdM[numPalp]}:null;
  const reproAntes=animalPrev?snapshotReproDBM(animalPrev):null;
  let palpId=null;
  const opciones={
    escribir:typeof LCStore!=='undefined'?()=>{
      const esPren=!esVacia;
      const campos=esPren
        ?{estado_repro:'prenada',prenez_meses:palp.meses,ultima_palpacion:fechaPalp}
        :{estado_repro:'vacia',prenez_meses:null,ultima_palpacion:fechaPalp};
      return LCStore.registrarPalpacion({animalId:numPalp,resultado:palp.resultado,prenezMeses:esPren?palp.meses:null,fecha:fechaPalp})
        .then(r=>{palpId=r&&r.id;return LCStore.updateAnimalCampos(numPalp,campos);}).then(()=>desencolar());
    }:null,
    avisoError:()=>'⚠ La palpación NO se guardó en la base — revisa la señal y reintenta',
    snack,
  };
  if(esVacia){
    opciones.aplicar=()=>{
      encolar();
      if(animalesPorIdM[numPalp])Object.assign(animalesPorIdM[numPalp],{estadoRepro:'vacia',
        prenez:null,ultimaPalpacion:fechaPalp,secarEstimado:null,
        diasVacia:LCRules.diasVaciaCalc(fechaPalp,isoHoyM())});
      recomputarReproM();
      renderVacias();renderPalpListaM();
      setTimeout(()=>go('scr-repro'),300);
    };
    opciones.mensaje=nombre+': vacía — queda en la lista para servicio';
    /* sin "Deshacer": así era en el original */
  }else{
    const f=fechaParto(palp.meses);
    opciones.aplicar=()=>{
      encolar();
      if(animalesPorIdM[numPalp])Object.assign(animalesPorIdM[numPalp],{estadoRepro:'prenada',
        prenez:{meses:palp.meses,partoEstimado:LCRules.partoEstimadoCalc(fechaPalp,palp.meses),ultimaPalpacion:fechaPalp},
        ultimaPalpacion:fechaPalp,secarEstimado:LCRules.secarCalc(fechaPalp,palp.meses),diasVacia:null});
      recomputarReproM();
      renderPartos();renderVacias();renderPalpListaM();
      setTimeout(()=>go('scr-partos'),300);
    };
    opciones.mensaje=nombre+': preñada '+palp.meses+' meses — parto estimado '+f.corta+' · entra a los próximos partos';
    opciones.revertir=()=>{
      if(animalPrev&&animalesPorIdM[numPalp])animalesPorIdM[numPalp]=animalPrev;
      recomputarReproM();
      desencolar();renderPartos();renderVacias();renderPalpListaM();snack('Palpación deshecha');
    };
    if(typeof LCStore!=='undefined'){
      opciones.compensarBD=()=>Promise.all([
        palpId?LCStore.deletePalpacion(palpId):null,
        reproAntes?LCStore.updateAnimalCampos(numPalp,reproAntes):null,
      ]);
    }
  }
  LCAcciones.ejecutarConDeshacer(opciones);
}
/* ===== Enfermedad / tratamiento (activa el retiro de leche) ===== */
const fechaDias=LCRules.fechaDias;
const trata={cow:'',problema:'Mastitis',medicina:'Antibiótico',retiro:4};
function trataMarcarVaca(){document.querySelectorAll('#trataCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().split(' ')[0]===numDe(trata.cow)));}
function openTrata(cow){
  const lista=listaTodos();
  trata.cow=cow||lista[0]||'';
  trata.problema='Mastitis';trata.medicina='Antibiótico';trata.retiro=4;
  pintarCowChips('trataCows',lista,trata.cow,trataCow);
  document.getElementById('trataCow').textContent=(trata.cow||'—').toUpperCase();
  const cd=cows.find(c=>numDe(trata.cow)===c.num);
  document.getElementById('trataInfo').textContent=cd?cd.del:'Selecciona el problema y el tratamiento';
  document.getElementById('trataRetiroVal').textContent=trata.retiro;
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
  const cd=cows.find(c=>numDe(cow)===c.num);
  document.getElementById('trataInfo').textContent=cd?cd.del:'Selecciona el problema y el tratamiento';
  trataMarcarVaca();}
function trataPick(btn,campo,val){trata[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function trataRetiro(d){trata.retiro=Math.max(0,Math.min(10,trata.retiro+d));
  document.getElementById('trataRetiroVal').textContent=trata.retiro;}
function saveTrata(){
  if(!trata.cow){closeTrata();snack('No hay animales para tratar — registra el hato primero');return;}
  closeTrata();
  const cd=cows.find(c=>numDe(trata.cow)===c.num);
  const nombre=trata.cow.split('·')[1].trim();
  const prev=cd?cd.retiro:undefined;
  /* id conocido de antemano para poder BORRAR el tratamiento si se deshace */
  const tid=LCRules.idUnico('T-');
  const base='Tratamiento de '+trata.problema.toLowerCase()+' en '+nombre+' ('+trata.medicina.toLowerCase()+')';
  const msg=trata.retiro>0
    ? base+' · retiro de leche '+trata.retiro+'d (hasta '+fechaDias(trata.retiro)+') — no vender su leche'
    : base+' · sin retiro de leche';
  LCAcciones.ejecutarConDeshacer({
    aplicar(){
      if(cd)cd.retiro=trata.retiro||undefined;
      renderCows();encolar();
      setTimeout(()=>go('scr-ordeno'),300);
    },
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.registrarTratamiento({id:tid,animalId:numDe(trata.cow),problema:trata.problema,
        medicamento:trata.medicina,diasRetiro:trata.retiro}).then(()=>{desencolar();cargarTratamientosMovil();}):null,
    avisoError:()=>'⚠ El tratamiento NO se guardó en la base — revisa la señal y reintenta',
    mensaje:msg,
    revertir(){
      if(cd)cd.retiro=prev;renderCows();desencolar();snack('Tratamiento deshecho');
    },
    compensarBD:typeof LCStore!=='undefined'?
      ()=>LCStore.deleteTratamiento(tid).then(()=>cargarTratamientosMovil()):null,
    snack,
  });
}
/* ===== Secado (sale del ordeño → pasa a horras) ===== */
const seca={cow:''};
let nHorras=0;
function secaMarcar(){document.querySelectorAll('#secaCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().split(' ')[0]===numDe(seca.cow)));}
function openSeca(cow){
  const lista=listaCows();
  seca.cow=cow||lista[0]||'';
  pintarCowChips('secaCows',lista,seca.cow,secaCow);
  document.getElementById('secaCow').textContent=(seca.cow||'—').toUpperCase();
  document.getElementById('secaInfo').textContent='Confirma la preñez antes de secar';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('secaSheet').classList.add('show');
}
function closeSeca(){document.getElementById('secaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function secaCow(cow){seca.cow=cow;
  document.getElementById('secaCow').textContent=cow.toUpperCase();
  document.getElementById('secaInfo').textContent='Confirma la preñez antes de secar';
  secaMarcar();}
function saveSeca(){
  if(!seca.cow||seca.cow.indexOf('·')<0){closeSeca();
    snack('No hay vaca seleccionada para secar');return;}
  const nombre=seca.cow.split('·')[1].trim();
  closeSeca();
  const numSeca=numDe(seca.cow);
  const idx=cows.findIndex(c=>numSeca===c.num);
  const removed=idx>=0?cows[idx]:null;
  const prevSub=grupos.horras.sub, prevHeader=grupos.horras.header;
  /* Estado único: snapshot COMPLETO (no solo inicio_lactancia) para restaurar
   * animalesPorIdM entero al deshacer. */
  const animalPrev=animalesPorIdM[numSeca]?{...animalesPorIdM[numSeca]}:null;
  const prevInicio=animalPrev?animalPrev.inicioLactancia:null;
  const prevGrupo=animalPrev?animalPrev.grupo:'ordeño';
  LCAcciones.ejecutarConDeshacer({
    aplicar(){
      if(idx>=0)cows.splice(idx,1);
      renderCows();
      nHorras++;subHorras();
      grupos.horras.animales.unshift([seca.cow,'recién secada — preñada']);
      /* mantener animalesPorIdM al día: sin esto quedaba desincronizada del
       * hato hasta el próximo recargo (Estado único, Fase 6). */
      if(animalesPorIdM[numSeca])Object.assign(animalesPorIdM[numSeca],{grupo:'horra',inicioLactancia:null,del:null});
      encolar();
      setTimeout(()=>openGroup('horras'),300);
    },
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.updateAnimalCampos(numSeca,{grupo:'horra',inicio_lactancia:null}).then(()=>desencolar()):null,
    avisoError:()=>'⚠ El secado NO se guardó en la base — revisa la señal y reintenta',
    mensaje:nombre+' secada · sale del ordeño y pasa a horras · se planea su parto',
    revertir(){
      if(removed)cows.splice(Math.min(idx,cows.length),0,removed);
      renderCows();
      nHorras--; grupos.horras.sub=prevSub; grupos.horras.header=prevHeader; grupos.horras.animales.shift();
      if(animalPrev&&animalesPorIdM[numSeca])animalesPorIdM[numSeca]=animalPrev;
      desencolar(); openGroup('horras'); snack('Secado deshecho');
    },
    compensarBD:typeof LCStore!=='undefined'?
      ()=>LCStore.updateAnimalCampos(numSeca,{grupo:prevGrupo,inicio_lactancia:prevInicio}):null,
    snack,
  });
}
/* ===== Alta y Baja (inventario del hato) ===== */
let nOrdeno=0, nNovillas=0, nBajas=0;   // se sincronizan con datos reales en cacheAnimalesMovil
/* subtítulos/headers derivados del CONTEO real (sin cualitativos inventados) */
function subOrdeno(){grupos.ordeno.sub=nOrdeno+' vacas en ordeño';
  grupos.ordeno.header='<b>'+nOrdeno+' vacas en ordeño.</b>';}
function subNovillas(){grupos.novillas.sub=nNovillas+' novillas';
  grupos.novillas.header='<b>'+nNovillas+' novillas de vientre.</b>';}
function subTerneras(){grupos.terneras.sub=nTerneras+' terneras';
  grupos.terneras.header='<b>'+nTerneras+' terneras.</b>';}
function subMachos(){grupos.machos.sub=nMachos+' machos';
  grupos.machos.header='<b>'+nMachos+' machos.</b>';}
function subHorras(){grupos.horras.sub=nHorras+' vacas horras';
  grupos.horras.header='<b>'+nHorras+' vacas horras.</b>';}
function subBajas(){grupos.bajas.sub=nBajas+' fuera del hato';
  grupos.bajas.header='<b>'+nBajas+' bajas.</b> Su historia se conserva.';}
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
const alta={tipo:'Novilla',raza:'Holstein × Gyr',edad:2,origen:'nacido_finca',num:'',nombre:'',nacimiento:'',procedencia:'',valor:''};
let altaSeq=0, toroSeq=0;   // se re-siembran desde el mayor id real
/* siguiente número libre para hembras (el mayor numérico + 1) */
function _siguienteNumM(){
  const nums=Object.keys(animalesPorIdM).map(x=>parseInt(x,10)).filter(n=>!isNaN(n));
  return String(Math.max(altaSeq,...(nums.length?nums:[0]))+1).padStart(3,'0');}
function openAlta(){alta.tipo='Novilla';alta.raza='Holstein × Gyr';alta.edad=2;
  alta.origen='nacido_finca';alta.num='';alta.nombre='';alta.nacimiento='';alta.procedencia='';alta.valor='';
  const grupos2=document.querySelectorAll('#altaSheet .chips');
  grupos2[0].querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('sel',i===0));
  grupos2[1].querySelectorAll('.chip').forEach(c=>c.classList.toggle('sel',c.textContent.trim()==='Novilla'));
  grupos2[2].querySelectorAll('.chip').forEach(c=>c.classList.toggle('sel',c.textContent.trim()==='Holstein × Gyr'));
  document.getElementById('altaEdadVal').textContent=alta.edad;
  ['altaNum','altaNombre','altaNac','altaProc','altaValor'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const na=document.getElementById('altaNac');if(na)na.max=isoHoyM();   // sin fechas futuras
  const n=document.getElementById('altaNum');if(n)n.placeholder=_siguienteNumM()+' (siguiente libre)';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('altaSheet').classList.add('show');}
function closeAlta(){document.getElementById('altaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function altaPick(btn,campo,val){alta[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function altaEdad(d){alta.edad=Math.max(0,Math.min(15,alta.edad+d));
  document.getElementById('altaEdadVal').textContent=alta.edad;}
function saveAlta(){
  const g=altaGrupo[alta.tipo];
  /* número: el que teclee la dueña (validado) o el siguiente libre */
  let num=(alta.num||'').trim();
  if(num){
    if(animalesPorIdM[num]){snack('⚠ El número '+num+' ya existe — usa otro');return;}
  }else{
    num=g==='machos'?'T0'+(++toroSeq):_siguienteNumM();
    if(animalesPorIdM[num]){snack('⚠ El número '+num+' ya existe — revisa e ingrésalo a mano');return;}
  }
  closeAlta();
  const comprada=alta.origen==='comprado';
  const nombre=(alta.nombre||'').trim()||(comprada?'(compra)':'(sin nombre)');
  const fila=[num+' · '+nombre,alta.raza+' · '+alta.edad+' años · '+alta.tipo.toLowerCase()+(comprada?' comprada':''),0];
  grupos[g].animales.unshift(fila);
  incGrupo(g,1);encolar();
  if(typeof LCStore!=='undefined'){
    const GM={ordeno:'ordeño',novillas:'novilla',terneras:'ternera',machos:'macho'};
    LCStore.insertAnimal({id:num,nombre:nombre,raza:alta.raza,grupo:GM[g]||'novilla',
      sexo:g==='machos'?'M':'H',edadAnios:alta.edad,nacimiento:alta.nacimiento||null,
      origen:alta.origen||'nacido_finca',
      procedencia:comprada?(alta.procedencia||null):null,
      valorCompra:(comprada&&alta.valor)?parseInt(String(alta.valor).replace(/\D/g,'')):null})
      .then(a=>{desencolar();
        /* al caché y clicable: su ficha abre sin recargar la página */
        if(a)animalesPorIdM[a.id]=a;fila[2]=1;
        /* si entró "en ordeño", aparece YA en la lista de leche (P1) */
        if(a&&g==='ordeno'&&!cows.find(c=>c.num===num)){cows.push(animalACow(a));renderCows();}})
      .catch(e=>{console.warn('Alta móvil no guardada:',e.message||e);
        if(e&&e.code==='ID_DUPLICADO')snack('⚠ El número '+num+' ya existe (¿lo tomó otro dispositivo?) — deshaz y usa otro número');
        else snack('⚠ El animal NO se guardó en la base — revisa la señal y reintenta');});
  }
  setTimeout(()=>openGroup(g),300);
  const extra=(comprada&&alta.procedencia?' · '+alta.procedencia:'')+(comprada&&alta.valor?' · $'+alta.valor:'');
  snack((comprada?'Compra: ':'Alta: ')+num+' ('+alta.tipo.toLowerCase()+', '+alta.raza+')'+extra+' — entró al hato','Deshacer',()=>{
    grupos[g].animales.shift();incGrupo(g,-1);
    /* NO decrementar las secuencias: reusar el id puede chocar con la PK si
     * hubo otra alta en el medio; mejor saltar el número. */
    delete animalesPorIdM[num];
    const ci=cows.findIndex(c=>c.num===num);if(ci>=0){cows.splice(ci,1);renderCows();}
    desencolar();openGroup(g);snack('Alta deshecha');
    if(typeof LCStore!=='undefined')LCStore.deleteAnimal(num).catch(()=>{});
  });
}
/* --- Baja (venta / muerte / descarte / pérdida) --- */
const baja={cow:'',motivo:'Venta',fecha:'',valor:'',nota:''};
function bajaMarcar(){document.querySelectorAll('#bajaCows .chip').forEach(c=>
  c.classList.toggle('sel',c.textContent.trim().split(' ')[0]===numDe(baja.cow)));}
function openBaja(cow){
  const lista=listaTodos();
  baja.cow=cow||lista[0]||'';baja.motivo='Venta';baja.fecha=isoHoyM();baja.valor='';baja.nota='';
  pintarCowChips('bajaCows',lista,baja.cow,bajaCow);
  document.getElementById('bajaCow').textContent=(baja.cow||'—').toUpperCase();
  const cd=cows.find(c=>numDe(baja.cow)===c.num);
  document.getElementById('bajaInfo').textContent=cd?cd.del:'Elige el animal y el motivo';
  document.querySelectorAll('#bajaSheet .chips')[1].querySelectorAll('.chip')
    .forEach((c,i)=>c.classList.toggle('sel',i===0));
  const bf=document.getElementById('bajaFecha');if(bf){bf.max=isoHoyM();bf.value=baja.fecha;}
  const bv=document.getElementById('bajaValor');if(bv)bv.value='';
  const bn=document.getElementById('bajaNota');if(bn)bn.value='';
  document.getElementById('scrim').classList.add('show');
  document.getElementById('bajaSheet').classList.add('show');}
function closeBaja(){document.getElementById('bajaSheet').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');}
function bajaCow(cow){baja.cow=cow;
  document.getElementById('bajaCow').textContent=cow.toUpperCase();
  const cd=cows.find(c=>numDe(cow)===c.num);
  document.getElementById('bajaInfo').textContent=cd?cd.del:'Elige el animal y el motivo';
  bajaMarcar();}
function bajaPick(btn,campo,val){baja[campo]=val;
  [...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));}
function saveBaja(){
  if(!baja.cow||baja.cow.indexOf('·')<0){closeBaja();
    snack('No hay animal seleccionado para dar de baja');return;}
  closeBaja();
  const nombre=baja.cow.split('·')[1].trim();
  const fecha=baja.fecha||isoHoyM();
  const valor=(baja.valor!==''&&baja.valor!=null)?parseInt(String(baja.valor).replace(/\D/g,'')):null;
  const nota=(baja.nota||'').trim()||null;
  const idx=cows.findIndex(c=>numDe(baja.cow)===c.num);
  const removed=idx>=0?cows[idx]:null;
  const numBaja=numDe(baja.cow);
  let grupoBaja=null,idxGrupo=-1,filaGrupo=null;
  const prevGrupoCache=animalesPorIdM[numBaja]?animalesPorIdM[numBaja].grupo:null;
  LCAcciones.ejecutarConDeshacer({
    aplicar(){
      if(idx>=0){cows.splice(idx,1);renderCows();incGrupo('ordeno',-1);}
      nBajas++;subBajas();
      grupos.bajas.animales.unshift([baja.cow,baja.motivo.toUpperCase()+' · '+fmtFechaCortaM(fecha)+' · registrada']);
      encolar();
      /* sacar del drill-down de su grupo y del caché (antes seguía apareciendo) */
      Object.keys(grupos).forEach(k=>{ if(k==='bajas'||grupoBaja)return;
        const i=grupos[k].animales.findIndex(x=>numDe(x[0])===numBaja);
        if(i>=0){grupoBaja=k;idxGrupo=i;filaGrupo=grupos[k].animales[i];grupos[k].animales.splice(i,1);}});
      if(animalesPorIdM[numBaja]){animalesPorIdM[numBaja].grupo='baja';
        animalesPorIdM[numBaja].baja={motivo:baja.motivo,fecha:fecha,valor:valor,nota:nota};}
      /* grupo:'baja' también la saca YA de próximos partos/vacías/candidatas
       * (Estado único: esas listas filtran grupo!=='baja'). */
      recomputarReproM();
      renderHatoM();renderPartos();renderVacias();renderPalpListaM();
      setTimeout(()=>openGroup('bajas'),300);
    },
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.darDeBaja(numBaja,{motivo:baja.motivo,fecha:fecha,valor:valor,nota:nota}).then(()=>desencolar()):null,
    avisoError:()=>'⚠ La baja NO se guardó en la base — revisa la señal y reintenta',
    mensaje:nombre+': baja por '+baja.motivo.toLowerCase()+' — sale del hato, su historia se conserva',
    revertir(){
      if(removed){cows.splice(Math.min(idx,cows.length),0,removed);renderCows();incGrupo('ordeno',1);}
      nBajas--;subBajas();grupos.bajas.animales.shift();
      /* reponer en su grupo y en el caché (con el grupo PREVIO, no 'baja') */
      if(grupoBaja&&filaGrupo)grupos[grupoBaja].animales.splice(Math.min(idxGrupo,grupos[grupoBaja].animales.length),0,filaGrupo);
      if(prevGrupoCache&&animalesPorIdM[numBaja]){animalesPorIdM[numBaja].grupo=prevGrupoCache;animalesPorIdM[numBaja].baja=null;}
      recomputarReproM();
      renderHatoM();renderPartos();renderVacias();renderPalpListaM();
      desencolar();openGroup('bajas');snack('Baja deshecha');
    },
    compensarBD:typeof LCStore!=='undefined'?
      ()=>LCStore.updateAnimalCampos(numBaja,
        {grupo:prevGrupoCache||'ordeño',baja_motivo:null,baja_fecha:null,baja_valor:null,baja_nota:null}):null,
    snack,
  });
}
/* accesibilidad: hojas anunciadas como diálogo y cierre con Escape */
document.querySelectorAll('.sheet').forEach(el=>{el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){const sc=document.getElementById('scrim');
    if(sc&&sc.classList.contains('show'))sc.click();}
});

/* si la pestaña queda abierta de un día para otro, recargar al cambiar la
 * fecha (solo sin hojas abiertas) para que "hoy" no quede congelado en ayer */
(function(){
  const dia0=isoHoyM();
  function chequearDia(){ if(isoHoyM()!==dia0&&!document.querySelector('.sheet.show'))location.reload(); }
  setInterval(chequearDia,5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)chequearDia();});
})();

/* reloj real en la barra de estado */
function tickReloj(){
  const el=document.getElementById('mClock');if(!el)return;
  const d=new Date();
  el.textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
tickReloj();setInterval(tickReloj,15000);

/* la app arranca en el selector de línea de negocio */
go('scr-selector');

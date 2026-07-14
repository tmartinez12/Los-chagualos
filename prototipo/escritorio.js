/* Bandera para ocultar Potreros por ahora (poner true para reactivarlo). */
const POTREROS_VISIBLE=false;
/* Caché id→animal (forma canónica) para fichas, inicio y genealogía.
   Declarada aquí arriba para evitar TDZ: el arranque (renderHato/renderInicio)
   corre antes de la línea donde se llena desde Supabase. */
let animalesPorId={};
let _palpaciones=[];   // todas las palpaciones (cache para la ficha y el historial)
/* Banner de estado de la conexión: "cargando…" al abrir, error visible si la
 * base no responde (antes un fallo de red se veía igual que una finca vacía). */
function estadoBase(txt,esError){
  let b=document.getElementById('estadoBase');
  if(!txt){if(b)b.remove();return;}
  if(!b){b=document.createElement('div');b.id='estadoBase';
    b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:200;text-align:center;font-size:12.5px;font-weight:600;padding:7px 12px;color:#fff';
    document.body.appendChild(b);}
  b.style.background=esError?'#B3261E':'#5f6659';
  b.innerHTML=txt+(esError?' — <a onclick="location.reload()" style="color:#fff;text-decoration:underline;cursor:pointer">reintentar</a>':'');
}
estadoBase('Cargando los datos de la finca…');

let _ultimoParto={};   // madre_id → fecha ISO del último parto
let _partosPorMadre={};// madre_id → [fechas ISO] (para intervalo entre partos)
function _diasEntre(isoA,isoB){return Math.round((new Date(isoA+'T00:00:00')-new Date(isoB+'T00:00:00'))/86400000);}
/* días abiertos = días desde el último parto (si se conoce) */
function _diasAbiertos(id){const f=_ultimoParto[id];if(!f)return null;const d=_diasEntre(isoHoy(),f);return d>=0?d:null;}
/* intervalo promedio entre partos (en días) del hato */
function _intervaloPartosProm(){
  const gaps=[];
  Object.values(_partosPorMadre).forEach(fs=>{if(!fs||fs.length<2)return;
    const s=fs.slice().sort();for(let i=1;i<s.length;i++)gaps.push(_diasEntre(s[i],s[i-1]));});
  return gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:null;
}
/* intervalo entre partos de UNA vaca (días); null si tiene menos de 2 partos */
function intervaloPartosVaca(id){
  const fs=(_partosPorMadre[id]||[]).slice().sort();
  if(fs.length<2)return null;
  const gaps=[];for(let i=1;i<fs.length;i++)gaps.push(_diasEntre(fs[i],fs[i-1]));
  return gaps.reduce((a,b)=>a+b,0)/gaps.length;
}
/* producción por lactancia: los ordeños agrupados entre parto y parto.
   Devuelve [{n, inicio, fin(null=en curso), total, diasReg, prom}] reciente primero. */
function produccionPorLactancia(id){
  const fechas=(_partosPorMadre[id]||[]).slice().sort();
  if(!fechas.length)return [];
  const ords=(_ordsRaw||[]).filter(o=>String(o.animal_id)===String(id));
  const out=[];
  for(let i=0;i<fechas.length;i++){
    const ini=fechas[i],fin=(i+1<fechas.length)?fechas[i+1]:null;
    const enRango=ords.filter(o=>o.fecha>=ini&&(!fin||o.fecha<fin));
    const total=enRango.reduce((s,o)=>s+(Number(o.litros)||0),0);
    out.push({n:i+1,inicio:ini,fin:fin,total:Math.round(total),diasReg:enRango.length,
      prom:enRango.length?total/enRango.length:null});
  }
  return out.reverse();
}
const titles={
  'pg-leche':['Producción de leche','Ordeño, histórico y días en leche'],
  'pg-hato':['Hato','Animales · unidad leche'],
  'pg-potreros':['Potreros','Descanso y rotación del hato'],
  'pg-repro':['Reproducción','Monta natural · la palpación manda'],
  'pg-partos':['Partos','Las palpaciones marcan las fechas'],
  'pg-sanitario':['Plan sanitario','Calendario anual · protocolos · soporte ICA'],
};
let currentPg='pg-leche';
/* subtítulo dinámico: refleja el estado real en vez de un valor fijo */
function subFor(id){
  try{
    if(id==='pg-leche'){
      const n=(typeof animalesPorId!=='undefined')?Object.values(animalesPorId).filter(a=>a.grupo==='ordeño').length:0;
      const ps=(typeof vacasPorSecar==='function')?vacasPorSecar().length:0;
      return n+' vacas en ordeño'+(ps?' · '+ps+' por secar este mes':'');
    }
    if(id==='pg-hato'){
      const ordeño=hato.filter(a=>a.grupo==='En ordeño').length;
      const prenadas=hato.filter(a=>a.tags.includes('prenada')).length;
      return hato.length+' animales · '+ordeño+' en ordeño · '+prenadas+(prenadas===1?' preñada':' preñadas');
    }
    if(id==='pg-partos'){
      const np=(typeof partosDelAnio==='function'?partosDelAnio().length:partosRecientes.length);
      return np+' partos en '+ANIO_SEL+' · '+proximosPartos.length+' por parir';
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
  document.querySelector('.content').scrollTop=0;
  /* el scatter mide su contenedor al dibujarse; si la ventana se redimensionó
   * mientras esta página estaba oculta (ancho medido = 0), re-dibujar ahora que
   * es visible para que tome el tamaño correcto. */
  if(id==='pg-leche'&&typeof renderScatters==='function')renderScatters();
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
    setNavBadge('navBadgeLeche',milkPend);
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
    const trendM=allM?(lecheHoy>ayerM?'<div class="k-trend up">↑ '+(lecheHoy-ayerM)+' L vs ayer</div>':
        lecheHoy<ayerM?'<div class="k-trend down">↓ '+(ayerM-lecheHoy)+' L vs ayer</div>':'<div class="k-trend mut">= que ayer</div>')
      :'<div class="k-trend mut">registrando…</div>';
    kp.innerHTML=
      '<div class="card kpi"><div class="k-label">Leche hoy</div>'+
        '<div class="k-value">'+(allM?lecheHoy+' <span class="k-unit">L</span>':doneM.length+'<span class="k-unit"> de '+milkCows.length+'</span>')+'</div>'+trendM+'</div>';
  }
  const al=document.getElementById('inicioAlertas');
  if(al){
    const alertas=[];
    if(POTREROS_VISIBLE)try{const occ=pots.find(p=>p.d<0);const sug=pots.find(p=>p.sugerido);
      if(occ)alertas.push({cls:'urgent',title:'Hato: día '+Math.abs(occ.d)+' en el potrero '+occ.n+' — mover hoy',
        sub:sug?'Sugerido: P'+sug.n+' · '+sug.d+' días de descanso':'Revisar potreros disponibles',btn:'Ver potreros',pg:'pg-potreros'});
    }catch(e){}
    try{Object.values(animalesPorId).filter(a=>a.estadoRepro==='vacia'&&a.diasVacia&&a.diasVacia>=120).slice(0,2).forEach(a=>{
      alertas.push({cls:'urgent',title:'Vaca '+a.id+' "'+a.nombre+'": vacía '+a.diasVacia+' días',
        sub:'Requiere decisión: palpar, servir o evaluar descarte',btn:'Ver reproducción',pg:'pg-repro'});});
    }catch(e){}
    try{Object.values(animalesPorId).filter(a=>a.grupo==='ordeño'&&a.prenez&&a.prenez.meses>=7).slice(0,2).forEach(a=>{
      alertas.push({cls:'warn',title:'Vaca '+a.id+' "'+a.nombre+'": programar secado',
        sub:'Preñada '+a.prenez.meses+' meses'+(a.secarEstimado?' — secar ~'+fmtFechaCorta(a.secarEstimado):' — secar ~2 meses antes del parto')});});
    }catch(e){}
    try{Object.values(animalesPorId).filter(a=>a.retiroLecheHasta&&diasHasta(a.retiroLecheHasta)>=0).slice(0,2).forEach(a=>{
      const d=diasHasta(a.retiroLecheHasta);
      alertas.push({cls:'info',title:'Retiro de leche: vaca '+a.id+(d===1?' — falta 1 día':' — faltan '+d+' días'),
        sub:'No vender su leche hasta '+fmtFechaCorta(a.retiroLecheHasta)});});
    }catch(e){}
    al.innerHTML=alertas.length?alertas.map(a=>'<div class="alert '+a.cls+'"><div style="flex:1">'+
      '<div class="a-title">'+LCRules.esc(a.title)+'</div><div class="a-sub">'+LCRules.esc(a.sub)+'</div>'+
      (a.btn?'<button class="btn outl small" style="margin-top:8px" onclick="go(\''+a.pg+'\')">'+a.btn+'</button>':'')+
      '</div></div>').join('')
      :'<div class="card flat" style="text-align:center;color:var(--ink-3);padding:14px;font-size:13px">Sin alertas por ahora</div>';
  }
}

/* ===== Copia de seguridad (descargar / restaurar) ===== */
async function descargarRespaldo(){
  if(typeof LCStore==='undefined'){snack('No hay conexión con la base para respaldar');return;}
  snack('Preparando respaldo…');
  try{
    const data=await LCStore.exportarTodo();
    const total=Object.values(data.tablas).reduce((s,f)=>s+f.length,0);
    const hoy=isoHoy();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='respaldo-los-chagualos-'+hoy+'.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    const est=document.getElementById('respaldoEstado');
    if(est)est.textContent='· último: '+hoy+' ('+total+' registros).';
    snack('Respaldo descargado: '+total+' registros');
  }catch(e){console.warn('Respaldo:',e.message||e);snack('No se pudo crear el respaldo: '+(e.message||e));}
}
function restaurarRespaldo(input){
  const f=input.files&&input.files[0];input.value='';
  if(!f)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    let data;
    try{data=JSON.parse(ev.target.result);}catch(_){snack('El archivo no es un respaldo válido');return;}
    if(!data||!data.tablas){snack('El archivo no es un respaldo de Los Chagualos');return;}
    const total=Object.values(data.tablas).reduce((s,fl)=>s+(fl?fl.length:0),0);
    const fecha=data.fecha?data.fecha.slice(0,10):'desconocida';
    if(!confirm('Vas a restaurar el respaldo del '+fecha+' ('+total+' registros).\n\n'+
      'Esto vuelve a cargar esos datos en la base (los registros con el mismo código se sobrescriben). '+
      '¿Continuar?'))return;
    if(typeof LCStore==='undefined'){snack('No hay conexión con la base');return;}
    snack('Restaurando…');
    try{
      await LCStore.restaurarTodo(data);
      snack('Respaldo restaurado: '+total+' registros. Recargando…');
      setTimeout(()=>location.reload(),1400);
    }catch(e){console.warn('Restaurar:',e.message||e);snack('No se pudo restaurar: '+(e.message||e));}
  };
  reader.readAsText(f);
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

/* ===== KPIs dinámicos de producción ===== */
/* vacas que deben secarse este mes: en ordeño, preñadas, que llegan a 7 meses
   de gestación en el mes actual (o ya lo pasaron y siguen en ordeño). */
function vacasPorSecar(){
  const enOrdeno=Object.values(animalesPorId).filter(a=>a.grupo==='ordeño');
  const now=new Date(),ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  return enOrdeno.filter(a=>a.prenez&&(
    (a.secarEstimado&&String(a.secarEstimado).slice(0,7)<=ym) ||
    (a.prenez.meses!=null&&a.prenez.meses>=7)));
}
function renderLecheKpis(){
  const box=document.getElementById('lecheKpis');if(!box)return;
  const enOrdeno=Object.values(animalesPorId).filter(a=>a.grupo==='ordeño');
  const nOrdeno=enOrdeno.length;
  const now=new Date(),ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  /* totales del hato por fecha y por vaca (desde los ordeños) */
  const porFecha={},porCow={};
  for(const k in ordenosDiaMap){const i=k.indexOf('|'),cow=k.slice(0,i),f=k.slice(i+1),v=Number(ordenosDiaMap[k])||0;
    porFecha[f]=(porFecha[f]||0)+v;(porCow[cow]=porCow[cow]||{})[f]=v;}
  const fechas=Object.keys(porFecha).sort().reverse();
  const semana=fechas.slice(0,7),prevSemana=fechas.slice(7,14);
  const promDe=ds=>ds.length?Math.round(ds.reduce((s,f)=>s+porFecha[f],0)/ds.length):0;
  const promDia=promDe(semana),promPrev=promDe(prevSemana);
  const promVaca=(nOrdeno&&promDia)?(promDia/nOrdeno).toFixed(1):null;
  /* tendencia: esta semana vs la anterior */
  let trend='<span class="mut">'+(promVaca?promVaca+' L/vaca · última semana':'registra ordeños para verlo')+'</span>';
  if(promDia&&promPrev){const d=promDia-promPrev,pct=Math.round(Math.abs(d)/promPrev*100);
    trend=(d>0?'<span class="up">↑ '+pct+'% vs semana pasada</span>':d<0?'<span class="down">↓ '+pct+'% vs semana pasada</span>':'<span class="mut">= que la semana pasada</span>')+
      (promVaca?' <span class="mut">· '+promVaca+' L/vaca</span>':'');}
  const porSecar=vacasPorSecar();
  box.innerHTML=
    '<div class="card kpi"><div class="k-label">Vacas en ordeño</div>'+
      '<div class="k-value">'+nOrdeno+'</div><div class="k-trend mut">dando leche ahora</div></div>'+
    '<div class="card kpi"><div class="k-label">Promedio diario</div>'+
      '<div class="k-value">'+(promDia||'—')+' <span class="k-unit">L/día</span></div><div class="k-trend">'+trend+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Por secar este mes</div>'+
      '<div class="k-value'+(porSecar.length?' down':'')+'">'+porSecar.length+'</div><div class="k-trend mut">a 7 meses de preñez</div></div>';
  /* bajón por vaca: cayó >15% respecto a su propia semana anterior */
  const bajon=[];
  if(semana.length&&prevSemana.length){
    enOrdeno.forEach(a=>{const c=porCow[a.id];if(!c)return;
      const vt=semana.map(f=>c[f]).filter(v=>v!=null),vp=prevSemana.map(f=>c[f]).filter(v=>v!=null);
      if(vt.length&&vp.length){const at=vt.reduce((s,x)=>s+x,0)/vt.length,ap=vp.reduce((s,x)=>s+x,0)/vp.length;
        if(ap>0&&at<ap*0.85)bajon.push({a,pct:Math.round((ap-at)/ap*100),at:at.toFixed(1),ap:ap.toFixed(1)});}});
    bajon.sort((x,y)=>y.pct-x.pct);
  }
  const bajonBox=document.getElementById('bajonLista');
  if(bajonBox){ if(bajon.length){bajonBox.style.display='';
      bajonBox.innerHTML='<b style="color:var(--red)">⚠ Bajaron esta semana</b> (revisa mastitis, celo o alimentación): '+
        bajon.map(b=>'<a class="goVacaLink" data-gocow="'+LCRules.esc(b.a.id)+'" style="cursor:pointer;text-decoration:underline">'+LCRules.esc(b.a.id)+' '+LCRules.esc(b.a.nombre)+'</a> −'+b.pct+'% ('+b.ap+'→'+b.at+' L)').join(' · ');
      bajonBox.querySelectorAll('.goVacaLink').forEach(el=>{el.onclick=()=>goVaca(el.dataset.gocow,'pg-leche');});
    }else bajonBox.style.display='none';}
  /* TARJETA-RESUMEN única: hato · por secar · producción del año · sin registrar */
  const resBox=document.getElementById('hatoResumenLeche');
  if(resBox){
    const dels=enOrdeno.map(a=>a.del).filter(d=>typeof d==='number');
    const delProm=dels.length?Math.round(dels.reduce((s,d)=>s+d,0)/dels.length):null;
    const secas=Object.values(animalesPorId).filter(a=>a.grupo==='horra').length;
    const paren=Object.values(animalesPorId).filter(a=>a.prenez&&a.prenez.partoEstimado&&String(a.prenez.partoEstimado).slice(0,7)===ym).length;
    const ult7=[];for(let i=0;i<7;i++){const d=new Date(now);d.setDate(now.getDate()-i);ult7.push(_isoDe(d));}
    const faltan=enOrdeno.filter(a=>{const c=porCow[a.id]||{};return !ult7.some(f=>c[f]!=null);});
    const totalAnio=Math.round((mensualData||[]).reduce((s,c)=>s+((c.sum||[]).reduce((a,b)=>a+b,0)),0));
    const parts=[];
    if(delProm!=null)parts.push('DEL promedio <b style="color:var(--ink)">'+delProm+' días</b>');
    parts.push('<b style="color:var(--ink)">'+nOrdeno+'</b> en ordeño / <b style="color:var(--ink)">'+secas+'</b> secas');
    if(paren)parts.push('<b style="color:var(--ink)">'+paren+'</b> paren este mes (entran a producir)');
    if(totalAnio)parts.push('producción '+ANIO_SEL+': <b style="color:var(--ink)">'+totalAnio.toLocaleString('es-CO')+' L</b>');
    const lineas=[parts.join(' · ')];
    if(porSecar.length)lineas.push('<b style="color:var(--ink)">Por secar este mes:</b> '+
      porSecar.map(a=>'<a class="goVacaLink" data-gocow="'+LCRules.esc(a.id)+'" style="cursor:pointer;text-decoration:underline">'+LCRules.esc(a.id)+' '+LCRules.esc(a.nombre)+'</a>'+
        (a.prenez&&a.prenez.meses!=null?' ('+a.prenez.meses+'m)':'')).join(' · '));
    if(faltan.length&&faltan.length<nOrdeno)lineas.push('<span style="color:var(--red)">Sin registrar esta semana:</span> '+
      faltan.map(a=>'<a class="goVacaLink" data-gocow="'+LCRules.esc(a.id)+'" style="cursor:pointer;text-decoration:underline">'+LCRules.esc(a.id)+' '+LCRules.esc(a.nombre)+'</a>').join(' · '));
    resBox.style.display='';resBox.innerHTML=lineas.join('<br>');
    resBox.querySelectorAll('.goVacaLink').forEach(el=>{el.onclick=()=>goVaca(el.dataset.gocow,'pg-leche');});
  }
  if(typeof refreshHeader==='function')refreshHeader();
  if(typeof renderNavBadges==='function')renderNavBadges();
}
/* ===== Registro del ordeño (tabla editable · vista SEMANAL Sáb–Vie o MENSUAL) ===== */
let regVista='semana';        // 'semana' | 'mes'
let SEMANA_OFFSET=0;          // semanas respecto a la actual (0=esta, negativo=atrás)
let MES_OFFSET=0;             // meses respecto al actual
let _periodoIsos=[];          // fechas ISO del período en pantalla (para recalcular totales)
function _isoDe(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
/* la semana va de SÁBADO a VIERNES */
function _inicioSemana(off){const d=new Date();d.setHours(0,0,0,0);const wd=(d.getDay()+1)%7;d.setDate(d.getDate()-wd+off*7);return d;}
function _fechasSemana(off){const l=_inicioSemana(off),a=[];for(let i=0;i<7;i++){const d=new Date(l);d.setDate(l.getDate()+i);a.push(d);}return a;}
function _fechasMes(off){const now=new Date(),b=new Date(now.getFullYear(),now.getMonth()+off,1),n=new Date(b.getFullYear(),b.getMonth()+1,0).getDate(),a=[];for(let d=1;d<=n;d++)a.push(new Date(b.getFullYear(),b.getMonth(),d));return a;}
function _diasPeriodo(){return regVista==='mes'?_fechasMes(MES_OFFSET):_fechasSemana(SEMANA_OFFSET);}
function setVistaRegistro(v){
  regVista=v;
  const bs=document.getElementById('btnVistaSemana'),bm=document.getElementById('btnVistaMes');
  if(bs)bs.style.cssText=v==='semana'?'font-weight:700;border-color:var(--ink)':'';
  if(bm)bm.style.cssText=v==='mes'?'font-weight:700;border-color:var(--ink)':'';
  renderRegistro();
}
function cambiarPeriodo(dir){
  if(regVista==='mes'){if(dir===0)MES_OFFSET=0;else MES_OFFSET+=dir;if(MES_OFFSET>0)MES_OFFSET=0;}
  else{if(dir===0)SEMANA_OFFSET=0;else SEMANA_OFFSET+=dir;if(SEMANA_OFFSET>0)SEMANA_OFFSET=0;}
  renderRegistro();
}
function renderRegistro(){
  const head=document.getElementById('semanaHead'),tb=document.getElementById('semanaBody');if(!head||!tb)return;
  const dias=_diasPeriodo();_periodoIsos=dias.map(_isoDe);
  const DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],hoyIso=_isoDe(new Date()),esMes=regVista==='mes';
  const tit=document.getElementById('regTitulo');
  if(tit){
    const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
    if(esMes)tit.textContent=cap(LCRules.MESC[dias[0].getMonth()])+' '+dias[0].getFullYear()+(MES_OFFSET===0?' (actual)':'');
    else tit.textContent='Semana '+dias[0].getDate()+' '+LCRules.MESC[dias[0].getMonth()]+' – '+dias[6].getDate()+' '+LCRules.MESC[dias[6].getMonth()]+(SEMANA_OFFSET===0?' (actual)':'');
  }
  let h='<tr><th>Vaca</th>';
  dias.forEach(d=>{const fut=_isoDe(d)>hoyIso;
    h+='<th class="r" style="'+(fut?'color:var(--ink-3)':'')+(esMes?';padding:6px 3px':'')+'">'+
       (esMes? d.getDate()+'<br><span style="font-weight:400;font-size:9px">'+DOW[d.getDay()]+'</span>'
             : DOW[d.getDay()]+' <span style="font-weight:400;font-size:10px">'+d.getDate()+'</span>')+'</th>';});
  h+='<th class="r" style="font-weight:800">'+(esMes?'Mes':'Sem.')+'</th></tr>';head.innerHTML=h;
  const enOrdeno=Object.values(animalesPorId).filter(a=>a.grupo==='ordeño')
    .sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  tb.innerHTML='';
  if(!enOrdeno.length){tb.innerHTML='<tr><td colspan="'+(dias.length+2)+'" style="text-align:center;padding:20px;color:var(--ink-3)">No hay vacas en ordeño todavía.</td></tr>';return;}
  const esPeriodoActual=(regVista==='mes'?MES_OFFSET===0:SEMANA_OFFSET===0);
  enOrdeno.forEach((a,fila)=>{
    const tr=document.createElement('tr');
    let cells='<td><div class="cell-animal cell-link" title="Abrir la ficha de '+LCRules.esc(a.nombre)+'"><div class="cini">'+LCRules.esc(a.id)+'</div><div class="cn">'+LCRules.esc(a.nombre)+'</div></div></td>';
    let tot=0,tieneDatos=false;
    dias.forEach((d,col)=>{const iso=_isoDe(d),fut=iso>hoyIso,v=ordenosDiaMap[a.id+'|'+iso];
      if(v!=null){tot+=Number(v)||0;tieneDatos=true;}
      cells+='<td class="r" style="padding:4px">'+
        (fut?'<span class="pending">—</span>':
         '<input type="number" inputmode="numeric" min="0" value="'+(v!=null?v:'')+'" data-f="'+fila+'" data-c="'+col+'" '+
         'onchange="guardarCeldaSemana(\''+a.id+'\',\''+iso+'\',this)" onkeydown="regKeyNav(event,this)" '+
         'style="width:42px;text-align:center;border:none;border-bottom:1.5px solid var(--border);background:transparent;font-family:inherit;font-size:13px;padding:3px;outline:none">')+
        '</td>';
    });
    cells+='<td class="r" style="font-weight:700" id="regtot-'+a.id+'">'+(tot?Math.round(tot):'—')+'</td>';
    tr.innerHTML=cells;
    /* clic en el número o nombre → ficha de la vaca (sin interferir con las
     * casillas de litros, que están en otras columnas). */
    const al=tr.querySelector('.cell-link');if(al)al.onclick=()=>goVaca(a.id,'pg-leche');
    /* la vaca sin ningún registro en el período actual se nota AQUÍ mismo */
    if(!tieneDatos&&esPeriodoActual){
      tr.style.background='rgba(196,74,58,.05)';
      const nc=tr.querySelector('.cn');if(nc)nc.innerHTML=LCRules.esc(a.nombre)+' <span style="color:var(--red);font-size:10.5px;font-weight:600">· sin datos</span>';
    }
    tb.appendChild(tr);
  });
  const trT=document.createElement('tr');trT.style.cssText='background:var(--surface);font-weight:700';
  let tc='<td>Total día</td>';for(let i=0;i<dias.length;i++)tc+='<td class="r" id="regday-'+i+'">—</td>';
  tc+='<td class="r" id="reggrand" style="font-weight:800">—</td>';trT.innerHTML=tc;tb.appendChild(trT);
  actualizarTotalesRegistro();
}
/* recalcula totales por vaca, por día y general SIN recrear las casillas (no pierde foco) */
function actualizarTotalesRegistro(){
  const enOrdeno=Object.values(animalesPorId).filter(a=>a.grupo==='ordeño');
  const totDia=new Array(_periodoIsos.length).fill(0);let grand=0;
  enOrdeno.forEach(a=>{
    let tot=0;
    _periodoIsos.forEach((iso,i)=>{const v=ordenosDiaMap[a.id+'|'+iso];if(v!=null){tot+=Number(v)||0;totDia[i]+=Number(v)||0;}});
    grand+=tot;
    const cell=document.getElementById('regtot-'+a.id);if(cell)cell.textContent=tot?Math.round(tot):'—';
  });
  totDia.forEach((t,i)=>{const c=document.getElementById('regday-'+i);if(c)c.textContent=t?Math.round(t):'—';});
  const g=document.getElementById('reggrand');if(g)g.textContent=grand?Math.round(grand):'—';
}
/* Enter baja por la COLUMNA del mismo día (como se transcribe el cuaderno:
   un día, todas las vacas). Guarda la casilla actual y enfoca la siguiente. */
function regKeyNav(e,inp){
  if(e.key!=='Enter')return;
  e.preventDefault();
  inp.blur();   // dispara el guardado (onchange)
  const f=parseInt(inp.dataset.f,10),c=inp.dataset.c;
  const next=document.querySelector('#semanaBody input[data-f="'+(f+1)+'"][data-c="'+c+'"]');
  if(next){next.focus();next.select();}
}
/* alias para no romper llamadas antiguas */
function renderSemana(){renderRegistro();}
function guardarCeldaSemana(animalId,iso,input){
  const raw=String(input.value).trim();
  if(raw===''){delete ordenosDiaMap[animalId+'|'+iso];if(_ordsRaw){const i=_ordsRaw.findIndex(o=>o.animal_id===animalId&&o.fecha===iso);if(i>=0)_ordsRaw.splice(i,1);}actualizarTotalesRegistro();renderLecheKpis();
    /* también en la base: antes el borrado era solo local y el litro reaparecía al recargar */
    if(typeof LCStore!=='undefined')LCStore.deleteOrdeno(animalId,iso)
      .catch(e=>snack('⚠ No se borró en la base: '+(e.message||e)));
    return;}
  const litros=Math.min(LCRules.LITROS_MAX,Math.max(0,parseFloat(raw)));   // mismo rango que el CHECK de la BD
  if(isNaN(litros)){input.value=ordenosDiaMap[animalId+'|'+iso]!=null?ordenosDiaMap[animalId+'|'+iso]:'';return;}
  ordenosDiaMap[animalId+'|'+iso]=litros;
  if(_ordsRaw){const ex=_ordsRaw.find(o=>o.animal_id===animalId&&o.fecha===iso);if(ex)ex.litros=litros;else _ordsRaw.push({animal_id:animalId,fecha:iso,litros:litros});}
  if(typeof LCStore!=='undefined')LCStore.registrarOrdeno(animalId,litros,iso)
    .catch(e=>{console.warn('Ordeño no guardado:',e.message||e);snack('⚠ '+animalId+' no se guardó — revisa la conexión');});
  actualizarTotalesRegistro();renderLecheKpis();
  if(typeof recomputeMensual==='function')recomputeMensual();   // refresca el scatter (no toca esta tabla)
}

/* ===== Registrar leche por vaca ===== */
let milkCows=[];
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
    tr.innerHTML='<td><div class="cell-animal cell-link"><div class="cini">'+LCRules.esc(c.num)+'</div><div><div class="cn">'+LCRules.esc(c.n)+'</div></div></div></td>'+
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
    ref.textContent=c.done?'Ya registrada con '+c.v+' L — puedes corregirla':'Último ordeño: '+c.ayer+' L — acepta si dio igual';}
  document.getElementById('scrim').classList.add('show');
  document.getElementById('milkModal').classList.add('show');
  setTimeout(()=>{inp.focus();inp.select();},60);
}
function closeMilk(){document.getElementById('milkModal').classList.remove('show');
  document.getElementById('scrim').classList.remove('show');mi=-1;}
function saveMilk(){
  if(mi<0)return;
  const c=milkCows[mi];
  const v=LCRules.clampLitros(document.getElementById('mInput').value);
  const prev={done:c.done,v:c.v};
  const conocidoPrev=prev.done?prev.v:c.ayer;   // lo que ESTA pantalla creía tener
  const drop=!c.done&&LCRules.esBajonLeche(c.ayer,v);
  LCAcciones.ejecutarConDeshacer({
    aplicar(){c.done=true;c.v=v;closeMilk();renderMilk();},
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.registrarOrdeno(c.num,v).then(r=>{
        /* pisado inesperado: otro dispositivo ya tenía un valor DISTINTO al que
         * esta pantalla mostraba — avisar en vez de callar (last-write-wins). */
        if(r&&r._pisado&&Number(r._pisado.previo)!==Number(conocidoPrev))
          snack('⚠ '+c.n+': otro registro tenía '+r._pisado.previo+' L de hoy; se reemplazó por '+v+' L');
      }):null,
    avisoError:()=>'⚠ '+c.n+': NO se guardó en la base — revisa la conexión y reintenta',
    mensaje:drop?'Atención: '+c.n+' bajó '+(c.ayer-v)+' L vs ayer — ¿mastitis, celo, comida?':c.n+': '+v+' L guardados',
    revertir(){c.done=prev.done;c.v=prev.v;renderMilk();snack('Registro deshecho');},
    /* deshacer también en la base: si había un valor previo se repone; si no, se borra */
    compensarBD:typeof LCStore!=='undefined'?
      ()=>prev.done?LCStore.registrarOrdeno(c.num,prev.v):LCStore.deleteOrdeno(c.num):null,
    snack,
  });
  if(milkCows.every(x=>x.done)){
    const tot=milkCows.reduce((s,x)=>s+x.v,0);
    setTimeout(()=>snack('Ordeño completo: '+tot+' L en estas '+milkCows.length+' vacas'),1600);
  }
}
renderMilk();

/* ===== Cableado a Supabase: tabla de ordeño (con respaldo local) ===== */
const ordinalParto=LCRules.ordinalParto;   // compartido en core/rules.js
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
/* Promedio de litros de los últimos 7 días con ordeño registrado (de ordenosDiaMap).
   Suaviza la variación día a día (una semana completa). Devuelve null si no hay
   ordeños de esa vaca. */
function promedioUltimos7(id){
  const arr=[];
  for(const k in ordenosDiaMap){
    const i=k.indexOf('|');
    if(k.slice(0,i)===String(id))arr.push([k.slice(i+1),Number(ordenosDiaMap[k])||0]);
  }
  if(!arr.length)return null;
  arr.sort((a,b)=>a[0]<b[0]?1:-1);   // por fecha, más reciente primero
  const top=arr.slice(0,7);
  return Math.round(top.reduce((s,x)=>s+x[1],0)/top.length*10)/10;
}
function scatterCows(){
  let cows=[];
  try{
    cows=hato.filter(a=>a.grupo==='En ordeño'&&a.del!=='—'&&a.del!==undefined&&a.ayer!=='—').map(a=>{
      // eje Y = promedio de los últimos 7 días; si aún no hay ordeños, el último valor
      const p7=promedioUltimos7(a.num);
      return {num:a.num,n:a.n,del:parseInt(a.del),l:(p7!=null?p7:a.ayer),
        prenada:a.tags.includes('prenada'),vacia:a.tags.includes('vacia'),retiro:a.tags.includes('tratamiento')};
    });
  }catch(e){ /* hato aún no definido en la carga inicial */ }
  return cows;
}
function renderScatter(svgId){
  const svg=document.getElementById(svgId);if(!svg)return;
  /* Responsivo: se dibuja a la MEDIDA real del contenedor (1 unidad de viewBox
   * = 1 px), no a un tamaño fijo 560×180. Así, en pantalla angosta, las
   * etiquetas y los puntos conservan su tamaño legible en vez de encogerse, y
   * la altura mínima evita que el scatter se aplaste en una tira donde las
   * vacas se amontonan y "no se ven todas". Si la página está oculta y no se
   * puede medir el ancho, se usa el tamaño clásico como respaldo. */
  const medido=Math.round(svg.clientWidth||svg.getBoundingClientRect().width||0);
  const w=medido>=320?medido:560;
  const h=Math.max(200,Math.min(300,Math.round(w*0.42)));
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  svg.setAttribute('height',h);   // altura explícita (antes solo width:100% → relación fija)
  const cows=scatterCows();
  if(!cows.length){
    /* sin datos: explica qué falta en vez de quedar en blanco */
    const enOrdeno=(typeof hato!=='undefined')?hato.filter(a=>a.grupo==='En ordeño').length:0;
    const msg=enOrdeno?('Las '+enOrdeno+' vacas en ordeño no tienen DEL ni ordeños cargados.')
      :'Aún no hay vacas en ordeño con datos de producción.';
    svg.innerHTML='<text x="'+(w/2)+'" y="'+(h/2-10)+'" text-anchor="middle" font-family="Work Sans,sans-serif" font-size="12" fill="#A8ACA0">'+msg+'</text>'+
      '<text x="'+(w/2)+'" y="'+(h/2+12)+'" text-anchor="middle" font-family="Work Sans,sans-serif" font-size="11" fill="#C0C4B8">Completa el DEL (✏️ Editar) y registra ordeños para ver la producción.</text>';
    return;
  }
  const pad={l:45,r:15,t:14,b:30};
  const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  /* eje X adaptado al hato: hasta la vaca más avanzada + margen (redondeado a 60) */
  const maxDel=Math.max(240,Math.ceil(Math.max(...cows.map(c=>c.del+40))/60)*60);
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
  // curva típica: mismo modelo de Wood y mismo anclaje (pico 18L) que la
  // ficha individual (renderVacaCurva) — antes era una fórmula lineal+exp
  // ad-hoc distinta, con un salto visible en DEL 30.
  const tipica=LCRules.curvaLactancia({picoL:18,maxDia:maxDel});
  const curvaPts=tipica.puntos.map(p=>x(p[0])+','+y(Math.min(p[1],maxL))).join(' ');
  out+='<polyline points="'+curvaPts+'" fill="none" stroke="#A8ACA0" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>';
  // dots
  cows.forEach(c=>{
    const cx=x(c.del),cy=y(c.l);
    const col=c.vacia?'var(--red)':c.retiro?'var(--red)':c.prenada?'var(--green)':'var(--ink-2)';
    const r=4.5;   // todos los círculos del mismo tamaño; el color distingue el estado
    out+='<circle class="scatterDot" data-gocow="'+LCRules.esc(c.num)+'" cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" opacity="0.85" style="cursor:pointer"'+
      '><title>'+LCRules.esc(c.num)+' '+LCRules.esc(c.n)+' · DEL '+c.del+' · '+c.l+' L/día (prom. 7 días)</title></circle>';
    out+='<text x="'+cx+'" y="'+(cy-r-3)+'" font-family="Work Sans,sans-serif" font-size="8" font-weight="500" fill="#70756A" text-anchor="middle">'+LCRules.esc(c.num)+'</text>';
  });
  svg.innerHTML=out;
  svg.querySelectorAll('.scatterDot').forEach(el=>{el.onclick=()=>goVaca(el.dataset.gocow,'pg-leche');});
  // título con el conteo real de vacas en ordeño
  const titleId=svgId==='scatterInicio'?'scatterInicioTitle':'scatterLecheTitle';
  const t=document.getElementById(titleId);
  if(t)t.textContent='Producción vs DEL · '+cows.length+' vacas en ordeño';
}
function renderScatters(){if(!scatterListo)return;renderScatter('scatterLeche');}
/* el scatter se dibuja a la medida del contenedor: al cambiar el tamaño de la
 * ventana se re-ajusta solo (con debounce para no re-dibujar en cada píxel). */
let _scatterResizeT=null;
window.addEventListener('resize',function(){
  clearTimeout(_scatterResizeT);
  _scatterResizeT=setTimeout(function(){if(typeof renderScatters==='function')renderScatters();},150);
});

/* ===== Histórico de producción ===== */
/* ===== Año en consulta (filtro global) =====
   ANIO_SEL controla qué año ven todas las pantallas con datos por fecha.
   MESES_INFO son los meses de ese año (hasta hoy si es el año en curso). */
let ANIO_SEL=new Date().getFullYear();
let MESES_INFO=[], MESES_L=[], DIAS_MES=[];
function rebuildMeses(){
  const now=new Date(), y=ANIO_SEL, arr=[];
  /* último mes a mostrar: año pasado → diciembre; año en curso → mes actual */
  const ultimoMes=(y<now.getFullYear())?11:(y>now.getFullYear()?-1:now.getMonth());
  for(let m=0;m<=ultimoMes;m++){
    const esActual=(y===now.getFullYear()&&m===now.getMonth());
    const lab=LCRules.MESC[m];
    arr.push({key:y+'-'+String(m+1).padStart(2,'0'),
      label:lab.charAt(0).toUpperCase()+lab.slice(1), year:y, month:m,
      dias:esActual?now.getDate():new Date(y,m+1,0).getDate()});
  }
  MESES_INFO=arr; MESES_L=arr.map(m=>m.label); DIAS_MES=arr.map(m=>m.dias);
}
rebuildMeses();
/* mapa de datos reales por día (ordeños, cargados desde Supabase) */
let ordenosDiaMap={};    // 'animalId|YYYY-MM-DD'  → litros
function claveFecha(mesIdx,dia){return MESES_INFO[mesIdx].key+'-'+String(dia).padStart(2,'0');}


/* ===== Producción mensual por vaca (resumen) y diaria (detalle del mes) ===== */
let mensualData=[];
let mensualVista='promedio';   // 'promedio' | 'total' (solo aplica al resumen)
let mensualMes=-1;             // -1 = resumen 2026; 0..5 = detalle diario del mes
function diaVal(numStr,monthIdx,day){
  const v=ordenosDiaMap[numStr+'|'+claveFecha(monthIdx,day)];
  return v!=null?v:null;   // litros reales del ordeño de ese día, o null si no hay
}
function toggleMensual(v){mensualVista=v;
  document.getElementById('btnTotal').style.cssText=v==='total'?'font-weight:700;border-color:var(--ink)':'';
  document.getElementById('btnProm').style.cssText=v==='promedio'?'font-weight:700;border-color:var(--ink)':'';
  renderMensual();}
function renderMesPicker(){
  const p=document.getElementById('mesPicker');if(!p)return;p.innerHTML='';
  const items=[{i:-1,t:'Resumen'}].concat(MESES_L.map((m,i)=>({i:i,t:m})));
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
  if(mensualMes>=MESES_INFO.length)mensualMes=-1;   /* año cambió y el mes ya no existe */
  if(mensualMes>=0){   /* ---- vista DIARIA del mes elegido ---- */
    if(btnT)btnT.style.display='none';if(btnP)btnP.style.display='none';
    const n=DIAS_MES[mensualMes];
    if(tit)tit.textContent='Producción diaria · '+MESES_L[mensualMes]+' '+MESES_INFO[mensualMes].year+' (L/día por vaca)';
    if(hint)hint.textContent='Detalle del mes (solo lectura) · para registrar o corregir usa la tabla semanal de arriba · ‹ Resumen › para volver';
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
      tdAnimal.innerHTML='<div class="cell-animal"><div class="cini">'+LCRules.esc(c.num)+'</div><div><div class="cn">'+LCRules.esc(c.n)+'</div>'+
        (c.nota?'<div class="cs" style="color:var(--red)">'+LCRules.esc(c.nota)+'</div>':'')+'</div></div>';
      tdAnimal.onclick=(function(num){return function(e){e.stopPropagation();goVaca(num,'pg-leche');};})(c.num);
      tr.appendChild(tdAnimal);
      let suma=0,dias=0;
      for(let d=1;d<=n;d++){const v=diaVal(c.num,mensualMes,d);
        const td=document.createElement('td');td.className='r';td.style.cssText='padding:8px 6px';
        if(v===null){td.innerHTML='<span class="pending">—</span>';}
        else{suma+=v;dias++;let cls='';
          if(v<avg*0.85)cls=' class="down"';else if(v>avg*1.15)cls=' class="up"';
          td.innerHTML='<span'+cls+'>'+v.toFixed(1)+'</span>';   // solo lectura: se registra en la tabla semanal
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
  if(tit)tit.textContent='Histórico (resumen) · '+ANIO_SEL;
  if(hint)hint.textContent='Resumen del año, solo lectura · para registrar usa la tabla semanal de arriba · toca un mes para ver el detalle diario';
  if(!MESES_INFO.length){head.innerHTML='';tb.innerHTML='<tr><td style="text-align:center;padding:24px;color:var(--ink-3)">Sin datos para '+ANIO_SEL+'</td></tr>';return;}
  let h='<tr><th>Animal</th>';
  MESES_L.forEach(m=>h+='<th class="r">'+m+'</th>');
  h+='<th class="r" style="font-weight:800">Prom.</th><th class="r" style="font-weight:800">Total</th></tr>';
  head.innerHTML=h;
  const totales=new Array(MESES_INFO.length).fill(0),conteos=new Array(MESES_INFO.length).fill(0);
  mensualData.forEach(c=>c.m.forEach((v,i)=>{if(v!==null){totales[i]+=v;conteos[i]++;}}));
  mensualData.forEach(c=>{
    const tr=document.createElement('tr');
    const activos=c.m.filter(v=>v!==null);
    const prom=activos.length?activos.reduce((a,b)=>a+b,0)/activos.length:0;
    const totalL=Math.round(c.sum.reduce((a,b)=>a+b,0));   // suma REAL de los ordeños
    let cells='<td><div class="cell-animal"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div>'+
      (c.nota?'<div class="cs" style="color:var(--red)">'+c.nota+'</div>':
       c.partos?'<div class="cs">'+c.partos+'</div>':'')+'</div></div></td>';
    c.m.forEach((v,i)=>{
      if(v===null){cells+='<td class="r"><span class="pending">—</span></td>';}
      else{const promHato=conteos[i]?totales[i]/conteos[i]:0;let cls='';
        if(v<promHato*0.65)cls=' class="down"';else if(v>promHato*1.15)cls=' class="up"';
        const val=mensualVista==='total'?Math.round(c.sum[i]):v.toFixed(1);   // suma real del mes
        cells+='<td class="r"><span'+cls+'>'+val+'</span></td>';}
    });
    cells+='<td class="r" style="font-weight:700">'+(mensualVista==='total'?(activos.length?Math.round(totalL/activos.length):'—'):prom.toFixed(1))+'</td>';
    cells+='<td class="r" style="font-weight:700">'+totalL+' L</td>';
    tr.innerHTML=cells;
    tr.onclick=()=>goVaca(c.num,'pg-leche');
    tb.appendChild(tr);
  });
  const trT=document.createElement('tr');trT.style.cssText='background:var(--surface);font-weight:700';
  let tc='<td style="font-weight:700;padding-left:14px">HATO ('+mensualData.length+' vacas)</td>';let grandTotal=0;
  totales.forEach((t,i)=>{
    const sumMes=Math.round(mensualData.reduce((s,c)=>s+(c.sum[i]||0),0));   // suma real del hato ese mes
    grandTotal+=sumMes;
    if(conteos[i]===0){tc+='<td class="r">—</td>';}
    else{const promMes=t/conteos[i];
      tc+='<td class="r">'+(mensualVista==='total'?sumMes:promMes.toFixed(1))+'</td>';}
  });
  const totConteos=conteos.reduce((a,b)=>a+b,0);
  const promAnual=totConteos?totales.reduce((a,b)=>a+b,0)/totConteos:0;
  tc+='<td class="r" style="font-weight:800">'+(mensualVista==='total'?Math.round(grandTotal/Math.max(1,MESES_INFO.length)):promAnual.toFixed(1))+'</td>';
  tc+='<td class="r" style="font-weight:800">'+grandTotal+' L</td>';
  trT.innerHTML=tc;tb.appendChild(trT);
}
renderMesPicker();renderMensual();renderSemana();renderLecheKpis();
/* ===== Cableado a Supabase: producción mensual =====
   Se baja TODO el histórico una vez (crudo) y se re-mapea al año en consulta
   con recomputeMensual(), así cambiar de año no vuelve a pegarle a la red. */
let _mensualRaw=null, _ordsRaw=null;
function recomputeMensual(){
  const meses=MESES_INFO.map(m=>m.key);
  const idx={};meses.forEach((k,i)=>{idx[k]=i;});
  const porAnimal={};
  const ensure=id=>{
    if(!porAnimal[id])porAnimal[id]={num:id,
      n:(animalesPorId[id]?animalesPorId[id].nombre:id),
      m:new Array(MESES_INFO.length).fill(null),    // promedio L/día por mes (vista)
      sum:new Array(MESES_INFO.length).fill(0)};     // suma REAL de litros por mes (ordeños)
    return porAnimal[id];
  };
  /* promedio L/día por mes (de la vista v_produccion_mensual) */
  (_mensualRaw||[]).forEach(f=>{const i=idx[f.mes];if(i!=null)ensure(f.animal_id).m[i]=f.litros_dia;});
  /* suma real de litros por mes (de los ordeños crudos) */
  (_ordsRaw||[]).forEach(o=>{const i=idx[String(o.fecha).slice(0,7)];if(i!=null)ensure(o.animal_id).sum[i]+=Number(o.litros)||0;});
  mensualData=Object.values(porAnimal);
  ordenosDiaMap={};(_ordsRaw||[]).forEach(o=>{ordenosDiaMap[o.animal_id+'|'+o.fecha]=o.litros;});
  renderMensual();
  if(typeof renderScatters==='function')renderScatters();   // el scatter usa el promedio de 7 días
  renderLecheKpis();   // la producción del año vive en la tarjeta-resumen
}
(async function cargarMensualDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const filas=await LCStore.getProduccionMensual();
    if(!filas)return;
    _mensualRaw=filas;
    /* detalle diario real: ordeños SOLO del año seleccionado (escala: no bajar
     * años enteros de historia en cada carga). El listado de años sale del
     * resumen mensual (v_produccion_mensual), que es liviano. */
    try{_ordsRaw=await LCStore.getOrdenos(ANIO_SEL)||[];}catch(_){_ordsRaw=[];}
    actualizarAniosDisponibles();
    recomputeMensual();
    renderSemana();renderLecheKpis();   // ya hay ordeños cargados
  }catch(e){console.warn('Producción mensual: usando datos locales:',e.message||e);}
})();

/* ===== Selector de año (filtro global) =====
   Construye la lista de años con datos (producción, ordeños, partos) + el año
   en curso, y al cambiar re-renderiza todas las pantallas con datos por fecha. */
let _partosRaw=[];
let ANIOS_DISP=[new Date().getFullYear()];
function actualizarAniosDisponibles(){
  /* la lista de años sale del resumen mensual (cubre TODA la historia y es
   * liviano) + partos; ya NO de _ordsRaw, que ahora es solo del año en curso. */
  const set=new Set([new Date().getFullYear(), ANIO_SEL]);
  (_mensualRaw||[]).forEach(f=>{const y=parseInt(String(f.mes||'').slice(0,4),10);if(y)set.add(y);});
  (_partosRaw||[]).forEach(p=>{const y=parseInt(String(p.fecha||'').slice(0,4),10);if(y)set.add(y);});
  ANIOS_DISP=Array.from(set).filter(Boolean).sort((a,b)=>b-a);
  renderAnioSelector();
}
function renderAnioSelector(){
  const sel=document.getElementById('anioSelector');if(!sel)return;
  sel.innerHTML=ANIOS_DISP.map(y=>'<option value="'+y+'"'+(y===ANIO_SEL?' selected':'')+'>'+y+'</option>').join('');
}
function setAnio(v){
  const y=parseInt(v,10);if(!y||y===ANIO_SEL){renderAnioSelector();return;}
  ANIO_SEL=y;
  rebuildMeses();
  mensualMes=-1;
  if(typeof renderMesPicker==='function')renderMesPicker();
  /* re-descargar los ordeños del año elegido (solo ese año) y recomputar */
  if(typeof LCStore!=='undefined'){
    LCStore.getOrdenos(y).then(rows=>{ if(y!==ANIO_SEL)return;   // el usuario ya cambió de año otra vez
      _ordsRaw=rows||[];
      if(typeof recomputeMensual==='function')recomputeMensual();
      else if(typeof renderMensual==='function')renderMensual();
    }).catch(e=>console.warn('Ordeños del año '+y+' no cargados:',e.message||e));
  }
  if(typeof recomputeMensual==='function')recomputeMensual();
  else if(typeof renderMensual==='function')renderMensual();
  if(typeof renderPartosRecientes==='function')renderPartosRecientes();
  if(typeof renderPartosKpis==='function')renderPartosKpis();
  if(typeof renderPalpHistorial==='function')renderPalpHistorial();   // historial de palpaciones del año
  if(typeof renderVacunaciones==='function')renderVacunaciones();     // vacunaciones del año
  renderAnioSelector();
  if(typeof refreshHeader==='function')refreshHeader();
  if(typeof snack==='function')snack('Mostrando el año '+y);
}
renderAnioSelector();

/* ===== Ficha de vaca ===== */
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
  // marca del pico: si el pico queda pegado al borde superior, la etiqueta va DEBAJO
  const px=X(cowC.picoDia),py=Y(cowC.picoL);
  o+='<circle cx="'+px+'" cy="'+py+'" r="2.6" fill="#2F7E33" opacity="0.5"/>';
  const pyLbl=(py-6<mt+12)?(py+13):(py-6);
  o+='<text x="'+px+'" y="'+pyLbl+'" font-family="Work Sans,sans-serif" font-size="9" fill="#70756A" text-anchor="middle">pico ~'+Math.round(cowC.picoL)+' L</text>';
  // hoy
  const hx=X(del),hy=Y(ayer);
  o+='<circle cx="'+hx+'" cy="'+hy+'" r="4.5" fill="#2F7E33"/>';
  const ta=hx>W-90?'end':'start',dx=hx>W-90?-7:7;
  o+='<text x="'+(hx+dx)+'" y="'+(hy-7)+'" font-family="Work Sans,sans-serif" font-size="10" font-weight="700" fill="#16181B" text-anchor="'+ta+'">hoy: '+ayer+' L</text>';
  // leyenda arriba a la DERECHA (no choca con el pico, que suele caer a la izquierda)
  const lx=W-mr-150;
  o+='<g font-family="Work Sans,sans-serif" font-size="8.5">'+
     '<line x1="'+lx+'" y1="'+(mt+4)+'" x2="'+(lx+16)+'" y2="'+(mt+4)+'" stroke="#2F7E33" stroke-width="2.5"/>'+
     '<text x="'+(lx+20)+'" y="'+(mt+7)+'" fill="#70756A">esta vaca</text>'+
     '<line x1="'+(lx+72)+'" y1="'+(mt+4)+'" x2="'+(lx+88)+'" y2="'+(mt+4)+'" stroke="#C7CBBC" stroke-width="1.6" stroke-dasharray="4,3"/>'+
     '<text x="'+(lx+92)+'" y="'+(mt+7)+'" fill="#70756A">típica del hato</text></g>';
  svg.innerHTML=o;
}
function fmtEdadLarga(a){
  const n=a.edadAnios;if(n==null)return '—';
  const enMeses=a.grupo==='levante'||a.grupo==='cria'||(a.grupo==='macho'&&n<1.5)||n<1;
  if(enMeses)return Math.round(n*12)+' meses';
  return (n%1===0?String(n):n.toFixed(1).replace('.',','))+' años';
}
function nombreRef(id){const x=animalesPorId[id];return x?(id+' '+x.nombre):id;}
/* fecha corta CON año — para historiales que cruzan años ("17 feb 2025") */
function fmtFechaAno(iso){if(!iso)return '—';return fmtFechaCorta(iso)+' '+String(iso).slice(0,4);}
/* adaptador: la lógica canónica vive en LCRules.deriveReproFicha (compartida
 * con el móvil); aquí solo se mapea a la forma {badge,text,sub} de esta UI. */
function deriveReproFicha(a){
  const r=LCRules.deriveReproFicha(a,{
    retiroDias:a.retiroLecheHasta?diasHasta(a.retiroLecheHasta):null,
    diasAbiertos:(typeof _diasAbiertos==='function'?_diasAbiertos(a.id):null)??a.diasVacia,
    hijas:(a.grupo==='macho'&&a.rolToro)?Object.values(animalesPorId).filter(x=>x.padreId===a.id&&x.grupo!=='baja').length:0,
    fmtFecha:iso=>{const d=new Date(iso+'T00:00:00');return d.getDate()+' '+LCRules.MESC[d.getMonth()];}});
  return r?{badge:r.nivel,text:r.titulo,sub:r.sub,secar:r.secar}:{badge:'',text:a.grupo,sub:''};
}
function buildFichaBasica(a){
  const crias=Object.values(animalesPorId).filter(x=>x.madreId===a.id).map(x=>x.id+' '+x.nombre);
  const retiroD=a.retiroLecheHasta?diasHasta(a.retiroLecheHasta):null;
  const sanOk=!(retiroD!=null&&retiroD>=0);
  return {num:a.id,n:a.nombre,raza:a.raza||'—',color:a.color||null,nota:a.nota||null,edad:fmtEdadLarga(a),grupo:GRUPO_DISPLAY[a.grupo]||a.grupo,
    origen:a.origen==='comprado'?'Comprada':a.origen==='nacido_finca'?'Nació en finca':'—',
    procedencia:a.procedencia||null,valorCompra:a.valorCompra||null,
    del:(a.del==null?0:a.del),parto:a.partos||0,ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer:0),
    prom7:(typeof promedioUltimos7==='function'?promedioUltimos7(a.id):null),
    diasAbiertos:(typeof _diasAbiertos==='function'?_diasAbiertos(a.id):null),
    peso:a.pesoKg?a.pesoKg+' kg':'—',fechaPeso:a.fechaPeso||null,
    madre:a.madreId?nombreRef(a.madreId):'—',padre:a.padreId?nombreRef(a.padreId):'—',
    crias:crias,repro:deriveReproFicha(a),
    sanidad:sanOk?'sin retiros activos':'retiro de leche activo — no vender su leche',sanOk:sanOk};
}
/* Paso de etapa pendiente según las señales de edad (aviso + confirmar):
 * cría→levante (8m), levante→novilla (H, 3a) o levante→machos (M, 3a).
 * Devuelve {a,de,label,display} o null si no hay paso sugerido. */
function _pasoSiguiente(a){
  if(!a)return null;
  if(a.grupo==='cria'&&a.listoLevante)return {a:'levante',de:'cria',label:'Pasar a levante',display:'Levante'};
  if(a.grupo==='levante'&&a.listoNovilla)return {a:'novilla',de:'levante',label:'Pasar a novilla',display:'Novilla'};
  if(a.grupo==='levante'&&a.listoMachos)return {a:'macho',de:'levante',label:'Pasar a machos',display:'Macho'};
  return null;
}
/* Confirmar el paso de etapa: mueve el animal al grupo siguiente y REGISTRA el
 * movimiento con su fecha (RPC transaccional mover_grupo). Con "Deshacer" que
 * revierte el grupo y borra la fila del historial. */
function confirmarPaso(num){
  const a=animalesPorId[num];if(!a)return;
  const paso=_pasoSiguiente(a);
  if(!paso){snack(num+' no tiene un paso de etapa pendiente');return;}
  const prevGrupo=a.grupo;let movId=null;
  const repintar=()=>{const fila=hato.find(x=>x.num===num);if(fila)fila.grupo=GRUPO_DISPLAY[a.grupo]||a.grupo;
    if(typeof recomputarRepro==='function')recomputarRepro();
    renderHatoFiltros();renderHato();if(vacaActual===num)goVaca(num,vacaFrom);};
  LCAcciones.ejecutarConDeshacer({
    snack,
    aplicar:()=>{a.grupo=paso.a;repintar();},
    escribir:()=>LCStore.moverGrupo(num,paso.a,{deGrupo:prevGrupo,motivo:'transicion'}).then(r=>{movId=r&&r.movimientoId;if(vacaActual===num)renderVacaEtapas(num);}),
    avisoError:()=>'⚠ El cambio de grupo NO se guardó en la base — reintenta',
    mensaje:num+' pasó a '+paso.display+' — registrado hoy',
    revertir:()=>{a.grupo=prevGrupo;repintar();},
    compensarBD:()=>LCStore.updateAnimalCampos(num,{grupo:prevGrupo}).then(()=>LCStore.deleteMovimientoGrupo(movId)).then(()=>{if(vacaActual===num)renderVacaEtapas(num);}),
  });
}
/* Vincular una CRÍA existente a un parto sin cría. Candidatos: animales que
 * NO son ya cría de otro parto (la BD tiene un único por cría), no la madre y
 * no dados de baja. Con buscador (pensado para ~100 animales). */
function abrirVincularCria(partoId,madreNum){
  const parto=(_partosRaw||[]).find(x=>String(x.id)===String(partoId));
  const cambiando=!!(parto&&parto.cria_id);
  const yaCrias=new Set((_partosRaw||[]).map(p=>p.cria_id).filter(Boolean).map(String));
  const cands=Object.values(animalesPorId)
    .filter(a=>a.grupo!=='baja'&&String(a.id)!==String(madreNum)&&!yaCrias.has(String(a.id)))
    .sort((x,y)=>String(x.id).localeCompare(String(y.id),undefined,{numeric:true}));
  openReg(cambiando?'Cambiar la cría de este parto':'Vincular cría a este parto',
    'Elige el animal que nació en este parto — quedará como su cría'+(cambiando?' (la cría actual queda sin madre)':''));
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='none';
  if(!cands.length){body.innerHTML='<div style="color:var(--ink-3);font-size:13px;padding:8px">No hay animales disponibles para vincular (todos ya son cría de un parto, o no hay otros animales).</div>';return;}
  const cont=document.createElement('div');
  cont.innerHTML='<input id="vcBuscar" placeholder="🔍 Buscar por número o nombre…" autocomplete="off" '+
      'style="width:100%;box-sizing:border-box;border:1.5px solid var(--border);border-radius:10px;background:var(--card);font-family:inherit;font-size:13px;padding:8px 12px;outline:none;margin-bottom:6px">'+
    '<div id="vcLista" style="max-height:260px;overflow-y:auto">'+
    cands.map(a=>'<button class="btn outl" data-num="'+LCRules.esc(String(a.id))+'" data-txt="'+LCRules.esc((String(a.id)+' '+(a.nombre||'')).toLowerCase())+'" '+
      'style="width:100%;justify-content:flex-start;margin-bottom:6px;text-transform:none;letter-spacing:0">'+
      '<b>'+LCRules.esc(String(a.id))+'</b>&nbsp; '+LCRules.esc(a.nombre||'')+
      '<span style="margin-left:auto;color:var(--ink-3);font-size:12px">'+(GRUPO_DISPLAY[a.grupo]||a.grupo)+'</span></button>').join('')+
    '</div>';
  body.appendChild(cont);
  cont.querySelector('#vcBuscar').oninput=function(){
    const q=this.value.trim().toLowerCase();
    cont.querySelectorAll('button[data-num]').forEach(b=>{b.style.display=(!q||b.dataset.txt.indexOf(q)>=0)?'':'none';});
  };
  cont.querySelectorAll('button[data-num]').forEach(b=>{b.onclick=()=>{closeReg();vincularCriaEjecutar(partoId,b.dataset.num,madreNum);};});
}
/* Fija (o quita, si criaId=null) la cría de un parto. Si el parto ya tenía otra
 * cría, esa SALE: se le quita la madre que la vinculación le había puesto (así
 * "cambiar" = quitar la vieja + poner la nueva, en un solo Deshacer). */
function vincularCriaEjecutar(partoId,criaId,madreNum){
  const p=(_partosRaw||[]).find(x=>String(x.id)===String(partoId));if(!p)return;
  const nueva=criaId?animalesPorId[criaId]:null;
  const viejaId=p.cria_id;const vieja=viejaId?animalesPorId[viejaId]:null;
  const saleVieja=viejaId&&String(viejaId)!==String(criaId);
  const prevMadre=nueva?nueva.madreId:null,prevOrigen=nueva?nueva.origen:null;
  const prevMadreVieja=vieja?vieja.madreId:null,prevOrigenVieja=vieja?vieja.origen:null;
  const repintar=()=>{if(vacaActual===madreNum)goVaca(madreNum,vacaFrom);
    if(typeof recomputarPartosRecientes==='function')recomputarPartosRecientes();};
  LCAcciones.ejecutarConDeshacer({
    snack,
    aplicar(){
      if(saleVieja&&vieja){vieja.madreId=null;vieja.origen=null;}   // el que sale pierde la madre
      p.cria_id=criaId||null;
      if(nueva){nueva.madreId=madreNum;nueva.origen='nacido_finca';}
      repintar();},
    escribir:typeof LCStore!=='undefined'?()=>LCStore.vincularCriaParto(partoId,criaId||null,madreNum)
      .then(()=>saleVieja?LCStore.updateAnimalCampos(viejaId,{madre_id:null,origen:null}):null):null,
    avisoError:(e)=>(e&&e.code==='CRIA_YA_VINCULADA')
      ? '⚠ '+criaId+' ya es cría de otro parto — no se puede vincular dos veces'
      : '⚠ No se pudo actualizar la cría en la base — reintenta',
    mensaje:criaId?(criaId+' quedó vinculada como cría de este parto'):'Cría desvinculada del parto',
    revertir(){
      p.cria_id=viejaId||null;
      if(nueva){nueva.madreId=prevMadre;nueva.origen=prevOrigen;}
      if(saleVieja&&vieja){vieja.madreId=prevMadreVieja;vieja.origen=prevOrigenVieja;}
      repintar();},
    compensarBD:typeof LCStore!=='undefined'?()=>LCStore.vincularCriaParto(partoId,viejaId||null,null)
      .then(()=>nueva?LCStore.updateAnimalCampos(criaId,{madre_id:prevMadre||null,origen:prevOrigen||null}):null)
      .then(()=>saleVieja?LCStore.updateAnimalCampos(viejaId,{madre_id:prevMadreVieja||null,origen:prevOrigenVieja||null}):null):null,
  });
}
/* Corregir un parto ya registrado: fecha y cría vinculada (más eliminar). El
 * resto (sexo, estado, peso, nota) no se edita aquí — si algo de eso está mal,
 * se elimina el parto y se re-registra. Si la vaca llevaba su lactancia desde
 * este parto, corregir la fecha arrastra el inicio de lactancia (esa fecha ES
 * el último parto). La cría se cambia/quita al instante (con Deshacer); la
 * fecha se guarda con «Guardar cambios». */
function abrirEditarParto(partoId){
  const p=(_partosRaw||[]).find(x=>String(x.id)===String(partoId));if(!p)return;
  const st={fecha:p.fecha};
  const madre=animalesPorId[p.madre_id];
  const arrastra=madre&&madre.inicioLactancia===p.fecha;
  openReg('Corregir parto de '+p.madre_id,'Fecha y cría vinculada. Si el sexo, el estado o el peso están mal, elimina el parto y regístralo de nuevo');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regTexto('Fecha del parto','',v=>st.fecha=v,'date',st.fecha));
  if(arrastra)body.appendChild(regHint('La vaca lleva su lactancia desde este parto: si corriges la fecha, el inicio de lactancia (y el DEL) se corrigen solos.'));
  /* --- cría vinculada: vincular / cambiar / quitar (acción inmediata) --- */
  body.appendChild(regLabel('Cría vinculada'));
  const criaBox=document.createElement('div');
  criaBox.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  if(p.cria_id){
    const nom=animalesPorId[p.cria_id]?animalesPorId[p.cria_id].nombre:'';
    const info=document.createElement('div');info.style.cssText='flex:1;min-width:110px;font-size:14px';
    info.innerHTML='<b>'+LCRules.esc(String(p.cria_id))+'</b> '+LCRules.esc(nom);
    const bCambiar=document.createElement('button');bCambiar.className='btn outl';
    bCambiar.style.cssText='text-transform:none;letter-spacing:0';bCambiar.textContent='Cambiar';
    bCambiar.onclick=()=>{closeReg();abrirVincularCria(p.id,p.madre_id);};
    const bQuitar=document.createElement('button');bQuitar.className='btn outl';
    bQuitar.style.cssText='text-transform:none;letter-spacing:0';bQuitar.textContent='Quitar';
    bQuitar.onclick=()=>{closeReg();vincularCriaEjecutar(p.id,null,p.madre_id);};
    criaBox.appendChild(info);criaBox.appendChild(bCambiar);criaBox.appendChild(bQuitar);
  }else if(p.estado_cria!=='muerta'){
    const bVinc=document.createElement('button');bVinc.className='btn outl';
    bVinc.style.cssText='text-transform:none;letter-spacing:0';bVinc.textContent='＋ Vincular cría';
    bVinc.onclick=()=>{closeReg();abrirVincularCria(p.id,p.madre_id);};
    criaBox.appendChild(bVinc);
  }else{
    const info=document.createElement('div');info.style.cssText='color:var(--ink-3);font-size:13px';
    info.textContent='Cría muerta (mortinato) — sin animal que vincular.';
    criaBox.appendChild(info);
  }
  body.appendChild(criaBox);
  body.appendChild(regHint('La cría se cambia/quita al instante (con Deshacer). Al quitarla o cambiarla, el animal que sale queda sin madre registrada.'));
  /* eliminar: para duplicados o partos que nunca ocurrieron */
  const del=document.createElement('button');del.className='btn outl';
  del.style.cssText='width:100%;justify-content:center;margin-top:10px;color:var(--red,#b3261e);border-color:var(--red,#b3261e)';
  del.textContent='🗑 Eliminar este parto';
  del.onclick=()=>{closeReg();eliminarPartoHist(partoId);};
  body.appendChild(del);
  document.getElementById('regSaveBtn').onclick=()=>guardarEditarParto(partoId,st);
}
function guardarEditarParto(partoId,st){
  const p=(_partosRaw||[]).find(x=>String(x.id)===String(partoId));if(!p)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(st.fecha||'')){snack('Falta la fecha del parto');return;}
  if(st.fecha>isoHoy()){snack('⚠ La fecha del parto no puede ser futura');return;}
  if(st.fecha===p.fecha){closeReg();return;}   // fecha sin cambios: nada que guardar
  const madre=animalesPorId[p.madre_id];
  const prev={fecha:p.fecha};
  /* el inicio de lactancia sigue a ESTE parto solo si apuntaba a su fecha */
  const arrastra=madre&&madre.inicioLactancia===p.fecha;
  const prevInicio=madre?madre.inicioLactancia:null,prevDel=madre?madre.del:null;
  closeReg();
  const ponFecha=(vieja,nueva)=>{               // mantiene las cachés de fechas
    const fs=_partosPorMadre[p.madre_id]||[];const i=fs.indexOf(vieja);
    if(i>=0)fs[i]=nueva;const s=fs.slice().sort();
    if(s.length)_ultimoParto[p.madre_id]=s[s.length-1];};
  const repintar=()=>{recomputarPartosRecientes();renderPartosRecientes();renderPartosKpis();
    if(typeof recomputarRepro==='function'){recomputarRepro();renderVacias();renderPalpLista();renderReproKpis();}
    renderHato();if(vacaActual===p.madre_id)goVaca(p.madre_id,vacaFrom);};
  LCAcciones.ejecutarConDeshacer({
    snack,
    aplicar(){ponFecha(p.fecha,st.fecha);p.fecha=st.fecha;
      if(arrastra&&madre){madre.inicioLactancia=st.fecha;madre.del=diasDesdeReal(st.fecha);
        const h=hato.find(x=>x.num===p.madre_id);if(h)h.del=(madre.del==null?'—':madre.del);}
      repintar();},
    escribir:typeof LCStore!=='undefined'?()=>LCStore.updateParto(partoId,{fecha:st.fecha})
      .then(()=>arrastra?LCStore.updateAnimalCampos(p.madre_id,{inicio_lactancia:st.fecha}):null):null,
    avisoError:'⚠ La fecha del parto NO se corrigió en la base — reintenta',
    mensaje:'Parto de '+p.madre_id+' corregido',
    revertir(){ponFecha(p.fecha,prev.fecha);p.fecha=prev.fecha;
      if(arrastra&&madre){madre.inicioLactancia=prevInicio;madre.del=prevDel;
        const h=hato.find(x=>x.num===p.madre_id);if(h)h.del=(prevDel==null?'—':prevDel);}
      repintar();},
    compensarBD:typeof LCStore!=='undefined'?()=>LCStore.updateParto(partoId,{fecha:prev.fecha})
      .then(()=>arrastra?LCStore.updateAnimalCampos(p.madre_id,{inicio_lactancia:prevInicio}):null):null,
  });
}
/* detalle mensual de la ficha: colapsado por defecto (crece sin tope) */
function toggleVacaMensual(){
  const mc=document.getElementById('vacaMensualCard');
  const mt=document.getElementById('vacaMensualToggle');
  if(!mc)return;
  const abierto=mc.style.display!=='none';
  mc.style.display=abierto?'none':'';
  if(mt)mt.textContent=abierto?'Ver detalle':'Ocultar detalle';
}
/* línea de tiempo de etapas (movimientos de grupo con su fecha) en la ficha */
async function renderVacaEtapas(num){
  const box=document.getElementById('vacaEtapas');if(!box)return;
  box.style.display='none';box.innerHTML='';
  if(typeof LCStore==='undefined')return;
  let movs=[];
  try{movs=await LCStore.getMovimientosGrupo(num)||[];}catch(e){return;}
  if(vacaActual!==num||!movs.length)return;   // ya cambió de ficha, o sin historial
  const linea=movs.map(m=>{
    const de=m.de_grupo?(GRUPO_DISPLAY[m.de_grupo]||m.de_grupo)+' → ':'';
    return '<b style="color:var(--ink)">'+de+(GRUPO_DISPLAY[m.a_grupo]||m.a_grupo)+'</b> <span style="color:var(--ink-3)">'+fmtFechaAno(m.fecha)+'</span>';
  }).join(' &nbsp;·&nbsp; ');
  box.innerHTML='<b style="color:var(--ink)">Etapas:</b> '+linea;
  box.style.display='';
}
function goVaca(num,from){
  let cow=animalesPorId[num]?buildFichaBasica(animalesPorId[num]):null;
  if(!cow)return snack('Ficha de '+num+' — próximamente');
  if(String(vacaActual)!==String(cow.num))vacaDatosEditando=false;   // cambiar de animal cierra la edición
  vacaFrom=from||'pg-hato';vacaActual=cow.num;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('pg-vaca').classList.add('active');
  document.querySelectorAll('#nav a').forEach(a=>a.classList.remove('active'));
  /* título de página GENÉRICO: la identidad vive solo en el hero (antes se
   * repetía idéntica a 30px de distancia) */
  document.getElementById('pgTitle').textContent='Ficha del animal';
  document.getElementById('pgSub').textContent='';
  /* el CTA contextual lleva el NOMBRE: lo distingue del "+ Registrar" global
   * del top bar (mismo verbo, distinto alcance → confusión directa) */
  const evBtn=document.getElementById('vacaEventoBtn');
  if(evBtn)evBtn.textContent='＋ Evento de '+cow.n;
  /* qué bloques aplican a ESTE animal: producción solo para lecheras (en
   * ordeño u horra); reproducción solo para hembras. Para una cría o un
   * macho, media ficha de leche era ruido. */
  (function(){
    const ac=animalesPorId[cow.num]||{};
    const esLechera=ac.grupo==='ordeño'||ac.grupo==='horra';
    const esHembra=ac.sexo!=='M';
    const bl=document.getElementById('vacaBloqueLeche');if(bl)bl.style.display=esLechera?'':'none';
    const bl2=document.getElementById('vacaBloqueLeche2');if(bl2)bl2.style.display=esLechera?'':'none';
    const br=document.getElementById('vacaBloqueRepro');if(br)br.style.display=esHembra?'':'none';
    /* el detalle mensual arranca colapsado en cada ficha */
    const mc=document.getElementById('vacaMensualCard');if(mc)mc.style.display='none';
    const mt=document.getElementById('vacaMensualToggle');if(mt)mt.textContent='Ver detalle';
  })();
  document.querySelector('.content').scrollTop=0;
  const backLabels={'pg-hato':'Volver al hato','pg-leche':'Volver a producción','pg-repro':'Volver a reproducción'};
  document.getElementById('vacaBackLabel').textContent=backLabels[vacaFrom]||'Volver';
  document.getElementById('vacaBack').onclick=()=>go(vacaFrom,document.querySelector('[data-pg="'+vacaFrom+'"]'));
  /* navegar entre vacas sin volver al hato (orden por número, sin bajas) */
  (function(){
    const bp=document.getElementById('vacaPrevBtn'),bn=document.getElementById('vacaNextBtn');
    if(!bp||!bn)return;
    const lista=Object.values(animalesPorId).filter(x=>x.grupo!=='baja')
      .sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
    const idx=lista.findIndex(x=>String(x.id)===String(cow.num));
    const prev=idx>0?lista[idx-1]:null,next=(idx>=0&&idx<lista.length-1)?lista[idx+1]:null;
    bp.style.display=prev?'':'none';bn.style.display=next?'':'none';
    if(prev){bp.textContent='← '+prev.id+' '+prev.nombre;bp.onclick=()=>goVaca(prev.id,vacaFrom);}
    if(next){bn.textContent=next.id+' '+next.nombre+' →';bn.onclick=()=>goVaca(next.id,vacaFrom);}
  })();
  /* foto: muestra la guardada para esta vaca, o el placeholder */
  const foto=document.getElementById('vacaFoto'),fimg=document.getElementById('vacaFotoImg');
  if(cowFotos[cow.num]){fimg.src=cowFotos[cow.num];foto.classList.add('has-img');}
  else{fimg.removeAttribute('src');foto.classList.remove('has-img');}
  document.getElementById('vacaFotoInput').value='';
  document.getElementById('vacaNombre').textContent=cow.num+' · '+cow.n;
  document.getElementById('vacaSub').textContent=[cow.raza,cow.color,cow.edad,cow.grupo,cow.origen].filter(x=>x&&x!=='—').join(' · ');
  /* nota de manejo visible en el hero (además de en los datos) */
  const nb=document.getElementById('vacaNotaBadge');
  if(nb){
    if(cow.nota){nb.style.display='';nb.innerHTML='<span class="badge warn">📝 '+LCRules.esc(cow.nota)+'</span>';}
    else{nb.style.display='none';nb.innerHTML='';}
  }
  const al=document.getElementById('vacaAlerta');
  const pasoFicha=_pasoSiguiente(animalesPorId[cow.num]);
  /* la alerta trae su acción: secado para preñadas en ordeño (paridad con el
   * móvil, que ya lo tenía) o el paso de etapa pendiente */
  const puedeSecar=cow.repro.secar&&(animalesPorId[cow.num]||{}).grupo==='ordeño';
  al.innerHTML='<div class="alert '+(cow.repro.badge==='bad'?'urgent':cow.repro.badge==='warn'?'warn':cow.repro.badge==='ok'?'ok':'info')+'">'+
    '<div style="flex:1"><div class="a-title">'+cow.repro.text+'</div>'+
    '<div class="a-sub">'+cow.repro.sub+'</div></div>'+
    (puedeSecar?'<button class="btn outl small" onclick="openSeca(vacaActual)">Programar secado</button>':'')+
    (pasoFicha?'<button class="btn small" onclick="confirmarPaso(vacaActual)">'+pasoFicha.label+'</button>':'')+
    '</div>';
  /* historial de etapas (movimientos de grupo con su fecha), carga async */
  renderVacaEtapas(cow.num);
  /* banner de baja: si el animal está dado de baja, mostrar motivo/fecha/valor/nota + revertir */
  (function(){
    const box=document.getElementById('vacaBajaBox');if(!box)return;
    const ac=animalesPorId[cow.num];const b=ac?ac.baja:null;
    if(!b||(ac&&ac.grupo!=='baja')){box.style.display='none';box.innerHTML='';return;}
    const partes=[fmtFechaAno(b.fecha)];
    if(b.valor)partes.push('$'+Number(b.valor).toLocaleString('es-CO'));
    if(b.nota)partes.push(LCRules.esc(b.nota));
    box.style.display='';
    box.innerHTML='<div class="alert urgent"><div style="flex:1">'+
      '<div class="a-title">↧ Baja: '+LCRules.esc(b.motivo||'—')+'</div>'+
      '<div class="a-sub">'+partes.join(' · ')+'</div></div>'+
      '<button class="btn outl small" onclick="revertirBaja(vacaActual)">Revertir baja</button></div>';
  })();
  const kpis=document.getElementById('vacaKpis');
  kpis.innerHTML=
    '<div class="card kpi"><div class="k-label">Último ordeño</div><div class="k-value">'+cow.ayer+' <span class="k-unit">L</span></div>'+
      '<div class="k-trend mut">'+(cow.prom7!=null?'prom. 7 días: '+cow.prom7+' L':'sin historial')+'</div></div>'+
    '<div class="card kpi"><div class="k-label">DEL</div><div class="k-value">'+cow.del+' <span class="k-unit">días</span></div>'+
      '<div class="k-trend mut">días en leche</div></div>'+
    (function(){
      /* KPI condicional: preñada → cuánto falta para el parto (un '—' en
       * "días abiertos" no informa nada); si no → días abiertos */
      const ac=animalesPorId[cow.num]||{};
      if(ac.estadoRepro==='prenada'&&ac.prenez&&ac.prenez.partoEstimado){
        const d=diasHasta(ac.prenez.partoEstimado);
        return '<div class="card kpi"><div class="k-label">Próximo parto</div><div class="k-value">'+(d!=null&&d>=0?'~'+d:'—')+' <span class="k-unit">días</span></div>'+
          '<div class="k-trend mut">'+fmtFechaCorta(ac.prenez.partoEstimado)+'</div></div>';
      }
      return '<div class="card kpi"><div class="k-label">Días abiertos</div><div class="k-value'+(cow.diasAbiertos>120?' down':'')+'">'+(cow.diasAbiertos!=null?cow.diasAbiertos:'—')+'</div>'+
        '<div class="k-trend mut">desde el último parto</div></div>';
    })()+
    '<div class="card kpi"><div class="k-label">Partos</div><div class="k-value">'+cow.parto+'</div>'+
      '<div class="k-trend mut">'+(function(){const iv=intervaloPartosVaca(cow.num);
        return iv!=null?'pare cada '+(iv/30.44).toFixed(1)+' m':(cow.parto===1?'primer parto':'registrados');})()+'</div></div>';
  /* datos del animal: lista de filas con TODOS los campos (— en los vacíos);
   * el lápiz de la tarjeta los vuelve editables en el lugar */
  renderVacaDatos();
  /* curva de lactancia (modelo de Wood) */
  renderVacaCurva(cow.del,cow.ayer);
  document.getElementById('vacaCurvaSub').textContent='Hoy va en DEL '+cow.del+' · pico típico ~DEL 55 · '+cow.parto+(cow.parto===1?'er':'°')+' parto';
  /* sanidad */
  const san=document.getElementById('vacaSanidad');
  san.innerHTML='<svg class="ic-s ic" style="color:var('+(cow.sanOk?'--green':'--red')+')"><use href="#i-shield"/></svg>'+
    '<div style="font-size:12.5px;color:var(--ink-2)"><b style="color:var(--ink)">'+(cow.sanOk?'Sanidad al día':'Alerta sanitaria')+'</b> — '+cow.sanidad+'</div>';
  /* historial de palpaciones de esta vaca */
  if(typeof renderVacaPalpaciones==='function')renderVacaPalpaciones(cow.num);
  /* partos de esta vaca (de la tabla partos) + su intervalo entre partos */
  const ptb=document.getElementById('vacaPartosTb');
  if(ptb){ptb.innerHTML='';
    const ps=(_partosRaw||[]).filter(p=>String(p.madre_id)===String(cow.num))
      .sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha)));
    if(!ps.length)ptb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:12px;color:var(--ink-3)">Sin partos registrados.</td></tr>';
    ps.forEach(p=>{
      const sinDetalle=!p.cria_id&&!p.sexo_cria;   // parto histórico del registro inicial
      /* cría: si está vinculada, número+nombre; si no y la cría nació viva,
       * un enlace para vincular un animal existente como la cría */
      const criaCell=p.cria_id
        ? '<b>'+LCRules.esc(p.cria_id)+'</b> '+LCRules.esc(animalesPorId[p.cria_id]?animalesPorId[p.cria_id].nombre:'')
        : (p.estado_cria!=='muerta'
            ? '<a class="cria-link" data-parto="'+LCRules.esc(p.id)+'" style="cursor:pointer;color:var(--ink-3);text-decoration:underline">＋ vincular cría</a>'
            : '—');
      const tr=document.createElement('tr');
      tr.innerHTML='<td>'+fmtFechaAno(p.fecha)+'</td>'+
        '<td>'+criaCell+'</td>'+
        '<td class="r">'+(p.sexo_cria==='H'?'♀':p.sexo_cria==='M'?'♂':'—')+'</td><td class="r">'+(p.peso_kg?p.peso_kg+' kg':'—')+'</td>'+
        '<td>'+(p.tipo||'normal')+'</td>'+
        '<td class="r">'+(sinDetalle?'<span class="badge">histórico</span>':'<span class="badge '+(p.estado_cria==='viva'?'ok':'bad')+'">'+(p.estado_cria==='viva'?'viva':'mortinato')+'</span>')+'</td>'+
        '<td class="r"><a class="parto-edit" title="Corregir este parto" style="cursor:pointer;color:var(--ink-3)">✏️</a></td>';
      const lk=tr.querySelector('.cria-link');
      if(lk)lk.onclick=()=>abrirVincularCria(p.id,cow.num);
      tr.querySelector('.parto-edit').onclick=()=>abrirEditarParto(p.id);
      ptb.appendChild(tr);
    });
    const lblP=document.getElementById('vacaPartosLabel');
    if(lblP){const iv=intervaloPartosVaca(cow.num);
      lblP.textContent='Partos de esta vaca'+(iv!=null?' · pare cada '+(iv/30.44).toFixed(1)+' meses (meta 12–13)':'');}
  }
  /* producción por lactancia (la medida real de la vaca) */
  const ltb=document.getElementById('vacaLactTb');
  if(ltb){ltb.innerHTML='';
    const lacts=produccionPorLactancia(cow.num);
    if(!lacts.length)ltb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:12px;color:var(--ink-3)">Sin partos registrados — la lactancia se agrupa de parto a parto.</td></tr>';
    lacts.forEach(L=>{
      const estado=L.fin?('hasta '+fmtFechaAno(L.fin)):'<span class="badge ok">en curso</span>';
      ltb.innerHTML+='<tr><td><b>Lactancia '+L.n+'</b></td>'+
        '<td>parto '+fmtFechaAno(L.inicio)+'</td>'+
        '<td>'+estado+'</td>'+
        '<td class="r"><b>'+(L.total?L.total.toLocaleString('es-CO')+' L':'—')+'</b></td>'+
        '<td class="r">'+(L.prom!=null?L.prom.toFixed(1)+' L/día ('+L.diasReg+' registros)':'sin ordeños')+'</td></tr>';
    });
  }
  /* sanidad de esta vaca: activos + historial de enfermedades + vacunas */
  const sl=document.getElementById('vacaSanidadLista');
  if(sl){
    const lineas=[];
    (tratamientos||[]).filter(t=>String(t.num)===String(cow.num)).forEach(t=>{
      lineas.push('💊 <b style="color:var(--ink)">'+LCRules.esc(t.desc)+'</b>'+(t.retiro?' · <span style="color:var(--red)">'+LCRules.esc(t.retiro)+'</span>':' · sin retiro'));});
    const pasados=(_tratamientosTodos||[]).filter(t=>!t.activo&&String(t.animal_id)===String(cow.num))
      .sort((x,y)=>String(y.inicio).localeCompare(String(x.inicio)));
    /* patrón: 3+ tratamientos en los últimos 12 meses = vaca repetidora */
    const hace12m=new Date();hace12m.setMonth(hace12m.getMonth()-12);
    const enElAnio=(_tratamientosTodos||[]).filter(t=>String(t.animal_id)===String(cow.num)&&t.inicio&&new Date(t.inicio+'T00:00:00')>=hace12m).length;
    if(enElAnio>=3)lineas.push('<span style="color:var(--red)">⚠ '+enElAnio+' tratamientos en 12 meses — patrón a vigilar</span>');
    pasados.slice(0,4).forEach(t=>{
      lineas.push('💊 '+fmtFechaAno(t.inicio)+' · '+LCRules.esc(t.medicamento||t.problema||'tratamiento')+(t.problema&&t.medicamento?' ('+LCRules.esc(t.problema.toLowerCase())+')':'')+(t.nota?' · '+LCRules.esc(t.nota):'')+' <span style="color:var(--ink-3)">(terminado)</span>');});
    /* solo vacunas que DE VERDAD le aplican (lista exacta; en legado, solo si
     * ya existía en esa fecha — LCRules.vacunaAplicaA) */
    (_vacunaciones||[]).filter(v=>LCRules.vacunaAplicaA(v,animalesPorId[cow.num])).slice(0,3).forEach(v=>{
      lineas.push('💉 '+fmtFechaCorta(v.fecha)+' · '+v.tipo+((v.animales_ids&&v.animales_ids.length>1)?' ('+v.animales_ids.length+' animales)':(v.alcance==='hato'&&!(v.animales_ids&&v.animales_ids.length)?' (ciclo del hato)':'')));});
    if(lineas.length){sl.style.display='';sl.innerHTML=lineas.join('<br>');}
    else{sl.style.display='none';sl.innerHTML='';}
  }
  /* producción mensual individual: solo los meses CON datos, con suma real
     de los ordeños y los días realmente ordeñados (no los del calendario) */
  const md=mensualData.find(c=>c.num===num);
  const mtb=document.getElementById('vacaMensualTb');mtb.innerHTML='';
  const lblM=document.getElementById('vacaMensualLabel');
  if(lblM)lblM.textContent='Producción mensual · '+ANIO_SEL;
  const diasRegMes={};(_ordsRaw||[]).forEach(o=>{if(String(o.animal_id)===String(num)){
    const k=String(o.fecha).slice(0,7);diasRegMes[k]=(diasRegMes[k]||0)+1;}});
  let filas=0,totalL=0,totalDias=0;
  if(md){
    md.m.forEach((v,i)=>{
      const real=Math.round((md.sum&&md.sum[i])||0),dias=diasRegMes[MESES_INFO[i].key]||0;
      if(v===null&&!dias)return;   // mes sin datos: no ensucia la tabla
      filas++;totalL+=real;totalDias+=dias;
      const tr=document.createElement('tr');
      tr.innerHTML='<td><b>'+MESES_L[i]+' '+MESES_INFO[i].year+'</b></td><td class="r">'+(v!==null?v.toFixed(1):'—')+'</td>'+
        '<td class="r"><b>'+real+' L</b></td><td class="r">'+dias+'</td><td class="sub">'+(v!==null&&v<8?'bajo':'normal')+'</td>';
      tr.style.cursor='pointer';tr.title='Ver ese mes en la tabla de registro';
      tr.onclick=()=>{const now=new Date();
        MES_OFFSET=Math.min(0,(MESES_INFO[i].year-now.getFullYear())*12+(MESES_INFO[i].month-now.getMonth()));
        setVistaRegistro('mes');go('pg-leche',document.querySelector('[data-pg="pg-leche"]'));};
      mtb.appendChild(tr);
    });
  }
  if(!filas){mtb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:12px;color:var(--ink-3)">Sin ordeños registrados en '+ANIO_SEL+'.</td></tr>';}
  else{
    const trT=document.createElement('tr');trT.style.cssText='font-weight:700;background:var(--surface)';
    trT.innerHTML='<td>Total</td><td class="r">'+(totalDias?(totalL/totalDias).toFixed(1):'—')+'</td>'+
      '<td class="r">'+totalL+' L</td><td class="r">'+totalDias+'</td><td></td>';
    mtb.appendChild(trT);
  }
}

/* ===== Palpación: la fuente de verdad de la reproducción ===== */
/* reglas puras compartidas (core/rules.js) */
const MESC=LCRules.MESC;
const fechaParto=LCRules.fechaParto;
/* candidatas a palpar (la lista se arma sola) */
let palpCandidatas=[];
/* próximos partos (salen de las palpaciones) */
let proximosPartos=[];
/* partos recientes 2026 */
let partosRecientes=[];
/* partos del año en consulta (ANIO_SEL) */
function partosDelAnio(){return partosRecientes.filter(p=>!p.fechaISO||String(p.fechaISO).slice(0,4)===String(ANIO_SEL));}
/* clasifica cada parto para filtrar/mostrar: viva | mortinato | historico
 * (histórico = parto del registro inicial, sin cría ni sexo detallado). */
function _claseParto(p){
  if(p.estado!=='viva')return 'mortinato';
  return (!p.sexo&&(!p.cria||p.cria==='—'))?'historico':'viva';
}
let _partosBusq='';           // texto de búsqueda (vaca/cría)
let _partosFiltro='todos';    // todos | viva | mortinato | historico
function onPartosBuscar(v){_partosBusq=(v||'').toLowerCase().trim();renderPartosRecientes();}
function onPartosFiltro(f,btn){
  _partosFiltro=f;
  if(btn)[...btn.parentNode.children].forEach(c=>c.classList.toggle('sel',c===btn));
  renderPartosRecientes();
}
/* partos del año, aplicando filtro y búsqueda, más recientes primero */
function _partosRecientesFiltrados(){
  let arr=partosDelAnio();
  if(_partosFiltro!=='todos')arr=arr.filter(p=>_claseParto(p)===_partosFiltro);
  if(_partosBusq)arr=arr.filter(p=>((p.madre||'')+' '+(p.cria||'')).toLowerCase().includes(_partosBusq));
  return arr.slice().sort((a,b)=>String(b.fechaISO||'').localeCompare(String(a.fechaISO||'')));
}
function renderPartosRecientes(){
  const tb=document.getElementById('partosRecientesTbody');if(!tb)return;tb.innerHTML='';
  const arr=_partosRecientesFiltrados();
  const total=partosDelAnio().length;
  const filtrando=_partosBusq||_partosFiltro!=='todos';
  const cnt=document.getElementById('recCount');
  if(cnt)cnt.textContent=filtrando?('· '+arr.length+' de '+total):('· '+total);
  if(!arr.length){
    tb.innerHTML='<tr class="emptyrow"><td colspan="3">'+
      (total?'Ningún parto coincide con la búsqueda o el filtro.':'Sin partos registrados en '+ANIO_SEL+'.')+'</td></tr>';
    return;
  }
  /* agrupados por mes (encabezado fijo por grupo) */
  let mesActual=null;
  arr.forEach(p=>{
    const ym=String(p.fechaISO||'').slice(0,7);
    if(ym&&ym!==mesActual){
      mesActual=ym;
      const mo=parseInt(ym.slice(5,7),10)-1;
      const gr=document.createElement('tr');gr.className='grouprow';
      gr.innerHTML='<td colspan="3">'+((LCRules.MESC[mo]||ym).toUpperCase())+' '+ym.slice(0,4)+'</td>';
      tb.appendChild(gr);
    }
    const tr=document.createElement('tr');
    const cls=_claseParto(p);
    const x=p.id?'<span class="del-x" title="Eliminar este parto" onclick="eliminarPartoHist(\''+LCRules.esc(p.id)+'\',event)">✕</span>':'';
    if(cls==='mortinato'){
      tr.innerHTML='<td>'+LCRules.esc(p.madre)+' → cría</td><td>'+p.fecha+'</td>'+
        '<td class="r"><span class="badge bad">mortinato</span>'+x+'</td>';
    }else if(cls==='historico'){
      tr.innerHTML='<td>'+LCRules.esc(p.madre)+' → '+LCRules.esc(p.cria)+'</td><td>'+p.fecha+'</td>'+
        '<td class="r"><span class="badge">histórico</span>'+x+'</td>';
    }else{
      tr.innerHTML='<td>'+LCRules.esc(p.madre)+' → '+LCRules.esc(p.cria)+'</td><td>'+p.fecha+'</td>'+
        '<td class="r"><span class="badge ok">'+(p.sexo==='H'?'♀':'♂')+' en '+p.grupo+'</span>'+x+'</td>';
    }
    tb.appendChild(tr);
  });
}
/* eliminar un parto del historial (error de dedo): confirma y borra en la base */
function eliminarPartoHist(id,ev){
  if(ev)ev.stopPropagation();
  const p=partosRecientes.find(x=>x.id===id);if(!p)return;
  if(!confirm('¿Eliminar el parto de '+p.madre+' ('+p.fecha+')? El conteo de partos de la vaca baja.'))return;
  const fin=()=>{
    const j=_partosRaw.findIndex(x=>x.id===id);
    let madreId=null;
    if(j>=0){const raw=_partosRaw[j];madreId=raw.madre_id;_partosRaw.splice(j,1);
      if(_partosPorMadre[raw.madre_id]){const k=_partosPorMadre[raw.madre_id].lastIndexOf(raw.fecha);
        if(k>=0)_partosPorMadre[raw.madre_id].splice(k,1);}
      if(_ultimoParto[raw.madre_id]===raw.fecha){const fs=(_partosPorMadre[raw.madre_id]||[]).slice().sort();
        if(fs.length)_ultimoParto[raw.madre_id]=fs[fs.length-1];else delete _ultimoParto[raw.madre_id];}
      if(animalesPorId[raw.madre_id]&&animalesPorId[raw.madre_id].partos>0)animalesPorId[raw.madre_id].partos--;}
    recomputarPartosRecientes();
    renderPartosRecientes();renderPartosKpis();
    if(typeof recomputarRepro==='function')recomputarRepro();
    /* si el borrado vino de la ficha (o la ficha de la madre está abierta), repintarla */
    if(vacaActual&&madreId&&String(vacaActual)===String(madreId))goVaca(vacaActual,vacaFrom);
    snack('Parto eliminado');
  };
  if(typeof LCStore!=='undefined')LCStore.deleteParto(id).then(fin)
    .catch(e=>snack('⚠ No se pudo eliminar: '+(e.message||e)));
  else fin();
}
function renderPartosKpis(){
  const box=document.getElementById('partosKpis');if(!box)return;
  const pa=partosDelAnio();
  const total=pa.length;
  const vivas=pa.filter(p=>p.estado==='viva').length;
  const mortinatos=total-vivas;
  const porParir=proximosPartos.length;
  const prox=proximosPartos.length?proximosPartos[0]:null;
  box.innerHTML=
    '<div class="card kpi"><div class="k-label">Partos</div><div class="k-value">'+total+'</div><div class="k-trend up">'+vivas+' crías vivas</div></div>'+
    '<div class="card kpi"><div class="k-label">Por parir</div><div class="k-value">'+porParir+'</div><div class="k-trend mut">de las palpaciones</div></div>'+
    '<div class="card kpi"><div class="k-label">Próximo</div><div class="k-value" style="font-size:20px">'+(prox?prox.parto:'—')+'</div><div class="k-trend mut">'+(prox?LCRules.esc(prox.cow):'sin próximos')+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Mortinatos</div><div class="k-value'+(mortinatos?' down':'')+'">'+mortinatos+'</div><div class="k-trend mut">de '+total+' partos</div></div>';
  /* línea de resumen: fertilidad (intervalo entre partos) y % mortinatos */
  const res=document.getElementById('partosResumen');
  if(res){
    const parts=[];
    const iv=(typeof _intervaloPartosProm==='function')?_intervaloPartosProm():null;
    if(iv!=null)parts.push('Intervalo entre partos <b style="color:var(--ink)">'+(iv/30.44).toFixed(1)+' meses</b> <span class="mut">(meta 12–13)</span>');
    if(total)parts.push('Mortinatos <b style="color:var(--ink)">'+Math.round(mortinatos/total*100)+'%</b> <span class="mut">'+mortinatos+' de '+total+'</span>');
    if(parts.length){res.style.display='';res.innerHTML=parts.join(' &nbsp;·&nbsp; ');}
    else res.style.display='none';
  }
  refreshHeader();
}
/* KPIs de la página de reproducción (datos reales) */
function renderReproKpis(){
  const A=Object.values(animalesPorId||{});
  const box=document.getElementById('reproKpis');
  if(box){
    const eleg=A.filter(a=>a.sexo==='H'&&['ordeño','horra','novilla'].includes(a.grupo));
    const pren=eleg.filter(a=>a.estadoRepro==='prenada').length;
    const pct=eleg.length?Math.round(pren/eleg.length*100):0;
    const porPalpar=(typeof palpCandidatas!=='undefined'&&palpCandidatas)?palpCandidatas.length:0;
    box.innerHTML=
      '<div class="card kpi"><div class="k-label">Preñez</div><div class="k-value">'+pct+'<span class="k-unit">%</span></div><div class="k-trend mut">'+pren+' de '+eleg.length+' elegibles</div></div>'+
      '<div class="card kpi"><div class="k-label">Preñadas</div><div class="k-value">'+pren+'</div><div class="k-trend mut">en el hato</div></div>'+
      '<div class="card kpi"><div class="k-label">Vacías &gt;120 días</div><div class="k-value'+(vacasVacias.filter(v=>v.decision).length?' down':'')+'">'+vacasVacias.filter(v=>v.decision).length+'</div><div class="k-trend mut">de '+vacasVacias.filter(v=>v.estado==='vacia').length+' vacías</div></div>'+
      '<div class="card kpi"><div class="k-label">Por palpar</div><div class="k-value'+(porPalpar?' down':'')+'">'+porPalpar+'</div><div class="k-trend mut">servidas y vacías por confirmar</div></div>';
  }
  renderReproResumen();
}
/* indicadores de fertilidad del hato: días abiertos promedio + intervalo entre partos */
function renderReproResumen(){
  const box=document.getElementById('reproResumen');if(!box)return;
  const abiertas=Object.values(animalesPorId||{}).filter(a=>a.sexo==='H'&&(a.estadoRepro==='vacia'||a.estadoRepro==='servida'));
  const das=abiertas.map(a=>_diasAbiertos(a.id)).filter(d=>d!=null);
  const daProm=das.length?Math.round(das.reduce((s,d)=>s+d,0)/das.length):null;
  const iv=_intervaloPartosProm();
  const parts=[];
  if(daProm!=null)parts.push('Días abiertos promedio <b style="color:var(--ink)">'+daProm+' días</b> <span class="mut">(meta 90–110)</span>');
  if(iv!=null)parts.push('Intervalo entre partos <b style="color:var(--ink)">'+(iv/30.44).toFixed(1)+' meses</b> <span class="mut">(meta 12–13)</span>');
  if(!parts.length){box.style.display='none';return;}
  box.style.display='';box.innerHTML=parts.join(' · ');
}
/* vacas vacías que requieren decisión */
let vacasVacias=[];
function renderPartos(){
  const tb=document.getElementById('partosTbody');if(!tb)return;tb.innerHTML='';
  const cnt=document.getElementById('proxCount');if(cnt)cnt.textContent='· '+proximosPartos.length;
  if(!proximosPartos.length){
    tb.innerHTML='<tr class="emptyrow"><td colspan="3">Ninguna preñez confirmada por ahora.</td></tr>';return;
  }
  proximosPartos.forEach(p=>{
    const tr=document.createElement('tr');
    const num=p.cow.split('·')[0].trim();
    tr.onclick=()=>goVaca(num,'pg-partos');
    /* resaltar las que paren esta semana o ya se pasaron de fecha */
    let cell=p.badge?'<span class="badge '+p.badge+'">'+p.parto+'</span>':p.parto;
    if(p.partoISO&&typeof diasHasta==='function'){const d=diasHasta(p.partoISO);
      if(d<0){cell=p.parto+' <span class="badge bad">atrasada '+(-d)+'d</span>';tr.style.background='var(--red-soft,#fdecec)';}
      else if(d<=7)cell=p.parto+' <span class="badge warn">pare en '+d+'d</span>';
    }
    tr.innerHTML='<td>'+LCRules.esc(p.cow)+'</td><td>'+p.prenez+'</td><td class="r">'+cell+'</td>';
    tb.appendChild(tr);
  });
}
function renderVacias(){
  const tb=document.getElementById('vaciasTbody');if(!tb)return;tb.innerHTML='';
  if(!vacasVacias.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--ink-3)">No hay vacas por revisar ahora.</td></tr>';}
  vacasVacias.forEach(v=>{
    const tr=document.createElement('tr');
    const servida=v.estado==='servida';
    const diasBadge=v.dias!=null?('<span class="badge'+(v.decision?' bad':'')+'">'+v.dias+' d</span>'):'—';
    const ultimaTxt=v.ultima&&v.ultima!=='—'?(v.ultima+' → '+(servida?'servida':'vacía')):(servida?'servida (por confirmar)':'sin palpación');
    const recColor=v.decision?'color:var(--red)':(servida?'color:var(--ink-2)':'color:var(--ink-3)');
    tr.innerHTML='<td><div class="cell-animal"><div class="cini">'+LCRules.esc(v.num)+'</div><div><div class="cn">'+
      LCRules.esc(v.cow.split('·')[1].trim())+'</div><div class="cs">'+LCRules.esc(v.sub)+'</div></div></div></td>'+
      '<td class="r">'+(v.del==null||v.del==='—'?'—':v.del)+'</td><td class="r">'+diasBadge+'</td>'+
      '<td>'+ultimaTxt+'</td><td class="r"><b>'+v.ayer+'</b></td>'+
      '<td style="'+recColor+';font-size:12px">'+v.rec+'</td>'+
      '<td class="r" style="white-space:nowrap"><button class="btn outl small vPalp">Palpar</button> '+
      '<button class="btn outl small vSeca">Secar</button> '+
      '<button class="btn outl small vBaja" style="color:var(--red);border-color:var(--red)">Baja</button></td>';
    tr.querySelector('.vPalp').onclick=e=>{e.stopPropagation();openPalp(v.cow);};
    tr.querySelector('.vSeca').onclick=e=>{e.stopPropagation();openSeca(v.cow);};
    tr.querySelector('.vBaja').onclick=e=>{e.stopPropagation();openBaja(v.cow);};
    tb.appendChild(tr);
  });
  const dec=vacasVacias.filter(v=>v.decision).length;
  const serv=vacasVacias.filter(v=>v.estado==='servida').length;
  const lbl=document.getElementById('vaciasLabel');
  if(lbl){let extra=[];if(serv)extra.push(serv+' servida'+(serv===1?'':'s')+' por confirmar');if(dec)extra.push(dec+' requiere'+(dec===1?'':'n')+' decisión');
    lbl.textContent='Vacas por revisar · '+vacasVacias.length+(extra.length?' ('+extra.join(' · ')+')':'');}
  refreshHeader();renderNavBadges();
}

/* ===== Tratamientos / sanidad del animal ===== */
let tratamientos=[];
/* derivación tratamiento canónico (BD) → tarjeta de la UI. El texto principal
 * es el TRATAMIENTO (medicamento); `problema` solo aparece en filas viejas que
 * lo traían. La nota se muestra si existe. */
function tratamientoAFila(t){
  const desc=(t.medicamento||t.problema||'Tratamiento')+
    (t.problema&&t.medicamento?' ('+t.problema.toLowerCase()+')':'')+
    (t.nota?' · '+t.nota:'');
  const retiroD=t.retiro_leche_hasta?Math.round((new Date(t.retiro_leche_hasta+'T00:00:00')-HOY_LC)/86400000):null;
  const conRetiro=retiroD!=null&&retiroD>=0;
  return {id:t.id,num:t.animal_id,n:(t.animales&&t.animales.nombre)||t.animal_id,desc:desc,
    retiro:conRetiro?'retiro de leche hasta '+fmtFechaCorta(t.retiro_leche_hasta):'',
    badge:conRetiro?'retiro '+retiroD+'d':'sin retiro',badgeCls:conRetiro?'bad':'ok'};
}
let _tratamientosTodos=[];   // historial completo (activos y terminados) para la ficha
(async function cargarTratamientosDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const ts=await LCStore.getTratamientos();   // TODOS
    if(!ts)return;
    _tratamientosTodos=ts;
    tratamientos=ts.filter(t=>t.activo).map(tratamientoAFila);
    renderTratamientos();
  }catch(e){console.warn('Tratamientos: usando datos locales:',e.message||e);}
})();
/* Sanidad · vacunas: brucelosis desde crías hembra reales (3-8 meses) + mes actual */
function renderSanidadVacunas(){
  const A=Object.values(animalesPorId||{});
  const el=document.getElementById('sanBrucelosis');
  if(el){
    const t=A.filter(a=>a.grupo==='cria'&&a.sexo==='H'&&a.edadAnios!=null&&a.edadAnios>=0.25&&a.edadAnios<=0.67);
    if(t.length){el.style.display='';
      el.querySelector('.a-title').textContent='Brucelosis: '+t.length+' cría'+(t.length>1?'s':'')+' hembra en ventana de vacunación';
      el.querySelector('.a-sub').textContent=t.slice(0,6).map(x=>x.id+(x.nombre?' '+x.nombre:'')).join(', ')+' · vacuna única entre los 3 y 8 meses';
    }else el.style.display='none';
  }
  renderSanCalendario();
  renderSanProxima();
}
/* Protocolo sanitario del hato (meses 0-11) */
const PROTOCOLO_SAN=LCRules.PROTOCOLO_SAN;   // única fuente compartida (rules.js)
/* última vacunación registrada de un tipo (fecha ISO o null) */
function _ultimaVac(tipo){
  const v=(_vacunaciones||[]).filter(x=>x.tipo===tipo&&x.fecha).sort((a,b)=>a.fecha<b.fecha?1:-1);
  return v.length?v[0].fecha:null;
}
/* Calendario: el PLAN (protocolo) + lo HECHO (vacunaciones reales del año) */
function renderSanCalendario(){
  const cal=document.getElementById('sanCalendario');if(!cal)return;
  const mesActual=new Date().getMonth(),anioActual=new Date().getFullYear();
  /* tipos registrados por mes del año en consulta */
  const hechoPorMes={};
  (_vacunaciones||[]).forEach(v=>{
    if(!v.fecha||String(v.fecha).slice(0,4)!==String(ANIO_SEL))return;
    const m=parseInt(String(v.fecha).slice(5,7),10)-1;
    (hechoPorMes[m]=hechoPorMes[m]||new Set()).add(v.tipo);
  });
  const ABR={aftosa:'aftosa',desparasitacion:'despar.',brucelosis:'brucel.',vitaminas:'vitam.',otra:'otra'};
  let h='';
  for(let m=0;m<12;m++){
    const plan=[];
    if(PROTOCOLO_SAN.despar.includes(m))plan.push('despar.');
    if(PROTOCOLO_SAN.aftosa.includes(m))plan.push('aftosa');
    const hecho=hechoPorMes[m]?[...hechoPorMes[m]].map(t=>ABR[t]||t):[];
    const esAhora=(m===mesActual&&String(ANIO_SEL)===String(anioActual));
    const cls='pot'+(hecho.length?'':' off')+(esAhora?' now':'');
    const cap=hecho.length
      ?'<span style="color:var(--green);font-weight:700">✓ '+hecho.join(' + ')+'</span>'
      :(plan.length?plan.join(' + '):'—');
    h+='<div class="'+cls+'"><div class="p-top"><span class="p-name">'+LCRules.MESC[m].toUpperCase()+'</span>'+
       (plan.length&&!hecho.length?'<span class="dot"></span>':'')+'</div>'+
       '<div class="p-cap" style="margin-top:6px">'+cap+'</div></div>';
  }
  cal.innerHTML=h;
}
/* Próxima vacunación REAL: del protocolo + lo último registrado */
function renderSanProxima(){
  const tit=document.getElementById('sanProximaTitulo'),sub=document.getElementById('sanProximaSub');
  if(!tit||!sub)return;
  const hoy=new Date();hoy.setHours(0,0,0,0);   // new Date() directo: corre en el arranque (antes de HOY_LC)
  const cands=[];
  /* desparasitación: cada 3 meses desde la última registrada */
  const ud=_ultimaVac('desparasitacion');
  if(ud){const d=new Date(ud+'T00:00:00');d.setMonth(d.getMonth()+3);
    cands.push({tipo:'Desparasitación',fecha:d,base:'última: '+fmtFechaCorta(ud)});}
  else cands.push({tipo:'Desparasitación',fecha:hoy,base:'sin registro aún'});
  /* aftosa: ciclos ICA de mayo y noviembre */
  const ua=_ultimaVac('aftosa');
  {let y=hoy.getFullYear();let prox=null;
   for(const m of [4,10,16,22]){const d=new Date(y,m,1);
     const ym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
     if(d>=hoy&&(!ua||ym>String(ua).slice(0,7))){prox=d;break;}}
   if(prox)cands.push({tipo:'Aftosa (ciclo ICA)',fecha:prox,base:ua?('última: '+fmtFechaCorta(ua)+' '+String(ua).slice(0,4)):'sin registro aún'});}
  cands.sort((a,b)=>a.fecha-b.fecha);
  const p=cands[0];
  const vencida=p.fecha<=hoy;
  const f=p.fecha;
  tit.innerHTML='Próxima: '+p.tipo+(vencida?' <span style="color:var(--red)">· ya toca</span>'
    :' · ~'+f.getDate()+' '+LCRules.MESC[f.getMonth()]);
  sub.textContent=p.base+' · protocolo: desparasitación cada 3 meses · aftosa may/nov';
}
/* Exportar soporte ICA: CSV real con las vacunaciones del año en consulta */
function exportarSoporteICA(){
  const filas=(_vacunaciones||[]).filter(v=>!v.fecha||String(v.fecha).slice(0,4)===String(ANIO_SEL));
  if(!filas.length){snack('No hay vacunaciones registradas en '+ANIO_SEL);return;}
  const esc=x=>'"'+String(x==null?'':x).replace(/"/g,'""')+'"';
  const head=['fecha','tipo','alcance','animal','n_animales','producto','lote','nota'];
  const csv='﻿'+head.join(';')+'\n'+filas.map(v=>[
    v.fecha,v.tipo,v.alcance,
    v.alcance==='individual'?(v.animal_id+(v.animales&&v.animales.nombre?' '+v.animales.nombre:'')):'todo el hato',
    v.n_animales,v.producto,v.lote,v.nota].map(esc).join(';')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='soporte-ica-'+ANIO_SEL+'.csv';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  snack('Soporte ICA descargado: '+filas.length+' registro'+(filas.length===1?'':'s')+' de '+ANIO_SEL);
}
/* ===== Registro de vacunaciones ===== */
const TIPO_VAC=[{val:'aftosa',label:'Aftosa'},{val:'brucelosis',label:'Brucelosis'},
  {val:'desparasitacion',label:'Desparasitación'},{val:'vitaminas',label:'Vitaminas'},{val:'otra',label:'Otra'}];
/* ===== REGISTRO SANITARIO UNIFICADO (vacunación + tratamiento) ==============
 * Un solo modal con dos modos. La lista de animales es COMPARTIDA: buscador
 * por número/nombre (pensado para ~100 animales: la lista es scrolleable y el
 * buscador la corta al toque), "Seleccionar todas" que actúa sobre lo
 * FILTRADO, y contador global. Vacunación arranca con todas marcadas (el
 * ciclo típico); tratamiento arranca sin marcar (se tratan pocas). Se guarda
 * la lista EXACTA de animales. Campo de nota en ambos modos. */
const sanidadState={};
function _sanContador(){
  const c=document.getElementById('vacSelCount');if(!c)return;
  const filas=document.querySelectorAll('#vacListaSel label[data-num]');
  const visibles=[...filas].filter(l=>l.style.display!=='none');
  c.textContent=sanidadState.sel.size+' de '+filas.length+' seleccionadas';
  const master=document.getElementById('vacSelTodas');
  if(master)master.checked=visibles.length>0&&visibles.every(l=>sanidadState.sel.has(l.dataset.num));
  const lbl=document.getElementById('sanSelTodasLbl');
  if(lbl)lbl.textContent=visibles.length===filas.length?'Seleccionar todas':'Seleccionar las filtradas ('+visibles.length+')';
}
/* filtro combinado (grupo + texto): una fila es visible si pasa AMBOS */
function _sanAplicarFiltro(cont){
  const q=((document.getElementById('sanBuscar')||{}).value||'').trim().toLowerCase();
  const g=sanidadState.filtroGrupo||'';
  cont.querySelectorAll('label[data-num]').forEach(l=>{
    const pasa=(!q||l.dataset.txt.indexOf(q)>=0)&&(!g||l.dataset.grupo===g);
    l.style.display=pasa?'flex':'none';
  });
  _sanContador();
}
function _sanSelector(body){
  const activos=Object.values(animalesPorId).filter(a=>a.grupo!=='baja')
    .sort((x,y)=>String(x.id).localeCompare(String(y.id),undefined,{numeric:true}));
  const cont=document.createElement('div');
  cont.innerHTML='<input id="sanBuscar" placeholder="🔍 Buscar por número o nombre…" autocomplete="off" '+
      'style="width:100%;border:1.5px solid var(--border);border-radius:10px;background:var(--card);font-family:inherit;font-size:13px;padding:8px 12px;outline:none;margin:2px 0 6px;box-sizing:border-box">'+
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;padding:6px 2px;border-bottom:1px solid var(--border);cursor:pointer">'+
    '<input type="checkbox" id="vacSelTodas"> <span id="sanSelTodasLbl">Seleccionar todas</span>'+
    '<span id="vacSelCount" style="margin-left:auto;font-weight:500;color:var(--ink-2)"></span></label>'+
    '<div id="vacListaSel" style="max-height:200px;overflow-y:auto;padding:4px 2px">'+
    activos.map(a=>'<label data-num="'+LCRules.esc(String(a.id))+'" data-grupo="'+LCRules.esc(a.grupo||'')+'" data-txt="'+LCRules.esc((String(a.id)+' '+(a.nombre||'')).toLowerCase())+'" '+
      'style="display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0;cursor:pointer;border-bottom:1px solid var(--surface)">'+
      '<input type="checkbox" data-animal="'+LCRules.esc(String(a.id))+'"'+(sanidadState.sel.has(String(a.id))?' checked':'')+'> '+
      '<b>'+LCRules.esc(String(a.id))+'</b> '+LCRules.esc(a.nombre||'')+
      ' <span style="margin-left:auto;color:var(--ink-3);font-size:11.5px">'+(GRUPO_DISPLAY[a.grupo]||a.grupo)+'</span></label>').join('')+
    '</div>';
  /* chips de filtro por grupo: 'Todas' + solo los grupos presentes, con conteo.
   * Combinado con "Seleccionar todas" (que actúa sobre lo visible) da
   * "vacunar/tratar todo un grupo" en dos toques. */
  const porGrupo={};activos.forEach(a=>{porGrupo[a.grupo]=(porGrupo[a.grupo]||0)+1;});
  const ordenG=['ordeño','horra','novilla','levante','cria','macho'].filter(g=>porGrupo[g]);
  const itemsG=[{val:'',label:'Todas ('+activos.length+')'}]
    .concat(ordenG.map(g=>({val:g,label:(GRUPO_DISPLAY[g]||g)+' ('+porGrupo[g]+')'})));
  const chipsG=regChips(itemsG,sanidadState.filtroGrupo||'',v=>{sanidadState.filtroGrupo=v;_sanAplicarFiltro(cont);});
  chipsG.style.marginBottom='4px';
  body.appendChild(chipsG);
  body.appendChild(cont);
  cont.querySelector('#sanBuscar').oninput=function(){_sanAplicarFiltro(cont);};
  cont.querySelector('#vacSelTodas').onchange=function(){
    const on=this.checked;
    cont.querySelectorAll('label[data-num]').forEach(l=>{
      if(l.style.display==='none')return;   // el master solo toca lo VISIBLE (filtrado)
      const cb=l.querySelector('input[data-animal]');cb.checked=on;
      if(on)sanidadState.sel.add(cb.dataset.animal);else sanidadState.sel.delete(cb.dataset.animal);
    });
    _sanContador();
  };
  cont.querySelectorAll('input[data-animal]').forEach(cb=>{cb.onchange=function(){
    if(this.checked)sanidadState.sel.add(this.dataset.animal);else sanidadState.sel.delete(this.dataset.animal);
    _sanContador();
  };});
  _sanAplicarFiltro(cont);   // aplica el filtro vigente (grupo) al reconstruirse
}
function openSanidad(modo,cowPre){
  const s=sanidadState;
  s.modo=modo||'vacuna';
  s.fecha=isoHoy();s.nota='';
  s.tipo='aftosa';s.producto='';s.lote='';s.proxima='';
  /* medicamento: texto LIBRE y obligatorio (hay que saber QUÉ se le puso);
   * retiro arranca en 0 — solo se sube si de verdad hay retiro de leche */
  s.medicina='';s.retiro=0;
  s.filtroGrupo='';   // filtro de grupo de la lista: arranca en 'Todas'
  const activos=Object.values(animalesPorId).filter(a=>a.grupo!=='baja');
  const pre=cowPre?String(cowPre).split('·')[0].trim():null;
  /* vacuna: todas marcadas (el ciclo); tratamiento: solo la preseleccionada */
  s.sel=s.modo==='vacuna'?new Set(activos.map(a=>String(a.id))):new Set(pre?[pre]:[]);
  openReg('Registro sanitario','Vacunación o tratamiento · marca a quiénes se les aplicó');
  _sanBody();
}
function _sanBody(){
  const s=sanidadState;
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('¿Qué vas a registrar?'));
  body.appendChild(regChips([{val:'vacuna',label:'💉 Vacunación'},{val:'trata',label:'💊 Tratamiento'}],s.modo,
    v=>{if(v===s.modo)return;s.modo=v;
      /* al cambiar de modo, la selección vuelve al default de ese modo */
      const activos=Object.values(animalesPorId).filter(a=>a.grupo!=='baja');
      s.sel=v==='vacuna'?new Set(activos.map(a=>String(a.id))):new Set();
      _sanBody();}));
  if(s.modo==='vacuna'){
    body.appendChild(regLabel('Tipo'));
    body.appendChild(regChips(TIPO_VAC,s.tipo,v=>s.tipo=v));
  }else{
    /* el NOMBRE del medicamento/tratamiento es texto libre y OBLIGATORIO —
     * hay que poder saber después qué se le puso a la vaca. Los chips son
     * atajos que rellenan el campo (y se puede seguir escribiendo encima). */
    const medWrap=regTexto('Medicamento / tratamiento aplicado (obligatorio)','Ej. Oxitetraciclina 200, Ivermectina, calcio…',v=>s.medicina=v,'text',s.medicina);
    const medInp=medWrap.querySelector('input');
    body.appendChild(medWrap);
    const sugerencias=regChips(['Antibiótico','Antiinflamatorio','Vitaminas','Desparasitante'].map(m=>({val:m,label:m})),s.medicina,
      v=>{s.medicina=v;if(medInp){medInp.value=v;medInp.focus();}});
    sugerencias.style.marginTop='6px';
    body.appendChild(sugerencias);
  }
  body.appendChild(regLabel('¿A quiénes?'));
  _sanSelector(body);
  if(s.modo==='vacuna'){
    body.appendChild(regTexto('Producto (opcional)','Ej. Aftogan',v=>s.producto=v,'text',s.producto));
    body.appendChild(regTexto('Lote (opcional)','lote del biológico',v=>s.lote=v,'text',s.lote));
    body.appendChild(regTexto('Próxima dosis (opcional)','',v=>s.proxima=v,'date',s.proxima));
  }else{
    body.appendChild(regLabel('Días de retiro de leche'));
    body.appendChild(regStepper(()=>s.retiro,v=>s.retiro=v,0,10,'días'));
  }
  body.appendChild(regTexto('Fecha','',v=>s.fecha=v,'date',s.fecha));
  body.appendChild(regTexto('Nota (opcional)','Ej. dosis, quién aplicó, reacción…',v=>s.nota=v,'text',s.nota));
  document.getElementById('regSaveBtn').onclick=saveSanidad;
}
/* wrappers: los botones y menús existentes siguen funcionando */
function openVacuna(){openSanidad('vacuna');}
function saveSanidad(){
  const s=sanidadState;
  const ids=Array.from(s.sel||[]);
  if(!ids.length){snack('Marca al menos un animal en la lista');return;}
  if(s.modo==='trata'){
    s.medicina=(s.medicina||'').trim();
    if(!s.medicina){snack('Escribe el nombre del medicamento o tratamiento que aplicaste');return;}
  }
  if(s.modo==='vacuna')_saveVacunaSan(ids);else _saveTrataSan(ids);
}
function _saveVacunaSan(ids){
  const s=sanidadState;
  closeReg();
  const tipoLabel=(TIPO_VAC.find(t=>t.val===s.tipo)||{}).label||s.tipo;
  if(typeof LCStore!=='undefined'){
    LCStore.registrarVacunacion({tipo:s.tipo,animalIds:ids,
      producto:s.producto||null,lote:s.lote||null,fecha:s.fecha||isoHoy(),
      proxima:s.proxima||null,nota:s.nota||null})
      .then(()=>cargarVacunaciones())
      .catch(e=>{console.warn('Vacunación no guardada:',e.message||e);snack('⚠ La vacunación NO se guardó en la base — reintenta');});
  }
  snack('Vacunación registrada: '+tipoLabel+' · '+(ids.length===1?ids[0]:ids.length+' animales'));
}
let _vacunaciones=[];
function renderVacunaciones(lista){
  if(lista)_vacunaciones=lista;
  renderSanCalendario();renderSanProxima();   // calendario y próxima salen de lo registrado
  const box=document.getElementById('vacListaHist');if(!box)return;
  const arr=(_vacunaciones||[]).filter(v=>!v.fecha||String(v.fecha).slice(0,4)===String(ANIO_SEL));
  if(!arr.length){box.innerHTML='<span style="color:var(--ink-3)">Sin vacunaciones en '+ANIO_SEL+'.</span>';return;}
  box.innerHTML=arr.slice(0,10).map(v=>{
    const quien=v.alcance==='individual'
      ?((v.animales&&v.animales.nombre)?v.animal_id+' '+v.animales.nombre:(v.animal_id||'animal'))
      :((v.animales_ids&&v.animales_ids.length)?(v.animales_ids.length+' animales')   // registro nuevo: lista exacta
        :('todo el hato'+(v.n_animales?' ('+v.n_animales+')':'')));                    // legado: solo conteo
    return '<div><b style="color:var(--ink)">'+fmtFechaCorta(v.fecha)+'</b> · '+LCRules.esc(v.tipo)+' · '+LCRules.esc(quien)+
      (v.producto?' · '+LCRules.esc(v.producto):'')+(v.lote?' · lote '+LCRules.esc(v.lote):'')+
      ' <span class="del-x" title="Eliminar esta vacunación" onclick="eliminarVacHist(\''+LCRules.esc(v.id)+'\')">✕</span></div>';
  }).join('');
}
/* eliminar una vacunación del historial (error de dedo) */
function eliminarVacHist(id){
  if(!confirm('¿Eliminar esta vacunación del registro?'))return;
  const fin=()=>{const i=_vacunaciones.findIndex(v=>String(v.id)===String(id));
    if(i>=0)_vacunaciones.splice(i,1);renderVacunaciones();snack('Vacunación eliminada');};
  if(typeof LCStore!=='undefined')LCStore.deleteVacunacion(id).then(fin)
    .catch(e=>snack('⚠ No se pudo eliminar: '+(e.message||e)));
  else fin();
}
async function cargarVacunaciones(){
  if(typeof LCStore==='undefined')return;
  try{const v=await LCStore.getVacunaciones();renderVacunaciones(v);}
  catch(e){console.warn('Vacunaciones:',e.message||e);}
}
cargarVacunaciones();
function renderTratamientos(){
  const cont=document.getElementById('tratActivos');if(!cont)return;cont.innerHTML='';
  tratamientos.forEach((t,i)=>{
    const card=document.createElement('div');card.className='card';card.style.cssText='margin-bottom:10px';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px">'+
      '<div class="cell-animal" style="display:flex;gap:10px;align-items:center">'+
        '<div class="cini">'+LCRules.esc(t.num)+'</div>'+
        '<div><div class="cn">'+LCRules.esc(t.n)+'</div><div class="cs">'+LCRules.esc(t.desc)+
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
      medicamento:trats.join(', '),diasRetiro:0})
      .then(r=>{if(r&&r.id)reg.id=r.id;}).catch(()=>{});
  }
  renderTratamientos();
  /* función para deshacer lo aplicado (revierte sanidad) */
  return function(){
    const i=tratamientos.indexOf(reg);if(i>=0)tratamientos.splice(i,1);
    renderTratamientos();
  };
}
const palp={cow:'',nota:'',parsed:null};
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
  const fIn=document.getElementById('palpFecha');if(fIn)fIn.value=isoHoy();   // por defecto hoy, editable
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
  const fIn=document.getElementById('palpFecha');
  const fechaPalp=(fIn&&fIn.value)?fIn.value:isoHoy();   // fecha real de la palpación
  closePalp();
  /* los tratamientos aplicados quedan en la sanidad del animal, sea cual sea el resultado */
  const undoTrat=aplicarTratamientos(num,nombre,p.trat,nota);
  /* Estado único: snapshot COMPLETO de la caché canónica para poder
   * restaurarla entera al deshacer; proximosPartos/vacasVacias/palpCandidatas
   * se DERIVAN de ella (recomputarRepro), ya no se parchan a mano. */
  const animalPrev=animalesPorId[num]?{...animalesPorId[num]}:null;
  const reproAntes=animalPrev?snapshotReproDB(animalPrev):null;
  /* "por qué" era candidata a palpar ANTES de este examen (para el registro);
   * antes salía de la lista parcheada a mano, ahora se deriva del snapshot previo. */
  const motivoPrevio=_motivoCandidata(animalPrev);
  let palpId=null;
  const opciones={
    escribir:typeof LCStore!=='undefined'?()=>{
      const campos={ultima_palpacion:fechaPalp};let prenezMeses=null;
      if(p.tipo==='prenada'){const m=Math.round(p.meses);prenezMeses=m;
        campos.estado_repro='prenada';campos.prenez_meses=m;}
      else if(p.tipo==='vacia'){campos.estado_repro='vacia';campos.prenez_meses=null;}
      return LCStore.registrarPalpacion({animalId:num,resultado:nota,fecha:fechaPalp,
        motivo:motivoPrevio,prenezMeses:prenezMeses})
        .then(r=>{palpId=r&&r.id;return LCStore.updateAnimalCampos(num,campos);})
        .then(()=>{if(typeof cargarPalpHistorial==='function')cargarPalpHistorial();});
    }:null,
    avisoError:()=>'⚠ La palpación NO se guardó en la base — reintenta',
    snack,
  };
  if(p.tipo==='prenada'){
    const meses=Math.round(p.meses);
    const f=fechaParto(meses);
    const trats=p.trat.length?' · Trat: '+p.trat.join(', '):'';
    opciones.aplicar=()=>{
      if(animalesPorId[num])Object.assign(animalesPorId[num],{estadoRepro:'prenada',
        prenez:{meses:meses,partoEstimado:LCRules.partoEstimadoCalc(fechaPalp,meses),ultimaPalpacion:fechaPalp},
        ultimaPalpacion:fechaPalp,secarEstimado:LCRules.secarCalc(fechaPalp,meses),diasVacia:null});
      recomputarRepro();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();
      go('pg-partos',document.querySelector('[data-pg="pg-partos"]'));
    };
    opciones.mensaje=nombre+': '+nota+' → preñada ~'+p.dias+'d — parto '+f.corta+trats;
    opciones.revertir=()=>{
      if(animalPrev&&animalesPorId[num])animalesPorId[num]=animalPrev;
      recomputarRepro();
      if(undoTrat)undoTrat();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();
    };
  }else if(p.tipo==='vacia'){
    opciones.aplicar=()=>{
      if(animalesPorId[num])Object.assign(animalesPorId[num],{estadoRepro:'vacia',
        prenez:null,ultimaPalpacion:fechaPalp,secarEstimado:null,
        diasVacia:LCRules.diasVaciaCalc(fechaPalp,isoHoy())});
      recomputarRepro();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();
      go('pg-repro',document.querySelector('[data-pg="pg-repro"]'));
    };
    opciones.mensaje=nombre+': '+nota+' → vacía — lista para servicio';
    opciones.revertir=()=>{
      if(animalPrev&&animalesPorId[num])animalesPorId[num]=animalPrev;
      recomputarRepro();
      if(undoTrat)undoTrat();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();
    };
  }else{
    /* anotación libre sin resultado reproductivo claro: no hay nada que "deshacer".
     * Igual que la BD (campos solo trae ultima_palpacion), se actualiza SOLO esa
     * fecha — el estado (vacía/servida/preñada) no cambia hasta una palpación
     * concluyente, así que sigue apareciendo en las listas si correspondía. */
    opciones.aplicar=()=>{
      if(animalesPorId[num]){animalesPorId[num].ultimaPalpacion=fechaPalp;
        if(animalesPorId[num].estadoRepro==='vacia')animalesPorId[num].diasVacia=LCRules.diasVaciaCalc(fechaPalp,isoHoy());}
      recomputarRepro();
      renderPalpLista();renderVacias();
    };
    const trats=p.trat.length?' · tratamiento aplicado: '+p.trat.join(', '):'';
    opciones.mensaje=nombre+': '+nota+' → '+p.label+trats;
  }
  if(opciones.revertir&&typeof LCStore!=='undefined'){
    opciones.compensarBD=()=>Promise.all([
      palpId?LCStore.deletePalpacion(palpId):null,
      reproAntes?LCStore.updateAnimalCampos(num,reproAntes):null,
    ]);
  }
  LCAcciones.ejecutarConDeshacer(opciones);
}
function renderPalpLista(){
  const box=document.getElementById('palpListaBox');if(!box)return;
  if(!palpCandidatas.length){box.innerHTML='<span class="mut">No hay candidatas para palpar</span>';return;}
  box.innerHTML=palpCandidatas.map(c=>'<b style="color:var(--ink)">'+LCRules.esc(c.cow.replace(' · ',' '))+'</b> — '+c.motivo).join('<br>');
}
/* ===== Historial de palpaciones ===== */
function renderPalpHistorial(lista){
  const tb=document.getElementById('palpHistTbody');if(!tb)return;tb.innerHTML='';
  const arr=(lista||_palpaciones||[]).filter(p=>!p.fecha||String(p.fecha).slice(0,4)===String(ANIO_SEL));
  if(!arr.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--ink-3)">Sin palpaciones en '+ANIO_SEL+'.</td></tr>';return;}
  arr.slice(0,60).forEach(p=>{
    const nombre=(p.animales&&p.animales.nombre)?p.animales.nombre:'';
    const esPren=(p.prenez_meses!=null)||/pre/i.test(p.resultado||'');
    const res=p.resultado||(esPren?'preñada':'vacía');
    const tr=document.createElement('tr');tr.style.cursor='pointer';
    tr.onclick=()=>goVaca(p.animal_id,'pg-repro');
    tr.innerHTML='<td>'+(typeof fmtFechaCorta==='function'?fmtFechaCorta(p.fecha):p.fecha)+'</td>'+
      '<td><b>'+p.animal_id+'</b> '+nombre+'</td>'+
      '<td><span class="badge'+(esPren?' ok':'')+'">'+res+'</span></td>'+
      '<td class="r">'+(p.prenez_meses!=null?p.prenez_meses+' m':'—')+'</td>'+
      '<td style="font-size:12px;color:var(--ink-3)">'+LCRules.esc(p.motivo||'')+
      ' <span class="del-x" title="Eliminar esta palpación" onclick="eliminarPalpHist(\''+LCRules.esc(p.id)+'\',event)">✕</span></td>';
    tb.appendChild(tr);
  });
}
/* eliminar una palpación del historial (error de dedo) */
function eliminarPalpHist(id,ev){
  if(ev)ev.stopPropagation();
  if(!confirm('¿Eliminar esta palpación del historial?'))return;
  const fin=()=>{const i=_palpaciones.findIndex(p=>String(p.id)===String(id));
    if(i>=0)_palpaciones.splice(i,1);renderPalpHistorial(_palpaciones);snack('Palpación eliminada');};
  if(typeof LCStore!=='undefined')LCStore.deletePalpacion(id).then(fin)
    .catch(e=>snack('⚠ No se pudo eliminar: '+(e.message||e)));
  else fin();
}
async function cargarPalpHistorial(){
  if(typeof LCStore==='undefined'){renderPalpHistorial([]);return;}
  try{const ps=await LCStore.getPalpaciones();_palpaciones=ps||[];renderPalpHistorial(_palpaciones);
    const pv=document.getElementById('pg-vaca');
    if(vacaActual&&pv&&pv.classList.contains('active'))renderVacaPalpaciones(vacaActual);}   // refresca la ficha abierta
  catch(e){console.warn('Historial de palpaciones:',e.message||e);renderPalpHistorial([]);}
}
/* palpaciones de UNA vaca, para su ficha */
function renderVacaPalpaciones(num){
  const tb=document.getElementById('vacaPalpTb');if(!tb)return;tb.innerHTML='';
  const ps=(_palpaciones||[]).filter(p=>String(p.animal_id)===String(num));
  if(!ps.length){tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:12px;color:var(--ink-3)">Sin palpaciones registradas.</td></tr>';return;}
  ps.forEach(p=>{
    const esPren=(p.prenez_meses!=null)||/pre/i.test(p.resultado||'');
    const res=p.resultado||(esPren?'preñada':'vacía');
    tb.innerHTML+='<tr><td>'+fmtFechaAno(p.fecha)+'</td>'+
      '<td><span class="badge'+(esPren?' ok':'')+'">'+res+'</span></td>'+
      '<td class="r">'+(p.prenez_meses!=null?p.prenez_meses+' m':'—')+'</td>'+
      '<td style="font-size:12px;color:var(--ink-3)">'+LCRules.esc(p.motivo||'')+'</td></tr>';
  });
}
renderPartos();renderPartosRecientes();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();renderTratamientos();renderSanidadVacunas();
cargarPalpHistorial();
/* ===== Estado único (Fase 6, paso 1): próximos partos / vacías / candidatas
 * a palpar YA NO son arrays parcheados a mano por cada acción — se DERIVAN de
 * animalesPorId (la caché canónica) cada vez que algo la cambia. Elimina la
 * clase de bug "me olvidé de actualizar este caché tras la acción". Misma
 * lógica que antes vivía inline en cargarReproDesdeSupabase(). ===== */
function derivarProximosPartos(){
  return Object.values(animalesPorId)
    .filter(a=>a.grupo!=='baja'&&a.estadoRepro==='prenada'&&a.prenez&&a.prenez.partoEstimado)
    .sort((x,y)=>x.prenez.partoEstimado<y.prenez.partoEstimado?-1:1)
    .map(a=>{const m=a.prenez.meses;return {cow:a.id+' · '+a.nombre,
      prenez:(String(m).replace('.',','))+' meses',parto:'~'+fmtFechaCorta(a.prenez.partoEstimado),
      partoISO:a.prenez.partoEstimado,badge:m>=8?'warn':undefined};});
}
/* motivo por el que un animal es candidato a palpar (o null si no lo es) —
 * compartido por derivarPalpCandidatas y por savePalp (para guardar el
 * "por qué" en el registro de la palpación, aunque ya no se mantenga una
 * lista de candidatas parcheada a mano). */
function _motivoCandidata(a){
  if(!a)return null;
  if(a.estadoRepro==='servida')return 'servida, por confirmar';
  if(a.estadoRepro==='vacia')return 'vacía'+(a.diasVacia?' hace '+a.diasVacia+' días':', confirmar estado');
  return null;
}
function derivarPalpCandidatas(){
  return Object.values(animalesPorId).filter(a=>a.grupo!=='baja'&&(a.estadoRepro==='servida'||a.estadoRepro==='vacia'))
    .map(a=>({cow:a.id+' · '+a.nombre,motivo:_motivoCandidata(a)}));
}
function derivarVacasVacias(){
  return Object.values(animalesPorId).filter(a=>a.grupo!=='baja'&&a.sexo==='H'&&(a.estadoRepro==='vacia'||a.estadoRepro==='servida'))
    .map(a=>{const daAb=_diasAbiertos(a.id);
      const servida=a.estadoRepro==='servida';
      const decision=(!servida)&&(daAb!=null?daAb>=120:(a.diasVacia!=null&&a.diasVacia>=120));
      return {cow:a.id+' · '+a.nombre,num:a.id,del:a.del,estado:a.estadoRepro,
      sub:(a.partos?ordinalParto(a.partos):'')+(a.raza?' · '+a.raza:''),
      dias:daAb,ultima:fmtFechaCorta(a.ultimaPalpacion),
      ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer+' L':'—'),
      decision:decision,
      rec:servida?'Servida — palpar para confirmar preñez'
         :(decision?(a.del>300?'Lactancia extendida sin preñez — evaluar descarte':'Producción muy baja para su etapa — evaluar descarte')
                   :'En rango — servir o confirmar con palpación')};})
    .sort((x,y)=>(y.dias||0)-(x.dias||0));
}
/* llamar SIEMPRE que animalesPorId cambie algo reproductivo (grupo/estadoRepro/
 * prenez), antes de renderPartos/renderVacias/renderPalpLista. */
function recomputarRepro(){
  proximosPartos=derivarProximosPartos();
  palpCandidatas=derivarPalpCandidatas();
  vacasVacias=derivarVacasVacias();
}
/* "partosRecientes" (la lista de la pantalla de Partos) YA NO se parcha a mano
 * en cada acción — se DERIVA de _partosRaw (la fuente canónica), igual que
 * proximosPartos/vacasVacias/palpCandidatas se derivan de animalesPorId. El
 * orden no importa: _partosRecientesFiltrados() siempre re-ordena al pintar. */
function _refNombre(id){return animalesPorId[id]?(id+' '+animalesPorId[id].nombre):id;}
function derivarPartosRecientes(){
  const GP={cria:'Crías',macho:'Machos'};
  return _partosRaw.map(p=>{
    const criaGrupo=p.cria_id&&animalesPorId[p.cria_id]?(GP[animalesPorId[p.cria_id].grupo]||'Crías')
      :'Crías';
    return {id:p.id,madre:_refNombre(p.madre_id),cria:p.cria_id||'—',fecha:fmtFechaCorta(p.fecha),fechaISO:p.fecha,
      sexo:p.sexo_cria,peso:p.peso_kg||0,tipo:p.tipo,
      estado:p.estado_cria,grupo:p.estado_cria==='viva'?criaGrupo:null};
  });
}
function recomputarPartosRecientes(){partosRecientes=derivarPartosRecientes();}
/* ===== Cableado a Supabase: reproducción y partos ===== */
const fmtFechaCorta=LCRules.fmtFechaCorta;   // compartido en core/rules.js
(async function cargarReproDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const [animales,partos]=await Promise.all([LCStore.getAnimales(),LCStore.getPartos()]);
    if(!animales)return;
    /* llenar la caché canónica GLOBAL (no una copia local): derivarProximosPartos
     * /derivarPalpCandidatas/derivarVacasVacias leen de animalesPorId. */
    animales.forEach(a=>{animalesPorId[a.id]=a;});
    /* fecha del último parto por madre (para días abiertos e intervalo entre partos) */
    _ultimoParto={};_partosPorMadre={};
    (partos||[]).forEach(p=>{if(!p.madre_id||!p.fecha)return;
      (_partosPorMadre[p.madre_id]=_partosPorMadre[p.madre_id]||[]).push(p.fecha);
      if(!_ultimoParto[p.madre_id]||p.fecha>_ultimoParto[p.madre_id])_ultimoParto[p.madre_id]=p.fecha;});
    /* próximos partos / candidatas a palpar / vacas vacías: derivados de la
     * caché ya llena (Estado único, Fase 6 — ver recomputarRepro). */
    recomputarRepro();
    /* partos recientes desde la tabla partos (vacío si no hay) */
    _partosRaw=partos||[];
    recomputarPartosRecientes();
    actualizarAniosDisponibles();
    renderPartos();renderPartosRecientes();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();
  }catch(e){console.warn('Reproducción: usando datos locales:',e.message||e);}
})();

/* ===== Hato: tabla con filtros funcionales ===== */
let hato=[];
scatterListo=true;   // `hato` ya está definido: el scatter puede leerlo sin riesgo
const hatoGrupos=['En ordeño','Horra','Novilla','Levante','Cría','Macho'];
const hatoFiltrosEstado=[
  {id:'todas',label:null},
  {id:'prenada',label:'Preñadas',test:a=>a.tags.includes('prenada')},
  {id:'vacia',label:'Vacías',test:a=>a.tags.includes('vacia')},
  {id:'tratamiento',label:'En tratamiento',test:a=>a.tags.includes('tratamiento')},
  /* 'bajas' se resuelve aparte: las bajas NO están en `hato` (que solo tiene
   * animales activos) — se leen de animalesPorId al filtrar. */
  {id:'bajas',label:'↧ Bajas'},
];
let hatoFiltro='todas';
function _animalesBaja(){
  return Object.values(animalesPorId).filter(a=>a.grupo==='baja')
    .sort((x,y)=>String(y.baja&&y.baja.fecha||'').localeCompare(String(x.baja&&x.baja.fecha||'')));
}
function contarFiltro(id){
  if(id==='bajas')return _animalesBaja().length;
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
/* fila de la tabla del hato para un animal dado de baja: la columna de repro
 * muestra motivo y fecha de la baja; clic → ficha (con "Revertir baja"). */
function bajaAFila(a){
  const b=a.baja||{};
  const motivo=LCRules.esc(b.motivo||'baja');
  const fecha=b.fecha?' · '+fmtFechaCorta(b.fecha):'';
  return {num:a.id,n:a.nombre,raza:a.raza,grupo:'Baja',edad:fmtEdad(a),
    repro:'<span class="badge bad">'+motivo+fecha+'</span>'+(b.valor?' <span class="sub">$'+Number(b.valor).toLocaleString('es-CO')+'</span>':''),
    del:'—',ayer:'—',var:'—',vc:'',tags:[]};
}
function renderHato(){
  const tb=document.getElementById('hatoTbody');if(!tb)return;tb.innerHTML='';
  let filtered;
  const grupoMatch=hatoGrupos.find(g=>g===hatoFiltro);
  if(grupoMatch){filtered=hato.filter(a=>a.grupo===grupoMatch);}
  else if(hatoFiltro==='bajas'){filtered=_animalesBaja().map(bajaAFila);}
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
    else if(hatoFiltro==='bajas')res.textContent=filtered.length+(filtered.length===1?' animal dado de baja':' animales dados de baja')+' — su historia se conserva; abre la ficha para verla o revertir';
    else res.textContent=filtered.length+' de '+hato.length+' animales'+(hatoFiltro!=='todas'?' · filtro: '+(grupoMatch||hatoFiltrosEstado.find(x=>x.id===hatoFiltro).label):'');
  }
  if(!filtered.length){
    tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink-3)">Sin resultados'+(q?' para "'+q+'"':'')+'</td></tr>';
    return;
  }
  filtered.forEach(a=>{
    const tr=document.createElement('tr');
    tr.onclick=()=>goVaca(a.num,'pg-hato');
    tr.innerHTML='<td><div class="cell-animal"><div class="cini">'+LCRules.esc(a.num)+'</div><div><div class="cn">'+LCRules.esc(a.n)+'</div><div class="cs">'+LCRules.esc(a.raza)+'</div></div></div></td>'+
      '<td>'+a.grupo+'</td><td class="r">'+a.edad+'</td>'+
      '<td>'+a.repro+'</td>'+
      '<td class="r">'+(a.del===''||a.del==null||a.del==='—'?'—':a.del)+'</td><td class="r">'+(a.ayer==='—'?'—':'<b>'+a.ayer+' L</b>')+'</td>'+
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
  'levante':'Levante','cria':'Cría','macho':'Macho','baja':'Baja'};
/* inverso: display de la UI → valor del modelo/BD */
const GRUPO_MODELO={'En ordeño':'ordeño','Horra':'horra','Novilla':'novilla',
  'Levante':'levante','Cría':'cria','Macho':'macho','Baja':'baja'};
/* "Hoy" del prototipo = 2026-06-13 (igual que HOY_LC, que se usa al LEER/derivar
   días de retiro y vacía). Anclamos las escrituras a esta misma base para que
   diasHasta() lea consistente. Formateo local para evitar corrimientos de zona. */
function isoDe(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+dd;}
/* "hoy" SIEMPRE al momento y en la zona de la finca (America/Bogota) — no la
 * fecha de cuando se abrió la pestaña ni la TZ del dispositivo. */
function isoHoy(){return (typeof LCStore!=='undefined'&&LCStore.hoyFinca)?LCStore.hoyFinca():isoDe(new Date());}
function isoMasDias(n){const d=new Date(HOY_LC.getTime());d.setDate(d.getDate()+(n||0));return isoDe(d);}
/* fecha estimada de parto: hoy + lo que falta de gestación (~9 meses) */
function isoParto(meses){const d=new Date(HOY_LC.getTime());d.setMonth(d.getMonth()+Math.max(0,Math.round(9-meses)));return isoDe(d);}
const snapshotReproDB=LCRules.snapshotReproDB;   // compartido en core/rules.js
/* fecha de nacimiento: exacta si se conoce; si no, estimada desde la edad */
function fmtNacimiento(a){return LCRules.fmtNacimiento(a);}   // canónica en rules.js
const HOY_LC=new Date();   // hoy real (la base trae datos reales)
function fmtEdad(a){
  const n=a.edadAnios;if(n==null)return '—';
  const enMeses=a.grupo==='levante'||a.grupo==='cria'||(a.grupo==='macho'&&n<1.5)||n<1;
  if(enMeses)return Math.round(n*12)+' m';
  return (n%1===0?String(n):n.toFixed(1).replace('.',','))+' a';
}
const diasHasta=LCRules.diasHasta;   // compartido en core/rules.js
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
  if(a.grupo==='levante'){
    if(a.listoNovilla)return '<span class="badge warn">pasar a novilla</span>';
    if(a.listoMachos)return '<span class="badge warn">pasar a machos</span>';
    const g=a.gananciaDiaG?' · '+a.gananciaDiaG+' g/día':'';
    return a.pesoKg?'<span class="sub">'+a.pesoKg+' kg'+g+'</span>':'';}
  if(a.grupo==='cria')return a.listoLevante?'<span class="badge warn">pasar a levante</span>':'';
  if(a.grupo==='macho'){
    if(!a.rolToro)return '';
    const h=Object.values(animalesPorId).filter(x=>x.padreId===a.id&&x.grupo!=='baja').length;
    return '<span class="badge">toro activo'+(h?' · '+h+' hijas':'')+'</span>';
  }
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
/* Exportar el inventario del hato a CSV real (todos los animales activos) */
function exportarHatoCSV(){
  const A=Object.values(animalesPorId).filter(a=>a.grupo!=='baja')
    .sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  if(!A.length){snack('No hay animales en el hato para exportar');return;}
  const esc=x=>'"'+String(x==null?'':x).replace(/"/g,'""')+'"';
  const head=['numero','nombre','raza','color','grupo','sexo','edad_anios','nacimiento','estado_repro','del','partos','madre','padre','nota'];
  const csv='﻿'+head.join(';')+'\n'+A.map(a=>[
    a.id,a.nombre,a.raza,a.color,a.grupo,a.sexo,
    (a.edadAnios!=null?a.edadAnios:''),a.nacimiento,a.estadoRepro,
    (a.del!=null?a.del:''),(a.partos!=null?a.partos:''),
    a.madreId,a.padreId,a.nota].map(esc).join(';')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='hato-los-chagualos-'+isoHoy()+'.csv';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  snack('Inventario exportado: '+A.length+' animales');
}
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
    renderHatoFiltros();renderHato();renderSanidadVacunas();
    renderSemana();renderLecheKpis();   // las filas del registro semanal son las vacas en ordeño
    estadoBase(null);   // datos abajo: quitar el "cargando…"
  }catch(e){console.warn('Hato: Supabase no disponible:',e.message||e);
    estadoBase('Sin conexión con la base — lo que ves puede estar vacío o incompleto',true);}
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
    ['🔬 Palpación',()=>{closeReg();openPalp();}],
    ['💊 Tratamiento',()=>{closeReg();openTrata();}],
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
  const cow=animalesPorId[num]?buildFichaBasica(animalesPorId[num]):null;if(!cow)return;
  const ref=num+' · '+cow.n;
  openReg('Registrar en '+ref,'Evento clínico o reproductivo de este animal');
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='none';
  /* "Editar datos" ya no está aquí: los datos se editan EN la tarjeta de la
   * ficha con su lápiz (edición en el lugar, sin modal) */
  const opts=[
    ['🔬 Palpación',()=>{closeReg();openPalp(ref);}],
    ['💊 Tratamiento',()=>{closeReg();openTrata(ref);}],
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
/* --- Datos del animal: edición EN EL LUGAR (sin modal) --------------------
 * La tarjeta muestra todos los campos como filas "Dato: valor" (— en vacíos).
 * El lápiz de la tarjeta la vuelve un formulario ahí mismo, con Guardar /
 * Cancelar; guardar usa el mismo guardarEditarVaca de siempre. */
let vacaDatosEditando=false;
function renderVacaDatos(){
  const box=document.getElementById('vacaGenea');if(!box)return;
  const a=animalesPorId[vacaActual];if(!a){box.innerHTML='';return;}
  const btn=document.getElementById('vacaDatosEditBtn');
  if(btn)btn.style.display=(vacaDatosEditando||a.grupo==='baja')?'none':'';
  if(vacaDatosEditando){_pintarDatosForm(box,a);return;}
  const esc=LCRules.esc;
  let h='<div style="display:grid;grid-template-columns:150px 1fr;gap:3px 12px">';
  const F=(lab,val)=>{h+='<div style="color:var(--ink-3)">'+lab+'</div><div>'+(val||'—')+'</div>';};
  F('Nombre',esc(a.nombre||''));
  F('Raza',esc(a.raza||''));
  F('Color',esc(a.color||''));
  F('Grupo',esc(GRUPO_DISPLAY[a.grupo]||a.grupo||''));
  F('Sexo',a.sexo==='M'?('♂ Macho'+(a.rolToro?' · 🐂 toro reproductor':'')):'♀ Hembra');
  F('Nacimiento',fmtNacimiento(a)!=='—'?fmtNacimiento(a):'');
  F('Origen',a.origen==='comprado'?'🛒 Comprada':a.origen==='nacido_finca'?'🐄 Nacida en la finca':'');
  if(a.origen==='comprado')F('Compra',esc(a.procedencia||'')+(a.valorCompra?(a.procedencia?' · ':'')+'$'+Number(a.valorCompra).toLocaleString('es-CO'):''));
  F('Madre',a.madreId?esc(nombreRef(a.madreId)):'');
  F('Padre',a.padreId?esc(nombreRef(a.padreId)):'');
  F('Peso',a.pesoKg?a.pesoKg+' kg'+(a.fechaPeso?' <span style="color:var(--ink-3)">('+fmtFechaCorta(a.fechaPeso)+')</span>':''):'');
  if(a.grupo==='ordeño'||a.grupo==='horra'||a.inicioLactancia)
    F('Inicio de lactancia',a.inicioLactancia?fmtFechaAno(a.inicioLactancia):'');
  F('Nota',a.nota?esc(a.nota):'');
  const crias=Object.values(animalesPorId).filter(x=>x.madreId===a.id).map(x=>x.id+' '+x.nombre);
  if(crias.length)F('Crías',esc(crias.join(', ')));
  box.innerHTML=h+'</div>';
}
function editarDatosVaca(){
  const a=animalesPorId[vacaActual];
  if(!a){snack('No tengo los datos de '+vacaActual+' desde la base — sincroniza primero');return;}
  editState.num=vacaActual;
  editState.nombre=a.nombre||'';editState.color=a.color||'';editState.nota=a.nota||'';
  editState.nacimiento=a.nacimiento||'';editState.peso=(a.pesoKg!=null?a.pesoKg:'');
  editState.inicio=a.inicioLactancia||'';
  /* paridad con "Registrar animal": raza por chips, grupo, origen, genealogía y compra */
  const RAZAS=['Holstein × Gyr','F1','Gyrolando','Holstein','Normando'];
  editState.raza=RAZAS.includes(a.raza)?a.raza:'';
  editState.razaOtra=RAZAS.includes(a.raza)?'':(a.raza||'');
  editState.grupo=a.grupo||'ordeño';
  editState.sexo=a.sexo||'H';editState.rolToro=(a.rolToro===true||a.rolToro==='toro');
  editState.origen=a.origen||'';
  editState.madre=a.madreId||'';editState.padre=a.padreId||'';
  editState.procedencia=a.procedencia||'';editState.valor=(a.valorCompra!=null?a.valorCompra:'');
  vacaDatosEditando=true;
  renderVacaDatos();
}
function _pintarDatosForm(box){
  const RAZAS=['Holstein × Gyr','F1','Gyrolando','Holstein','Normando'];
  box.innerHTML='';
  box.appendChild(regTexto('Nombre','Nombre del animal',v=>editState.nombre=v,'text',editState.nombre));
  box.appendChild(regLabel('Raza'));
  box.appendChild(regChips(RAZAS.map(r=>({val:r,label:r})),editState.raza,v=>{editState.raza=v;editState.razaOtra='';}));
  box.appendChild(regTexto('Otra raza (si no está arriba)','Ej. Jersey, criolla…',v=>editState.razaOtra=v,'text',editState.razaOtra));
  box.appendChild(regTexto('Color','Ej. negra, pinta roja, barcina…',v=>editState.color=v,'text',editState.color));
  box.appendChild(regLabel('Grupo'));
  box.appendChild(regChips([['ordeño','En ordeño'],['horra','Horra'],['novilla','Novilla'],['levante','Levante'],['cria','Cría'],['macho','Macho']]
    .map(g=>({val:g[0],label:g[1]})),editState.grupo,v=>editState.grupo=v));
  box.appendChild(regHint('Cambiar el grupo corrige una clasificación; no toca la reproducción ni el historial.'));
  box.appendChild(regLabel('Sexo'));
  box.appendChild(regChips([{val:'H',label:'♀ Hembra'},{val:'M',label:'♂ Macho'}],editState.sexo,v=>{editState.sexo=v;pintaRolToro();}));
  const rtWrap=document.createElement('div');rtWrap.id='rolToroWrap';box.appendChild(rtWrap);
  pintaRolToro();
  box.appendChild(regTexto('Fecha de nacimiento','',v=>editState.nacimiento=v,'date',editState.nacimiento));
  box.appendChild(regLabel('Origen'));
  box.appendChild(regChips([{val:'nacido_finca',label:'🐄 Nacida en la finca'},{val:'comprado',label:'🛒 Comprada'}],editState.origen,v=>{editState.origen=v;_editToggleCompra();}));
  box.appendChild(regTexto('Madre (número, debe estar registrada)','Ej. 042',v=>editState.madre=v,'text',editState.madre));
  box.appendChild(regTexto('Padre (número, debe estar registrado)','Ej. T01',v=>editState.padre=v,'text',editState.padre));
  /* procedencia y valor SOLO si es comprada (un animal nacido no tiene compra) */
  const compraWrap=document.createElement('div');compraWrap.id='editCompraWrap';
  compraWrap.appendChild(regTexto('Procedencia (finca o vendedor)','Ej. Finca La Esperanza',v=>editState.procedencia=v,'text',editState.procedencia));
  compraWrap.appendChild(regTexto('Valor de compra (opcional)','$',v=>editState.valor=v,'number',editState.valor));
  box.appendChild(compraWrap);
  _editToggleCompra();
  box.appendChild(regTexto('Peso (kg)','',v=>editState.peso=v,'number',editState.peso));
  box.appendChild(regTexto('Inicio de lactancia (último parto)','',v=>editState.inicio=v,'date',editState.inicio));
  box.appendChild(regHint('El DEL se calcula solo desde esta fecha (hoy − inicio de lactancia).'));
  box.appendChild(regTexto('Nota 📝','Ej. patea al ordeño, propensa a mastitis…',v=>editState.nota=v,'text',editState.nota));
  const acciones=document.createElement('div');
  acciones.style.cssText='display:flex;gap:8px;margin-top:14px';
  const bG=document.createElement('button');bG.className='btn filled small';bG.id='vacaDatosGuardar';
  bG.textContent='Guardar cambios';bG.onclick=guardarEditarVaca;
  const bC=document.createElement('button');bC.className='btn outl small';
  bC.textContent='Cancelar';bC.onclick=()=>{vacaDatosEditando=false;renderVacaDatos();};
  acciones.appendChild(bG);acciones.appendChild(bC);
  box.appendChild(acciones);
}
/* "Toro reproductor" solo aplica a machos; sin este rol la lógica de "hijas del toro" no se activa */
function pintaRolToro(){
  const w=document.getElementById('rolToroWrap');if(!w)return;w.innerHTML='';
  if(editState.sexo!=='M'){editState.rolToro=false;return;}
  w.appendChild(regLabel('Rol'));
  w.appendChild(regChips([{val:'toro',label:'🐂 Toro reproductor'},{val:'no',label:'No reproductor'}],
    editState.rolToro?'toro':'no',v=>editState.rolToro=(v==='toro')));
  w.appendChild(regHint('Marca “Toro reproductor” para que sus crías se cuenten como hijas de este toro.'));
}
/* procedencia/valor solo tienen sentido si el animal fue comprado */
function _editToggleCompra(){const w=document.getElementById('editCompraWrap');
  if(w)w.style.display=editState.origen==='comprado'?'':'none';}
/* "hoy" de la finca como Date local a medianoche (para restas de días) */
function hoyFincaDate(){return new Date(isoHoy()+'T00:00:00');}
function diasDesdeReal(iso){if(!iso)return null;const d=new Date(iso+'T00:00:00');return Math.max(0,Math.round((hoyFincaDate()-d)/86400000));}
function guardarEditarVaca(){
  const num=editState.num,a=animalesPorId[num];if(!a)return;
  const nombre=(editState.nombre||'').trim()||a.nombre;
  const raza=(editState.razaOtra||'').trim()||editState.raza||null;
  const color=(editState.color||'').trim()||null;
  const nota=(editState.nota||'').trim()||null;
  const nacimiento=editState.nacimiento||null;
  const peso=(editState.peso!==''&&editState.peso!=null)?parseFloat(editState.peso):null;
  const inicio=editState.inicio||null;
  /* genealogía: si se da un número, debe existir (FK en la base) */
  const madre=(editState.madre||'').trim()||null;
  const padre=(editState.padre||'').trim()||null;
  if(madre&&!animalesPorId[madre]){snack('⚠ La madre '+madre+' no está registrada — corrige el número');return;}
  if(padre&&!animalesPorId[padre]){snack('⚠ El padre '+padre+' no está registrado — corrige el número');return;}
  if(madre===num||padre===num){snack('⚠ Un animal no puede ser su propia madre o padre');return;}
  vacaDatosEditando=false;   // la tarjeta vuelve a modo lectura (goVaca repinta)
  /* persistir TODO lo editable (paridad con "Registrar animal") */
  const sexo=editState.sexo||a.sexo||'H';
  const rolToro=sexo==='M'?!!editState.rolToro:false;
  /* procedencia/valor solo se guardan si el origen es comprada (si no, van null) */
  const comprada=editState.origen==='comprado';
  const procedencia=comprada?((editState.procedencia||'').trim()||null):null;
  const valor=(comprada&&editState.valor!==''&&editState.valor!=null)?parseInt(String(editState.valor).replace(/\D/g,'')):null;
  const campos={nombre:nombre,raza:raza,color:color,nota:nota,nacimiento:nacimiento,inicio_lactancia:inicio,
    grupo:editState.grupo||a.grupo,origen:editState.origen||null,sexo:sexo,rol_toro:rolToro,
    madre_id:madre,padre_id:padre,
    procedencia:procedencia,valor_compra:valor};
  if(peso!=null&&!isNaN(peso)){campos.peso_kg=peso;campos.fecha_peso=isoHoy();}
  /* DEL se DERIVA del inicio de lactancia: actualizo la caché de inmediato */
  const delCalc=inicio?diasDesdeReal(inicio):a.del;
  const grupoCambio=campos.grupo!==a.grupo;
  Object.assign(a,{nombre:nombre,raza:raza,color:color,nota:nota,nacimiento:nacimiento,inicioLactancia:inicio,del:delCalc,
    grupo:campos.grupo,origen:campos.origen,sexo:sexo,rolToro:rolToro,madreId:madre,padreId:padre,
    procedencia:campos.procedencia,valorCompra:valor});
  if(peso!=null&&!isNaN(peso)){a.pesoKg=peso;a.fechaPeso=isoHoy();}
  const h=hato.find(x=>x.num===num);if(h){h.n=nombre;h.raza=raza;h.del=(delCalc==null?'—':delCalc);
    if(grupoCambio)h.grupo=GRUPO_DISPLAY[a.grupo]||a.grupo;}
  /* si entró o salió del ordeño, la lista de registro de leche cambia */
  const mEdit=milkCows.findIndex(c=>c.num===num);
  if(a.grupo!=='ordeño'&&mEdit>=0)milkCows.splice(mEdit,1);
  else if(a.grupo==='ordeño'&&mEdit<0)milkCows.push(animalAMilk(a));
  else if(mEdit>=0){const prevDone=milkCows[mEdit].done,prevV=milkCows[mEdit].v;
    milkCows[mEdit]=Object.assign(animalAMilk(a),{done:prevDone,v:prevV});}
  goVaca(num,vacaFrom);renderHato();renderMilk();
  if(typeof LCStore!=='undefined'){
    /* concurrencia: solo guarda si la ficha no cambió en otro dispositivo */
    LCStore.updateAnimalCampos(num,campos,a.updatedAt).then(r=>{if(r&&r.updated_at)a.updatedAt=r.updated_at;}).catch(e=>{
      if(e&&e.code==='CONFLICTO'){
        snack('⚠ '+num+': otro dispositivo cambió esta ficha — recarga la página para no pisar sus cambios');
      }else{
        console.warn('Edición no guardada en la base:',e.message||e);
        snack('⚠ '+num+': los cambios NO se guardaron en la base — reintenta');}});
  }
  snack(num+' actualizado');
}

/* --- tratamiento (standalone) --- */
/* tratamiento: mismo modal sanitario unificado, en modo 'trata'. Acepta la
 * vaca preseleccionada (desde la ficha o el menú contextual). */
function openTrata(cow){
  if(!Object.values(animalesPorId).filter(a=>a.grupo!=='baja').length){snack('No hay animales registrados para tratar');return;}
  openSanidad('trata',cow);
}
/* guarda UN tratamiento por cada animal marcado (el retiro se deriva por
 * animal en v_animales), con un solo "Deshacer" que revierte todos. */
function _saveTrataSan(ids){
  const s=sanidadState;
  closeReg();
  const conRetiro=s.retiro>0;
  const fecha=s.fecha||isoHoy();
  const tids=ids.map(()=>LCRules.idUnico('T-'));
  const filasHato=ids.map(id=>hato.find(x=>x.num===id)).filter(Boolean);
  const trats=ids.map((id,i)=>{
    const a=animalesPorId[id];
    return {id:tids[i],num:id,n:(a&&a.nombre)||id,
      desc:s.medicina+(s.nota?' · '+s.nota:''),
      retiro:conRetiro?'retiro de leche hasta '+fechaDias(s.retiro):'',
      badge:conRetiro?'retiro '+s.retiro+'d':'sin retiro',badgeCls:conRetiro?'bad':'ok'};
  });
  const tagsAgregados=[];
  const retiroTxt=conRetiro?' · retiro '+s.retiro+'d (hasta '+fechaDias(s.retiro)+')':' · sin retiro';
  const quien=ids.length===1?((animalesPorId[ids[0]]&&animalesPorId[ids[0]].nombre)||ids[0]):ids.length+' animales';
  LCAcciones.ejecutarConDeshacer({
    aplicar(){
      trats.forEach(t=>tratamientos.push(t));
      filasHato.forEach(a=>{if(!a.tags.includes('tratamiento')){a.tags.push('tratamiento');tagsAgregados.push(a);}});
      renderTratamientos();renderHatoFiltros();renderHato();
      go('pg-sanitario',navFor('pg-sanitario'));
    },
    escribir:typeof LCStore!=='undefined'?
      ()=>Promise.all(ids.map((id,i)=>LCStore.registrarTratamiento({id:tids[i],animalId:id,
        medicamento:s.medicina,diasRetiro:s.retiro,inicio:fecha,nota:s.nota||null}))):null,
    avisoError:()=>'⚠ El tratamiento NO se guardó en la base — revisa la conexión y reintenta',
    mensaje:quien+': '+s.medicina.toLowerCase()+retiroTxt,
    revertir(){
      trats.forEach(t=>{const i=tratamientos.indexOf(t);if(i>=0)tratamientos.splice(i,1);});
      tagsAgregados.forEach(a=>{const ti=a.tags.indexOf('tratamiento');if(ti>=0)a.tags.splice(ti,1);});
      renderTratamientos();renderHatoFiltros();renderHato();
    },
    compensarBD:typeof LCStore!=='undefined'?()=>Promise.all(tids.map(tid=>LCStore.deleteTratamiento(tid))):null,
    snack,
  });
}

/* --- secado (ordeño → horra) --- */
const secaState={};
function openSeca(cow){
  const cands=hato.filter(a=>a.grupo==='En ordeño');
  if(!cow&&!cands.length){snack('No hay vacas en ordeño para secar');return;}
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
  /* Estado único: snapshot COMPLETO de la caché canónica (no solo inicio_lactancia)
   * para poder restaurarla entera al deshacer, en vez de parchear campo a campo. */
  const animalPrev=animalesPorId[secaState.num]?{...animalesPorId[secaState.num]}:null;
  const prevInicio=animalPrev?animalPrev.inicioLactancia:null;
  LCAcciones.ejecutarConDeshacer({
    aplicar(){
      a.grupo='Horra';a.del='—';a.ayer='—';a.var='—';a.vc='';
      a.repro=a.repro.replace(/<span class="sub">[^<]*<\/span>/,'').trim()+' <span class="sub">recién secada</span>';
      /* mantener animalesPorId al día: sin esto quedaba desincronizada del hato
       * hasta el próximo recargo (Estado único, Fase 6). */
      if(animalesPorId[secaState.num])Object.assign(animalesPorId[secaState.num],{grupo:'horra',inicioLactancia:null,del:null});
      hatoFiltro='Horra';renderHatoFiltros();renderHato();
      go('pg-hato',navFor('pg-hato'));
    },
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.updateAnimalCampos(secaState.num,{grupo:'horra',inicio_lactancia:null}):null,
    avisoError:()=>'⚠ El secado NO se guardó en la base — reintenta',
    mensaje:nombre+' secada · sale del ordeño y pasa a horras',
    revertir(){
      Object.assign(a,prev);
      if(animalPrev&&animalesPorId[secaState.num])animalesPorId[secaState.num]=animalPrev;
      renderHatoFiltros();renderHato();
    },
    compensarBD:typeof LCStore!=='undefined'?
      ()=>LCStore.updateAnimalCampos(secaState.num,{grupo:'ordeño',inicio_lactancia:prevInicio}):null,
    snack,
  });
}

/* --- parto --- */
const partoState={};
let criaSeq=73;
/* grupos que pueden parir; se prefieren las horras (preñadas próximas) */
const GRUPOS_MADRE=['Horra','En ordeño','Novilla'];
function openParto(cow){
  const cands=hato.filter(a=>GRUPOS_MADRE.includes(a.grupo))
    .sort((x,y)=>GRUPOS_MADRE.indexOf(x.grupo)-GRUPOS_MADRE.indexOf(y.grupo));
  if(!cands.length){snack('No hay vacas adultas (horras, en ordeño o novillas) para registrar parto');return;}
  partoState.num=cow?(''+cow).split('·')[0].trim():cands[0].num;
  partoState.sexo='H';partoState.tipo='normal';partoState.estado='viva';partoState.peso=38;partoState.fecha=isoHoy();
  partoState.criaNum='';partoState.criaNombre='';
  openReg('Registrar parto','La cría entra al hato y la madre vuelve al ordeño en DEL 0');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Fecha del parto'));
  const fp=document.createElement('input');fp.type='date';fp.value=partoState.fecha;fp.max=isoHoy();
  fp.style.cssText='width:100%;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-family:inherit;font-size:14px;color:var(--ink);padding:10px 12px;outline:none;margin-bottom:8px';
  fp.onchange=()=>{partoState.fecha=fp.value||isoHoy();};
  body.appendChild(fp);
  body.appendChild(regLabel('Madre'));
  body.appendChild(regChips(cands.map(a=>({val:a.num,label:a.num+' '+a.n})),partoState.num,v=>{partoState.num=v;pintaPartoMadre();}));
  const mi=regHint('','var(--ink-2)');mi.id='partoMadreInfo';body.appendChild(mi);
  pintaPartoMadre();
  body.appendChild(regLabel('Sexo de la cría'));
  body.appendChild(regChips([{val:'H',label:'♀ Hembra'},{val:'M',label:'♂ Macho'}],partoState.sexo,v=>partoState.sexo=v));
  body.appendChild(regLabel('Tipo de parto'));
  body.appendChild(regChips([{val:'normal',label:'Normal'},{val:'asistido',label:'Asistido'}],partoState.tipo,v=>partoState.tipo=v));
  body.appendChild(regLabel('Estado de la cría'));
  body.appendChild(regChips([{val:'viva',label:'Viva'},{val:'muerta',label:'Mortinato'}],partoState.estado,v=>partoState.estado=v));
  body.appendChild(regLabel('Peso al nacer'));
  body.appendChild(regStepper(()=>partoState.peso,v=>partoState.peso=v,20,60,'kg'));
  body.appendChild(regTexto('Número de la cría (chapeta, opcional)','Se asigna el siguiente libre',v=>partoState.criaNum=v,'text',''));
  body.appendChild(regTexto('Nombre de la cría (opcional)','Ej. Lucero',v=>partoState.criaNombre=v,'text',''));
  document.getElementById('regSaveBtn').onclick=saveParto;
}
/* aviso si la madre elegida no es horra (lo normal es parir desde horra) */
function pintaPartoMadre(){
  const a=hato.find(x=>x.num===partoState.num);const box=document.getElementById('partoMadreInfo');if(!box||!a)return;
  if(a.grupo==='Horra'){box.textContent='Horra (preñada próxima) — lo normal para parir.';box.style.color='var(--green)';}
  else{box.textContent='⚠ '+a.n+' está en "'+a.grupo+'", no en horras. Confirma que de verdad parió.';box.style.color='var(--red)';}
}
function saveParto(){
  const a=hato.find(x=>x.num===partoState.num);if(!a)return;const nombre=a.n;
  /* número de la cría viva: validar ANTES de mutar la madre (evita estado a medias) */
  let criaNumFinal=null;
  if(partoState.estado==='viva'){
    const dado=(partoState.criaNum||'').trim();
    if(dado){
      if(animalesPorId[dado]||hato.find(x=>x.num===dado)){snack('⚠ El número '+dado+' ya existe — usa otro');return;}
      criaNumFinal=dado;
    }else{criaNumFinal=String(++criaSeq).padStart(3,'0');}
  }
  closeReg();
  const sexoTxt=partoState.sexo==='H'?'♀ hembra':'♂ macho';
  const criaGrupo='Cría';   // ambos sexos nacen como cría
  const criaNombre=(partoState.criaNombre||'').trim();
  const criaAuto=!((partoState.criaNum||'').trim());   // se usó la secuencia (para revertirla en el Deshacer)
  const fechaParto=partoState.fecha||isoHoy();
  const partoId=LCRules.idUnico('P-');
  const numMadre=partoState.num;
  const criaId=partoState.estado==='viva'?criaNumFinal:null;
  const mensaje=partoState.estado==='viva'
    ? 'Parto de '+nombre+' · cría '+criaId+' ('+sexoTxt+', '+partoState.peso+' kg) creada en '+criaGrupo+' · '+nombre+' al ordeño en DEL 0'
    : 'Parto de '+nombre+' · la cría nació muerta — queda en el historial · '+nombre+' al ordeño en DEL 0';
  /* snapshots ANTES de mutar nada — el de la BD (madreAntes) es el que corrige
   * un bug real: antes se tomaba DESPUÉS de mutar la madre, así que "Deshacer"
   * revertía bien la pantalla pero NO la base (volvía a escribir el mismo
   * estado post-parto en vez del previo). */
  const prevMadre={grupo:a.grupo,del:a.del,ayer:a.ayer,var:a.var,vc:a.vc,repro:a.repro,tags:a.tags.slice()};
  const madrePrevCache=animalesPorId[numMadre]?{...animalesPorId[numMadre]}:null;
  const madreAntes=animalesPorId[numMadre]?snapshotReproDB(animalesPorId[numMadre]):null;
  let cria;
  LCAcciones.ejecutarConDeshacer({
    aplicar(){
      /* la madre vuelve al ordeño en DEL 0 */
      a.grupo='En ordeño';a.del=0;a.ayer=0;a.var='—';a.vc='';
      a.tags=a.tags.filter(t=>t!=='prenada');
      a.repro='<span class="badge ok">recién parida · DEL 0</span>';
      /* la cría viva entra al hato */
      cria=null;
      if(partoState.estado==='viva'){
        cria={num:criaId,n:criaNombre||('(cría de '+nombre+')'),raza:a.raza,grupo:criaGrupo,edad:'0 m',
          repro:'<span class="badge ok">recién nacid'+(partoState.sexo==='H'?'a':'o')+' · '+partoState.peso+' kg</span>',
          del:'—',ayer:'—',var:'—',vc:'',tags:[]};
        hato.unshift(cria);
      }
      /* mantener los cachés canónicos al día (KPIs, ficha y alertas sin recargar);
       * proximosPartos/vacasVacias/palpCandidatas/partosRecientes se DERIVAN
       * (Estado único), ya no se construyen ni parchan a mano. */
      if(animalesPorId[numMadre])Object.assign(animalesPorId[numMadre],
        {grupo:'ordeño',del:0,inicioLactancia:fechaParto,estadoRepro:null,prenez:null,
         partos:(animalesPorId[numMadre].partos||0)+1});
      _partosRaw.push({id:partoId,madre_id:numMadre,cria_id:criaId,fecha:fechaParto,
        sexo_cria:partoState.sexo,peso_kg:partoState.peso,tipo:partoState.tipo,estado_cria:partoState.estado});
      (_partosPorMadre[numMadre]=_partosPorMadre[numMadre]||[]).push(fechaParto);
      if(!_ultimoParto[numMadre]||fechaParto>_ultimoParto[numMadre])_ultimoParto[numMadre]=fechaParto;
      recomputarRepro();recomputarPartosRecientes();
      renderHatoFiltros();renderHato();renderPartos();renderPartosRecientes();renderPartosKpis();
      if(typeof renderInicio==='function')renderInicio();
      go('pg-partos',navFor('pg-partos'));
    },
    /* UNA transacción en la base (cría + parto + madre): o entra todo o nada */
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.registrarPartoCompleto({id:partoId,madreId:numMadre,fecha:fechaParto,
        sexo:partoState.sexo,pesoKg:partoState.peso,tipo:partoState.tipo,estadoCria:partoState.estado,
        criaId:criaId,criaNombre:criaId?(criaNombre||('Cría de '+nombre)):null,criaRaza:a.raza}):null,
    avisoError:()=>'⚠ El parto NO se guardó en la base — revisa la conexión y regístralo de nuevo',
    mensaje,
    revertir(){
      Object.assign(a,prevMadre);
      if(cria){const ci=hato.indexOf(cria);if(ci>=0)hato.splice(ci,1);if(criaAuto)criaSeq--;}
      if(madrePrevCache&&animalesPorId[numMadre])animalesPorId[numMadre]=madrePrevCache;
      const pri=_partosRaw.findIndex(p=>p.id===partoId);if(pri>=0)_partosRaw.splice(pri,1);
      if(_partosPorMadre[numMadre]){const fi2=_partosPorMadre[numMadre].lastIndexOf(fechaParto);
        if(fi2>=0)_partosPorMadre[numMadre].splice(fi2,1);}
      if(_ultimoParto[numMadre]===fechaParto){const fs=(_partosPorMadre[numMadre]||[]).slice().sort();
        if(fs.length)_ultimoParto[numMadre]=fs[fs.length-1];else delete _ultimoParto[numMadre];}
      recomputarRepro();recomputarPartosRecientes();
      renderHatoFiltros();renderHato();renderPartos();renderPartosRecientes();renderPartosKpis();
      if(typeof renderInicio==='function')renderInicio();
    },
    compensarBD:typeof LCStore!=='undefined'?
      ()=>Promise.all([
        LCStore.deleteParto(partoId),
        criaId?LCStore.deleteAnimal(criaId):null,
        madreAntes?LCStore.updateAnimalCampos(numMadre,madreAntes):null,
      ]):null,
    snack,
  });
}

/* --- parto HISTÓRICO desde la ficha ---------------------------------------- *
 * Registra un parto pasado (para el conteo, el intervalo y las lactancias) SIN
 * crear cría ni tocar el grupo/DEL actuales de la madre. */
const partoHistState={};
function openPartoHist(num){
  num=num||vacaActual;const a=animalesPorId[num];
  if(!a){snack('No tengo los datos de '+num+' — sincroniza primero');return;}
  partoHistState.num=num;partoHistState.fecha=isoHoy();partoHistState.sexo='';
  partoHistState.tipo='normal';partoHistState.estado='viva';partoHistState.criaId='';
  openReg('Agregar parto histórico de '+num,'Suma un parto pasado al conteo y al intervalo; no cambia el grupo actual');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regTexto('Fecha del parto','',v=>partoHistState.fecha=v,'date',partoHistState.fecha));
  body.appendChild(regLabel('Sexo de la cría (opcional)'));
  body.appendChild(regChips([{val:'',label:'Sin dato'},{val:'H',label:'♀ Hembra'},{val:'M',label:'♂ Macho'}],partoHistState.sexo,v=>partoHistState.sexo=v));
  body.appendChild(regLabel('Tipo de parto'));
  body.appendChild(regChips([{val:'normal',label:'Normal'},{val:'asistido',label:'Asistido'}],partoHistState.tipo,v=>partoHistState.tipo=v));
  body.appendChild(regLabel('Resultado de la cría'));
  body.appendChild(regChips([{val:'viva',label:'Viva'},{val:'muerta',label:'Mortinato'}],partoHistState.estado,v=>partoHistState.estado=v));
  body.appendChild(regTexto('Número de la cría (si ya está registrada, opcional)','Ej. 064',v=>partoHistState.criaId=v,'text',''));
  body.appendChild(regHint('Vincula una cría ya existente por su número; no crea un animal nuevo.'));
  document.getElementById('regSaveBtn').onclick=savePartoHist;
}
function savePartoHist(){
  const num=partoHistState.num,a=animalesPorId[num];if(!a)return;
  const fecha=partoHistState.fecha||isoHoy();
  const criaId=(partoHistState.criaId||'').trim()||null;
  if(criaId&&!animalesPorId[criaId]){snack('⚠ La cría '+criaId+' no está registrada — deja el número vacío o corrígelo');return;}
  closeReg();
  const partoId=LCRules.idUnico('P-');
  const fila={id:partoId,madre_id:num,cria_id:criaId,fecha:fecha,
    sexo_cria:partoHistState.sexo||null,peso_kg:null,tipo:partoHistState.tipo,estado_cria:partoHistState.estado};
  /* cachés canónicos: conteo de partos, último parto e intervalo */
  _partosRaw.push(fila);
  (_partosPorMadre[num]=_partosPorMadre[num]||[]).push(fecha);
  if(!_ultimoParto[num]||fecha>_ultimoParto[num])_ultimoParto[num]=fecha;
  if(animalesPorId[num])animalesPorId[num].partos=(animalesPorId[num].partos||0)+1;
  /* faltaba: sin esto, un parto histórico no aparecía en "Partos recientes"
   * hasta recargar la página (Estado único, Fase 6). */
  recomputarPartosRecientes();
  goVaca(num,vacaFrom);renderPartos&&renderPartos();renderPartosRecientes&&renderPartosRecientes();renderPartosKpis&&renderPartosKpis();
  let pSave=Promise.resolve();
  if(typeof LCStore!=='undefined'){
    pSave=LCStore.registrarParto({id:partoId,madreId:num,criaId:criaId,fecha:fecha,
      sexo:partoHistState.sexo||null,tipo:partoHistState.tipo,estadoCria:partoHistState.estado}).catch(e=>{
      console.warn('Parto histórico no guardado:',e.message||e);
      snack('⚠ El parto NO se guardó en la base — revisa la conexión y reintenta');});
  }
  snack('Parto de '+fmtFechaAno(fecha)+' agregado a '+num,'Deshacer',()=>{
    const ri=_partosRaw.findIndex(p=>p.id===partoId);if(ri>=0)_partosRaw.splice(ri,1);
    if(_partosPorMadre[num]){const fi=_partosPorMadre[num].lastIndexOf(fecha);if(fi>=0)_partosPorMadre[num].splice(fi,1);}
    if(_ultimoParto[num]===fecha){const fs=(_partosPorMadre[num]||[]).slice().sort();
      if(fs.length)_ultimoParto[num]=fs[fs.length-1];else delete _ultimoParto[num];}
    if(animalesPorId[num])animalesPorId[num].partos=Math.max(0,(animalesPorId[num].partos||1)-1);
    recomputarPartosRecientes();
    goVaca(num,vacaFrom);renderPartos&&renderPartos();renderPartosRecientes&&renderPartosRecientes();renderPartosKpis&&renderPartosKpis();
    if(typeof LCStore!=='undefined')pSave.then(()=>LCStore.deleteParto(partoId))
      .catch(e=>console.warn('No se pudo revertir el parto histórico:',e.message||e));});
}

/* --- alta (compra / ingreso) --- */
/* --- vaca nueva (comprada o nacida) --- */
const altaGrupoMap={'Vaca en ordeño':'En ordeño','Vaca horra':'Horra','Novilla':'Novilla','Levante':'Levante','Cría':'Cría','Toro':'Macho'};
let altaSeq=0;   // se sincroniza con el mayor número real del hato al cargar
const compraState={};
/* helper: campo de texto/número dentro del modal de registro */
function regTexto(label,ph,onInput,type,value){
  const wrap=document.createElement('div');
  wrap.appendChild(regLabel(label));
  const inp=document.createElement('input');inp.type=type||'text';inp.placeholder=ph||'';
  if(inp.type==='date')inp.max=isoHoy();   // los registros no pueden ser del futuro
  if(value!=null&&value!=='')inp.value=value;
  inp.style.cssText='width:100%;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-family:inherit;font-size:14px;color:var(--ink);padding:10px 12px;outline:none';
  inp.oninput=()=>onInput(inp.value);
  wrap.appendChild(inp);return wrap;
}
/* paso 1: ¿qué animal vas a registrar? */
function openNuevaVaca(){
  openReg('Registrar animal','¿Qué animal vas a registrar?');
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='none';
  const opts=[
    ['🐄 Un animal que ya está en la finca','Para armar tu hato: nacida aquí (ya grande) o comprada',()=>openCompra()],
    ['🍼 Una cría que acaba de nacer','Se registra como el parto de su madre',()=>{closeReg();openParto();}],
  ];
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:8px';
  opts.forEach(([label,sub,fn])=>{const b=document.createElement('button');b.className='btn outl';
    b.style.cssText='justify-content:flex-start;align-items:flex-start;flex-direction:column;gap:2px;width:100%;padding:12px 14px';
    b.innerHTML='<span style="font-weight:700">'+label+'</span><span style="font-size:11.5px;color:var(--ink-2);font-weight:500">'+sub+'</span>';
    b.onclick=fn;wrap.appendChild(b);});
  body.appendChild(wrap);
}
/* siguiente número libre: el mayor número existente + 1 (respeta tu numeración) */
function _siguienteNumeroLibre(){
  const nums=Object.keys(animalesPorId).concat(hato.map(a=>String(a.num)))
    .map(x=>parseInt(x,10)).filter(n=>!isNaN(n));
  const max=Math.max(altaSeq,...(nums.length?nums:[0]));
  return String(max+1).padStart(3,'0');
}
/* registro inicial / compra: datos del animal que entra al hato.
   Sirve para armar el hato desde cero (nacidas en la finca ya grandes)
   y para compras. El formulario cambia según el origen. */
function openCompra(){
  compraState.origen='nacida';
  compraState.tipo='Vaca en ordeño';compraState.raza='Holstein × Gyr';compraState.razaOtra='';
  compraState.nacimiento='';compraState.nombre='';compraState.color='';
  compraState.procedencia='';compraState.valor='';compraState.madre='';compraState.padre='';
  compraState.peso='';compraState.nota='';
  compraState.partosFechas=[''];
  compraState.num=_siguienteNumeroLibre();
  renderAltaForm();
}
function renderAltaForm(){
  openReg('Registrar animal del hato','Nacida en la finca o comprada — queda con su ficha lista');
  const body=document.getElementById('regBody');body.innerHTML='';
  document.getElementById('regActions').style.display='';
  body.appendChild(regTexto('Número (chapeta)','',v=>compraState.num=v,'text',compraState.num));
  body.appendChild(regHint('El número del arete del animal. Te sugerimos el siguiente libre; puedes cambiarlo.'));
  body.appendChild(regTexto('Nombre','Ej. Esperanza',v=>compraState.nombre=v,'text',compraState.nombre));
  body.appendChild(regLabel('Origen'));
  body.appendChild(regChips([{val:'nacida',label:'🐄 Nacida en la finca'},{val:'comprada',label:'🛒 Comprada'}],
    compraState.origen,v=>{compraState.origen=v;renderAltaForm();}));
  body.appendChild(regLabel('Tipo de animal'));
  body.appendChild(regChips(Object.keys(altaGrupoMap).map(t=>({val:t,label:t})),compraState.tipo,v=>{compraState.tipo=v;renderAltaForm();}));
  body.appendChild(regLabel('Raza'));
  body.appendChild(regChips(['Holstein × Gyr','F1','Gyrolando','Holstein','Normando'].map(r=>({val:r,label:r})),compraState.raza,v=>compraState.raza=v));
  body.appendChild(regTexto('Otra raza (si no está arriba)','Ej. Jersey, criolla…',v=>compraState.razaOtra=v,'text',compraState.razaOtra));
  body.appendChild(regTexto('Color (opcional)','Ej. negra, pinta roja…',v=>compraState.color=v,'text',compraState.color));
  body.appendChild(regTexto('Fecha de nacimiento (obligatoria)','',v=>compraState.nacimiento=v,'date',compraState.nacimiento));
  body.appendChild(regHint('La edad se calcula sola desde esta fecha y avanza con el tiempo. Si no la sabes con exactitud, registra la mejor estimación (p.ej. inicio del año que nació).'));
  /* genealogía: madre y padre en ambos orígenes (paridad con Editar); solo se
   * enlazan si ya están registrados */
  body.appendChild(regTexto('Madre (número, si la conoces)','Ej. 042 — debe estar ya registrada',v=>compraState.madre=v,'text',compraState.madre));
  body.appendChild(regTexto('Padre (número, si lo conoces)','Ej. T01 — debe estar ya registrado',v=>compraState.padre=v,'text',compraState.padre));
  if(compraState.origen==='comprada'){
    body.appendChild(regTexto('Procedencia (opcional)','Finca o vendedor',v=>compraState.procedencia=v,'text',compraState.procedencia));
    body.appendChild(regTexto('Valor de compra (opcional)','$',v=>compraState.valor=v,'number',compraState.valor));
  }
  body.appendChild(regTexto('Peso (kg, opcional)','',v=>compraState.peso=v,'number',compraState.peso));
  /* solo para vacas adultas: las FECHAS de sus partos (el conteo sale solo) */
  if(compraState.tipo==='Vaca en ordeño'||compraState.tipo==='Vaca horra'){
    body.appendChild(regLabel('Partos: la fecha de cada uno (las que recuerdes)'));
    const list=document.createElement('div');list.style.cssText='display:flex;flex-direction:column;gap:6px';
    compraState.partosFechas.forEach((f,i)=>{
      const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center';
      const inp=document.createElement('input');inp.type='date';if(f)inp.value=f;
      inp.style.cssText='flex:1;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-family:inherit;font-size:14px;color:var(--ink);padding:9px 12px;outline:none';
      inp.onchange=()=>{compraState.partosFechas[i]=inp.value;};
      row.appendChild(inp);
      if(compraState.partosFechas.length>1){
        const del=document.createElement('button');del.className='btn outl small';del.textContent='✕';del.title='Quitar este parto';
        del.onclick=()=>{compraState.partosFechas.splice(i,1);renderAltaForm();};
        row.appendChild(del);
      }
      list.appendChild(row);
    });
    body.appendChild(list);
    const add=document.createElement('button');add.className='btn outl small';add.style.cssText='margin-top:6px';
    add.textContent='＋ Agregar otro parto';
    add.onclick=()=>{compraState.partosFechas.push('');renderAltaForm();};
    body.appendChild(add);
    body.appendChild(regHint('El número de partos se cuenta solo. El más reciente marca el inicio de la lactancia (DEL) si está en ordeño.'));
  }
  body.appendChild(regTexto('Nota 📝 (opcional)','Ej. patea al ordeño, propensa a mastitis…',v=>compraState.nota=v,'text',compraState.nota));
  document.getElementById('regSaveBtn').onclick=saveCompra;
}
function saveCompra(){
  const num=String(compraState.num||'').trim()||_siguienteNumeroLibre();
  /* validación de duplicado ANTES de cerrar: se corrige ahí mismo */
  if(animalesPorId[num]||hato.find(x=>String(x.num)===String(num))){
    snack('El número '+num+' ya existe en el hato — usa otro');return;}
  /* fecha de nacimiento obligatoria: la edad se deriva de ella (y avanza) */
  if(!/^\d{4}-\d{2}-\d{2}$/.test(compraState.nacimiento||'')){
    snack('Falta la fecha de nacimiento — es obligatoria para registrar el animal');return;}
  const esNacida=compraState.origen==='nacida';
  /* madre y padre: solo se enlazan si ya están registrados (la FK lo exige) */
  let madreId=null,padreId=null,madreAviso='';
  if(String(compraState.madre||'').trim()){
    const m=String(compraState.madre).trim();
    if(animalesPorId[m])madreId=m;
    else madreAviso=' · la madre '+m+' no está registrada aún (quedó sin enlazar)';
  }
  if(String(compraState.padre||'').trim()){
    const p=String(compraState.padre).trim();
    if(animalesPorId[p])padreId=p;
    else madreAviso+=' · el padre '+p+' no está registrado aún (quedó sin enlazar)';
  }
  closeReg();
  const grupo=altaGrupoMap[compraState.tipo];
  const nombre=(compraState.nombre||'').trim()||'(sin nombre)';
  const raza=(compraState.razaOtra||'').trim()||compraState.raza;
  const color=(compraState.color||'').trim()||null;
  const nacimiento=compraState.nacimiento;   // obligatoria (validada arriba)
  const edadAnios=Math.round(((hoyFincaDate()-new Date(nacimiento+'T00:00:00'))/86400000/365.25)*10)/10;
  const esVaca=(compraState.tipo==='Vaca en ordeño'||compraState.tipo==='Vaca horra');
  /* fechas de parto válidas, sin repetidas, de la más vieja a la más nueva */
  const fechasParto=esVaca
    ?[...new Set((compraState.partosFechas||[]).filter(f=>/^\d{4}-\d{2}-\d{2}$/.test(f)))].sort()
    :[];
  const ultParto=fechasParto.length?fechasParto[fechasParto.length-1]:null;
  const inicioLact=(compraState.tipo==='Vaca en ordeño'&&ultParto)?ultParto:null;
  const partos=fechasParto.length;   // el conteo sale de las fechas
  const pesoKg=(compraState.peso!==''&&compraState.peso!=null)?parseFloat(String(compraState.peso).replace(',','.')):null;
  const nota=(compraState.nota||'').trim()||null;
  /* cache canónico primero: la ficha abre de una con los datos completos */
  animalesPorId[num]={id:num,nombre:nombre,raza:raza,color:color,nota:nota,
    grupo:GRUPO_MODELO[grupo]||'novilla',sexo:grupo==='Macho'?'M':'H',
    edadAnios:edadAnios,nacimiento:nacimiento,
    origen:esNacida?'nacido_finca':'comprado',madreId:madreId,padreId:padreId,
    pesoKg:pesoKg,fechaPeso:pesoKg!=null?isoHoy():null,
    procedencia:esNacida?null:(compraState.procedencia||null),
    valorCompra:(!esNacida&&compraState.valor)?parseInt(String(compraState.valor).replace(/\D/g,'')):null,
    partos:partos,inicioLactancia:inicioLact,
    del:inicioLact?Math.max(0,Math.round((hoyFincaDate()-new Date(inicioLact+'T00:00:00'))/86400000)):null,
    leche:{}};
  /* caches locales: los partos alimentan lactancias, intervalo y días abiertos */
  const partoRows=fechasParto.map((f,i)=>({id:LCRules.idUnico('P-'+num+'-'+i+'-'),madre_id:num,cria_id:null,
    fecha:f,sexo_cria:null,peso_kg:null,tipo:'normal',estado_cria:'viva'}));
  if(ultParto)_ultimoParto[num]=ultParto;
  if(fechasParto.length)_partosPorMadre[num]=fechasParto.slice();
  partoRows.forEach(r=>_partosRaw.push(r));
  /* faltaba: sin esto, los partos históricos de un alta no aparecían en
   * "Partos recientes" hasta recargar la página (Estado único, Fase 6). */
  if(partoRows.length)recomputarPartosRecientes();
  const nuevo={num,n:nombre,raza:raza,grupo,edad:fmtEdadLarga(animalesPorId[num]),
    repro:'<span class="badge">'+(esNacida?'registro inicial':'recién comprada')+'</span>',
    del:(animalesPorId[num].del!=null?animalesPorId[num].del:'—'),ayer:'—',var:'—',vc:'',tags:[]};
  hato.unshift(nuevo);
  /* si entra "En ordeño", debe aparecer YA en la lista de registro de leche
     (antes no aparecía hasta recargar la página) */
  if(grupo==='En ordeño'){milkCows.push(animalAMilk(animalesPorId[num]));
    if(typeof renderMilk==='function')renderMilk();}
  const nInt=parseInt(num,10);if(!isNaN(nInt)&&nInt>altaSeq)altaSeq=nInt;
  hatoFiltro='todas';renderHatoFiltros();renderHato();
  if(typeof LCStore!=='undefined'){
    /* orden: primero el animal (FK), luego sus partos históricos */
    LCStore.insertAnimal({id:num,nombre:nombre,raza:raza,color:color,nota:nota,
      grupo:GRUPO_MODELO[grupo]||'novilla',sexo:grupo==='Macho'?'M':'H',
      edadAnios:edadAnios,nacimiento:nacimiento,
      origen:esNacida?'nacido_finca':'comprado',madreId:madreId,padreId:padreId,
      pesoKg:pesoKg,fechaPeso:pesoKg!=null?isoHoy():null,
      partos:partos,inicioLactancia:inicioLact,
      procedencia:esNacida?null:(compraState.procedencia||null),
      valorCompra:(!esNacida&&compraState.valor)?parseInt(String(compraState.valor).replace(/\D/g,'')):null
    }).then(()=>Promise.all(partoRows.map(r=>LCStore.registrarParto({id:r.id,madreId:num,criaId:null,fecha:r.fecha,sexo:null,tipo:'normal',estadoCria:'viva'}))))
      .catch(e=>{console.warn('Alta no guardada en la base:',e.message||e);
      if(e&&e.code==='ID_DUPLICADO')snack('⚠ El número '+num+' ya existe (¿lo tomó otro dispositivo?) — deshaz y usa otro número');
      else snack('⚠ '+num+': NO se guardó en la base — revisa la conexión y reintenta');});
  }
  goVaca(num,'pg-hato');   /* aterrizar en la ficha del animal recién creado */
  const partosTxt=partos?(' · '+partos+' parto'+(partos===1?'':'s')+' registrados'):'';
  snack(num+' · '+nombre+' ('+compraState.tipo.toLowerCase()+', '+raza+') entró al hato'+partosTxt+madreAviso,'Deshacer',()=>{
    const i=hato.indexOf(nuevo);if(i>=0)hato.splice(i,1);
    const mi2=milkCows.findIndex(c=>c.num===num);if(mi2>=0){milkCows.splice(mi2,1);if(typeof renderMilk==='function')renderMilk();}
    delete animalesPorId[num];delete _ultimoParto[num];delete _partosPorMadre[num];
    partoRows.forEach(r=>{const j=_partosRaw.indexOf(r);if(j>=0)_partosRaw.splice(j,1);});
    if(partoRows.length)recomputarPartosRecientes();
    renderHatoFiltros();renderHato();go('pg-hato',navFor('pg-hato'));
    if(typeof LCStore!=='undefined')Promise.all(partoRows.map(r=>LCStore.deleteParto(r.id).catch(()=>{})))
      .then(()=>LCStore.deleteAnimal(num)).catch(()=>{});});
}

/* --- baja (venta / muerte / descarte / pérdida) --- */
const bajaState={};
function openBaja(cow){
  if(!cow&&!hato.length){snack('No hay animales registrados');return;}
  bajaState.num=cow?(''+cow).split('·')[0].trim():hato[0].num;
  bajaState.motivo='Venta';bajaState.fecha=isoHoy();bajaState.valor='';bajaState.nota='';
  openReg('Dar de baja','Sale del hato; su historia se conserva en el histórico');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Animal'));
  body.appendChild(regChips(hato.map(a=>({val:a.num,label:a.num+' '+a.n})),bajaState.num,v=>bajaState.num=v));
  body.appendChild(regLabel('Motivo'));
  body.appendChild(regChips(['Venta','Muerte','Descarte','Pérdida'].map(m=>({val:m,label:m})),bajaState.motivo,v=>bajaState.motivo=v));
  body.appendChild(regTexto('Fecha de la baja','',v=>bajaState.fecha=v,'date',bajaState.fecha));
  body.appendChild(regTexto('Valor de venta (si aplica)','$',v=>bajaState.valor=v,'number',bajaState.valor));
  body.appendChild(regTexto('Nota 📝','Ej. comprador, causa de muerte…',v=>bajaState.nota=v,'text',bajaState.nota));
  document.getElementById('regSaveBtn').onclick=saveBaja;
}
function saveBaja(){
  const idx=hato.findIndex(x=>x.num===bajaState.num);if(idx<0)return;
  const a=hato[idx];const nombre=a.n;
  closeReg();
  const fecha=bajaState.fecha||isoHoy();
  const valor=(bajaState.valor!==''&&bajaState.valor!=null)?parseInt(String(bajaState.valor).replace(/\D/g,'')):null;
  const nota=(bajaState.nota||'').trim()||null;
  const ac=animalesPorId[bajaState.num];
  const prevGrupoCache=ac?ac.grupo:null;
  LCAcciones.ejecutarConDeshacer({
    aplicar(){
      hato.splice(idx,1);renderHatoFiltros();renderHato();
      /* caché canónico al día: alertas y KPIs dejan de contarla sin recargar.
       * grupo:'baja' también la saca YA de próximos partos/vacías/candidatas
       * (Estado único: esas listas filtran grupo!=='baja'). */
      if(ac){ac.grupo='baja';ac.baja={motivo:bajaState.motivo,fecha:fecha,valor:valor,nota:nota};}
      recomputarRepro();
      if(typeof renderInicio==='function')renderInicio();
      go('pg-hato',navFor('pg-hato'));
    },
    escribir:typeof LCStore!=='undefined'?
      ()=>LCStore.darDeBaja(bajaState.num,{motivo:bajaState.motivo,fecha:fecha,valor:valor,nota:nota}):null,
    avisoError:()=>'⚠ La baja NO se guardó en la base — revisa la conexión y reintenta',
    mensaje:nombre+': baja por '+bajaState.motivo.toLowerCase()+' — sale del hato, su historia se conserva',
    revertir(){
      hato.splice(Math.min(idx,hato.length),0,a);renderHatoFiltros();renderHato();
      if(prevGrupoCache&&animalesPorId[bajaState.num]){animalesPorId[bajaState.num].grupo=prevGrupoCache;animalesPorId[bajaState.num].baja=null;}
      recomputarRepro();
      if(typeof renderInicio==='function')renderInicio();
    },
    compensarBD:typeof LCStore!=='undefined'?
      ()=>LCStore.updateAnimalCampos(bajaState.num,
        {grupo:GRUPO_MODELO[a.grupo]||'ordeño',baja_motivo:null,baja_fecha:null,baja_valor:null,baja_nota:null}):null,
    snack,
  });
}
/* revertir una baja ya confirmada (más allá del "Deshacer" de 5 s): vuelve al hato */
function revertirBaja(num){
  const ac=animalesPorId[num];if(!ac){snack('No tengo los datos de '+num+' — sincroniza primero');return;}
  if(ac.grupo!=='baja'){snack(num+' no está dado de baja');return;}
  /* grupo destino: el mejor conocido; por defecto según sexo (revisa en Editar) */
  const destino=ac.sexo==='M'?'macho':'ordeño';
  ac.grupo=destino;ac.baja=null;
  /* reponer en el hato (si no está ya) con una fila básica */
  if(!hato.find(x=>x.num===num)){
    hato.unshift({num:num,n:ac.nombre||'',raza:ac.raza||'—',grupo:GRUPO_DISPLAY[destino]||destino,
      edad:fmtEdadLarga(ac),repro:'<span class="badge">baja revertida</span>',
      del:(ac.del!=null?ac.del:'—'),ayer:'—',var:'—',vc:'',tags:[]});
  }
  /* si vuelve "en ordeño", reaparece en la lista de registro de leche */
  if(destino==='ordeño'&&!milkCows.find(c=>c.num===num)){
    milkCows.push(animalAMilk(ac));if(typeof renderMilk==='function')renderMilk();}
  /* si su estado reproductivo (vacía/servida/preñada) seguía vigente, reaparece
   * en las listas derivadas — ya no está en 'baja' (Estado único). */
  recomputarRepro();
  if(typeof LCStore!=='undefined')LCStore.updateAnimalCampos(num,
    {grupo:destino,baja_motivo:null,baja_fecha:null,baja_valor:null,baja_nota:null}).catch(e=>{
      console.warn('Reversión de baja no guardada:',e.message||e);
      snack('⚠ La reversión NO se guardó en la base — reintenta');});
  hatoFiltro='todas';renderHatoFiltros();renderHato();if(typeof renderInicio==='function')renderInicio();
  renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();
  goVaca(num,vacaFrom);
  snack(num+' vuelve al hato como "'+(GRUPO_DISPLAY[destino]||destino)+'" — revisa el grupo en Editar');
}

/* Potreros: arranca vacío y se llena desde Supabase (cargarPotrerosDesdeSupabase).
 * Antes había 32 potreros con días de descanso inventados. */
let pots=[];
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
    const days=st==='now'?(Math.abs(p.d)||1)+'º':p.d;   // días de ocupación reales, no demo
    div.innerHTML=(st==='now'?'<div class="p-tag">HATO AQUÍ</div>':'')+
      (p.sugerido?'<div class="p-tag">SUGERIDO</div>':'')+
      '<div class="p-top"><span class="p-name">P'+p.n+'</span><span class="dot"></span></div>'+
      '<div class="p-days">'+days+'</div><div class="p-cap">'+cap+'</div>';
    if(p.sugerido){div.classList.add('suggested');}
    div.onclick=()=>snack('Potrero '+p.n+': '+(st==='now'?'el hato está aquí (día '+(Math.abs(p.d)||1)+')':p.d+' días de descanso · '+cap));
    grid.appendChild(div);
  });
}
renderPotreros();
renderInicio();   /* pintado inicial del dashboard (los cargadores lo refinan) */
(async function cargarPotrerosDesdeSupabase(){
  if(!POTREROS_VISIBLE)return;   // módulo oculto: no gastar una consulta en él
  if(typeof LCStore==='undefined')return;
  try{
    const ps=await LCStore.getPotreros();
    if(!ps)return;
    pots=ps.map(p=>({n:p.numero,d:p.dias_descanso,sugerido:!!p.sugerido_siguiente}));
    renderPotreros();renderInicio();
  }catch(e){console.warn('Potreros: usando datos locales:',e.message||e);}
})();

/* accesibilidad: modales anunciados como diálogo y cierre con Escape */
document.querySelectorAll('.modal').forEach(el=>{el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')document.querySelectorAll('.scrim.show').forEach(sc=>sc.click());
});

/* si la pestaña queda abierta de un día para otro, recargar al cambiar la
 * fecha (solo sin modales abiertos) para que "hoy" no quede congelado en ayer */
(function(){
  const dia0=isoHoy();
  function chequearDia(){ if(isoHoy()!==dia0&&!document.querySelector('.modal.show'))location.reload(); }
  setInterval(chequearDia,5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)chequearDia();});
})();

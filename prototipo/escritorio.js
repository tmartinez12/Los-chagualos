/* Bandera para ocultar Potreros por ahora (poner true para reactivarlo). */
const POTREROS_VISIBLE=false;
/* Caché id→animal (forma canónica) para fichas, inicio y genealogía.
   Declarada aquí arriba para evitar TDZ: el arranque (renderHato/renderInicio)
   corre antes de la línea donde se llena desde Supabase. */
let animalesPorId={};
let _palpaciones=[];   // todas las palpaciones (cache para la ficha y el historial)
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
  'pg-potreros':['Potreros','32 potreros · ocupación 1 día (máx 2)'],
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
      return hato.length+' animales · '+ordeño+' en ordeño · '+prenadas+' preñadas';
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
      '<div class="a-title">'+a.title+'</div><div class="a-sub">'+a.sub+'</div>'+
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
  /* por secar (lista) */
  const listBox=document.getElementById('porSecarLista');
  if(listBox){ if(porSecar.length){listBox.style.display='';
      listBox.innerHTML='<b style="color:var(--ink)">Por secar este mes (7 meses de preñez):</b> '+
        porSecar.map(a=>'<a onclick="goVaca(\''+a.id+'\',\'pg-leche\')" style="cursor:pointer;text-decoration:underline">'+a.id+' '+a.nombre+'</a>'+
          (a.prenez&&a.prenez.meses!=null?' ('+a.prenez.meses+'m)':'')).join(' · ');
    }else listBox.style.display='none';}
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
        bajon.map(b=>'<a onclick="goVaca(\''+b.a.id+'\',\'pg-leche\')" style="cursor:pointer;text-decoration:underline">'+b.a.id+' '+b.a.nombre+'</a> −'+b.pct+'% ('+b.ap+'→'+b.at+' L)').join(' · ');
    }else bajonBox.style.display='none';}
  /* resumen del hato: DEL promedio · en ordeño/secas · paren este mes · faltan registrar */
  const resBox=document.getElementById('hatoResumenLeche');
  if(resBox){
    const dels=enOrdeno.map(a=>a.del).filter(d=>typeof d==='number');
    const delProm=dels.length?Math.round(dels.reduce((s,d)=>s+d,0)/dels.length):null;
    const secas=Object.values(animalesPorId).filter(a=>a.grupo==='horra').length;
    const paren=Object.values(animalesPorId).filter(a=>a.prenez&&a.prenez.partoEstimado&&String(a.prenez.partoEstimado).slice(0,7)===ym).length;
    const ult7=[];for(let i=0;i<7;i++){const d=new Date(now);d.setDate(now.getDate()-i);ult7.push(_isoDe(d));}
    const faltan=enOrdeno.filter(a=>{const c=porCow[a.id]||{};return !ult7.some(f=>c[f]!=null);});
    const parts=[];
    if(delProm!=null)parts.push('DEL promedio <b style="color:var(--ink)">'+delProm+' días</b>');
    parts.push('<b style="color:var(--ink)">'+nOrdeno+'</b> en ordeño / <b style="color:var(--ink)">'+secas+'</b> secas');
    if(paren)parts.push('<b style="color:var(--ink)">'+paren+'</b> paren este mes (entran a producir)');
    let html=parts.join(' · ');
    if(faltan.length&&faltan.length<nOrdeno)html+='<br><span style="color:var(--red)">Sin registrar esta semana:</span> '+
      faltan.map(a=>'<a onclick="goVaca(\''+a.id+'\',\'pg-leche\')" style="cursor:pointer;text-decoration:underline">'+a.id+' '+a.nombre+'</a>').join(' · ');
    resBox.style.display='';resBox.innerHTML=html;
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
  enOrdeno.forEach(a=>{
    const tr=document.createElement('tr');
    let cells='<td><div class="cell-animal"><div class="cini">'+a.id+'</div><div class="cn">'+a.nombre+'</div></div></td>';
    let tot=0;
    dias.forEach(d=>{const iso=_isoDe(d),fut=iso>hoyIso,v=ordenosDiaMap[a.id+'|'+iso];
      if(v!=null)tot+=Number(v)||0;
      cells+='<td class="r" style="padding:4px">'+
        (fut?'<span class="pending">—</span>':
         '<input type="number" inputmode="numeric" min="0" value="'+(v!=null?v:'')+'" onchange="guardarCeldaSemana(\''+a.id+'\',\''+iso+'\',this)" '+
         'style="width:42px;text-align:center;border:none;border-bottom:1.5px solid var(--border);background:transparent;font-family:inherit;font-size:13px;padding:3px;outline:none">')+
        '</td>';
    });
    cells+='<td class="r" style="font-weight:700" id="regtot-'+a.id+'">'+(tot?Math.round(tot):'—')+'</td>';
    tr.innerHTML=cells;tb.appendChild(tr);
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
/* alias para no romper llamadas antiguas */
function renderSemana(){renderRegistro();}
function guardarCeldaSemana(animalId,iso,input){
  const raw=String(input.value).trim();
  if(raw===''){delete ordenosDiaMap[animalId+'|'+iso];if(_ordsRaw){const i=_ordsRaw.findIndex(o=>o.animal_id===animalId&&o.fecha===iso);if(i>=0)_ordsRaw.splice(i,1);}actualizarTotalesRegistro();renderLecheKpis();return;}
  const litros=Math.max(0,parseFloat(raw));
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
/* Promedio de litros de los últimos 5 días con ordeño registrado (de ordenosDiaMap).
   Suaviza la variación día a día. Devuelve null si no hay ordeños de esa vaca. */
function promedioUltimos5(id){
  const arr=[];
  for(const k in ordenosDiaMap){
    const i=k.indexOf('|');
    if(k.slice(0,i)===String(id))arr.push([k.slice(i+1),Number(ordenosDiaMap[k])||0]);
  }
  if(!arr.length)return null;
  arr.sort((a,b)=>a[0]<b[0]?1:-1);   // por fecha, más reciente primero
  const top=arr.slice(0,5);
  return Math.round(top.reduce((s,x)=>s+x[1],0)/top.length*10)/10;
}
function scatterCows(){
  let cows=[];
  try{
    cows=hato.filter(a=>a.grupo==='En ordeño'&&a.del!=='—'&&a.del!==undefined&&a.ayer!=='—').map(a=>{
      // eje Y = promedio de los últimos 5 días; si aún no hay ordeños, el último valor
      const p5=promedioUltimos5(a.num);
      return {num:a.num,n:a.n,del:parseInt(a.del),l:(p5!=null?p5:a.ayer),
        prenada:a.tags.includes('prenada'),vacia:a.tags.includes('vacia'),retiro:a.tags.includes('tratamiento')};
    });
  }catch(e){ /* hato aún no definido en la carga inicial */ }
  return cows;
}
function renderScatter(svgId){
  const svg=document.getElementById(svgId);if(!svg)return;
  const cows=scatterCows();
  if(!cows.length){
    /* sin datos: explica qué falta en vez de quedar en blanco */
    const enOrdeno=(typeof hato!=='undefined')?hato.filter(a=>a.grupo==='En ordeño').length:0;
    const msg=enOrdeno?('Las '+enOrdeno+' vacas en ordeño no tienen DEL ni ordeños cargados.')
      :'Aún no hay vacas en ordeño con datos de producción.';
    svg.innerHTML='<text x="280" y="78" text-anchor="middle" font-family="Work Sans,sans-serif" font-size="12" fill="#A8ACA0">'+msg+'</text>'+
      '<text x="280" y="98" text-anchor="middle" font-family="Work Sans,sans-serif" font-size="11" fill="#C0C4B8">Completa el DEL (✏️ Editar) y registra ordeños para ver la producción.</text>';
    return;
  }
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
      ' onclick="goVaca(\''+c.num+'\',\'pg-leche\')"><title>'+c.num+' '+c.n+' · DEL '+c.del+' · '+c.l+' L/día (prom. 5 días)</title></circle>';
    out+='<text x="'+cx+'" y="'+(cy-r-3)+'" font-family="Work Sans,sans-serif" font-size="8" font-weight="500" fill="#70756A" text-anchor="middle">'+c.num+'</text>';
  });
  svg.innerHTML=out;
  // título con el conteo real de vacas en ordeño
  const titleId=svgId==='scatterInicio'?'scatterInicioTitle':'scatterLecheTitle';
  const t=document.getElementById(titleId);
  if(t)t.textContent='Producción vs DEL · '+cows.length+' vacas en ordeño';
}
function renderScatters(){if(!scatterListo)return;renderScatter('scatterLeche');}

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
const diaOverrides={};         // clave "num-mes-dia" → valor editado
function diaKey(num,m,d){return num+'-'+m+'-'+d;}
function diaVal(numStr,monthIdx,day){
  const k=diaKey(numStr,monthIdx,day);
  if(k in diaOverrides)return diaOverrides[k];
  const v=ordenosDiaMap[numStr+'|'+claveFecha(monthIdx,day)];
  return v!=null?v:null;   // litros reales del ordeño de ese día, o null si no hay
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
      tdAnimal.innerHTML='<div class="cell-animal"><div class="cini">'+c.num+'</div><div><div class="cn">'+c.n+'</div>'+
        (c.nota?'<div class="cs" style="color:var(--red)">'+c.nota+'</div>':'')+'</div></div>';
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
  if(typeof renderScatters==='function')renderScatters();   // el scatter usa el promedio de 5 días
  renderProduccionAnio();
}
/* producción total del AÑO seleccionado (suma real de los ordeños de ese año) */
function renderProduccionAnio(){
  const box=document.getElementById('produccionAnioTotal');if(!box)return;
  const total=Math.round((mensualData||[]).reduce((s,c)=>s+((c.sum||[]).reduce((a,b)=>a+b,0)),0));
  const dias=(mensualData||[]).length; // nº de vacas con datos (informativo)
  box.innerHTML='Producción registrada en <b style="color:var(--ink)">'+ANIO_SEL+'</b>: '+
    '<b style="color:var(--ink)">'+total.toLocaleString('es-CO')+' L</b>'+(total?'':' <span style="color:var(--ink-3)">(sin datos de ese año)</span>');
}
(async function cargarMensualDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const filas=await LCStore.getProduccionMensual();
    if(!filas)return;
    _mensualRaw=filas;
    /* detalle diario real: ordeños por animal y día */
    try{_ordsRaw=await LCStore.getOrdenos()||[];}catch(_){_ordsRaw=[];}
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
  const set=new Set([new Date().getFullYear(), ANIO_SEL]);
  (_mensualRaw||[]).forEach(f=>{const y=parseInt(String(f.mes||'').slice(0,4),10);if(y)set.add(y);});
  (_ordsRaw||[]).forEach(o=>{const y=parseInt(String(o.fecha||'').slice(0,4),10);if(y)set.add(y);});
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
const fichas={};
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
/* fecha corta CON año — para historiales que cruzan años ("17 feb 2025") */
function fmtFechaAno(iso){if(!iso)return '—';return fmtFechaCorta(iso)+' '+String(iso).slice(0,4);}
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
  if(a.estadoRepro==='vacia'){const da=(typeof _diasAbiertos==='function'?_diasAbiertos(a.id):null)??a.diasVacia;
    return {badge:'bad',text:'Vacía'+(da?' · '+da+' días abiertos':''),sub:da>120?'Evaluar descarte o tratamiento reproductivo':'Esperar para servicio'};}
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
  if(a.partos){const up=_ultimoParto[a.id];
    const f=up?(new Date(up+'T00:00:00').getDate()+' '+LCRules.MESC[new Date(up+'T00:00:00').getMonth()].toUpperCase()+' '+up.slice(0,4)):'—';
    historia.push({fecha:f,texto:a.partos+(a.partos===1?'er':'°')+' parto registrado'});}
  return {num:a.id,n:a.nombre,raza:a.raza||'—',color:a.color||null,nota:a.nota||null,edad:fmtEdadLarga(a),grupo:GRUPO_DISPLAY[a.grupo]||a.grupo,
    origen:a.origen==='comprado'?'Comprada':a.origen==='nacido_finca'?'Nació en finca':'—',
    procedencia:a.procedencia||null,valorCompra:a.valorCompra||null,
    del:(a.del==null?0:a.del),parto:a.partos||0,ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer:0),
    prom5:(typeof promedioUltimos5==='function'?promedioUltimos5(a.id):null),
    diasAbiertos:(typeof _diasAbiertos==='function'?_diasAbiertos(a.id):null),
    peso:a.pesoKg?a.pesoKg+' kg':'—',fechaPeso:a.fechaPeso||null,
    madre:a.madreId?nombreRef(a.madreId):'—',padre:a.padreId?nombreRef(a.padreId):'—',
    crias:crias,repro:deriveReproFicha(a),
    sanidad:sanOk?'sin retiros activos':'retiro de leche activo — no vender su leche',sanOk:sanOk,
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
  document.getElementById('vacaSub').textContent=[cow.raza,cow.color,cow.edad,cow.grupo,cow.origen].filter(x=>x&&x!=='—').join(' · ');
  const bd=document.getElementById('vacaBadge');
  if(cow.repro.badge)bd.innerHTML='<span class="badge '+cow.repro.badge+'">'+cow.repro.text.split('·')[0].trim()+'</span>';
  else bd.innerHTML='';
  const al=document.getElementById('vacaAlerta');
  al.innerHTML='<div class="alert '+(cow.repro.badge==='bad'?'urgent':cow.repro.badge==='warn'?'warn':'info')+'">'+
    '<div style="flex:1"><div class="a-title">'+cow.repro.text+'</div>'+
    '<div class="a-sub">'+cow.repro.sub+'</div></div></div>';
  const kpis=document.getElementById('vacaKpis');
  kpis.innerHTML=
    '<div class="card kpi"><div class="k-label">Último ordeño</div><div class="k-value">'+cow.ayer+' <span class="k-unit">L</span></div>'+
      '<div class="k-trend mut">'+(cow.prom5!=null?'prom. 5 días: '+cow.prom5+' L':'sin historial')+'</div></div>'+
    '<div class="card kpi"><div class="k-label">DEL</div><div class="k-value">'+cow.del+' <span class="k-unit">días</span></div>'+
      '<div class="k-trend mut">días en leche</div></div>'+
    '<div class="card kpi"><div class="k-label">Días abiertos</div><div class="k-value'+(cow.diasAbiertos>120?' down':'')+'">'+(cow.diasAbiertos!=null?cow.diasAbiertos:'—')+'</div>'+
      '<div class="k-trend mut">desde el último parto</div></div>'+
    '<div class="card kpi"><div class="k-label">Partos</div><div class="k-value">'+cow.parto+'</div>'+
      '<div class="k-trend mut">'+(function(){const iv=intervaloPartosVaca(cow.num);
        return iv!=null?'pare cada '+(iv/30.44).toFixed(1)+' m':(cow.parto===1?'primer parto':'registrados');})()+'</div></div>';
  /* datos del animal: identificación, cuerpo y familia */
  document.getElementById('vacaGenea').innerHTML=
    '<b style="color:var(--ink)">Nacimiento:</b> '+fmtNacimiento(animalesPorId[cow.num])+
    ' &nbsp;·&nbsp; <b style="color:var(--ink)">Color:</b> '+(cow.color||'<span style="color:var(--ink-3)">sin registrar (✏️ Editar)</span>')+
    ' &nbsp;·&nbsp; <b style="color:var(--ink)">Peso:</b> '+cow.peso+(cow.fechaPeso?' <span style="color:var(--ink-3)">('+fmtFechaCorta(cow.fechaPeso)+')</span>':'')+'<br>'+
    (cow.procedencia||cow.valorCompra?'<b style="color:var(--ink)">Compra:</b> '+(cow.procedencia||'')+(cow.valorCompra?' · $'+Number(cow.valorCompra).toLocaleString('es-CO'):'')+'<br>':'')+
    '<b style="color:var(--ink)">Madre:</b> '+cow.madre+' &nbsp;·&nbsp; <b style="color:var(--ink)">Padre:</b> '+cow.padre+
    '<br><b style="color:var(--ink)">Crías:</b> '+(cow.crias.length?cow.crias.join(', '):'sin crías registradas')+
    (cow.nota?'<br><b style="color:var(--ink)">📝 Nota:</b> '+cow.nota:'');
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
  /* historial de palpaciones de esta vaca */
  if(typeof renderVacaPalpaciones==='function')renderVacaPalpaciones(cow.num);
  /* partos de esta vaca (de la tabla partos) + su intervalo entre partos */
  const ptb=document.getElementById('vacaPartosTb');
  if(ptb){ptb.innerHTML='';
    const ps=(_partosRaw||[]).filter(p=>String(p.madre_id)===String(cow.num))
      .sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha)));
    if(!ps.length)ptb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:12px;color:var(--ink-3)">Sin partos registrados.</td></tr>';
    ps.forEach(p=>{
      ptb.innerHTML+='<tr><td>'+fmtFechaAno(p.fecha)+'</td>'+
        '<td>'+(p.cria_id?('<b>'+p.cria_id+'</b> '+(animalesPorId[p.cria_id]?animalesPorId[p.cria_id].nombre:'')):'—')+'</td>'+
        '<td class="r">'+(p.sexo_cria==='H'?'♀':'♂')+'</td><td class="r">'+(p.peso_kg?p.peso_kg+' kg':'—')+'</td>'+
        '<td>'+(p.tipo||'normal')+'</td>'+
        '<td class="r"><span class="badge '+(p.estado_cria==='viva'?'ok':'bad')+'">'+(p.estado_cria==='viva'?'viva':'mortinato')+'</span></td></tr>';
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
      lineas.push('💊 <b style="color:var(--ink)">'+t.desc+'</b>'+(t.retiro?' · <span style="color:var(--red)">'+t.retiro+'</span>':' · sin retiro'));});
    const pasados=(_tratamientosTodos||[]).filter(t=>!t.activo&&String(t.animal_id)===String(cow.num))
      .sort((x,y)=>String(y.inicio).localeCompare(String(x.inicio)));
    /* patrón: 3+ tratamientos en los últimos 12 meses = vaca repetidora */
    const hace12m=new Date();hace12m.setMonth(hace12m.getMonth()-12);
    const enElAnio=(_tratamientosTodos||[]).filter(t=>String(t.animal_id)===String(cow.num)&&t.inicio&&new Date(t.inicio+'T00:00:00')>=hace12m).length;
    if(enElAnio>=3)lineas.push('<span style="color:var(--red)">⚠ '+enElAnio+' tratamientos en 12 meses — patrón a vigilar</span>');
    pasados.slice(0,4).forEach(t=>{
      lineas.push('💊 '+fmtFechaAno(t.inicio)+' · '+(t.problema||'')+(t.medicamento?' · '+t.medicamento.toLowerCase():'')+' <span style="color:var(--ink-3)">(terminado)</span>');});
    (_vacunaciones||[]).filter(v=>String(v.animal_id)===String(cow.num)||v.alcance==='hato').slice(0,3).forEach(v=>{
      lineas.push('💉 '+fmtFechaCorta(v.fecha)+' · '+v.tipo+(v.alcance==='hato'?' (todo el hato)':''));});
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
function renderPartosRecientes(){
  const tb=document.getElementById('partosRecientesTbody');if(!tb)return;tb.innerHTML='';
  partosDelAnio().forEach(p=>{
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
  const pa=partosDelAnio();
  const total=pa.length;
  const vivas=pa.filter(p=>p.estado==='viva').length;
  const mortinatos=total-vivas;
  const porParir=proximosPartos.length;
  const prox=proximosPartos.length?proximosPartos[0]:null;
  box.innerHTML=
    '<div class="card kpi"><div class="k-label">Partos</div><div class="k-value">'+total+'</div><div class="k-trend up">'+vivas+' crías vivas</div></div>'+
    '<div class="card kpi"><div class="k-label">Por parir</div><div class="k-value">'+porParir+'</div><div class="k-trend mut">de las palpaciones</div></div>'+
    '<div class="card kpi"><div class="k-label">Próximo</div><div class="k-value" style="font-size:20px">'+(prox?prox.parto:'—')+'</div><div class="k-trend mut">'+(prox?prox.cow:'sin próximos')+'</div></div>'+
    '<div class="card kpi"><div class="k-label">Mortinatos</div><div class="k-value'+(mortinatos?' down':'')+'">'+mortinatos+'</div><div class="k-trend mut">de '+total+' partos</div></div>';
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
    tr.innerHTML='<td>'+p.cow+'</td><td>'+p.prenez+'</td><td class="r">'+cell+'</td>';
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
    tr.innerHTML='<td><div class="cell-animal"><div class="cini">'+v.num+'</div><div><div class="cn">'+
      v.cow.split('·')[1].trim()+'</div><div class="cs">'+v.sub+'</div></div></div></td>'+
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
/* derivación tratamiento canónico (BD) → tarjeta de la UI */
function tratamientoAFila(t){
  const desc=(t.problema||'')+(t.medicamento?' · '+t.medicamento.toLowerCase():'');
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
/* Sanidad · vacunas: brucelosis desde terneras reales (3-8 meses) + mes actual */
function renderSanidadVacunas(){
  const A=Object.values(animalesPorId||{});
  const el=document.getElementById('sanBrucelosis');
  if(el){
    const t=A.filter(a=>a.grupo==='ternera'&&a.edadAnios!=null&&a.edadAnios>=0.25&&a.edadAnios<=0.67);
    if(t.length){el.style.display='';
      el.querySelector('.a-title').textContent='Brucelosis: '+t.length+' ternera'+(t.length>1?'s':'')+' en ventana de vacunación';
      el.querySelector('.a-sub').textContent=t.slice(0,6).map(x=>x.id+(x.nombre?' '+x.nombre:'')).join(', ')+' · vacuna única entre los 3 y 8 meses';
    }else el.style.display='none';
  }
  const mes=new Date().getMonth();
  const cal=document.getElementById('sanCalendario');
  if(cal)Array.prototype.forEach.call(cal.children,(c,i)=>c.classList.toggle('now',i===mes));
}
/* ===== Registro de vacunaciones ===== */
const TIPO_VAC=[{val:'aftosa',label:'Aftosa'},{val:'brucelosis',label:'Brucelosis'},
  {val:'desparasitacion',label:'Desparasitación'},{val:'vitaminas',label:'Vitaminas'},{val:'otra',label:'Otra'}];
const vacunaState={};
function openVacuna(){
  vacunaState.tipo='aftosa';vacunaState.alcance='hato';vacunaState.animal='';
  vacunaState.producto='';vacunaState.lote='';vacunaState.fecha=isoHoy();
  openReg('Registrar vacunación','Queda como soporte ICA');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Tipo'));
  body.appendChild(regChips(TIPO_VAC,vacunaState.tipo,v=>vacunaState.tipo=v));
  body.appendChild(regLabel('¿A quién?'));
  body.appendChild(regChips([{val:'hato',label:'Todo el hato'},{val:'individual',label:'Una animal'}],vacunaState.alcance,
    v=>{vacunaState.alcance=v;const w=document.getElementById('vacAnimalWrap');if(w)w.style.display=v==='individual'?'':'none';}));
  const aw=regTexto('Animal (número)','solo si es una animal',v=>vacunaState.animal=v,'text',vacunaState.animal);
  aw.id='vacAnimalWrap';aw.style.display='none';body.appendChild(aw);
  body.appendChild(regTexto('Producto (opcional)','Ej. Aftogan',v=>vacunaState.producto=v,'text',vacunaState.producto));
  body.appendChild(regTexto('Lote (opcional)','lote del biológico',v=>vacunaState.lote=v,'text',vacunaState.lote));
  body.appendChild(regTexto('Fecha','',v=>vacunaState.fecha=v,'date',vacunaState.fecha));
  document.getElementById('regSaveBtn').onclick=saveVacuna;
}
function saveVacuna(){
  closeReg();
  const tipoLabel=(TIPO_VAC.find(t=>t.val===vacunaState.tipo)||{}).label||vacunaState.tipo;
  const individual=vacunaState.alcance==='individual';
  const animalId=individual?(vacunaState.animal||'').trim():null;
  const nAnimales=individual?null:Object.values(animalesPorId).filter(a=>a.grupo!=='baja').length;
  if(typeof LCStore!=='undefined'){
    LCStore.registrarVacunacion({tipo:vacunaState.tipo,alcance:vacunaState.alcance,animalId:animalId,
      nAnimales:nAnimales,producto:vacunaState.producto||null,lote:vacunaState.lote||null,fecha:vacunaState.fecha||isoHoy()})
      .then(()=>cargarVacunaciones())
      .catch(e=>{console.warn('Vacunación no guardada:',e.message||e);snack('⚠ Vacunación guardada local, falta sincronizar');});
  }
  snack('Vacunación registrada: '+tipoLabel+(individual?(animalId?' · '+animalId:''):' · todo el hato'));
}
let _vacunaciones=[];
function renderVacunaciones(lista){
  if(lista)_vacunaciones=lista;
  const box=document.getElementById('vacListaHist');if(!box)return;
  const arr=(_vacunaciones||[]).filter(v=>!v.fecha||String(v.fecha).slice(0,4)===String(ANIO_SEL));
  if(!arr.length){box.innerHTML='<span style="color:var(--ink-3)">Sin vacunaciones en '+ANIO_SEL+'.</span>';return;}
  box.innerHTML=arr.slice(0,8).map(v=>{
    const quien=v.alcance==='individual'
      ?((v.animales&&v.animales.nombre)?v.animal_id+' '+v.animales.nombre:(v.animal_id||'animal'))
      :('todo el hato'+(v.n_animales?' ('+v.n_animales+')':''));
    return '<div><b style="color:var(--ink)">'+fmtFechaCorta(v.fecha)+'</b> · '+v.tipo+' · '+quien+(v.lote?' · lote '+v.lote:'')+'</div>';
  }).join('');
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
  if(fi){fi.historia.unshift({fecha:fmtFechaCorta(isoHoy()).toUpperCase()+' '+new Date().getFullYear(),
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
  /* quitar de la lista de candidatas */
  const ci=palpCandidatas.findIndex(c=>c.cow===cow);
  const removedCand=ci>=0?palpCandidatas.splice(ci,1)[0]:null;
  /* los tratamientos aplicados quedan en la sanidad del animal, sea cual sea el resultado */
  const undoTrat=aplicarTratamientos(num,nombre,p.trat,nota);
  /* persistir la palpación y el nuevo estado reproductivo en Supabase */
  let pSavePalp=Promise.resolve(),palpId=null;
  const reproAntes=animalesPorId[num]?snapshotReproDB(animalesPorId[num]):null;
  if(typeof LCStore!=='undefined'){
    const campos={ultima_palpacion:fechaPalp};let prenezMeses=null;
    if(p.tipo==='prenada'){const m=Math.round(p.meses);prenezMeses=m;
      campos.estado_repro='prenada';campos.prenez_meses=m;}
    else if(p.tipo==='vacia'){campos.estado_repro='vacia';campos.prenez_meses=null;}
    pSavePalp=LCStore.registrarPalpacion({animalId:num,resultado:nota,fecha:fechaPalp,
      motivo:removedCand?removedCand.motivo:null,prenezMeses:prenezMeses})
      .then(r=>{palpId=r&&r.id;return LCStore.updateAnimalCampos(num,campos);})
      .catch(e=>{console.warn('Palpación no guardada en la base:',e.message||e);
        snack('⚠ Palpación guardada local, falta sincronizar');});
    pSavePalp.then(()=>{if(typeof cargarPalpHistorial==='function')cargarPalpHistorial();});
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
    renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();go('pg-partos',document.querySelector('[data-pg="pg-partos"]'));
    const trats=p.trat.length?' · Trat: '+p.trat.join(', '):'';
    snack(nombre+': '+nota+' → preñada ~'+p.dias+'d — parto '+f.corta+trats,'Deshacer',()=>{
      const j=proximosPartos.findIndex(pp=>pp.cow===cow);
      if(j>=0)proximosPartos.splice(j,1);
      if(prevParto)proximosPartos.push(prevParto);
      if(removedVacia)vacasVacias.splice(Math.min(vi,vacasVacias.length),0,removedVacia);
      if(removedCand)palpCandidatas.splice(Math.min(ci,palpCandidatas.length),0,removedCand);
      if(undoTrat)undoTrat();
      revertirPalpEnBase();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();});
    return;
  }
  if(p.tipo==='vacia'){
    const pi=proximosPartos.findIndex(pp=>pp.cow===cow);
    const prevParto=pi>=0?proximosPartos.splice(pi,1)[0]:null;
    let added=null;
    if(!vacasVacias.find(v=>v.cow===cow)){
      const num=cow.split('·')[0].trim();const fi=fichas[num];
      added={cow:cow,num:num,del:fi?fi.del:'—',sub:fi?(fi.parto+'° parto · '+fi.raza):'—',estado:'vacia',
        dias:1,ultima:fmtFechaCorta(isoHoy())+' '+new Date().getFullYear(),ayer:fi?fi.ayer+' L':'—',
        rec:p.subtipo==='fisiologica'?'Vacía fisiológica — programar servicio':'Vacía — evaluar siguiente paso'};
      vacasVacias.push(added);
    }
    renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();go('pg-repro',document.querySelector('[data-pg="pg-repro"]'));
    snack(nombre+': '+nota+' → vacía — lista para servicio','Deshacer',()=>{
      if(added){const ai=vacasVacias.findIndex(v=>v.cow===cow);if(ai>=0)vacasVacias.splice(ai,1);}
      if(prevParto)proximosPartos.splice(Math.min(pi,proximosPartos.length),0,prevParto);
      if(removedCand)palpCandidatas.splice(Math.min(ci,palpCandidatas.length),0,removedCand);
      if(undoTrat)undoTrat();
      revertirPalpEnBase();
      renderPartos();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();});
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
      '<td style="font-size:12px;color:var(--ink-3)">'+(p.motivo||'')+'</td>';
    tb.appendChild(tr);
  });
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
      '<td style="font-size:12px;color:var(--ink-3)">'+(p.motivo||'')+'</td></tr>';
  });
}
renderPartos();renderPartosRecientes();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();renderTratamientos();renderSanidadVacunas();
cargarPalpHistorial();
/* ===== Cableado a Supabase: reproducción y partos ===== */
const fmtFechaCorta=LCRules.fmtFechaCorta;   // compartido en core/rules.js
(async function cargarReproDesdeSupabase(){
  if(typeof LCStore==='undefined')return;
  try{
    const [animales,partos]=await Promise.all([LCStore.getAnimales(),LCStore.getPartos()]);
    if(!animales)return;
    const porId={};animales.forEach(a=>porId[a.id]=a);
    const ref=id=>porId[id]?(id+' '+porId[id].nombre):id;
    const refPunto=id=>porId[id]?(id+' · '+porId[id].nombre):id;
    /* fecha del último parto por madre (para días abiertos e intervalo entre partos) */
    _ultimoParto={};_partosPorMadre={};
    (partos||[]).forEach(p=>{if(!p.madre_id||!p.fecha)return;
      (_partosPorMadre[p.madre_id]=_partosPorMadre[p.madre_id]||[]).push(p.fecha);
      if(!_ultimoParto[p.madre_id]||p.fecha>_ultimoParto[p.madre_id])_ultimoParto[p.madre_id]=p.fecha;});
    /* próximos partos: preñadas con fecha estimada, más cercanas primero */
    proximosPartos=animales
      .filter(a=>a.estadoRepro==='prenada'&&a.prenez&&a.prenez.partoEstimado)
      .sort((x,y)=>x.prenez.partoEstimado<y.prenez.partoEstimado?-1:1)
      .map(a=>{const m=a.prenez.meses;return {cow:refPunto(a.id),
        prenez:(String(m).replace('.',','))+' meses',parto:'~'+fmtFechaCorta(a.prenez.partoEstimado),
        partoISO:a.prenez.partoEstimado,badge:m>=8?'warn':undefined};});
    /* candidatas a palpar: servidas (confirmar) y vacías de largo */
    palpCandidatas=animales.filter(a=>a.estadoRepro==='servida'||a.estadoRepro==='vacia')
      .map(a=>({cow:refPunto(a.id),
        motivo:a.estadoRepro==='servida'?'servida, por confirmar'
          :'vacía'+(a.diasVacia?' hace '+a.diasVacia+' días':', confirmar estado')}));
    /* Vacas por revisar: vacías + servidas por confirmar (solo hembras).
       Las vacías de ≥120 días requieren decisión. */
    vacasVacias=animales.filter(a=>a.sexo==='H'&&(a.estadoRepro==='vacia'||a.estadoRepro==='servida'))
      .map(a=>{const daAb=_diasAbiertos(a.id);
        const servida=a.estadoRepro==='servida';
        const decision=(!servida)&&(daAb!=null?daAb>=120:(a.diasVacia!=null&&a.diasVacia>=120));
        return {cow:refPunto(a.id),num:a.id,del:a.del,estado:a.estadoRepro,
        sub:(a.partos?ordinalParto(a.partos):'')+(a.raza?' · '+a.raza:''),
        dias:daAb,ultima:fmtFechaCorta(a.ultimaPalpacion),
        ayer:(a.leche&&a.leche.ayer!=null?a.leche.ayer+' L':'—'),
        decision:decision,
        rec:servida?'Servida — palpar para confirmar preñez'
           :(decision?(a.del>300?'Lactancia extendida sin preñez — evaluar descarte':'Producción muy baja para su etapa — evaluar descarte')
                     :'En rango — servir o confirmar con palpación')};})
      .sort((x,y)=>(y.dias||0)-(x.dias||0));
    /* partos recientes desde la tabla partos (vacío si no hay) */
    const GP={ternera:'Terneras',macho:'Machos'};
    _partosRaw=partos||[];
    partosRecientes=_partosRaw.map(p=>{
      const criaGrupo=p.cria_id&&porId[p.cria_id]?(GP[porId[p.cria_id].grupo]||'Terneras')
        :(p.sexo_cria==='M'?'Machos':'Terneras');
      return {madre:ref(p.madre_id),cria:p.cria_id||'—',fecha:fmtFechaCorta(p.fecha),fechaISO:p.fecha,
        sexo:p.sexo_cria,peso:p.peso_kg||0,tipo:p.tipo,
        estado:p.estado_cria,grupo:p.estado_cria==='viva'?criaGrupo:null};
    });
    actualizarAniosDisponibles();
    renderPartos();renderPartosRecientes();renderPartosKpis();renderVacias();renderPalpLista();renderReproKpis();
  }catch(e){console.warn('Reproducción: usando datos locales:',e.message||e);}
})();

/* ===== Hato: tabla con filtros funcionales ===== */
let hato=[];
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
    tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink-3)">Sin resultados'+(q?' para "'+q+'"':'')+'</td></tr>';
    return;
  }
  filtered.forEach(a=>{
    const tr=document.createElement('tr');
    tr.onclick=()=>goVaca(a.num,'pg-hato');
    tr.innerHTML='<td><div class="cell-animal"><div class="cini">'+a.num+'</div><div><div class="cn">'+a.n+'</div><div class="cs">'+a.raza+'</div></div></div></td>'+
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
const snapshotReproDB=LCRules.snapshotReproDB;   // compartido en core/rules.js
/* fecha de nacimiento: exacta si se conoce; si no, estimada desde la edad */
function fmtNacimiento(a){
  if(a&&a.nacimiento){const d=new Date(a.nacimiento+'T00:00:00');return d.getDate()+' '+LCRules.MESC[d.getMonth()]+' '+d.getFullYear();}
  if(a&&a.edadAnios!=null){const d=new Date(HOY_LC.getTime());d.setMonth(d.getMonth()-Math.round(a.edadAnios*12));return '~'+LCRules.MESC[d.getMonth()]+' '+d.getFullYear()+' (estimada)';}
  return '—';
}
const HOY_LC=new Date();   // hoy real (la base trae datos reales)
function fmtEdad(a){
  const n=a.edadAnios;if(n==null)return '—';
  const enMeses=a.grupo==='levante'||a.grupo==='ternera'||(a.grupo==='macho'&&n<1.5)||n<1;
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
  editState.nombre=a.nombre||'';editState.raza=a.raza||'';editState.color=a.color||'';editState.nota=a.nota||'';
  editState.nacimiento=a.nacimiento||'';editState.peso=(a.pesoKg!=null?a.pesoKg:'');
  editState.inicio=a.inicioLactancia||'';editState.leche=(a.leche&&a.leche.ayer!=null?a.leche.ayer:'');
  openReg('Editar datos de '+num,'La producción se calcula de los ordeños y del inicio de lactancia');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regTexto('Nombre','Nombre del animal',v=>editState.nombre=v,'text',editState.nombre));
  body.appendChild(regTexto('Raza','Ej. Holstein × Gyr',v=>editState.raza=v,'text',editState.raza));
  body.appendChild(regTexto('Color','Ej. negra, pinta roja, barcina…',v=>editState.color=v,'text',editState.color));
  body.appendChild(regTexto('Fecha de nacimiento','',v=>editState.nacimiento=v,'date',editState.nacimiento));
  body.appendChild(regTexto('Peso (kg)','',v=>editState.peso=v,'number',editState.peso));
  body.appendChild(regTexto('Inicio de lactancia (último parto)','',v=>editState.inicio=v,'date',editState.inicio));
  body.appendChild(regHint('El DEL se calcula solo desde esta fecha (hoy − inicio de lactancia).'));
  body.appendChild(regTexto('Leche de ayer (L)','registra el ordeño de ayer',v=>editState.leche=v,'number',editState.leche));
  body.appendChild(regHint('“Leche de ayer” crea un registro de ordeño; lo demás (promedios, histórico) se calcula solo.'));
  body.appendChild(regTexto('Nota 📝','Ej. patea al ordeño, propensa a mastitis…',v=>editState.nota=v,'text',editState.nota));
  document.getElementById('regSaveBtn').onclick=guardarEditarVaca;
}
function diasDesdeReal(iso){if(!iso)return null;const d=new Date(iso+'T00:00:00');return Math.max(0,Math.round((new Date()-d)/86400000));}
function isoAyerReal(){const d=new Date();d.setDate(d.getDate()-1);return isoDe(d);}
function guardarEditarVaca(){
  const num=editState.num,a=animalesPorId[num];if(!a)return;
  const nombre=(editState.nombre||'').trim()||a.nombre;
  const raza=(editState.raza||'').trim()||null;
  const color=(editState.color||'').trim()||null;
  const nota=(editState.nota||'').trim()||null;
  const nacimiento=editState.nacimiento||null;
  const peso=(editState.peso!==''&&editState.peso!=null)?parseFloat(editState.peso):null;
  const inicio=editState.inicio||null;
  const leche=(editState.leche!==''&&editState.leche!=null)?parseFloat(editState.leche):null;
  closeReg();
  /* persistir datos básicos + inicio de lactancia (fuente del DEL) */
  const campos={nombre:nombre,raza:raza,color:color,nota:nota,nacimiento:nacimiento,inicio_lactancia:inicio};
  if(peso!=null&&!isNaN(peso)){campos.peso_kg=peso;campos.fecha_peso=isoHoy();}
  /* DEL y leche se DERIVAN: actualizo la caché para reflejarlo de inmediato */
  const delCalc=inicio?diasDesdeReal(inicio):a.del;
  Object.assign(a,{nombre:nombre,raza:raza,color:color,nota:nota,nacimiento:nacimiento,inicioLactancia:inicio,del:delCalc});
  a.leche=a.leche||{};if(leche!=null&&!isNaN(leche))a.leche.ayer=leche;
  if(peso!=null&&!isNaN(peso)){a.pesoKg=peso;a.fechaPeso=isoHoy();}
  if(fichas[num]){fichas[num].n=nombre;fichas[num].raza=raza;if(peso!=null&&!isNaN(peso))fichas[num].peso=peso+' kg';}
  const h=hato.find(x=>x.num===num);if(h){h.n=nombre;h.raza=raza;h.del=(delCalc==null?'—':delCalc);if(leche!=null&&!isNaN(leche))h.ayer=leche;}
  const mEdit=milkCows.findIndex(c=>c.num===num);
  if(mEdit>=0){const prevDone=milkCows[mEdit].done,prevV=milkCows[mEdit].v;
    milkCows[mEdit]=Object.assign(animalAMilk(a),{done:prevDone,v:prevV});}
  goVaca(num,vacaFrom);renderHato();renderMilk();
  if(typeof LCStore!=='undefined'){
    LCStore.updateAnimalCampos(num,campos).catch(e=>{
      console.warn('Edición no guardada en la base:',e.message||e);
      snack('⚠ '+num+': cambios guardados local, falta sincronizar');});
    /* "leche de ayer" = registrar un ordeño real de ayer (fuente de verdad) */
    if(leche!=null&&!isNaN(leche))LCStore.registrarOrdeno(num,leche,isoAyerReal()).catch(()=>{});
  }
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
  if(fi){fi.historia.unshift({fecha:fmtFechaCorta(isoHoy()).toUpperCase()+' '+new Date().getFullYear(),texto:'Tratamiento: <b>'+tratState.problema+'</b> · '+tratState.medicina.toLowerCase(),
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
  /* secar = dejar la lactancia: se borra inicio_lactancia (de ahí sale el DEL) */
  const prevInicio=animalesPorId[secaState.num]?animalesPorId[secaState.num].inicioLactancia:null;
  a.grupo='Horra';a.del='—';a.ayer='—';a.var='—';a.vc='';
  a.repro=a.repro.replace(/<span class="sub">[^<]*<\/span>/,'').trim()+' <span class="sub">recién secada</span>';
  hatoFiltro='Horra';renderHatoFiltros();renderHato();
  go('pg-hato',navFor('pg-hato'));
  if(typeof LCStore!=='undefined'){
    LCStore.updateAnimalCampos(secaState.num,{grupo:'horra',inicio_lactancia:null}).catch(e=>{
      console.warn('Secado no guardado en la base:',e.message||e);
      snack('⚠ Secado guardado local, falta sincronizar');});
  }
  snack(nombre+' secada · sale del ordeño y pasa a horras','Deshacer',()=>{
    Object.assign(a,prev);renderHatoFiltros();renderHato();
    if(typeof LCStore!=='undefined')LCStore.updateAnimalCampos(secaState.num,
      {grupo:'ordeño',inicio_lactancia:prevInicio}).catch(()=>{});});
}

/* --- parto --- */
const partoState={};
let criaSeq=73;
function openParto(cow){
  const cands=hato.filter(a=>a.grupo==='Horra');
  if(!cands.length){snack('No hay vacas horras (preñadas próximas) para registrar parto');return;}
  partoState.num=cow?(''+cow).split('·')[0].trim():cands[0].num;
  partoState.sexo='H';partoState.tipo='normal';partoState.estado='viva';partoState.peso=38;partoState.fecha=isoHoy();
  openReg('Registrar parto','La cría entra al hato y la madre vuelve al ordeño en DEL 0');
  const body=document.getElementById('regBody');body.innerHTML='';
  body.appendChild(regLabel('Fecha del parto'));
  const fp=document.createElement('input');fp.type='date';fp.value=partoState.fecha;
  fp.style.cssText='width:100%;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-family:inherit;font-size:14px;color:var(--ink);padding:10px 12px;outline:none;margin-bottom:8px';
  fp.onchange=()=>{partoState.fecha=fp.value||isoHoy();};
  body.appendChild(fp);
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
  const fechaParto=partoState.fecha||isoHoy();
  const reciente={madre:partoState.num+' '+nombre,cria:cria?cria.num:'—',fecha:fmtFechaCorta(fechaParto),fechaISO:fechaParto,
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
          edadAnios:0,nacimiento:fechaParto,origen:'nacido_finca',madreId:partoState.num,pesoKg:partoState.peso}); })
      .then(()=>LCStore.registrarParto({id:partoId,madreId:partoState.num,criaId:criaId,fecha:fechaParto,
        sexo:partoState.sexo,pesoKg:partoState.peso,tipo:partoState.tipo,estadoCria:partoState.estado}))
      .then(()=>LCStore.updateAnimalCampos(partoState.num,{grupo:'ordeño',
        inicio_lactancia:fechaParto,
        estado_repro:null,prenez_meses:null,ultima_palpacion:null}))
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

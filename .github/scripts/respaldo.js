/* Respaldo completo de la base (paginado de a 1000, el tope de PostgREST).
 * Usa la anon key, que es pública por diseño (está en core/store.js).
 * Además de respaldar, la lectura cuenta como actividad y evita que el
 * proyecto free de Supabase se pause por inactividad. */
const URL_BASE = 'https://vjzhehvsptvakczynnyw.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqemhlaHZzcHR2YWtjenlubnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjA3MTksImV4cCI6MjA5NzY5NjcxOX0.-yNFEQsswSba5cKRfuobNoGj8kljNx2jw78owXb_kWc';
const TABLAS = ['unidades', 'potreros', 'animales', 'ordenos', 'palpaciones',
  'tratamientos', 'vacunaciones', 'vacunaciones_animales', 'partos', 'pesajes', 'movimientos_potrero', 'movimientos_grupo'];

const fs = require('fs');

async function bajarTabla(t) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(URL_BASE + '/rest/v1/' + t + '?select=*&order=created_at.asc%2Cid.asc', {
      headers: {
        apikey: ANON, Authorization: 'Bearer ' + ANON,
        Range: desde + '-' + (desde + 999), 'Range-Unit': 'items',
      },
    });
    if (r.status === 404) return filas;              // tabla aún no existe
    if (!r.ok && r.status !== 206) throw new Error(t + ': HTTP ' + r.status);
    const data = await r.json();
    filas.push(...data);
    if (data.length < 1000) return filas;
  }
}

(async () => {
  const out = { app: 'Los Chagualos', version: 2, fecha: new Date().toISOString(), tablas: {} };
  for (const t of TABLAS) {
    out.tablas[t] = await bajarTabla(t);
    console.log(t + ': ' + out.tablas[t].length + ' filas');
  }
  fs.mkdirSync('respaldo', { recursive: true });
  const nombre = 'respaldo/los-chagualos-' + out.fecha.slice(0, 10) + '.json';
  fs.writeFileSync(nombre, JSON.stringify(out, null, 1));
  console.log('OK → ' + nombre);
})().catch(e => { console.error('RESPALDO FALLÓ:', e.message); process.exit(1); });

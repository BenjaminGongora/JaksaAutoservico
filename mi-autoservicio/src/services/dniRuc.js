// src/services/dniRuc.js
const TOKEN = 'Live_e9a3ee9fc86447cf9f2a30e29b0cc3ee497a19b1';
const BASE = 'https://panel.dniruc.com/api/v2/search';

export async function consultarDni(dni) {
  if (!/^\d{8}$/.test(dni)) return null;
  const res = await fetch(`${BASE}/dni/${dni}/${TOKEN}`);
  const json = await res.json();
  if (!json.success) return null;
  return json.data; // { nombres, ap_paterno, ap_materno, fecha_nacimiento, sexo, ... }
}

export async function consultarRuc(ruc) {
  if (!/^\d{11}$/.test(ruc)) return null;
  const res = await fetch(`${BASE}/ruc/${ruc}/${TOKEN}`);
  const json = await res.json();
  if (!json.success) return null;
  return json.data; // { nombre_razon_social, direccion, ... }
}

// Convierte "05/07/2003" a "2003-07-05"
export function normalizarFecha(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  const [d, m, y] = ddmmyyyy.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Convierte "MASCULINO"/"FEMENINO" a "M"/"F"
export function normalizarSexo(sexo) {
  if (!sexo) return 'M';
  return sexo.toUpperCase().startsWith('F') ? 'F' : 'M';
}
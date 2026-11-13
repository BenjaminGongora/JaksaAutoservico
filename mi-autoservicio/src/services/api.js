const BASE_URL = 'https://www.jaksa.pe/companies-services-v2/api';

let token = null;
let tokenExpiracion = null;

// Credenciales del kiosco (las pones en un archivo .env o config)
const CREDENCIALES = {
  username: 'userJaskaTest', // cámbialo por el real
  password: 'Jaksa2026.',
};

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENCIALES),
  });
  const json = await res.json();
  if (!json.isSuccess) throw new Error(json.message);
  token = json.data.token;
  tokenExpiracion = new Date(json.data.tiempoExpiracion);
  return token;
}

async function getToken() {
  if (!token || (tokenExpiracion && new Date() >= tokenExpiracion)) {
    await login();
  }
  return token;
}

async function request(path, options = {}) {
  const t = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${t}`,
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.isSuccess) throw new Error(json.message);
  return json.data;
}

// === Endpoints ===

export const getOrigenDestino = () => request('/Route/Origen-Destino');

export const getItinerariosPorRuta = (idOrigen, idDestino, fecha) =>
  request(`/Itinerary/itinerarios-por-ruta/${idOrigen}/${idDestino}/${fecha}`, {
    method: 'GET',
  });
export const getItinerarioPorId = (id) =>
  request(`/Itinerary/itinerario/${encodeURIComponent(id)}`);

export const reservaTemporal = (payload) =>
  request('/Ticket/reserva-temporal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const extenderReserva = (idReserva, tiempoBloqueo) =>
  request('/Ticket/extender-reserva', {
    method: 'POST',
    body: JSON.stringify({ idReserva, tiempoBloqueo }),
  });

export const expirarReservaTime = (idReserva) =>
  request('/Ticket/expirar-reserva-time', {
    method: 'POST',
    body: JSON.stringify({ idReserva }),
  });

export const expirarReserva = (idReserva) =>
  request('/Ticket/expirar-reserva', {
    method: 'POST',
    body: JSON.stringify({ idReserva }),
  });

export const confirmarTicket = (idReserva) =>
  request('/Ticket/confirmar-ticket', {
    method: 'POST',
    body: JSON.stringify({ idReserva }),
  });

export const anularTicket = (numeroBoleto, motivo) =>
  request('/Ticket/anular-ticket', {
    method: 'POST',
    body: JSON.stringify({ numeroBoleto, motivo }),
  });
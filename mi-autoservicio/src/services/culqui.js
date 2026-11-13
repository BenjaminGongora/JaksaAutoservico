// src/services/culqui.js
const PAGOS_URL = import.meta.env.VITE_PAGOS_URL || 'https://jaksa.pe/JaksaCulqui';

async function pagosFetch(path, options) {
  const res = await fetch(`${PAGOS_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en el servicio de pagos');
  return data;
}

export const crearOrdenPago = (body) =>
  pagosFetch('/crear-orden', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const estadoOrdenPago = (orderId) => pagosFetch(`/estado-orden/${orderId}`);

export const simularPagoOrden = (orderId) =>
  pagosFetch('/simular-pago', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
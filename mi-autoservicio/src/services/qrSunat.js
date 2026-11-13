// src/services/qrSunat.js
import QRCode from 'qrcode';

// Mapeo de tipo de comprobante SUNAT
// 01 = Factura, 03 = Boleta, 07 = Nota Crédito, 08 = Nota Débito
function tipoComprobanteSunat(tipoComprobante) {
  const t = (tipoComprobante || '').toUpperCase();
  if (t.includes('FACTURA')) return '01';
  if (t.includes('BOLETA')) return '03';
  if (t.includes('NOTA') && t.includes('CREDITO')) return '07';
  if (t.includes('NOTA') && t.includes('DEBITO')) return '08';
  return '03'; // fallback: boleta
}

// Mapeo de tipo de documento del adquiriente
// 1 = DNI, 6 = RUC, 0 = sin documento
function tipoDocSunat(tipoDocumento) {
  const t = (tipoDocumento || '').toUpperCase();
  if (t === 'DNI') return '1';
  if (t === 'RUC') return '6';
  return '0';
}

/**
 * Genera el texto del QR SUNAT a partir del ticket de Jaksa.
 * Orden: RUC | TIPO DOC | SERIE | NUMERO | IGV | TOTAL | FECHA | TIPO DOC CLIENTE | NRO DOC CLIENTE
 */
export function construirTextoSunat(ticket, rucEmisor = '20267269565') {
  const tipo = tipoComprobanteSunat(ticket.tipoComprobante);
  const [serieRaw, numeroRaw] = (ticket.numero || '').split('-');
  const serie = serieRaw || '';
  const numero = numeroRaw || '';

  const total = Number(ticket.precio || 0).toFixed(2);
  const igv = '0.00'; // Jaksa manda IGV en 0 en boletas

  // Fecha de emisión: YYYY-MM-DD
  let fechaEmision = '';
  if (ticket.fechaVenta) {
    const d = new Date(ticket.fechaVenta);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    fechaEmision = `${yyyy}-${mm}-${dd}`;
  }

  const tipoDocCliente = tipoDocSunat(ticket.tipoDocumento);
  const nroDocCliente = ticket.documentoIdentidad || '';

  // 9 campos + pipe final
  const cadena = [
    rucEmisor,
    tipo,
    serie,
    numero,
    igv,
    total,
    fechaEmision,
    tipoDocCliente,
    nroDocCliente,
  ].join('|') + '|';

  return cadena;
}

/**
 * Genera un DataURL de la imagen QR lista para <img src>.
 */
export async function generarQrDataUrl(texto) {
  return QRCode.toDataURL(texto, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 100,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
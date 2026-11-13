// src/pages/VistaBoleto.jsx
import { useEffect, useState } from 'react';
import { construirTextoSunat, generarQrDataUrl } from '../services/qrSunat';
import './VistaBoleto.css';

function formatearFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const fecha = d.toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const hora = d.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  return `${fecha} ${hora}`;
}

export default function VistaBoleto({ ticket, contexto, factura, index }) {
  const { origen, destino } = contexto || {};
  const [qrUrl, setQrUrl] = useState(null);

  const [serie, numero] = (ticket.numero || '').split('-');

  const precio = Number(ticket.precio || 0);
  const descuento = 0;
  const total = precio - descuento;
  const igv = 0;
  const opNoGravada = total - igv;

  // Generar QR SUNAT al montar
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const texto = construirTextoSunat(ticket);
        const url = await generarQrDataUrl(texto);
        if (activo) setQrUrl(url);
      } catch (e) {
        console.error('❌ Error generando QR SUNAT:', e);
      }
    })();
    return () => { activo = false; };
  }, [ticket]);

  return (
    <article className="pos-ticket" id={`boleto-${ticket.numeroBoleto}`}>
      {/* Logo */}
      <div className="pos-ticket__logo">
                <img src="https://www.jaksa.pe/toolscliente/imagenes/logo-menu.png" height="55" alt="Jaksa"  />
      </div>

      {/* Cabecera */}
      <div className="pos-ticket__head">
        <p className="ruc">RUC: <span>20267269565</span></p>
        <p className="tel">Telf: <span>(01)428-0567</span></p>
        <p className="tel">Jr. Montevideo 529 - Cercado - Lima</p>
        <p className="doc-title">{ticket.tipoComprobante}</p>
        <p className="doc-num">
          <span>{serie || '—'}</span>-<span>{numero || '—'}</span>
        </p>
      </div>

      <div className="pos-ticket__sep">--------------------------------</div>

      {/* Datos generales */}
      <div className="pos-ticket__line">F. Impresión: <span className="value">{formatearFechaHora(ticket.fechaVenta)}</span></div>
      <div className="pos-ticket__line">RUC: <span className="value">{ticket.ruc ?? 'Ninguno'}</span></div>
      <div className="pos-ticket__line">Empresa: <span className="value">{ticket.nombreEmpresa || 'Ninguno'}</span></div>
      <div className="pos-ticket__line">{ticket.tipoDocumento}: <span className="value">{ticket.documentoIdentidad}</span></div>
      <div className="pos-ticket__line">Pasajero: <span className="value">{ticket.pasajero.trim()}</span></div>
      <div className="pos-ticket__line">Ruta: <span className="value">{origen?.nombre || '—'}</span> - <span className="value">{destino?.nombre || '—'}</span></div>
      <div className="pos-ticket__line">Servicio: <span className="value">{ticket.tipoServicio}</span></div>
      <div className="pos-ticket__line">Asiento: <span className="value">{ticket.asiento}</span></div>
      <div className="pos-ticket__line">N° Boleto: <span className="value">{ticket.numeroBoleto}</span></div>
      <div className="pos-ticket__line">Fecha Viaje: <span className="value">{formatearFechaHora(ticket.fechaViaje)}</span></div>
      <div className="pos-ticket__line">Canal Venta: <span className="value">Autoservicio Jaksa</span></div>

      <div className="pos-ticket__sep">--------------------------------</div>

      {/* Totales */}
      <div className="pos-ticket__totals">
        <div className="row">
          <span className="label">Precio:</span>
          <span className="value">S/ {precio.toFixed(2)}</span>
        </div>
        <div className="row">
          <span className="label">Op. No Gravada:</span>
          <span className="value">S/ {opNoGravada.toFixed(2)}</span>
        </div>
        <div className="row">
          <span className="label">Descuento:</span>
          <span className="value">S/ {descuento.toFixed(2)}</span>
        </div>
        <div className="row">
          <span className="label">IGV:</span>
          <span className="value">S/ {igv.toFixed(2)}</span>
        </div>
        <div className="row total">
          <span className="label">Importe Total:</span>
          <span className="value">S/ {total.toFixed(2)}</span>
        </div>
      </div>

      <div className="pos-ticket__sep">--------------------------------</div>

      {/* QR SUNAT */}
      <div className="pos-ticket__qr">
        {qrUrl ? (
          <img src={qrUrl} alt="QR SUNAT" className="pos-ticket__qr-img" />
        ) : (
          <div className="pos-ticket__qr-cuadro">QR</div>
        )}
      </div>

      {/* Pie */}
      <div className="pos-ticket__foot">
        <p>Representación Impresa de</p>
        <p>Venta Electrónica</p>
        <p>034--005--0004177/SUNAT</p>
        <p className="brand">Venta Electrónica</p>
        <p className="web">www.turismojaksa.com</p>
      </div>

      <div className="pos-ticket__sep">--------------------------------</div>

      {/* Auditoría */}
      <div className="pos-ticket__line small">V: <span className="value">{ticket.numeroBoleto}</span></div>
      <div className="pos-ticket__line small">Us: <span className="value">Autoservicio</span></div>
      <div className="pos-ticket__line small">Term: <span className="value">Kiosco 01</span></div>
    </article>
  );
}
// src/pages/Boletos.jsx
import { useEffect, useRef, useState } from 'react';
import Boton from '../components/Boton';
import Toast from '../components/Toast';
import VistaBoleto from './VistaBoleto';
import './Boletos.css';

function construirHtmlBoleto(elemento) {
  const clon = elemento.cloneNode(true);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: 75mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #000;
          }
          .pos-ticket { width: 75mm; padding: 5mm; }
          .pos-ticket__logo { text-align: center; margin-bottom: 4px; }
          .pos-ticket__logo img { max-width: 45mm; max-height: 16mm; }
          .pos-ticket__head { text-align: center; }
          .pos-ticket__head p { margin: 0; font-size: 10px; }
          .pos-ticket__head .doc-title { font-weight: 800; font-size: 12px; margin-top: 6px; }
          .pos-ticket__head .doc-num { font-weight: 800; font-size: 12px; }
          .pos-ticket__sep { text-align: center; font-size: 10px; margin: 3px 0; letter-spacing: 1px; overflow: hidden; white-space: nowrap; }
          .pos-ticket__line { font-size: 11px; }
          .pos-ticket__line .value { font-weight: 700; }
          .pos-ticket__line.small { font-size: 10px; }
          .pos-ticket__totals .row { display: flex; justify-content: space-between; }
          .pos-ticket__totals .row.total { font-weight: 900; font-size: 12px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #000; }
          .pos-ticket__qr { text-align: center; padding: 4px 0; }
          .pos-ticket__qr-cuadro { width: 30mm; height: 30mm; margin: 0 auto; border: 1px dashed #000; display: flex; align-items: center; justify-content: center; font-weight: 800; }
          .pos-ticket__foot { text-align: center; font-size: 10px; }
          .pos-ticket__foot p { margin: 0; }
          .pos-ticket__foot .brand { font-weight: 900; font-size: 11px; }
          .pos-ticket__foot .web { text-decoration: underline; }
        </style>
      </head>
      <body>${clon.outerHTML}</body>
    </html>
  `;
}

export default function Boletos({ tickets, contexto, factura, onNuevaVenta }) {
  const impresionHecha = useRef(false);
  const [errorImpresion, setErrorImpresion] = useState(null);
  const ticketsFallidosRef = useRef([]);

  const imprimirTicket = async (t) => {
    const el = document.getElementById(`boleto-${t.numeroBoleto}`);
    if (!el) return { ok: false, motivo: 'No se encontró el boleto en pantalla' };

    const html = construirHtmlBoleto(el);

    if (window.electronAPI?.imprimirBoleto) {
      try {
        const r = await window.electronAPI.imprimirBoleto(html);
        if (r?.success === true) return { ok: true };
        return {
          ok: false,
          motivo: r?.error || 'Error desconocido de impresión',
        };
      } catch (e) {
        return { ok: false, motivo: e.message || 'Error de impresión' };
      }
    }
    window.print();
    return { ok: true };
  };

  const imprimirTodos = async (lista = tickets) => {
    const fallidos = [];
    let ultimoMotivo = null;

    for (const t of lista) {
      const res = await imprimirTicket(t);
      if (!res.ok) {
        fallidos.push(t);
        ultimoMotivo = res.motivo;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    ticketsFallidosRef.current = fallidos;

    if (fallidos.length > 0) {
      const mensaje =
        fallidos.length === lista.length
          ? `No se pudo imprimir. ${ultimoMotivo || 'Revisa la impresora.'}`
          : `No se pudieron imprimir ${fallidos.length} de ${lista.length} boletos. ${ultimoMotivo || ''}`;
      setErrorImpresion(mensaje);
    } else {
      setErrorImpresion(null);
    }
  };

  useEffect(() => {
    if (impresionHecha.current) return;
    if (!tickets || tickets.length === 0) return;
    impresionHecha.current = true;

    // SIN clearTimeout: no cancelar al desmontar por StrictMode
    setTimeout(() => imprimirTodos(tickets), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reintentarImpresion = () => {
    const fallidos = ticketsFallidosRef.current;
    if (fallidos.length > 0) {
      setErrorImpresion(null);
      imprimirTodos(fallidos);
    }
  };

  return (
    <div className="pagina boletos">
      <header className="boletos__header">
        <div className="boletos__header-info">
          <h1 className="boletos__titulo">🎉 ¡Listo! Aquí están tus boletos</h1>
          <p className="boletos__sub">
            {contexto?.origen?.nombre} → {contexto?.destino?.nombre} ·{' '}
            {tickets.length} {tickets.length === 1 ? 'pasajero' : 'pasajeros'}
          </p>
        </div>
        <span className="boletos__paso">Paso 5 de 5</span>
      </header>

      <main className="boletos__contenido">
        <div className="boletos__lista">
          {tickets.map((t, idx) => (
            <VistaBoleto
              key={t.numeroBoleto}
              ticket={t}
              contexto={contexto}
              factura={factura}
              index={idx}
            />
          ))}
        </div>
      </main>

      <footer className="boletos__footer">
        <Boton tamano="grande" icono="✨" onClick={onNuevaVenta}>
          Nueva venta
        </Boton>
      </footer>

      {errorImpresion && (
        <Toast
          mensaje={errorImpresion}
          onCerrar={() => setErrorImpresion(null)}
          onAccion={reintentarImpresion}
          textoAccion="Reintentar impresión"
          duracionMs={0} // no auto-cerrar: el usuario decide
        />
      )}
    </div>
  );
}
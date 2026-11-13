// src/pages/PagoQRModal.jsx
import { useEffect, useRef, useState } from 'react';
import Boton from '../components/Boton';
import { crearOrdenPago, estadoOrdenPago, simularPagoOrden } from '../services/culqui';
import { expirarReserva } from '../services/api';
import './PagoQRModal.css';

const ES_PRUEBAS = true; // muestra el botón de simulación

export default function PagoQRModal({ reserva, total, onPagado, onCerrar, onExpirado }) {
  const { idReserva, fechaExpiracion } = reserva;

  const [orden, setOrden] = useState(null);
  const [estado, setEstado] = useState('creando'); // creando | esperando | confirmando | error
  const [error, setError] = useState(null);
  const [segundos, setSegundos] = useState(0);

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const creadaRef = useRef(false);

  // 1) Crear la orden
  useEffect(() => {
    if (creadaRef.current) return;
    creadaRef.current = true;
    (async () => {
      try {
        const data = await crearOrdenPago({
          idReserva,
          monto: total,
          expiracion: Math.floor(new Date(fechaExpiracion).getTime() / 1000),
        });
        setOrden(data);
        setEstado('esperando');
      } catch (e) {
        setError(e.message);
        setEstado('error');
      }
    })();
  }, []);

  // 2) Polling del estado
  useEffect(() => {
    if (!orden) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await estadoOrdenPago(orden.orderId);
        if (r.estado === 'confirmando') setEstado('confirmando');
        if (r.estado === 'confirmado') {
          clearInterval(pollRef.current);
          onPagado(r.tickets);
        }
        if (r.estado === 'error_confirmacion') {
          clearInterval(pollRef.current);
          setError(r.error || 'Pago recibido pero no se pudo emitir el boleto. Contacta al personal.');
          setEstado('error');
        }
      } catch (e) {
        console.warn('Polling falló:', e.message);
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [orden]);

  // 3) Countdown local + expiración
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const restantes = Math.max(0, Math.floor((new Date(fechaExpiracion) - new Date()) / 1000));
      setSegundos(restantes);
      if (restantes === 0 && estado === 'esperando') {
        clearInterval(pollRef.current);
        setError('La reserva expiró. Vuelve a elegir tus asientos.');
        setEstado('error');
        onExpirado?.();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [fechaExpiracion, estado]);

  const cerrar = async () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    // Si el usuario cancela, expiramos la reserva en Jaksa
    try { await expirarReserva(idReserva); } catch {}
    onCerrar();
  };

  const formatearMMSS = (seg) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const urgente = segundos <= 120;

  return (
    <div className="modal-pago__overlay" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="modal-pago__caja">
        <button className="modal-pago__cerrar" onClick={cerrar} aria-label="Cerrar">✕</button>

        <header className="modal-pago__header">
          <h2 className="modal-pago__titulo">Paga con Yape / Plin</h2>
          <p className="modal-pago__sub">Escanea el QR con tu app y confirma</p>
        </header>

        <div className={`modal-pago__countdown ${urgente ? 'modal-pago__countdown--urgente' : ''}`}>
          <span>⏳ Tiempo para pagar</span>
          <strong>{formatearMMSS(segundos)}</strong>
        </div>

        <div className="modal-pago__cuerpo">
          {estado === 'creando' && (
            <div className="modal-pago__estado">
              <span className="modal-pago__spinner" />
              <p>Generando el QR de pago...</p>
            </div>
          )}

          {estado === 'esperando' && orden && (
            <>
              <div className="modal-pago__qr-wrapper">
                <img className="modal-pago__qr" src={orden.qrUrl} alt="QR de pago" />
              </div>
              <p className="modal-pago__monto">S/ {total.toFixed(2)}</p>
              <p className="modal-pago__ayuda">
                1. Abre Yape o Plin<br />
                2. Escanea el QR<br />
                3. Confirma el monto
              </p>
              {ES_PRUEBAS && (
                <Boton variante="secundario" tamano="mediano" onClick={() => simularPagoOrden(orden.orderId)}>
                  ⚡ Simular pago (pruebas)
                </Boton>
              )}
            </>
          )}

          {estado === 'confirmando' && (
            <div className="modal-pago__estado">
              <span className="modal-pago__spinner" />
              <p>¡Pago recibido! Emitiendo tus boletos...</p>
            </div>
          )}

          {estado === 'error' && (
            <div className="modal-pago__error">
              <span className="modal-pago__error-icono">⚠️</span>
              <p>{error}</p>
            </div>
          )}
        </div>

        {estado !== 'confirmando' && (
          <Boton variante="peligro" tamano="mediano" onClick={cerrar}>
            Cancelar pago
          </Boton>
        )}
      </div>
    </div>
  );
}
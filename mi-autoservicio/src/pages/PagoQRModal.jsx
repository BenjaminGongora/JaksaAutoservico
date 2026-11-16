// src/pages/PagoQRModal.jsx
import { useEffect, useRef, useState } from 'react';
import Boton from '../components/Boton';
import ErrorModal from '../components/ErrorModal';
import { crearOrdenPago, estadoOrdenPago, simularPagoOrden } from '../services/culqui';
import { expirarReserva } from '../services/api';
import { normalizarError } from '../services/errores';
import './PagoQRModal.css';

const ES_PRUEBAS = true;
const MAX_FALLOS_POLLING = 3;

export default function PagoQRModal({ reserva, total, onPagado, onCerrar, onExpirado }) {
  const { idReserva, fechaExpiracion } = reserva;

  const [orden, setOrden] = useState(null);
  const [estado, setEstado] = useState('creando'); // creando | esperando | confirmando | error
  const [errorModal, setErrorModal] = useState(null);
  const [segundos, setSegundos] = useState(0);

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const creadaRef = useRef(false);
  const fallosPollingRef = useRef(0);

  // 1) Crear la orden
  useEffect(() => {
    if (creadaRef.current) return;
    creadaRef.current = true;
    crearOrden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crearOrden = async () => {
    setErrorModal(null);
    setEstado('creando');
    try {
      const data = await crearOrdenPago({
        idReserva,
        monto: total,
        expiracion: Math.floor(new Date(fechaExpiracion).getTime() / 1000),
      });
      setOrden(data);
      setEstado('esperando');
    } catch (e) {
      setErrorModal(normalizarError(e));
      setEstado('error');
    }
  };

  // 2) Polling
  useEffect(() => {
    if (!orden || estado !== 'esperando') return;

    pollRef.current = setInterval(async () => {
      try {
        const r = await estadoOrdenPago(orden.orderId);
        fallosPollingRef.current = 0; // resetear contador si responde

        if (r.estado === 'confirmando') setEstado('confirmando');
        if (r.estado === 'confirmado') {
          clearInterval(pollRef.current);
          onPagado(r.tickets);
        }
        if (r.estado === 'error_confirmacion') {
          clearInterval(pollRef.current);
          setEstado('error');
          setErrorModal({
            tipo: 'servidor',
            mensaje:
              r.error ||
              'Pago recibido, pero no se pudo emitir el boleto. Llama al personal del kiosco.',
            reintentable: true,
            detalle: r.error || 'error_confirmacion',
          });
        }
      } catch (e) {
        fallosPollingRef.current += 1;
        console.warn(
          `Polling falló (${fallosPollingRef.current}/${MAX_FALLOS_POLLING}):`,
          e.message
        );
        if (fallosPollingRef.current >= MAX_FALLOS_POLLING) {
          clearInterval(pollRef.current);
          setEstado('error');
          setErrorModal(normalizarError(e));
        }
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [orden, estado]);

  // 3) Countdown local + expiración
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const restantes = Math.max(
        0,
        Math.floor((new Date(fechaExpiracion) - new Date()) / 1000)
      );
      setSegundos(restantes);
      if (restantes === 0 && estado === 'esperando') {
        clearInterval(pollRef.current);
        setEstado('error');
        setErrorModal({
          tipo: 'conflicto',
          mensaje: 'La reserva expiró. Vuelve a elegir tus asientos.',
          reintentable: false,
          detalle: 'reserva_expirada',
        });
        onExpirado?.();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [fechaExpiracion, estado]);

  const cerrar = async () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    try { await expirarReserva(idReserva); } catch {}
    onCerrar();
  };

  // --- Acciones del ErrorModal ---
  const reintentar = () => {
    fallosPollingRef.current = 0;
    if (!orden) {
      // Falló la creación → reintentar creación
      crearOrden();
    } else {
      // Falló el polling → reanudar
      setErrorModal(null);
      setEstado('esperando');
    }
  };

  const volver = async () => {
    setErrorModal(null);
    await cerrar();
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
        </div>

        {estado !== 'confirmando' && (
          <Boton variante="peligro" tamano="mediano" onClick={cerrar}>
            Cancelar pago
          </Boton>
        )}
      </div>

      <ErrorModal
        error={errorModal}
        onReintentar={reintentar}
        onVolver={volver}
        textoVolver="Volver a pasajeros"
      />
    </div>
  );
}
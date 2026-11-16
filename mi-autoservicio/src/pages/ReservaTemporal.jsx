// src/pages/ReservaTemporal.jsx
import { useEffect, useRef, useState } from 'react';
import Boton from '../components/Boton';
import ErrorModal from '../components/ErrorModal';
import { reservaTemporal, extenderReserva, expirarReserva } from '../services/api';
import { normalizarError } from '../services/errores';
import PagoQRModal from './PagoQRModal';
import './ReservaTemporal.css';

const TIEMPO_INICIAL_MIN = 5;
const TIEMPO_EXTENDER_MIN = 1;

const KIOSCO = {
  telefono: '923253580',
  email: 'benjaminandresgongora@gmail.com',
};

function segundosRestantes(fechaExpiracion) {
  if (!fechaExpiracion) return 0;
  return Math.max(0, Math.floor((new Date(fechaExpiracion) - new Date()) / 1000));
}

function formatearMMSS(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Payload extraído: una sola fuente de verdad para POST inicial y reintento
function construirPayload(itinerario, pasajeros, factura) {
  return {
    idItinerario: itinerario.id,
    tiempoBloqueo: TIEMPO_INICIAL_MIN,
    telefono: KIOSCO.telefono,
    email: KIOSCO.email,
    pasajeros: pasajeros.map(p => ({
      asiento: p.asiento,
      nombres: p.nombres,
      apellidos: p.apellidos,
      tipoDocumento: p.tipoDocumento,
      documentoIdentidad: p.documentoIdentidad,
      sexo: p.sexo,
      fechaNacimiento: p.fechaNacimiento,
      descuento: p.descuento || 0,
    })),
    puntoEmbarque: itinerario.puntosEmbarque?.[0]?.terminal?.id || 0,
    puntoDesembarque: itinerario.puntosDesembarque?.[0]?.terminal?.id || 0,
    ...(factura ? { factura } : {}),
  };
}

export default function ReservaTemporal({ datos, onPagar, onCancelar, onVolver }) {
  const { itinerario, contexto, pasajeros, factura } = datos;

  const [idReserva, setIdReserva] = useState(null);
  const [fechaExpiracion, setFechaExpiracion] = useState(null);
  const [segundos, setSegundos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [extendiendo, setExtendiendo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [expirada, setExpirada] = useState(false);

  const [mostrarPago, setMostrarPago] = useState(false);
  const [ticketsPagados, setTicketsPagados] = useState(null);

  const intervalRef = useRef(null);
  const canceladaRef = useRef(false);
  const creandoRef = useRef(false);

  const total = pasajeros.reduce((s, p) => s + (p.precio || 0), 0);

  // 1) Crear reserva (una sola vez)
  useEffect(() => {
    if (creandoRef.current) return;
    creandoRef.current = true;

    (async () => {
      try {
        const data = await reservaTemporal(construirPayload(itinerario, pasajeros, factura));
        setIdReserva(data.idReserva);
        setFechaExpiracion(data.fechaHoraExpiracion);
        setSegundos(segundosRestantes(data.fechaHoraExpiracion));
        setCargando(false);
      } catch (e) {
        setErrorModal(normalizarError(e));
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Countdown
  useEffect(() => {
    if (!fechaExpiracion) return;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const restantes = segundosRestantes(fechaExpiracion);
      setSegundos(restantes);
      if (restantes <= 0) {
        setExpirada(true);
        clearInterval(intervalRef.current);
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [fechaExpiracion]);

  // 3) Extender
  const extender = async () => {
    if (!idReserva || extendiendo) return;
    setExtendiendo(true);
    try {
      const data = await extenderReserva(idReserva, TIEMPO_EXTENDER_MIN);
      setFechaExpiracion(data.fechaHoraExpiracion);
      setSegundos(segundosRestantes(data.fechaHoraExpiracion));
      setExpirada(false);
    } catch (e) {
      setErrorModal(normalizarError(e));
    } finally {
      setExtendiendo(false);
    }
  };

  // 4) Cancelar (libera asientos) y salir
  const cancelarYSalir = async (destino) => {
    if (canceladaRef.current) return;
    if (!idReserva) { destino(); return; }
    if (cancelando) return;

    setCancelando(true);
    try {
      await expirarReserva(idReserva);
      canceladaRef.current = true;
    } catch (e) {
      console.warn('No se pudo expirar la reserva:', e.message);
    } finally {
      setCancelando(false);
      destino();
    }
  };

  const handleVolver = () => cancelarYSalir(onVolver);
  const handleCancelar = () => cancelarYSalir(onCancelar);

  // 5) Pagar
  const handlePagar = () => {
    if (expirada) return;
    setMostrarPago(true);
  };

  const handlePagoExitoso = (tickets) => {
    setTicketsPagados(tickets);
    setMostrarPago(false);
    onPagar({ idReserva, fechaExpiracion, tickets });
  };

  const handleCerrarModal = () => {
    setMostrarPago(false);
    onVolver();
  };

  // --- Acciones del ErrorModal ---
  const reintentarCreacion = async () => {
    setErrorModal(null);
    setCargando(true);
    try {
      const data = await reservaTemporal(construirPayload(itinerario, pasajeros, factura));
      setIdReserva(data.idReserva);
      setFechaExpiracion(data.fechaHoraExpiracion);
      setSegundos(segundosRestantes(data.fechaHoraExpiracion));
    } catch (e) {
      setErrorModal(normalizarError(e));
    } finally {
      setCargando(false);
    }
  };

  const volverAlInicioDesdeError = () => {
    setErrorModal(null);
    // Si ya hay reserva, expirarla antes de salir (evita asientos colgados)
    if (idReserva) cancelarYSalir(onCancelar);
    else onCancelar();
  };

  const totalSegundos = TIEMPO_INICIAL_MIN * 60;
  const porcentaje = Math.min(100, Math.max(0, (segundos / totalSegundos) * 100));
  const urgente = segundos <= 120;

  return (
    <div className="pagina reserva">
      <header className="reserva__header">
        <button
          className="reserva__volver"
          onClick={handleVolver}
          disabled={cancelando || cargando}
        >
          ← Atrás
        </button>
        <div className="reserva__info">
          <h2 className="reserva__titulo">Confirma tu reserva</h2>
          <p className="reserva__sub">
            {itinerario?.nombre} · {contexto?.origen?.nombre} → {contexto?.destino?.nombre}
          </p>
        </div>
        <span className="reserva__paso">Paso 4 de 5</span>
      </header>

      <main className="reserva__contenido">
        {cargando && (
          <div className="reserva__cargando">
            <span className="reserva__spinner" />
            <p>Reservando tus asientos...</p>
          </div>
        )}

        {!cargando && !errorModal && (
          <>
            <div className={`reserva__countdown ${urgente ? 'reserva__countdown--urgente' : ''} ${expirada ? 'reserva__countdown--expirada' : ''}`}>
              <div className="reserva__countdown-header">
                <span className="reserva__countdown-label">
                  {expirada ? '⏰ Reserva expirada' : '⏳ Tiempo restante'}
                </span>
                <span className="reserva__countdown-tiempo">
                  {formatearMMSS(segundos)}
                </span>
              </div>
              <div className="reserva__barra">
                <div
                  className="reserva__barra-progreso"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <p className="reserva__countdown-ayuda">
                {expirada
                  ? 'Tu reserva se venció. Vuelve a elegir tus asientos.'
                  : 'Si el tiempo termina, los asientos se liberarán automáticamente.'}
              </p>
            </div>

            <div className="reserva__resumen">
              <h3 className="reserva__resumen-titulo">🧾 Resumen</h3>
              <div className="reserva__lista">
                {pasajeros.map((p, idx) => (
                  <div key={p.id || idx} className="reserva__pasajero">
                    <div className="reserva__pasajero-info">
                      <span className="reserva__pasajero-nombre">
                        {p.nombres} {p.apellidos}
                      </span>
                      <span className="reserva__pasajero-doc">
                        {p.tipoDocumento} {p.documentoIdentidad}
                      </span>
                    </div>
                    <span className="reserva__pasajero-asiento">
                      Asiento #{p.asiento}
                    </span>
                    <span className="reserva__pasajero-precio">
                      S/ {p.precio.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="reserva__total">
                <span>Total</span>
                <span className="reserva__total-valor">
                  S/ {total.toFixed(2)}
                </span>
              </div>
              {factura && (
                <div className="reserva__factura">
                  <span className="reserva__factura-label">Factura a:</span>
                  <span className="reserva__factura-nombre">{factura.nombreEmpresa}</span>
                  <span className="reserva__factura-ruc">RUC {factura.idEmpresa}</span>
                </div>
              )}
            </div>

            <div className="reserva__acciones">
              <Boton
                variante="secundario"
                tamano="mediano"
                icono="⏱️"
                onClick={extender}
                disabled={extendiendo || expirada}
              >
                {extendiendo ? 'Extendiendo...' : `Extender +${TIEMPO_EXTENDER_MIN} min`}
              </Boton>
              <Boton
                variante="peligro"
                tamano="mediano"
                icono="✕"
                onClick={handleCancelar}
                disabled={cancelando || expirada}
              >
                {cancelando ? 'Cancelando...' : 'Cancelar reserva'}
              </Boton>
            </div>

            <Boton
              tamano="grande"
              icono="💳"
              onClick={handlePagar}
              disabled={expirada || cancelando}
            >
              Pagar ahora
            </Boton>
          </>
        )}
      </main>

      {mostrarPago && !ticketsPagados && (
        <PagoQRModal
          reserva={{ idReserva, fechaExpiracion }}
          total={total}
          onPagado={handlePagoExitoso}
          onCerrar={handleCerrarModal}
          onExpirado={() => setExpirada(true)}
        />
      )}

      <ErrorModal
        error={errorModal}
        onReintentar={reintentarCreacion}
        onVolver={volverAlInicioDesdeError}
        textoVolver="Volver a itinerarios"
      />
    </div>
  );
}
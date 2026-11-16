// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import Bienvenida from './pages/Bienvenida';
import SeleccionRuta from './pages/SeleccionRuta';
import ListaItinerarios from './pages/ListaItinerarios';
import PasajerosAsientos from './pages/PasajerosAsientos';
import ReservaTemporal from './pages/ReservaTemporal';
import Boletos from './pages/Boletos';
import PanelAdmin from './components/PanelAdmin';
import './styles/global.css';

const TIEMPO_INACTIVIDAD_MS = 60_000;
const TIEMPO_INACTIVIDAD_BOLETOS_MS = 180_000;
const PASOS_SIN_RESET = ['reserva'];

export default function App() {
  const [paso, setPaso] = useState('bienvenida');
  const [itinerarios, setItinerarios] = useState([]);
  const [contexto, setContexto] = useState(null);
  const [itinerarioElegido, setItinerarioElegido] = useState(null);
  const [datosReserva, setDatosReserva] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [ultimoTicket, setUltimoTicket] = useState(null);
  const [panelAdminAbierto, setPanelAdminAbierto] = useState(false);

  const timerRef = useRef(null);

  const resetear = useCallback(() => {
    setPaso('bienvenida');
    setItinerarios([]);
    setContexto(null);
    setItinerarioElegido(null);
    setDatosReserva(null);
    setTickets(null);
    // ultimoTicket se preserva para reimpresión
  }, []);

  // Auto-reset por inactividad
  useEffect(() => {
    const limpiarTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (PASOS_SIN_RESET.includes(paso) || panelAdminAbierto) {
      limpiarTimer();
      return;
    }

    const tiempo =
      paso === 'boletos' ? TIEMPO_INACTIVIDAD_BOLETOS_MS : TIEMPO_INACTIVIDAD_MS;

    const programarReset = () => {
      limpiarTimer();
      timerRef.current = setTimeout(() => {
        console.log('⏱️ Auto-reset por inactividad');
        resetear();
      }, tiempo);
    };

    const alInteractuar = () => programarReset();

    const eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    eventos.forEach((ev) => window.addEventListener(ev, alInteractuar, { passive: true }));

    programarReset();

    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, alInteractuar));
      limpiarTimer();
    };
  }, [paso, resetear, panelAdminAbierto]);

  return (
    <>
      {paso === 'bienvenida' && (
        <Bienvenida
          onComenzar={() => setPaso('ruta')}
          onAdmin={() => setPanelAdminAbierto(true)}
        />
      )}

      {paso === 'ruta' && (
        <SeleccionRuta
          onVolver={() => setPaso('bienvenida')}
          onItinerarios={(data, ctx) => {
            setItinerarios(data);
            setContexto(ctx);
            setPaso('lista');
          }}
        />
      )}

      {paso === 'lista' && (
        <ListaItinerarios
          itinerarios={itinerarios}
          contexto={contexto}
          onVolver={() => setPaso('ruta')}
          onElegir={(it, ctx) => {
            setItinerarioElegido(it);
            setContexto(ctx);
            setPaso('pasajeros');
          }}
        />
      )}

      {paso === 'pasajeros' && (
        <PasajerosAsientos
          key={itinerarioElegido?.id}
          itinerario={itinerarioElegido}
          contexto={contexto}
          onVolver={() => setPaso('lista')}
          onContinuar={(datos) => {
            setDatosReserva(datos);
            setPaso('reserva');
          }}
        />
      )}

      {paso === 'reserva' && datosReserva && (
        <ReservaTemporal
          key={
            datosReserva.itinerario?.id +
            '-' +
            (datosReserva.pasajeros?.[0]?.documentoIdentidad || '')
          }
          datos={datosReserva}
          onVolver={() => setPaso('pasajeros')}
          onCancelar={() => {
            setDatosReserva(null);
            setPaso('lista');
          }}
          onPagar={(info) => {
            setTickets(info.tickets);
            setUltimoTicket(info.tickets?.[0] || null);
            setPaso('boletos');
          }}
        />
      )}

      {paso === 'boletos' && tickets && (
        <Boletos
          tickets={tickets}
          contexto={contexto}
          onNuevaVenta={resetear}
        />
      )}

      {panelAdminAbierto && (
        <PanelAdmin
          onCerrar={() => setPanelAdminAbierto(false)}
          ultimoTicket={ultimoTicket}
        />
      )}
    </>
  );
}
// src/App.jsx
import { useState } from 'react';
import Bienvenida from './pages/Bienvenida';
import SeleccionRuta from './pages/SeleccionRuta';
import ListaItinerarios from './pages/ListaItinerarios';
import PasajerosAsientos from './pages/PasajerosAsientos';
import ReservaTemporal from './pages/ReservaTemporal';
import Boletos from './pages/Boletos';
import './styles/global.css';

export default function App() {
  const [paso, setPaso] = useState('bienvenida');
  const [itinerarios, setItinerarios] = useState([]);
  const [contexto, setContexto] = useState(null);
  const [itinerarioElegido, setItinerarioElegido] = useState(null);
  const [datosReserva, setDatosReserva] = useState(null);
  const [tickets, setTickets] = useState(null);

  const resetear = () => {
    setPaso('bienvenida');
    setItinerarios([]);
    setContexto(null);
    setItinerarioElegido(null);
    setDatosReserva(null);
    setTickets(null);
  };

  return (
    <>
      {paso === 'bienvenida' && (
        <Bienvenida onComenzar={() => setPaso('ruta')} />
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
          // 🔑 key fuerza el remontaje si cambia el itinerario
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
          key={datosReserva.itinerario?.id + '-' + (datosReserva.pasajeros?.[0]?.documentoIdentidad || '')}
          datos={datosReserva}
          onVolver={() => setPaso('pasajeros')}
          onCancelar={() => {
            setDatosReserva(null);
            setPaso('lista');
          }}
          onPagar={(info) => {
            setTickets(info.tickets);
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
    </>
  );
}
// src/pages/ListaItinerarios.jsx
import { useMemo } from 'react';
import Boton from '../components/Boton';
import './ListaItinerarios.css';

function formatearHora(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function duracion(salida, llegada) {
  if (!salida || !llegada) return '';
  const ms = new Date(llegada) - new Date(salida);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function contarDisponibles(asientos = []) {
  return asientos.filter(a => a.estado === 'disponible').length;
}

export default function ListaItinerarios({ itinerarios, contexto, onElegir, onVolver }) {
  const { origen, destino, fecha } = contexto || {};

  // Ordenar por hora de salida
  const ordenados = useMemo(() => {
    return [...(itinerarios || [])].sort((a, b) => {
      const ha = a.puntosEmbarque?.[0]?.fechaHoraPartida || '';
      const hb = b.puntosEmbarque?.[0]?.fechaHoraPartida || '';
      return ha.localeCompare(hb);
    });
  }, [itinerarios]);

  // Asegúrate de que 'fecha' sea la cadena original:
// "Mon Nov 02 2026 14:21:41 GMT-0500 (hora estándar de Perú)"

const objetoFecha = fecha ? new Date(fecha) : null;

// 1. Fecha bonita: "lunes, 2 de noviembre"
const fechaBonita = objetoFecha
  ? objetoFecha.toLocaleDateString('es-PE', {
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
    })
  : '';


console.log('ListaItinerarios.jsx - fechaBonita:', fechaBonita);
// console.log('ListaItinerarios.jsx - fecha:', fecha);

  return (
    <div className="pagina lista">
      <header className="lista__header">
        <button className="lista__volver" onClick={onVolver}>← Atrás</button>
        <div className="lista__ruta-info">
          <h2 className="lista__titulo">
            {origen?.nombre} <span className="lista__flecha">→</span> {destino?.nombre}
          </h2>
          <p className="lista__fecha">{fechaBonita}</p>
        </div>
        <span className="lista__paso">Paso 2 de 4</span>
      </header>

      <main className="lista__contenido">
        {ordenados.length === 0 && (
          <div className="lista__vacio">
            <span className="lista__vacio-icono">😕</span>
            <h3>No hay viajes disponibles</h3>
            <p>Prueba con otra fecha u otro destino.</p>
            <Boton variante="secundario" tamano="mediano" onClick={onVolver}>
              Volver a buscar
            </Boton>
          </div>
        )}

        {ordenados.map(it => {
          const salida = it.puntosEmbarque?.[0]?.fechaHoraPartida;
          const llegada = it.puntosDesembarque?.[0]?.fechaHoraLlegada;
          const disponibles = contarDisponibles(it.asientos);
          const precio = it.asientos?.find(a => a.precio)?.precio || 0;
          const sinAsientos = disponibles === 0;

          return (
            <article key={it.id} className="tarjeta-it">
              <div className="tarjeta-it__servicio">
                <span className="tarjeta-it__nombre">{it.nombre}</span>
                <span className="tarjeta-it__badge">🚌 Bus directo</span>
              </div>

              <div className="tarjeta-it__horarios">
                <div className="tarjeta-it__hora-bloque">
                  <span className="tarjeta-it__hora">{formatearHora(salida)}</span>
                  <span className="tarjeta-it__lugar">{origen?.nombre}</span>
                </div>

                <div className="tarjeta-it__trayecto">
                  <span className="tarjeta-it__duracion">{duracion(salida, llegada)}</span>
                  <div className="tarjeta-it__linea">
                    <span className="tarjeta-it__punto" />
                    <span className="tarjeta-it__barra" />
                    <span className="tarjeta-it__punto" />
                  </div>
                </div>

                <div className="tarjeta-it__hora-bloque tarjeta-it__hora-bloque--derecha">
                  <span className="tarjeta-it__hora">{formatearHora(llegada)}</span>
                  <span className="tarjeta-it__lugar">{destino?.nombre}</span>
                </div>
              </div>

              <div className="tarjeta-it__pie">
                <div className="tarjeta-it__detalles">
                  <span className="tarjeta-it__precio">S/ {precio.toFixed(2)}</span>
                  <span className={`tarjeta-it__asientos ${sinAsientos ? 'tarjeta-it__asientos--agotado' : ''}`}>
                    {sinAsientos ? 'Sin asientos' : `${disponibles} asientos libres`}
                  </span>
                </div>
                <Boton
                  tamano="mediano"
                  icono="🪑"
                  onClick={() => onElegir(it, { origen, destino, fecha })}
                  disabled={sinAsientos}
                >
                  Elegir asientos
                </Boton>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
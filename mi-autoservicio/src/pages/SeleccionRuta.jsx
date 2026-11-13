// src/pages/SeleccionRuta.jsx
import { useEffect, useMemo, useState } from 'react';
import Boton from '../components/Boton';
import { getOrigenDestino, getItinerariosPorRuta } from '../services/api';
import './SeleccionRuta.css';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function proximosDias(cantidad = 7) {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    return d;
  });
}

function formatearFecha(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function SeleccionRuta({ onVolver, onItinerarios }) {
  const [rutas, setRutas] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [fecha, setFecha] = useState(proximosDias()[0]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Cargar rutas al montar
  useEffect(() => {
    (async () => {
      try {
        const data = await getOrigenDestino();
        setRutas(data);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  // Orígenes únicos
  const origenes = useMemo(() => {
    const map = new Map();
    rutas.forEach(r => map.set(r.origen.id, r.origen));
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rutas]);

  // Destinos posibles según el origen
  const destinos = useMemo(() => {
    if (!origen) return [];
    return rutas
      .filter(r => r.origen.id === origen.id)
      .map(r => r.destino)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rutas, origen]);

  const buscar = async () => {
    if (!origen || !destino) return;
    setCargando(true);
    setError(null);
    try {
      const data = await getItinerariosPorRuta(origen.id, destino.id, formatearFecha(fecha));
      onItinerarios?.(data, { origen, destino, fecha });
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="pagina ruta">
      <header className="ruta__header">
        <button className="ruta__volver" onClick={onVolver}>← Atrás</button>
        <h2 className="ruta__titulo">¿A dónde quieres ir?</h2>
        <span className="ruta__paso">Paso 1 de 4</span>
      </header>

      <main className="ruta__contenido">
        {error && <div className="ruta__error">⚠️ {error}</div>}

        {/* Origen */}
        <section className="ruta__seccion">
          <h3 className="ruta__seccion-titulo">🟢 Desde</h3>
          <div className="ruta__opciones">
            {origenes.map(o => (
              <button
                key={o.id}
                className={`ruta__opcion ${origen?.id === o.id ? 'ruta__opcion--activa' : ''}`}
                onClick={() => { setOrigen(o); setDestino(null); }}
              >
                {o.nombre}
              </button>
            ))}
          </div>
        </section>

        {/* Destino */}
        <section className="ruta__seccion">
          <h3 className="ruta__seccion-titulo">🔵 Hacia</h3>
          {!origen && <p className="ruta__pista">Primero elige tu punto de partida</p>}
          {origen && destinos.length === 0 && <p className="ruta__pista">No hay destinos disponibles</p>}
          <div className="ruta__opciones">
            {destinos.map(d => (
              <button
                key={d.id}
                className={`ruta__opcion ${destino?.id === d.id ? 'ruta__opcion--activa' : ''}`}
                onClick={() => setDestino(d)}
              >
                {d.nombre}
              </button>
            ))}
          </div>
        </section>

        {/* Fecha */}
        <section className="ruta__seccion">
          <h3 className="ruta__seccion-titulo">📅 ¿Cuándo viajas?</h3>
          <div className="ruta__fechas">
            {proximosDias(7).map(d => {
              const activo = formatearFecha(d) === formatearFecha(fecha);
              return (
                <button
                  key={formatearFecha(d)}
                  className={`ruta__fecha ${activo ? 'ruta__fecha--activa' : ''}`}
                  onClick={() => setFecha(d)}
                >
                  <span className="ruta__fecha-dia">{DIAS[d.getDay()]}</span>
                  <span className="ruta__fecha-numero">{d.getDate()}</span>
                  <span className="ruta__fecha-mes">{MESES[d.getMonth()]}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="ruta__footer">
        <Boton
          tamano="grande"
          icono="🔍"
          onClick={buscar}
          disabled={!origen || !destino || cargando}
        >
          {cargando ? 'Buscando...' : 'Buscar viajes'}
        </Boton>
      </footer>
    </div>
  );
}
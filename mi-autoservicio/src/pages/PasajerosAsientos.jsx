// src/pages/PasajerosAsientos.jsx
import { useMemo, useState } from 'react';
import Boton from '../components/Boton';
import {
  consultarDni,
  consultarRuc,
  normalizarFecha,
  normalizarSexo,
} from '../services/dniRuc';
import './PasajerosAsientos.css';

const TIPOS_DOC = ['DNI', 'PASAPORTE', 'CE'];
const SEXOS = [
  { valor: 'M', etiqueta: 'Masculino' },
  { valor: 'F', etiqueta: 'Femenino' },
];
const COLORES = ['#1e5aff', '#16c784', '#ffb800', '#ff4757', '#9b59b6', '#00b8d4'];

function pasajeroVacio() {
  return {
    id: crypto.randomUUID(),
    nombres: '',
    apellidos: '',
    tipoDocumento: 'DNI',
    documentoIdentidad: '',
    sexo: 'M',
    fechaNacimiento: '',
    descuento: 0,
    asiento: null,
    consultando: false,
  };
}

function facturaVacia() {
  return {
    idEmpresa: '',
    nombreEmpresa: '',
    direccionEmpresa: '',
    consultando: false,
  };
}

function pasajeroCompleto(p) {
  return Boolean(
    p.nombres.trim() &&
    p.apellidos.trim() &&
    p.documentoIdentidad.trim() &&
    p.fechaNacimiento
  );
}

export default function PasajerosAsientos({ itinerario, contexto, onContinuar, onVolver }) {
  const asientos = itinerario?.asientos || [];
  const [pasajeros, setPasajeros] = useState([pasajeroVacio()]);
  const [pasajeroActivo, setPasajeroActivo] = useState(0);
  const [deseaFactura, setDeseaFactura] = useState(false);
  const [factura, setFactura] = useState(facturaVacia());

  // Fase: 'pasajeros' (editando datos) | 'asientos' (asignando asientos)
  const [fase, setFase] = useState('pasajeros');
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [modalVolver, setModalVolver] = useState(false);

  const libres = useMemo(() => asientos.filter(a => a.estado === 'disponible'), [asientos]);
  const pisos = useMemo(() => {
    const map = new Map();
    asientos.forEach(a => {
      if (!map.has(a.piso)) map.set(a.piso, []);
      map.get(a.piso).push(a);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [asientos]);
  const maxFilas = useMemo(() => Math.max(...asientos.map(a => a.fila), 0), [asientos]);
  const maxColumnas = 5;

  const activo = pasajeros[pasajeroActivo];
  const todosCompletos = useMemo(
    () => pasajeros.length > 0 && pasajeros.every(pasajeroCompleto),
    [pasajeros]
  );
  const asientosAsignados = pasajeros.filter(p => p.asiento !== null).length;
  const todosConAsiento = pasajeros.length > 0 && pasajeros.every(p => p.asiento !== null);

  const enFasePasajeros = fase === 'pasajeros';
  const enFaseAsientos = fase === 'asientos';

  // --- Pasajeros ---
  const puedeAgregarPasajero =
    enFasePasajeros &&
    pasajeros.length < libres.length &&
    pasajeros.length < 10;

  const agregarPasajero = () => {
    if (!puedeAgregarPasajero) return;
    setPasajeros(prev => [...prev, pasajeroVacio()]);
    setPasajeroActivo(pasajeros.length);
  };

  const eliminarPasajero = (idx) => {
    if (!enFasePasajeros) return;
    setPasajeros(prev => prev.filter((_, i) => i !== idx));
    setPasajeroActivo(prev => (prev >= idx ? Math.max(0, prev - 1) : prev));
  };

  const actualizarPasajero = (idx, campo, valor) => {
    if (!enFasePasajeros) return;
    setPasajeros(prev => prev.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)));
  };

  // Autocompletar DNI al perder foco
  const autocompletarDocumento = async (idx) => {
    if (!enFasePasajeros) return;
    const p = pasajeros[idx];
    if (p.tipoDocumento !== 'DNI') return;
    if (!/^\d{8}$/.test(p.documentoIdentidad)) return;

    actualizarPasajero(idx, 'consultando', true);
    try {
      const data = await consultarDni(p.documentoIdentidad);
      if (data) {
        setPasajeros(prev => prev.map((pp, i) => i === idx ? {
          ...pp,
          nombres: data.nombres || pp.nombres,
          apellidos: `${data.ap_paterno || ''} ${data.ap_materno || ''}`.trim() || pp.apellidos,
          fechaNacimiento: normalizarFecha(data.fecha_nacimiento) || pp.fechaNacimiento,
          sexo: normalizarSexo(data.sexo),
          consultando: false,
        } : pp));
      } else {
        actualizarPasajero(idx, 'consultando', false);
      }
    } catch {
      actualizarPasajero(idx, 'consultando', false);
    }
  };

  // --- Asientos ---
  const toggleAsiento = (asiento) => {
    if (!enFaseAsientos) return;
    if (asiento.estado !== 'disponible') return;

    setPasajeros(prev => {
      const duenoIdx = prev.findIndex(p => p.asiento === asiento.numero);
      if (duenoIdx !== -1) {
        return prev.map((p, i) => (i === duenoIdx ? { ...p, asiento: null } : p));
      }
      const asignados = prev.filter(p => p.asiento !== null).length;
      if (asignados >= prev.length) return prev;
      return prev.map((p, i) => (i === pasajeroActivo ? { ...p, asiento: asiento.numero } : p));
    });
  };

  const colorDeAsiento = (numero) => {
    const idx = pasajeros.findIndex(p => p.asiento === numero);
    return idx === -1 ? null : COLORES[idx % COLORES.length];
  };

  const total = pasajeros.reduce((sum, p) => {
    const asiento = asientos.find(a => a.numero === p.asiento);
    return sum + (asiento?.precio || 0);
  }, 0);

  // --- Cambio de fase ---
  const irAFaseAsientos = () => {
    setFase('asientos');
    setModalConfirmar(false);
  };

  const irAFasePasajeros = () => {
    // Limpiar TODOS los asientos asignados
    setPasajeros(prev => prev.map(p => ({ ...p, asiento: null })));
    setPasajeroActivo(0);
    setFase('pasajeros');
    setModalVolver(false);
  };

  // --- Factura ---
  const actualizarFactura = (campo, valor) => {
    setFactura(prev => ({ ...prev, [campo]: valor }));
  };

  const autocompletarRuc = async () => {
    if (!/^\d{11}$/.test(factura.idEmpresa)) return;
    setFactura(prev => ({ ...prev, consultando: true }));
    try {
      const data = await consultarRuc(factura.idEmpresa);
      if (data) {
        setFactura(prev => ({
          ...prev,
          nombreEmpresa: data.nombre_razon_social || prev.nombreEmpresa,
          direccionEmpresa: data.direccion && data.direccion !== '-  -'
            ? data.direccion
            : prev.direccionEmpresa,
          consultando: false,
        }));
      } else {
        setFactura(prev => ({ ...prev, consultando: false }));
      }
    } catch {
      setFactura(prev => ({ ...prev, consultando: false }));
    }
  };

  const facturaValida = !deseaFactura || (
    factura.idEmpresa.trim().length === 11 &&
    factura.nombreEmpresa.trim() &&
    factura.direccionEmpresa.trim()
  );

  const continuar = () => {
    if (!enFaseAsientos || !todosConAsiento || !facturaValida) return;
    onContinuar({
      itinerario,
      contexto,
      pasajeros: pasajeros.map(p => ({
        ...p,
        precio: asientos.find(a => a.numero === p.asiento)?.precio || 0,
      })),
      factura: deseaFactura ? {
        idEmpresa: Number(factura.idEmpresa),
        nombreEmpresa: factura.nombreEmpresa,
        direccionEmpresa: factura.direccionEmpresa,
      } : null,
    });
  };

  return (
    <div className="pagina pa">
      <header className="pa__header">
        <button className="pa__volver" onClick={onVolver}>← Atrás</button>
        <div className="pa__info">
          <h2 className="pa__titulo">Pasajeros y asientos</h2>
          <p className="pa__sub">
            {itinerario?.nombre} · {contexto?.origen?.nombre} → {contexto?.destino?.nombre}
          </p>
        </div>
        <span className="pa__paso">Paso 3 de 4</span>
      </header>

      <main className="pa__contenido">
        {/* === IZQUIERDA: PASAJEROS + FACTURA === */}
        <section className="pa__pasajeros">
          <div className="pa__seccion-header">
            <h3 className="pa__seccion-titulo">
              👥 Pasajeros {todosCompletos && enFasePasajeros ? '✅' : ''}
            </h3>
            {enFasePasajeros ? (
              <Boton
                variante="secundario"
                tamano="pequeno"
                icono="＋"
                onClick={agregarPasajero}
                disabled={!puedeAgregarPasajero}
                title={
                  !puedeAgregarPasajero
                    ? 'No hay más asientos disponibles'
                    : undefined
                }
              >
                Agregar
              </Boton>
            ) : (
              <Boton
                variante="secundario"
                tamano="pequeno"
                icono="←"
                onClick={() => setModalVolver(true)}
              >
                Volver a editar
              </Boton>
            )}
          </div>

          <div className="pa__lista-pasajeros">
            {pasajeros.map((p, idx) => {
              const esActivo = idx === pasajeroActivo;
              const color = COLORES[idx % COLORES.length];
              const completo = pasajeroCompleto(p);
              const asientoAsignado = p.asiento
                ? asientos.find(a => a.numero === p.asiento)
                : null;
              const bloqueado = enFaseAsientos;

              return (
                <article
                  key={p.id}
                  className={`pasajero ${esActivo ? 'pasajero--activo' : ''} ${bloqueado ? 'pasajero--bloqueado' : ''}`}
                  style={{ '--color-pasajero': color }}
                  onClick={() => setPasajeroActivo(idx)}
                >
                  <div className="pasajero__cabecera">
                    <div className="pasajero__numero" style={{ background: color }}>
                      {idx + 1}
                    </div>
                    <div className="pasajero__estado">
                      {completo ? '✅ Datos listos' : '✏️ Completar datos'}
                      {asientoAsignado && (
                        <span className="pasajero__asiento-tag">
                          Asiento #{asientoAsignado.numero}
                        </span>
                      )}
                    </div>
                    {enFasePasajeros && pasajeros.length > 1 && (
                      <button
                        className="pasajero__eliminar"
                        onClick={(e) => { e.stopPropagation(); eliminarPasajero(idx); }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="pasajero__campos">
                    {/* Fila 1: Tipo doc./Número (2 col) + Sexo (1 col) */}
                    <div className="campo campo--triple">
                      <div className="campo campo--con-accion campo--span2">
                        <label>Tipo doc. / Número</label>
                        <div className="campo__accion">
                          <select
                            value={p.tipoDocumento}
                            onChange={(e) => actualizarPasajero(idx, 'tipoDocumento', e.target.value)}
                            onFocus={() => setPasajeroActivo(idx)}
                            disabled={bloqueado}
                          >
                            {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <input
                            type="text"
                            value={p.documentoIdentidad}
                            onChange={(e) => actualizarPasajero(idx, 'documentoIdentidad', e.target.value)}
                            onBlur={() => autocompletarDocumento(idx)}
                            placeholder="12345678"
                            onFocus={() => setPasajeroActivo(idx)}
                            readOnly={bloqueado}
                          />
                          {p.consultando && <span className="campo__spinner" />}
                        </div>
                      </div>

                      <div className="campo">
                        <label>Sexo</label>
                        <select
                          value={p.sexo}
                          onChange={(e) => actualizarPasajero(idx, 'sexo', e.target.value)}
                          onFocus={() => setPasajeroActivo(idx)}
                          disabled={bloqueado}
                        >
                          {SEXOS.map(s => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Fila 2: Nombres + Apellidos + Fecha nac. */}
                    <div className="campo campo--triple">
                      <div className="campo">
                        <label>Nombres</label>
                        <input
                          type="text"
                          value={p.nombres}
                          onChange={(e) => actualizarPasajero(idx, 'nombres', e.target.value)}
                          placeholder="Ej. Juan Carlos"
                          onFocus={() => setPasajeroActivo(idx)}
                          readOnly={bloqueado}
                        />
                      </div>

                      <div className="campo">
                        <label>Apellidos</label>
                        <input
                          type="text"
                          value={p.apellidos}
                          onChange={(e) => actualizarPasajero(idx, 'apellidos', e.target.value)}
                          placeholder="Ej. Pérez Gómez"
                          onFocus={() => setPasajeroActivo(idx)}
                          readOnly={bloqueado}
                        />
                      </div>

                      <div className="campo">
                        <label>Fecha nac.</label>
                        <input
                          type="date"
                          value={p.fechaNacimiento}
                          onChange={(e) => actualizarPasajero(idx, 'fechaNacimiento', e.target.value)}
                          onFocus={() => setPasajeroActivo(idx)}
                          readOnly={bloqueado}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* === FACTURA === */}
          <div className="factura">
            <label className="factura__toggle">
              <input
                type="checkbox"
                checked={deseaFactura}
                onChange={(e) => setDeseaFactura(e.target.checked)}
              />
              <span className="factura__toggle-caja" />
              <span className="factura__toggle-texto">🧾 ¿Deseas factura?</span>
            </label>

            {deseaFactura && (
              <div className="factura__campos">
                <div className="campo campo--con-accion">
                  <label>RUC</label>
                  <div className="campo__accion">
                    <input
                      type="text"
                      value={factura.idEmpresa}
                      onChange={(e) => actualizarFactura('idEmpresa', e.target.value)}
                      onBlur={autocompletarRuc}
                      placeholder="20123456789"
                      maxLength={11}
                    />
                    {factura.consultando && <span className="campo__spinner" />}
                  </div>
                </div>
                <div className="campo">
                  <label>Razón social</label>
                  <input
                    type="text"
                    value={factura.nombreEmpresa}
                    onChange={(e) => actualizarFactura('nombreEmpresa', e.target.value)}
                    placeholder="Mi Empresa S.A.C."
                  />
                </div>
                <div className="campo">
                  <label>Dirección fiscal</label>
                  <input
                    type="text"
                    value={factura.direccionEmpresa}
                    onChange={(e) => actualizarFactura('direccionEmpresa', e.target.value)}
                    placeholder="Av. Siempre Viva 123"
                  />
                </div>
              </div>
            )}

          </div>
          <div className="campo campo--doble">
            {enFasePasajeros ? (
              <Boton
                tamano="grande"
                icono="🪑"
                onClick={() => setModalConfirmar(true)}
                disabled={!todosCompletos}
                title={!todosCompletos ? 'Completa todos los pasajeros primero' : undefined}
              >
                Seleccionar asientos
              </Boton>
            ) : (
              <Boton
                tamano="grande"
                icono="➡️"
                onClick={continuar}
                disabled={!todosConAsiento || !facturaValida}
              >
                Continuar
              </Boton>
            )}
            <div className="pa__resumen">
              <div className="pa__resumen-linea">
                <span>Pasajeros</span>
                <strong>{pasajeros.length}</strong>
              </div>
              <div className="pa__resumen-linea">
                <span>Asientos asignados</span>
                <strong>{asientosAsignados} / {pasajeros.length}</strong>
              </div>
              <div className="pa__resumen-linea pa__resumen-linea--total">
                <span>Total</span>
                <strong>S/ {total.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* === DERECHA: ASIENTOS === */}
        <aside className="pa__asientos-panel">
          <div className="pa__asientos-header">
            <h3 className="pa__seccion-titulo">🪑 Asientos</h3>
            <p className={`pa__pista ${enFasePasajeros ? 'pa__pista--bloqueada' : ''}`}>
              {enFasePasajeros
                ? '🔒 Completa los datos de todos los pasajeros y pulsa "Seleccionar asientos"'
                : todosConAsiento
                  ? '¡Todo listo! Pulsa continuar.'
                  : `Toca un asiento para el pasajero ${pasajeroActivo + 1}`}
            </p>
          </div>
          <div className={`pa__bus ${enFasePasajeros ? 'pa__bus--bloqueado' : ''}`}>
            <div className="pa__cabina">
              <div className="pa__leyenda">
                <div className="pa__leyenda-item">
                  <span className="pa__leyenda-cuadro pa__leyenda-cuadro--libre" /> Libre
                </div>
                <div className="pa__leyenda-item">
                  <span className="pa__leyenda-cuadro pa__leyenda-cuadro--ocupado" /> Ocupado
                </div>
                <div className="pa__leyenda-item">
                  <span className="pa__leyenda-cuadro pa__leyenda-cuadro--asignado" /> Asignado
                </div>
                <div className="pa__leyenda-item">
                  <span className="pa__leyenda-cuadro pa__leyenda-cuadro--bloqueado" /> Bloqueado
                </div>
              </div>
            </div>

            {pisos.map(([piso, lista]) => (
              <div key={piso} className="pa__piso">
                {pisos.length > 1 && <span className="pa__piso-etiqueta">Piso {piso}</span>}
                <div
                  className="pa__grilla"
                  style={{ gridTemplateColumns: `repeat(${maxColumnas}, 1fr)` }}
                >
                  {Array.from({ length: maxFilas }).map((_, filaIdx) => {
                    const fila = filaIdx + 1;
                    return Array.from({ length: maxColumnas }).map((_, colIdx) => {
                      const columna = colIdx + 1;
                      if (columna === 3) {
                        return <div key={`p-${fila}-${columna}`} className="pa__pasillo" />;
                      }
                      const asiento = lista.find(a => a.fila === fila && a.columna === columna);
                      if (!asiento) {
                        return <div key={`v-${fila}-${columna}`} className="pa__vacio" />;
                      }
                      const ocupado = asiento.estado !== 'disponible';
                      const color = colorDeAsiento(asiento.numero);
                      const bloqueadoPorFase = enFasePasajeros && !color && !ocupado;

                      return (
                        <button
                          key={asiento.numero}
                          className={`asiento-pa
                            ${ocupado ? 'asiento-pa--ocupado' : ''}
                            ${color ? 'asiento-pa--asignado' : ''}
                            ${bloqueadoPorFase ? 'asiento-pa--bloqueado' : ''}`}
                          style={color ? { background: color, borderColor: color } : {}}
                          onClick={() => toggleAsiento(asiento)}
                          disabled={ocupado || bloqueadoPorFase}
                          title={
                            ocupado
                              ? 'Ocupado'
                              : bloqueadoPorFase
                                ? 'Primero confirma tus pasajeros con "Seleccionar asientos"'
                                : `Asiento ${asiento.numero}`
                          }
                        >
                          {asiento.numero}
                        </button>
                      );
                    });
                  })}
                </div>
              </div>
            ))}
          </div>




        </aside>
      </main>

      {/* === MODAL: Confirmar paso a asientos === */}
      {modalConfirmar && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__caja">
            <h3 className="modal__titulo">¿Terminaste con tus pasajeros?</h3>
            <p className="modal__texto">
              Una vez que continúes <strong>no podrás editar ni agregar pasajeros</strong>.
              ¿Deseas seleccionar asientos ahora?
            </p>
            <center> 
            <div className="modal__acciones">
              <Boton variante="secundario" onClick={() => setModalConfirmar(false)}>
                No, revisar
              </Boton>
              <Boton onClick={irAFaseAsientos} disabled={!todosCompletos}>
                Sí, seleccionar asientos
              </Boton>
            </div>
            </center>
          </div>
        </div>
      )}

      {/* === MODAL: Confirmar volver a editar === */}
      {modalVolver && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__caja">
            <h3 className="modal__titulo">¿Volver a editar pasajeros?</h3>
            <p className="modal__texto">
              Si vuelves a editar pasajeros <strong>se borrarán todos los asientos asignados</strong>.
              ¿Deseas continuar?
            </p>
            <div className="modal__acciones">
              <Boton variante="secundario" onClick={() => setModalVolver(false)}>
                No, mantener asientos
              </Boton>
              <Boton onClick={irAFasePasajeros}>
                Sí, borrar y volver
              </Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
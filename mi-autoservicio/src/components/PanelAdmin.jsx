// src/components/PanelAdmin.jsx
import { useEffect, useState } from 'react';
import Boton from './Boton';
import './PanelAdmin.css';

const PIN_DEFECTO = '1611';

export default function PanelAdmin({ onCerrar, ultimoTicket }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [autorizado, setAutorizado] = useState(false);

  // Reset del PIN al abrir
  useEffect(() => {
    setPin('');
    setError(null);
    setAutorizado(false);
  }, []);

  const escribirDigito = (d) => {
    if (pin.length >= 4) return;
    setError(null);
    setPin((p) => p + d);
  };

  const borrarDigito = () => {
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const validar = () => {
    if (pin === PIN_DEFECTO) {
      setAutorizado(true);
      setError(null);
    } else {
      setError('PIN incorrecto');
      setPin('');
    }
  };

  // Auto-validar al completar 4 dígitos
  useEffect(() => {
    if (pin.length === 4) validar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const cerrarApp = async () => {
    if (window.electronAPI?.adminCerrarApp) {
      await window.electronAPI.adminCerrarApp();
    }
  };

  const reiniciarApp = async () => {
    if (window.electronAPI?.adminReiniciarApp) {
      await window.electronAPI.adminReiniciarApp();
    }
  };

  const reimprimir = async () => {
    if (!ultimoTicket) return;
    if (!window.electronAPI?.imprimirBoleto) return;
    try {
      // Reusar la lógica de VistaBoleto no es trivial aquí;
      // lo dejamos para cuando tengamos persistencia.
      // Por ahora, solo mostramos un aviso.
      alert('Función de reimpresión pendiente (necesita persistencia de tickets).');
    } catch (e) {
      console.error('❌ Error al reimprimir:', e);
    }
  };

  return (
    <div className="panel-admin">
      <div className="panel-admin__caja">
        <button className="panel-admin__cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>

        {!autorizado && (
          <>
            <h2 className="panel-admin__titulo">🔐 Acceso administrativo</h2>
            <p className="panel-admin__sub">Introduce el PIN de 4 dígitos</p>

            <div className="panel-admin__pin">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`panel-admin__pin-dot ${pin.length > i ? 'panel-admin__pin-dot--lleno' : ''}`}
                />
              ))}
            </div>

            {error && <p className="panel-admin__error">{error}</p>}

            <div className="panel-admin__teclado">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map((d) => (
                <button
                  key={d}
                  className="panel-admin__tecla"
                  onClick={() => (d === '⌫' ? borrarDigito() : escribirDigito(d))}
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}

        {autorizado && (
          <>
            <h2 className="panel-admin__titulo">✅ Panel de administración</h2>
            <p className="panel-admin__sub">Kiosco Jaksa · Autoservicio</p>

            <div className="panel-admin__acciones">
              <Boton
                variante="secundario"
                tamano="mediano"
                icono="🖨️"
                onClick={reimprimir}
                disabled={!ultimoTicket}
              >
                Reimprimir último boleto
              </Boton>

              <Boton
                variante="secundario"
                tamano="mediano"
                icono="🔄"
                onClick={reiniciarApp}
              >
                Reiniciar aplicación
              </Boton>

              <Boton
                variante="peligro"
                tamano="mediano"
                icono="⏻"
                onClick={cerrarApp}
              >
                Cerrar aplicación
              </Boton>
            </div>

            <p className="panel-admin__nota">
              Al cerrar la aplicación, el kiosco queda inactivo hasta que se
              reinicie manualmente o se reinicie el sistema.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
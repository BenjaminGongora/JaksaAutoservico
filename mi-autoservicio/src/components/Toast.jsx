// src/components/Toast.jsx
import { useEffect } from 'react';
import './Toast.css';

export default function Toast({
  mensaje,
  onCerrar,
  duracionMs = 6000,
  onAccion,
  textoAccion = 'Reintentar',
}) {
  useEffect(() => {
    if (!duracionMs) return;
    const t = setTimeout(onCerrar, duracionMs);
    return () => clearTimeout(t);
  }, [duracionMs, onCerrar]);

  return (
    <div className="toast" role="status">
      <span className="toast__icono" aria-hidden>⚠️</span>
      <p className="toast__mensaje">{mensaje}</p>
      {onAccion && (
        <button className="toast__accion" onClick={onAccion}>
          {textoAccion}
        </button>
      )}
      <button className="toast__cerrar" onClick={onCerrar} aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}
// src/components/ErrorModal.jsx
import Boton from './Boton';
import './ErrorModal.css';

export default function ErrorModal({
  error,
  onReintentar,
  onVolver,
  textoVolver = 'Volver al inicio',
}) {
  if (!error) return null;

  return (
    <div className="modal-error" role="dialog" aria-modal="true">
      <div className="modal-error__caja">
        <span className="modal-error__icono" aria-hidden>
          {iconoPorTipo(error.tipo)}
        </span>

        <h3 className="modal-error__titulo">{tituloPorTipo(error.tipo)}</h3>
        <p className="modal-error__mensaje">{error.mensaje}</p>

        <div className="modal-error__acciones">
          {onVolver && (
            <Boton variante="secundario" tamano="mediano" onClick={onVolver}>
              {textoVolver}
            </Boton>
          )}
          {error.reintentable && onReintentar && (
            <Boton tamano="mediano" icono="🔄" onClick={onReintentar}>
              Reintentar
            </Boton>
          )}
        </div>
      </div>
    </div>
  );
}

function iconoPorTipo(tipo) {
  switch (tipo) {
    case 'red':
    case 'timeout':
      return '📡';
    case 'auth':
      return '🔐';
    case 'conflicto':
      return '🪑';
    case 'servidor':
      return '🛠️';
    case 'impresora':
      return '🖨️';
    default:
      return '⚠️';
  }
}

function tituloPorTipo(tipo) {
  switch (tipo) {
    case 'red':
      return 'Sin conexión';
    case 'timeout':
      return 'El servidor no responde';
    case 'auth':
      return 'Reconectando';
    case 'conflicto':
      return 'Asientos no disponibles';
    case 'servidor':
      return 'Sistema ocupado';
    case 'impresora':
      return 'Error de impresión';
    default:
      return 'Algo salió mal';
  }
}
// src/components/TecladoVirtual.jsx
import './TecladoVirtual.css';

const FILAS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '.'],
];

export default function TecladoVirtual({ onTecla, onBorrar, onLimpiar, onCerrar, visible }) {
  if (!visible) return null;

  return (
    <div className="teclado" onMouseDown={(e) => e.preventDefault()}>
      <div className="teclado__barra">
        <span className="teclado__titulo">Escribe aquí</span>
        <button className="teclado__cerrar" onClick={onCerrar}>Listo ✓</button>
      </div>

      <div className="teclado__filas">
        {FILAS.map((fila, idx) => (
          <div key={idx} className="teclado__fila">
            {fila.map(t => (
              <button
                key={t}
                className="teclado__tecla"
                onClick={() => onTecla(t)}
              >
                {t}
              </button>
            ))}
          </div>
        ))}
        <div className="teclado__fila">
          <button className="teclado__tecla teclado__tecla--accion" onClick={onLimpiar}>
            Limpiar
          </button>
          <button
            className="teclado__tecla teclado__tecla--espacio"
            onClick={() => onTecla(' ')}
          >
            Espacio
          </button>
          <button
            className="teclado__tecla teclado__tecla--accion"
            onClick={onBorrar}
          >
            ⌫ Borrar
          </button>
        </div>
      </div>
    </div>
  );
}
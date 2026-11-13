// src/components/Boton.jsx
import './Boton.css';

export default function Boton({ children, variante = 'verde', tamano = 'grande', icono, onClick, disabled }) {
  return (
    <button
      className={`boton boton--${variante} boton--${tamano}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icono && <span className="boton__icono">{icono}</span>}
      <span>{children}</span>
    </button>
  );
}
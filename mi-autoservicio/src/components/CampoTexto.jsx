// src/components/CampoTexto.jsx
import { useState } from 'react';
import './CampoTexto.css';

export default function CampoTexto({
  label,
  valor,
  onChange,
  placeholder,
  tipo = 'text',
  icono,
  maxLength,
}) {
  const [activo, setActivo] = useState(false);

  const handleChange = (e) => {
    let v = e.target.value;
    if (tipo === 'numero') v = v.replace(/[^0-9]/g, '');
    if (maxLength) v = v.slice(0, maxLength);
    onChange(tipo === 'mayusculas' ? v.toUpperCase() : v);
  };

  return (
    <div className={`campo ${activo ? 'campo--activo' : ''}`}>
      {label && <label className="campo__label">{label}</label>}
      <div className="campo__caja">
        {icono && <span className="campo__icono">{icono}</span>}
        <input
          className="campo__input"
          value={valor}
          onChange={handleChange}
          onFocus={() => setActivo(true)}
          onBlur={() => setActivo(false)}
          placeholder={placeholder}
          inputMode={tipo === 'numero' ? 'numeric' : 'text'}
          maxLength={maxLength}
        />
      </div>
    </div>
  );
}
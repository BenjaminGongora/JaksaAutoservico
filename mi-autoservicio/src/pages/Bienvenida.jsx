// src/pages/Bienvenida.jsx
import { useEffect, useRef } from 'react';
import Boton from '../components/Boton';
import './Bienvenida.css';
import logoJaksa from '../assets/logo_jaksa.png';  

export default function Bienvenida({ onComenzar, onAdmin }) {
  const clicksRef = useRef([]);
  const timeoutRef = useRef(null);

  const handleLogoClick = () => {
    if (!onAdmin) return;

    const ahora = Date.now();
    clicksRef.current = clicksRef.current.filter((t) => ahora - t < 3000);
    clicksRef.current.push(ahora);

    // Reinicia el timeout para limpiar
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      clicksRef.current = [];
    }, 3500);

    if (clicksRef.current.length >= 5) {
      clicksRef.current = [];
      onAdmin();
    }
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div className="pagina bienvenida">
      <div className="bienvenida__fondo-decorativo" />

      <header className="bienvenida__header">
        <div className="bienvenida__logo" onClick={handleLogoClick}>
          <span className="bienvenida__logo-icono">
            <img src={logoJaksa} alt="Logo" height="180" />          </span>
        </div>
      </header>

      <main className="bienvenida__contenido">
        <h1 className="bienvenida__titulo">
          ¡Bienvenido!<br />
          <span className="bienvenida__titulo-resaltado">¿A dónde viajas hoy?</span>
        </h1>
        <p className="bienvenida__subtitulo">
          Compra tu pasaje en menos de 2 minutos
        </p>

        <Boton tamano="grande" icono="🎫" onClick={onComenzar}>
          Comprar mi pasaje
        </Boton>
      </main>

      <footer className="bienvenida__footer">
        <div className="bienvenida__paso">
          <span className="bienvenida__paso-numero">1</span>
          <span>Elige tu destino</span>
        </div>
        <div className="bienvenida__paso">
          <span className="bienvenida__paso-numero">2</span>
          <span>Selecciona tu asiento</span>
        </div>
        <div className="bienvenida__paso">
          <span className="bienvenida__paso-numero">3</span>
          <span>¡Y listo, viaja!</span>
        </div>
      </footer>
    </div>
  );
}
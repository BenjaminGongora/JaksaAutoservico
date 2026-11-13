// src/pages/Bienvenida.jsx
import Boton from '../components/Boton';
import './Bienvenida.css';

export default function Bienvenida({ onComenzar }) {
  return (
    <div className="pagina bienvenida">
      <div className="bienvenida__fondo-decorativo" />

      <header className="bienvenida__header">
        <div className="bienvenida__logo">
          <span className="bienvenida__logo-icono"><img src="src/assets/logo_jaksa.png" alt="Logo" height="180" /></span>
          {/* <span className="bienvenida__logo-texto">Jaksa</span> */}
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
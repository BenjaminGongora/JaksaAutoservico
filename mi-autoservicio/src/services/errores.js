// src/services/errores.js
// Normaliza errores de Jaksa / Culqi / red / impresora a un mensaje amigable.

function clasificar(error) {
  const msg = (error?.message || '').toLowerCase();

  if (
    error?.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  ) {
    return 'red';
  }

  if (error?.name === 'AbortError' || msg.includes('timeout')) {
    return 'timeout';
  }

  if (msg.includes('401') || msg.includes('no autorizado') || msg.includes('token')) {
    return 'auth';
  }

  if (msg.includes('409') || msg.includes('ya no está disponible') || msg.includes('ocupado')) {
    return 'conflicto';
  }

  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('servidor')) {
    return 'servidor';
  }

  if (msg.includes('impres') || msg.includes('printer') || msg.includes('devicename')) {
    return 'impresora';
  }

  return 'desconocido';
}

const MENSAJES = {
  red: {
    mensaje: 'No hay conexión con el servidor. Verifica la red e intenta de nuevo.',
    reintentable: true,
  },
  timeout: {
    mensaje: 'El servidor tardó demasiado en responder. Intenta de nuevo.',
    reintentable: true,
  },
  auth: {
    mensaje: 'La sesión expiró. Estamos reconectando…',
    reintentable: true,
  },
  conflicto: {
    mensaje: 'Los asientos que elegiste ya no están disponibles. Vuelve a seleccionarlos.',
    reintentable: false,
  },
  servidor: {
    mensaje: 'El sistema de ventas está teniendo problemas. Intenta en unos segundos.',
    reintentable: true,
  },
  impresora: {
    mensaje: 'No se pudo imprimir el boleto. Revisa la impresora.',
    reintentable: true,
  },
  desconocido: {
    mensaje: 'Ocurrió un problema inesperado. Intenta de nuevo.',
    reintentable: true,
  },
};

export function normalizarError(error) {
  const tipo = clasificar(error);
  const base = MENSAJES[tipo] || MENSAJES.desconocido;
  const detalle = error?.message || String(error);

  console.error(`❌ [${tipo}]`, detalle, error);

  return {
    tipo,
    mensaje: base.mensaje,
    reintentable: base.reintentable,
    detalle,
  };
}
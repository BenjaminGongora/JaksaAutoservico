// electron/main.js
import { app, BrowserWindow, ipcMain, globalShortcut, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException en main:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection en main:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let printWindow = null;

// ⚠️ Debe coincidir EXACTAMENTE con el nombre de la impresora en Windows
const NOMBRE_IMPRESORA = 'EPSON TM-T20III Receipt';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    kiosk: true,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: process.env.NODE_ENV === 'development',
    },
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    // ⚠️ TEMPORAL: permitir DevTools en development para diagnosticar
    if (process.env.NODE_ENV === 'development') return;

    const key = (input.key || '').toLowerCase();
    const ctrl = input.control;
    const alt = input.alt;
    const shift = input.shift;

    if (alt && key === 'f4') { event.preventDefault(); return; }
    if (ctrl && ['w', 'r', 'i', 'j'].includes(key)) { event.preventDefault(); return; }
    if (['f5', 'f12'].includes(key)) { event.preventDefault(); return; }
    if (ctrl && shift && key === 'r') { event.preventDefault(); return; }
  });

  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function blindarKiosco() {
  Menu.setApplicationMenu(null);

  const atajosBloqueados = [
    'Alt+F4',
    'CommandOrControl+W',
    'CommandOrControl+R',
    'CommandOrControl+Shift+R',
    'CommandOrControl+Shift+I',
    'CommandOrControl+Shift+J',
    'F5',
    'F11',
    'F12',
  ];

  atajosBloqueados.forEach((atajo) => {
    try {
      const ok = globalShortcut.register(atajo, () => {
        console.log(`🔒 Atajo bloqueado: ${atajo}`);
      });
      if (!ok && !['Alt+F4', 'F12'].includes(atajo)) {
        console.warn(`⚠️ No se pudo registrar el atajo: ${atajo}`);
      }
    } catch (e) {
      // silencio: before-input-event ya cubre
    }
  });
}

/**
 * Verifica el estado real de la impresora vía PowerShell.
 * Devuelve { ok: boolean, estado: string, motivo: string }
 */
async function verificarImpresora() {
  try {
    const cmd = `powershell -NoProfile -Command "Get-Printer -Name '${NOMBRE_IMPRESORA}' | Select-Object -ExpandProperty PrinterStatus"`;
    const { stdout, stderr } = await execAsync(cmd, { timeout: 4000 });

    if (stderr && stderr.trim()) {
      return { ok: false, estado: 'error', motivo: stderr.trim() };
    }

    const estado = stdout.trim(); // 'Normal', 'Offline', 'Error', 'PaperJam', etc.

    // 'Normal' es el único estado que garantiza que imprimirá
    if (estado === 'Normal') {
      return { ok: true, estado };
    }

    // Mapeo de estados a mensajes amigables
    const motivos = {
      Offline: 'La impresora está apagada o desconectada.',
      Error: 'La impresora reporta un error.',
      PaperJam: 'Hay un atasco de papel en la impresora.',
      PaperOut: 'La impresora no tiene papel.',
      DoorOpen: 'La impresora tiene una cubierta abierta.',
      LowPaper: 'La impresora tiene poco papel.',
      NoToner: 'Problema de tinta/tóner.',
      NotAvailable: 'La impresora no está disponible.',
      Unknown: 'Estado de impresora desconocido.',
    };

    return {
      ok: false,
      estado,
      motivo: motivos[estado] || `La impresora reporta: ${estado}`,
    };
  } catch (e) {
    // Comando falló: impresora no existe o PowerShell no responde
    return {
      ok: false,
      estado: 'no_encontrada',
      motivo: `No se encontró la impresora "${NOMBRE_IMPRESORA}" o no responde.`,
    };
  }
}

async function imprimirHtmlEnVentana(html) {
  // 🔍 1. Verificar impresora ANTES de imprimir
  const check = await verificarImpresora();
  console.log('🖨️ [main] Verificación impresora:', check);

  if (!check.ok) {
    return {
      success: false,
      error: check.motivo,
      tipo: 'impresora',
      estado: check.estado,
    };
  }

  // 2. Imprimir
  if (printWindow && !printWindow.isDestroyed()) {
    printWindow.destroy();
  }

  printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await printWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  );

  await new Promise((resolve) => setTimeout(resolve, 400));

  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: '', // vacío = impresora predeterminada de Windows
        margins: { marginType: 'none' },
        pageSize: { width: 80000, height: 297000 },
      },
      (success, failureReason) => {
        console.log('🖨️ [main] print callback → success:', success, 'reason:', failureReason);
        if (success) {
          resolve({ success: true });
        } else {
          reject(new Error(failureReason || 'Error de impresión'));
        }
      }
    );
  });
}

ipcMain.handle('imprimir-boleto', async (event, { html }) => {
  console.log('🖨️ [main] Recibida petición de impresión, length HTML:', html.length);
  try {
    const resultado = await imprimirHtmlEnVentana(html);
    console.log('🖨️ [main] Resultado print:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ [main] Error en impresión silenciosa:', error);
    return { success: false, error: error.message, tipo: 'impresora' };
  }
});

ipcMain.handle('admin-cerrar-app', async () => {
  console.log('🔧 Admin: cerrando aplicación…');
  app.quit();
  return { ok: true };
});

ipcMain.handle('admin-reiniciar-app', async () => {
  console.log('🔧 Admin: reiniciando aplicación…');
  app.relaunch();
  app.quit();
  return { ok: true };
});

app.whenReady().then(async () => {
  createWindow();
  blindarKiosco();

  // Verificar impresora al arrancar
  const check = await verificarImpresora();
  if (check.ok) {
    console.log('✅ Impresora lista:', check.estado);
  } else {
    console.warn('⚠️ Impresora NO lista al arrancar:', check.motivo);
  }

  try {
    const win = new BrowserWindow({ show: false });
    const printers = await win.webContents.getPrintersAsync();
    console.log('🖨️ Impresoras detectadas por Electron:');
    printers.forEach((p) => {
      console.log(`  name: "${p.name}"  |  displayName: "${p.displayName}"`);
    });
    win.destroy();
  } catch (e) {
    console.warn('⚠️ No se pudo listar impresoras:', e.message);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
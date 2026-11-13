// electron/main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

async function imprimirHtmlEnVentana(html) {
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

  await new Promise(resolve => setTimeout(resolve, 400));

  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: '', // ⬅️ vacío = impresora predeterminada de Windows
        margins: { marginType: 'none' },
        pageSize: { width: 80000, height: 297000 }, // 80mm de ancho
      },
      (success, failureReason) => {
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
  try {
    const resultado = await imprimirHtmlEnVentana(html);
    return resultado;
  } catch (error) {
    console.error('❌ Error en impresión silenciosa:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  createWindow();

  // Log opcional de impresoras (útil para diagnóstico)
  try {
    const win = new BrowserWindow({ show: false });
    const printers = await win.webContents.getPrintersAsync();
    console.log('🖨️ Impresoras detectadas por Electron:');
    printers.forEach(p => {
      console.log(`  name: "${p.name}"  |  displayName: "${p.displayName}"`);
    });
    win.destroy();
  } catch (e) {
    console.warn('⚠️ No se pudo listar impresoras:', e.message);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
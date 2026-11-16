// electron/preload.js
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  imprimirBoleto: (html) => ipcRenderer.invoke('imprimir-boleto', { html }),
  adminCerrarApp: () => ipcRenderer.invoke('admin-cerrar-app'),
  adminReiniciarApp: () => ipcRenderer.invoke('admin-reiniciar-app'),
});
// Oyuna yalnızca "oda kur / kapat" yeteneğini açar.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('misketHost', {
  start: () => ipcRenderer.invoke('host:start'),
  stop: () => ipcRenderer.invoke('host:stop'),
});

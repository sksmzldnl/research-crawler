const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', Object.freeze({call:(method,args)=>ipcRenderer.invoke('studio:call',method,args)}));

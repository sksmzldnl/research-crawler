const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('studio',Object.freeze({call:async(method,args)=>{try{return await ipcRenderer.invoke('studio:call',method,args);}catch(error){throw new Error(String(error.message||error).replace(/^Error invoking remote method ['"]studio:call['"]: Error:\s*/,''));}}}));

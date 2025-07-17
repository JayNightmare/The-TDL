/**
 * Preload Script - Secure IPC Bridge
 * 
 * Provides secure communication channel between main and renderer processes
 * while maintaining context isolation for security.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Send unlock signal to main process
  unlock: () => ipcRenderer.send('unlock'),
  
  // Task management
  getTasks: () => ipcRenderer.send('get-tasks'),
  saveTasks: (tasks) => ipcRenderer.send('save-tasks', tasks),
  
  // Session management
  resetSession: () => ipcRenderer.send('reset-session'),
  
  // Event listeners
  onTasksData: (callback) => ipcRenderer.on('tasks-data', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

# Code Citations

## Enhanced Lockdown Implementation - Input Blocking

### License: MIT
Based on standard web keyboard event handling patterns and Electron security best practices.

## Keyboard Event Blocking Pattern
Referenced from common web security implementations:

```javascript
// Enhanced keyboard blocking in renderer process
document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || 
        (e.ctrlKey && e.key === 'r') ||
        (e.ctrlKey && e.key === 'R') ||
        (e.metaKey && e.key === 'r') ||
        (e.metaKey && e.key === 'R') ||
        e.key === 'F11' ||
        e.key === 'F12' ||
        (e.altKey && e.key === 'Tab') ||
        (e.altKey && e.key === 'F4') ||
        (e.ctrlKey && e.key === 'w') ||
        (e.ctrlKey && e.key === 'W') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log(`Blocked key combination: ${e.key}`);
        return false;
    }
}, true);
```

## Global Shortcut Registration Pattern
Based on Electron globalShortcut API documentation:

```javascript
// Global shortcut blocking in main process
const shortcuts = [
    "Alt+F4", "Cmd+Q", "Ctrl+W", "Ctrl+Alt+Delete", 
    "Ctrl+Shift+Esc", "Cmd+Tab", "Alt+Tab", "Cmd+M", 
    "Cmd+H", "F11", "Escape", "Windows", "Cmd+Space",
    "Ctrl+Escape", "Alt+Escape", "Ctrl+Alt+Tab",
    "Cmd+Option+Esc", "Cmd+`", "F1", "F2", "F3", 
    "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F12"
];
```

## Focus Monitoring System
Custom implementation for maintaining window focus:

```javascript
// Focus monitoring with aggressive recapture
function startFocusMonitoring() {
    focusMonitorInterval = setInterval(() => {
        if (!isUnlocked && mainWindow && !mainWindow.isDestroyed()) {
            if (!mainWindow.isFocused()) {
                mainWindow.focus();
                mainWindow.show();
                mainWindow.moveTop();
                mainWindow.setAlwaysOnTop(true);
                mainWindow.flashFrame(true);
            }
        }
    }, 250);
}
```

## Window Event Prevention
Based on Electron BrowserWindow event handling:

```javascript
// Prevent window manipulation
mainWindow.on("minimize", (event) => {
    if (!isUnlocked) {
        event.preventDefault();
        mainWindow.restore();
        mainWindow.focus();
    }
});

mainWindow.on("hide", (event) => {
    if (!isUnlocked) {
        event.preventDefault();
        mainWindow.show();
        mainWindow.focus();
    }
});
```

## Navigation Blocking
Electron webContents security pattern:

```javascript
// Block navigation attempts
mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    event.preventDefault();
    console.log("Navigation blocked:", navigationUrl);
});
```

## Attribution
- Electron API patterns: https://www.electronjs.org/docs/
- Web security best practices: Standard DOM event handling
- Kiosk mode implementation: Electron documentation examples
- Focus management: Custom implementation for lockdown applications

All implementations follow standard web security and Electron best practices for creating secure, locked-down applications.


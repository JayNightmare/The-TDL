/**
 * The TDL - Main Process
 *
 * A fullscreen lockdown to-do list application that prevents the user from
 * accessing other applications until all tasks are completed.
 *
 * Core Flow:
 * 1. Auto-launch at system startup
 * 2. Create kiosk-style fullscreen window
 * 3. Block system shortcuts and escape routes
 * 4. Listen for IPC unlock signal from renderer
 * 5. Hide window when all tasks completed
 * 6. Respawn if window is closed unexpectedly
 */

const {
    app,
    BrowserWindow,
    ipcMain,
    globalShortcut,
    Menu,
} = require("electron");
const path = require("path");
const AutoLaunch = require("auto-launch");
const Store = require("electron-store");
const config = require("./config");

// Initialize persistent storage
const store = new Store();

// Auto-launch configuration
const autoLauncher = new AutoLaunch({
    name: "The TDL",
    path: app.getPath("exe"),
});

let mainWindow = null;
let isUnlocked = false;
let focusMonitorInterval;

function createWindow() {
    // Get configuration based on environment
    const settings = config.isDev ? config.dev : config.prod;

    // Create kiosk-style fullscreen window
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: true,
        frame: false,
        titleBarStyle: "hidden",
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: settings.allowClose,
        alwaysOnTop: true,
        skipTaskbar: false,
        focusable: true,
        show: false,
        kiosk: !settings.allowClose,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, "renderer", "preload.js"),
            webSecurity: true,
            allowRunningInsecureContent: false,
            experimentalFeatures: false,
        },
    });

    // Disable menu bar
    Menu.setApplicationMenu(null);

    // Load the app
    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

    // Enhanced window event handlers
    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true);
        
        // Start focus monitoring
        startFocusMonitoring();
        
        if (settings.openDevTools && settings.allowDevTools) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Prevent window from losing focus
    mainWindow.on("blur", () => {
        console.log("Window lost focus - regaining immediately");
        if (!isUnlocked && mainWindow && !mainWindow.isDestroyed()) {
            setTimeout(() => {
                mainWindow.focus();
                mainWindow.show();
                mainWindow.moveTop();
                mainWindow.setAlwaysOnTop(true);
            }, 50);
        }
    });

    // Prevent minimize
    mainWindow.on("minimize", (event) => {
        if (!isUnlocked) {
            event.preventDefault();
            mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Prevent hide
    mainWindow.on("hide", (event) => {
        if (!isUnlocked) {
            event.preventDefault();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // Prevent window from being closed
    mainWindow.on("close", (event) => {
        if (!isUnlocked && !app.isQuiting && !settings.allowClose) {
            event.preventDefault();
            return false;
        }
    });

    // Respawn window if it's destroyed unexpectedly
    mainWindow.on("closed", () => {
        console.log("Main window closed unexpectedly");
        if (!isUnlocked && !app.isQuiting) {
            console.log("Respawning window - lockdown still active");
            setTimeout(() => {
                createWindow();
            }, 100);
        }
        mainWindow = null;
    });

    // Enhanced input blocking
    mainWindow.webContents.on("before-input-event", (event, input) => {
        const settings = config.isDev ? config.dev : config.prod;

        // Allow DevTools in development mode
        if (config.isDev && settings.allowDevTools) {
            return;
        }

        // Block developer tools and debugging
        if (
            input.key === "F12" ||
            (input.control && input.shift && (input.key === "I" || input.key === "J")) ||
            (input.control && input.shift && input.key === "C") ||
            (input.control && input.key === "u") ||
            (input.alt && input.key === "F4") ||
            (input.control && input.key === "w")
        ) {
            event.preventDefault();
            console.log(`Blocked input: ${input.key}`);
        }
    });

    // Prevent new window creation
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });

    // Block navigation attempts
    mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
        event.preventDefault();
        console.log("Navigation blocked:", navigationUrl);
    });
}

// Add focus monitoring system
function startFocusMonitoring() {
    if (focusMonitorInterval) {
        clearInterval(focusMonitorInterval);
    }
    
    const settings = config.isDev ? config.dev : config.prod;
    const interval = settings.focusMonitoringInterval || 250;
    
    focusMonitorInterval = setInterval(() => {
        if (!isUnlocked && mainWindow && !mainWindow.isDestroyed()) {
            // Check if our window is focused
            if (!mainWindow.isFocused()) {
                console.log("Window not focused - forcing focus");
                mainWindow.focus();
                mainWindow.show();
                mainWindow.moveTop();
                mainWindow.setAlwaysOnTop(true);
                
                // Flash the window to get attention
                mainWindow.flashFrame(true);
                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.flashFrame(false);
                    }
                }, 1000);
            }
        }
    }, interval);
}

function stopFocusMonitoring() {
    if (focusMonitorInterval) {
        clearInterval(focusMonitorInterval);
        focusMonitorInterval = null;
    }
}

function registerGlobalShortcuts() {
    // Block common system shortcuts
    const shortcuts = [
        "Cmd+Q", // Mac quit
        "Ctrl+W", // Close tab/window
        "Ctrl+Alt+Delete", // Task manager (limited effectiveness)
        "Ctrl+Shift+Esc", // Task manager
        "Cmd+Tab", // Mac app switcher
        "Alt+Tab", // Windows app switcher
        "Cmd+M", // Mac minimize
        "Cmd+H", // Mac hide
        "F11", // Toggle fullscreen
        "Escape", // General escape
        "Windows", // Windows key
        "Cmd+Space", // Mac Spotlight
        "Ctrl+Escape", // Start menu
        "Alt+Escape", // Switch between windows
        "Ctrl+Alt+Tab", // Persistent task switcher
        "Cmd+Option+Esc", // Mac force quit
        "Cmd+`", // Mac app window switcher
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F12", // Function keys
        "Ctrl+Shift+T", // Reopen closed tab
        "Ctrl+N", // New window
        "Ctrl+T", // New tab
        "Ctrl+L", // Address bar
        "Ctrl+D", // Bookmark
        "Ctrl+H", // History
        "Ctrl+J", // Downloads
        "Ctrl+U", // View source
        "Ctrl+Shift+I", // Developer tools
        "Ctrl+Shift+J", // Console
        "Ctrl+Shift+C", // Inspect element
        "Alt+Space", // Window menu
        "Ctrl+Alt+L", // Lock screen
        "Cmd+Ctrl+Q", // Mac lock screen
    ];

    shortcuts.forEach((shortcut) => {
        try {
            globalShortcut.register(shortcut, () => {
                console.log(`Blocked shortcut: ${shortcut}`);
                // Bring window back to focus aggressively
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.focus();
                    mainWindow.show();
                    mainWindow.moveTop();
                    mainWindow.setAlwaysOnTop(true);
                }
                return false;
            });
        } catch (error) {
            console.log(`Failed to register shortcut: ${shortcut}`);
        }
    });
}

function enableAutoLaunch() {
    const settings = config.isDev ? config.dev : config.prod;

    if (settings.disableAutoLaunch) {
        console.log("Auto-launch disabled in development mode");
        return;
    }

    autoLauncher
        .isEnabled()
        .then((isEnabled) => {
            if (!isEnabled) {
                return autoLauncher.enable();
            }
        })
        .catch((err) => {
            console.error("Auto-launch setup failed:", err);
        });
}

// App event handlers
app.whenReady().then(() => {
    enableAutoLaunch();
    registerGlobalShortcuts();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (!isUnlocked) {
        // Respawn the window instead of quitting
        createWindow();
    } else if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", (event) => {
    if (!isUnlocked) {
        event.preventDefault();
        return false;
    }
    app.isQuiting = true;
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.show();
        }
    });
}

// //

// ! IPC handlers
ipcMain.on("unlock", () => {
    console.log("All tasks completed - processing unlock request");
    isUnlocked = true;
    
    // Stop focus monitoring
    stopFocusMonitoring();
    
    const settings = config.isDev ? config.dev : config.prod;
    
    if (settings.quitOnComplete) {
        console.log("Shutting down application - all tasks complete!");
        
        // * Disable auto-launch since tasks are complete for the day
        autoLauncher.disable().catch((err) => {
            console.log("Could not disable auto-launch:", err.message);
        });
        
        // * Clean up and quit the application
        globalShortcut.unregisterAll();
        app.isQuiting = true;
        
        if (mainWindow) {
            mainWindow.destroy();
            mainWindow = null;
        }
        
        // ? Give a brief moment for cleanup, then quit
        setTimeout(() => {
            app.quit();
        }, 500);
    } else {
        // ? Development mode: just hide temporarily for testing
        console.log("Development mode - hiding window temporarily");
        if (mainWindow) {
            mainWindow.hide();
            
            setTimeout(() => {
                isUnlocked = false;
                startFocusMonitoring(); // Restart monitoring
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    createWindow();
                }
            }, settings.unlockDuration);
        }
    }
});

// //

ipcMain.on("get-tasks", (event) => {
    let tasks = store.get("tasks", null);

    // Load sample tasks on first run
    if (!tasks) {
        try {
            const fs = require("fs");
            const sampleTasks = JSON.parse(
                fs.readFileSync(path.join(__dirname, "tasks.json"), "utf8")
            );
            store.set("tasks", sampleTasks);
            tasks = sampleTasks;
        } catch (error) {
            console.log("Could not load sample tasks:", error.message);
            tasks = [];
        }
    }

    event.reply("tasks-data", tasks);
});

ipcMain.on("save-tasks", (event, tasks) => {
    store.set("tasks", tasks);
});

ipcMain.on("reset-session", () => {
    isUnlocked = false;
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    } else {
        createWindow();
    }
});

// Clean up shortcuts on quit
app.on("will-quit", () => {
    stopFocusMonitoring();
    globalShortcut.unregisterAll();
});

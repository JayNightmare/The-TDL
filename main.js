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

function createWindow() {
    // Get configuration based on environment
    const settings = config.isDev ? config.dev : config.prod;

    // Create kiosk-style fullscreen window
    mainWindow = new BrowserWindow({
        fullscreen: !config.isDev,
        frame: false,
        alwaysOnTop: !config.isDev,
        resizable: config.isDev,
        movable: config.isDev,
        minimizable: config.isDev,
        maximizable: config.isDev,
        closable: settings.allowClose,
        skipTaskbar: false,
        kiosk: !config.isDev,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, "renderer", "preload.js"),
        },
    });

    // Disable menu bar
    Menu.setApplicationMenu(null);

    // Load the app
    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

    // Open DevTools in development
    if (config.isDev && settings.openDevTools) {
        mainWindow.webContents.openDevTools();
    }

    // Prevent window from being closed
    mainWindow.on("close", (event) => {
        if (!isUnlocked && !app.isQuiting && !settings.allowClose) {
            event.preventDefault();
            return false;
        }
    });

    // Respawn window if it's destroyed unexpectedly
    mainWindow.on("closed", () => {
        if (!isUnlocked) {
            setTimeout(() => {
                createWindow();
            }, 1000);
        }
        mainWindow = null;
    });

    // Block developer tools and other escape routes
    mainWindow.webContents.on("before-input-event", (event, input) => {
        const settings = config.isDev ? config.dev : config.prod;

        // Allow DevTools in development mode
        if (config.isDev && settings.allowDevTools) {
            return;
        }

        // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, etc.
        if (
            input.key === "F12" ||
            (input.control &&
                input.shift &&
                (input.key === "I" || input.key === "J")) ||
            (input.control && input.shift && input.key === "C")
        ) {
            event.preventDefault();
        }
    });

    // Prevent new window creation
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });
}

function registerGlobalShortcuts() {
    // Block common system shortcuts
    const shortcuts = [
        "Alt+F4", // Windows close
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
    ];

    shortcuts.forEach((shortcut) => {
        try {
            globalShortcut.register(shortcut, () => {
                // Prevent default action by doing nothing
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
    globalShortcut.unregisterAll();
});

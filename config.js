/**
 * Development Configuration
 *
 * Modify main.js behavior for development/testing by setting
 * environment variables or command line arguments.
 */

const isDev =
    process.argv.includes("--dev") || process.env.NODE_ENV === "development";

module.exports = {
    isDev,

    // Development overrides
    dev: {
        // Allow window to be closed in dev mode
        allowClose: true,

        // Disable auto-launch in dev mode
        disableAutoLaunch: true,

        // Allow some shortcuts in dev mode
        allowDevTools: true,

        // Shorter unlock duration for testing
        unlockDuration: 5000, // 5 seconds instead of 30

        // Enable DevTools
        openDevTools: true,
        
        // In dev mode, don't quit completely (for testing)
        quitOnComplete: false,

        // Less aggressive focus monitoring in dev
        focusMonitoringInterval: 1000,
    },

    // Production settings
    prod: {
        allowClose: false,
        disableAutoLaunch: false,
        allowDevTools: false,
        unlockDuration: 30000, // 30 seconds
        openDevTools: false,
        
        // In production, quit completely when tasks are done
        quitOnComplete: true,

        // Aggressive focus monitoring in production
        focusMonitoringInterval: 250,
    },
};

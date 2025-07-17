# The TDL - Task Lockdown List

A fullscreen Electron app that locks the user into a to-do list until all tasks are completed. Perfect for maintaining focus and productivity.

## Features

- **Auto-launch at startup** - Automatically starts with your system
- **Kiosk-style lockdown** - Fullscreen, frameless window with blocked shortcuts
- **Task management** - Add, complete, and delete tasks with persistent storage
- **IPC communication** - Secure communication between main and renderer processes
- **Resilient design** - Respawns if closed, blocks escape routes
- **Cross-platform** - Works on Windows, Mac, and Linux

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

```
the-tdl/
├── main.js              # Main Electron process
├── package.json         # Dependencies and build config
├── tasks.json          # Sample tasks (replaced by electron-store)
├── renderer/           # Renderer process files
│   ├── index.html      # Main UI
│   ├── styles.css      # Application styles
│   ├── app.js          # Frontend logic
│   └── preload.js      # Secure IPC bridge
└── assets/             # Icons and resources
```

## How It Works

1. **Startup**: App auto-launches and creates a fullscreen kiosk window
2. **Lockdown**: Blocks system shortcuts, prevents window closing/minimizing
3. **Task Management**: Users can add/complete tasks, progress is tracked
4. **Unlock**: When all tasks are completed, window hides for 30 seconds
5. **Reset**: Automatically returns to lockdown mode

## Building & Distribution

The app uses electron-builder for packaging:

- **Windows**: `npm run build:win` (creates NSIS installer)
- **macOS**: `npm run build:mac` (creates DMG)
- **Linux**: `npm run build:linux` (creates AppImage)

## Security Features

- Context isolation enabled
- Node integration disabled
- Preload script for secure IPC
- Blocked developer tools and shortcuts
- Prevented window manipulation

## Customization

### Adding New Tasks
Tasks are stored using electron-store and persist across sessions. The app includes sample tasks that can be modified or deleted.

### Modifying Lockdown Behavior
Edit `main.js` to adjust:
- Blocked shortcuts in `registerGlobalShortcuts()`
- Window properties in `createWindow()`
- Unlock duration (default: 30 seconds)

### Styling
Modify `renderer/styles.css` to change the visual appearance. The app uses a gradient background with glassmorphism effects.

## Development Notes

- Use `npm run dev` for development with DevTools enabled
- The app will respawn if closed unexpectedly
- Auto-launch can be disabled by commenting out `enableAutoLaunch()`
- Window focus is automatically maintained

## Future Enhancements

The codebase is structured to support:
- Native keyboard hooks for deeper system integration
- Timer-based sessions
- Task categories and priorities
- Statistics and productivity tracking
- Custom themes and layouts

## License

MIT

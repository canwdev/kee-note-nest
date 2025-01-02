import {app, BrowserWindow} from 'electron'
import * as path from 'path'
import {kdbxHelper} from './api/keepass-api'
import './api/common-api'
import './utils/server-manager'
import {electronStore} from './utils/store'
import {isDev} from './common/utils'

function createWindow() {
  const winBounds: any = electronStore.get('winBounds') || {}

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    ...winBounds,
    icon: path.join(__dirname, '../build/256x256.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const maximized = electronStore.get('maximized') || false
  if (maximized) {
    mainWindow.maximize()
  }

  mainWindow.setMenuBarVisibility(false)

  // and load the index.html of the app.
  if (isDev) {
    mainWindow.loadURL('http://localhost:3030/')
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-frontend/index.html'))
  }

  // 退出前询问
  mainWindow.on('close', (e) => {
    electronStore.set('winBounds', mainWindow.getBounds())
    electronStore.set('maximized', mainWindow.isMaximized())
    if (kdbxHelper.isNotSave) {
      console.log('[IPC_APP_CLOSING] not allow close')
      e.preventDefault() // Prevents the window from closing
      mainWindow.webContents.send('IPC_APP_CLOSING')
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    if (kdbxHelper) {
      kdbxHelper.close()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

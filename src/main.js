const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const findAllGames = require("./findAllGames");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

/** Configuração UUID */
const CONFIG_FILE_NAME = "config.conf";
const API_URL = "http://localhost:3001/user/register"; // Ajuste para produção se necessário
let appUUID = null;

const https = require("https");
const http = require("http");
const { URL } = require("url");

const ensureUUID = async () => {
  const configPath = path.join(app.getPath("userData"), CONFIG_FILE_NAME);

  try {
    const data = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(data);
    if (parsed?.uuid) {
      console.log("UUID carregado:", parsed.uuid);
      appUUID = parsed.uuid;
      return;
    } else {
      console.log("Arquivo de config inválido. Registrando novo UUID...");
    }
  } catch (error) {
    console.log("Config não encontrado. Registrando novo UUID...");
  }

  try {
    const url = new URL(API_URL);
    const client = url.protocol === "https:" ? https : http;

    const uuid = await new Promise((resolve, reject) => {
      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength("{}"),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = JSON.parse(data);
              resolve(parsed.userId);
            } else {
              reject(
                new Error(
                  `Erro ao registrar UUID: ${res.statusCode} ${res.statusMessage}`
                )
              );
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      req.write("{}"); // body vazio
      req.end();
    });

    await fs.writeFile(configPath, JSON.stringify({ uuid }), "utf-8");
    appUUID = uuid;
    console.log("Novo UUID salvo:", uuid);
  } catch (error) {
    console.error("Erro ao registrar novo UUID:", error);
    throw error;
  }
};

ipcMain.handle("add-game", async (event, game) => {
  const configPath = path.join(app.getPath("userData"), "config.conf");

  try {
    const data = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(data);

    if (!parsed.games) {
      parsed.games = [];
    }

    parsed.games.push({
      name: game.name,
      appid: game.appid,
      installPath: "",
    });

    await fs.writeFile(configPath, JSON.stringify(parsed, null, 2), "utf-8");
    console.log("Novo jogo adicionado:", game.name);
    return true;
  } catch (error) {
    console.error("Erro ao adicionar novo jogo:", error);
    return false;
  }
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Isso permite carregar recursos de origens remotas
    },
    autoHideMenuBar: true,
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; " +
              "img-src 'self' https://cdn.cloudflare.steamstatic.com https://placehold.co; " +
              "script-src 'self' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://api.steampowered.com;",
          ],
        },
      });
    }
  );

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.openDevTools();

  /** IPC para enviar o UUID para o renderer */
  ipcMain.handle("get-uuid", async () => {
    return appUUID;
  });
};

ipcMain.handle("get-config", async () => {
  const configPath = path.join(app.getPath("userData"), "config.conf");

  try {
    const data = await fs.readFile(configPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao ler config:", error);
    return null;
  }
});

// Evento padrão do Electron
app.whenReady().then(async () => {
  await ensureUUID();
  await findAllGames();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

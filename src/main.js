const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const findAllGames = require("./findAllGames");
require("dotenv").config();

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

const STEAMGRID_API_KEY = process.env.STEAMGRIDDB_API_KEY;

ipcMain.handle("update-game-images", async (event, updatedGame) => {
  const configPath = path.join(app.getPath("userData"), "config.conf");

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);

    const updatedGames = config.games.map((g) => {
      return g.name === updatedGame.name
        ? { ...g, ...updatedGame } // adiciona heroUrl, posterUrl, etc
        : g;
    });

    const newConfig = { ...config, games: updatedGames };

    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
    console.log(`💾 Imagens salvas no config.conf para: ${updatedGame.name}`);

    return true;
  } catch (e) {
    console.error("Erro ao salvar imagens no config:", e);
    return false;
  }
});

function getFromSteamGridDB(path) {
  const options = {
    hostname: "www.steamgriddb.com",
    path: `/api/v2/${path}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${STEAMGRID_API_KEY}`, // certifique-se de ter definido isso acima
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(new Error("Erro ao parsear JSON: " + data.slice(0, 100)));
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

ipcMain.handle("fetch-steamgrid-images", async (event, gameName) => {
  try {
    console.log(`🕹️ Buscando jogo: ${gameName}`);

    // 1. Buscar ID do jogo via autocomplete
    const search = await getFromSteamGridDB(
      `search/autocomplete/${encodeURIComponent(gameName)}`
    );
    const first = search?.data?.[0];

    if (!first) {
      console.warn(`⚠️ Nenhum resultado encontrado para "${gameName}"`);
      return null;
    }

    const id = first.id;
    console.log(`✅ ID encontrado: ${id}`);

    // 2. Buscar poster (600x900) via /grids
    let posterUrl = null;
    try {
      const grids = await getFromSteamGridDB(`grids/game/${id}`);
      const poster = grids?.data?.find(
        (g) => g.width === 600 && g.height === 900 && !g.nsfw
      );
      posterUrl = poster?.url || null;
      if (posterUrl) {
        console.log(`🎨 Poster encontrado: ${posterUrl}`);
      } else {
        console.warn(`⚠️ Nenhum poster 600x900 encontrado para ID ${id}`);
      }
    } catch (e) {
      console.warn("⚠️ Erro ao buscar poster:", e.message);
    }

    // 3. Buscar hero via /heroes
    let heroUrl = null;
    try {
      const heroes = await getFromSteamGridDB(`heroes/game/${id}`);
      heroUrl = heroes?.data?.[0]?.url || null;
      if (heroUrl) {
        console.log(`🏞️ Hero encontrado: ${heroUrl}`);
      } else {
        console.warn(`⚠️ Nenhum hero encontrado para ID ${id}`);
      }
    } catch (e) {
      console.warn("⚠️ Erro ao buscar hero:", e.message);
    }

    return { posterUrl, heroUrl };
  } catch (err) {
    console.error("❌ Erro geral ao buscar imagens:", err.message);
    return null;
  }
});

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

ipcMain.handle("updateGameImage", async (event, gameName, imageUrl) => {
  const configPath = path.join(app.getPath("userData"), "config.conf");

  try {
    const data = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(data);

    const game = parsed.games.find((g) => g.name === gameName);
    if (game) {
      game.imageUrl = imageUrl;
      await fs.writeFile(configPath, JSON.stringify(parsed, null, 2), "utf-8");
    }

    return true;
  } catch (error) {
    console.error("Erro ao atualizar imagem do jogo no config:", error);
    return false;
  }
});

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
      installPath: game.installPath, // <- agora vai salvar o caminho corretamente
      platform: game.platform || "Manual", // se quiser, também salva a plataforma
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
              "img-src 'self' data: blob: https://cdn.cloudflare.steamstatic.com https://placehold.co https://www.steamgriddb.com https://cdn2.steamgriddb.com; " +
              "script-src 'self' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://api.steampowered.com https://www.steamgriddb.com;",
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

ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0]; // <--- retorna apenas o path, não o objeto inteiro
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

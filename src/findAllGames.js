const path = require("path");
const fs = require("fs/promises");
const { app } = require("electron");
const vdf = require("vdf-parser");
const WinReg = require("winreg");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const CONFIG_FILE_NAME = "config.conf";
const DEFAULT_STEAM_PATH = "C:\\Program Files (x86)\\Steam";
const DEFAULT_EPIC_MANIFESTS_PATH =
  "C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests";
const DEFAULT_GOG_DB_PATH =
  "C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db";

// --------------------------- STEAM ---------------------------
async function findSteamGames() {
  try {
    const steamPath = await findSteamPath();
    const libraryVdfPath = path.join(
      steamPath,
      "steamapps",
      "libraryfolders.vdf"
    );
    const libraryVdfRaw = await fs.readFile(libraryVdfPath, "utf-8");
    const libraries = vdf.parse(libraryVdfRaw);

    const libraryPaths = [];
    for (const key in libraries.libraryfolders) {
      const item = libraries.libraryfolders[key];
      if (typeof item === "object" && item.path) {
        libraryPaths.push(item.path);
      } else if (typeof item === "string") {
        libraryPaths.push(item);
      }
    }

    const games = [];
    for (const libraryPath of libraryPaths) {
      const steamAppsPath = path.join(libraryPath, "steamapps");
      const files = await fs.readdir(steamAppsPath);

      for (const file of files) {
        if (file.startsWith("appmanifest_") && file.endsWith(".acf")) {
          const appManifestRaw = await fs.readFile(
            path.join(steamAppsPath, file),
            "utf-8"
          );
          const manifest = vdf.parse(appManifestRaw);

          const appid = parseInt(manifest.AppState.appid, 10);
          const name = manifest.AppState.name;
          const installDir = manifest.AppState.installdir;
          const fullInstallPath = path.join(
            libraryPath,
            "steamapps",
            "common",
            installDir
          );

          games.push({
            name,
            appid,
            installPath: fullInstallPath,
            platform: "Steam",
          });
        }
      }
    }

    return games;
  } catch (error) {
    console.error("Erro ao procurar jogos da Steam:", error);
    return [];
  }
}

function findSteamPath() {
  return new Promise((resolve) => {
    const regKey = new WinReg({
      hive: WinReg.HKLM,
      key: "\\SOFTWARE\\WOW6432Node\\Valve\\Steam",
    });

    regKey.get("InstallPath", (err, item) => {
      if (err || !item?.value) {
        console.warn("Não encontrado no registro, usando caminho padrão.");
        resolve(DEFAULT_STEAM_PATH);
      } else {
        console.log("Steam encontrado no registro:", item.value);
        resolve(item.value);
      }
    });
  });
}

// --------------------------- EPIC GAMES ---------------------------
async function findEpicGames() {
  try {
    const epicManifestsPath = await findEpicManifestsPath();
    const files = await fs.readdir(epicManifestsPath);
    const games = [];

    for (const file of files) {
      if (file.endsWith(".item")) {
        const content = await fs.readFile(
          path.join(epicManifestsPath, file),
          "utf-8"
        );
        const manifest = JSON.parse(content);
        games.push({
          name: manifest.DisplayName,
          appid: manifest.AppName,
          installPath: manifest.InstallLocation,
          platform: "Epic Games",
        });
      }
    }

    return games;
  } catch (error) {
    console.error("Erro ao procurar jogos da Epic Games:", error);
    return [];
  }
}

function findEpicManifestsPath() {
  return new Promise((resolve) => {
    const regKey = new WinReg({
      hive: WinReg.HKLM,
      key: "\\\\SOFTWARE\\\\WOW6432Node\\\\Epic Games\\\\EpicGamesLauncher",
    });

    regKey.get("AppDataPath", (err, item) => {
      if (err || !item?.value) {
        console.warn(
          "Epic Games Launcher não encontrado no registro, usando caminho padrão."
        );
        resolve(DEFAULT_EPIC_MANIFESTS_PATH);
      } else {
        console.log("Epic Games Launcher encontrado no registro:", item.value);
        -resolve(path.join(item.value, "Data", "Manifests")); // ERRADO
        +resolve(path.join(item.value, "Manifests")); // CERTO
      }
    });
  });
}

// --------------------------- GOG ---------------------------
async function findGogGames() {
  try {
    const gogDbPath = await findGogDbPath();
    const db = await open({ filename: gogDbPath, driver: sqlite3.Database });

    const rows = await db.all("SELECT title, install_path FROM InstalledGames");
    await db.close();

    return rows.map((row) => ({
      name: row.title,
      installPath: row.install_path,
      platform: "GOG Galaxy",
    }));
  } catch (error) {
    console.error("Erro ao procurar jogos da GOG:", error);
    return [];
  }
}

function findGogDbPath() {
  return new Promise((resolve) => {
    const regKey = new WinReg({
      hive: WinReg.HKLM,
      key: "\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient",
    });

    regKey.get("path", (err, item) => {
      if (err || !item?.value) {
        console.warn(
          "GOG Galaxy não encontrado no registro, usando caminho padrão."
        );
        resolve(DEFAULT_GOG_DB_PATH);
      } else {
        console.log("GOG Galaxy encontrado no registro:", item.value);
        resolve(path.join(item.value, "storage", "galaxy-2.0.db"));
      }
    });
  });
}

// --------------------------- FINAL: JUNTA TUDO ---------------------------
async function findAllGames() {
  const steamGames = await findSteamGames();
  const epicGames = await findEpicGames();
  const gogGames = await findGogGames();

  const allGames = [...steamGames, ...epicGames, ...gogGames];
  console.log("Todos os jogos encontrados:", allGames);

  await updateConfWithGames(allGames);
}

async function updateConfWithGames(newGames) {
  const configPath = path.join(app.getPath("userData"), CONFIG_FILE_NAME);

  try {
    const data = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(data);

    if (!parsed.games) {
      parsed.games = [];
    }

    const existingGames = parsed.games;

    // Copiar os jogos atuais
    const mergedGames = [...existingGames];

    for (const newGame of newGames) {
      // Corrigir path para Windows
      const normalizedNewPath = path
        .normalize(newGame.installPath || "")
        .toLowerCase();

      // Verifica se já existe por caminho OU por (nome + plataforma)
      const existingIndex = existingGames.findIndex((game) => {
        const normalizedExistingPath = path
          .normalize(game.installPath || "")
          .toLowerCase();
        return (
          normalizedExistingPath === normalizedNewPath ||
          (game.name.toLowerCase() === newGame.name.toLowerCase() &&
            game.platform === newGame.platform)
        );
      });

      if (existingIndex !== -1) {
        // Se já existe mas o caminho mudou, atualiza
        const existingGame = mergedGames[existingIndex];
        if (
          normalizedNewPath &&
          path.normalize(existingGame.installPath || "").toLowerCase() !==
            normalizedNewPath
        ) {
          console.log(`Atualizando caminho do jogo: ${newGame.name}`);
          existingGame.installPath = newGame.installPath; // Atualiza o caminho
        }
      } else {
        // Não existe ainda, adiciona
        mergedGames.push(newGame);
      }
    }

    // Ordena: Steam > Epic Games > GOG Galaxy > Manual > Outros
    const platformOrder = {
      Steam: 1,
      "Epic Games": 2,
      "GOG Galaxy": 3,
      Manual: 4,
    };

    mergedGames.sort((a, b) => {
      const orderA = platformOrder[a.platform] || 99;
      const orderB = platformOrder[b.platform] || 99;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });

    parsed.games = mergedGames;

    await fs.writeFile(configPath, JSON.stringify(parsed, null, 2), "utf-8");
    console.log(
      "Arquivo conf atualizado com jogos mesclados, corrigidos e ordenados."
    );
  } catch (error) {
    console.error("Erro ao atualizar o arquivo conf:", error);
  }
}

module.exports = findAllGames;

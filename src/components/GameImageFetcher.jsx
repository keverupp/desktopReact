import React, { useEffect } from "react";

export default function GameImageFetcher({ game, onUpdate }) {
  useEffect(() => {
    const appid = game.appid?.toString().trim();

    // Verifica se o appid é inválido (vazio ou contém letras)
    const isAppidInvalid = !appid || isNaN(Number(appid));

    if (!isAppidInvalid || game.heroUrl || game.posterUrl) return;

    const fetchImages = async () => {
      try {
        const result = await window.electronAPI.getSteamGridImages(game.name);

        if (result?.heroUrl || result?.posterUrl) {
          const updatedGame = {
            ...game,
            heroUrl: result.heroUrl,
            posterUrl: result.posterUrl,
          };

          onUpdate(updatedGame); // Atualiza visualmente
          window.electronAPI.updateGameImages?.(updatedGame); // Salva no config
        }
      } catch (err) {
        console.error("Erro ao buscar imagens da SteamGridDB:", err);
      }
    };

    fetchImages();
  }, [game, onUpdate]);

  return null;
}

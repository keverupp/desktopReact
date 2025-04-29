import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import GameImageFetcher from "../components/GameImageFetcher.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [newGamePath, setNewGamePath] = useState("");
  const [newGameName, setNewGameName] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function fetchGames() {
      const config = await window.electronAPI.getConfig();
      if (config?.games) {
        setGames(config.games);
      }
    }
    fetchGames();
  }, []);

  const handleImageError = (e, game) => {
    if (e.target.dataset.errorHandled) return;
    e.target.dataset.errorHandled = "true";
    e.target.src = `https://placehold.co/600x900?text=${encodeURIComponent(
      game.name
    )}`;
  };

  const handleSelectPath = async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      setNewGamePath(folderPath);
    }
  };

  const handleAddGame = async () => {
    if (!newGameName.trim() || !newGamePath.trim()) return;
    setIsSearching(true);

    try {
      await window.electronAPI.addGame({
        name: newGameName.trim(),
        appid: "",
        installPath: newGamePath.trim(),
        platform: "Manual",
      });

      setGames((prev) => [
        ...prev,
        {
          name: newGameName.trim(),
          appid: "",
          installPath: newGamePath.trim(),
          platform: "Manual",
        },
      ]);

      setNewGameName("");
      setNewGamePath("");
      document.getElementById("add_game_modal")?.close();
    } catch (error) {
      console.error("Erro ao adicionar jogo:", error);
      alert("Erro ao adicionar jogo.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-base-200">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-base-content">Meus Jogos</h1>
        <div className="flex gap-2">
          <button
            onClick={() =>
              document.getElementById("add_game_modal").showModal()
            }
            className="btn btn-primary btn-outline"
          >
            Adicionar Jogo
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/newpage")}
          >
            Ir para nova página
          </button>
        </div>
      </div>

      <dialog id="add_game_modal" className="modal">
        <div className="modal-box bg-base-100">
          <h2 className="text-xl font-bold mb-4 text-base-content">
            Adicionar Jogo
          </h2>

          <div className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Caminho do Jogo:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Selecione o caminho..."
                  value={newGamePath}
                  readOnly
                />
                <button onClick={handleSelectPath} className="btn btn-neutral">
                  Procurar
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Nome do Jogo:</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Nome do jogo..."
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
              />
            </div>

            <div className="modal-action">
              <form method="dialog" className="flex gap-2">
                <button className="btn btn-outline">Cancelar</button>
                <button
                  onClick={handleAddGame}
                  disabled={isSearching}
                  className="btn btn-success btn-outline"
                >
                  {isSearching ? "Buscando..." : "Adicionar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </dialog>

      {games.length > 0 ? (
        <Swiper
          modules={[Navigation, Pagination, A11y]}
          spaceBetween={8}
          slidesPerView={2}
          navigation
          pagination={{ clickable: true }}
          grabCursor
          className="w-full"
          breakpoints={{
            480: { slidesPerView: 3 },
            640: { slidesPerView: 4 },
            768: { slidesPerView: 6 },
            1024: { slidesPerView: 8 },
            1280: { slidesPerView: 9 },
            1536: { slidesPerView: 10 },
          }}
        >
          {games.map((game, index) => {
            const getGameImage = (game) => {
              if (game.posterUrl) {
                return game.posterUrl;
              }
              if (game.heroUrl) {
                return game.heroUrl;
              }
              if (game.appid) {
                return `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900_2x.jpg`;
              }
              return `https://placehold.co/600x900?text=${encodeURIComponent(
                game.name
              )}`;
            };

            return (
              <SwiperSlide
                key={game.appid || game.name}
                className="flex justify-center"
              >
                <GameImageFetcher
                  game={game}
                  onUpdate={(updatedGame) => {
                    setGames((prevGames) =>
                      prevGames.map((g, i) => (i === index ? updatedGame : g))
                    );
                  }}
                />

                <div
                  className="group w-[140px] h-[220px] rounded-xl overflow-hidden shadow-md bg-base-100 relative transition-transform duration-300 cursor-pointer"
                  onClick={() => {
                    localStorage.setItem("selectedGame", JSON.stringify(game));
                    navigate(`/game/${game.appid || "sem-id"}`);
                  }}
                >
                  <img
                    src={getGameImage(game)}
                    alt={game.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => handleImageError(e, game)}
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-base-300 bg-opacity-80 text-base-content p-1 text-center text-xs truncate">
                    {game.name}
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      ) : (
        <div className="text-base-content">Carregando jogos...</div>
      )}
    </div>
  );
}

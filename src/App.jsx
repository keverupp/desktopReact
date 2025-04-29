import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function App() {
  const [games, setGames] = useState([]);
  const [showForm, setShowForm] = useState(false);
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
        appid: "", // Como não busca Steam, pode ser vazio
        installPath: newGamePath.trim(),
        platform: "Manual", // Ou deixe "Steam" se preferir um padrão
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
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao adicionar jogo:", error);
      alert("Erro ao adicionar jogo.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-white text-2xl">Meus Jogos</div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-300 transition"
        >
          Adicionar Jogo
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-neutral-800 p-6 rounded-lg w-96 relative">
            <h2 className="text-xl font-bold mb-4 text-white">
              Adicionar Jogo
            </h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-white text-sm">Caminho do Jogo:</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="p-2 rounded bg-neutral-700 text-white flex-1"
                    placeholder="Selecione o caminho..."
                    value={newGamePath}
                    readOnly
                  />
                  <button
                    onClick={handleSelectPath}
                    className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-400"
                  >
                    Procurar
                  </button>
                </div>
              </div>

              <div>
                <label className="text-white text-sm">Nome do Jogo:</label>
                <input
                  type="text"
                  className="p-2 mt-1 rounded bg-neutral-700 text-white w-full"
                  placeholder="Nome do jogo..."
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddGame}
                  disabled={isSearching}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-400"
                >
                  {isSearching ? "Buscando..." : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Jogos */}
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
            768: { slidesPerView: 5 },
            1024: { slidesPerView: 8 },
            1280: { slidesPerView: 9 },
            1536: { slidesPerView: 10 },
          }}
        >
          {games.map((game) => (
            <SwiperSlide
              key={game.appid || game.name}
              className="flex justify-center"
            >
              <div className="group w-[140px] h-[220px] rounded-lg overflow-hidden shadow-lg relative transition-all">
                <img
                  src={
                    game.imageUrl
                      ? game.imageUrl
                      : game.appid
                      ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900_2x.jpg`
                      : `https://placehold.co/600x900?text=${encodeURIComponent(
                          game.name
                        )}`
                  }
                  alt={game.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => handleImageError(e, game)}
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-1 text-center text-xs truncate">
                  {game.name}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <div className="text-white">Carregando jogos...</div>
      )}
    </div>
  );
}

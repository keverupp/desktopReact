import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function App() {
  const [games, setGames] = useState([]);
  const [showForm, setShowForm] = useState(false);
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
    console.log(`Falha ao carregar imagem para ${game.name}`);
    e.target.dataset.errorHandled = "true";
    e.target.src = "https://placehold.co/600x900?text=Imagem+Indisponível";
  };

  const handleAddGame = async () => {
    if (!newGameName.trim()) return;

    setIsSearching(true);

    try {
      const response = await fetch(
        "https://api.steampowered.com/ISteamApps/GetAppList/v2/"
      );
      const data = await response.json();
      const allApps = data.applist.apps;

      const matchedApp = allApps.find((app) =>
        app.name.toLowerCase().includes(newGameName.toLowerCase())
      );

      if (matchedApp) {
        console.log("Encontrado:", matchedApp);

        // Adiciona no config via IPC
        await window.electronAPI.addGame(matchedApp);

        // Atualiza o estado local
        setGames((prev) => [
          ...prev,
          { name: matchedApp.name, appid: matchedApp.appid, installPath: "" },
        ]);

        setNewGameName("");
        setShowForm(false);
      } else {
        alert("Jogo não encontrado!");
      }
    } catch (error) {
      console.error("Erro ao buscar jogos:", error);
      alert("Erro ao buscar jogos.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-white text-2xl">Meus Jogos</div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-300 transition"
        >
          {showForm ? "Cancelar" : "Adicionar Jogo"}
        </button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-2 mb-6">
          <input
            type="text"
            className="p-2 rounded bg-neutral-800 text-white"
            placeholder="Nome do jogo..."
            value={newGameName}
            onChange={(e) => setNewGameName(e.target.value)}
          />
          <button
            onClick={handleAddGame}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-400 transition"
            disabled={isSearching}
          >
            {isSearching ? "Buscando..." : "Adicionar"}
          </button>
        </div>
      )}

      {/* Carrossel */}
      {games.length > 0 ? (
        <Swiper
          modules={[Navigation, Pagination, A11y]}
          spaceBetween={20}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          grabCursor={true}
          className="w-full"
          breakpoints={{
            640: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1280: { slidesPerView: 4 },
          }}
        >
          {games.map((game) => (
            <SwiperSlide key={game.appid} className="flex justify-center">
              <div className="group w-[250px] sm:w-[300px] h-[375px] sm:h-[450px] rounded-lg overflow-hidden shadow-lg relative transition-all">
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900_2x.jpg`}
                  alt={game.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => handleImageError(e, game)}
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-center text-sm truncate">
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

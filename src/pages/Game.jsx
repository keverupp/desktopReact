import React from "react";
import { useNavigate } from "react-router-dom";

export default function Game() {
  const navigate = useNavigate();

  // Pega o jogo salvo no localStorage
  const selectedGame = JSON.parse(localStorage.getItem("selectedGame"));

  if (!selectedGame)
    return <p className="text-white p-4">Jogo não encontrado.</p>;

  const { name, appid, heroUrl, posterUrl } = selectedGame;

  const getHeroImage = () => {
    if (heroUrl) return heroUrl;
    if (appid)
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_hero.jpg`;
    return `https://placehold.co/1920x600?text=${encodeURIComponent(name)}`;
  };

  const getPosterImage = () => {
    if (posterUrl) return posterUrl;
    if (appid)
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900_2x.jpg`;
    return `https://placehold.co/600x900?text=${encodeURIComponent(name)}`;
  };

  return (
    <div className="bg-base-100 text-white min-h-screen">
      {/* Hero (sem logo) */}
      <div className="relative h-64 md:h-96 w-full">
        <img
          src={getHeroImage()}
          alt="Hero"
          className="w-full h-full object-cover"
          onError={(e) =>
            (e.target.src = `https://placehold.co/1920x600?text=${encodeURIComponent(
              name
            )}`)
          }
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center"></div>
      </div>

      {/* Conteúdo */}
      <div className="p-6 flex flex-col md:flex-row gap-6">
        <img
          src={getPosterImage()}
          alt="Poster"
          className="w-48 rounded-xl shadow-lg object-cover"
          onError={(e) =>
            (e.target.src = `https://placehold.co/600x900?text=${encodeURIComponent(
              name
            )}`)
          }
        />
        <div>
          <h2 className="text-2xl font-bold mb-2">{name}</h2>
          <p className="text-gray-300">
            Esta é uma página de exemplo para exibir as imagens de um jogo
            usando os dados do seu save.
          </p>
          <button
            className="mt-4 btn btn-outline btn-secondary"
            onClick={() => navigate(-1)}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

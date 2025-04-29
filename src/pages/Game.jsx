import React from "react";
import { useNavigate } from "react-router-dom";

export default function Game() {
  const navigate = useNavigate();
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
      {/* Hero com responsividade máxima */}
      <div className="relative w-full min-h-[200px] aspect-[3/1] sm:aspect-[3.5/1] md:aspect-[4/1] lg:aspect-[5/1] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
      </div>

      {/* Conteúdo sobreposto ao hero */}
      <div className="relative z-20 -mt-28 sm:-mt-32 md:-mt-40 px-4 sm:px-6 md:px-10 xl:px-24">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
          <img
            src={getPosterImage()}
            alt="Poster"
            className="w-[40vw] sm:w-32 md:w-40 lg:w-52 xl:w-60 min-w-[120px] max-w-[220px] rounded-xl shadow-lg object-cover border border-white/10"
            onError={(e) =>
              (e.target.src = `https://placehold.co/600x900?text=${encodeURIComponent(
                name
              )}`)
            }
          />
          <div className="mt-2 sm:mt-8 flex-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 break-words">
              {name}
            </h2>
            <p className="text-gray-300 text-sm sm:text-base max-w-full mb-4">
              Esta é uma página de exemplo para exibir as imagens de um jogo
              usando os dados do seu save.
            </p>
            <button
              className="btn btn-outline btn-secondary"
              onClick={() => navigate(-1)}
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { HashRouter, Routes, Route } from "react-router-dom";
import React from "react";
import Home from "./pages/Home.jsx";
import Game from "./pages/Game.jsx";
import NewPage from "./pages/NewPage.jsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:id" element={<Game />} />
        <Route path="/newpage" element={<NewPage />} />
      </Routes>
    </HashRouter>
  );
}

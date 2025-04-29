import React from "react";
import { useNavigate } from "react-router-dom";

export default function NewPage() {
  const navigate = useNavigate();
  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold">Nova Página</h1>
      <p>Essa é uma rota nova para testes.</p>
      <button className="btn btn-primary" onClick={() => navigate("/")}>
        Inicio
      </button>
    </div>
  );
}

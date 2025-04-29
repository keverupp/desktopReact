import React, { useEffect, useState } from "react";
import { Ellipsis } from "lucide-react";

export default function GroupManager() {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [alertType, setAlertType] = useState("success"); // success | error
  const [groupMembers, setGroupMembers] = useState([]);

  useEffect(() => {
    async function fetchGroups() {
      const config = await window.electronAPI.getConfig();
      if (!config?.uuid) return;

      const uid = config.uuid;
      setUserId(uid);

      try {
        const response = await fetch("http://localhost:3001/group/my-groups", {
          headers: { "x-user-id": uid },
        });
        if (!response.ok) throw new Error("Erro ao buscar grupos.");

        const data = await response.json();
        setGroups(data.groups || []);
        localStorage.setItem("groups", JSON.stringify(data.groups || []));
      } catch (error) {
        console.error("Erro ao buscar grupos:", error);
        const cached = localStorage.getItem("groups");
        if (cached) setGroups(JSON.parse(cached));
      }
    }

    fetchGroups();
  }, []);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleCreateGroup = async () => {
    if (!userId || !groupName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/group/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: groupName.trim() }),
      });
      if (!response.ok) throw new Error("Erro ao criar grupo.");

      const data = await response.json();
      const newGroup = { id: data.groupId, name: groupName.trim() };
      const updatedGroups = [...groups, newGroup];
      setGroups(updatedGroups);
      setGroupName("");
      localStorage.setItem("groups", JSON.stringify(updatedGroups));
      showToast("Grupo criado com sucesso!");
    } catch (error) {
      showToast("Erro ao criar grupo.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (group) => {
    setEditingGroup(group);
    setEditName(group.name);
    document.getElementById("edit_group_modal").showModal();
  };

  const handleEditGroup = async () => {
    if (!editingGroup || !editName.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:3001/group/${editingGroup.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({ name: editName.trim() }),
        }
      );

      if (!response.ok) throw new Error("Erro ao editar grupo.");

      const updatedGroups = groups.map((g) =>
        g.id === editingGroup.id ? { ...g, name: editName.trim() } : g
      );
      setGroups(updatedGroups);
      localStorage.setItem("groups", JSON.stringify(updatedGroups));
      document.getElementById("edit_group_modal").close();
      showToast("Grupo editado com sucesso!");
    } catch (error) {
      showToast("Erro ao editar grupo.", "error");
    }
  };

  const handleListMembers = async (group) => {
    try {
      const response = await fetch(
        `http://localhost:3001/group/members/${group.id}`,
        {
          method: "GET",
          headers: {
            "x-user-id": userId,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao listar membros.");
      }

      const data = await response.json();
      setGroupMembers(data.members);
      document.getElementById("group_members_modal").showModal();
    } catch (error) {
      showToast(error.message || "Erro ao listar membros.", "error");
    }
  };

  const confirmDeleteGroup = (groupId) => {
    setDeleteGroupId(groupId);
    document.getElementById("delete_group_modal").showModal();
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/group/${deleteGroupId}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": userId,
          },
        }
      );

      if (!response.ok) throw new Error("Erro ao excluir grupo.");

      const updatedGroups = groups.filter((g) => g.id !== deleteGroupId);
      setGroups(updatedGroups);
      localStorage.setItem("groups", JSON.stringify(updatedGroups));
      showToast("Grupo excluído com sucesso!");
      document.getElementById("delete_group_modal").close();
    } catch (error) {
      showToast("Erro ao excluir grupo.", "error");
    }
  };

  return (
    <div className="bg-base-100 text-base-content p-4 rounded-xl shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-4">Grupos</h2>

      {/* Toast container do DaisyUI */}
      <div className="toast toast-top toast-end z-50">
        {toasts.map((toast) => (
          <div key={toast.id} className={`alert alert-${toast.type} shadow-lg`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Nome do novo grupo"
          className="input input-bordered text-base w-full sm:w-auto flex-1"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={handleCreateGroup}
          disabled={!userId || loading}
        >
          {loading ? "Criando..." : "Criar Grupo"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {groups.length > 0 ? (
          groups.map((group) => (
            <div
              key={group.id}
              className="relative p-4 bg-neutral text-base rounded-lg shadow flex flex-col gap-2"
            >
              {/* Botão de Opções */}
              <div className="absolute top-2 right-2 dropdown dropdown-end">
                <button tabIndex={0} className="btn btn-xs btn-ghost text-base">
                  <Ellipsis size={18} strokeWidth={2} />
                </button>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-[1] menu p-2 shadow bg-base-100 text-base rounded-box w-32"
                >
                  <li>
                    <button
                      className="w-full text-left"
                      onClick={() => handleListMembers(group)}
                    >
                      Membros
                    </button>
                    <button
                      className="w-full text-left"
                      onClick={() => openEditDialog(group)}
                    >
                      Editar
                    </button>
                  </li>
                  <li>
                    <button
                      className="w-full text-left"
                      onClick={() => confirmDeleteGroup(group.id)}
                    >
                      Excluir
                    </button>
                  </li>
                </ul>
              </div>

              {/* Conteúdo do card */}
              <h3 className="font-semibold text-md">{group.name}</h3>
              <div className="text-xs opacity-80 break-all">{group.id}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400 col-span-full">
            Nenhum grupo encontrado.
          </p>
        )}
      </div>

      {/* Modal de membros grupo */}
      <dialog id="group_members_modal" className="modal">
        <div className="modal-box bg-neutral text-white">
          <h3 className="font-bold text-lg mb-2">Membros do Grupo</h3>
          <ul className="list-disc list-inside space-y-1 max-h-64 overflow-y-auto">
            {groupMembers.length > 0 ? (
              groupMembers.map((member, idx) => (
                <li key={idx}>
                  <span className="font-mono text-sm">{member.id}</span>
                  <div className="text-xs opacity-60">
                    Criado em: {new Date(member.createdAt).toLocaleString()}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm opacity-70">Nenhum membro encontrado.</li>
            )}
          </ul>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm">Fechar</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Modal de edição */}
      <dialog id="edit_group_modal" className="modal">
        <div className="modal-box bg-base-100">
          <h3 className="text-lg font-bold mb-4 text-base-content">
            Editar Nome do Grupo
          </h3>
          <input
            type="text"
            className="input input-bordered w-full mb-4"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <form method="dialog">
              <button className="btn">Cancelar</button>
            </form>
            <button className="btn btn-success" onClick={handleEditGroup}>
              Salvar
            </button>
          </div>
        </div>
      </dialog>

      {/* Modal de confirmação de exclusão */}
      <dialog id="delete_group_modal" className="modal">
        <div className="modal-box bg-base-100">
          <h3 className="text-lg font-bold mb-4 text-base-content">
            Tem certeza que deseja excluir este grupo?
          </h3>
          <div className="flex gap-2 justify-end">
            <form method="dialog">
              <button className="btn">Cancelar</button>
            </form>
            <button className="btn btn-error" onClick={handleDeleteGroup}>
              Excluir
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

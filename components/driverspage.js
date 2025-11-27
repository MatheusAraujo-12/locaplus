;(function () {
// src/components/DriversPage.js
const { useEffect, useState } = React;

const DriversPage = ({ db, userData, appInstanceId, showAlert }) => {
  const {
    collection,
    query,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
  } = window.firebase || {};

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState(null);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [driverToView, setDriverToView] = useState(null);

  if (!db) {
    return (
      <div className="p-4 text-red-600">
        Erro: banco de dados não inicializado.
      </div>
    );
  }

  const companyId = userData?.companyId;
  const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

  // -------------- ASSINATURA FIRESTORE --------------
  useEffect(() => {
    if (!db || !companyId) return;

    const q = query(collection(db, `${basePath}/drivers`));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setDrivers(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar motoristas:", err);
        setLoading(false);
        showAlert && showAlert("Erro ao carregar motoristas.", "error");
      }
    );

    return () => unsub && unsub();
  }, [db, basePath, companyId, showAlert]);

  // -------------- AÇÕES --------------

  const handleAddDriver = () => {
    setDriverToEdit(null);
    setShowDriverModal(true);
  };

  const handleEditDriver = (driver) => {
    setDriverToEdit(driver);
    setShowDriverModal(true);
  };

  const handleSaveDriver = async (driverPayload) => {
    if (!companyId) return;
    const { id, ...rest } = driverPayload;

    try {
      if (id) {
        await updateDoc(doc(db, `${basePath}/drivers`, id), rest);
        showAlert && showAlert("Motorista atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, `${basePath}/drivers`), {
          ...rest,
          companyId,
          createdAt: new Date(),
        });
        showAlert && showAlert("Motorista criado com sucesso!", "success");
      }
      setShowDriverModal(false);
      setDriverToEdit(null);
    } catch (e) {
      console.error("Erro ao salvar motorista:", e);
      showAlert && showAlert("Erro ao salvar motorista.", "error");
    }
  };

  const handleAskDeleteDriver = (driver) => {
    setDriverToDelete(driver);
  };

  const handleConfirmDeleteDriver = async () => {
    if (!driverToDelete || !companyId) return;

    try {
      await deleteDoc(doc(db, `${basePath}/drivers`, driverToDelete.id));
      showAlert && showAlert("Motorista apagado com sucesso.", "success");
    } catch (e) {
      console.error("Erro ao apagar motorista:", e);
      showAlert && showAlert("Erro ao apagar motorista.", "error");
    } finally {
      setDriverToDelete(null);
    }
  };

  const renderStars = (rating) => {
    const value = Number(rating) || 0;
    const max = 5;
    return (
      <span className="inline-flex gap-0.5 text-yellow-500 text-xs">
        {Array.from({ length: max }).map((_, i) => {
          const index = i + 1;
          return (
            <i
              key={index}
              className={index <= value ? "fas fa-star" : "far fa-star"}
            />
          );
        })}
      </span>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Carregando motoristas..." />;
  }

  // -------------- RENDER --------------

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          Motoristas
        </h1>
        <button
          onClick={handleAddDriver}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
        >
          <i className="fas fa-plus mr-2" />
          Adicionar
        </button>
      </div>

      {/* Lista em cards (mobile first) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {drivers.map((d) => {
          const rawCpf =
            typeof d.cpf === "string" ? d.cpf : d.cpf?.toString?.() || "";
          const cpfVisible = rawCpf ? rawCpf.replace(/\D/g, "") : "";
          const cpfPrefix =
            cpfVisible.length >= 3 ? cpfVisible.slice(0, 3) : cpfVisible;

          return (
            <div
              key={d.id}
              className="bg-white rounded-xl shadow-sm p-3 flex flex-col justify-between border border-gray-100"
            >
              {/* Topo: nome + botão ver */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {d.name || "Sem nome"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    CPF: {cpfPrefix ? `${cpfPrefix}***` : "-"}
                  </p>
                </div>

                <button
                  onClick={() => setDriverToView(d)}
                  className="text-gray-500 hover:text-blue-600 text-sm"
                  title="Ver detalhes"
                >
                  <i className="fas fa-eye" />
                </button>
              </div>

              {/* Rodapé: estrelas + ações */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  {renderStars(d.rating)}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditDriver(d)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    title="Editar"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    onClick={() => handleAskDeleteDriver(d)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title="Excluir"
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {drivers.length === 0 && (
        <p className="text-center text-gray-500 mt-6 text-sm">
          Nenhum motorista cadastrado.
        </p>
      )}

      {/* Modal de formulário (criar/editar) */}
      {showDriverModal && (
        <DriverFormModal
          driver={driverToEdit}
          onClose={() => {
            setShowDriverModal(false);
            setDriverToEdit(null);
          }}
          onSave={handleSaveDriver}
        />
      )}

      {/* Modal de confirmar exclusão */}
      {driverToDelete && (
        <DeleteConfirmationModal
          onConfirm={handleConfirmDeleteDriver}
          onCancel={() => setDriverToDelete(null)}
          title="Apagar Motorista"
          message={`Tem certeza que deseja apagar o motorista "${driverToDelete.name}"?`}
        />
      )}

      {/* Modal de detalhes do motorista (olho) */}
      {driverToView && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-md">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-bold text-gray-800">
                Detalhes do Motorista
              </h2>
              <button
                onClick={() => setDriverToView(null)}
                className="text-gray-500 hover:text-gray-800"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold text-gray-700">Nome:</span>{" "}
                {driverToView.name || "-"}
              </p>
              <p>
                <span className="font-semibold text-gray-700">CPF:</span>{" "}
                {driverToView.cpf || "-"}
              </p>
              <p>
                <span className="font-semibold text-gray-700">Telefone:</span>{" "}
                {driverToView.phone || "-"}
              </p>
              <p>
                <span className="font-semibold text-gray-700">E-mail:</span>{" "}
                {driverToView.email || "-"}
              </p>
              <p>
                <span className="font-semibold text-gray-700">
                  Score Serasa:
                </span>{" "}
                {typeof driverToView.serasaScore === "number"
                  ? driverToView.serasaScore
                  : "-"}
              </p>
              <p className="flex items-center gap-1">
                <span className="font-semibold text-gray-700">
                  Nota interna:
                </span>
                {renderStars(driverToView.rating)}
              </p>

              {Array.isArray(driverToView.emergencyContacts) &&
                driverToView.emergencyContacts.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <p className="font-semibold text-gray-700 text-xs mb-1">
                      Contatos de emergência
                    </p>
                    <div className="space-y-1">
                      {driverToView.emergencyContacts.map((c, idx) => (
                        <p key={idx} className="text-xs text-gray-700">
                          <span className="font-semibold">
                            {c.name || "Contato"}:
                          </span>{" "}
                          {c.phone || "-"}{" "}
                          {c.relation && (
                            <span className="text-gray-500">
                              ({c.relation})
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

              {driverToView.address && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <p className="font-semibold text-gray-700 text-xs mb-1">
                    Endereço
                  </p>
                  <p className="text-xs text-gray-700">
                    {driverToView.address.street || ""}{" "}
                    {driverToView.address.city && (
                      <>- {driverToView.address.city}</>
                    )}
                    {driverToView.address.state && (
                      <> / {driverToView.address.state}</>
                    )}
                    {driverToView.address.zip && (
                      <> - CEP {driverToView.address.zip}</>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDriverToView(null)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const d = driverToView;
                  setDriverToView(null);
                  handleEditDriver(d);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.DriversPage = DriversPage;
})();

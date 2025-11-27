;(function () {
// src/components/FleetListPage.js
const { useEffect, useState, useMemo } = React;

const FleetListPage = ({
  user,
  userData,
  showAlert,
  onSelectCar,
  db,
  appInstanceId,
}) => {
  const {
    collection,
    query,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    getDocs,
  } = window.firebase || {};
  const [cars, setCars] = useState([]);
  const [drivers, setDrivers] = useState([]); // <-- NOVO
  const [isLoading, setIsLoading] = useState(true);

  const [showCarModal, setShowCarModal] = useState(false);
  const [carToEdit, setCarToEdit] = useState(null);

  const [showImportModal, setShowImportModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  if (!db) {
    return (
      <div className="p-4 text-red-600">Erro: DB não inicializado.</div>
    );
  }

  const companyId = userData?.companyId;
  const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

  // -------- Assinatura da frota --------
  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, `${basePath}/cars`));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setCars(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar frota:", err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [db, basePath, companyId]);

  // -------- Assinatura de motoristas (para o select do carro) --------
  useEffect(() => {
    if (!companyId) return;

    const q = query(collection(db, `${basePath}/drivers`));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setDrivers(list);
      },
      (err) => {
        console.error("Erro ao carregar motoristas:", err);
      }
    );

    return () => unsub();
  }, [db, basePath, companyId]);

  // -------- Utils de status / revisão --------

  const normalizeStatus = (status) =>
    (status || "").toString().toLowerCase().trim();

  const renderStatusBadge = (statusRaw) => {
    const status = normalizeStatus(statusRaw);

    if (!status) return null;

    let label = status;
    let classes =
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold";

    switch (status) {
      case "active":
      case "rodando":
        label = "Rodando";
        classes += " bg-green-100 text-green-700";
        break;
      case "maintenance":
      case "oficina":
        label = "Na oficina";
        classes += " bg-yellow-100 text-yellow-700";
        break;
      case "stopped":
      case "parado":
        label = "Parado";
        classes += " bg-gray-100 text-gray-700";
        break;
      default:
        label = statusRaw || "Indefinido";
        classes += " bg-blue-100 text-blue-700";
    }

    return <span className={classes}>{label}</span>;
  };

  // Revisão atrasada com base em KM de troca de óleo
  const isMaintenanceOverdue = (car) => {
    const current = Number(car.currentMileage || 0);
    const lastOil = Number(car.lastOilChange || 0);
    const interval = Number(car.oilChangeInterval || 0);

    if (!current || !interval) return false;
    if (current <= 0 || interval <= 0) return false;

    const diff = current - lastOil;
    return diff >= interval;
  };

  // -------- Ações --------

  const handleAddCar = () => {
    setCarToEdit(null);
    setShowCarModal(true);
  };

  const handleEditCar = (car) => {
    setCarToEdit(car);
    setShowCarModal(true);
  };

  const handleSaveCar = async (carData) => {
    if (!companyId) return;

    const prepared = {
      ...carData,
      currentMileage: Number(carData.currentMileage || 0),
      lastOilChange: Number(carData.lastOilChange || 0),
      oilChangeInterval: Number(carData.oilChangeInterval || 0),
      avgConsumption: carData.avgConsumption
        ? parseFloat(carData.avgConsumption)
        : null,
      assignedDriverId: carData.assignedDriverId || "",
      companyId,
    };

    const { id, ...dataToSave } = prepared;

    try {
      if (id) {
        await updateDoc(doc(db, `${basePath}/cars`, id), dataToSave);
        showAlert && showAlert("Veículo atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, `${basePath}/cars`), {
          ...dataToSave,
          createdAt: new Date(),
        });
        showAlert && showAlert("Veículo adicionado com sucesso!", "success");
      }
      setShowCarModal(false);
      setCarToEdit(null);
    } catch (error) {
      console.error("Erro ao salvar veículo:", error);
      showAlert && showAlert("Falha ao salvar veículo.", "error");
    }
  };

  const handleDeleteCar = async (car) => {
    if (!car?.id) return;
    const confirmDelete = window.confirm(
      `Tem certeza que deseja remover o veículo "${car.name || car.plate || ""}"? Todos os dados vinculados (despesas, receitas, vistorias, etc.) serão apagados.`
    );
    if (!confirmDelete) return;

    try {
      const subCollections = [
        "expenses",
        "revenues",
        "reminders",
        "checklists",
        "services",
        "pendings",
      ];

      for (const sub of subCollections) {
        const colRef = collection(
          db,
          `${basePath}/cars/${car.id}/${sub}`
        );
        const snap = await getDocs(colRef);
        const deletions = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletions);
      }

      await deleteDoc(doc(db, `${basePath}/cars`, car.id));
      showAlert &&
        showAlert("Veículo removido com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao remover veículo:", error);
      showAlert && showAlert("Falha ao apagar veículo.", "error");
    }
  };

  // -------- Filtro de busca --------

  const filteredCars = useMemo(() => {
    if (!searchQuery) return cars;

    const q = searchQuery.toLowerCase();

    return cars.filter((car) => {
      const name = (car.name || "").toLowerCase();
      const plate = (car.plate || "").toLowerCase();
      const owner = (car.ownerName || "").toLowerCase();

      return (
        name.includes(q) ||
        plate.includes(q) ||
        owner.includes(q)
      );
    });
  }, [cars, searchQuery]);

  // -------- Render --------

  if (isLoading) {
    return <LoadingSpinner text="Carregando frota..." />;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Minha Frota
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Visualize rapidamente os veículos, filtre por nome, placa ou proprietário e veja alertas de revisão.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 text-sm border border-gray-300"
          >
            <i className="fas fa-file-import mr-2" />
            Importar Dados
          </button>

          <button
            onClick={handleAddCar}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
          >
            <i className="fas fa-plus mr-2" />
            Adicionar Veículo
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, placa ou proprietário..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-md bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        />
      </div>

      {/* Cards da Frota (mobile first) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredCars.map((car) => {
          const mileage =
            car.currentMileage != null
              ? Number(car.currentMileage)
              : null;
          const overdue = isMaintenanceOverdue(car);

          return (
            <div
              key={car.id}
              className={
                "bg-white rounded-xl p-3 flex flex-col justify-between border shadow-sm " +
                (overdue
                  ? " border-orange-400 bg-orange-50"
                  : " border-gray-100")
              }
            >
              {/* Topo: nome + botão ver */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {car.name || "Veículo sem nome"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Placa:{" "}
                    {car.plate
                      ? car.plate.toString().toUpperCase()
                      : "—"}
                  </p>
                  {car.ownerName && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Proprietário:{" "}
                      <span className="font-medium">
                        {car.ownerName}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {renderStatusBadge(car.status)}
                  {overdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold">
                      <i className="fas fa-exclamation-triangle text-[9px]" />
                      Revisão atrasada
                    </span>
                  )}

                  <button
                    onClick={() => onSelectCar && onSelectCar(car.id)}
                    className="mt-1 text-gray-500 hover:text-blue-600 text-sm"
                    title="Ver detalhes do veículo"
                  >
                    <i className="fas fa-eye" />
                  </button>
                </div>
              </div>

              {/* Rodapé: info + ações */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <div className="text-[11px] text-gray-500">
                  {mileage != null ? (
                    <>
                      KM:{" "}
                      <span className="font-semibold text-gray-700">
                        {mileage.toLocaleString("pt-BR")}
                      </span>
                    </>
                  ) : (
                    <span>KM não informado</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditCar(car)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    title="Editar veículo"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    onClick={() => handleDeleteCar(car)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title="Excluir veículo"
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCars.length === 0 && (
        <p className="text-center text-gray-500 mt-6 text-sm">
          Nenhum veículo encontrado para esse filtro.
        </p>
      )}

      {/* Modal de formulário de veículo */}
      {showCarModal && (
        <CarFormModal
          car={carToEdit}
          onClose={() => {
            setShowCarModal(false);
            setCarToEdit(null);
          }}
          onSave={handleSaveCar}
          drivers={drivers} // <-- AGORA VAI RECEBER OS MOTORISTAS
        />
      )}

      {/* Modal de importação de dados */}
      {showImportModal && (
        <ImportDataModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          db={db}
          basePath={basePath}
          companyId={companyId}
          showAlert={showAlert}
        />
      )}
    </div>
  );
};

window.FleetListPage = FleetListPage;

})();

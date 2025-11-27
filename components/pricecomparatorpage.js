;(function () {
  // components/PriceComparatorPage.js - Revisado com cadastro de estabelecimentos globais

  const PriceComparatorPage = ({ userData, db, appInstanceId, showAlert }) => {
    const { useState, useEffect } = React;
    const {
      collection,
      query,
      onSnapshot,
      orderBy,
      collectionGroup,
      getDocs,
      where: whereF,
      addDoc,
      setDoc,
      doc,
    } = window.firebase;

    const [maintenanceItems, setMaintenanceItems] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState("");
    const [selectedItemName, setSelectedItemName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Estabelecimentos (globais por appInstance)
    const [establishments, setEstablishments] = useState([]);
    const [regionFilter, setRegionFilter] = useState("");
    const [newEst, setNewEst] = useState({
      name: "",
      address: "",
      region: "",
    });
    const [priceEntry, setPriceEntry] = useState({
      establishmentId: "",
      price: "",
    });

    const companyId = userData?.companyId;
    const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

    // Itens para comparação (da empresa atual)
    useEffect(() => {
      if (!db || !basePath) return;

      const itemsQuery = query(
        collection(db, `${basePath}/maintenanceItems`),
        orderBy("name")
      );

      const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
        const itemsList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMaintenanceItems(itemsList);
      });

      return unsubscribe;
    }, [db, basePath]);

    // Estabelecimentos globais
    useEffect(() => {
      if (!db || !appInstanceId) return;

      const ref = collection(db, "artifacts", appInstanceId, "establishments");

      const unsub = onSnapshot(query(ref, orderBy("name")), (snap) => {
        setEstablishments(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      });

      return unsub;
    }, [db, appInstanceId]);

    // Atualiza nome do item a partir da seleção
    useEffect(() => {
      const it = maintenanceItems.find((i) => i.id === selectedItemId);
      setSelectedItemName(it?.name || "");
    }, [selectedItemId, maintenanceItems]);

    const handleSearch = async () => {
      if (!selectedItemId) {
        showAlert("Por favor, selecione um item para comparar.", "info");
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      setResults([]);

      try {
        // Busca preços públicos (todos usuários desta instância)
        const publicPricesQuery = query(
          collectionGroup(db, "prices"),
          whereF("appInstanceId", "==", appInstanceId),
          whereF("itemId", "==", selectedItemId)
        );

        const pricesSnap = await getDocs(publicPricesQuery);

        const pubResults = pricesSnap.docs
          .map((d) => d.data())
          .filter(
            (p) => !regionFilter || (p.region || "") === regionFilter
          )
          .sort(
            (a, b) => Number(a.price || 0) - Number(b.price || 0)
          );

        setResults(pubResults);
      } catch (e) {
        console.error(e);
        showAlert("Erro ao buscar preços.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    const formatCurrency = (value) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value || 0);

    const handleAddEstablishment = async () => {
      const { name, address, region } = newEst;

      if (!name.trim()) {
        showAlert("Informe o nome do estabelecimento.", "info");
        return;
      }

      try {
        await addDoc(
          collection(db, "artifacts", appInstanceId, "establishments"),
          {
            name: name.trim(),
            address: address?.trim() || "",
            region: region?.trim() || "",
            appInstanceId,
            createdAt: new Date(),
          }
        );

        setNewEst({ name: "", address: "", region: "" });
        showAlert("Estabelecimento cadastrado!", "success");
      } catch (e) {
        console.error(e);
        showAlert("Falha ao cadastrar estabelecimento.", "error");
      }
    };

    const handleSavePrice = async () => {
      if (
        !priceEntry.establishmentId ||
        !selectedItemId ||
        !priceEntry.price
      ) {
        showAlert(
          "Selecione o item, o estabelecimento e informe o preço.",
          "info"
        );
        return;
      }

      const est = establishments.find(
        (e) => e.id === priceEntry.establishmentId
      );

      try {
        await setDoc(
          doc(
            db,
            "artifacts",
            appInstanceId,
            "establishments",
            priceEntry.establishmentId,
            "prices",
            selectedItemId
          ),
          {
            appInstanceId,
            establishmentId: priceEntry.establishmentId,
            establishmentName: est?.name || "",
            address: est?.address || "",
            region: est?.region || "",
            itemId: selectedItemId,
            itemName: selectedItemName,
            price: Number(priceEntry.price),
            updatedAt: new Date(),
          }
        );

        showAlert("Preço registrado!", "success");
        setPriceEntry((p) => ({ ...p, price: "" }));
      } catch (e) {
        console.error(e);
        showAlert("Falha ao salvar o preço.", "error");
      }
    };

    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-full">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
          Comparador de Preços
        </h1>

        {/* Bloco principal de comparação */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="flex-grow w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecione o item ou serviço para comparar
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Escolha um item --</option>
                {maintenanceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-60">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Região
              </label>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {[...new Set(
                  establishments
                    .map((e) => e.region)
                    .filter(Boolean)
                )].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 self-end"
            >
              <i className="fas fa-search mr-2"></i>
              {isLoading ? "Buscando..." : "Comparar"}
            </button>
          </div>

          <div id="comparison-results">
            {isLoading && (
              <LoadingSpinner text="Comparando preços..." />
            )}

            {!isLoading && hasSearched && results.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Nenhum preço encontrado para este item.
              </p>
            )}

            {!isLoading && results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-gray-700">
                  Resultados da comparação (por estabelecimento):
                </h3>

                {results.map((r, index) => (
                  <div
                    key={`${r.establishmentId}-${index}`}
                    className={`p-4 rounded-lg border-l-4 ${
                      index === 0
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-lg text-gray-800">
                          {r.establishmentName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Região: {r.region || "N/D"}
                        </p>

                        {r.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              r.address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {r.address}
                          </a>
                        )}
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-2xl font-extrabold ${
                            index === 0
                              ? "text-green-600"
                              : "text-gray-800"
                          }`}
                        >
                          {formatCurrency(r.price)}
                        </p>
                        {r.updatedAt && (
                          <p className="text-xs text-gray-500">
                            Atualizado em{" "}
                            {new Date(
                              r.updatedAt?.toDate
                                ? r.updatedAt.toDate()
                                : r.updatedAt
                            ).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bloco de cadastro de estabelecimento e preços */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Cadastrar estabelecimento e preços
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              value={newEst.name}
              onChange={(e) =>
                setNewEst((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Nome do estabelecimento"
              className="w-full bg-gray-100 p-3 rounded-lg border"
            />
            <input
              value={newEst.address}
              onChange={(e) =>
                setNewEst((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="Endereço (rua, nº, cidade/UF)"
              className="w-full bg-gray-100 p-3 rounded-lg border"
            />
            <input
              value={newEst.region}
              onChange={(e) =>
                setNewEst((p) => ({ ...p, region: e.target.value }))
              }
              placeholder="Região (ex.: São Paulo/SP)"
              className="w-full bg-gray-100 p-3 rounded-lg border"
            />
          </div>

          <button
            onClick={handleAddEstablishment}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
          >
            Cadastrar estabelecimento
          </button>

          <hr className="my-6" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estabelecimento
              </label>
              <select
                value={priceEntry.establishmentId}
                onChange={(e) =>
                  setPriceEntry((p) => ({
                    ...p,
                    establishmentId: e.target.value,
                  }))
                }
                className="w-full bg-gray-100 p-3 rounded-lg border"
              >
                <option value="">-- Selecione --</option>
                {establishments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item selecionado
              </label>
              <input
                value={selectedItemName || ""}
                disabled
                className="w-full bg-gray-100 p-3 rounded-lg border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceEntry.price}
                onChange={(e) =>
                  setPriceEntry((p) => ({
                    ...p,
                    price: e.target.value,
                  }))
                }
                className="w-full bg-gray-100 p-3 rounded-lg border"
              />
            </div>
          </div>

          <button
            onClick={handleSavePrice}
            className="mt-3 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Salvar preço
          </button>
        </div>
      </div>
    );
  };

  window.PriceComparatorPage = PriceComparatorPage;
})();

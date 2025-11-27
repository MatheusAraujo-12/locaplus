;(function () {
  // src/components/PendingsReportPage.js
  const { useEffect, useMemo, useState } = React;
  const { formatCurrency, formatDate } = window.formattingUtils || window;

  const PendingsReportPage = ({ db, userData, appInstanceId, goBack, showAlert }) => {
    const { collection, getDocs } = window.firebase || {};
    const [loading, setLoading] = useState(true);
    const [pendings, setPendings] = useState([]);
    const [statusFilter, setStatusFilter] = useState("open"); // open | paid | all
    const [searchQuery, setSearchQuery] = useState("");

    if (!db) {
      return <div className="p-4 text-red-600">Erro: DB não inicializado.</div>;
    }

    const companyId = userData?.companyId;
    const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

    // Carrega todas as pendências de todos os carros
    useEffect(() => {
      if (!companyId) return;

      const loadPendings = async () => {
        try {
          setLoading(true);

          // 1) Buscar todos os carros
          const carsSnap = await getDocs(collection(db, `${basePath}/cars`));
          const cars = carsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          // 2) Para cada carro, buscar subcoleção pendings
          const allPendings = [];
          for (const car of cars) {
            const pendSnap = await getDocs(
              collection(db, `${basePath}/cars/${car.id}/pendings`)
            );

            pendSnap.forEach((pDoc) => {
              const data = pDoc.data();
              allPendings.push({
                id: pDoc.id,
                ...data,
                carId: car.id,
                carName: car.name || "",
                carPlate: car.plate || "",
              });
            });
          }

          setPendings(allPendings);
        } catch (e) {
          console.error("Erro ao carregar pendências:", e);
          showAlert && showAlert("Erro ao carregar pendências.", "error");
        } finally {
          setLoading(false);
        }
      };

      loadPendings();
    }, [db, basePath, companyId, showAlert]);

    // ---------- FILTROS ----------

    const filteredPendings = useMemo(() => {
      let list = [...pendings];

      if (statusFilter !== "all") {
        list = list.filter(
          (p) => (p.status || "open").toLowerCase() === statusFilter
        );
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter((p) => {
          return (
            (p.driverName || "").toLowerCase().includes(q) ||
            (p.carName || "").toLowerCase().includes(q) ||
            (p.carPlate || "").toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q)
          );
        });
      }

      return list;
    }, [pendings, statusFilter, searchQuery]);

    // ---------- RESUMO POR MOTORISTA ----------

    const summaryByDriver = useMemo(() => {
      const map = {};

      filteredPendings.forEach((p) => {
        const key = p.driverId || p.driverName || "sem-driver";
        if (!map[key]) {
          map[key] = {
            driverId: p.driverId || null,
            driverName: p.driverName || "Sem motorista",
            openTotal: 0,
            paidTotal: 0,
            total: 0,
          };
        }

        const amount = Number(p.amount || 0);
        const status = (p.status || "open").toLowerCase();

        if (status === "paid") {
          map[key].paidTotal += amount;
        } else {
          map[key].openTotal += amount;
        }

        map[key].total += amount;
      });

      // ordenar por maior pendência em aberto
      return Object.values(map).sort((a, b) => b.openTotal - a.openTotal);
    }, [filteredPendings]);

    // Totais gerais
    const grandTotals = useMemo(() => {
      let open = 0;
      let paid = 0;

      filteredPendings.forEach((p) => {
        const amt = Number(p.amount || 0);
        const status = (p.status || "open").toLowerCase();
        if (status === "paid") paid += amt;
        else open += amt;
      });

      return {
        open,
        paid,
        total: open + paid,
      };
    }, [filteredPendings]);

    if (loading) {
      return (
        <LoadingSpinner text="Carregando relatório de pendências..." />
      );
    }

    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <button
              onClick={goBack}
              className="mb-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
            >
              <i className="fas fa-arrow-left mr-2" />
              Voltar
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Relatório de Pendências de Motoristas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Visão consolidada de pendências em aberto e pagas, por motorista e
              por veículo.
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Em aberto</option>
                <option value="paid">Pagas</option>
                <option value="all">Todas</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Buscar (motorista, carro, placa, descrição)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: João, HB20, multa, combustível..."
              />
            </div>
          </div>
        </div>

        {/* Cards de totais gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <p className="text-xs font-semibold text-orange-700 uppercase">
              Em aberto
            </p>
            <p className="text-2xl font-extrabold text-orange-900">
              {formatCurrency(grandTotals.open)}
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <p className="text-xs font-semibold text-green-700 uppercase">
              Pagas
            </p>
            <p className="text-2xl font-extrabold text-green-900">
              {formatCurrency(grandTotals.paid)}
            </p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <p className="text-xs font-semibold text-blue-700 uppercase">
              Total (Aberto + Pago)
            </p>
            <p className="text-2xl font-extrabold text-blue-900">
              {formatCurrency(grandTotals.total)}
            </p>
          </div>
        </div>

        {/* Resumo por motorista */}
        <div className="bg-white rounded-xl shadow mb-6 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Resumo por Motorista
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="px-3 py-2 text-left font-semibold">
                    Motorista
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Em aberto
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">Pagas</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {summaryByDriver.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-gray-500"
                    >
                      Nenhuma pendência encontrada com esses filtros.
                    </td>
                  </tr>
                )}
                {summaryByDriver.map((row) => (
                  <tr key={row.driverId || row.driverName}>
                    <td className="px-3 py-2">
                      {row.driverName || "Sem motorista"}
                    </td>
                    <td className="px-3 py-2 text-right text-orange-700 font-semibold">
                      {formatCurrency(row.openTotal)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-700 font-semibold">
                      {formatCurrency(row.paidTotal)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista detalhada de pendências */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Pendências detalhadas
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="px-3 py-2 text-left font-semibold">Data</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Motorista
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Carro</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Descrição
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2 text-center font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPendings.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-gray-500"
                    >
                      Nenhuma pendência encontrada.
                    </td>
                  </tr>
                )}
                {filteredPendings.map((p) => {
                  const isPaid = (p.status || "").toLowerCase() === "paid";
                  const isOpen = (p.status || "").toLowerCase() === "open";

                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2">
                        {formatDate(p.date || p.createdAt)}
                      </td>
                      <td className="px-3 py-2">{p.driverName || "-"}</td>
                      <td className="px-3 py-2">
                        {p.carName || "-"}{" "}
                        {p.carPlate && (
                          <span className="text-gray-500">
                            ({p.carPlate})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {p.description || "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCurrency(p.amount || 0)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-[0.7rem] sm:text-xs ${
                            isPaid
                              ? "bg-green-100 text-green-700"
                              : isOpen
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isPaid
                            ? "Paga"
                            : isOpen
                            ? "Em aberto"
                            : p.status || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  window.PendingsReportPage = PendingsReportPage;
})();

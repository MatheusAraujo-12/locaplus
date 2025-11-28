;(function () {
  const { useEffect, useMemo, useState } = React;
  const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

  const ReportsPage = ({ userData, showAlert, db, appInstanceId }) => {
    const { collection, query, where, getDocs, onSnapshot } = window.firebase || {};

    const { companyId, companyName } = userData;
    const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

    const [cars, setCars] = useState([]);
    const [filterType, setFilterType] = useState("owner");
    const [selectedId, setSelectedId] = useState("all");

    // Período: mensal ou livre
    const [periodMode, setPeriodMode] = useState("custom"); // 'custom' | 'monthly'
    const [selectedMonth, setSelectedMonth] = useState(
      new Date().toISOString().slice(0, 7)
    );
    const [startDate, setStartDate] = useState(
      new Date(new Date().setDate(1)).toISOString().slice(0, 10)
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // ---------- HELPERS ----------
    const getDateObject = (rawValue) => {
      if (!rawValue) return null;
      if (typeof rawValue.toDate === "function") {
        try {
          return rawValue.toDate();
        } catch {
          return null;
        }
      }
      if (rawValue instanceof Date) {
        return Number.isNaN(rawValue.getTime()) ? null : rawValue;
      }
      if (typeof rawValue === "object" && typeof rawValue.seconds === "number") {
        const d = new Date(rawValue.seconds * 1000);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (typeof rawValue === "string") {
        const iso = rawValue.includes("T") ? rawValue : `${rawValue}T00:00:00`;
        const parsed = new Date(iso);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      return null;
    };

    const formatDate = (rawValue) => {
      const parsed = getDateObject(rawValue);
      return parsed ? parsed.toLocaleDateString("pt-BR") : "Data não informada";
    };

    const formatCurrency = (value) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value) || 0);

    const sortByDate = (a, b) => {
      const first = getDateObject(a?.date)?.getTime() || 0;
      const second = getDateObject(b?.date)?.getTime() || 0;
      return first - second;
    };

    const toNumberSafe = (value, fallback = 0) => {
      if (value === "" || value == null) return fallback;
      const n = Number(String(value).replace(",", "."));
      return Number.isFinite(n) ? n : fallback;
    };

    const truncate = (text, max) => {
      if (!text) return "";
      return text.length > max ? text.slice(0, max - 1) + "…" : text;
    };

    const formatCarLabel = (car) => {
      if (!car) return "Veículo sem identificação";
      const name = (car.name || "").trim();
      const plate = (car.plate || "").trim();
      if (name && plate) return `${name} - ${plate}`;
      return name || plate || "Veículo sem identificação";
    };

    // ---------- CARREGAR CARROS ----------
    useEffect(() => {
      if (!db) return;
      const carsRef = collection(db, basePath, "cars");
      const unsubscribe = onSnapshot(carsRef, (snapshot) => {
        setCars(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }, [db, basePath]);

    const uniqueOwners = useMemo(() => {
      const ownerNames = cars.map((car) => car.ownerName).filter(Boolean);
      return [...new Set(ownerNames)];
    }, [cars]);

    // ---------- GERAR RELATÓRIO ----------
    const handleGenerateReport = async () => {
      setIsLoading(true);
      setReportData(null);

      try {
        // 1) Período efetivo
        let effectiveStart = startDate;
        let effectiveEnd = endDate;

        if (periodMode === "monthly" && selectedMonth) {
          const [yStr, mStr] = selectedMonth.split("-");
          const year = Number(yStr);
          const month = Number(mStr);
          if (!Number.isNaN(year) && !Number.isNaN(month)) {
            const first = new Date(year, month - 1, 1);
            const last = new Date(year, month, 0);
            effectiveStart = first.toISOString().slice(0, 10);
            effectiveEnd = last.toISOString().slice(0, 10);
          }
        }

        // 2) Filtrar carros / proprietário
        let carsToProcess = [];
        let reportTitle = "";
        let ownerName = null;

        if (filterType === "all") {
          carsToProcess = cars;
          reportTitle = "Relatório Geral da Frota";
        } else if (filterType === "single_car" && selectedId !== "all") {
          const selectedCar = cars.find((c) => c.id === selectedId);
          carsToProcess = selectedCar ? [selectedCar] : [];
          reportTitle = `Relatório - ${formatCarLabel(selectedCar)}`;
          ownerName = selectedCar?.ownerName || null;
        } else if (filterType === "owner" && selectedId !== "all") {
          carsToProcess = cars.filter((c) => c.ownerName === selectedId);
          reportTitle = `Relatório do Proprietário: ${selectedId}`;
          ownerName = selectedId;
        } else {
          setIsLoading(false);
          return;
        }

        const carReports = [];

        for (const car of carsToProcess) {
          let carRevenue = 0;
          let carExpense = 0;
          const currentCarRevenues = [];
          const currentCarExpenses = [];

          // RECEITAS
          const revenuesRef = collection(db, `${basePath}/cars/${car.id}/revenues`);
          const revenuesQuery = query(
            revenuesRef,
            where("date", ">=", effectiveStart),
            where("date", "<=", effectiveEnd)
          );
          const revenuesSnap = await getDocs(revenuesQuery);
          revenuesSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const value = toNumberSafe(data.value, 0);
            carRevenue += value;
            currentCarRevenues.push({ id: docSnap.id, ...data, value });
          });

          // DESPESAS
          const expensesRef = collection(db, `${basePath}/cars/${car.id}/expenses`);
          const expensesQuery = query(
            expensesRef,
            where("date", ">=", effectiveStart),
            where("date", "<=", effectiveEnd)
          );
          const expensesSnap = await getDocs(expensesQuery);
          expensesSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const cost = toNumberSafe(data.cost, 0);
            carExpense += cost;
            currentCarExpenses.push({ id: docSnap.id, ...data, cost });
          });

          currentCarRevenues.sort(sortByDate);
          currentCarExpenses.sort(sortByDate);

          const netProfit = carRevenue - carExpense; // lucro bruto do carro (antes da comissão)

          // INVESTIMENTO: valor de compra vindo do CarFormModal (purchaseValue)
          const investment = toNumberSafe(car.purchaseValue, 0);

          // COMISSÃO DA EMPRESA x PROPRIETÁRIO
          const commissionMode = car.companyCommissionMode || "percentage";
          const commissionPercentage = toNumberSafe(car.commissionPercentage, 0);
          const fixedCommission = toNumberSafe(car.companyFixedCommission, 0);

          let companyCommission = 0;
          let ownerPayout = 0;

          if (netProfit > 0) {
            if (commissionMode === "fixed" && fixedCommission > 0) {
              companyCommission = Math.min(netProfit, fixedCommission);
              ownerPayout = netProfit - companyCommission;
            } else if (commissionMode === "percentage" && commissionPercentage > 0) {
              companyCommission = netProfit * (commissionPercentage / 100);
              ownerPayout = netProfit - companyCommission;
            } else {
              companyCommission = 0;
              ownerPayout = netProfit;
            }
          } else {
            // prejuízo ou zero → comissão zera
            companyCommission = 0;
            ownerPayout = netProfit;
          }

          carReports.push({
            id: car.id,
            name: formatCarLabel(car),
            totalRevenue: carRevenue,
            totalExpense: carExpense,
            netProfit,          // antes da comissão
            ownerPayout,        // lucro do proprietário (depois da comissão)
            companyCommission,  // comissão da empresa
            investment,         // valor de compra do carro
            revenues: currentCarRevenues,
            expenses: currentCarExpenses,
          });
        }

        const grandTotals = {
          totalRevenue: carReports.reduce((sum, rep) => sum + rep.totalRevenue, 0),
          totalExpense: carReports.reduce((sum, rep) => sum + rep.totalExpense, 0),
          totalNetProfit: carReports.reduce((sum, rep) => sum + rep.netProfit, 0),
          totalOwnerPayout: carReports.reduce((sum, rep) => sum + rep.ownerPayout, 0),
          totalCompanyCommission: carReports.reduce(
            (sum, rep) => sum + rep.companyCommission,
            0
          ),
          totalInvestment: carReports.reduce(
            (sum, rep) => sum + rep.investment,
            0
          ),
        };

        // ROI baseado no lucro do proprietário (após comissão)
        const roiPercent =
          grandTotals.totalInvestment > 0
            ? (grandTotals.totalOwnerPayout * 100) / grandTotals.totalInvestment
            : 0;

        const periodLabel = `${new Date(
          effectiveStart + "T00:00:00"
        ).toLocaleDateString("pt-BR")} a ${new Date(
          effectiveEnd + "T00:00:00"
        ).toLocaleDateString("pt-BR")}`;

        setReportData({
          reportTitle,
          period: periodLabel,
          cars: carReports,
          grandTotals,
          filterType,
          ownerName,
          roiPercent,
        });
      } catch (error) {
        console.error("Erro ao gerar relatório: ", error);
        showAlert("Ocorreu um erro ao gerar o relatório.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    // ---------- PDF NO MODELO DESCRITO ----------
    const handleDownloadPdf = () => {
      if (!reportData) return;

      const doc = new jsPDF("p", "mm", "a4");
      const marginLeft = 12;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - marginLeft * 2;
      let cursorY = 15;

      const addPageIfNeeded = (extra = 10) => {
        if (cursorY + extra >= pageHeight - 10) {
          doc.addPage();
          cursorY = 15;
        }
      };

      const headerOwner =
        reportData.ownerName ||
        "Veículos consultados (múltiplos proprietários / frota)";
      const headerTitle = reportData.reportTitle;

      // Cabeçalho colorido
      doc.setFillColor(33, 150, 243);
      doc.rect(marginLeft, cursorY - 5, usableWidth, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(
        companyName || "Relatório de Gestão de Frota",
        marginLeft + 2,
        cursorY + 1
      );
      doc.setFontSize(10);
      doc.text(
        `Período: ${reportData.period}`,
        marginLeft + usableWidth - 2,
        cursorY + 1,
        { align: "right" }
      );
      cursorY += 12;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(`Proprietário: ${headerOwner}`, marginLeft, cursorY);
      cursorY += 6;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(headerTitle, marginLeft, cursorY);
      cursorY += 8;

      // LINHA 2: Receitas / Despesas / Comissão / Lucro (APÓS COMISSÃO)
      const colWidth4 = usableWidth / 4;
      const boxY = cursorY;
      const boxHeight = 18;

      doc.setFillColor(240, 248, 255);
      doc.rect(marginLeft, boxY - 4, usableWidth, boxHeight, "F");

      const cellsResumo = [
        {
          label: "Receitas do período",
          value: formatCurrency(reportData.grandTotals.totalRevenue),
        },
        {
          label: "Despesas do período",
          value: formatCurrency(reportData.grandTotals.totalExpense),
        },
        {
          label: "Comissão da empresa",
          value: formatCurrency(reportData.grandTotals.totalCompanyCommission),
        },
        {
          // LUCRO DO PERÍODO = LUCRO DO PROPRIETÁRIO (APÓS COMISSÃO)
          label: "Lucro do período",
          value: formatCurrency(reportData.grandTotals.totalOwnerPayout),
        },
      ];

      doc.setFontSize(9);
      cellsResumo.forEach((cell, index) => {
        const x = marginLeft + colWidth4 * index + 2;
        doc.setFont(undefined, "normal");
        doc.text(cell.label, x, cursorY);
        doc.setFont(undefined, "bold");
        doc.text(cell.value, x, cursorY + 6);
      });

      cursorY = boxY + boxHeight;
      cursorY += 4;

      // LINHA 3: Investimento + ROI (com lucro do proprietário)
      const colWidth2 = usableWidth / 2;

      doc.setFillColor(232, 245, 233);
      doc.rect(marginLeft, cursorY - 4, usableWidth, 14, "F");

      const inv = formatCurrency(reportData.grandTotals.totalInvestment);
      const roiLabel =
        reportData.grandTotals.totalInvestment > 0
          ? `${reportData.roiPercent.toFixed(2).replace(".", ",")} %`
          : "N/A";

      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.text("Investimento total (valor de compra)", marginLeft + 2, cursorY);
      doc.setFont(undefined, "bold");
      doc.text(inv, marginLeft + 2, cursorY + 6);

      doc.setFont(undefined, "normal");
      doc.text(
        "ROI do período (lucro do proprietário / investimento)",
        marginLeft + colWidth2 + 2,
        cursorY
      );
      doc.setFont(undefined, "bold");
      doc.text(roiLabel, marginLeft + colWidth2 + 2, cursorY + 6);

      cursorY += 18;

      // BLOCOS POR CARRO
      reportData.cars.forEach((car, idx) => {
        addPageIfNeeded(40);

        if (idx > 0) {
          doc.setDrawColor(200, 200, 200);
          doc.line(marginLeft, cursorY, marginLeft + usableWidth, cursorY);
          cursorY += 4;
        }

        // Cabeçalho do carro
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.setTextColor(33, 150, 243);
        doc.text(truncate(car.name, 60), marginLeft, cursorY);
        cursorY += 5;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");

        const resLine1 =
          "Receitas: " +
          formatCurrency(car.totalRevenue) +
          "   |   Despesas: " +
          formatCurrency(car.totalExpense);

        // Aqui usamos o LUCRO DO PROPRIETÁRIO (APÓS COMISSÃO)
        const resLine2 =
          "Resultado para proprietário: " +
          formatCurrency(car.ownerPayout) +
          "   |   Comissão empresa: " +
          formatCurrency(car.companyCommission);

        doc.text(resLine1, marginLeft, cursorY);
        cursorY += 5;
        doc.text(resLine2, marginLeft, cursorY);
        cursorY += 8;

        // TABELA RECEITAS
        if (car.revenues.length > 0) {
          addPageIfNeeded(20);

          doc.setFontSize(9);
          doc.setFont(undefined, "bold");
          doc.setFillColor(227, 242, 253);
          doc.rect(marginLeft, cursorY - 4, usableWidth, 7, "F");
          doc.text("Receitas do período", marginLeft + 2, cursorY + 1);
          cursorY += 7;

          const colX = {
            date: marginLeft + 2,
            desc: marginLeft + 28,
            value: marginLeft + usableWidth - 2,
          };

          doc.setFont(undefined, "bold");
          doc.text("Data", colX.date, cursorY);
          doc.text("Descrição", colX.desc, cursorY);
          doc.text("Valor (R$)", colX.value, cursorY, { align: "right" });
          cursorY += 4;
          doc.setFont(undefined, "normal");

          car.revenues.forEach((rev) => {
            addPageIfNeeded(8);
            doc.text(formatDate(rev.date), colX.date, cursorY);
            doc.text(truncate(rev.description || "", 60), colX.desc, cursorY);
            doc.text(
              formatCurrency(rev.value),
              colX.value,
              cursorY,
              { align: "right" }
            );
            cursorY += 4;
          });

          cursorY += 4;
        }

        // TABELA DESPESAS
        if (car.expenses.length > 0) {
          addPageIfNeeded(20);

          doc.setFontSize(9);
          doc.setFont(undefined, "bold");
          doc.setFillColor(255, 235, 238);
          doc.rect(marginLeft, cursorY - 4, usableWidth, 7, "F");
          doc.text("Despesas do período", marginLeft + 2, cursorY + 1);
          cursorY += 7;

          const colX2 = {
            date: marginLeft + 2,
            desc: marginLeft + 28,
            cat: marginLeft + usableWidth / 2,
            value: marginLeft + usableWidth - 2,
          };

          doc.setFont(undefined, "bold");
          doc.text("Data", colX2.date, cursorY);
          doc.text("Descrição", colX2.desc, cursorY);
          doc.text("Categoria", colX2.cat, cursorY);
          doc.text("Valor (R$)", colX2.value, cursorY, { align: "right" });
          cursorY += 4;
          doc.setFont(undefined, "normal");

          car.expenses.forEach((exp) => {
            addPageIfNeeded(8);
            doc.text(formatDate(exp.date), colX2.date, cursorY);
            doc.text(truncate(exp.description || "", 40), colX2.desc, cursorY);
            doc.text(
              truncate(exp.category || "Outros", 18),
              colX2.cat,
              cursorY
            );
            doc.text(
              formatCurrency(exp.cost),
              colX2.value,
              cursorY,
              { align: "right" }
            );
            cursorY += 4;
          });

          cursorY += 6;
        }

        if (!car.revenues.length && !car.expenses.length) {
          doc.setFontSize(8);
          doc.text(
            "Sem movimentações financeiras no período para este veículo.",
            marginLeft,
            cursorY
          );
          cursorY += 8;
        }
      });

      const fileName = `relatorio_investidor_${(reportData.ownerName || "frota")
        .replace(/\s+/g, "_")
        .toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    };

    // ---------- CSV DETALHADO ----------
    const handleExportCsv = () => {
      if (!reportData || !reportData.cars) {
        showAlert("Gere um relatório primeiro para exportar os dados.", "error");
        return;
      }

      const rows = [
        ["Veículo", "Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"],
      ];

      reportData.cars.forEach((car) => {
        car.revenues.forEach((revenue) => {
          rows.push([
            `"${car.name}"`,
            revenue.date,
            "Receita",
            "",
            `"${(revenue.description || "").replace(/"/g, '""')}"`,
            toNumberSafe(revenue.value, 0).toFixed(2),
          ]);
        });
        car.expenses.forEach((expense) => {
          rows.push([
            `"${car.name}"`,
            expense.date,
            "Despesa",
            `"${(expense.category || "Outros").replace(/"/g, '""')}"`,
            `"${(expense.description || "").replace(/"/g, '""')}"`,
            (-toNumberSafe(expense.cost, 0)).toFixed(2),
          ]);
        });
      });

      const csvContent = rows.map((e) => e.join(",")).join("\n");
      const blob = new Blob(["" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const fileName = `relatorio_detalhado_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // ---------- RENDER ----------
    return (
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Relatórios Financeiros
          </h1>
        </div>

        {/* FILTROS */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-6 no-print">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Filtros do Relatório
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            {/* Tipo de relatório */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Relatório
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setSelectedId("all");
                }}
                className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="owner">Por Proprietário</option>
                <option value="single_car">Por Veículo</option>
                <option value="all">Toda a Frota</option>
              </select>
            </div>

            {/* Proprietário / Veículo */}
            {filterType === "single_car" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Veículo
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all" disabled>
                    Selecione um veículo
                  </option>
                  {cars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {formatCarLabel(car)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "owner" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Proprietário
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all" disabled>
                    Selecione um proprietário
                  </option>
                  {uniqueOwners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "all" && (
              <div className="hidden md:block" />
            )}

            {/* Tipo de período */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Período
              </label>
              <select
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value)}
                className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="custom">Período personalizado</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            {/* Seletor de datas ou mês */}
            {periodMode === "monthly" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mês
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Botão */}
            <button
              onClick={handleGenerateReport}
              disabled={isLoading || (filterType !== "all" && selectedId === "all")}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        </div>

        {isLoading && <LoadingSpinner text="Gerando relatório..." />}

        {reportData && (
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  {reportData.reportTitle}
                </h2>
                <p className="text-gray-600">Período: {reportData.period}</p>
                {reportData.ownerName && (
                  <p className="text-gray-600">
                    Proprietário: {reportData.ownerName}
                  </p>
                )}
              </div>
              <div className="flex gap-2 no-print">
                <button
                  onClick={handleDownloadPdf}
                  className="download-button bg-gray-200 text-gray-800 font-bold p-2 w-10 h-10 md:px-4 md:w-auto md:h-auto rounded-lg hover:bg-gray-300 flex items-center justify-center transition-all"
                >
                  <i className="fas fa-file-pdf"></i>
                  <span className="hidden md:inline md:ml-2">PDF</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="bg-green-200 text-green-800 font-bold p-2 w-10 h-10 md:px-4 md:w-auto md:h-auto rounded-lg hover:bg-green-300 flex items-center justify-center transition-all"
                >
                  <i className="fas fa-file-csv"></i>
                  <span className="hidden md:inline md:ml-2">CSV</span>
                </button>
              </div>
            </div>

            {/* RESUMO NA TELA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-green-800">
                  Receitas do período
                </p>
                <p className="text-xl font-extrabold text-green-900 mt-1">
                  {formatCurrency(reportData.grandTotals.totalRevenue)}
                </p>
              </div>
              <div className="bg-red-100 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-red-800">
                  Despesas do período
                </p>
                <p className="text-xl font-extrabold text-red-900 mt-1">
                  {formatCurrency(reportData.grandTotals.totalExpense)}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-blue-800">
                  Comissão da empresa
                </p>
                <p className="text-xl font-extrabold text-blue-900 mt-1">
                  {formatCurrency(reportData.grandTotals.totalCompanyCommission)}
                </p>
              </div>
              <div className="bg-indigo-100 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-indigo-800">
                  Lucro do período (após comissão)
                </p>
                <p className="text-xl font-extrabold text-indigo-900 mt-1">
                  {formatCurrency(reportData.grandTotals.totalOwnerPayout)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-emerald-50 p-4 rounded-xl">
                <p className="text-xs font-bold text-emerald-800">
                  Investimento total (valor de compra)
                </p>
                <p className="text-xl font-extrabold text-emerald-900 mt-1">
                  {formatCurrency(reportData.grandTotals.totalInvestment)}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl">
                <p className="text-xs font-bold text-amber-800">
                  ROI do período (lucro do proprietário)
                </p>
                <p className="text-xl font-extrabold text-amber-900 mt-1">
                  {reportData.grandTotals.totalInvestment > 0
                    ? `${reportData.roiPercent.toFixed(2).replace(".", ",")} %`
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* CARROS NA TELA */}
            {reportData.cars.map((car) => (
              <div
                key={car.id}
                className="mb-8 p-4 border rounded-lg bg-gray-50"
              >
                <h3 className="text-lg font-bold text-blue-800 mb-2">
                  {car.name}
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  Receitas:{" "}
                  <span className="font-bold text-green-700">
                    {formatCurrency(car.totalRevenue)}
                  </span>{" "}
                  | Despesas:{" "}
                  <span className="font-bold text-red-700">
                    {formatCurrency(car.totalExpense)}
                  </span>
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  Resultado para proprietário (após comissão):{" "}
                  <span
                    className={
                      car.ownerPayout >= 0
                        ? "font-bold text-blue-700"
                        : "font-bold text-orange-700"
                    }
                  >
                    {formatCurrency(car.ownerPayout)}
                  </span>{" "}
                  | Comissão empresa:{" "}
                  <span className="font-bold text-indigo-700">
                    {formatCurrency(car.companyCommission)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Investimento (valor de compra):{" "}
                  {formatCurrency(car.investment)}
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-green-700 mb-2">
                      Receitas do período
                    </h4>
                    {car.revenues.length === 0 && (
                      <p className="text-xs text-gray-500">
                        Sem receitas registradas.
                      </p>
                    )}
                    {car.revenues.length > 0 && (
                      <ul className="space-y-1">
                        {car.revenues.map((rev) => (
                          <li
                            key={rev.id}
                            className="flex justify-between text-xs border-b border-dashed border-gray-200 py-1"
                          >
                            <span>
                              <span className="font-medium">
                                {formatDate(rev.date)}
                              </span>{" "}
                              - {rev.description || "Sem descrição"}
                            </span>
                            <span className="font-semibold text-green-700">
                              {formatCurrency(rev.value)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-2">
                      Despesas do período
                    </h4>
                    {car.expenses.length === 0 && (
                      <p className="text-xs text-gray-500">
                        Sem despesas registradas.
                      </p>
                    )}
                    {car.expenses.length > 0 && (
                      <ul className="space-y-1">
                        {car.expenses.map((exp) => (
                          <li
                            key={exp.id}
                            className="flex justify-between text-xs border-b border-dashed border-gray-200 py-1"
                          >
                            <span>
                              <span className="font-medium">
                                {formatDate(exp.date)}
                              </span>{" "}
                              - {exp.description || "Sem descrição"}
                              {exp.category && (
                                <span className="block text-[10px] uppercase text-gray-400">
                                  {exp.category}
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-red-700">
                              {formatCurrency(exp.cost)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  window.ReportsPage = ReportsPage;
})();

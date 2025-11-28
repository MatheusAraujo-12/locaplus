;(function(){
const { useEffect, useMemo, useRef, useState } = React;
const Chart = window.Chart;
const html2canvas = window.html2canvas;
const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

// components/ReportsPage.js - RELATÓRIOS FINANCEIROS (INVESTIDOR) + PERÍODO MENSAL OU LIVRE

const ReportsPage = ({ userData, showAlert, db, appInstanceId }) => {
  const { collection, query, where, getDocs, onSnapshot } = window.firebase || {};

  const { companyId, companyName } = userData;
  const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

  // --- ESTADOS GERAIS ---
  const [cars, setCars] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [selectedId, setSelectedId] = useState("all");

  // período: range ou mês fechado
  const [periodMode, setPeriodMode] = useState("range"); // 'range' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- SUBCOMPONENTES DE GRÁFICO ---
  const ExpensePieChart = ({ chartData }) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
      if (chartRef.current && chartData?.labels.length > 0) {
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        const ctx = chartRef.current.getContext("2d");
        chartInstanceRef.current = new Chart(ctx, {
          type: "pie",
          data: {
            labels: chartData.labels,
            datasets: [
              {
                label: "Despesas por Categoria",
                data: chartData.values,
                backgroundColor: [
                  "rgba(239, 68, 68, 0.8)",
                  "rgba(59, 130, 246, 0.8)",
                  "rgba(245, 158, 11, 0.8)",
                  "rgba(16, 185, 129, 0.8)",
                  "rgba(139, 92, 246, 0.8)",
                  "rgba(234, 179, 8, 0.8)",
                  "rgba(96, 165, 250, 0.8)",
                ],
                borderColor: "rgba(255, 255, 255, 0.7)",
                borderWidth: 2,
              },
            ],
          },
          options: { responsive: true, plugins: { legend: { position: "top" } } },
        });
      }
      return () => {
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
      };
    }, [chartData]);

    if (!chartData || chartData.labels.length === 0) {
      return (
        <p className="text-center text-gray-500 my-4">
          Não há dados de despesas para exibir o gráfico.
        </p>
      );
    }

    return (
      <div className="w-full max-w-sm mx-auto p-4">
        <canvas ref={chartRef}></canvas>
      </div>
    );
  };

  const CarFinancialChart = ({ carReports }) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
      if (chartRef.current && carReports?.length > 0) {
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        const labels = carReports.map((c) => c.name);
        const revenueData = carReports.map((c) => c.totalRevenue);
        const expenseData = carReports.map((c) => c.totalExpense);
        const ctx = chartRef.current.getContext("2d");
        chartInstanceRef.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Receitas",
                data: revenueData,
                backgroundColor: "rgba(16, 185, 129, 0.7)",
                borderColor: "rgba(16, 185, 129, 1)",
                borderWidth: 1,
              },
              {
                label: "Despesas",
                data: expenseData,
                backgroundColor: "rgba(239, 68, 68, 0.7)",
                borderColor: "rgba(239, 68, 68, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: "top" } },
            scales: { y: { beginAtZero: true } },
          },
        });
      }
      return () => {
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
      };
    }, [carReports]);

    if (!carReports || carReports.length <= 1) return null;

    return (
      <div className="w-full mx-auto p-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
          Comparativo Financeiro por Veículo
        </h3>
        <canvas ref={chartRef}></canvas>
      </div>
    );
  };

  // --- CARREGAMENTO DE CARROS ---
  useEffect(() => {
    if (!db) return;
    const carsRef = collection(db, basePath, "cars");
    const unsubscribe = onSnapshot(carsRef, (snapshot) => {
      setCars(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [db, basePath]);

  // --- OWNERS ÚNICOS ---
  const uniqueOwners = useMemo(() => {
    const ownerNames = cars.map((car) => car.ownerName).filter(Boolean);
    return [...new Set(ownerNames)];
  }, [cars]);

  const formatCarLabel = (car) => {
    if (!car) return "Veículo sem identificação";
    const name = (car.name || "").trim();
    const plate = (car.plate || "").trim();
    if (name && plate) return `${name} - ${plate}`;
    return name || plate || "Veículo sem identificação";
  };

  const getDateObject = (rawValue) => {
    if (!rawValue) return null;
    if (typeof rawValue?.toDate === "function") {
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

  // --- SINCRONIZA DATA QUANDO ESTIVER EM MODO "MÊS FECHADO" ---
  useEffect(() => {
    if (periodMode !== "month") return;
    if (!selectedMonth) return;

    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr); // 1..12

    if (!year || !month) return;

    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);

    setStartDate(first.toISOString().slice(0, 10));
    setEndDate(last.toISOString().slice(0, 10));
  }, [periodMode, selectedMonth]);

  // --- GERAÇÃO DO RELATÓRIO ---
  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportData(null);
    try {
      let carsToProcess = [];
      let reportTitle = "";

      if (filterType === "all") {
        carsToProcess = cars;
        reportTitle = "Relatório Geral da Frota";
      } else if (filterType === "single_car" && selectedId !== "all") {
        carsToProcess = cars.filter((c) => c.id === selectedId);
        reportTitle = `Relatório - ${formatCarLabel(
          cars.find((c) => c.id === selectedId)
        )}`;
      } else if (filterType === "owner" && selectedId !== "all") {
        carsToProcess = cars.filter((c) => c.ownerName === selectedId);
        reportTitle = `Relatório do Proprietário: ${selectedId}`;
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

        // Receitas
        const revenuesRef = collection(db, `${basePath}/cars/${car.id}/revenues`);
        const revenuesQuery = query(
          revenuesRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const revenuesSnap = await getDocs(revenuesQuery);
        revenuesSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const value = Number(data.value || 0);
          carRevenue += value;
          currentCarRevenues.push({ id: docSnap.id, ...data, value });
        });

        // Despesas
        const expensesRef = collection(db, `${basePath}/cars/${car.id}/expenses`);
        const expensesQuery = query(
          expensesRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const expensesSnap = await getDocs(expensesQuery);
        expensesSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const cost = Number(data.cost || 0);
          carExpense += cost;
          currentCarExpenses.push({ id: docSnap.id, ...data, cost });
        });

        currentCarRevenues.sort(sortByDate);
        currentCarExpenses.sort(sortByDate);

        const netProfit = carRevenue - carExpense;

        // --- COMISSÃO PARA A EMPRESA (POR CARRO) ---
        const commissionMode = car.companyCommissionMode || "percentage"; // 'percentage' | 'fixed'
        const commissionPercentage = Number(car.commissionPercentage || 0);
        const fixedCommission = Number(car.companyFixedCommission || 0);

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
            // sem configuração => tudo para o proprietário/investidor
            companyCommission = 0;
            ownerPayout = netProfit;
          }
        } else {
          // prejuízo => empresa não recebe comissão, prejuízo é do investidor
          companyCommission = 0;
          ownerPayout = netProfit;
        }

        // Valor investido (se existir no cadastro do carro)
        const investedAmount = Number(
          car.investedAmount || car.investmentAmount || 0
        );
        const investorROI =
          investedAmount > 0 ? (ownerPayout / investedAmount) * 100 : null;

        carReports.push({
          id: car.id,
          name: formatCarLabel(car),
          totalRevenue: carRevenue,
          totalExpense: carExpense,
          netProfit,
          ownerPayout,
          companyCommission,
          investedAmount,
          investorROI,
          expenses: currentCarExpenses,
          revenues: currentCarRevenues,
        });
      }

      const expenseByCategory = carReports
        .flatMap((c) => c.expenses)
        .reduce((acc, expense) => {
          const category = expense.category || "Outros";
          acc[category] = (acc[category] || 0) + Number(expense.cost || 0);
          return acc;
        }, {});

      const grandTotals = {
        totalRevenue: carReports.reduce(
          (sum, rep) => sum + rep.totalRevenue,
          0
        ),
        totalExpense: carReports.reduce(
          (sum, rep) => sum + rep.totalExpense,
          0
        ),
        totalNetProfit: carReports.reduce(
          (sum, rep) => sum + rep.netProfit,
          0
        ),
        totalOwnerPayout: carReports.reduce(
          (sum, rep) => sum + rep.ownerPayout,
          0
        ),
        totalCompanyCommission: carReports.reduce(
          (sum, rep) => sum + rep.companyCommission,
          0
        ),
        totalInvested: carReports.reduce(
          (sum, rep) => sum + (rep.investedAmount || 0),
          0
        ),
      };

      const overallROI =
        grandTotals.totalInvested > 0
          ? (grandTotals.totalOwnerPayout / grandTotals.totalInvested) * 100
          : null;

      // Label de período (mês fechado ou range)
      const startLabel = new Date(startDate + "T00:00:00").toLocaleDateString(
        "pt-BR"
      );
      const endLabel = new Date(endDate + "T00:00:00").toLocaleDateString(
        "pt-BR"
      );

      let periodLabel = `${startLabel} a ${endLabel}`;
      if (periodMode === "month") {
        const baseDate = new Date(startDate + "T00:00:00");
        const monthLabel = baseDate.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        periodLabel = `${monthLabel} (${startLabel} a ${endLabel})`;
      }

      setReportData({
        reportTitle,
        period: periodLabel,
        periodMode,
        cars: carReports,
        grandTotals: {
          ...grandTotals,
          overallROI,
        },
        chartData: {
          labels: Object.keys(expenseByCategory),
          values: Object.values(expenseByCategory),
        },
        filterType,
        ownerName: filterType === "owner" ? selectedId : null,
        companyName,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório: ", error);
      showAlert("Ocorreu um erro ao gerar o relatório.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- DOWNLOAD PDF ---
  const handleDownloadPdf = () => {
    const reportElement = document.getElementById("pdf-layout");
    if (!reportElement) return;
    const button = reportElement.querySelector(".download-button");
    if (button) button.style.display = "none";
    html2canvas(reportElement, { scale: 2, useCORS: true }).then((canvas) => {
      if (button) button.style.display = "flex";
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;

      let imgWidth = pdfWidth - 20;
      let imgHeight = imgWidth / canvasAspectRatio;

      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20;
        imgWidth = imgHeight * canvasAspectRatio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = 10;
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);

      let heightLeft = imgHeight;
      while ((heightLeft -= pdfHeight - 20) > 0) {
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          x,
          y - (imgHeight - heightLeft),
          imgWidth,
          imgHeight
        );
      }

      const fileName = `relatorio_${(reportData?.reportTitle || "frota")
        .replace(/[\s:]/g, "_")
        .toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    });
  };

  // --- CSV DETALHADO ---
  const handleExportCsv = () => {
    if (!reportData || !reportData.cars) {
      showAlert("Gere um relatório primeiro para exportar os dados.", "error");
      return;
    }
    const headers = [
      "Veículo",
      "Data",
      "Tipo",
      "Categoria",
      "Descrição",
      "Valor (R$)",
    ];
    const rows = [headers];

    reportData.cars.forEach((car) => {
      car.revenues.forEach((revenue) => {
        rows.push([
          `"${car.name}"`,
          revenue.date,
          "Receita",
          "",
          `"${(revenue.description || "").replace(/"/g, '""')}"`,
          Number(revenue.value || 0).toFixed(2),
        ]);
      });
      car.expenses.forEach((expense) => {
        rows.push([
          `"${car.name}"`,
          expense.date,
          "Despesa",
          `"${(expense.category || "Outros").replace(/"/g, '""')}"`,
          `"${(expense.description || "").replace(/"/g, '""')}"`,
          (-Number(expense.cost || 0)).toFixed(2),
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

  // --- RENDER ---
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
              <option value="all">Toda a Frota</option>
              <option value="single_car">Por Veículo</option>
              <option value="owner">Por Proprietário</option>
            </select>
          </div>

          {/* Veículo */}
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

          {/* Proprietário */}
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

          {/* Modo de período */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Período
            </label>
            <select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value)}
              className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            >
              <option value="range">Período personalizado</option>
              <option value="month">Mês fechado</option>
            </select>
          </div>

          {/* Quando for MÊS FECHADO, mostra apenas o mês */}
          {periodMode === "month" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Mês de referência
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-1 w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Quando for RANGE, mostra datas início/fim */}
          {periodMode === "range" && (
            <>
              <div className={filterType !== "all" ? "" : "md:col-start-3"}>
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

          <button
            onClick={handleGenerateReport}
            disabled={
              isLoading ||
              (filterType !== "all" && selectedId === "all")
            }
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? "Gerando..." : "Gerar Relatório"}
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner text="Gerando relatório..." />}

      {reportData && (
        <div
          id="pdf-layout"
          className="bg-white p-6 md:p-8 rounded-xl shadow-lg"
        >
          {/* CABEÇALHO DO RELATÓRIO */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                {reportData.companyName || "Controle de Frota"}
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {reportData.reportTitle}
              </h2>
              <p className="text-gray-600">Período: {reportData.period}</p>
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

          {/* CARDS RESUMO GERAL */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-green-100 p-4 rounded-xl shadow-sm text-center">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide">
                Receita Total
              </p>
              <p className="text-2xl md:text-3xl font-extrabold text-green-900 mt-1">
                {formatCurrency(reportData.grandTotals.totalRevenue)}
              </p>
            </div>
            <div className="bg-red-100 p-4 rounded-xl shadow-sm text-center">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide">
                Despesa Total
              </p>
              <p className="text-2xl md:text-3xl font-extrabold text-red-900 mt-1">
                {formatCurrency(reportData.grandTotals.totalExpense)}
              </p>
            </div>
            <div className="bg-blue-100 p-4 rounded-xl shadow-sm text-center">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                Lucro Líquido
              </p>
              <p className="text-2xl md:text-3xl font-extrabold text-blue-900 mt-1">
                {formatCurrency(reportData.grandTotals.totalNetProfit)}
              </p>
            </div>
            <div className="bg-purple-100 p-4 rounded-xl shadow-sm text-center">
              <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">
                Comissão da Empresa
              </p>
              <p className="text-2xl md:text-3xl font-extrabold text-purple-900 mt-1">
                {formatCurrency(reportData.grandTotals.totalCompanyCommission)}
              </p>
            </div>
          </div>

          {/* CARDS COMPLEMENTARES INVESTIDOR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-100 p-4 rounded-xl text-center">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Total para Investidores
              </p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(reportData.grandTotals.totalOwnerPayout)}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-xl text-center">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Valor Total Investido
              </p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(reportData.grandTotals.totalInvested)}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-xl text-center">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Retorno (%) sobre Investimento
              </p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                {reportData.grandTotals.overallROI != null
                  ? `${reportData.grandTotals.overallROI.toFixed(2)}%`
                  : "—"}
              </p>
            </div>
          </div>

          {/* GRÁFICO COMPARATIVO */}
          <div className="my-8 pt-4 border-t-2">
            <CarFinancialChart carReports={reportData.cars} />
          </div>

          {/* DETALHE POR CARRO */}
          {reportData.cars.map((carReport) => (
            <div
              key={carReport.id}
              className="mb-8 p-4 border rounded-lg break-inside-avoid"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-2">
                <h3 className="text-lg md:text-xl font-bold text-blue-800">
                  {carReport.name}
                </h3>
                <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                  <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                    Lucro: {formatCurrency(carReport.netProfit)}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold">
                    Empresa: {formatCurrency(carReport.companyCommission)}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                    Investidor: {formatCurrency(carReport.ownerPayout)}
                  </span>
                  {carReport.investorROI != null && (
                    <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-700 font-semibold">
                      ROI: {carReport.investorROI.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              <table className="w-full text-left text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1">Receitas</td>
                    <td className="py-1 text-right text-green-600">
                      {formatCurrency(carReport.totalRevenue)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1">Despesas</td>
                    <td className="py-1 text-right text-red-600">
                      - {formatCurrency(carReport.totalExpense)}
                    </td>
                  </tr>
                  <tr className="border-b font-semibold">
                    <td className="py-1">Lucro do Veículo</td>
                    <td className="py-1 text-right">
                      {formatCurrency(carReport.netProfit)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-xs text-gray-600">
                      Parte da Empresa
                    </td>
                    <td className="py-1 text-right text-xs text-purple-700 font-semibold">
                      {formatCurrency(carReport.companyCommission)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-xs text-gray-600">
                      Parte do Investidor / Proprietário
                    </td>
                    <td className="py-1 text-right text-xs text-green-700 font-semibold">
                      {formatCurrency(carReport.ownerPayout)}
                    </td>
                  </tr>
                  {carReport.investedAmount > 0 && (
                    <>
                      <tr>
                        <td className="py-1 text-xs text-gray-600">
                          Valor Investido
                        </td>
                        <td className="py-1 text-right text-xs text-gray-800 font-semibold">
                          {formatCurrency(carReport.investedAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-xs text-gray-600">
                          Retorno sobre Investimento
                        </td>
                        <td className="py-1 text-right text-xs text-gray-800 font-semibold">
                          {carReport.investorROI != null
                            ? `${carReport.investorROI.toFixed(2)}%`
                            : "—"}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {carReport.revenues.length > 0 && (
                  <div>
                    <h4 className="text-base font-semibold text-green-700 mb-2">
                      Receitas detalhadas
                    </h4>
                    <ul className="space-y-2">
                      {carReport.revenues.map((revenue, index) => (
                        <li
                          key={revenue.id || index}
                          className="border-b border-dashed border-gray-200 pb-2 last:border-b-0"
                        >
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <span className="font-medium">
                                {formatDate(revenue.date)}
                              </span>
                              {revenue.description && (
                                <span className="block text-xs text-gray-600">
                                  {revenue.description}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(revenue.value)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {carReport.expenses.length > 0 && (
                  <div>
                    <h4 className="text-base font-semibold text-red-700 mb-2">
                      Despesas detalhadas
                    </h4>
                    <ul className="space-y-2">
                      {carReport.expenses.map((expense, index) => (
                        <li
                          key={expense.id || index}
                          className="border-b border-dashed border-gray-200 pb-2 last:border-b-0"
                        >
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <span className="font-medium">
                                {formatDate(expense.date)}
                              </span>
                              {expense.description && (
                                <span className="block text-xs text-gray-600">
                                  {expense.description}
                                </span>
                              )}
                              {expense.category && (
                                <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                                  {expense.category}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-red-600">
                              {formatCurrency(expense.cost)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!carReport.revenues.length &&
                  !carReport.expenses.length && (
                    <p className="text-sm text-gray-500 md:col-span-2">
                      Sem movimentações financeiras no período.
                    </p>
                  )}
              </div>
            </div>
          ))}

          {/* RESUMO GERAL FINAL */}
          <div className="mt-8 pt-4 border-t-2">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Resumo Geral
            </h3>
            <table className="w-full text-left text-sm md:text-lg">
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Total de Receitas</td>
                  <td className="p-2 font-bold text-green-600 text-right">
                    {formatCurrency(reportData.grandTotals.totalRevenue)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Total de Despesas</td>
                  <td className="p-2 font-bold text-red-600 text-right">
                    - {formatCurrency(reportData.grandTotals.totalExpense)}
                  </td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                  <td className="p-3 text-base md:text-xl">
                    Lucro Líquido Total
                  </td>
                  <td
                    className={`p-3 text-base md:text-xl text-right ${
                      reportData.grandTotals.totalNetProfit >= 0
                        ? "text-blue-700"
                        : "text-orange-700"
                    }`}
                  >
                    {formatCurrency(reportData.grandTotals.totalNetProfit)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2">Total Comissão da Empresa</td>
                  <td className="p-2 text-right font-bold text-purple-700">
                    {formatCurrency(
                      reportData.grandTotals.totalCompanyCommission
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="p-2">Total para Investidores</td>
                  <td className="p-2 text-right font-bold text-green-700">
                    {formatCurrency(reportData.grandTotals.totalOwnerPayout)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2">Valor Total Investido</td>
                  <td className="p-2 text-right font-bold text-gray-800">
                    {formatCurrency(reportData.grandTotals.totalInvested)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2">Retorno (%) sobre Investimento</td>
                  <td className="p-2 text-right font-bold text-gray-800">
                    {reportData.grandTotals.overallROI != null
                      ? `${reportData.grandTotals.overallROI.toFixed(2)}%`
                      : "—"}
                  </td>
                </tr>

                {reportData.filterType === "owner" &&
                  reportData.ownerName && (
                    <tr className="border-t">
                      <td className="p-2">
                        Resumo específico de{" "}
                        <span className="font-semibold">
                          {reportData.ownerName}
                        </span>
                      </td>
                      <td className="p-2 text-right text-sm text-gray-600">
                        (valores já refletem a divisão empresa x investidor)
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          <div className="my-8 pt-4 border-t-2 break-before-page">
            <ExpensePieChart chartData={reportData.chartData} />
          </div>
        </div>
      )}
    </div>
  );
};

window.ReportsPage = ReportsPage;

})();

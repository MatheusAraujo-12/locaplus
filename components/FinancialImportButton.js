;(function () {
  // components/FinancialImportButton.js
  const { useState } = React;

  // helper simples pra ler CSV como texto
  const parseCsv = async (file) => {
    if (!file) return null;

    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target.result || ""));
      reader.onerror = (err) => reject(err);
      reader.readAsText(file, "utf-8");
    });

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== "..."); // ignora linhas "..."

    if (lines.length < 2) return null;

    const headerLine = lines[0];
    const headers = headerLine
      .split(",")
      .map((h) => h.replace(/^"|"$/g, "").trim());

    const indexOf = (name) => headers.indexOf(name);

    const idxId = indexOf("id");
    const idxDate = indexOf("date");
    const idxName = indexOf("name");
    const idxCost = indexOf("cost");
    const idxCarId = indexOf("car_id");

    if (idxDate === -1 || idxName === -1 || idxCost === -1 || idxCarId === -1) {
      throw new Error(
        'Cabeçalho inválido: precisa ter "date", "name", "cost", "car_id".'
      );
    }

    const getValue = (cols, idx) => {
      if (idx === -1) return "";
      const raw = cols[idx] ?? "";
      return String(raw).replace(/^"|"$/g, "").trim();
    };

    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = line.split(",");
      if (cols.length < headers.length) {
        // linha quebrada, pula
        continue;
      }

      const id = getValue(cols, idxId);
      const date = getValue(cols, idxDate);
      const name = getValue(cols, idxName);
      const costRaw = getValue(cols, idxCost);
      const carIdRaw = getValue(cols, idxCarId);

      if (!date || !name || !carIdRaw) continue;

      const cost = Number(costRaw.replace(",", ".")) || 0;
      const carLegacyId = Number(carIdRaw) || null;

      rows.push({
        legacyRowId: id ? Number(id) : null,
        date,
        name,
        cost,
        carLegacyId,
      });
    }

    return rows;
  };

  const FinancialImportButton = ({ db, basePath, showAlert }) => {
    const { collection, getDocs, addDoc } = window.firebase || {};
    const [isOpen, setIsOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [incomeFile, setIncomeFile] = useState(null);
    const [expenseFile, setExpenseFile] = useState(null);

    const handleFileChange = (setter) => (e) => {
      const file = e.target.files?.[0] || null;
      setter(file);
      // permite selecionar o mesmo arquivo depois
      e.target.value = "";
    };

    const handleImport = async () => {
      if (!db) {
        showAlert("Banco de dados não inicializado.", "error");
        return;
      }

      if (!incomeFile && !expenseFile) {
        showAlert(
          "Selecione ao menos um arquivo (receitas ou despesas).",
          "warning"
        );
        return;
      }

      setIsImporting(true);

      try {
        // 1) Mapa de carros: legacyId -> { id, name }
        const carsSnap = await getDocs(collection(db, `${basePath}/cars`));
        const carByLegacyId = new Map();

        carsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.legacyId != null) {
            carByLegacyId.set(Number(data.legacyId), {
              id: docSnap.id,
              name: data.name,
              plate: data.plate,
            });
          }
        });

        let importedIncomes = 0;
        let importedExpenses = 0;

        // 2) Importar RECEITAS (income)
        if (incomeFile) {
          const incomeRows = await parseCsv(incomeFile);
          if (!incomeRows || incomeRows.length === 0) {
            showAlert("Arquivo de receitas vazio ou inválido.", "warning");
          } else {
            for (const row of incomeRows) {
              const carInfo = carByLegacyId.get(row.carLegacyId);
              if (!carInfo) {
                // carro ainda não importado ou sem legacyId; pula
                continue;
              }

              const revenueDoc = {
                date: row.date, // string "2023-01-02"
                description: row.name, // ex: "aluguel", "troca de óleo"
                value: row.cost, // número
                legacyIncomeId: row.legacyRowId, // pra futura anti-clone, se quiser
                importSource: "income_csv",
                createdAt: new Date(),
              };

              await addDoc(
                collection(db, `${basePath}/cars/${carInfo.id}/revenues`),
                revenueDoc
              );
              importedIncomes += 1;
            }
          }
        }

        // 3) Importar DESPESAS (car_expense)
        if (expenseFile) {
          const expenseRows = await parseCsv(expenseFile);
          if (!expenseRows || expenseRows.length === 0) {
            showAlert("Arquivo de despesas vazio ou inválido.", "warning");
          } else {
            for (const row of expenseRows) {
              const carInfo = carByLegacyId.get(row.carLegacyId);
              if (!carInfo) continue;

              const expenseDoc = {
                date: row.date,
                description: row.name, // texto do CSV
                cost: row.cost,
                category: "Despesa importada", // você pode refinar isso depois
                items: [], // sem peças associadas, é genérico
                itemIds: [],
                legacyCarExpenseId: row.legacyRowId,
                importSource: "car_expense_csv",
                createdAt: new Date(),
              };

              await addDoc(
                collection(db, `${basePath}/cars/${carInfo.id}/expenses`),
                expenseDoc
              );
              importedExpenses += 1;
            }
          }
        }

        let msg = "Importação financeira concluída.";
        if (importedIncomes) msg += `\n• ${importedIncomes} receita(s) importadas.`;
        if (importedExpenses) msg += `\n• ${importedExpenses} despesa(s) importadas.`;

        if (!importedIncomes && !importedExpenses) {
          msg =
            "Nenhuma linha foi importada. Verifique se os carros já foram importados e se o arquivo está correto.";
          showAlert(msg, "warning");
        } else {
          showAlert(msg, "success");
        }

        setIncomeFile(null);
        setExpenseFile(null);
        setIsOpen(false);
      } catch (err) {
        console.error("Erro ao importar financeiro:", err);
        showAlert("Erro ao importar financeiro. Verifique o arquivo.", "error");
      } finally {
        setIsImporting(false);
      }
    };

    return (
      <>
        {/* Botão que abre o modal */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center text-sm transition-all"
        >
          <i className="fas fa-file-invoice-dollar mr-2" />
          Importar Receitas/Despesas
        </button>

        {/* Modal */}
        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
                Importar financeiro (CSV)
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                Use os arquivos exportados do sistema antigo:
                <br />
                <span className="font-semibold">income_*.csv</span> para receitas e{" "}
                <span className="font-semibold">car_expense_*.csv</span> para
                despesas.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Arquivo de RECEITAS (income_*.csv)
                  </label>
                  <label className="flex items-center justify-between bg-gray-100 rounded-lg border px-3 py-2 cursor-pointer hover:bg-gray-200 text-sm">
                    <span className="truncate">
                      {incomeFile ? incomeFile.name : "Selecionar arquivo..."}
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange(setIncomeFile)}
                      className="hidden"
                    />
                    <span className="ml-3 bg-purple-600 text-white px-3 py-1 rounded-md text-xs">
                      Escolher
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Arquivo de DESPESAS (car_expense_*.csv)
                  </label>
                  <label className="flex items-center justify-between bg-gray-100 rounded-lg border px-3 py-2 cursor-pointer hover:bg-gray-200 text-sm">
                    <span className="truncate">
                      {expenseFile ? expenseFile.name : "Selecionar arquivo..."}
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange(setExpenseFile)}
                      className="hidden"
                    />
                    <span className="ml-3 bg-purple-600 text-white px-3 py-1 rounded-md text-xs">
                      Escolher
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 text-sm"
                  disabled={isImporting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className="w-full bg-purple-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-800 text-sm disabled:bg-purple-400"
                  disabled={isImporting}
                >
                  {isImporting ? "Importando..." : "Importar agora"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  window.FinancialImportButton = FinancialImportButton;
})();

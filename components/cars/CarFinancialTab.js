;(function(){
// src/components/cars/CarFinancialTab.js
const CarFinancialTab = ({
  financialSummary,
  revenues,
  expenses,
  onAddRevenue,
  onAddExpense,
  onEditRevenue,
  onDeleteRevenue,
  onEditExpense,
  onDeleteExpense,
}) => {
  return (
    <div>
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <p className="text-sm text-green-700 font-bold">Total de Receitas</p>
          <p className="text-2xl font-extrabold text-green-900">
            R$ {financialSummary.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-red-100 p-4 rounded-lg text-center">
          <p className="text-sm text-red-700 font-bold">Total de Despesas</p>
          <p className="text-2xl font-extrabold text-red-900">
            R$ {financialSummary.totalExpense.toFixed(2)}
          </p>
        </div>

        <div
          className={`${
            financialSummary.netProfit >= 0 ? "bg-blue-100" : "bg-orange-100"
          } p-4 rounded-lg text-center`}
        >
          <p
            className={`text-sm ${
              financialSummary.netProfit >= 0
                ? "text-blue-700"
                : "text-orange-700"
            } font-bold`}
          >
            Lucro / Prejuízo
          </p>

          <p
            className={`text-2xl font-extrabold ${
              financialSummary.netProfit >= 0
                ? "text-blue-900"
                : "text-orange-900"
            }`}
          >
            R$ {financialSummary.netProfit.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <button
          onClick={onAddRevenue}
          className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-sm"
        >
          <i className="fas fa-plus mr-2"></i>
          Adicionar Receita
        </button>

        <button
          onClick={onAddExpense}
          className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm"
        >
          <i className="fas fa-plus mr-2"></i>
          Adicionar Despesa
        </button>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-lg mb-2">Histórico de Receitas</h3>
          <RevenuesTable
            revenues={revenues}
            onEdit={onEditRevenue}
            onDelete={onDeleteRevenue}
          />
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">Histórico de Despesas</h3>
          <ExpensesTable
            expenses={expenses}
            onEdit={onEditExpense}
            onDelete={onDeleteExpense}
          />
        </div>
      </div>
    </div>
  );
};

window.CarFinancialTab = CarFinancialTab;

})();

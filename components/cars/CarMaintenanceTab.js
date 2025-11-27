;(function(){
// src/components/cars/CarMaintenanceTab.js
const CarMaintenanceTab = ({
  maintenanceExpenses,
  searchQuery,
  onSearchChange,
  onEditExpense,
  onDeleteExpense,
}) => {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center sm:justify-between">
        <h3 className="font-bold text-lg">Histórico de Manutenções</h3>

        <input
          type="text"
          placeholder="Buscar por descrição ou oficina..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-72 bg-gray-100 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {maintenanceExpenses.length === 0 ? (
        <p className="text-gray-500 text-sm">
          Nenhuma manutenção encontrada para este filtro.
        </p>
      ) : (
        <div className="space-y-3">
          {maintenanceExpenses.map((exp) => {
            const itemsSummary =
              Array.isArray(exp.items) && exp.items.length > 0
                ? exp.items
                    .map((i) => `${i.quantity || 1}x ${i.name}`)
                    .join(", ")
                : "";

            return (
              <div
                key={exp.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-1">
                    <span className="font-semibold text-gray-800">
                      {exp.date}
                    </span>
                    {exp.odometer != null && (
                      <span>• {Number(exp.odometer)} km</span>
                    )}
                    <span>• R$ {Number(exp.cost).toFixed(2)}</span>
                  </div>

                  {exp.workshopName && (
                    <p className="text-xs text-blue-700 mb-1">
                      Oficina: {exp.workshopName}
                    </p>
                  )}

                  {exp.description && (
                    <p className="text-sm text-gray-700">{exp.description}</p>
                  )}

                  {itemsSummary && (
                    <p className="text-xs text-gray-500 mt-1">
                      Itens: {itemsSummary}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => onEditExpense(exp)}
                    className="bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-700"
                  >
                    Ver / Editar
                  </button>

                  <button
                    onClick={() => onDeleteExpense(exp.id)}
                    className="bg-red-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-red-700"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

window.CarMaintenanceTab = CarMaintenanceTab;

})();

;(function(){
// src/components/cars/CarPendingsTab.js
const CarPendingsTab = ({
  pendings,
  searchQuery,
  onSearchChange,
  onMarkPaid,
  onReopen,
  onEdit,
  onDelete,
  formatDate,
  formatCurrency,
}) => {
  const hasPendings = pendings && pendings.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center sm:justify-between">
        <h3 className="font-bold text-lg">Pendências do Motorista</h3>
        <input
          type="text"
          placeholder="Buscar por descrição ou motorista..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-72 bg-gray-100 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {!hasPendings ? (
        <p className="text-gray-500 text-sm">
          Nenhuma pendência encontrada para este filtro.
        </p>
      ) : (
        <div className="space-y-3">
          {pendings.map((p) => {
            const status = (p.status || "").toLowerCase();
            const isPaid = status === "paid";
            const isOpen = status === "open";

            return (
              <div
                key={p.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-1">
                    <span className="font-semibold text-gray-800">
                      {formatDate(p.date || p.createdAt)}
                    </span>
                    <span>• {formatCurrency(p.amount)}</span>
                    {p.status && (
                      <span
                        className={
                          isPaid
                            ? "px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"
                            : isOpen
                            ? "px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700"
                            : "px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                        }
                      >
                        {p.status === "paid"
                          ? "Paga"
                          : p.status === "open"
                          ? "Em aberto"
                          : p.status}
                      </span>
                    )}
                  </div>

                  {p.driverName && (
                    <p className="text-xs text-blue-700 mb-1">
                      Motorista: {p.driverName}
                    </p>
                  )}

                  {p.description && (
                    <p className="text-sm text-gray-700">{p.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  {isOpen && (
                    <button
                      onClick={() => onMarkPaid(p)}
                      className="bg-green-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-700"
                    >
                      Marcar como Paga
                    </button>
                  )}
                  {isPaid && (
                    <button
                      onClick={() => onReopen(p)}
                      className="bg-orange-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-orange-600"
                    >
                      Reabrir
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(p)}
                    className="bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-700"
                  >
                    Ver / Editar
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
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

window.CarPendingsTab = React.memo(CarPendingsTab);

})();

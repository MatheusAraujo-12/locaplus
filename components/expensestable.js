;(function () {
  // components/ExpensesTable.js

  const toDate = (value) => {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      return new Date(value.includes("T") ? value : `${value}T00:00:00`);
    }
    return null;
  };

  const formatDate = (value) => {
    const d = toDate(value);
    if (!d || Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value) =>
    `R$ ${Number(value || 0).toFixed(2)}`;

  const ExpensesTable = ({ expenses = [], onEdit, onDelete }) => {
    return (
      <table className="w-full text-left min-w-[500px]">
        <thead>
          <tr>
            <th className="p-3">Data</th>
            <th className="p-3">Categoria</th>
            <th className="p-3">Descrição</th>
            <th className="p-3">Itens</th>
            <th className="p-3 text-right">Custo</th>
            {(onEdit || onDelete) && (
              <th className="p-3 text-right whitespace-nowrap">Ações</th>
            )}
          </tr>
        </thead>
        <tbody>
          {expenses.length > 0 ? (
            expenses.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="p-2 whitespace-nowrap">
                  {formatDate(e.date)}
                </td>

                <td className="p-2">
                  <span className="text-xs uppercase font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    {e.category || "-"}
                  </span>
                </td>

                <td
                  className="p-2 text-sm text-gray-700 max-w-xs truncate"
                  title={e.description || ""}
                >
                  {e.description || "-"}
                </td>

                <td className="p-2 text-sm text-gray-700">
                  {Array.isArray(e.items) && e.items.length > 0 ? (
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:underline text-xs">
                        Ver itens ({e.items.length})
                      </summary>
                      <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
                        {e.items.map((item, idx) => (
                          <li key={idx}>
                            {item.quantity || 1}x {item.name} -{" "}
                            {formatCurrency(item.price)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <span className="text-xs text-gray-400">Sem itens</span>
                  )}
                </td>

                <td className="p-2 text-right font-semibold text-gray-800">
                  {formatCurrency(e.cost)}
                </td>

                {(onEdit || onDelete) && (
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(e)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(e.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                            <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center p-4 text-gray-500">
                Nenhuma despesa registrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  window.ExpensesTable = ExpensesTable;
})();

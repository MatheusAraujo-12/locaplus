;(function () {
  // components/RevenuesTable.js

  const formatDate = (val) => {
    if (!val) return "-";
    const d = val?.toDate ? val.toDate() : new Date(val);
    if (!d || isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (n) => `R$ ${Number(n || 0).toFixed(2)}`;

  /**
   * props:
   *  - revenues: array de receitas
   *  - onEdit?(revenue)
   *  - onDelete?(revenueId)
   */
  const RevenuesTable = ({ revenues = [], onEdit, onDelete }) => {
    if (!revenues.length) {
      return (
        <p className="text-sm text-gray-500">
          Nenhuma receita registrada para este veículo.
        </p>
      );
    }

    return (
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                Data
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                Descrição
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                Valor
              </th>
              {(onEdit || onDelete) && (
                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {revenues.map((rev) => (
              <tr
                key={rev.id}
                className="border-t hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2">{formatDate(rev.date)}</td>
                <td className="px-3 py-2">
                  <div className="max-w-xs truncate" title={rev.description}>
                    {rev.description || "-"}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(rev.value)}
                </td>
                {(onEdit || onDelete) && (
                  <td className="px-3 py-2 text-right">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(rev)}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 mr-2"
                      >
                        <i className="fas fa-edit mr-1" />
                        Ver / Editar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(rev.id)}
                        className="inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        <i className="fas fa-trash-alt mr-0" />
                        Excluir
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  window.RevenuesTable = RevenuesTable;
})();

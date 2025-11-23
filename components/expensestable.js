// components/ExpensesTable.js

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return null;
};

const formatDate = (value) => {
  const d = toDate(value);
  if (!d || Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
};

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
          {(onEdit || onDelete) && <th className="p-3 text-right whitespace-nowrap">Ações</th>}
        </tr>
      </thead>
      <tbody>
        {expenses.length > 0 ? expenses.map(e => (
          <tr key={e.id} className="border-b">
            <td className="p-2 whitespace-nowrap">{formatDate(e.date)}</td>
            <td className="p-2"><span className="text-xs uppercase font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{e.category}</span></td>
            <td className="p-2 text-sm text-gray-700 max-w-xs truncate" title={e.description || ''}>
              {e.description || '-'}
            </td>
            <td className="p-2 text-sm text-gray-700">
              {Array.isArray(e.items) && e.items.length > 0 ? (
                <details className="cursor-pointer">
                  <summary className="text-blue-600 hover:text-blue-800 font-semibold">Itens ({e.items.length})</summary>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    {e.items.map((it, idx) => (
                      <li key={idx} className="text-xs">
                        {it.quantity || 1}x {it.name} {it.price ? `- R$ ${(Number(it.price) || 0).toFixed(2)}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <span className="text-gray-400 text-xs">Sem itens</span>
              )}
            </td>
            <td className="p-2 font-semibold text-right whitespace-nowrap">R$ {Number(e.cost || 0).toFixed(2)}</td>
            {(onEdit || onDelete) && (
              <td className="p-2 text-right whitespace-nowrap space-x-2">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                  >
                    Ver/Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(e.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Excluir
                  </button>
                )}
              </td>
            )}
          </tr>
        )) : (
          <tr>
            <td colSpan={onEdit || onDelete ? 6 : 5} className="text-center p-4 text-gray-500">Nenhuma despesa.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

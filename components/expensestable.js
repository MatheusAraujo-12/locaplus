// components/ExpensesTable.js

const ExpensesTable = ({ expenses = [] }) => {
  return (
    <table className="w-full text-left min-w-[500px]">
      <thead>
        <tr>
          <th className="p-3">Data</th>
          <th className="p-3">Categoria</th>
          <th className="p-3 text-right">Custo</th>
        </tr>
      </thead>
      <tbody>
        {expenses.length > 0 ? expenses.map(e => (
          <tr key={e.id} className="border-b">
            <td className="p-2 whitespace-nowrap">{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td className="p-2"><span className="text-xs uppercase font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{e.category}</span></td>
            <td className="p-2 font-semibold text-right whitespace-nowrap">R$ {Number(e.cost || 0).toFixed(2)}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan="3" className="text-center p-4 text-gray-500">Nenhuma despesa.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};


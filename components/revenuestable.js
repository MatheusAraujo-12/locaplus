// components/RevenuesTable.js

const RevenuesTable = ({ revenues = [] }) => {
  return (
    <table className="w-full text-left min-w-[300px]">
            <thead>
        <tr>
          <th className="p-2 bg-gray-50">Descrição</th>
          <th className="p-2 bg-gray-50 text-right">Valor</th>
        </tr>
      </thead>
      <tbody>
        {revenues.length > 0 ? revenues.map(r => (
          <tr key={r.id} className="border-b">
            <td className="p-2 whitespace-nowrap">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td className="p-2">{r.description}</td>
            <td className="p-2 font-semibold text-right whitespace-nowrap">R$ {Number(r.value || 0).toFixed(2)}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan="3" className="text-center p-4 text-gray-500">Nenhuma receita.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};


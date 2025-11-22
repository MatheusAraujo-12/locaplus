// components/RemindersTable.js

const RemindersTable = ({ reminders = [], isAdmin = false, onAction }) => {
  return (
    <table className="w-full text-left min-w-[500px]">
            <thead>
        <tr>
          <th className="p-3">Ações</th>
        </tr>
      </thead>
      <tbody>
        {reminders.length > 0 ? reminders.map(r => (
          <tr key={r.id} className="border-b hover:bg-gray-50">
            <td className="p-3">{r.description}</td>
            <td className="p-3 capitalize">{r.type}</td>
            <td className="p-3 whitespace-nowrap">
              {r.type === 'mileage' ? `${r.targetMileage} km` : new Date(r.targetDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </td>
            <td className="p-3">{r.status}</td>
            <td className="p-3">
              {isAdmin && (
                <div className="flex gap-2">
                  {r.status==='active' && (
                    <button onClick={() => onAction && onAction(r.id, 'concluido')} className="text-green-500 hover:text-green-700">
                      <i className="fas fa-check-circle"></i>
                    </button>
                  )}
                  <button onClick={() => onAction && onAction(r.id, 'apagado')} className="text-red-500 hover:text-red-700">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              )}
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan="5" className="text-center p-4 text-gray-500">Nenhum lembrete.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};




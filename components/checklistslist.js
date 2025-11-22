// components/ChecklistsList.js

const ChecklistsList = ({ checklists = [], isAdmin = false, onView, onRequestDelete }) => {
  return (
    <div>
      <h3 className="font-bold text-lg mb-4">Histórico de Vistorias</h3>
      {checklists.length > 0 ? (
        <div className="space-y-3">
          {checklists.map(cl => (
            <div key={cl.id} className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs uppercase font-bold px-2 py-1 rounded-full ${cl.type === 'delivery_return' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                    {cl.type === 'delivery_return' ? 'Entrega/Devolução' : 'Rotina'}
                  </span>
                  <p className="font-bold">
                    {cl.date && cl.date.toDate
                      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(cl.date.toDate())
                      : (cl.date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(cl.date)) : 'Data inválida')}
                  </p>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-center">
                  <button onClick={() => onView && onView(cl)} className="text-blue-600 hover:text-blue-800 text-sm">
                    <i className="fas fa-eye mr-1"></i> Ver
                  </button>
                  {isAdmin && (
                    <button onClick={() => onRequestDelete && onRequestDelete(cl)} className="text-red-500 hover:text-red-700 text-sm">
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">por: {cl.checkedBy} @ {cl.mileageAtCheck} km</p>
              {cl.driverName && <p className="text-sm text-gray-600">Motorista: <strong>{cl.driverName}</strong></p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">Nenhuma vistoria registrada.</p>
      )}
    </div>
  );
};




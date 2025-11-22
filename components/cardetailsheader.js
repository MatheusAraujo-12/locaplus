const CarDetailsHeader = ({
  goBack,
  dueReminders = [],
  selectedCar,
  assignedDriver,
  isAdmin,
  setActiveModals,
  setModalData,
}) => {
  return (
    <>
      <button onClick={goBack} className="mb-6 text-blue-600 hover:text-blue-800 font-semibold">
        <i className="fas fa-arrow-left mr-2"></i>Voltar para a Frota
      </button>

      <div className="grid grid-cols-1 gap-6">
        <div>
          {dueReminders.length > 0 && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-6 shadow-md">
              <p className="font-bold text-lg mb-2">Lembretes Pendentes</p>
              <ul className="list-disc list-inside">
                {dueReminders.map((reminder) => (
                  <li key={reminder.id}>{reminder.description}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-800 text-left">{selectedCar.name}</p>
                {selectedCar.ownerName && (
                  <p className="text-sm text-gray-600 text-left mt-1">
                    Proprietário: <strong>{selectedCar.ownerName}</strong>
                    {selectedCar.commissionPercentage && ` (${selectedCar.commissionPercentage}%)`}
                  </p>
                )}
                {assignedDriver && (
                  <p className="text-sm text-green-600 font-semibold text-left mt-1">
                    <i className="fas fa-user-check mr-2"></i>
                    Motorista: <strong>{assignedDriver.name}</strong>
                  </p>
                )}
              </div>

              <div className="flex gap-4 self-end sm:self-start">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setModalData((prev) => ({ ...prev, carToEdit: selectedCar }));
                      setActiveModals((prev) => ({ ...prev, car: true }));
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title="Editar Veículo"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveModals((prev) => ({ ...prev, deleteCar: true }));
                    }}
                    className="text-red-500 hover:text-red-700"
                    title="Excluir Veículo"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="text-center mt-4 border-t pt-4">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Quilometragem Atual</p>
              <p className="text-5xl md:text-6xl font-extrabold text-blue-900 my-1">
                {selectedCar.currentMileage}
                <span className="text-2xl md:text-3xl font-medium"> km</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

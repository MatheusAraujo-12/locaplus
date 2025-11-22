const CarFormModal = ({ car, onClose, onSave, drivers = [] }) => {
  const { useState } = React;

  const [formData, setFormData] = useState({
    name: car?.name || '',
    plate: car?.plate || '',
    currentMileage: car?.currentMileage || '',
    lastOilChange: car?.lastOilChange || '',
    oilChangeInterval: car?.oilChangeInterval || '10000',
    avgConsumption: car?.avgConsumption || '',
    fuelType: car?.fuelType || 'Gasolina',
    ownerName: car?.ownerName || '',
    commissionPercentage: car?.commissionPercentage || '',
    assignedDriverId: car?.assignedDriverId || '',
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = () => onSave({ ...formData, id: car?.id });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40 modal-enter overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{car ? 'Editar Carro' : 'Adicionar Novo Carro'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" name="name" placeholder="Nome (Ex: Onix)" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <input type="text" name="plate" placeholder="Placa" value={formData.plate} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <input type="number" name="currentMileage" placeholder="KM Atual" value={formData.currentMileage} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <input type="number" name="lastOilChange" placeholder="KM da última troca de óleo" value={formData.lastOilChange} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <input type="number" name="oilChangeInterval" placeholder="Intervalo de Troca (km)" value={formData.oilChangeInterval} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <input type="number" name="avgConsumption" placeholder="Consumo médio (km/L)" value={formData.avgConsumption} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500">
            <option>Gasolina</option><option>Etanol</option>
          </select>
        </div>
        <div className="md:col-span-2 mb-4">
          <label className="block text-sm font-medium text-gray-700">Atribuir a Motorista</label>
          <select name="assignedDriverId" value={formData.assignedDriverId} onChange={handleChange} className="w-full mt-1 p-3 bg-gray-100 rounded-lg border focus:ring-2 focus:ring-blue-500">
            <option value="">Nenhum motorista</option>
            {drivers.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>
        <hr className="my-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Dados do Proprietário</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" name="ownerName" placeholder="Nome do Proprietário" value={formData.ownerName} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <input type="number" name="commissionPercentage" placeholder="Comissão:ring-blue-500"/>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button onClick={onClose} className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600">Cancelar</button>
          <button onClick={handleSubmit} className="w-full bg-blue-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900">Salvar</button>
        </div>
      </div>
    </div>
  );
};

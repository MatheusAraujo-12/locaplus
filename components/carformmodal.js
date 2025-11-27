;(function () {
// components/carformmodal.js

const CarFormModal = ({ onClose, onSave, car = null, drivers = [] }) => {
  const { useEffect, useState } = React;

  const [formData, setFormData] = useState({
    name: "",
    plate: "",
    ownerName: "",
    currentMileage: "",
    lastOilChange: "",
    oilChangeInterval: "",
    avgConsumption: "",
    assignedDriverId: "",
    // NOVOS CAMPOS DE DIVISÃO DE LUCRO
    profitShareMode: "percentage",        // 'percentage' | 'fixed'
    commissionPercentage: "",             // % para o proprietário
    fixedOwnerPayout: "",                 // R$ fixo para o proprietário
  });

  // Preenche os dados ao editar um carro
  useEffect(() => {
    if (car) {
      setFormData({
        name: car.name || "",
        plate: car.plate || "",
        ownerName: car.ownerName || "",
        currentMileage:
          car.currentMileage != null ? String(car.currentMileage) : "",
        lastOilChange:
          car.lastOilChange != null ? String(car.lastOilChange) : "",
        oilChangeInterval:
          car.oilChangeInterval != null ? String(car.oilChangeInterval) : "",
        avgConsumption:
          car.avgConsumption != null ? String(car.avgConsumption) : "",
        assignedDriverId: car.assignedDriverId || "",
        profitShareMode: car.profitShareMode || "percentage",
        commissionPercentage:
          car.commissionPercentage != null
            ? String(car.commissionPercentage)
            : "",
        fixedOwnerPayout:
          car.fixedOwnerPayout != null ? String(car.fixedOwnerPayout) : "",
      });
    }
  }, [car]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("Informe o nome/apelido do veículo.");
      return;
    }

    // Normaliza valores numéricos
    const commissionPercentage =
      formData.profitShareMode === "percentage"
        ? Number(formData.commissionPercentage || 0)
        : 0;

    const fixedOwnerPayout =
      formData.profitShareMode === "fixed"
        ? Number(formData.fixedOwnerPayout || 0)
        : 0;

    const payload = {
      id: car?.id,
      name: formData.name.trim(),
      plate: formData.plate.trim().toUpperCase(),
      ownerName: formData.ownerName.trim(),
      currentMileage: Number(formData.currentMileage || 0),
      lastOilChange: Number(formData.lastOilChange || 0),
      oilChangeInterval: Number(formData.oilChangeInterval || 0),
      avgConsumption: Number(formData.avgConsumption || 0),
      assignedDriverId: formData.assignedDriverId || "",
      // NOVOS CAMPOS
      profitShareMode: formData.profitShareMode,
      commissionPercentage,
      fixedOwnerPayout,
    };

    onSave && onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40 modal-enter">
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {car ? "Editar veículo" : "Cadastrar veículo"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome / Apelido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome / Apelido do veículo
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: HB20 Branco, Logan Prata..."
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Placa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placa
            </label>
            <input
              type="text"
              name="plate"
              value={formData.plate}
              onChange={handleChange}
              placeholder="Ex: ABC1D23"
              className="w-full bg-gray-100 p-3 rounded-lg border uppercase focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Proprietário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proprietário
            </label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              placeholder="Nome do dono do veículo"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Motorista vinculado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motorista vinculado (opcional)
            </label>
            <select
              name="assignedDriverId"
              value={formData.assignedDriverId}
              onChange={handleChange}
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhum motorista fixo</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* KM atual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KM atual
            </label>
            <input
              type="number"
              name="currentMileage"
              value={formData.currentMileage}
              onChange={handleChange}
              placeholder="Ex: 120000"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Última troca de óleo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KM da última troca de óleo
            </label>
            <input
              type="number"
              name="lastOilChange"
              value={formData.lastOilChange}
              onChange={handleChange}
              placeholder="Ex: 110000"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Intervalo de troca de óleo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervalo para troca de óleo (KM)
            </label>
            <input
              type="number"
              name="oilChangeInterval"
              value={formData.oilChangeInterval}
              onChange={handleChange}
              placeholder="Ex: 10000"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Consumo médio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consumo médio (km/L) – opcional
            </label>
            <input
              type="number"
              step="0.1"
              name="avgConsumption"
              value={formData.avgConsumption}
              onChange={handleChange}
              placeholder="Ex: 11.5"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* SEÇÃO: MODELO DE REPASSE / COMISSÃO */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Modelo de repasse / comissão
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Defina como será feita a divisão do lucro deste veículo entre a
            empresa e o proprietário.
          </p>

          {/* Tipo de divisão */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="profitShareMode"
                value="percentage"
                checked={formData.profitShareMode === "percentage"}
                onChange={handleChange}
              />
              <span>Comissão em percentual para o proprietário</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="profitShareMode"
                value="fixed"
                checked={formData.profitShareMode === "fixed"}
                onChange={handleChange}
              />
              <span>Valor fixo em R$ para o proprietário</span>
            </label>
          </div>

          {/* Campos condicionais */}
          {formData.profitShareMode === "percentage" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  % do lucro para o proprietário
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="commissionPercentage"
                  value={formData.commissionPercentage}
                  onChange={handleChange}
                  placeholder="Ex: 50"
                  className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Exemplo: 50% do lucro vai para o proprietário, 50% para a
                  empresa.
                </p>
              </div>
            </div>
          )}

          {formData.profitShareMode === "fixed" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor fixo para o proprietário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="fixedOwnerPayout"
                  value={formData.fixedOwnerPayout}
                  onChange={handleChange}
                  placeholder="Ex: 800.00"
                  className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esse valor será usado nos relatórios como repasse fixo sempre
                  que houver lucro no período.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* BOTÕES */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900"
          >
            Salvar veículo
          </button>
        </div>
      </div>
    </div>
  );
};

window.CarFormModal = CarFormModal;
})();

;(function () {
  const { useState, useEffect } = React;

  const CarFormModal = ({ onClose, onSave, car = null }) => {
    const [formData, setFormData] = useState({
      name: "",
      plate: "",
      brand: "",
      model: "",
      year: "",
      color: "",
      ownerName: "",
      currentMileage: "",
      lastOilChange: "",
      oilChangeInterval: "",
      avgConsumption: "",
      // Comissão SEMPRE da empresa:
      companyCommissionMode: "percentage", // 'percentage' | 'fixed'
      commissionPercentage: "",            // % do lucro para a empresa
      companyFixedCommission: "",          // valor fixo para a empresa
    });

    useEffect(() => {
      if (car) {
        setFormData((prev) => ({
          ...prev,
          name: car.name || "",
          plate: car.plate || "",
          brand: car.brand || "",
          model: car.model || "",
          year: car.year || "",
          color: car.color || "",
          ownerName: car.ownerName || "",
          currentMileage:
            car.currentMileage != null ? String(car.currentMileage) : "",
          lastOilChange:
            car.lastOilChange != null ? String(car.lastOilChange) : "",
          oilChangeInterval:
            car.oilChangeInterval != null ? String(car.oilChangeInterval) : "",
          avgConsumption:
            car.avgConsumption != null ? String(car.avgConsumption) : "",
          companyCommissionMode: car.companyCommissionMode || "percentage",
          commissionPercentage:
            car.commissionPercentage != null
              ? String(car.commissionPercentage)
              : "",
          companyFixedCommission:
            car.companyFixedCommission != null
              ? String(car.companyFixedCommission)
              : "",
        }));
      }
    }, [car]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
      if (!formData.name.trim()) {
        alert("Informe o nome/identificação do veículo.");
        return;
      }
      if (!formData.plate.trim()) {
        alert("Informe a placa do veículo.");
        return;
      }

      // Validações básicas da comissão da empresa
      const commissionMode = formData.companyCommissionMode || "percentage";

      const percentNum = Number(formData.commissionPercentage || 0);
      const fixedNum = Number(
        String(formData.companyFixedCommission || "0").replace(",", ".")
      );

      if (commissionMode === "percentage") {
        if (Number.isNaN(percentNum) || percentNum < 0 || percentNum > 100) {
          alert(
            "Informe um percentual de comissão da empresa entre 0% e 100%."
          );
          return;
        }
      }

      if (commissionMode === "fixed") {
        if (Number.isNaN(fixedNum) || fixedNum < 0) {
          alert("Informe um valor fixo de comissão da empresa válido (R$).");
          return;
        }
      }

      const payload = {
        id: car?.id,
        name: formData.name.trim(),
        plate: formData.plate.trim().toUpperCase(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: formData.year.trim(),
        color: formData.color.trim(),
        ownerName: formData.ownerName.trim(),
        currentMileage: Number(formData.currentMileage || 0),
        lastOilChange: Number(formData.lastOilChange || 0),
        oilChangeInterval: Number(formData.oilChangeInterval || 0),
        avgConsumption: Number(formData.avgConsumption || 0),
        // Comissão para a EMPRESA:
        companyCommissionMode: commissionMode,
        commissionPercentage:
          commissionMode === "percentage" ? percentNum : 0,
        companyFixedCommission:
          commissionMode === "fixed" ? fixedNum : 0,
      };

      onSave && onSave(payload);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 modal-enter">
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {car ? "Editar veículo" : "Cadastrar novo veículo"}
          </h2>

          {/* DADOS BÁSICOS DO VEÍCULO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nome / Identificação (ex: Duster Branca)"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="plate"
              value={formData.plate}
              onChange={handleChange}
              placeholder="Placa"
              className="w-full bg-gray-100 p-3 rounded-lg border uppercase focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="Marca"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="Modelo"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="Ano"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="Cor"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              placeholder="Nome do proprietário"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 md:col-span-2"
            />
          </div>

          {/* DADOS OPERACIONAIS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quilometragem atual
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Última troca de óleo (km)
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intervalo troca de óleo (km)
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumo médio (km/L)
              </label>
              <input
                type="number"
                step="0.1"
                name="avgConsumption"
                value={formData.avgConsumption}
                onChange={handleChange}
                placeholder="Ex: 10,5"
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* COMISSÃO DA EMPRESA */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-2">
              Comissão da empresa sobre o lucro do veículo
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Aqui você define quanto a <strong>empresa</strong> fica do lucro
              do veículo. O restante é repassado ao proprietário.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de comissão
                </label>
                <select
                  name="companyCommissionMode"
                  value={formData.companyCommissionMode}
                  onChange={handleChange}
                  className="w-full bg-white p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">
                    Percentual do lucro para a empresa
                  </option>
                  <option value="fixed">
                    Valor fixo para a empresa (R$)
                  </option>
                </select>
              </div>

              {formData.companyCommissionMode === "percentage" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    % do lucro para a empresa
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="commissionPercentage"
                      value={formData.commissionPercentage}
                      onChange={handleChange}
                      placeholder="Ex: 40"
                      className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Exemplo: 40% do lucro vai para a empresa, 60% para o
                    proprietário.
                  </p>
                </div>
              )}

              {formData.companyCommissionMode === "fixed" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor fixo para a empresa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="companyFixedCommission"
                    value={formData.companyFixedCommission}
                    onChange={handleChange}
                    placeholder="Ex: 800,00"
                    className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    A empresa recebe esse valor fixo do lucro do carro. 
                    O restante é repassado ao proprietário.
                  </p>
                </div>
              )}
            </div>
          </div>

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

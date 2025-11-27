;(function () {
  const { useEffect, useState } = React;

  const PendencyFormModal = ({
    pendency = null,
    drivers = [],
    selectedCar,
    onClose,
    onSave,
    showAlert, // opcional, se você quiser mensagens amigáveis
  }) => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().slice(0, 10),
      description: "",
      amount: "0.00",
      driverId: "",
      status: "open",
    });

    // Helper pra normalizar data (string, Date ou Timestamp)
    const toDateString = (value) => {
      if (!value) {
        return new Date().toISOString().slice(0, 10);
      }
      let d = value;

      // Firestore Timestamp
      if (value?.toDate) {
        d = value.toDate();
      } else if (typeof value === "string") {
        // se já vier "YYYY-MM-DD", só retorna
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        d = new Date(value);
      } else if (!(value instanceof Date)) {
        d = new Date(value);
      }

      if (Number.isNaN(d.getTime())) {
        return new Date().toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };

    useEffect(() => {
      if (pendency) {
        setFormData({
          date: toDateString(pendency.date),
          description: pendency.description || "",
          amount:
            pendency.amount != null
              ? Number(pendency.amount).toFixed(2)
              : "0.00",
          driverId: pendency.driverId || "",
          status: pendency.status || "open",
        });
      }
    }, [pendency]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
      // validações simples
      if (!formData.driverId) {
        showAlert && showAlert("Selecione um motorista.", "warning");
        if (!showAlert) alert("Selecione um motorista.");
        return;
      }

      if (!formData.description.trim()) {
        showAlert &&
          showAlert("Informe uma descrição para a pendência.", "warning");
        if (!showAlert) alert("Informe uma descrição para a pendência.");
        return;
      }

      const amountNumber =
        Number(String(formData.amount).replace(",", ".")) || 0;
      if (amountNumber <= 0) {
        showAlert &&
          showAlert("O valor da pendência deve ser maior que zero.", "warning");
        if (!showAlert)
          alert("O valor da pendência deve ser maior que zero.");
        return;
      }

      const driver = drivers.find((d) => d.id === formData.driverId);

      const payload = {
        id: pendency ? pendency.id : undefined,
        date: formData.date,
        description: formData.description.trim(),
        amount: amountNumber,
        status: formData.status || "open",
        driverId: formData.driverId || "",
        driverName: driver?.name || "",
      };

      if (selectedCar?.id) {
        payload.carId = selectedCar.id;
        payload.carName = selectedCar.name || "";
        payload.carPlate = selectedCar.plate || "";
      }

      onSave(payload);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {pendency ? "Editar Pendência" : "Nova Pendência"}
          </h2>

          {selectedCar && (
            <p className="text-sm text-gray-500 mb-4">
              Veículo:{" "}
              <span className="font-semibold">{selectedCar.name}</span>{" "}
              ({selectedCar.plate || "sem placa"})
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motorista
              </label>
              <select
                name="driverId"
                value={formData.driverId}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um motorista</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Ex: Multa, dano, manutenção compartilhada..."
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                min="0"
                step="0.01"
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Em aberto</option>
                <option value="paid">Paga</option>
                <option value="cancelled">Cancelada</option>
              </select>
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
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  window.PendencyFormModal = PendencyFormModal;
})();

;(function () {
  const toInputDate = (value) => {
    if (!value) return new Date().toISOString().slice(0, 10);
    if (typeof value === "string") return value.slice(0, 10);
    if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  };

  const ServiceFormModal = ({
    onClose,
    onSave,
    service = null,
    defaultMileage = "",
  }) => {
    const { useEffect, useState } = React;

    const [formData, setFormData] = useState({
      date: new Date().toISOString().slice(0, 10),
      serviceName: "",
      description: "",
      mileage: defaultMileage || "",
      performedBy: "",
      cost: "",
    });

    useEffect(() => {
      if (service) {
        setFormData({
          date: toInputDate(service.date),
          serviceName: service.serviceName || "",
          description: service.description || "",
          mileage: service.mileage || "",
          performedBy: service.performedBy || "",
          cost: service.cost != null ? String(service.cost) : "",
        });
      }
    }, [service]);

    const handleChange = (event) => {
      const { name, value } = event.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
      if (!formData.serviceName.trim()) {
        alert("Informe o nome do serviço executado.");
        return;
      }
      onSave({
        id: service?.id,
        date: formData.date,
        serviceName: formData.serviceName.trim(),
        description: formData.description.trim(),
        mileage: formData.mileage,
        performedBy: formData.performedBy.trim(),
        cost: Number(formData.cost) || 0,
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 modal-enter">
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {service ? "Editar serviço" : "Registrar serviço executado"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              name="serviceName"
              value={formData.serviceName}
              onChange={handleChange}
              placeholder="Serviço executado"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              name="performedBy"
              value={formData.performedBy}
              onChange={handleChange}
              placeholder="Responsável (opcional)"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              name="mileage"
              value={formData.mileage}
              onChange={handleChange}
              placeholder="Quilometragem"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do serviço
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Detalhes do que foi executado"
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo do serviço (R$)
              </label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                placeholder="0,00"
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
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
              Salvar serviço
            </button>
          </div>
        </div>
      </div>
    );
  };

  window.ServiceFormModal = ServiceFormModal;
})();


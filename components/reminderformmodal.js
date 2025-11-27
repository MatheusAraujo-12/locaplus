;(function () {
  const ReminderFormModal = ({ onClose, onSave }) => {
    const { useState } = React;
    const [formData, setFormData] = useState({
      description: "",
      type: "mileage",
      targetMileage: "",
      targetDate: "",
    });

    const handleChange = (e) =>
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = () => onSave(formData);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40 modal-enter">
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Criar Lembrete
          </h2>

          <input
            type="text"
            name="description"
            placeholder="Descrição (Ex: Trocar correia dentada)"
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
          />

          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="mileage"
                checked={formData.type === "mileage"}
                onChange={handleChange}
              />
              Por KM
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="date"
                checked={formData.type === "date"}
                onChange={handleChange}
              />
              Por Data
            </label>
          </div>

          {formData.type === "mileage" ? (
            <input
              type="number"
              name="targetMileage"
              placeholder="KM para o lembrete"
              value={formData.targetMileage}
              onChange={handleChange}
              className="w-full bg-gray-100 p-3 rounded-lg border"
            />
          ) : (
            <input
              type="date"
              name="targetDate"
              value={formData.targetDate}
              onChange={handleChange}
              className="w-full bg-gray-100 p-3 rounded-lg border"
            />
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={onClose}
              className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="w-full bg-blue-800 text-white font-bold py-3 px-6 rounded-lg"
            >
              Salvar Lembrete
            </button>
          </div>
        </div>
      </div>
    );
  };

  window.ReminderFormModal = ReminderFormModal;
})();

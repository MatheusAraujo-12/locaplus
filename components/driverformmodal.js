;(function () {
// src/components/DriverFormModal.js
const { useState } = React;

const DriverFormModal = ({ driver = null, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: driver?.name || "",
    cpf: driver?.cpf || "",
    phone: driver?.phone || "",
    email: driver?.email || "",
    rating: driver?.rating ?? 3,
    serasaScore:
      driver?.serasaScore === 0 || driver?.serasaScore
        ? Number(driver.serasaScore)
        : "",
    emergencyContacts:
      Array.isArray(driver?.emergencyContacts) && driver.emergencyContacts.length
        ? driver.emergencyContacts
        : [
            { name: "", phone: "", relation: "" },
            { name: "", phone: "", relation: "" },
          ],
    address: driver?.address || { street: "", city: "", state: "", zip: "" },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (index, field, value) => {
    setForm((prev) => {
      const next = [...(prev.emergencyContacts || [])];
      next[index] = { ...(next[index] || {}), [field]: value };
      return { ...prev, emergencyContacts: next };
    });
  };

  const handleAddressChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      address: { ...(prev.address || {}), [field]: value },
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("Informe o nome do motorista.");
      return;
    }

    const payload = {
      id: driver?.id,
      name: form.name.trim(),
      cpf: form.cpf.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      rating: Number(form.rating) || 0,
      serasaScore:
        form.serasaScore === "" ? null : Number(form.serasaScore) || 0,
      emergencyContacts: (form.emergencyContacts || []).map((c) => ({
        name: c.name || "",
        phone: c.phone || "",
        relation: c.relation || "",
      })),
      address: {
        street: form.address?.street || "",
        city: form.address?.city || "",
        state: form.address?.state || "",
        zip: form.address?.zip || "",
      },
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40 modal-enter">
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {driver ? "Editar Motorista" : "Adicionar Motorista"}
        </h2>

        <div className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome"
            className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="CPF"
            className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Telefone"
            className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
            className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            type="email"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Score Serasa
            </label>
            <input
              name="serasaScore"
              value={form.serasaScore}
              onChange={handleChange}
              placeholder="Ex: 750"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              type="number"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avaliação interna
            </label>
            {typeof StarRatingInteractive === "function" ? (
              <StarRatingInteractive
                value={Number(form.rating) || 0}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, rating: Number(val) || 0 }))
                }
              />
            ) : (
              <select
                name="rating"
                value={form.rating}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(form.emergencyContacts || []).map((contact, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-lg border p-3 space-y-2"
              >
                <p className="text-xs font-semibold text-gray-600">
                  Contato de emergência {idx + 1}
                </p>
                <input
                  value={contact.name || ""}
                  onChange={(e) =>
                    handleContactChange(idx, "name", e.target.value)
                  }
                  placeholder="Nome"
                  className="w-full bg-white p-2 rounded border focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={contact.phone || ""}
                  onChange={(e) =>
                    handleContactChange(idx, "phone", e.target.value)
                  }
                  placeholder="Telefone"
                  className="w-full bg-white p-2 rounded border focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={contact.relation || ""}
                  onChange={(e) =>
                    handleContactChange(idx, "relation", e.target.value)
                  }
                  placeholder="Relação (ex: esposa)"
                  className="w-full bg-white p-2 rounded border focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Endereço</p>
            <input
              value={form.address?.street || ""}
              onChange={(e) => handleAddressChange("street", e.target.value)}
              placeholder="Rua / Número"
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={form.address?.city || ""}
                onChange={(e) => handleAddressChange("city", e.target.value)}
                placeholder="Cidade"
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={form.address?.state || ""}
                onChange={(e) => handleAddressChange("state", e.target.value)}
                placeholder="Estado"
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={form.address?.zip || ""}
                onChange={(e) => handleAddressChange("zip", e.target.value)}
                placeholder="CEP"
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

window.DriverFormModal = DriverFormModal;
})();

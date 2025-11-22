// components/DriverFormModal.js

const DriverFormModal = ({ driver = null, onClose, onSave }) => {
  const { useState } = React;
  const [form, setForm] = useState({
    name: driver?.name || '',
    cnh: driver?.cnh || '',
    rating: driver?.rating ?? 3,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === 'rating' ? Number(value) : value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return alert('Informe o nome do motorista.');
    const payload = { id: driver?.id, name: form.name.trim(), cnh: form.cnh?.trim() || '', rating: Number(form.rating) || 0 };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40 modal-enter">
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{driver ? 'Editar Motorista' : 'Adicionar Motorista'}</h2>
        <div className="space-y-4">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Nome" className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <input name="cnh" value={form.cnh} onChange={handleChange} placeholder="CNH" className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avaliação</label>
            <select name="rating" value={form.rating} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500">
              {[1,2,3,4,5].map((n)=> (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button onClick={onClose} className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600">Cancelar</button>
          <button onClick={handleSubmit} className="w-full bg-blue-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900">Salvar</button>
        </div>
      </div>
    </div>
  );
};


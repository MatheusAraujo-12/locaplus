const RevenueFormModal = ({ onClose, onSave }) => {
    const { useState } = React;

    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().slice(0,10), 
        description: '', 
        value: ''
    });

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSubmit = () => {
        // Validação simples para garantir que os campos não estão vazios
        if (!formData.value || !formData.description) {
            alert("Por favor, preencha a descrição e o valor da receita.");
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 modal-enter">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Adicionar Nova Receita</h2>
                <div className="grid grid-cols-1 gap-4 mb-4">
                    <input 
                        type="date" 
                        name="date" 
                        value={formData.date} 
                        onChange={handleChange} 
                        className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                    />
                    <input 
                        type="text" 
                        name="description" 
                        placeholder="Descrição (Ex: Aluguel semanal)" 
                        value={formData.description} 
                        onChange={handleChange} 
                        className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                    />
                    <input 
                        type="number" 
                        name="value" 
                        placeholder="Valor da Receita (R$)" 
                        value={formData.value} 
                        onChange={handleChange} 
                        className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <button onClick={onClose} className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600">Cancelar</button>
                    <button onClick={handleSubmit} className="w-full bg-blue-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900">Salvar Receita</button>
                </div>
            </div>
        </div>
    );
};

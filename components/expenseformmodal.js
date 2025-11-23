// components/ExpenseFormModal.js - VERSÃO FINAL E CORRIGIDA

const ExpenseFormModal = ({ onClose, onSave, expenseToEdit = null, defaultCategory = 'Manutenção', isCategoryLocked = false, maintenanceItems = [], workshops = [], companyId }) => {
    const { useState, useEffect } = React;

    const [selectedItems, setSelectedItems] = useState([]);
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().slice(0,10),
        cost: '0.00',
        category: defaultCategory,
        customCategory: '',
        description: '',
        workshopId: '', 
    });
    const [isCostManual, setIsCostManual] = useState(false);

    const expenseCategories = ['Manutenção', 'Funilaria', 'Impostos', 'Seguro', 'Limpeza', 'Outros'];

    useEffect(() => {
        if (expenseToEdit) {
            setFormData({
                date: expenseToEdit.date || new Date().toISOString().slice(0,10),
                cost: expenseToEdit.cost ? Number(expenseToEdit.cost).toFixed(2) : '0.00',
                category: expenseToEdit.category || defaultCategory,
                description: expenseToEdit.description || '',
                workshopId: expenseToEdit.workshopId || '',
            });
            setSelectedItems(expenseToEdit.items || []);
            setIsCostManual(true);
        }
    }, [expenseToEdit]);

    useEffect(() => {
        if (formData.category === 'Manutenção' && !isCostManual) {
            const totalCost = selectedItems.reduce((sum, item) => {
                const price = Number(item.price) || 0;
                const quantity = Number(item.quantity) || 1;
                return sum + (price * quantity);
            }, 0);
            setFormData(prev => ({ ...prev, cost: totalCost.toFixed(2) }));
        }
    }, [selectedItems, isCostManual, formData.category]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'cost') {
            setIsCostManual(true);
        }
        if (name === 'category' && value !== 'Manutenção') {
            setSelectedItems([]);
            setIsCostManual(false);
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuantityChange = (itemIndex, change) => {
        const newSelectedItems = selectedItems.map((item, index) => {
            if (index === itemIndex) {
                let newQuantity = (typeof change === 'number') ? (item.quantity || 1) + change : parseInt(change, 10);
                return { ...item, quantity: Math.max(1, isNaN(newQuantity) ? 1 : newQuantity) };
            }
            return item;
        });
        setSelectedItems(newSelectedItems);
        setIsCostManual(false);
    };

    const handleSelectionChange = (newItems) => {
        setSelectedItems(newItems);
        setIsCostManual(false);
    };
    
    const handleSubmit = () => {
        const descriptionFromItems = selectedItems.map(item => `${item.quantity || 1}x ${item.name}`).join(', ');
        const finalDescription = formData.category === 'Manutenção' && selectedItems.length > 0 ? descriptionFromItems : formData.description;
        const finalCategory = (formData.category === 'Outros' && formData.customCategory.trim() !== '') ? formData.customCategory.trim() : formData.category;
        const selectedWorkshop = workshops.find(w => w.id === formData.workshopId);

        const dataToSave = { 
            id: expenseToEdit ? expenseToEdit.id : undefined,
            date: formData.date, 
            description: finalDescription, 
            cost: Number(formData.cost), 
            category: finalCategory,
            items: selectedItems.map(({id, name, price, quantity, type}) => ({id, name, price, quantity, type})),
            itemIds: selectedItems.map(item => item.id),
            workshopId: formData.workshopId,
            workshopName: selectedWorkshop ? selectedWorkshop.name : '',
            companyId: companyId, // <-- Agora a variável 'companyId' existe e vem das props
        };
        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40 modal-enter">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    {expenseToEdit ? 'Editar' : 'Adicionar Nova'} {isCategoryLocked ? 'Manutenção' : 'Despesa'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
                    <select name="category" value={formData.category} onChange={handleChange} disabled={isCategoryLocked} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200">
                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {(formData.category === 'Manutenção' || formData.category === 'Funilaria') && (
                        <select name="workshopId" value={formData.workshopId} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 md:col-span-2">
                            <option value="">Selecione uma Oficina (Opcional)</option>
                            {workshops.map(shop => (<option key={shop.id} value={shop.id}>{shop.name}</option>))}
                        </select>
                    )}
                    {formData.category === 'Outros' && !isCategoryLocked && ( <input type="text" name="customCategory" placeholder="Digite a categoria personalizada" value={formData.customCategory} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 md:col-span-2"/> )}
                    {formData.category === 'Manutenção' ? (
                        <MultiItemSelector allItems={maintenanceItems} selectedItems={selectedItems} onSelectionChange={handleSelectionChange} onQuantityChange={handleQuantityChange} />
                    ) : (
                        <input type="text" name="description" placeholder="Descrição da Despesa" value={formData.description} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 md:col-span-2"/>
                    )}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custo Total (R$)</label>
                        <input type="number" name="cost" placeholder="Custo Total (R$)" value={formData.cost} onChange={handleChange} className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"/>
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

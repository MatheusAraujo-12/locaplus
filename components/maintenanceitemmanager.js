const normalizeType = (value = '') =>
    value
        .normalize('NFD')
        .replace(/[^\w\s]/g, '')
        .toLowerCase();

const isPartItem = (item) => normalizeType(item?.type || '').startsWith('peca');

const MaintenanceItemManager = ({ db, basePath, onClose, showAlert }) => {
    const { useEffect, useState } = React;
    const { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy, updateDoc, increment } = window.firebase;
    const [items, setItems] = useState([]);
    const [newItemData, setNewItemData] = useState({ name: '', price: '', type: 'Peça' });
    const [stockToAdd, setStockToAdd] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const itemsCollectionRef = collection(db, `${basePath}/maintenanceItems`);

    useEffect(() => {
        const q = query(itemsCollectionRef, orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setItems(fetchedItems);
        });
        return unsubscribe;
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setNewItemData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddItem = async () => {
        if (!newItemData.name.trim()) {
            showAlert('O nome do item não pode estar vazio.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await addDoc(itemsCollectionRef, {
                name: newItemData.name.trim(),
                price: Number(newItemData.price) || 0,
                type: newItemData.type,
                stock: isPartItem({ type: newItemData.type }) ? 0 : null,
                createdAt: new Date(),
            });
            showAlert(`'${newItemData.name.trim()}' foi adicionado como ${newItemData.type}!`, 'success');
            setNewItemData({ name: '', price: '', type: 'Peça' });
        } catch (error) {
            console.error('Erro ao adicionar item: ', error);
            showAlert('Ocorreu um erro ao adicionar o item.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteItem = async (itemId, itemName) => {
        if (!confirm(`Tem certeza que deseja apagar o item '${itemName}'?`)) return;
        try {
            await deleteDoc(doc(db, `${basePath}/maintenanceItems`, itemId));
            showAlert(`'${itemName}' foi apagado com sucesso.`, 'success');
        } catch (error) {
            console.error('Erro ao apagar item:', error);
            showAlert('Ocorreu um erro ao apagar o item.', 'error');
        }
    };

    const handleAddStock = async (itemId) => {
        const amountToAdd = Number(stockToAdd[itemId] || 0);
        if (amountToAdd <= 0) {
            showAlert('Informe uma quantidade positiva para adicionar.', 'error');
            return;
        }
        try {
            await updateDoc(doc(db, `${basePath}/maintenanceItems`, itemId), {
                stock: increment(amountToAdd),
            });
            showAlert(`${amountToAdd} unidade(s) adicionada(s) ao estoque!`, 'success');
            setStockToAdd((prev) => ({ ...prev, [itemId]: '' }));
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            showAlert('Ocorreu um erro ao atualizar o estoque.', 'error');
        }
    };

    const handleStockInputChange = (itemId, value) => {
        setStockToAdd((prev) => ({ ...prev, [itemId]: value }));
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    const partItems = items.filter(isPartItem);
    const serviceItems = items.filter((item) => !isPartItem(item));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 modal-enter">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Gerir Peças e Serviços</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">
                        &times;
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6 p-4 border rounded-lg">
                    <input
                        type="text"
                        name="name"
                        value={newItemData.name}
                        onChange={handleChange}
                        placeholder="Nome da peça ou serviço"
                        className="md:col-span-2 bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        name="type"
                        value={newItemData.type}
                        onChange={handleChange}
                        className="bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Peça">Peça</option>
                        <option value="Serviço">Serviço (Mão de obra)</option>
                    </select>
                    <input
                        type="number"
                        name="price"
                        value={newItemData.price}
                        onChange={handleChange}
                        placeholder="Preço (R$)"
                        className="bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleAddItem}
                        disabled={isLoading}
                        className="md:col-span-4 bg-blue-800 text-white font-bold py-3 px-5 rounded-lg hover:bg-blue-900 disabled:bg-blue-400 mt-2"
                    >
                        {isLoading ? '...' : 'Cadastrar novo item'}
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-lg text-gray-700">Peças em estoque</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 mt-2">
                            {partItems.length > 0 ? (
                                partItems.map((item) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg">
                                        <div className="col-span-4">
                                            <p className="font-semibold text-gray-800 flex items-center gap-2">
                                                <i className="fas fa-cog"></i>
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-gray-500 pl-6">{formatCurrency(item.price)}</p>
                                        </div>
                                        <div className="col-span-3 text-center">
                                            <p className="text-2xl font-bold text-blue-800">{item.stock || 0}</p>
                                            <p className="text-xs text-gray-500">em estoque</p>
                                        </div>
                                        <div className="col-span-5 flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="+ adicionar"
                                                value={stockToAdd[item.id] || ''}
                                                onChange={(e) => handleStockInputChange(item.id, e.target.value)}
                                                className="w-full bg-white p-2 rounded-lg border focus:ring-2 focus:ring-green-500 text-center"
                                            />
                                            <button
                                                onClick={() => handleAddStock(item.id)}
                                                className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700"
                                                title="Adicionar ao estoque"
                                            >
                                                <i className="fas fa-plus"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item.id, item.name)}
                                                className="text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 py-2 px-3 rounded-lg"
                                                title="Apagar"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhuma peça cadastrada.</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <h3 className="font-bold text-lg text-gray-700">Serviços cadastrados</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 mt-2">
                            {serviceItems.length > 0 ? (
                                serviceItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-gray-800 flex items-center gap-2">
                                                <i className="fas fa-wrench"></i>
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteItem(item.id, item.name)}
                                            className="text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 py-2 px-3 rounded-lg"
                                            title="Apagar serviço"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhum serviço cadastrado.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.MaintenanceItemManager = MaintenanceItemManager;

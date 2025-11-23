// components/MultiItemSelector.js - com criação rápida de itens

const MultiItemSelector = ({ allItems, selectedItems, onSelectionChange, onQuantityChange, onCreateNewItem }) => {
    const { useEffect, useMemo, useRef, useState } = React;
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
    const [newItemData, setNewItemData] = useState({ name: '', type: 'Peça', price: '' });
    const [isSavingNewItem, setIsSavingNewItem] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const availableItems = useMemo(() => {
        const selectedIds = new Set(selectedItems.map(item => item.id));
        return allItems.filter(item => !selectedIds.has(item.id));
    }, [allItems, selectedItems]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return availableItems;
        return availableItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, availableItems]);

    const handleAddItem = (item) => {
        onSelectionChange([...selectedItems, { ...item, quantity: 1 }]);
        setSearchTerm('');
        setIsDropdownOpen(false);
    };

    const handleRemoveItem = (itemToRemove) => {
        onSelectionChange(selectedItems.filter(item => item.id !== itemToRemove.id));
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    const openNewItemModal = () => {
        if (!onCreateNewItem || !searchTerm.trim()) return;
        setNewItemData({ name: searchTerm.trim(), type: 'Peça', price: '' });
        setIsNewItemModalOpen(true);
    };

    const handleSaveNewItem = async () => {
        if (!onCreateNewItem || !newItemData.name.trim()) return;
        setIsSavingNewItem(true);
        try {
            const created = await onCreateNewItem({
                name: newItemData.name.trim(),
                type: newItemData.type,
                price: Number(newItemData.price) || 0,
            });
            if (created) {
                onSelectionChange([...selectedItems, { ...created, quantity: 1 }]);
            }
            setIsNewItemModalOpen(false);
            setSearchTerm('');
            setIsDropdownOpen(false);
        } finally {
            setIsSavingNewItem(false);
        }
    };

    return (
        <div className="relative md:col-span-2" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Itens/Serviços</label>
            <div className="w-full bg-gray-100 p-2 rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 flex flex-col gap-2 min-h-[48px]">
                <div className="flex flex-col gap-2">
                    {selectedItems.map((item, index) => (
                        <div key={item.id || index} className="bg-blue-100 text-blue-900 flex items-center justify-between gap-2 px-3 py-2 rounded">
                            <span className="text-sm font-medium flex-grow">{item.name}</span>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => onQuantityChange(index, -1)} className="font-bold text-lg w-6 h-6 rounded bg-blue-200 hover:bg-blue-300">-</button>
                                <input 
                                    type="number"
                                    min="1"
                                    value={item.quantity} 
                                    onChange={(e) => onQuantityChange(index, e.target.value)}
                                    className="w-12 text-center font-semibold bg-white rounded border border-blue-200 p-0 h-6"
                                />
                                <button type="button" onClick={() => onQuantityChange(index, 1)} className="font-bold text-lg w-6 h-6 rounded bg-blue-200 hover:bg-blue-300">+</button>
                            </div>
                            <button type="button" onClick={() => handleRemoveItem(item)} className="text-red-500 hover:text-red-700 font-bold text-xl ml-2">&times;</button>
                        </div>
                    ))}
                </div>
                <input
                    type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={selectedItems.length === 0 ? "Pesquise e selecione os itens..." : "+ Adicionar mais itens"}
                    className="w-full bg-transparent focus:outline-none p-1"
                />
            </div>
            {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border mt-1 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <div key={item.id} onClick={() => handleAddItem(item)} className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                                <span>{item.name}</span>
                                <span className="text-sm text-gray-500">{formatCurrency(item.price)}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-gray-500 space-y-2">
                            <div>Nenhum item encontrado.</div>
                            {onCreateNewItem && searchTerm.trim() && (
                                <button
                                    type="button"
                                    onClick={openNewItemModal}
                                    className="w-full bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                                >
                                    Cadastrar novo item "{searchTerm.trim()}"
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {isNewItemModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-800">Novo Item</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={newItemData.name}
                                    onChange={(e) => setNewItemData((p) => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-gray-100 p-2 rounded border focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Tipo</label>
                                    <select
                                        value={newItemData.type}
                                        onChange={(e) => setNewItemData((p) => ({ ...p, type: e.target.value }))}
                                        className="w-full bg-gray-100 p-2 rounded border focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Peça">Peça</option>
                                        <option value="Serviço">Serviço</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Custo (R$)</label>
                                    <input
                                        type="number"
                                        value={newItemData.price}
                                        onChange={(e) => setNewItemData((p) => ({ ...p, price: e.target.value }))}
                                        className="w-full bg-gray-100 p-2 rounded border focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsNewItemModalOpen(false)}
                                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300"
                                disabled={isSavingNewItem}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveNewItem}
                                className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                                disabled={isSavingNewItem || !newItemData.name.trim()}
                            >
                                {isSavingNewItem ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.MultiItemSelector = MultiItemSelector;

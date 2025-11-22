// components/StockReportPage.js - COM AJUSTES FINOS NA TABELA PARA TELEMÓVEL

const StockReportPage = ({ userData, db, appInstanceId, showAlert }) => {
    const { useState, useEffect, useMemo } = React;
    const { collection, query, onSnapshot, orderBy } = window.firebase;

    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showItemManager, setShowItemManager] = useState(false);
    const [showWorkshopManager, setShowWorkshopManager] = useState(false);
    
    const { companyId } = userData;
    const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

    useEffect(() => {
        if (!db || !basePath) return;
        const itemsQuery = query(collection(db, `${basePath}/maintenanceItems`), orderBy("name"));
        const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(fetchedItems);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar itens de estoque:", error);
            setIsLoading(false);
        });
        return unsubscribe;
    }, [db, basePath]);

    const totalStockValue = useMemo(() => {
        return items.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0);
    }, [items]);
    
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const handlePrint = () => window.print();

    if (isLoading) {
        return <LoadingSpinner text="A carregar relatório de estoque..." />;
    }

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            {showItemManager && ( <MaintenanceItemManager db={db} basePath={basePath} showAlert={showAlert} onClose={() => setShowItemManager(false)} /> )}
            {showWorkshopManager && ( <WorkshopManager db={db} basePath={basePath} showAlert={showAlert} onClose={() => setShowWorkshopManager(false)} /> )}

            <div className="print-container">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Relatório de Estoque</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setShowWorkshopManager(true)} className="bg-purple-700 text-white font-bold p-2 w-10 h-10 md:px-4 md:w-auto md:h-auto rounded-lg hover:bg-purple-800 flex items-center justify-center transition-all">
                            <i className="fas fa-store"></i>
                            <span className="hidden md:inline md:ml-2">Gerir Oficinas</span>
                        </button>
                        <button onClick={() => setShowItemManager(true)} className="bg-gray-700 text-white font-bold p-2 w-10 h-10 md:px-4 md:w-auto md:h-auto rounded-lg hover:bg-gray-800 flex items-center justify-center transition-all">
                            <i className="fas fa-tasks"></i>
                            <span className="hidden md:inline md:ml-2">Gerir Itens</span>
                        </button>
                        <button onClick={handlePrint} className="bg-blue-600 text-white font-bold p-2 w-10 h-10 md:px-4 md:w-auto md:h-auto rounded-lg hover:bg-blue-700 flex items-center justify-center transition-all">
                            <i className="fas fa-print"></i>
                            <span className="hidden md:inline md:ml-2">Imprimir</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                        <div className="p-4 bg-gray-100 rounded-lg">
                            <p className="text-sm font-semibold text-gray-600">Tipos de Item</p>
                            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                        </div>
                        <div className="p-4 bg-gray-100 rounded-lg">
                            <p className="text-sm font-semibold text-gray-600">Total de Peças</p>
                            <p className="text-2xl font-bold text-gray-900">{items.reduce((sum, item) => sum + (item.stock || 0), 0)}</p>
                        </div>
                        <div className="p-4 bg-green-100 rounded-lg col-span-2">
                            <p className="text-sm font-semibold text-green-700">Valor Total do Estoque</p>
                            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalStockValue)}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    {/* FONTES E PADDINGS AJUSTADOS PARA SEREM MENORES NO TELEMÓVEL */}
                                    <th className="p-2 md:p-3 text-sm md:text-base font-semibold">Item</th>
                                    <th className="p-2 md:p-3 text-sm md:text-base font-semibold text-center">Tipo</th>
                                    <th className="p-2 md:p-3 text-sm md:text-base font-semibold text-center">Qtd. Estoque</th>
                                    <th className="p-2 md:p-3 text-sm md:text-base font-semibold text-right">Preço Unit.</th>
                                    <th className="p-2 md:p-3 text-sm md:text-base font-semibold text-right">Valor Estoque</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => {
                                    const totalValue = (item.price || 0) * (item.stock || 0);
                                    const isLowStock = item.type === 'Peça' && (item.stock || 0) <= 5;
                                    return (
                                        <tr key={item.id} className={`border-b hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                                            {/* FONTES E PADDINGS AJUSTADOS PARA SEREM MENORES NO TELEMÓVEL */}
                                            <td className="p-2 md:p-3 text-sm md:text-base font-medium text-gray-800">{item.name}</td>
                                            <td className="p-2 md:p-3 text-center">
                                                <span className={`text-xs uppercase font-bold px-2 py-1 rounded-full ${item.type === 'Peça' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>{item.type}</span>
                                            </td>
                                            <td className={`p-2 md:p-3 text-center font-bold text-base md:text-lg ${isLowStock ? 'text-red-600' : 'text-gray-800'}`}>
                                                {item.type === 'Peça' ? (item.stock || 0) : 'N/A'}
                                            </td>
                                            <td className="p-2 md:p-3 text-sm md:text-base text-right">{formatCurrency(item.price)}</td>
                                            <td className="p-2 md:p-3 text-sm md:text-base text-right font-semibold">{item.type === 'Peça' ? formatCurrency(totalValue) : 'N/A'}</td>
                                        </tr>
                                    );
                                })}
                                {items.length === 0 && (
                                    <tr><td colSpan="5" className="text-center p-6 text-gray-500">Nenhum item cadastrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
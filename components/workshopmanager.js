// components/WorkshopManager.js

const WorkshopManager = ({ db, basePath, onClose, showAlert }) => {
    const { useState, useEffect } = React;
    const { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy } = window.firebase;

    const [workshops, setWorkshops] = useState([]);
    const [newWorkshop, setNewWorkshop] = useState({ name: '', address: '', phone: '' });
    const [isLoading, setIsLoading] = useState(false);

    const workshopsCollectionRef = collection(db, `${basePath}/workshops`);

    useEffect(() => {
        const q = query(workshopsCollectionRef, orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setWorkshops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewWorkshop(prev => ({ ...prev, [name]: value }));
    };

    const handleAddWorkshop = async () => {
        if (!newWorkshop.name.trim()) {
            showAlert("O nome da oficina é obrigatório.", "error");
            return;
        }
        setIsLoading(true);
        try {
            await addDoc(workshopsCollectionRef, {
                ...newWorkshop,
                createdAt: new Date()
            });
            showAlert("Oficina adicionada com sucesso!", "success");
            setNewWorkshop({ name: '', address: '', phone: '' });
        } catch (error) {
            console.error("Erro ao adicionar oficina: ", error);
            showAlert("Ocorreu um erro ao adicionar a oficina.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteWorkshop = async (workshopId, workshopName) => {
        if (!confirm(`Tem certeza que deseja apagar a oficina '${workshopName}'?`)) return;
        try {
            await deleteDoc(doc(db, `${basePath}/workshops`, workshopId));
            showAlert("Oficina apagada com sucesso.", "success");
        } catch (error) {
            console.error("Erro ao apagar oficina: ", error);
            showAlert("Ocorreu um erro ao apagar a oficina.", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 modal-enter overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Gerir Oficinas</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                <div className="space-y-4 mb-6 p-4 border rounded-lg">
                    <h3 className="font-bold text-lg text-gray-700">Adicionar Nova Oficina</h3>
                    <input type="text" name="name" value={newWorkshop.name} onChange={handleChange} placeholder="Nome da Oficina" className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500" />
                    <input type="text" name="address" value={newWorkshop.address} onChange={handleChange} placeholder="Endereço (opcional)" className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500" />
                    <input type="text" name="phone" value={newWorkshop.phone} onChange={handleChange} placeholder="Telefone (opcional)" className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500" />
                    <button onClick={handleAddWorkshop} disabled={isLoading} className="w-full bg-blue-800 text-white font-bold py-3 px-5 rounded-lg hover:bg-blue-900 disabled:bg-blue-400 mt-2">
                        {isLoading ? '...' : 'Adicionar Oficina'}
                    </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    <h3 className="font-bold text-lg text-gray-700">Oficinas Cadastradas</h3>
                    {workshops.length > 0 ? (
                        workshops.map(shop => (
                            <div key={shop.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-800">{shop.name}</p>
                                    <p className="text-sm text-gray-500">{shop.address || 'Sem endereço'}</p>
                                </div>
                                <button onClick={() => handleDeleteWorkshop(shop.id, shop.name)} className="text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 py-2 px-3 rounded-lg">
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4">Nenhuma oficina cadastrada.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// components/DriversPage.js - Gestão simples de motoristas (sem acesso ao app)

const DriversPage = ({ userData, onNavigate, db, appInstanceId, showAlert }) => {
    const { useState, useEffect } = React;
    const { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } = window.firebase;

    const [drivers, setDrivers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [driverToEdit, setDriverToEdit] = useState(null);
    const [driverToDelete, setDriverToDelete] = useState(null);

    const { companyId } = userData;
    const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, `${basePath}/drivers`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const driversData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDrivers(driversData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db, companyId]);

    const handleSaveDriver = async (driverData) => {
        const { id, ...dataToSave } = driverData;
        try {
            if (id) {
                await updateDoc(doc(db, `${basePath}/drivers`, id), dataToSave);
                showAlert("Motorista atualizado com sucesso!", 'success');
            } else {
                await addDoc(collection(db, `${basePath}/drivers`), { ...dataToSave, createdAt: new Date() });
                showAlert("Motorista adicionado com sucesso!", 'success');
            }
            setShowDriverModal(false);
            setDriverToEdit(null);
        } catch (e) {
            console.error("Erro ao salvar motorista:", e);
            showAlert("Erro ao salvar motorista.", 'error');
        }
    };
    
    const confirmDeleteDriver = async () => {
        if (!driverToDelete) return;
        try {
            await deleteDoc(doc(db, `${basePath}/drivers`, driverToDelete.id));
            showAlert("Motorista apagado com sucesso.", "success");
        } catch (error) {
            console.error("Erro ao apagar motorista:", error);
            showAlert("Falha ao apagar motorista.", "error");
        } finally {
            setDriverToDelete(null);
        }
    };
    
    const StarDisplay = ({ rating }) => (
        <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => <i key={i} className={`fa-solid fa-star ${i < (rating||0) ? 'text-yellow-400' : 'text-gray-300'}`}></i>)}
        </div>
    );

    if (isLoading) return <LoadingSpinner text="A carregar motoristas..." />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Motoristas</h1>
                <button 
                    onClick={() => { setDriverToEdit(null); setShowDriverModal(true); }} 
                    className="bg-blue-600 text-white font-bold p-2 w-10 h-10 md:px-4 md:w-auto md:h-auto rounded-lg hover:bg-blue-700 flex items-center justify-center transition-all"
                >
                    <i className="fas fa-plus"></i>
                    <span className="hidden md:inline md:ml-2">Adicionar Motorista</span>
                </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm md:text-base">Nome</th>
                                <th className="p-4 font-semibold text-sm md:text-base">CNH</th>
                                <th className="p-4 font-semibold text-sm md:text-base">Avaliação</th>
                                <th className="p-4 font-semibold text-sm md:text-base">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map(driver => (
                                <tr key={driver.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 text-sm md:text-base">{driver.name}</td>
                                    <td className="p-4 text-sm md:text-base">{driver.cnh}</td>
                                    <td className="p-4"><StarDisplay rating={driver.rating} /></td>
                                    <td className="p-4 flex gap-4">
                                        <button onClick={() => { setDriverToEdit(driver); setShowDriverModal(true); }} className="text-blue-600 hover:text-blue-800"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => setDriverToDelete(driver)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {drivers.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum motorista cadastrado.</p>}
                </div>
            </div>

            {showDriverModal && <DriverFormModal driver={driverToEdit} onClose={() => setShowDriverModal(false)} onSave={handleSaveDriver} />}
            {driverToDelete && <DeleteConfirmationModal onConfirm={confirmDeleteDriver} onCancel={() => setDriverToDelete(null)} title="Apagar Motorista" message={`Tem a certeza que deseja apagar o motorista "${driverToDelete.name}"?`} />}
        </div>
    );
};


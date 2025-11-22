// components/CarDetailsPage.js

const CarDetailsPage = ({ user, userData, showAlert, carId, goBack, db, auth, appInstanceId }) => {
  const { useState, useEffect, useMemo } = React;
  const {
    doc,
    getDoc,
    onSnapshot,
    query,
    collection,
    orderBy,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    ref,
    deleteObject,
    getStorage,
    increment,
  } = window.firebase;

  const [selectedCar, setSelectedCar] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [activeTab, setActiveTab] = useState('checklists');
  const [searchQuery, setSearchQuery] = useState('');
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseModalConfig, setExpenseModalConfig] = useState({
    defaultCategory: 'Manutenção',
    isCategoryLocked: false,
  });
  const [viewingChecklistData, setViewingChecklistData] = useState(null);
  const [activeModals, setActiveModals] = useState({
    car: false,
    expense: false,
    revenue: false,
    reminder: false,
    routineChecklist: false,
    deliveryChecklist: false,
    deleteCar: false,
    deleteChecklist: false,
  });
  const [modalData, setModalData] = useState({
    carToEdit: null,
    checklistToDelete: null,
  });

  const { companyId, role } = userData;
  const isAdmin = role === 'admin';
  const basePath = `artifacts/${appInstanceId}/users/${companyId}`;
  const storage = getStorage(db.app);

  if (!db?.app) return <div>Erro: DB não inicializado.</div>;

  // Data subscriptions
  useEffect(() => {
    if (!db) return undefined;
    const unsub = onSnapshot(doc(db, `${basePath}/cars`, carId), (snap) => {
      if (snap.exists()) {
        setSelectedCar({ id: snap.id, ...snap.data() });
      } else {
        goBack();
      }
    });
    return unsub;
  }, [db, carId]);

  useEffect(() => {
    if (!db || !basePath) return undefined;
    const q = query(collection(db, `${basePath}/drivers`));
    return onSnapshot(q, (s) => setDrivers(s.docs.map((d) => ({ id: d.id, name: d.data().name }))));
  }, [db, basePath]);

  useEffect(() => {
    if (!db || !basePath) return undefined;
    const q = query(collection(db, `${basePath}/maintenanceItems`), orderBy('name'));
    return onSnapshot(q, (s) => setMaintenanceItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [db, basePath]);

  useEffect(() => {
    if (!db || !selectedCar) return undefined;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/expenses`), orderBy('date', 'desc'));
    return onSnapshot(q, (s) => setExpenses(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !selectedCar) return undefined;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/revenues`), orderBy('date', 'desc'));
    return onSnapshot(q, (s) => setRevenues(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !selectedCar) return undefined;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/reminders`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (s) => setReminders(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !selectedCar) return undefined;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/checklists`), orderBy('date', 'desc'));
    return onSnapshot(q, (s) => setChecklists(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !basePath) return undefined;
    const q = query(collection(db, `${basePath}/workshops`), orderBy('name'));
    return onSnapshot(q, (s) => setWorkshops(s.docs.map((d) => ({ id: d.id, name: d.data().name }))));
  }, [db, basePath]);

  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const lq = searchQuery.toLowerCase();
    return expenses.filter(
      (e) =>
        (e.description || '').toLowerCase().includes(lq) ||
        (e.category || '').toLowerCase().includes(lq)
    );
  }, [expenses, searchQuery]);

  const dueReminders = useMemo(() => {
    if (!selectedCar) return [];
    const now = new Date();
    return reminders.filter((r) => {
      if (r.status !== 'active') return false;
      if (r.type === 'mileage' && Number(selectedCar.currentMileage) >= Number(r.targetMileage)) return true;
      if (r.type === 'date' && new Date(r.targetDate) <= now) return true;
      return false;
    });
  }, [reminders, selectedCar]);

  const assignedDriver = useMemo(() => {
    if (!selectedCar?.assignedDriverId) return null;
    return drivers.find((d) => d.id === selectedCar.assignedDriverId) || null;
  }, [selectedCar?.assignedDriverId, drivers]);

  const financialSummary = useMemo(() => {
    const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.value || 0), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.cost || 0), 0);
    const ownerCommission =
      selectedCar?.commissionPercentage ? totalRevenue * (Number(selectedCar.commissionPercentage) / 100) : 0;
    const netProfit = totalRevenue - totalExpense - ownerCommission;
    return { totalRevenue, totalExpense, ownerCommission, netProfit };
  }, [revenues, expenses, selectedCar?.commissionPercentage]);

  const visibleChecklists = useMemo(() => checklists, [checklists]);

  // Actions
  const handleSaveCar = async (carData) => {
    const prepared = {
      ...carData,
      currentMileage: Number(carData.currentMileage || 0),
      lastOilChange: Number(carData.lastOilChange || 0),
      oilChangeInterval: Number(carData.oilChangeInterval || 0),
      avgConsumption: parseFloat(carData.avgConsumption || 0),
      assignedDriverId: carData.assignedDriverId || '',
    };
    const { id, ...dataToSave } = prepared;
    try {
      if (id) {
        await updateDoc(doc(db, `${basePath}/cars`, id), dataToSave);
      } else {
        await addDoc(collection(db, `${basePath}/cars`), { ...dataToSave, createdAt: new Date() });
      }
      showAlert('Sucesso!', 'success');
      setActiveModals((p) => ({ ...p, car: false }));
    } catch (e) {
      console.error(e);
      showAlert(`Erro: ${e.code}`, 'error');
    }
  };

  const handleSaveExpense = async (expenseData) => {
    const { id, ...dataToSave } = expenseData;
    try {
      if (id) {
        await updateDoc(doc(db, `${basePath}/cars/${selectedCar.id}/expenses`, id), dataToSave);
        showAlert('Despesa atualizada com sucesso!', 'success');
      } else {
        await addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/expenses`), dataToSave);
        if (dataToSave.category === 'Manutenção' && dataToSave.items?.length > 0) {
          const stockUpdates = dataToSave.items
            .filter((i) => i.type === 'Peça')
            .map((item) =>
              updateDoc(doc(db, `${basePath}/maintenanceItems`, item.id), {
                stock: increment(-Number(item.quantity)),
              })
            );
          await Promise.all(stockUpdates);
          showAlert('Despesa registada e estoque atualizado!', 'success');
        } else {
          showAlert('Nova despesa registada.', 'success');
        }
      }
      setActiveModals((p) => ({ ...p, expense: false }));
      setExpenseToEdit(null);
    } catch (e) {
      console.error(e);
      showAlert(`Erro ao salvar despesa: ${e.code}`, 'error');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Tem certeza? As peças serão estornadas ao estoque.')) return;
    const expenseDocRef = doc(db, `${basePath}/cars/${selectedCar.id}/expenses`, expenseId);
    try {
      const snap = await getDoc(expenseDocRef);
      if (snap.exists()) {
        const exp = snap.data();
        if (exp.category === 'Manutenção' && Array.isArray(exp.items) && exp.items.length > 0) {
          const returns = exp.items
            .filter((i) => i.type === 'Peça')
            .map((item) =>
              updateDoc(doc(db, `${basePath}/maintenanceItems`, item.id), {
                stock: increment(Number(item.quantity)),
              })
            );
          await Promise.all(returns);
        }
      }
      await deleteDoc(expenseDocRef);
      showAlert('Despesa apagada e estoque estornado.', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Ocorreu um erro ao apagar.', 'error');
    }
  };

  const openExpenseModalForEdit = (expense) => {
    setExpenseToEdit(expense);
    setExpenseModalConfig({ defaultCategory: expense.category, isCategoryLocked: true });
    setActiveModals((p) => ({ ...p, expense: true }));
  };
  const openExpenseModalForCreate = (isMaintenance = false) => {
    setExpenseToEdit(null);
    setExpenseModalConfig({
      defaultCategory: isMaintenance ? 'Manutenção' : 'Outros',
      isCategoryLocked: isMaintenance,
    });
    setActiveModals((p) => ({ ...p, expense: true }));
  };

  const handleSaveRevenue = async (revenueData) => {
    const dataToSave = { ...revenueData, value: Number(revenueData.value || 0) };
    try {
      await addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/revenues`), dataToSave);
      showAlert('Nova receita registada.', 'success');
      setActiveModals((p) => ({ ...p, revenue: false }));
    } catch (e) {
      console.error(e);
      showAlert(`Erro ao salvar receita: ${e.code}`, 'error');
    }
  };

  const handleSaveReminder = async (d) => {
    const data = { ...d, status: 'active', createdAt: new Date(), targetMileage: Number(d.targetMileage || 0) };
    try {
      await addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/reminders`), data);
      showAlert('Lembrete criado.', 'success');
      setActiveModals((p) => ({ ...p, reminder: false }));
    } catch (e) {
      showAlert(`Erro: ${e.code}`, 'error');
    }
  };

  const handleReminderAction = async (id, status) => {
    const refDoc = doc(db, `${basePath}/cars/${selectedCar.id}/reminders`, id);
    try {
      if (status === 'apagado') {
        await deleteDoc(refDoc);
        showAlert('Lembrete apagado.', 'success');
      } else {
        await updateDoc(refDoc, { status });
        showAlert(`Lembrete marcado como ${status}.`, 'success');
      }
    } catch (e) {
      showAlert(`Erro ao processar lembrete: ${e.code}`, 'error');
    }
  };

  const openRoutineChecklistForCreate = () => setActiveModals((p) => ({ ...p, routineChecklist: true }));
  const openDeliveryChecklistForCreate = () => setActiveModals((p) => ({ ...p, deliveryChecklist: true }));
  const openChecklistForView = (checklist) => {
    setViewingChecklistData(checklist);
    if (checklist.type === 'delivery_return') {
      setActiveModals((p) => ({ ...p, deliveryChecklist: true }));
    } else {
      setActiveModals((p) => ({ ...p, routineChecklist: true }));
    }
  };

  const confirmDeleteChecklist = async () => {
    const target = modalData.checklistToDelete;
    if (!target) return;
    try {
      if (Array.isArray(target.damages) && target.damages.length > 0) {
        for (const d of target.damages) {
          if (d.photoURL) {
            try {
              await deleteObject(ref(storage, d.photoURL));
            } catch (e) {
              console.warn('Erro apagando foto:', e);
            }
          }
        }
      }
      await deleteDoc(doc(db, `${basePath}/cars/${selectedCar.id}/checklists`, target.id));
      showAlert('Vistoria apagada.', 'success');
    } catch (e) {
      showAlert('Falha ao apagar a vistoria.', 'error');
    } finally {
      setActiveModals((p) => ({ ...p, deleteChecklist: false }));
      setModalData((p) => ({ ...p, checklistToDelete: null }));
    }
  };

  const confirmDeleteCar = async () => {
    try {
      const carToDelete = selectedCar;
      const subs = ['expenses', 'revenues', 'reminders', 'checklists'];
      for (const sub of subs) {
        const col = collection(db, `${basePath}/cars/${carToDelete.id}/${sub}`);
        const snap = await getDocs(col);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, `${basePath}/cars`, carToDelete.id));
      showAlert('Carro e dados apagados.', 'success');
      goBack();
    } catch (e) {
      showAlert(`Erro ao apagar carro: ${e.code}`, 'error');
    } finally {
      setActiveModals((p) => ({ ...p, deleteCar: false }));
    }
  };

  if (!selectedCar) return <LoadingSpinner text="A carregar dados do veículo..." />;

  return (
    <React.Fragment>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <CarDetailsHeader
          goBack={goBack}
          dueReminders={dueReminders}
          selectedCar={selectedCar}
          assignedDriver={assignedDriver}
          isAdmin={isAdmin}
          user={user}
          setActiveModals={setActiveModals}
          setModalData={setModalData}
        />

        <div className="mt-8 bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 border-b">
            <div className="flex flex-wrap justify-center md:justify-start">
              <button
                onClick={() => setActiveTab('checklists')}
                className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                  activeTab === 'checklists' ? 'tab-active' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Vistorias
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('financial')}
                  className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                    activeTab === 'financial'
                      ? 'tab-active'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Financeiro
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                    activeTab === 'maintenance'
                      ? 'tab-active'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Manutenção
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('reminders')}
                  className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                    activeTab === 'reminders'
                      ? 'tab-active'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Lembretes
                </button>
              )}
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2 justify-center">
              {isAdmin && activeTab === 'checklists' && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={openRoutineChecklistForCreate}
                    className="flex-grow bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 text-sm"
                  >
                    <i className="fas fa-clipboard-list mr-2"></i>Vistoria Rotineira
                  </button>
                  <button
                    onClick={openDeliveryChecklistForCreate}
                    className="flex-grow bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <i className="fas fa-key mr-2"></i>Entrega/Devolução
                  </button>
                </div>
              )}
              {isAdmin && activeTab === 'maintenance' && (
                <button
                  onClick={() => openExpenseModalForCreate(true)}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                >
                  <i className="fas fa-plus mr-2"></i>Adicionar Manutenção
                </button>
              )}
              {isAdmin && activeTab === 'reminders' && (
                <button
                  onClick={() => setActiveModals((p) => ({ ...p, reminder: true }))}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                >
                  <i className="fas fa-plus mr-2"></i>Criar Lembrete
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'checklists' && (
              <ChecklistsList
                checklists={visibleChecklists}
                isAdmin={isAdmin}
                onView={openChecklistForView}
                onRequestDelete={(cl) => {
                  setActiveModals((p) => ({ ...p, deleteChecklist: true }));
                  setModalData((p) => ({ ...p, checklistToDelete: cl }));
                }}
              />
            )}

            {activeTab === 'financial' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-700 font-bold">Total de Receitas</p>
                    <p className="text-2xl font-extrabold text-green-900">R$ {financialSummary.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-red-700 font-bold">Total de Despesas</p>
                    <p className="text-2xl font-extrabold text-red-900">R$ {financialSummary.totalExpense.toFixed(2)}</p>
                  </div>
                  <div
                    className={`${
                      financialSummary.netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'
                    } p-4 rounded-lg text-center`}
                  >
                    <p
                      className={`text-sm ${
                        financialSummary.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'
                      } font-bold`}
                    >
                      Lucro / Prejuízo
                    </p>
                    <p
                      className={`text-2xl font-extrabold ${
                        financialSummary.netProfit >= 0 ? 'text-blue-900' : 'text-orange-900'
                      }`}
                    >
                      R$ {financialSummary.netProfit.toFixed(2)}
                    </p>
                    {selectedCar.ownerName && financialSummary.ownerCommission > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Comissão de {selectedCar.ownerName}: R$ {financialSummary.ownerCommission.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <button
                    onClick={() => setActiveModals((p) => ({ ...p, revenue: true }))}
                    className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-sm"
                  >
                    <i className="fas fa-plus mr-2"></i>Adicionar Receita
                  </button>
                  <button
                    onClick={() => openExpenseModalForCreate(false)}
                    className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm"
                  >
                    <i className="fas fa-plus mr-2"></i>Adicionar Despesa
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-lg mb-2">Histórico de Receitas</h3>
                    <RevenuesTable revenues={revenues} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Histórico de Despesas</h3>
                    <ExpensesTable expenses={filteredExpenses} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reminders' && (
              <RemindersTable reminders={reminders} isAdmin={isAdmin} onAction={handleReminderAction} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <React.Fragment>
        {isAdmin && activeModals.car && (
          <CarFormModal
            car={modalData.carToEdit}
            onClose={() => setActiveModals((p) => ({ ...p, car: false }))}
            onSave={handleSaveCar}
            drivers={drivers}
          />
        )}
        {isAdmin && activeModals.expense && (
          <ExpenseFormModal
            onClose={() => {
              setActiveModals((p) => ({ ...p, expense: false }));
              setExpenseToEdit(null);
            }}
            onSave={handleSaveExpense}
            defaultCategory={expenseModalConfig.defaultCategory}
            isCategoryLocked={expenseModalConfig.isCategoryLocked}
            maintenanceItems={maintenanceItems}
            workshops={workshops}
            expenseToEdit={expenseToEdit}
            companyId={companyId}
          />
        )}
        {isAdmin && activeModals.revenue && (
          <RevenueFormModal onClose={() => setActiveModals((p) => ({ ...p, revenue: false }))} onSave={handleSaveRevenue} />
        )}
        {isAdmin && activeModals.reminder && (
          <ReminderFormModal onClose={() => setActiveModals((p) => ({ ...p, reminder: false }))} onSave={handleSaveReminder} />
        )}
        {isAdmin && activeModals.routineChecklist && (
          <RoutineChecklistModal
            onClose={() => setActiveModals((p) => ({ ...p, routineChecklist: false }))}
            onSave={(d) => {
              const dataToSave = { ...d, checkedBy: user.email, mileageAtCheck: selectedCar.currentMileage };
              addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/checklists`), dataToSave)
                .then(() => {
                  showAlert('Checklist rotineiro salvo!', 'success');
                  setActiveModals((p) => ({ ...p, routineChecklist: false }));
                })
                .catch(() => showAlert('Erro ao salvar checklist.', 'error'));
            }}
            initialData={viewingChecklistData}
            isViewMode={!!viewingChecklistData}
          />
        )}
        {isAdmin && activeModals.deliveryChecklist && (
          <DeliveryChecklistModal
            onClose={() => setActiveModals((p) => ({ ...p, deliveryChecklist: false }))}
            onSave={(d) => {
              const dataToSave = {
                ...d,
                date: new Date(),
                mileageAtCheck: selectedCar.currentMileage,
                checkedBy: user.email,
              };
              addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/checklists`), dataToSave)
                .then(() => {
                  showAlert('Checklist de Entrega salvo!', 'success');
                  setActiveModals((p) => ({ ...p, deliveryChecklist: false }));
                })
                .catch(() => showAlert('Erro ao salvar checklist.', 'error'));
            }}
            carName={selectedCar.name}
            app={db.app}
            initialData={viewingChecklistData}
            isViewMode={!!viewingChecklistData}
          />
        )}
        {activeModals.deleteCar && (
          <DeleteConfirmationModal
            onConfirm={confirmDeleteCar}
            onCancel={() => setActiveModals((p) => ({ ...p, deleteCar: false }))}
            title="Apagar Veículo"
            message={`Tem a certeza que deseja apagar o veículo "${selectedCar?.name}"? Todos os seus dados serão perdidos.`}
          />
        )}
        {activeModals.deleteChecklist && (
          <DeleteConfirmationModal
            onConfirm={confirmDeleteChecklist}
            onCancel={() => setActiveModals((p) => ({ ...p, deleteChecklist: false }))}
            title="Apagar Vistoria"
            message="Tem a certeza que deseja apagar permanentemente esta vistoria?"
          />
        )}
      </React.Fragment>
    </React.Fragment>
  );
};

window.CarDetailsPage = CarDetailsPage;

import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import CarDetailsHeader from './CarDetailsHeader';
import CarFormModal from './CarFormModal';
import ExpenseFormModal from './ExpenseFormModal';
import RevenueFormModal from './RevenueFormModal';
import ReminderFormModal from './ReminderFormModal';
import RoutineChecklistModal from './RoutineChecklistModal';
import DeliveryChecklistModal from './DeliveryChecklistModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ExpensesTable from './ExpensesTable';
import RevenuesTable from './RevenuesTable';
import RemindersTable from './RemindersTable';
import ChecklistsList from './ChecklistsList';
import ServiceFormModal from './ServiceFormModal';
import ServicesTable from './ServicesTable';
import {
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
  increment,
  uploadBytes,
  getDownloadURL,
  storage as firebaseStorage,
} from '../firebaseClient';

// components/CarDetailsPage.js

const CarDetailsPage = ({ user, userData, showAlert, carId, goBack, db, auth, appInstanceId }) => {

  const [modalData, setModalData] = useState({
    tripId: null,
    car: null,
    carToEdit: null,
    checklistToDelete: null,
    serviceToDelete: null,
  });

  const [selectedCar, setSelectedCar] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [services, setServices] = useState([]);

  const [accessDenied, setAccessDenied] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [expenseModalConfig, setExpenseModalConfig] = useState({ defaultCategory: undefined, isCategoryLocked: false });
  const [activeTab, setActiveTab] = useState('maintenance');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModals, setActiveModals] = useState({
    car: false,
    expense: false,
    revenue: false,
    reminder: false,
    routineChecklist: false,
    deliveryChecklist: false,
    deleteChecklist: false,
    deleteCar: false,
    service: false,
    deleteService: false,
  });
  const [viewingChecklistData, setViewingChecklistData] = useState(null);

  const { companyId, role } = userData;
  const isAdmin = role === 'admin';
  const basePath = `artifacts/${appInstanceId}/users/${companyId}`;
  const storage = firebaseStorage;

  if (!db) return <div>Erro: DB não inicializado.</div>;

  const parseDate = (val) =>
    (val?.toDate ? val.toDate() : (val instanceof Date ? val : (val ? new Date(val) : null)));

  const formatDate = (val) => {
    const d = parseDate(val);
    if (!d || isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (n) => `R$ ${Number(n || 0).toFixed(2)}`;

  // Assinaturas
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, `${basePath}/cars`, carId), (snap) => {
      if (snap.exists()) setSelectedCar({ id: snap.id, ...snap.data() });
      else goBack();
    });
    return unsub;
  }, [db, carId]);

  useEffect(() => {
    if (!db || !basePath) return;
    const q = query(collection(db, `${basePath}/drivers`));
    return onSnapshot(q, (s) =>
      setDrivers(s.docs.map(d => ({ id: d.id, name: d.data().name })))
    );
  }, [db, basePath]);

  useEffect(() => {
    if (!db || !basePath) return;
    const q = query(collection(db, `${basePath}/maintenanceItems`), orderBy('name'));
    return onSnapshot(q, (s) =>
      setMaintenanceItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [db, basePath]);

  useEffect(() => {
    if (!db || !basePath) return;
    const q = query(collection(db, `${basePath}/workshops`), orderBy('name'));
    return onSnapshot(q, (s) =>
      setWorkshops(s.docs.map(d => ({ id: d.id, name: d.data().name })))
    );
  }, [db, basePath]);

  // Subcoleções do carro
  useEffect(() => {
    if (!db || !selectedCar) return;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/expenses`), orderBy('date','desc'));
    return onSnapshot(q, (s) =>
      setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !selectedCar) return;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/revenues`), orderBy('date','desc'));
    return onSnapshot(q, (s) =>
      setRevenues(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !selectedCar) return;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/reminders`), orderBy('createdAt','desc'));
    return onSnapshot(q, (s) =>
      setReminders(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !selectedCar) return;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/checklists`), orderBy('date','desc'));
    return onSnapshot(q, (s) =>
      setChecklists(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [db, selectedCar]);

  useEffect(() => {
    if (!db || !selectedCar) return undefined;
    const q = query(collection(db, `${basePath}/cars/${selectedCar.id}/services`), orderBy('date','desc'));
    return onSnapshot(q, (snapshot) =>
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
  }, [db, selectedCar]);

  // Derivados
  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const lq = searchQuery.toLowerCase();
    return expenses.filter(e =>
      (e.description || '').toLowerCase().includes(lq) ||
      (e.category || '').toLowerCase().includes(lq)
    );
  }, [expenses, searchQuery]);

  const maintenanceExpenses = useMemo(
    () =>
      expenses.filter(
        (e) => (e.category || '').toLowerCase() === 'manutenção'
      ),
    [expenses]
  );

  const filteredMaintenanceExpenses = useMemo(() => {
    if (!searchQuery) return maintenanceExpenses;
    const q = searchQuery.toLowerCase();
    return maintenanceExpenses.filter((e) => {
      return (
        (e.description || '').toLowerCase().includes(q) ||
        (e.workshopName || '').toLowerCase().includes(q)
      );
    });
  }, [maintenanceExpenses, searchQuery]);

  const dueReminders = useMemo(() => {
    if (!selectedCar) return [];
    const now = new Date();
    return reminders.filter(r => {
      if (r.status !== 'active') return false;
      if (r.type === 'mileage' && Number(selectedCar.currentMileage) >= Number(r.targetMileage)) return true;
      if (r.type === 'date' && new Date(r.targetDate) <= now) return true;
      return false;
    });
  }, [reminders, selectedCar]);

  const assignedDriver = useMemo(() => {
    if (!selectedCar?.assignedDriverId) return null;
    return drivers.find(d => d.id === selectedCar.assignedDriverId) || null;
  }, [selectedCar?.assignedDriverId, drivers]);

  const visibleChecklists = checklists;

  const financialSummary = useMemo(() => {
    const totalExpense = expenses.reduce((s, e) => s + Number(e.cost || 0), 0);
    const totalRevenue = revenues.reduce((s, r) => s + Number(r.value || 0), 0);
    const netProfit = totalRevenue - totalExpense;
    const commissionPct = Number(selectedCar?.commissionPercentage || 0) / 100;
    const ownerCommission = commissionPct > 0 && netProfit > 0 ? netProfit * commissionPct : 0;
    return { totalExpense, totalRevenue, netProfit, ownerCommission };
  }, [expenses, revenues, selectedCar?.commissionPercentage]);

  // Ações
  const handleSaveCar = async (carData) => {
    const prepared = {
      ...carData,
      currentMileage: Number(carData.currentMileage),
      lastOilChange: Number(carData.lastOilChange),
      oilChangeInterval: Number(carData.oilChangeInterval),
      avgConsumption: parseFloat(carData.avgConsumption),
      assignedDriverId: (carData.assignedDriverId || ''),
    };
    const { id, ...dataToSave } = prepared;
    try {
      if (id) {
        await updateDoc(doc(db, `${basePath}/cars`, id), dataToSave);
      } else {
        await addDoc(collection(db, `${basePath}/cars`), { ...dataToSave, createdAt: new Date() });
      }
      showAlert('Sucesso!','success');
      setActiveModals(p=>({...p,car:false}));
    } catch(e) {
      console.error(e);
      showAlert(`Erro: ${e.code}`,'error');
    }
  };

  // Cadastro de novo item de manutenção (Peça/Serviço) a partir do modal de manutenção
  const handleCreateMaintenanceItem = async ({ name, price, type }) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return null;

    const isPart = type === 'Peça';

    const payload = {
      name: trimmedName,
      price: Number(price) || 0,
      type,
      stock: isPart ? 0 : null,
      companyId,
      createdAt: new Date(),
    };

    try {
      const colRef = collection(db, `${basePath}/maintenanceItems`);
      const docRef = await addDoc(colRef, payload);
      return { id: docRef.id, ...payload };
    } catch (e) {
      console.error('Erro ao criar item de manutenção a partir do modal:', e);
      showAlert('Erro ao criar o item de manutenção.', 'error');
      return null;
    }
  };

  const handleSaveExpense = async (expenseData) => {
    const { id, ...dataToSave } = expenseData;
    try{
      if (id){
        await updateDoc(doc(db, `${basePath}/cars/${selectedCar.id}/expenses`, id), dataToSave);
        showAlert('Despesa atualizada com sucesso!','success');
      } else {
        await addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/expenses`), dataToSave);
        if (dataToSave.items && dataToSave.items.length>0){
          const stockUpdates = dataToSave.items
            .filter(i=>i.type==='Peça')
            .map(item=>
              updateDoc(
                doc(db, `${basePath}/maintenanceItems`, item.id),
                { stock: increment(-Number(item.quantity)) }
              )
            );
          await Promise.all(stockUpdates);
          showAlert('Despesa registada e estoque atualizado!','success');
        } else {
          showAlert('Nova despesa registada.','success');
        }
      }
      setActiveModals(p=>({...p,expense:false}));
      setExpenseToEdit(null);
    } catch(e){
      console.error(e);
      showAlert(`Erro ao salvar despesa: ${e.code}`,'error');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Tem certeza? As peças serão estornadas ao estoque.')) return;
    const expenseDocRef = doc(db, `${basePath}/cars/${selectedCar.id}/expenses`, expenseId);
    try{
      const snap = await getDoc(expenseDocRef);
      if (snap.exists()){
        const exp = snap.data();
        if (Array.isArray(exp.items) && exp.items.length>0){
          const returns = exp.items
            .filter(i=>i.type==='Peça')
            .map(item=>
              updateDoc(
                doc(db, `${basePath}/maintenanceItems`, item.id),
                { stock: increment(Number(item.quantity)) }
              )
            );
          await Promise.all(returns);
        }
      }
      await deleteDoc(expenseDocRef);
      showAlert('Despesa apagada e estoque estornado.','success');
    } catch(e){
      console.error(e);
      showAlert('Ocorreu um erro ao apagar.','error');
    }
  };

  const openExpenseModalForEdit = (expense) => {
    setExpenseToEdit(expense);
    setExpenseModalConfig({
      defaultCategory: expense.category,
      isCategoryLocked: true
    });
    setActiveModals(p=>({...p,expense:true}));
  };

  const openExpenseModalForCreate = (isMaintenance = false) => {
    setExpenseToEdit(null);
    setExpenseModalConfig({
      defaultCategory: isMaintenance ? 'Manutenção' : 'Outros',
      isCategoryLocked: isMaintenance,
    });
    setActiveModals((p) => ({ ...p, expense: true }));
  };

  async function handleSaveRevenue(revenueData){
    const dataToSave = { ...revenueData, value:Number(revenueData.value||0) };
    try{
      await addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/revenues`), dataToSave);
      showAlert('Nova receita registada.','success');
      setActiveModals(p=>({...p,revenue:false}));
    } catch(e){
      console.error(e);
      showAlert(`Erro ao salvar receita: ${e.code}`,'error');
    }
  }

  const handleSaveReminder = async (d) => {
    const data = {
      ...d,
      status:'active',
      createdAt:new Date(),
      targetMileage:Number(d.targetMileage||0)
    };
    try{
      await addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/reminders`), data);
      showAlert('Lembrete criado.','success');
      setActiveModals(p=>({...p,reminder:false}));
    } catch(e){
      showAlert(`Erro: ${e.code}`,'error');
    }
  };

  const handleReminderAction = async (id, status) => {
    const refDoc = doc(db, `${basePath}/cars/${selectedCar.id}/reminders`, id);
    try{
      if(status==='apagado'){
        await deleteDoc(refDoc);
        showAlert('Lembrete apagado.','success');
      } else {
        await updateDoc(refDoc, {status});
        showAlert(`Lembrete marcado como ${status}.`,'success');
      }
    } catch(e){
      showAlert(`Erro ao processar lembrete: ${e.code}`,'error');
    }
  };

  // --- Serviços ---

  const openServiceModalForCreate = () => {
    setServiceToEdit(null);
    setActiveModals(p => ({ ...p, service: true }));
  };

  const openServiceModalForEdit = (service) => {
    setServiceToEdit(service);
    setActiveModals(p => ({ ...p, service: true }));
  };

  const handleSaveService = async (serviceData) => {
    if (!selectedCar) return;
    const { id, ...dataToSave } = serviceData;
    try {
      if (id) {
        await updateDoc(
          doc(db, `${basePath}/cars/${selectedCar.id}/services`, id),
          dataToSave
        );
        showAlert('Serviço atualizado com sucesso!', 'success');
      } else {
        await addDoc(
          collection(db, `${basePath}/cars/${selectedCar.id}/services`),
          dataToSave
        );
        showAlert('Serviço adicionado com sucesso!', 'success');
      }
      setActiveModals(p => ({ ...p, service: false }));
      setServiceToEdit(null);
    } catch (e) {
      console.error(e);
      showAlert(`Erro ao salvar serviço: ${e.code}`, 'error');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!selectedCar) return;
    if (!confirm('Tem certeza que deseja apagar este serviço?')) return;
    try {
      await deleteDoc(
        doc(db, `${basePath}/cars/${selectedCar.id}/services`, serviceId)
      );
      showAlert('Serviço apagado com sucesso.', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Erro ao apagar serviço.', 'error');
    }
  };

  const openRoutineChecklistForCreate = () => {
    setViewingChecklistData(null);
    setActiveModals(p=>({...p,routineChecklist:true}));
  };

  const openDeliveryChecklistForCreate = () => {
    setViewingChecklistData(null);
    setActiveModals(p=>({...p,deliveryChecklist:true}));
  };

  const openChecklistForView = (checklist) => {
    setViewingChecklistData(checklist);
    if (checklist.type==='delivery_return')
      setActiveModals(p=>({...p,deliveryChecklist:true}));
    else
      setActiveModals(p=>({...p,routineChecklist:true}));
  };

  const confirmDeleteChecklist = async () => {
    const target = modalData.checklistToDelete;
    if(!target) return;
    try{
      if(Array.isArray(target.damages) && target.damages.length>0){
        for(const d of target.damages){
          if(d.photoURL){
            try{
              await deleteObject(ref(storage, d.photoURL));
            }catch(e){
              console.warn('Erro apagando foto:',e);
            }
          }
        }
      }
      if (target.photoURL) {
        try {
          await deleteObject(ref(storage, target.photoURL));
        } catch (e) {
          console.warn('Erro apagando foto da vistoria rotineira:', e);
        }
      }
      await deleteDoc(doc(db, `${basePath}/cars/${selectedCar.id}/checklists`, target.id));
      showAlert('Vistoria apagada.','success');
    } catch(e){
      showAlert('Falha ao apagar a vistoria.','error');
    } finally {
      setActiveModals(p=>({...p,deleteChecklist:false}));
      setModalData(p=>({...p,checklistToDelete:null}));
    }
  };

  const confirmDeleteCar = async () => {
    try{
      const carToDelete = selectedCar;
      const subs = ['expenses','revenues','reminders','checklists','services'];
      for(const sub of subs){
        const colRef = collection(db, `${basePath}/cars/${carToDelete.id}/${sub}`);
        const snap = await getDocs(colRef);
        await Promise.all(snap.docs.map(d=> deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, `${basePath}/cars`, carToDelete.id));
      showAlert('Carro e dados apagados.','success');
      goBack();
    } catch(e){
      showAlert(`Erro ao apagar carro: ${e.code}`,'error');
    } finally {
      setActiveModals(p=>({...p,deleteCar:false}));
    }
  };

  if(!selectedCar) return <LoadingSpinner text="A carregar dados do veículo..." />;
  if (accessDenied) {
    return (
      <div className="p-6">
        <button
          onClick={goBack}
          className="mb-6 text-blue-600 hover:text-blue-800 font-semibold"
        >
          <i className="fas fa-arrow-left mr-2"></i>Voltar
        </button>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Acesso negado a este veículo.
        </div>
      </div>
    );
  }

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
                onClick={()=>setActiveTab('checklists')}
                className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                  activeTab==='checklists'
                    ? 'tab-active'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Vistorias
              </button>
              {isAdmin && (
                <button
                  onClick={()=>setActiveTab('financial')}
                  className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                    activeTab==='financial'
                      ? 'tab-active'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Financeiro
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={()=>setActiveTab('maintenance')}
                  className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                    activeTab==='maintenance'
                      ? 'tab-active'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Manutenção
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={()=>setActiveTab('services')}
                  className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                    activeTab==='services'
                      ? 'tab-active'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Serviços
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={()=>setActiveTab('reminders')}
                  className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                    activeTab==='reminders'
                      ? 'tab-active'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Lembretes
                </button>
              )}
            </div>

            <div className="mt-4 md:mt-0 flex flex-wrap gap-2 justify-center">
              {isAdmin && activeTab==='checklists' && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={openRoutineChecklistForCreate}
                    className="flex-grow bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 text-sm"
                  >
                    <i className="fas fa-clipboard-list mr-2"></i>
                    Vistoria Rotineira
                  </button>
                  <button
                    onClick={openDeliveryChecklistForCreate}
                    className="flex-grow bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <i className="fas fa-key mr-2"></i>
                    Entrega/Devolução
                  </button>
                </div>
              )}

              {isAdmin && activeTab==='maintenance' && (
                <button
                  onClick={()=>openExpenseModalForCreate(true)}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Adicionar Manutenção
                </button>
              )}

              {isAdmin && activeTab==='services' && (
                <button
                  onClick={openServiceModalForCreate}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Adicionar Serviço
                </button>
              )}

              {isAdmin && activeTab==='reminders' && (
                <button
                  onClick={()=>setActiveModals(p=>({...p,reminder:true}))}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Criar Lembrete
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab==='checklists' && (
              <ChecklistsList
                checklists={visibleChecklists}
                isAdmin={isAdmin}
                onView={openChecklistForView}
                onRequestDelete={(cl)=>{
                  setActiveModals(p=>({...p,deleteChecklist:true}));
                  setModalData(p=>({...p, checklistToDelete:cl}));
                }}
              />
            )}

            {activeTab==='financial' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-700 font-bold">Total de Receitas</p>
                    <p className="text-2xl font-extrabold text-green-900">
                      R$ {financialSummary.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-red-700 font-bold">Total de Despesas</p>
                    <p className="text-2xl font-extrabold text-red-900">
                      R$ {financialSummary.totalExpense.toFixed(2)}
                    </p>
                  </div>
                  <div className={`${financialSummary.netProfit>=0?'bg-blue-100':'bg-orange-100'} p-4 rounded-lg text-center`}>
                    <p className={`text-sm ${financialSummary.netProfit>=0?'text-blue-700':'text-orange-700'} font-bold`}>
                      Lucro / Prejuízo
                    </p>
                    <p className={`text-2xl font-extrabold ${financialSummary.netProfit>=0?'text-blue-900':'text-orange-900'}`}>
                      R$ {financialSummary.netProfit.toFixed(2)}
                    </p>
                    {selectedCar.ownerName && financialSummary.ownerCommission>0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Comissão do proprietário: R$ {financialSummary.ownerCommission.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <button
                    onClick={()=>setActiveModals(p=>({...p,revenue:true}))}
                    className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-sm"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Adicionar Receita
                  </button>
                  <button
                    onClick={()=>openExpenseModalForCreate(false)}
                    className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Adicionar Despesa
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

            {/* ABA MANUTENÇÃO */}
            {activeTab === 'maintenance' && (
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center sm:justify-between">
                  <h3 className="font-bold text-lg">Histórico de Manutenções</h3>
                  <input
                    type="text"
                    placeholder="Buscar por descrição ou oficina..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-72 bg-gray-100 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {filteredMaintenanceExpenses.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nenhuma manutenção encontrada para esse filtro.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredMaintenanceExpenses.map((exp) => {
                      const itemsSummary = Array.isArray(exp.items) && exp.items.length > 0
                        ? exp.items
                            .map((i) => `${i.quantity || 1}x ${i.name}`)
                            .join(', ')
                        : '';

                      return (
                        <div
                          key={exp.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                        >
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-1">
                              <span className="font-semibold text-gray-800">
                                {formatDate(exp.date)}
                              </span>
                              {exp.odometer != null && (
                                <span>• {Number(exp.odometer)} km</span>
                              )}
                              <span>• {formatCurrency(exp.cost)}</span>
                            </div>
                            {exp.workshopName && (
                              <p className="text-xs text-blue-700 mb-1">
                                Oficina: {exp.workshopName}
                              </p>
                            )}
                            {exp.description && (
                              <p className="text-sm text-gray-700">
                                {exp.description}
                              </p>
                            )}
                            {itemsSummary && (
                              <p className="text-xs text-gray-500 mt-1">
                                Itens: {itemsSummary}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openExpenseModalForEdit(exp)}
                              className="bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-700"
                            >
                              Ver / Editar
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="bg-red-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-red-700"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA SERVIÇOS */}
            {activeTab === 'services' && (
              <ServicesTable
                services={services}
                onEdit={openServiceModalForEdit}
                onDelete={handleDeleteService}
              />
            )}

            {activeTab==='reminders' && (
              <RemindersTable
                reminders={reminders}
                isAdmin={isAdmin}
                onAction={handleReminderAction}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <React.Fragment>
        {isAdmin && activeModals.car && (
          <CarFormModal
            car={modalData.carToEdit}
            onClose={()=>setActiveModals(p=>({...p,car:false}))}
            onSave={handleSaveCar}
            drivers={drivers}
          />
        )}

        {isAdmin && activeModals.expense && (
          <ExpenseFormModal
            onClose={()=>{
              setActiveModals(p=>({...p,expense:false}));
              setExpenseToEdit(null);
            }}
            onSave={handleSaveExpense}
            defaultCategory={expenseModalConfig.defaultCategory}
            isCategoryLocked={expenseModalConfig.isCategoryLocked}
            maintenanceItems={maintenanceItems}
            workshops={workshops}
            expenseToEdit={expenseToEdit}
            companyId={companyId}
            onCreateMaintenanceItem={handleCreateMaintenanceItem}
          />
        )}

        {isAdmin && activeModals.service && (
          <ServiceFormModal
            service={serviceToEdit}
            onClose={() => {
              setActiveModals(p => ({ ...p, service: false }));
              setServiceToEdit(null);
            }}
            onSave={handleSaveService}
          />
        )}

        {isAdmin && activeModals.revenue && (
          <RevenueFormModal
            onClose={()=>setActiveModals(p=>({...p,revenue:false}))}
            onSave={handleSaveRevenue}
          />
        )}

        {isAdmin && activeModals.reminder && (
          <ReminderFormModal
            onClose={()=>setActiveModals(p=>({...p,reminder:false}))}
            onSave={handleSaveReminder}
          />
        )}

        {isAdmin && activeModals.routineChecklist && (
          <RoutineChecklistModal
            onClose={()=>setActiveModals(p=>({...p,routineChecklist:false}))}
            onSave={async (d)=>{
              try {
                let photoURL = d.photoURL || null;
                if (d.photoFile) {
                  const fileName = d.photoFile.name
                    ? d.photoFile.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
                    : `foto_${Date.now()}.jpg`;
                  const photoRef = ref(storage, `routine-checklists/${selectedCar.id}/${Date.now()}_${fileName}`);
                  await uploadBytes(photoRef, d.photoFile);
                  photoURL = await getDownloadURL(photoRef);
                }
                let damagesPayload = [];
                if (Array.isArray(d.damages) && d.damages.length > 0) {
                  damagesPayload = await Promise.all(
                    d.damages.map(async (damage, index) => {
                      let damagePhotoURL = damage.photoURL || null;
                      if (damage.photoFile) {
                        const originalName = damage.photoFile.name
                          ? damage.photoFile.name
                          : `dano_${index}.jpg`;
                        const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_');
                        const damageRef = ref(
                          storage,
                          `routine-checklists/${selectedCar.id}/damages/${Date.now()}_${sanitizedName}`
                        );
                        await uploadBytes(damageRef, damage.photoFile);
                        damagePhotoURL = await getDownloadURL(damageRef);
                      }
                      return {
                        id: damage.id,
                        location: damage.location,
                        description: damage.description,
                        photoURL: damagePhotoURL || undefined
                      };
                    })
                  );
                }
                const { photoFile, damages, photoURL: _existingPhotoURL, ...rest } = d;
                const dataToSave = {
                  ...rest,
                  damages: damagesPayload,
                  photoURL: photoURL || undefined,
                  checkedBy: user.email,
                  mileageAtCheck: selectedCar.currentMileage
                };
                await addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/checklists`), dataToSave);
                showAlert('Checklist rotineiro salvo!','success');
                setActiveModals(p=>({...p,routineChecklist:false}));
              } catch (error) {
                console.error('Erro ao salvar checklist rotineiro:', error);
                showAlert('Erro ao salvar checklist.','error');
              }
            }}
            initialData={viewingChecklistData}
            isViewMode={!!viewingChecklistData}
          />
        )}

        {isAdmin && activeModals.deliveryChecklist && (
          <DeliveryChecklistModal
            onClose={()=>setActiveModals(p=>({...p,deliveryChecklist:false}))}
            onSave={(d)=>{
              const dataToSave={
                ...d,
                date:new Date(),
                mileageAtCheck:selectedCar.currentMileage,
                checkedBy:user.email
              };
              addDoc(collection(db, `${basePath}/cars/${selectedCar.id}/checklists`), dataToSave)
                .then(()=>{
                  showAlert('Checklist de Entrega salvo!','success');
                  setActiveModals(p=>({...p,deliveryChecklist:false}));
                })
                .catch(()=>showAlert('Erro ao salvar checklist.','error'));
            }}
            carName={selectedCar.name}
            initialData={viewingChecklistData}
            isViewMode={!!viewingChecklistData}
          />
        )}

        {activeModals.deleteCar && (
          <DeleteConfirmationModal
            onConfirm={confirmDeleteCar}
            onCancel={()=>setActiveModals(p=>({...p,deleteCar:false}))}
            title="Apagar Veículo"
            message={`Tem a certeza que deseja apagar o veículo "${selectedCar?.name}"? Todos os seus dados serão perdidos.`}
          />
        )}

        {activeModals.deleteChecklist && (
          <DeleteConfirmationModal
            onConfirm={confirmDeleteChecklist}
            onCancel={()=>setActiveModals(p=>({...p,deleteChecklist:false}))}
            title="Apagar Vistoria"
            message="Tem a certeza que deseja apagar permanentemente esta vistoria?"
          />
        )}
      </React.Fragment>
    </React.Fragment>
  );
};

export default CarDetailsPage;

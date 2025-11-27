;(function () {
  // src/hooks/useCarUI.js
  // Estados de UI do carro expostos globalmente.

  const { useState } = React;

  function useCarUI(initialTab = "maintenance") {
    const [modalData, setModalData] = useState({
      tripId: null,
      car: null,
      carToEdit: null,
      checklistToDelete: null,
      serviceToDelete: null,
    });

    const [expenseToEdit, setExpenseToEdit] = useState(null);
    const [serviceToEdit, setServiceToEdit] = useState(null);
    const [revenueToEdit, setRevenueToEdit] = useState(null);
    const [pendencyToEdit, setPendencyToEdit] = useState(null);

    const [expenseModalConfig, setExpenseModalConfig] = useState({
      defaultCategory: undefined,
      isCategoryLocked: false,
    });

    const [activeTab, setActiveTab] = useState(initialTab);
    const [searchQuery, setSearchQuery] = useState("");

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
      pendency: false,
    });

    const [viewingChecklistData, setViewingChecklistData] = useState(null);

    return {
      modalData,
      setModalData,
      expenseToEdit,
      setExpenseToEdit,
      serviceToEdit,
      setServiceToEdit,
      revenueToEdit,
      setRevenueToEdit,
      pendencyToEdit,
      setPendencyToEdit,
      expenseModalConfig,
      setExpenseModalConfig,
      activeTab,
      setActiveTab,
      searchQuery,
      setSearchQuery,
      activeModals,
      setActiveModals,
      viewingChecklistData,
      setViewingChecklistData,
    };
  }

  window.useCarUI = useCarUI;
})();

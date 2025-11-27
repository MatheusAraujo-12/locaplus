;(function () {
  // src/components/CarDetailsPage.js

  const { useMemo } = React;

  // HOOKS
  const { useCarUI, useCarData, useCarActions } = window;

  // COMPONENTES E UTILITÁRIOS
  const {
    CarDetailsProvider,
    LoadingSpinner,
    CarDetailsHeader,
    CarTabsHeader,
    CarChecklistsTab,
    CarFinancialTab,
    CarPendingsTab,
    CarMaintenanceTab,
    CarServicesTab,
    CarRemindersTab,
    CarModalsManager,
    formatDate,
    formatCurrency,
  } = window;

  if (!CarDetailsProvider) {
    console.error("❌ ERRO: CarDetailsProvider não está definido no window!");
  }

  const CarDetailsPage = function ({
    user,
    userData,
    showAlert,
    carId,
    goBack,
    db,
    auth,
    appInstanceId,
  }) {
    // ---------------- UI STATE ----------------
    const {
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
    } = useCarUI("maintenance");

    const { companyId, role } = userData;
    const isAdmin = role === "admin";

    const basePath = "artifacts/" + appInstanceId + "/users/" + companyId;
    const storage = window.firebaseStorage;

    if (!db) {
      return React.createElement(
        "div",
        null,
        "Erro: banco de dados não inicializado."
      );
    }

    // ---------------- CAR DATA ----------------
    const {
      selectedCar,
      drivers,
      workshops,
      maintenanceItems,
      expenses,
      revenues,
      reminders,
      checklists,
      services,
      pendings,
      accessDenied,
      loading,
    } = useCarData({ db, basePath, carId, goBack });

    // ---------------- ACTIONS ----------------
    const {
      handleSaveCar: saveCar,
      handleCreateMaintenanceItem: createMaintenanceItem,
      handleSaveExpense: saveExpense,
      handleDeleteExpense: deleteExpense,
      handleSaveRevenue: saveRevenue,
      handleDeleteRevenue,
      handleSaveReminder: saveReminder,
      handleReminderAction,
      handleSaveService: saveService,
      handleDeleteService,
      handleSavePendency: savePendency,
      handleDeletePendency,
      handleChangePendencyStatus,
      confirmDeleteChecklist: deleteChecklistData,
      confirmDeleteCar: deleteCarData,
    } = useCarActions({
      db,
      basePath,
      companyId,
      selectedCar,
      drivers,
      storage,
      showAlert,
      goBack,
    });

    // ---------------- FILTERS & COMPUTED ----------------
    const filteredExpenses = useMemo(
      function () {
        if (!searchQuery) return expenses;
        const q = String(searchQuery).toLowerCase();
        return expenses.filter(function (e) {
          return (
            String(e.description || "").toLowerCase().includes(q) ||
            String(e.category || "").toLowerCase().includes(q)
          );
        });
      },
      [expenses, searchQuery]
    );

    const maintenanceExpenses = useMemo(
      function () {
        return expenses.filter(function (e) {
          return String(e.category || "").toLowerCase() === "manutenção";
        });
      },
      [expenses]
    );

    const filteredPendings = useMemo(
      function () {
        if (!searchQuery) return pendings;
        const q = String(searchQuery).toLowerCase();
        return pendings.filter(function (p) {
          return (
            String(p.description || "").toLowerCase().includes(q) ||
            String(p.driverName || "").toLowerCase().includes(q)
          );
        });
      },
      [pendings, searchQuery]
    );

    const dueReminders = useMemo(
      function () {
        if (!selectedCar) return [];
        const now = new Date();
        return reminders.filter(function (r) {
          if (r.status !== "active") return false;

          if (
            r.type === "mileage" &&
            Number(selectedCar.currentMileage) >= Number(r.targetMileage)
          ) {
            return true;
          }

          if (r.type === "date" && new Date(r.targetDate) <= now) {
            return true;
          }

          return false;
        });
      },
      [reminders, selectedCar]
    );

    const assignedDriver = useMemo(
      function () {
        if (!selectedCar || !selectedCar.assignedDriverId) return null;
        return (
          drivers.find(function (d) {
            return d.id === selectedCar.assignedDriverId;
          }) || null
        );
      },
      [selectedCar ? selectedCar.assignedDriverId : null, drivers]
    );

    const visibleChecklists = checklists;

    const financialSummary = useMemo(
      function () {
        const totalExpense = expenses.reduce(function (s, e) {
          return s + Number(e.cost || 0);
        }, 0);

        const totalRevenue = revenues.reduce(function (s, r) {
          return s + Number(r.value || 0);
        }, 0);

        const netProfit = totalRevenue - totalExpense;

        const commissionPct =
          Number(selectedCar && selectedCar.commissionPercentage
            ? selectedCar.commissionPercentage
            : 0) / 100;

        const ownerCommission =
          commissionPct > 0 && netProfit > 0
            ? netProfit * commissionPct
            : 0;

        return {
          totalExpense: totalExpense,
          totalRevenue: totalRevenue,
          netProfit: netProfit,
          ownerCommission: ownerCommission,
        };
      },
      [expenses, revenues, selectedCar ? selectedCar.commissionPercentage : null]
    );

    // ---------------- UI WRAPPERS ----------------

    // SALVAR CARRO
    const handleSaveCar = async function (carData) {
      await saveCar(carData);
      setActiveModals(function (p) {
        return Object.assign({}, p, { car: false });
      });
    };

    // SALVAR DESPESA
    const handleSaveExpense = async function (expenseData) {
      await saveExpense(expenseData);
      setActiveModals(function (p) {
        return Object.assign({}, p, { expense: false });
      });
      setExpenseToEdit(null);
    };

    // 🔴 AGORA DEFINIDO: EXCLUIR DESPESA COM CONFIRMAÇÃO
    const handleDeleteExpense = async function (expenseId) {
      if (!selectedCar) return;
      const ok = window.confirm(
        "Tem certeza? As peças serão estornadas ao estoque."
      );
      if (!ok) return;
      await deleteExpense(expenseId);
    };

    // EDITAR DESPESA
    const openExpenseModalForEdit = function (expense) {
      setExpenseToEdit(expense);
      setExpenseModalConfig({
        defaultCategory: expense.category,
        isCategoryLocked: true,
      });
      setActiveModals(function (p) {
        return Object.assign({}, p, { expense: true });
      });
    };

    // CRIAR DESPESA (MANUTENÇÃO OU OUTROS)
    const openExpenseModalForCreate = function (isMaintenance) {
      setExpenseToEdit(null);
      setExpenseModalConfig({
        defaultCategory: isMaintenance ? "Manutenção" : "Outros",
        isCategoryLocked: !!isMaintenance,
      });
      setActiveModals(function (p) {
        return Object.assign({}, p, { expense: true });
      });
    };

    // RECEITAS
    const handleSaveRevenue = async function (rev) {
      await saveRevenue(rev);
      setActiveModals(function (p) {
        return Object.assign({}, p, { revenue: false });
      });
      setRevenueToEdit(null);
    };

    const openRevenueModalForEdit = function (rev) {
      setRevenueToEdit(rev);
      setActiveModals(function (p) {
        return Object.assign({}, p, { revenue: true });
      });
    };

    // SERVIÇOS
    const openServiceModalForCreate = function () {
      setServiceToEdit(null);
      setActiveModals(function (p) {
        return Object.assign({}, p, { service: true });
      });
    };

    const openServiceModalForEdit = function (s) {
      setServiceToEdit(s);
      setActiveModals(function (p) {
        return Object.assign({}, p, { service: true });
      });
    };

    const handleSaveService = async function (serviceData) {
      await saveService(serviceData);
      setActiveModals(function (p) {
        return Object.assign({}, p, { service: false });
      });
      setServiceToEdit(null);
    };

    // PENDÊNCIAS
    const openPendencyModalForCreate = function () {
      setPendencyToEdit(null);
      setActiveModals(function (p) {
        return Object.assign({}, p, { pendency: true });
      });
    };

    const openPendencyModalForEdit = function (pend) {
      setPendencyToEdit(pend);
      setActiveModals(function (p2) {
        return Object.assign({}, p2, { pendency: true });
      });
    };

    const handleSavePendency = async function (pendencyData) {
      await savePendency(pendencyData);
      setActiveModals(function (p) {
        return Object.assign({}, p, { pendency: false });
      });
      setPendencyToEdit(null);
    };

    // CHECKLISTS
    const openRoutineChecklistForCreate = function () {
      setViewingChecklistData(null);
      setActiveModals(function (p) {
        return Object.assign({}, p, { routineChecklist: true });
      });
    };

    const openDeliveryChecklistForCreate = function () {
      setViewingChecklistData(null);
      setActiveModals(function (p) {
        return Object.assign({}, p, { deliveryChecklist: true });
      });
    };

    const openChecklistForView = function (checklist) {
      setViewingChecklistData(checklist);
      if (checklist.type === "delivery_return") {
        setActiveModals(function (p) {
          return Object.assign({}, p, { deliveryChecklist: true });
        });
      } else {
        setActiveModals(function (p) {
          return Object.assign({}, p, { routineChecklist: true });
        });
      }
    };

    const confirmDeleteChecklist = async function () {
      const target = modalData.checklistToDelete;
      if (!target) return;

      await deleteChecklistData(target);

      setActiveModals(function (p) {
        return Object.assign({}, p, { deleteChecklist: false });
      });
      setModalData(function (p) {
        return Object.assign({}, p, { checklistToDelete: null });
      });
    };

    const confirmDeleteCar = async function () {
      await deleteCarData();
      setActiveModals(function (p) {
        return Object.assign({}, p, { deleteCar: false });
      });
    };

    // ---------------- RENDER ----------------
    if (loading || !selectedCar) {
      return React.createElement(LoadingSpinner, {
        text: "Carregando dados do veículo...",
      });
    }

    if (accessDenied) {
      return React.createElement(
        "div",
        { className: "p-6" },
        React.createElement(
          "button",
          {
            onClick: goBack,
            className: "mb-6 text-blue-600 hover:text-blue-800 font-semibold",
          },
          React.createElement("i", { className: "fas fa-arrow-left mr-2" }),
          "Voltar"
        ),
        React.createElement(
          "div",
          { className: "bg-red-50 text-red-700 p-4 rounded-lg" },
          "Acesso negado a este veículo."
        )
      );
    }

    return React.createElement(
      CarDetailsProvider,
      {
        value: {
          selectedCar: selectedCar,
          isAdmin: isAdmin,
          companyId: companyId,
          drivers: drivers,
          reminders: reminders,
          expenses: expenses,
          revenues: revenues,
          pendings: pendings,
          services: services,
          checklists: checklists,
        },
      },
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          { className: "p-4 md:p-6 bg-gray-50 min-h-screen" },
          React.createElement(CarDetailsHeader, {
            goBack: goBack,
            dueReminders: dueReminders,
            selectedCar: selectedCar,
            assignedDriver: assignedDriver,
            isAdmin: isAdmin,
            user: user,
            setActiveModals: setActiveModals,
            setModalData: setModalData,
          }),
          React.createElement(
            "div",
            { className: "mt-8 bg-white rounded-xl shadow-lg p-4 sm:p-6" },
            React.createElement(CarTabsHeader, {
              isAdmin: isAdmin,
              activeTab: activeTab,
              setActiveTab: setActiveTab,
              onCreateRoutineChecklist: openRoutineChecklistForCreate,
              onCreateDeliveryChecklist: openDeliveryChecklistForCreate,
              onCreatePendency: openPendencyModalForCreate,
              onCreateMaintenance: function () {
                openExpenseModalForCreate(true);
              },
              onCreateService: openServiceModalForCreate,
              onCreateReminder: function () {
                setActiveModals(function (p) {
                  return Object.assign({}, p, { reminder: true });
                });
              },
            }),
            React.createElement(
              "div",
              { className: "overflow-x-auto" },
              activeTab === "checklists" &&
                React.createElement(CarChecklistsTab, {
                  checklists: visibleChecklists,
                  isAdmin: isAdmin,
                  onViewChecklist: openChecklistForView,
                  onRequestDeleteChecklist: function (cl) {
                    setActiveModals(function (p) {
                      return Object.assign({}, p, {
                        deleteChecklist: true,
                      });
                    });
                    setModalData(function (p) {
                      return Object.assign({}, p, {
                        checklistToDelete: cl,
                      });
                    });
                  },
                }),
              activeTab === "financial" &&
                React.createElement(CarFinancialTab, {
                  financialSummary: financialSummary,
                  revenues: revenues,
                  expenses: filteredExpenses,
                  onAddRevenue: function () {
                    setActiveModals(function (p) {
                      return Object.assign({}, p, { revenue: true });
                    });
                  },
                  onAddExpense: function () {
                    openExpenseModalForCreate(false);
                  },
                  onEditRevenue: openRevenueModalForEdit,
                  onDeleteRevenue: handleDeleteRevenue,
                  onEditExpense: openExpenseModalForEdit,
                  onDeleteExpense: handleDeleteExpense,
                }),
              activeTab === "pendings" &&
                React.createElement(CarPendingsTab, {
                  pendings: filteredPendings,
                  searchQuery: searchQuery,
                  onSearchChange: setSearchQuery,
                  onMarkPaid: function (p) {
                    handleChangePendencyStatus(p, "paid");
                  },
                  onReopen: function (p) {
                    handleChangePendencyStatus(p, "open");
                  },
                  onEdit: openPendencyModalForEdit,
                  onDelete: handleDeletePendency,
                  formatDate: formatDate,
                  formatCurrency: formatCurrency,
                }),
              activeTab === "maintenance" &&
                React.createElement(CarMaintenanceTab, {
                  maintenanceExpenses: maintenanceExpenses,
                  searchQuery: searchQuery,
                  onSearchChange: setSearchQuery,
                  onEditExpense: openExpenseModalForEdit,
                  onDeleteExpense: handleDeleteExpense,
                }),
              activeTab === "services" &&
                React.createElement(CarServicesTab, {
                  services: services,
                  onEditService: openServiceModalForEdit,
                  onDeleteService: handleDeleteService,
                }),
              activeTab === "reminders" &&
                React.createElement(CarRemindersTab, {
                  reminders: reminders,
                  isAdmin: isAdmin,
                  onAction: handleReminderAction,
                })
            )
          )
        ),
        React.createElement(CarModalsManager, {
          isAdmin: isAdmin,
          activeModals: activeModals,
          setActiveModals: setActiveModals,
          modalData: modalData,
          setModalData: setModalData,
          drivers: drivers,
          maintenanceItems: maintenanceItems,
          workshops: workshops,
          companyId: companyId,
          expenseModalConfig: expenseModalConfig,
          expenseToEdit: expenseToEdit,
          setExpenseToEdit: setExpenseToEdit,
          serviceToEdit: serviceToEdit,
          setServiceToEdit: setServiceToEdit,
          revenueToEdit: revenueToEdit,
          setRevenueToEdit: setRevenueToEdit,
          pendencyToEdit: pendencyToEdit,
          setPendencyToEdit: setPendencyToEdit,
          selectedCar: selectedCar,
          viewingChecklistData: viewingChecklistData,
          setViewingChecklistData: setViewingChecklistData,
          db: db,
          basePath: basePath,
          storage: storage,
          user: user,
          showAlert: showAlert,
          handleSaveCar: handleSaveCar,
          handleSaveExpense: handleSaveExpense,
          handleCreateMaintenanceItem: createMaintenanceItem,
          handleSavePendency: handleSavePendency,
          handleSaveService: handleSaveService,
          handleSaveRevenue: handleSaveRevenue,
          handleSaveReminder: saveReminder,
          confirmDeleteCar: confirmDeleteCar,
          confirmDeleteChecklist: confirmDeleteChecklist,
        })
      )
    );
  };

  window.CarDetailsPage = CarDetailsPage;
})();

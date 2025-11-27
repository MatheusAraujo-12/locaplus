;(function () {
  // src/hooks/useCarActions.js
  // Lida com operações em carros sem necessidade de imports.

  const {
    createOrUpdateCar,
    createMaintenanceItem,
    saveExpense,
    deleteExpenseWithStockAdjust,
    saveRevenue,
    deleteRevenue,
    saveReminder,
    updateOrDeleteReminder,
    saveService,
    deleteService,
    savePendency,
    deletePendency,
    changePendencyStatus,
    deleteChecklistWithPhotos,
    deleteCarCascade,
  } = window.carService || {};

  function useCarActions({
    db,
    basePath,
    companyId,
    selectedCar,
    drivers,
    storage,
    showAlert,
    goBack,
  }) {
    if (!db) {
      console.warn("useCarActions chamado sem db inicializado.");
    }

    // ---------- CARRO ----------
    const handleSaveCar = async (carData) => {
      if (!db) return;
      try {
        await createOrUpdateCar(db, basePath, carData);
        showAlert && showAlert("Sucesso!", "success");
      } catch (e) {
        console.error(e);
        showAlert && showAlert(`Erro: ${e.code}`, "error");
      }
    };

    // ---------- ITENS DE MANUTENÇÃO ----------
    const handleCreateMaintenanceItem = async ({ name, price, type }) => {
      if (!db) return null;
      try {
        return await createMaintenanceItem(db, basePath, companyId, {
          name,
          price,
          type,
        });
      } catch (e) {
        console.error("Erro ao criar item de manutenção:", e);
        showAlert &&
          showAlert("Erro ao criar o item de manutenção.", "error");
        return null;
      }
    };

    // ---------- DESPESAS ----------
    const handleSaveExpense = async (expenseData) => {
      if (!db || !selectedCar) return;

      try {
        const result = await saveExpense(
          db,
          basePath,
          selectedCar.id,
          expenseData
        );

        if (result.type === "update") {
          showAlert && showAlert("Despesa atualizada com sucesso!", "success");
        } else if (result.type === "create_with_stock") {
          showAlert &&
            showAlert("Despesa registrada e estoque atualizado!", "success");
        } else {
          showAlert && showAlert("Nova despesa registrada.", "success");
        }
      } catch (e) {
        console.error(e);
        showAlert &&
          showAlert(`Erro ao salvar despesa: ${e.code}`, "error");
      }
    };

    const handleDeleteExpense = async (expenseId) => {
      if (!db || !selectedCar) return;
      try {
        await deleteExpenseWithStockAdjust(
          db,
          basePath,
          selectedCar.id,
          expenseId
        );
        showAlert &&
          showAlert("Despesa apagada e estoque estornado.", "success");
      } catch (e) {
        console.error(e);
        showAlert && showAlert("Ocorreu um erro ao apagar.", "error");
      }
    };

    // ---------- RECEITAS ----------
    const handleSaveRevenue = async (revenueData) => {
      if (!db || !selectedCar) return;

      try {
        const result = await saveRevenue(
          db,
          basePath,
          selectedCar.id,
          revenueData
        );

        if (result.type === "update") {
          showAlert &&
            showAlert("Receita atualizada com sucesso!", "success");
        } else {
          showAlert && showAlert("Nova receita registrada.", "success");
        }
      } catch (e) {
        console.error(e);
        showAlert &&
          showAlert(`Erro ao salvar receita: ${e.code}`, "error");
      }
    };

    const handleDeleteRevenue = async (revenueId) => {
      if (!db || !selectedCar) return;

      try {
        await deleteRevenue(db, basePath, selectedCar.id, revenueId);
        showAlert && showAlert("Receita apagada com sucesso.", "success");
      } catch (e) {
        console.error(e);
        showAlert && showAlert("Erro ao apagar receita.", "error");
      }
    };

    // ---------- LEMBRETES ----------
    const handleSaveReminder = async (d) => {
      if (!db || !selectedCar) return;

      try {
        await saveReminder(db, basePath, selectedCar.id, d);
        showAlert && showAlert("Lembrete criado.", "success");
      } catch (e) {
        showAlert && showAlert(`Erro: ${e.code}`, "error");
      }
    };

    const handleReminderAction = async (id, status) => {
      if (!db || !selectedCar) return;

      try {
        await updateOrDeleteReminder(
          db,
          basePath,
          selectedCar.id,
          id,
          status
        );
        if (status === "apagado") {
          showAlert && showAlert("Lembrete apagado.", "success");
        } else {
          showAlert &&
            showAlert(`Lembrete marcado como ${status}.`, "success");
        }
      } catch (e) {
        showAlert &&
          showAlert(`Erro ao processar lembrete: ${e.code}`, "error");
      }
    };

    // ---------- SERVIÇOS ----------
    const handleSaveService = async (serviceData) => {
      if (!db || !selectedCar) return;

      try {
        const result = await saveService(
          db,
          basePath,
          selectedCar.id,
          serviceData
        );

        if (result.type === "update") {
          showAlert &&
            showAlert("Serviço atualizado com sucesso!", "success");
        } else {
          showAlert &&
            showAlert("Serviço adicionado com sucesso!", "success");
        }
      } catch (e) {
        console.error(e);
        showAlert &&
          showAlert(`Erro ao salvar serviço: ${e.code}`, "error");
      }
    };

    const handleDeleteService = async (serviceId) => {
      if (!db || !selectedCar) return;

      try {
        await deleteService(db, basePath, selectedCar.id, serviceId);
        showAlert && showAlert("Serviço apagado com sucesso.", "success");
      } catch (e) {
        console.error(e);
        showAlert && showAlert("Erro ao apagar serviço.", "error");
      }
    };

    // ---------- PENDÊNCIAS ----------
    const handleSavePendency = async (pendencyData) => {
      if (!db || !selectedCar) return;

      try {
        const result = await savePendency(
          db,
          basePath,
          selectedCar.id,
          companyId,
          drivers,
          pendencyData
        );

        if (result.type === "update") {
          showAlert &&
            showAlert("Pendência atualizada com sucesso!", "success");
        } else {
          showAlert &&
            showAlert("Pendência criada com sucesso!", "success");
        }
      } catch (e) {
        console.error(e);
        showAlert &&
          showAlert(`Erro ao salvar pendência: ${e.code}`, "error");
      }
    };

    const handleDeletePendency = async (pendencyId) => {
      if (!db || !selectedCar) return;

      try {
        await deletePendency(db, basePath, selectedCar.id, pendencyId);
        showAlert && showAlert("Pendência apagada com sucesso.", "success");
      } catch (e) {
        console.error(e);
        showAlert && showAlert("Erro ao apagar pendência.", "error");
      }
    };

    const handleChangePendencyStatus = async (pendency, newStatus) => {
      if (!db || !selectedCar) return;

      try {
        await changePendencyStatus(
          db,
          basePath,
          selectedCar.id,
          pendency.id,
          newStatus
        );
        showAlert &&
          showAlert("Status da pendência atualizado.", "success");
      } catch (e) {
        console.error(e);
        showAlert &&
          showAlert("Erro ao alterar status da pendência.", "error");
      }
    };

    // ---------- CHECKLISTS ----------
    const confirmDeleteChecklist = async (checklist) => {
      if (!db || !selectedCar) return;

      try {
        await deleteChecklistWithPhotos(
          db,
          basePath,
          selectedCar.id,
          checklist,
          storage
        );
        showAlert && showAlert("Vistoria apagada.", "success");
      } catch (e) {
        console.error(e);
        showAlert && showAlert("Falha ao apagar a vistoria.", "error");
      }
    };

    // ---------- CARRO COMPLETO ----------
    const confirmDeleteCar = async () => {
      if (!db || !selectedCar) return;

      try {
        await deleteCarCascade(db, basePath, selectedCar.id);
        showAlert && showAlert("Carro e dados apagados.", "success");
        goBack && goBack();
      } catch (e) {
        console.error(e);
        showAlert &&
          showAlert(`Erro ao apagar carro: ${e.code}`, "error");
      }
    };

    return {
      handleSaveCar,
      handleCreateMaintenanceItem,
      handleSaveExpense,
      handleDeleteExpense,
      handleSaveRevenue,
      handleDeleteRevenue,
      handleSaveReminder,
      handleReminderAction,
      handleSaveService,
      handleDeleteService,
      handleSavePendency,
      handleDeletePendency,
      handleChangePendencyStatus,
      confirmDeleteChecklist,
      confirmDeleteCar,
    };
  }

  window.useCarActions = useCarActions;
})();

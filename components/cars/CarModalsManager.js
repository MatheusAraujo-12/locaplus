;(function(){
// src/components/cars/CarModalsManager.js
const syncChecklistDamagesToPendencies =
  window.syncChecklistDamagesToPendencies;

const CarModalsManager = ({
  isAdmin,
  activeModals,
  setActiveModals,
  modalData,
  setModalData,
  drivers,
  maintenanceItems,
  workshops,
  companyId,
  expenseModalConfig,
  expenseToEdit,
  setExpenseToEdit,
  serviceToEdit,
  setServiceToEdit,
  revenueToEdit,
  setRevenueToEdit,
  pendencyToEdit,
  setPendencyToEdit,
  selectedCar,
  viewingChecklistData,
  setViewingChecklistData,
  db,
  basePath,
  storage,
  user,
  showAlert,
  handleSaveCar,
  handleSaveExpense,
  handleCreateMaintenanceItem,
  handleSavePendency,
  handleSaveService,
  handleSaveRevenue,
  handleSaveReminder,
  confirmDeleteCar,
  confirmDeleteChecklist,
}) => {
  const { collection, addDoc, ref, uploadBytes, getDownloadURL } =
    window.firebase || {};
  if (!selectedCar) return null;

  const assignedDriver =
    drivers?.find((d) => d.id === selectedCar.assignedDriverId) || null;

  // Helpers de fechamento
  const closeModal = (key) =>
    setActiveModals((p) => ({ ...p, [key]: false }));

  // ---------------- ROTINA ----------------

  const handleSaveRoutineChecklist = async (d) => {
    try {
      // FOTO PRINCIPAL
      let photoURL = d.photoURL || null;
      if (d.photoFile && storage) {
        const fileName = d.photoFile.name
          ? d.photoFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_")
          : `foto_${Date.now()}.jpg`;
        const photoRef = ref(
          storage,
          `routine-checklists/${selectedCar.id}/${Date.now()}_${fileName}`
        );
        await uploadBytes(photoRef, d.photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      // FOTOS DOS DANOS
      let damagesPayload = [];
      if (Array.isArray(d.damages) && d.damages.length > 0 && storage) {
        damagesPayload = await Promise.all(
          d.damages.map(async (damage, index) => {
            let damagePhotoURL = damage.photoURL || null;

            if (damage.photoFile) {
              const originalName = damage.photoFile.name
                ? damage.photoFile.name
                : `dano_${index}.jpg`;
              const sanitizedName = originalName.replace(
                /[^a-zA-Z0-9._-]+/g,
                "_"
              );
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
              estimatedCost: damage.estimatedCost
                ? Number(damage.estimatedCost)
                : undefined,
              photoURL: damagePhotoURL || undefined,
            };
          })
        );
      }

      const { photoFile, damages, photoURL: _existingPhotoURL, ...rest } = d;

      const dataToSave = {
        ...rest,
        type: rest.type || "routine",
        damages: damagesPayload,
        photoURL: photoURL || undefined,
        checkedBy: user.email,
        mileageAtCheck: selectedCar.currentMileage,
        carId: selectedCar.id,
        companyId,
        createdAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, `${basePath}/cars/${selectedCar.id}/checklists`),
        dataToSave
      );

      // Cria pendências com base nos danos
      await syncChecklistDamagesToPendencies({
        db,
        basePath,
        companyId,
        carId: selectedCar.id,
        driver: assignedDriver,
        checklist: { id: docRef.id, ...dataToSave },
      });

      showAlert("Checklist rotineiro salvo!", "success");
      closeModal("routineChecklist");
      setViewingChecklistData(null);
    } catch (error) {
      console.error("Erro ao salvar checklist rotineiro:", error);
      showAlert("Erro ao salvar checklist.", "error");
    }
  };

  // ---------------- ENTREGA / DEVOLUÇÃO ----------------

  const handleSaveDeliveryChecklist = async (d) => {
    try {
      const dataToSave = {
        ...d,
        type: d.type || "delivery", // se quiser tratar devolução, o modal manda type = 'return'
        date:
          d.date && d.date.trim
            ? d.date
            : new Date().toISOString().slice(0, 10),
        mileageAtCheck: selectedCar.currentMileage,
        checkedBy: user.email,
        carId: selectedCar.id,
        companyId,
        createdAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, `${basePath}/cars/${selectedCar.id}/checklists`),
        dataToSave
      );

      await syncChecklistDamagesToPendencies({
        db,
        basePath,
        companyId,
        carId: selectedCar.id,
        driver: assignedDriver,
        checklist: { id: docRef.id, ...dataToSave },
      });

      showAlert("Checklist de entrega salvo!", "success");
      closeModal("deliveryChecklist");
      setViewingChecklistData(null);
    } catch (err) {
      console.error("Erro ao salvar checklist de entrega:", err);
      showAlert("Erro ao salvar checklist.", "error");
    }
  };

  // ----------------------------------------------------
  // RENDERIZAÇÃO DOS MODAIS
  // ----------------------------------------------------

  return (
    <>
      {/* CARRO */}
      {isAdmin && activeModals.car && (
        <CarFormModal
          car={modalData.carToEdit}
          onClose={() => {
            closeModal("car");
            setModalData((p) => ({ ...p, carToEdit: null }));
          }}
          onSave={handleSaveCar}
          drivers={drivers}
        />
      )}

      {/* DESPESA */}
      {isAdmin && activeModals.expense && (
        <ExpenseFormModal
          onClose={() => {
            closeModal("expense");
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

      {/* PENDÊNCIA */}
      {isAdmin && activeModals.pendency && (
        <PendencyFormModal
          pendency={pendencyToEdit}
          drivers={drivers}
          selectedCar={selectedCar}
          onClose={() => {
            closeModal("pendency");
            setPendencyToEdit(null);
          }}
          onSave={handleSavePendency}
        />
      )}

      {/* SERVIÇO */}
      {isAdmin && activeModals.service && (
        <ServiceFormModal
          service={serviceToEdit}
          onClose={() => {
            closeModal("service");
            setServiceToEdit(null);
          }}
          onSave={handleSaveService}
        />
      )}

      {/* RECEITA */}
      {isAdmin && activeModals.revenue && (
        <RevenueFormModal
          revenue={revenueToEdit}
          onClose={() => {
            closeModal("revenue");
            setRevenueToEdit(null);
          }}
          onSave={handleSaveRevenue}
        />
      )}

      {/* LEMBRETE */}
      {isAdmin && activeModals.reminder && (
        <ReminderFormModal
          onClose={() => closeModal("reminder")}
          onSave={handleSaveReminder}
        />
      )}

      {/* VISTORIA ROTINEIRA */}
      {isAdmin && activeModals.routineChecklist && (
        <RoutineChecklistModal
          onClose={() => {
            closeModal("routineChecklist");
            setViewingChecklistData(null);
          }}
          onSave={handleSaveRoutineChecklist}
          initialData={viewingChecklistData}
          isViewMode={!!viewingChecklistData}
        />
      )}

      {/* VISTORIA ENTREGA / DEVOLUÇÃO */}
      {isAdmin && activeModals.deliveryChecklist && (
        <DeliveryChecklistModal
          onClose={() => {
            closeModal("deliveryChecklist");
            setViewingChecklistData(null);
          }}
          onSave={handleSaveDeliveryChecklist}
          carName={selectedCar.name}
          initialData={viewingChecklistData}
          isViewMode={!!viewingChecklistData}
        />
      )}

      {/* APAGAR CARRO */}
      {activeModals.deleteCar && (
        <DeleteConfirmationModal
          onConfirm={confirmDeleteCar}
          onCancel={() => closeModal("deleteCar")}
          title="Apagar Veículo"
          message={`Tem certeza de que deseja apagar o veículo "${selectedCar?.name}"? Todos os seus dados serão perdidos.`}
        />
      )}

      {/* APAGAR VISTORIA */}
      {activeModals.deleteChecklist && (
        <DeleteConfirmationModal
          onConfirm={confirmDeleteChecklist}
          onCancel={() => {
            closeModal("deleteChecklist");
            setModalData((p) => ({ ...p, checklistToDelete: null }));
          }}
          title="Apagar Vistoria"
          message="Tem certeza de que deseja apagar permanentemente esta vistoria?"
        />
      )}
    </>
  );
};

window.CarModalsManager = CarModalsManager;

})();

;(function () {
  // src/services/carService.js
  // Implementações expostas no escopo global para uso sem bundler.

  const getFirebase = () => window.firebase || {};

  // ---------- CARRO ----------
  async function createOrUpdateCar(db, basePath, carData) {
    if (!db || !basePath) return;
    const { doc, addDoc, updateDoc, collection } = getFirebase();

    const prepared = {
      ...carData,
      currentMileage: Number(carData.currentMileage),
      lastOilChange: Number(carData.lastOilChange),
      oilChangeInterval: Number(carData.oilChangeInterval),
      avgConsumption: parseFloat(carData.avgConsumption),
      assignedDriverId: carData.assignedDriverId || "",
    };

    const { id, ...dataToSave } = prepared;

    if (id) {
      await updateDoc(doc(db, `${basePath}/cars`, id), dataToSave);
      return { type: "update" };
    }

    await addDoc(collection(db, `${basePath}/cars`), {
      ...dataToSave,
      createdAt: new Date(),
    });
    return { type: "create" };
  }

  // ---------- ITENS DE MANUTENÇÃO (CATÁLOGO) ----------
  async function createMaintenanceItem(
    db,
    basePath,
    companyId,
    { name, price, type }
  ) {
    if (!db || !basePath) return null;
    const { addDoc, collection } = getFirebase();

    const trimmedName = (name || "").trim();
    if (!trimmedName) return null;

    const t = (type || "").toLowerCase();
    const isPart = t === "peça" || t === "peca";

    const payload = {
      name: trimmedName,
      price: Number(price) || 0,
      type,
      stock: isPart ? 0 : null,
      companyId,
      createdAt: new Date(),
    };

    const docRef = await addDoc(
      collection(db, `${basePath}/maintenanceItems`),
      payload
    );
    return { id: docRef.id, ...payload };
  }

  // ---------- DESPESAS ----------
  async function adjustStockForItems(db, basePath, items = [], multiplier = -1) {
    if (!db || !basePath || !Array.isArray(items)) return;
    const { updateDoc, doc, increment } = getFirebase();

    const partItems = items.filter((i) => {
      const t = (i.type || "").toLowerCase();
      // Considera "Peça" ou "Peca" como itens de estoque
      return t.includes("peça") || t.includes("peca");
    });

    for (const item of partItems) {
      if (!item.id) continue;
      const qty = Number(item.quantity || 1) * multiplier;
      await updateDoc(doc(db, `${basePath}/maintenanceItems`, item.id), {
        stock: increment(qty),
      });
    }
  }

  async function saveExpense(db, basePath, carId, expenseData) {
    if (!db || !basePath || !carId) return { type: "noop" };
    const { addDoc, updateDoc, collection, doc } = getFirebase();

    const { id, ...dataToSave } = expenseData;
    const payload = {
      ...dataToSave,
      cost: Number(dataToSave.cost || 0),
    };

    if (id) {
      await updateDoc(
        doc(db, `${basePath}/cars/${carId}/expenses`, id),
        payload
      );
      return { type: "update" };
    }

    await addDoc(collection(db, `${basePath}/cars/${carId}/expenses`), {
      ...payload,
      createdAt: new Date(),
    });

    // Ajuste de estoque para peças usadas
    await adjustStockForItems(db, basePath, payload.items || [], -1);
    return {
      type: (payload.items || []).length ? "create_with_stock" : "create",
    };
  }

  async function deleteExpenseWithStockAdjust(db, basePath, carId, expenseId) {
    if (!db || !basePath || !carId || !expenseId) return;
    const { doc, getDoc, deleteDoc } = getFirebase();

    const expenseRef = doc(
      db,
      `${basePath}/cars/${carId}/expenses`,
      expenseId
    );
    const snap = await getDoc(expenseRef);
    const data = snap.exists() ? snap.data() : null;

    if (data?.items?.length) {
      await adjustStockForItems(db, basePath, data.items, 1);
    }

    await deleteDoc(expenseRef);
  }

  // ---------- RECEITAS ----------
  async function saveRevenue(db, basePath, carId, revenueData) {
    if (!db || !basePath || !carId) return { type: "noop" };
    const { addDoc, updateDoc, collection, doc } = getFirebase();

    const { id, ...rest } = revenueData;
    const payload = {
      ...rest,
      value: Number(rest.value || 0),
    };

    if (id) {
      await updateDoc(
        doc(db, `${basePath}/cars/${carId}/revenues`, id),
        payload
      );
      return { type: "update" };
    }

    await addDoc(collection(db, `${basePath}/cars/${carId}/revenues`), {
      ...payload,
      createdAt: new Date(),
    });
    return { type: "create" };
  }

  async function deleteRevenue(db, basePath, carId, revenueId) {
    if (!db || !basePath || !carId || !revenueId) return;
    const { deleteDoc, doc } = getFirebase();
    await deleteDoc(doc(db, `${basePath}/cars/${carId}/revenues`, revenueId));
  }

  // ---------- LEMBRETES ----------
  async function saveReminder(db, basePath, carId, data) {
    if (!db || !basePath || !carId) return;
    const { addDoc, collection } = getFirebase();

    await addDoc(collection(db, `${basePath}/cars/${carId}/reminders`), {
      ...data,
      status: data.status || "active",
      createdAt: new Date(),
    });
  }

  async function updateOrDeleteReminder(
    db,
    basePath,
    carId,
    reminderId,
    status
  ) {
    if (!db || !basePath || !carId || !reminderId) return;
    const { doc, deleteDoc, updateDoc } = getFirebase();

    const reminderRef = doc(
      db,
      `${basePath}/cars/${carId}/reminders`,
      reminderId
    );
    if (status === "apagado") {
      await deleteDoc(reminderRef);
    } else {
      await updateDoc(reminderRef, {
        status,
        updatedAt: new Date(),
      });
    }
  }

  // ---------- SERVIÇOS ----------
  async function saveService(db, basePath, carId, serviceData) {
    if (!db || !basePath || !carId) return { type: "noop" };
    const { addDoc, updateDoc, collection, doc } = getFirebase();

    const { id, ...payload } = serviceData;
    const prepared = {
      ...payload,
      cost: Number(payload.cost || 0),
    };

    if (id) {
      await updateDoc(
        doc(db, `${basePath}/cars/${carId}/services`, id),
        prepared
      );
      return { type: "update" };
    }

    await addDoc(collection(db, `${basePath}/cars/${carId}/services`), {
      ...prepared,
      createdAt: new Date(),
    });
    return { type: "create" };
  }

  async function deleteService(db, basePath, carId, serviceId) {
    if (!db || !basePath || !carId || !serviceId) return;
    const { deleteDoc, doc } = getFirebase();
    await deleteDoc(doc(db, `${basePath}/cars/${carId}/services`, serviceId));
  }

  // ---------- PENDÊNCIAS ----------
  async function savePendency(
    db,
    basePath,
    carId,
    companyId,
    drivers,
    pendencyData
  ) {
    if (!db || !basePath || !carId) return { type: "noop" };
    const { addDoc, updateDoc, collection, doc } = getFirebase();

    const { id, ...rest } = pendencyData;
    const driver = drivers?.find((d) => d.id === rest.driverId) || {};
    const payload = {
      ...rest,
      amount: Number(rest.amount || 0),
      driverName: rest.driverName || driver.name || "",
      companyId,
    };

    if (id) {
      await updateDoc(
        doc(db, `${basePath}/cars/${carId}/pendings`, id),
        payload
      );
      return { type: "update" };
    }

    await addDoc(collection(db, `${basePath}/cars/${carId}/pendings`), {
      ...payload,
      createdAt: new Date(),
      status: payload.status || "open",
    });
    return { type: "create" };
  }

  async function deletePendency(db, basePath, carId, pendencyId) {
    if (!db || !basePath || !carId || !pendencyId) return;
    const { deleteDoc, doc } = getFirebase();
    await deleteDoc(doc(db, `${basePath}/cars/${carId}/pendings`, pendencyId));
  }

  async function changePendencyStatus(
    db,
    basePath,
    carId,
    pendencyId,
    newStatus
  ) {
    if (!db || !basePath || !carId || !pendencyId) return;
    const { updateDoc, doc } = getFirebase();
    await updateDoc(doc(db, `${basePath}/cars/${carId}/pendings`, pendencyId), {
      status: newStatus,
      updatedAt: new Date(),
    });
  }

  // ---------- CHECKLISTS ----------
  async function deleteChecklistWithPhotos(
    db,
    basePath,
    carId,
    checklist,
    storage
  ) {
    if (!db || !basePath || !carId || !checklist) return;
    const { deleteObject, ref, deleteDoc, doc } = getFirebase();

    const { photoURL, damages } = checklist;

    // Remove fotos (se storage estiver disponível e URLs existirem)
    if (storage && (photoURL || (damages && damages.length))) {
      try {
        if (photoURL) {
          await deleteObject(ref(storage, photoURL));
        }
        if (Array.isArray(damages)) {
          for (const dmg of damages) {
            if (dmg.photoURL) {
              await deleteObject(ref(storage, dmg.photoURL));
            }
          }
        }
      } catch (e) {
        console.warn("Falha ao apagar alguma foto da vistoria:", e);
      }
    }

    await deleteDoc(
      doc(db, `${basePath}/cars/${carId}/checklists`, checklist.id)
    );
  }

  // ---------- CARRO COMPLETO ----------
  async function deleteCarCascade(db, basePath, carId) {
    if (!db || !basePath || !carId) return;
    const { collection, getDocs, deleteDoc, doc } = getFirebase();

    const carRef = doc(db, `${basePath}/cars`, carId);
    const subcollections = [
      "expenses",
      "revenues",
      "reminders",
      "checklists",
      "services",
      "pendings",
    ];

    for (const sub of subcollections) {
      const colRef = collection(db, `${basePath}/cars/${carId}/${sub}`);
      const snap = await getDocs(colRef);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }
    }

    await deleteDoc(carRef);
  }

  // Disponível globalmente
  window.carService = {
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
  };
})();

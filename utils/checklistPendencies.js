;(function () {
  // src/utils/checklistPendencies.js
  // Helper exposto no escopo global para evitar imports.

  /**
   * Cria pendências para os danos de uma vistoria.
   * - Cada dano gera uma pendência, usando o campo amount = estimatedCost / cost.
   * - Usa "damageKey" (checklistId + índice do dano) para evitar duplicações.
   */
  async function syncChecklistDamagesToPendencies({
    db,
    basePath,
    companyId,
    carId,
    driver,     // { id, name } ou null
    checklist,  // { id, type, date, damages: [] }
  }) {
    const {
      collection,
      addDoc,
      getDocs,
      query,
      where,
    } = window.firebase || {};

    if (!db || !basePath || !carId || !checklist) return;

    const damages = Array.isArray(checklist.damages) ? checklist.damages : [];
    if (!damages.length) return;

    const pendingsCol = collection(db, `${basePath}/cars/${carId}/pendings`);

    // Busca pendências já criadas para este checklist (para não duplicar)
    const existingSnap = await getDocs(
      query(pendingsCol, where("checklistId", "==", checklist.id || null))
    );

    const existingDamageKeys = new Set(
      existingSnap.docs.map((d) => d.data().damageKey).filter(Boolean)
    );

    const dateStr =
      checklist.date && checklist.date.toDate
        ? checklist.date.toDate().toISOString().slice(0, 10)
        : checklist.date || new Date().toISOString().slice(0, 10);

    for (let index = 0; index < damages.length; index++) {
      const dmg = damages[index];
      const amount = Number(dmg.estimatedCost || dmg.cost || 0) || 0;

      // Só gera pendência se houver valor associado ao dano
      if (!amount) continue;

      const damageKey = `${checklist.id || "noid"}-${index}`;
      if (existingDamageKeys.has(damageKey)) {
        // Já existe pendência para este dano — evitar duplicação
        continue;
      }

      const descriptionBase =
        dmg.description ||
        `Dano registrado em vistoria (${checklist.type || "vistoria"})`;

      const pendDoc = {
        description: descriptionBase,
        amount,
        status: "open",
        date: dateStr,
        createdAt: new Date(),
        driverId: driver?.id || null,
        driverName: driver?.name || "",
        carId,
        companyId,
        checklistId: checklist.id || null,
        damageKey, // usado para anti-clone
      };

      await addDoc(pendingsCol, pendDoc);
    }
  }

  window.syncChecklistDamagesToPendencies = syncChecklistDamagesToPendencies;
})();

;(function () {
  const { useState } = React;

  const requireFirebaseFn = (name) => {
    const api = window.firebase || {};
    if (typeof api[name] !== "function") {
      throw new Error("Firebase não inicializado");
    }
    return api[name];
  };
  const collection = (...args) => requireFirebaseFn("collection")(...args);
  const getDocs = (...args) => requireFirebaseFn("getDocs")(...args);
  const addDoc = (...args) => requireFirebaseFn("addDoc")(...args);
  const doc = (...args) => requireFirebaseFn("doc")(...args);
  const setDoc = (...args) => requireFirebaseFn("setDoc")(...args);
  const updateDoc = (...args) => requireFirebaseFn("updateDoc")(...args);
  const query = (...args) => requireFirebaseFn("query")(...args);
  const where = (...args) => requireFirebaseFn("where")(...args);

  // Helper genérico para CSV (linhas -> objetos)
  const parseCsv = (text) => {
    const lines = String(text)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const header = lines[0]
      .split(",")
      .map((h) => h.replace(/^"|"$/g, "").trim());

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",");
      const obj = {};
      header.forEach((h, i) => {
        obj[h] = (cols[i] ?? "").replace(/^"|"$/g, "").trim();
      });
      return obj;
    });

    return rows;
  };

  // ------------------------------------------------------
  // 1) Importar CARROS com anti-clone (legacyId + placa)
  // ------------------------------------------------------
  async function importCarsFromFile(file, db, basePath, showAlert) {
    const carsCollectionRef = collection(db, `${basePath}/cars`);

    // Buscar carros já existentes
    const existingSnap = await getDocs(carsCollectionRef);
    const existingLegacyIds = new Set();
    const existingPlates = new Set();

    existingSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.legacyId != null) {
        existingLegacyIds.add(String(data.legacyId));
      }
      if (data.plate) {
        const normalized = String(data.plate).toUpperCase().replace(/\s+/g, "");
        existingPlates.add(normalized);
      }
    });

    const text = await file.text();
    const lines = String(text)
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      showAlert("CSV de carros vazio ou inválido.", "error");
      return { imported: 0, skippedExisting: 0 };
    }

    const headerLine = lines[0];
    const headers = headerLine
      .split(",")
      .map((h) => h.replace(/^"|"$/g, "").trim());

    const indexOf = (name) => headers.indexOf(name);

    const idxId = indexOf("id");
    const idxName = indexOf("name");
    const idxPlate = indexOf("plate");
    const idxOdometer = indexOf("odometer");
    const idxYear = indexOf("year");
    const idxColor = indexOf("color");
    const idxGroup = indexOf("jhi_group");
    const idxActive = indexOf("active");
    const idxUserId = indexOf("user_id");
    const idxInitialValue = indexOf("initial_value");
    const idxAdminFee = indexOf("administration_fee");
    // ⚠ Cabeçalhos de CSV devem ficar exatamente como vêm do arquivo
    const idxOwnerName = indexOf("ownerName");
    const idxOwner = indexOf("owner");
    const idxProprietario = indexOf("proprietario");
    const idxProprietarioAcc = indexOf("proprietÃ¡rio");

    if (idxName === -1 || idxPlate === -1 || idxOdometer === -1) {
      showAlert(
        'Cabeçalho do CSV de carros inválido. Certifique-se de que existam as colunas "name", "plate" e "odometer".',
        "error"
      );
      return { imported: 0, skippedExisting: 0 };
    }

    const getValue = (cols, idx) => {
      if (idx === -1) return "";
      const raw = cols[idx] ?? "";
      return String(raw).replace(/^"|"$/g, "").trim();
    };

    let importedCount = 0;
    let skippedExisting = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",");

      const name = getValue(cols, idxName);
      const plate = getValue(cols, idxPlate);
      const odometerStr = getValue(cols, idxOdometer);

      if (!name || !plate) continue;

      const yearStr = getValue(cols, idxYear);
      const color = getValue(cols, idxColor);
      const group = getValue(cols, idxGroup);
      const activeStr = getValue(cols, idxActive);
      const userId = getValue(cols, idxUserId);
      const initialValueStr = getValue(cols, idxInitialValue);
      const adminFeeStr = getValue(cols, idxAdminFee);
      const legacyIdStr = getValue(cols, idxId);

      // Tenta achar o proprietário em qualquer uma dessas colunas
      const ownerName =
        (idxOwnerName !== -1 ? getValue(cols, idxOwnerName) : "") ||
        (idxOwner !== -1 ? getValue(cols, idxOwner) : "") ||
        (idxProprietario !== -1 ? getValue(cols, idxProprietario) : "") ||
        (idxProprietarioAcc !== -1 ? getValue(cols, idxProprietarioAcc) : "");

      const legacyId = legacyIdStr ? Number(legacyIdStr) : null;
      const normalizedPlate = plate.toUpperCase().replace(/\s+/g, "");

      // ANTI-CLONE
      if (legacyId != null && existingLegacyIds.has(String(legacyId))) {
        skippedExisting += 1;
        continue;
      }
      if (
        (legacyId == null || isNaN(legacyId)) &&
        normalizedPlate &&
        existingPlates.has(normalizedPlate)
      ) {
        skippedExisting += 1;
        continue;
      }

      const currentMileage = Number(odometerStr.replace(",", ".")) || 0;
      const year = yearStr ? Number(yearStr) : null;
      const initialValue = initialValueStr
        ? Number(initialValueStr.replace(",", "."))
        : null;
      const administrationFee = adminFeeStr
        ? Number(adminFeeStr.replace(",", "."))
        : null;

      const active =
        activeStr === "1" ||
        activeStr.toLowerCase?.() === "true" ||
        activeStr.toLowerCase?.() === "ativo";

      const newCar = {
        name,
        plate,
        currentMileage,
        year,
        color,
        group,
        active,
        externalUserId: userId,
        initialValue,
        administrationFee,
        legacyId,
        ownerName: ownerName || "",
        lastOilChange: 0,
        oilChangeInterval: 0,
        avgConsumption: 0,
        assignedDriverId: "",
        createdAt: new Date(),
      };

      try {
        await addDoc(carsCollectionRef, newCar);
        importedCount += 1;

        if (legacyId != null) {
          existingLegacyIds.add(String(legacyId));
        }
        if (normalizedPlate) {
          existingPlates.add(normalizedPlate);
        }
      } catch (err) {
        console.error("Erro ao importar linha do CSV de carros:", err);
      }
    }

    return { imported: importedCount, skippedExisting };
  }

  // ------------------------------------------------------
  // 2) Importar MANUTENÇÕES (maintenance + service)
  // ------------------------------------------------------
  async function importMaintenanceFromFiles(
    maintenanceFile,
    serviceFile,
    db,
    basePath,
    companyId,
    showAlert
  ) {
    const [maintenanceText, serviceText] = await Promise.all([
      maintenanceFile.text(),
      serviceFile.text(),
    ]);

    const maintenanceRows = parseCsv(maintenanceText);
    const serviceRows = parseCsv(serviceText);

    if (!maintenanceRows.length) {
      showAlert('Arquivo de "maintenance" está vazio ou inválido.', "error");
      return { imported: 0, skippedExisting: 0, skippedNoCar: 0 };
    }

    // agrupar serviços por maintenance_id
    const servicesByMaintenanceId = {};
    for (const s of serviceRows) {
      const mid = s.maintenance_id || s.maintenanceId || s.maintenanceid;
      if (!mid) continue;
      if (!servicesByMaintenanceId[mid]) servicesByMaintenanceId[mid] = [];
      servicesByMaintenanceId[mid].push(s);
    }

    // mapa legacyId -> carDocId
    const carsSnap = await getDocs(collection(db, `${basePath}/cars`));
    const legacyMap = {};
    carsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.legacyId != null) {
        legacyMap[String(data.legacyId)] = docSnap.id;
      }
    });

    if (Object.keys(legacyMap).length === 0) {
      showAlert(
        'Nenhum carro com campo "legacyId" encontrado. Importe/ajuste os veículos com legacyId antes de importar manutenções.',
        "error"
      );
      return { imported: 0, skippedExisting: 0, skippedNoCar: 0 };
    }

    // ler catálogo de serviços existentes
    const maintenanceItemsRef = collection(db, `${basePath}/maintenanceItems`);
    const itemsSnap = await getDocs(maintenanceItemsRef);
    const existingServiceNames = new Set(); // nomes em minúsculo

    itemsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const typeNorm = String(d.type || "")
        .normalize("NFD")
        .replace(/[^\w\s]/g, "")
        .toLowerCase();
      const isService =
        typeNorm.startsWith("servico") ||
        typeNorm.startsWith("serviço") ||
        typeNorm.startsWith("mao de obra") ||
        typeNorm.startsWith("mão de obra");

      if (isService && d.name) {
        existingServiceNames.add(String(d.name).toLowerCase());
      }
    });

    // Buffer para novos serviços do catálogo
    const newServiceTemplates = {}; // chave = nome minúsculo

    // ANTI-CLONE de manutenções: `${legacyCarId}-${legacyMaintenanceId}` já existentes
    const existingKeys = new Set();

    for (const [legacyCarIdStr, carDocId] of Object.entries(legacyMap)) {
      const expensesSnap = await getDocs(
        collection(db, `${basePath}/cars/${carDocId}/expenses`)
      );
      expensesSnap.forEach((expDoc) => {
        const d = expDoc.data();
        if (d.legacyCarId != null && d.legacyMaintenanceId != null) {
          const key = `${Number(d.legacyCarId)}-${Number(
            d.legacyMaintenanceId
          )}`;
          existingKeys.add(key);
        }
      });
    }

    let importedCount = 0;
    let skippedNoCar = 0;
    let skippedExisting = 0;

    for (const m of maintenanceRows) {
      const carLegacyId = m.car_id || m.carId;
      const carDocId = legacyMap[String(carLegacyId)];

      if (!carDocId) {
        skippedNoCar += 1;
        continue;
      }

      const maintenanceId = m.id;
      const legacyCarNum = carLegacyId ? Number(carLegacyId) : null;
      const legacyMaintNum = maintenanceId ? Number(maintenanceId) : null;
      const key = `${legacyCarNum}-${legacyMaintNum}`;

      if (
        legacyCarNum != null &&
        legacyMaintNum != null &&
        existingKeys.has(key)
      ) {
        skippedExisting += 1;
        continue;
      }

      const services = servicesByMaintenanceId[String(maintenanceId)] || [];

      const dateStr = m.date || "";
      const local = m.local || "";
      const odometerStr = m.odometer || "";
      const totalCostStr = m.cost || "";

      // Monta itens de serviço (para a despesa do carro)
      const parsedServices = services.map((s) => {
        const name = s.name || "";
        const costNumber = s.cost
          ? Number(String(s.cost).replace(",", ".")) || 0
          : 0;

        // preparar serviço para catálogo automático
        const keyName = name.toLowerCase();
        if (
          name &&
          !existingServiceNames.has(keyName) &&
          !newServiceTemplates[keyName]
        ) {
          newServiceTemplates[keyName] = {
            name,
            type: "Serviço", // serviço no catálogo
            price: costNumber || 0,
            stock: 0,
            companyId,
            createdAt: new Date(),
          };
        }

        return {
          id: null,
          name,
          price: costNumber,
          quantity: 1,
          type: "Serviço",
        };
      });

      const descriptionFromServices = parsedServices
        .map((item) => `${item.quantity || 1}x ${item.name}`)
        .join(", ");

      const description =
        descriptionFromServices ||
        (local ? `Manutenção em ${local}` : "Manutenção");

      const costFromServices = parsedServices.reduce(
        (sum, item) =>
          sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );

      const totalCostRaw = totalCostStr
        ? Number(String(totalCostStr).replace(",", ".")) || 0
        : 0;

      const finalCost = totalCostRaw || costFromServices;

      const expenseDoc = {
        date: dateStr || new Date().toISOString().slice(0, 10),
        description,
        cost: finalCost,
        category: "Manutenção",
        items: parsedServices,
        itemIds: [],
        workshopId: "",
        workshopName: local || "",
        companyId,
        legacyMaintenanceId: legacyMaintNum,
        legacyCarId: legacyCarNum,
        odometer: odometerStr ? Number(odometerStr) || null : null,
      };

      try {
        await addDoc(
          collection(db, `${basePath}/cars/${carDocId}/expenses`),
          expenseDoc
        );
        importedCount += 1;
        if (legacyCarNum != null && legacyMaintNum != null) {
          existingKeys.add(key);
        }
      } catch (err) {
        console.error("Erro ao salvar manutenção importada:", err);
      }
    }

    // gravar catálogo de serviços automaticamente
    const newServicesArray = Object.values(newServiceTemplates);
    for (const svc of newServicesArray) {
      try {
        await addDoc(maintenanceItemsRef, svc);
      } catch (err) {
        console.error(
          "Erro ao criar serviço automático em maintenanceItems:",
          err
        );
      }
    }

    if (newServicesArray.length > 0) {
      showAlert(
        `Catálogo: ${newServicesArray.length} serviço(s) foram criados automaticamente em maintenanceItems.`,
        "success"
      );
    }

    return { imported: importedCount, skippedExisting, skippedNoCar };
  }

  // ------------------------------------------------------
  // 3) FINANCEIRO (income + car_expense)
  // ------------------------------------------------------

  // helper específico p/ CSV financeiro
  const parseFinancialCsv = async (file) => {
    if (!file) return [];

    const text = await file.text();

    const lines = String(text)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== "...");

    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const headers = headerLine
      .split(",")
      .map((h) => h.replace(/^"|"$/g, "").trim());

    const indexOf = (name) => headers.indexOf(name);

    const idxId = indexOf("id");
    const idxDate = indexOf("date");
    const idxName = indexOf("name");
    const idxCost = indexOf("cost");
    const idxCarId = indexOf("car_id");

    if (
      idxDate === -1 ||
      idxName === -1 ||
      idxCost === -1 ||
      idxCarId === -1
    ) {
      throw new Error(
        'CSV financeiro inválido: precisa ter "date", "name", "cost", "car_id".'
      );
    }

    const getValue = (cols, idx) => {
      if (idx === -1) return "";
      const raw = cols[idx] ?? "";
      return String(raw).replace(/^"|"$/g, "").trim();
    };

    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = line.split(",");
      if (cols.length < headers.length) continue;

      const id = getValue(cols, idxId);
      const date = getValue(cols, idxDate);
      const name = getValue(cols, idxName);
      const costRaw = getValue(cols, idxCost);
      const carIdRaw = getValue(cols, idxCarId);

      if (!date || !name || !carIdRaw) continue;

      const cost = Number(costRaw.replace(",", ".")) || 0;
      const carLegacyId = Number(carIdRaw) || null;

      rows.push({
        legacyRowId: id ? Number(id) : null,
        date,
        name,
        cost,
        carLegacyId,
      });
    }

    return rows;
  };

  // função chamada pelo "Importar Tudo" para financeiro
  async function importFinancialFromCsvs({ db, basePath, incomeFile, expenseFile }) {
    if (!incomeFile && !expenseFile) {
      return { importedIncomes: 0, importedExpenses: 0 };
    }

    // mapa de carros: legacyId -> { id, name, plate }
    const carsSnap = await getDocs(collection(db, `${basePath}/cars`));
    const carByLegacyId = new Map();

    carsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.legacyId != null) {
        carByLegacyId.set(Number(data.legacyId), {
          id: docSnap.id,
          name: data.name,
          plate: data.plate,
        });
      }
    });

    let importedIncomes = 0;
    let importedExpenses = 0;

    // RECEITAS
    if (incomeFile) {
      const incomeRows = await parseFinancialCsv(incomeFile);
      for (const row of incomeRows) {
        const carInfo = carByLegacyId.get(row.carLegacyId);
        if (!carInfo) continue;

        const revenueDoc = {
          date: row.date,
          description: row.name,
          value: row.cost,
          legacyIncomeId: row.legacyRowId,
          importSource: "income_csv",
          createdAt: new Date(),
        };

        await addDoc(
          collection(db, `${basePath}/cars/${carInfo.id}/revenues`),
          revenueDoc
        );
        importedIncomes += 1;
      }
    }

    // DESPESAS
    if (expenseFile) {
      const expenseRows = await parseFinancialCsv(expenseFile);
      for (const row of expenseRows) {
        const carInfo = carByLegacyId.get(row.carLegacyId);
        if (!carInfo) continue;

        const expenseDoc = {
          date: row.date,
          description: row.name,
          cost: row.cost,
          category: "Despesa importada",
          items: [],
          itemIds: [],
          legacyCarExpenseId: row.legacyRowId,
          importSource: "car_expense_csv",
          createdAt: new Date(),
        };

        await addDoc(
          collection(db, `${basePath}/cars/${carInfo.id}/expenses`),
          expenseDoc
        );
        importedExpenses += 1;
      }
    }

    return { importedIncomes, importedExpenses };
  }

  // ------------------------------------------------------
  // 4) Importar MOTORISTAS + ENDEREÇOS
  //    driver_*.csv + address_*.csv
  // ------------------------------------------------------
  async function importDriversAndAddresses({
    db,
    basePath,
    companyId,
    driverFile,
    addressFile,
    showAlert,
  }) {
    if (!driverFile) {
      showAlert("Selecione ao menos o CSV de motoristas.", "warning");
      return { importedDrivers: 0, skippedExistingDrivers: 0 };
    }

    const [driverText, addressText] = await Promise.all([
      driverFile.text(),
      addressFile ? addressFile.text() : Promise.resolve(""),
    ]);

    const driverRows = parseCsv(driverText);
    const addressRows = addressText ? parseCsv(addressText) : [];

    // mapa address_id -> endereço
    const addressMap = {};
    for (const addr of addressRows) {
      if (!addr.id) continue;
      addressMap[String(addr.id)] = addr;
    }

    // mapa de motoristas já existentes (anti-clone)
    const driversSnap = await getDocs(collection(db, `${basePath}/drivers`));
    const existingLegacyDriverIds = new Set();
    const existingCpfs = new Set();

    driversSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.legacyDriverId != null) {
        existingLegacyDriverIds.add(String(d.legacyDriverId));
      }
      if (d.cpf) {
        const cleaned = String(d.cpf).replace(/\D/g, "");
        if (cleaned) existingCpfs.add(cleaned);
      }
    });

    let importedDrivers = 0;
    let skippedExistingDrivers = 0;

    for (const row of driverRows) {
      const legacyId = row.id ? String(row.id) : null;
      const rawCpf = (row.cpf || "").replace(/\D/g, "");
      const name = (row.name || "").trim();

      if (!legacyId && !rawCpf && !name) continue;

      // anti-clone: mesmo legacyDriverId OU mesmo CPF
      if (legacyId && existingLegacyDriverIds.has(legacyId)) {
        skippedExistingDrivers += 1;
        continue;
      }
      if (rawCpf && existingCpfs.has(rawCpf)) {
        skippedExistingDrivers += 1;
        continue;
      }

      const addr = row.address_id ? addressMap[String(row.address_id)] : null;

      const driverDoc = {
        name,
        cpf: rawCpf || "",
        email: row.email || "",
        phone: row.contact || "",
        emergencyContact: row.emergency_contact || "",
        emergencyContactSecond: row.emergency_contact_second || "",
        rating:
          row.public_score && !isNaN(Number(row.public_score))
            ? Number(row.public_score)
            : 3,
        legacyDriverId: legacyId ? Number(legacyId) : null,
        companyId,
        createdAt: new Date(),
      };

      if (addr) {
        driverDoc.address = {
          country: addr.country || "",
          zip: addr.zip || "",
          state: addr.state || "",
          city: addr.city || "",
          district: addr.district || "",
          street: addr.name || "",
        };
        driverDoc.addressLegacyId = Number(addr.id);
      }

      try {
        await addDoc(collection(db, `${basePath}/drivers`), driverDoc);
        importedDrivers += 1;

        if (legacyId) existingLegacyDriverIds.add(legacyId);
        if (rawCpf) existingCpfs.add(rawCpf);
      } catch (err) {
        console.error("Erro ao importar motorista:", err);
      }
    }

    showAlert(
      `Motoristas: ${importedDrivers} importados, ${skippedExistingDrivers} ignorados (anti-clone por CPF/ID).`,
      "success"
    );

    return { importedDrivers, skippedExistingDrivers };
  }

  // ------------------------------------------------------
  // 5) Importar DRIVER_CAR + PENDÊNCIAS
  //    driver_car_*.csv + pendency_*.csv
  // ------------------------------------------------------
  async function importDriverCarAndPendencies({
    db,
    basePath,
    companyId,
    driverCarFile,
    pendencyFile,
    showAlert,
  }) {
    if (!driverCarFile && !pendencyFile) {
      return {
        importedPendencies: 0,
        skippedPendNoLink: 0,
        skippedExistingPend: 0,
      };
    }

    const [driverCarText, pendText] = await Promise.all([
      driverCarFile ? driverCarFile.text() : Promise.resolve(""),
      pendencyFile ? pendencyFile.text() : Promise.resolve(""),
    ]);

    const driverCarRows = driverCarText ? parseCsv(driverCarText) : [];
    const pendRows = pendText ? parseCsv(pendText) : [];

    if (!driverCarRows.length || !pendRows.length) {
      showAlert(
        "Arquivos de driver_car e/ou pendency estão vazios ou inválidos.",
        "warning"
      );
      return {
        importedPendencies: 0,
        skippedPendNoLink: 0,
        skippedExistingPend: 0,
      };
    }

    // mapa de carros: legacyId -> {id, name}
    const carsSnap = await getDocs(collection(db, `${basePath}/cars`));
    const carByLegacyId = new Map();

    carsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.legacyId != null) {
        carByLegacyId.set(Number(data.legacyId), {
          id: docSnap.id,
          name: data.name,
          plate: data.plate,
        });
      }
    });

    // mapa de drivers: legacyDriverId -> {id, name}
    const driversSnap = await getDocs(collection(db, `${basePath}/drivers`));
    const driverByLegacyId = new Map();

    driversSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.legacyDriverId != null) {
        driverByLegacyId.set(Number(d.legacyDriverId), {
          id: docSnap.id,
          name: d.name,
          cpf: d.cpf,
        });
      }
    });

    // mapa driver_car_id -> (carId, driverId, driverName)
    const driverCarMap = {};
    for (const dc of driverCarRows) {
      if (!dc.id) continue;
      const driverCarId = Number(dc.id);
      const legacyCarId = dc.car_id ? Number(dc.car_id) : null;
      const legacyDriverId = dc.driver_id ? Number(dc.driver_id) : null;

      if (!legacyCarId || !legacyDriverId) continue;

      const carInfo = carByLegacyId.get(legacyCarId);
      const driverInfo = driverByLegacyId.get(legacyDriverId);

      if (!carInfo || !driverInfo) continue;

      driverCarMap[driverCarId] = {
        carId: carInfo.id,
        driverId: driverInfo.id,
        driverName: driverInfo.name,
      };
    }

    // mapa de pendências já existentes (anti-clone por legacyPendencyId)
    const existingPendencyIds = new Set();

    for (const [legacyCarId, carInfo] of carByLegacyId.entries()) {
      const pendSnap = await getDocs(
        collection(db, `${basePath}/cars/${carInfo.id}/pendings`)
      );
      pendSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.legacyPendencyId != null) {
          existingPendencyIds.add(Number(d.legacyPendencyId));
        }
      });
    }

    let importedPendencies = 0;
    let skippedPendNoLink = 0;
    let skippedExistingPend = 0;

    for (const row of pendRows) {
      const legacyPendId = row.id ? Number(row.id) : null;
      if (legacyPendId != null && existingPendencyIds.has(legacyPendId)) {
        skippedExistingPend += 1;
        continue;
      }

      const driverCarId = row.driver_car_id ? Number(row.driver_car_id) : null;
      if (!driverCarId || !driverCarMap[driverCarId]) {
        skippedPendNoLink += 1;
        continue;
      }

      const link = driverCarMap[driverCarId];

      const amount = row.cost
        ? Number(String(row.cost).replace(",", ".")) || 0
        : 0;

      const dateStr =
        row.date && row.date.trim()
          ? row.date
          : new Date().toISOString().slice(0, 10);

      const pendDoc = {
        description: row.name || "",
        amount,
        status: "open",
        date: dateStr,
        createdAt: new Date(),
        driverId: link.driverId,
        driverName: link.driverName,
        carId: link.carId,
        companyId,
        legacyPendencyId: legacyPendId,
        legacyDriverCarId: driverCarId,
      };

      try {
        await addDoc(
          collection(db, `${basePath}/cars/${link.carId}/pendings`),
          pendDoc
        );
        importedPendencies += 1;
        if (legacyPendId != null) existingPendencyIds.add(legacyPendId);
      } catch (err) {
        console.error("Erro ao salvar pendência importada:", err);
      }
    }

    showAlert(
      `Pendências: ${importedPendencies} importadas, ${skippedExistingPend} ignoradas (anti-clone), ${skippedPendNoLink} sem vínculo driver_car/car/motorista.`,
      "success"
    );

    return { importedPendencies, skippedPendNoLink, skippedExistingPend };
  }

  // ------------------------------------------------------
  // Componente de modal
  // ------------------------------------------------------
  const ImportDataModal = ({
    isOpen,
    onClose,
    db,
    basePath,
    companyId,
    showAlert,
  }) => {
    const [carFile, setCarFile] = useState(null);
    const [maintenanceFile, setMaintenanceFile] = useState(null);
    const [serviceFile, setServiceFile] = useState(null);

    // FINANCEIRO
    const [incomeFile, setIncomeFile] = useState(null);
    const [expenseFile, setExpenseFile] = useState(null);

    // Motoristas/Endereços/Pendências
    const [driverFile, setDriverFile] = useState(null);
    const [addressFile, setAddressFile] = useState(null);
    const [driverCarFile, setDriverCarFile] = useState(null);
    const [pendencyFile, setPendencyFile] = useState(null);

    const [isImporting, setIsImporting] = useState(false);

    if (!isOpen) return null;

    const handleImportAll = async () => {
      if (!db) {
        showAlert("Banco de dados não inicializado.", "error");
        return;
      }

      // Permite importar qualquer combinação:
      const nothingSelected =
        !carFile &&
        !(maintenanceFile && serviceFile) &&
        !incomeFile &&
        !expenseFile &&
        !driverFile &&
        !addressFile &&
        !driverCarFile &&
        !pendencyFile;

      if (nothingSelected) {
        showAlert(
          "Selecione pelo menos algum arquivo: Carros, Manutenções+Serviços, Financeiro ou Motoristas/Endereços/Pendências.",
          "warning"
        );
        return;
      }

      setIsImporting(true);

      try {
        let msgParts = [];

        // 1) Importar carros
        if (carFile) {
          const resCars = await importCarsFromFile(
            carFile,
            db,
            basePath,
            showAlert
          );
          msgParts.push(
            `Carros: ${resCars.imported} adicionados, ${resCars.skippedExisting} ignorados (anti-clone).`
          );
        }

        // 2) Importar manutenções
        if (maintenanceFile && serviceFile) {
          const resMaint = await importMaintenanceFromFiles(
            maintenanceFile,
            serviceFile,
            db,
            basePath,
            companyId,
            showAlert
          );
          msgParts.push(
            `Manutenções: ${resMaint.imported} adicionadas, ${resMaint.skippedExisting} ignoradas (anti-clone), ${resMaint.skippedNoCar} sem carro correspondente.`
          );
        }

        // 3) Importar financeiro (income + car_expense)
        if (incomeFile || expenseFile) {
          const resFin = await importFinancialFromCsvs({
            db,
            basePath,
            incomeFile,
            expenseFile,
          });

          msgParts.push(
            `Financeiro: ${resFin.importedIncomes} receita(s) e ${resFin.importedExpenses} despesa(s) importadas.`
          );
        }

        // 4) Motoristas + Endereços
        if (driverFile || addressFile) {
          const resDrivers = await importDriversAndAddresses({
            db,
            basePath,
            companyId,
            driverFile,
            addressFile,
            showAlert,
          });
          msgParts.push(
            `Motoristas: ${resDrivers.importedDrivers} importados, ${resDrivers.skippedExistingDrivers} ignorados.`
          );
        }

        // 5) Driver_Car + Pendências
        if (driverCarFile || pendencyFile) {
          const resPend = await importDriverCarAndPendencies({
            db,
            basePath,
            companyId,
            driverCarFile,
            pendencyFile,
            showAlert,
          });
          msgParts.push(
            `Pendências: ${resPend.importedPendencies} importadas, ${resPend.skippedExistingPend} duplicadas ignoradas, ${resPend.skippedPendNoLink} sem vínculo.`
          );
        }

        if (msgParts.length === 0) {
          showAlert(
            "Nenhum arquivo processado. Selecione os arquivos de Carros, Manutenções+Serviços, Financeiro ou Motoristas/Pendências.",
            "warning"
          );
        } else {
          showAlert(msgParts.join(" "), "success");
          onClose();
        }
      } catch (err) {
        console.error("Erro ao importar dados:", err);
        showAlert(
          "Erro ao importar dados. Veja o console para detalhes.",
          "error"
        );
      } finally {
        setIsImporting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Importar Dados (CSV)
            </h2>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
              disabled={isImporting}
            >
              <i className="fas fa-times" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Use os arquivos exportados da base antiga (carros, manutenções,
            financeiro, motoristas e pendências). O sistema possui anti-clone para
            evitar registros duplicados e já vincula carro ↔ motorista ↔ pendências.
          </p>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Bloco Carros */}
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2">Carros</h3>
              <p className="text-xs text-gray-500 mb-2">
                Arquivo CSV exportado da base antiga (tabela de carros).
              </p>
              <div className="flex items-center gap-3">
                <label className="bg-green-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-green-700 cursor-pointer">
                  Importar Carros (CSV)
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) =>
                      setCarFile(e.target.files?.[0] || null)
                    }
                    disabled={isImporting}
                  />
                </label>
                <span className="text-xs text-gray-600 truncate">
                  {carFile
                    ? carFile.name
                    : "Nenhum arquivo selecionado"}
                </span>
              </div>
            </div>

            {/* Bloco Manutenções + Serviços */}
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2">
                Manutenções
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Arquivos CSV de <strong>maintenance</strong> e{" "}
                <strong>service</strong>. As manutenções serão vinculadas
                aos carros via <code>legacyId</code>.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="bg-yellow-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 cursor-pointer">
                    Importar Manutenção (CSV)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setMaintenanceFile(
                          e.target.files?.[0] || null
                        )
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {maintenanceFile
                      ? maintenanceFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="bg-yellow-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 cursor-pointer">
                    Importar Serviços (CSV)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setServiceFile(e.target.files?.[0] || null)
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {serviceFile
                      ? serviceFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
              </div>
            </div>

            {/* FINANCEIRO */}
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2">
                Financeiro (Receitas e Despesas)
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Arquivos CSV de <strong>income</strong> (receitas) e{" "}
                <strong>car_expense</strong> (despesas). Serão
                vinculados aos carros via <code>car_id</code> →{" "}
                <code>legacyId</code>.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="bg-purple-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-purple-700 cursor-pointer">
                    Importar Receitas (income_*.csv)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setIncomeFile(e.target.files?.[0] || null)
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {incomeFile
                      ? incomeFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="bg-purple-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-purple-700 cursor-pointer">
                    Importar Despesas (car_expense_*.csv)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setExpenseFile(
                          e.target.files?.[0] || null
                        )
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {expenseFile
                      ? expenseFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
              </div>
            </div>

            {/* Motoristas + Endereços */}
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2">
                Motoristas &amp; Endereços
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Use os arquivos <strong>driver_*.csv</strong> e
                (opcionalmente) <strong>address_*.csv</strong>. Os
                motoristas serão criados na coleção{" "}
                <code>drivers</code> com CPF, contatos e endereço,
                prontos para uso nos relatórios e telas de motorista.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="bg-blue-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-blue-700 cursor-pointer">
                    Importar Motoristas (driver_*.csv)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setDriverFile(e.target.files?.[0] || null)
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {driverFile
                      ? driverFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="bg-blue-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-blue-700 cursor-pointer">
                    Importar Endereços (address_*.csv)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setAddressFile(
                          e.target.files?.[0] || null
                        )
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {addressFile
                      ? addressFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
              </div>
            </div>

            {/* Driver_Car + Pendências */}
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2">
                Vínculos &amp; Pendências
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Use os arquivos <strong>driver_car_*.csv</strong> e{" "}
                <strong>pendency_*.csv</strong>. As pendências serão
                lançadas em <code>cars/&lt;carId&gt;/pendings</code>,
                já ligadas ao motorista e prontas para uso na aba de
                Pendências do veículo.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-red-700 cursor-pointer">
                    Importar Vínculos (driver_car_*.csv)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setDriverCarFile(
                          e.target.files?.[0] || null
                        )
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {driverCarFile
                      ? driverCarFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-red-700 cursor-pointer">
                    Importar Pendências (pendency_*.csv)
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setPendencyFile(
                          e.target.files?.[0] || null
                        )
                      }
                      disabled={isImporting}
                    />
                  </label>
                  <span className="text-xs text-gray-600 truncate">
                    {pendencyFile
                      ? pendencyFile.name
                      : "Nenhum arquivo selecionado"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="w-full sm:w-auto bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportAll}
              disabled={isImporting}
              className="w-full sm:w-auto bg-blue-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-800 disabled:opacity-60"
            >
              {isImporting ? "Importando..." : "Importar Tudo"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  window.ImportDataModal = ImportDataModal;
})();

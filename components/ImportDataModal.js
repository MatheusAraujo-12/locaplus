// Helper genérico para CSV
const parseCsv = (text) => {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const header = lines[0]
    .split(',')
    .map((h) => h.replace(/^"|"$/g, '').trim());

  const rows = lines.slice(1).map((line) => {
    const cols = line.split(',');
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = (cols[i] ?? '').replace(/^"|"$/g, '').trim();
    });
    return obj;
  });

  return rows;
};

// 1) Importar CARROS com anti-clone (legacyId + placa)
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
      const normalized = String(data.plate).toUpperCase().replace(/\s+/g, '');
      existingPlates.add(normalized);
    }
  });

  const text = await file.text();
  const lines = String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    showAlert('CSV de carros vazio ou inválido.', 'error');
    return { imported: 0, skippedExisting: 0 };
  }

  const headerLine = lines[0];
  const headers = headerLine
    .split(',')
    .map((h) => h.replace(/^"|"$/g, '').trim());

  const indexOf = (name) => headers.indexOf(name);

  const idxId = indexOf('id');
  const idxName = indexOf('name');
  const idxPlate = indexOf('plate');
  const idxOdometer = indexOf('odometer');
  const idxYear = indexOf('year');
  const idxColor = indexOf('color');
  const idxGroup = indexOf('jhi_group');
  const idxActive = indexOf('active');
  const idxUserId = indexOf('user_id');
  const idxInitialValue = indexOf('initial_value');
  const idxAdminFee = indexOf('administration_fee');

  if (idxName === -1 || idxPlate === -1 || idxOdometer === -1) {
    showAlert(
      'Cabeçalho do CSV de carros inválido. Certifique-se de que existam as colunas "name", "plate" e "odometer".',
      'error',
    );
    return { imported: 0, skippedExisting: 0 };
  }

  const getValue = (cols, idx) => {
    if (idx === -1) return '';
    const raw = cols[idx] ?? '';
    return String(raw).replace(/^"|"$/g, '').trim();
  };

  let importedCount = 0;
  let skippedExisting = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');

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

    const legacyId = legacyIdStr ? Number(legacyIdStr) : null;
    const normalizedPlate = plate.toUpperCase().replace(/\s+/g, '');

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

    const currentMileage = Number(odometerStr.replace(',', '.')) || 0;
    const year = yearStr ? Number(yearStr) : null;
    const initialValue = initialValueStr
      ? Number(initialValueStr.replace(',', '.'))
      : null;
    const administrationFee = adminFeeStr
      ? Number(adminFeeStr.replace(',', '.'))
      : null;

    const active =
      activeStr === '1' ||
      activeStr.toLowerCase?.() === 'true' ||
      activeStr.toLowerCase?.() === 'ativo';

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
      lastOilChange: 0,
      oilChangeInterval: 0,
      avgConsumption: 0,
      assignedDriverId: '',
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
      console.error('Erro ao importar linha do CSV de carros:', err);
    }
  }

  return { imported: importedCount, skippedExisting };
}

// 2) Importar MANUTENÇÕES (maintenance + service) com anti-clone
async function importMaintenanceFromFiles(maintenanceFile, serviceFile, db, basePath, companyId, showAlert) {
  const [maintenanceText, serviceText] = await Promise.all([
    maintenanceFile.text(),
    serviceFile.text(),
  ]);

  const maintenanceRows = parseCsv(maintenanceText);
  const serviceRows = parseCsv(serviceText);

  if (!maintenanceRows.length) {
    showAlert('Arquivo de maintenance está vazio ou inválido.', 'error');
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
      'error'
    );
    return { imported: 0, skippedExisting: 0, skippedNoCar: 0 };
  }

  // ---------- NOVO: ler catálogo de serviços existentes ----------
  const maintenanceItemsRef = collection(db, `${basePath}/maintenanceItems`);
  const itemsSnap = await getDocs(maintenanceItemsRef);
  const existingServiceNames = new Set(); // nomes em minúsculo

  itemsSnap.forEach((docSnap) => {
    const d = docSnap.data();
    const typeNorm = String(d.type || '').normalize('NFD').replace(/[^\w\s]/g, '').toLowerCase();
    const isService =
      typeNorm.startsWith('servico') ||
      typeNorm.startsWith('serviço') ||
      typeNorm.startsWith('mao de obra') ||
      typeNorm.startsWith('mão de obra');

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
        const key = `${Number(d.legacyCarId)}-${Number(d.legacyMaintenanceId)}`;
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

    if (legacyCarNum != null && legacyMaintNum != null && existingKeys.has(key)) {
      skippedExisting += 1;
      continue;
    }

    const services = servicesByMaintenanceId[String(maintenanceId)] || [];

    const dateStr = m.date || '';
    const local = m.local || '';
    const odometerStr = m.odometer || '';
    const totalCostStr = m.cost || '';

    // Monta itens de serviço (para a despesa do carro)
    const parsedServices = services.map((s) => {
      const name = s.name || '';
      const costNumber = s.cost ? Number(String(s.cost).replace(',', '.')) || 0 : 0;

      // ---------- NOVO: preparar serviço para catálogo automático ----------
      const keyName = name.toLowerCase();
      if (name && !existingServiceNames.has(keyName) && !newServiceTemplates[keyName]) {
        newServiceTemplates[keyName] = {
          name,
          type: 'Serviço',        // <--- aqui já marcamos como serviço
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
        type: 'Serviço',
      };
    });

    const descriptionFromServices = parsedServices
      .map((item) => `${item.quantity || 1}x ${item.name}`)
      .join(', ');

    const description =
      descriptionFromServices ||
      (local ? `Manutenção em ${local}` : 'Manutenção');

    const costFromServices = parsedServices.reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );

    const totalCostRaw = totalCostStr
      ? Number(String(totalCostStr).replace(',', '.')) || 0
      : 0;

    const finalCost = totalCostRaw || costFromServices;

    const expenseDoc = {
      date: dateStr || new Date().toISOString().slice(0, 10),
      description,
      cost: finalCost,
      category: 'Manutenção',
      items: parsedServices,
      itemIds: [],
      workshopId: '',
      workshopName: local || '',
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
      console.error('Erro ao salvar manutenção importada:', err);
    }
  }

  // ---------- NOVO: gravar catálogo de serviços automaticamente ----------
  const newServicesArray = Object.values(newServiceTemplates);
  for (const svc of newServicesArray) {
    try {
      await addDoc(maintenanceItemsRef, svc);
    } catch (err) {
      console.error('Erro ao criar serviço automático em maintenanceItems:', err);
    }
  }

  if (newServicesArray.length > 0) {
    showAlert(
      `Catálogo: ${newServicesArray.length} serviço(s) foram criados automaticamente em maintenanceItems.`,
      'success'
    );
  }

  return { imported: importedCount, skippedExisting, skippedNoCar };
}

// Componente de modal
const ImportDataModal = ({ isOpen, onClose, db, basePath, companyId, showAlert }) => {
  const { useState } = React;
  const { collection, getDocs, addDoc } = window.firebase;
  const [carFile, setCarFile] = useState(null);
  const [maintenanceFile, setMaintenanceFile] = useState(null);
  const [serviceFile, setServiceFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleImportAll = async () => {
    if (!db) {
      showAlert('Banco de dados não inicializado.', 'error');
      return;
    }

    if (!carFile && !(maintenanceFile && serviceFile)) {
      showAlert(
        'Selecione pelo menos o CSV de Carros ou o par Manutenção + Serviços para importar.',
        'warning'
      );
      return;
    }

    setIsImporting(true);

    try {
      let msgParts = [];

      // 1) Importar carros (se arquivo selecionado)
      if (carFile) {
        const resCars = await importCarsFromFile(carFile, db, basePath, showAlert);
        msgParts.push(
          `Carros: ${resCars.imported} adicionados, ${resCars.skippedExisting} ignorados (anti-clone).`
        );
      }

      // 2) Importar manutenções (se arquivos selecionados)
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

      if (msgParts.length === 0) {
        showAlert(
          'Nenhum arquivo processado. Selecione os arquivos de Carros e/ou Manutenção + Serviços.',
          'warning'
        );
      } else {
        showAlert(msgParts.join(' '), 'success');
        onClose();
      }
    } catch (err) {
      console.error('Erro ao importar dados:', err);
      showAlert('Erro ao importar dados. Veja o console para detalhes.', 'error');
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
          1º importe os <strong>Carros</strong>. Em seguida, selecione os arquivos de
          <strong> Manutenção </strong> e <strong>Serviços</strong>. Ao final, clique em
          <strong> Importar Tudo</strong>. O sistema possui anti-clone para evitar
          registros duplicados.
        </p>

        <div className="space-y-4">
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
                  onChange={(e) => setCarFile(e.target.files?.[0] || null)}
                  disabled={isImporting}
                />
              </label>
              <span className="text-xs text-gray-600 truncate">
                {carFile ? carFile.name : 'Nenhum arquivo selecionado'}
              </span>
            </div>
          </div>

          {/* Bloco Manutenção + Services */}
          <div className="border rounded-lg p-3">
            <h3 className="font-semibold text-gray-800 mb-2">Manutenções</h3>
            <p className="text-xs text-gray-500 mb-3">
              Arquivos CSV de <strong>manutenção</strong> e <strong>serviços</strong>.
              As manutenções serão vinculadas aos carros importados via <code>legacyId</code>.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <label className="bg-yellow-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 cursor-pointer">
                  Importar Manutenção (CSV)
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setMaintenanceFile(e.target.files?.[0] || null)}
                    disabled={isImporting}
                  />
                </label>
                <span className="text-xs text-gray-600 truncate">
                  {maintenanceFile ? maintenanceFile.name : 'Nenhum arquivo selecionado'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="bg-yellow-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-yellow-700 cursor-pointer">
                  Importar Serviços (CSV)
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setServiceFile(e.target.files?.[0] || null)}
                    disabled={isImporting}
                  />
                </label>
                <span className="text-xs text-gray-600 truncate">
                  {serviceFile ? serviceFile.name : 'Nenhum arquivo selecionado'}
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
            {isImporting ? 'Importando...' : 'Importar Tudo'}
          </button>
        </div>
      </div>
    </div>
  );
};

window.ImportDataModal = ImportDataModal;


;(function () {
  const { useEffect, useState } = React;

  const RoutineChecklistModal = ({
    onClose,
    onSave,
    initialData = null,
    isViewMode = false,
  }) => {
    const defaultChecklist = {
      // Aparência
      exterior: "",
      interior: "",
      cleanliness: "",
      // Segurança (aprovado/reprovado)
      engine: "",
      lights: "",
      brakes: "",
      soundSystem: "",
      airConditioning: "",
      suspension: "",
      // Outros itens
      documents: "",
      fuelLevel: "",
      tireCondition: "",
    };

    const defaultTires = {
      frontLeft: { condition: "", brand: "", treadPercent: "" },
      frontRight: { condition: "", brand: "", treadPercent: "" },
      rearLeft: { condition: "", brand: "", treadPercent: "" },
      rearRight: { condition: "", brand: "", treadPercent: "" },
    };

    const [checklist, setChecklist] = useState(defaultChecklist);
    const [tires, setTires] = useState(defaultTires);
    const [notes, setNotes] = useState("");
    const [generalDamages, setGeneralDamages] = useState("");

    const [photoEvidence, setPhotoEvidence] = useState({
      file: null,
      preview: "",
      url: "",
    });

    const [damages, setDamages] = useState([]);
    const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
    const [damageDraft, setDamageDraft] = useState({
      id: null,
      location: "",
      description: "",
      estimatedCost: "",
      responsibleType: "driver",
      photoFile: null,
      photoPreview: "",
      photoURL: "",
    });

    const [tireBrands, setTireBrands] = useState([
      "Pirelli",
      "Michelin",
      "Goodyear",
      "Bridgestone",
    ]);
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [brandTargetTireKey, setBrandTargetTireKey] = useState(null);
    const [newBrandName, setNewBrandName] = useState("");

    // Novo: motivos de reprovação por item de segurança
    const [rejectionDetails, setRejectionDetails] = useState({});
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [currentRejectedField, setCurrentRejectedField] = useState(null);
    const [currentRejectionText, setCurrentRejectionText] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const isDisabled = isViewMode || isSaving;

    const APPEARANCE_ITEMS = [
      { key: "exterior", label: "Exterior" },
      { key: "interior", label: "Interior" },
      { key: "cleanliness", label: "Limpeza" },
    ];

    const SAFETY_ITEMS = [
      { key: "engine", label: "Motor" },
      { key: "lights", label: "Luzes" },
      { key: "brakes", label: "Freios" },
      { key: "soundSystem", label: "Som" },
      { key: "airConditioning", label: "Ar Condicionado" },
      { key: "suspension", label: "Suspensão" },
    ];

    const OTHER_ITEMS = [
      { key: "documents", label: "Documentos" },
      { key: "fuelLevel", label: "Nível de Combustível" },
      { key: "tireCondition", label: "Condição Geral dos Pneus" },
    ];

    const getSafetyLabel = (fieldKey) => {
      const found = SAFETY_ITEMS.find((i) => i.key === fieldKey);
      return found ? found.label : fieldKey;
    };

    // Carregar dados iniciais (edição/visualização)
    useEffect(() => {
      if (initialData) {
        setChecklist({
          ...defaultChecklist,
          ...initialData.checklist,
        });

        const incomingTires = initialData.tires || {};
        const mergedTires = { ...defaultTires };

        ["frontLeft", "frontRight", "rearLeft", "rearRight"].forEach((key) => {
          const value = incomingTires[key];
          if (!value) {
            mergedTires[key] = { ...defaultTires[key] };
          } else if (typeof value === "string") {
            mergedTires[key] = {
              condition: value,
              brand: "",
              treadPercent: "",
            };
          } else {
            mergedTires[key] = {
              condition: value.condition || "",
              brand: value.brand || "",
              treadPercent:
                value.treadPercent !== undefined ? value.treadPercent : "",
            };
          }
        });

        setTires(mergedTires);

        setNotes(initialData.notes || "");
        setGeneralDamages(initialData.generalDamages || "");

        setPhotoEvidence({
          file: null,
          preview: initialData.photoURL || "",
          url: initialData.photoURL || "",
        });

        const mappedDamages = (initialData.damages || []).map(
          (damage, index) => ({
            id: damage.id || `damage_${index}_${Date.now()}`,
            location: damage.location || "",
            description: damage.description || "",
            estimatedCost:
              typeof damage.estimatedCost === "number"
                ? damage.estimatedCost
                : damage.estimatedCost
                ? Number(
                    String(damage.estimatedCost)
                      .replace(".", "")
                      .replace(",", ".")
                  ) || 0
                : 0,
            responsibleType: damage.responsibleType || "driver",
            photoURL: damage.photoURL || "",
            photoFile: null,
            photoPreview: damage.photoURL || "",
          })
        );
        setDamages(mappedDamages);

        setRejectionDetails(initialData.rejectionDetails || {});

        // enriquecer lista de marcas a partir de pneus existentes
        const brandsFromData = new Set();
        Object.values(mergedTires).forEach((t) => {
          if (t.brand) brandsFromData.add(String(t.brand));
        });
        if (brandsFromData.size > 0) {
          setTireBrands((prev) => {
            const setAll = new Set(prev);
            brandsFromData.forEach((b) => setAll.add(b));
            return Array.from(setAll);
          });
        }
      }
    }, [initialData]);

    const handleChecklistChange = (field, value) => {
      setChecklist((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

    const handleSafetyItemChange = (field, value) => {
      setChecklist((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (value === "rejected") {
        // abrir popup para motivo
        const existingReason = rejectionDetails[field] || "";
        setCurrentRejectedField(field);
        setCurrentRejectionText(existingReason);
        setIsRejectionModalOpen(true);
      } else if (value === "approved") {
        // se voltar pra aprovado, removemos o motivo (se existir)
        setRejectionDetails((prev) => {
          if (!prev[field]) return prev;
          const clone = { ...prev };
          delete clone[field];
          return clone;
        });
      }
    };

    const handleTireFieldChange = (tireKey, field, value) => {
      setTires((prev) => ({
        ...prev,
        [tireKey]: {
          ...prev[tireKey],
          [field]: value,
        },
      }));
    };

    const handlePhotoSelect = (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoEvidence({
          file,
          preview: e.target.result,
          url: "",
        });
      };
      reader.readAsDataURL(file);
    };

    const handleRemoveEvidencePhoto = () => {
      if (isViewMode) return;
      setPhotoEvidence({
        file: null,
        preview: "",
        url: "",
      });
    };

    const openDamageModal = () => {
      if (isViewMode) return;
      setDamageDraft({
        id: null,
        location: "",
        description: "",
        estimatedCost: "",
        responsibleType: "driver",
        photoFile: null,
        photoPreview: "",
        photoURL: "",
      });
      setIsDamageModalOpen(true);
    };

    const handleDamagePhotoSelect = (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        setDamageDraft((prev) => ({
          ...prev,
          photoFile: file,
          photoPreview: e.target.result,
          photoURL: "",
        }));
      };
      reader.readAsDataURL(file);
    };

    const handleRemoveDamagePhotoDraft = () => {
      if (isViewMode) return;
      setDamageDraft((prev) => ({
        ...prev,
        photoFile: null,
        photoPreview: "",
        photoURL: "",
      }));
    };

    const handleRemoveDamage = (id) => {
      if (isViewMode) return;
      setDamages((prev) => prev.filter((dmg) => dmg.id !== id));
    };

    const formatDamagePreview = (damage) => {
      if (damage.photoPreview) return damage.photoPreview;
      if (damage.photoURL) return damage.photoURL;
      return "";
    };

    const handleSaveDamageDraft = () => {
      if (isViewMode) return;
      const location = (damageDraft.location || "").trim();
      const description = (damageDraft.description || "").trim();

      if (!location || !description) {
        alert("Informe o local e a descrição do dano.");
        return;
      }

      const estimatedCostValue =
        damageDraft.estimatedCost !== ""
          ? Number(
              String(damageDraft.estimatedCost)
                .replace(".", "")
                .replace(",", ".")
            ) || 0
          : 0;

      const id =
        damageDraft.id ||
        `damage_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      setDamages((prev) => [
        ...prev,
        {
          id,
          location,
          description,
          estimatedCost: estimatedCostValue,
          responsibleType: damageDraft.responsibleType || "driver",
          photoFile: damageDraft.photoFile,
          photoPreview: damageDraft.photoPreview,
          photoURL: damageDraft.photoURL,
        },
      ]);

      setDamageDraft({
        id: null,
        location: "",
        description: "",
        estimatedCost: "",
        responsibleType: "driver",
        photoFile: null,
        photoPreview: "",
        photoURL: "",
      });
      setIsDamageModalOpen(false);
    };

    const handleSelectBrand = (tireKey, value) => {
      if (value === "__new") {
        setBrandTargetTireKey(tireKey);
        setNewBrandName("");
        setIsBrandModalOpen(true);
      } else {
        handleTireFieldChange(tireKey, "brand", value);
      }
    };

    const handleSaveNewBrand = () => {
      const name = newBrandName.trim();
      if (!name) return;

      setTireBrands((prev) => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });

      if (brandTargetTireKey) {
        setTires((prev) => ({
          ...prev,
          [brandTargetTireKey]: {
            ...prev[brandTargetTireKey],
            brand: name,
          },
        }));
      }

      setIsBrandModalOpen(false);
      setBrandTargetTireKey(null);
      setNewBrandName("");
    };

    const handleSubmit = async () => {
      if (isViewMode) {
        onClose();
        return;
      }

      setIsSaving(true);
      try {
        const normalizedTires = Object.fromEntries(
          Object.entries(tires).map(([key, value]) => [
            key,
            {
              condition: value.condition || "",
              brand: value.brand || "",
              treadPercent:
                value.treadPercent === "" || value.treadPercent == null
                  ? ""
                  : Number(value.treadPercent),
            },
          ])
        );

        const payload = {
          checklist,
          tires: normalizedTires,
          notes,
          generalDamages,
          photoFile: photoEvidence.file || null,
          photoURL: photoEvidence.url || "",
          damages,
          rejectionDetails,
          type: "routine",
          date: initialData?.date || new Date().toISOString().slice(0, 10),
        };

        await onSave(payload);
        onClose();
      } catch (error) {
        console.error("Erro ao salvar checklist de rotina:", error);
        alert("Erro ao salvar checklist. Tente novamente.");
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl md:p-6 lg:p-8">
          {/* Cabeçalho */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 md:text-2xl">
              Vistoria Rotineira
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times" />
            </button>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            Registre o estado geral do veículo, incluindo aparência, itens de
            segurança, pneus e danos.
          </p>

          <div className="space-y-6">
            {/* Aparência: Interior / Exterior / Limpeza */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Aparência do Veículo
              </h3>
              <p className="mb-3 text-xs text-gray-500">
                Avalie separadamente interior, exterior e limpeza.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {APPEARANCE_ITEMS.map((item) => (
                  <div key={item.key} className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      {item.label}
                    </label>
                    <select
                      value={checklist[item.key]}
                      onChange={(e) =>
                        handleChecklistChange(item.key, e.target.value)
                      }
                      disabled={isDisabled}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      <option value="excellent">Excelente</option>
                      <option value="good">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="bad">Ruim</option>
                      <option value="terrible">Péssimo</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist de Segurança (Aprovado / Reprovado) */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Itens de Segurança (Aprovado / Reprovado)
              </h3>
              <p className="mb-3 text-xs text-gray-500">
                Caso algum item seja reprovado, será solicitado o motivo para
                gerar os apontamentos corretos.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {SAFETY_ITEMS.map((item) => (
                  <div key={item.key} className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      {item.label}
                    </label>
                    <select
                      value={checklist[item.key]}
                      onChange={(e) =>
                        handleSafetyItemChange(item.key, e.target.value)
                      }
                      disabled={isDisabled}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      <option value="approved">Aprovado</option>
                      <option value="rejected">Reprovado</option>
                    </select>
                    {rejectionDetails[item.key] && (
                      <p className="mt-1 text-[11px] text-red-600">
                        Motivo: {rejectionDetails[item.key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Outros itens: Documentos, Combustível, Condição geral dos pneus */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Outros Itens
              </h3>
              <p className="mb-3 text-xs text-gray-500">
                Avalie documentos, nível de combustível e condição geral dos
                pneus.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {OTHER_ITEMS.map((item) => (
                  <div key={item.key} className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      {item.label}
                    </label>
                    <select
                      value={checklist[item.key]}
                      onChange={(e) =>
                        handleChecklistChange(item.key, e.target.value)
                      }
                      disabled={isDisabled}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      <option value="ok">OK</option>
                      <option value="attention">Atenção</option>
                      <option value="critical">Crítico</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Pneus detalhados */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Condição dos Pneus (Detalhado)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: "frontLeft", label: "Dianteiro Esquerdo" },
                  { key: "frontRight", label: "Dianteiro Direito" },
                  { key: "rearLeft", label: "Traseiro Esquerdo" },
                  { key: "rearRight", label: "Traseiro Direito" },
                ].map((tire) => (
                  <div
                    key={tire.key}
                    className="rounded-lg bg-white p-3 shadow-sm border border-gray-200"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      {tire.label}
                    </p>

                    <div className="mb-2">
                      <label className="mb-1 block text-[11px] font-semibold text-gray-600">
                        Condição
                      </label>
                      <select
                        value={tires[tire.key].condition}
                        onChange={(e) =>
                          handleTireFieldChange(
                            tire.key,
                            "condition",
                            e.target.value
                          )
                        }
                        disabled={isDisabled}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Selecione</option>
                        <option value="good">Bom</option>
                        <option value="worn">Gasto</option>
                        <option value="needs-replacement">Substituir</option>
                      </select>
                    </div>

                    <div className="mb-2">
                      <label className="mb-1 block text-[11px] font-semibold text-gray-600">
                        Marca
                      </label>
                      <select
                        value={tires[tire.key].brand}
                        onChange={(e) =>
                          handleSelectBrand(tire.key, e.target.value)
                        }
                        disabled={isDisabled}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Selecione marca</option>
                        {tireBrands.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                        <option value="__new">+ Adicionar nova marca</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-gray-600">
                        % de vida estimada
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={tires[tire.key].treadPercent}
                          onChange={(e) =>
                            handleTireFieldChange(
                              tire.key,
                              "treadPercent",
                              e.target.value
                            )
                          }
                          disabled={isDisabled}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Ex: 70"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações gerais */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Observações Gerais
              </h3>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isDisabled}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Registre qualquer observação adicional sobre o veículo..."
              />
            </div>

            {/* Foto geral do veículo */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Foto Geral do Veículo (opcional)
              </h3>
              <div className="flex items-center gap-3">
                {!isViewMode && (
                  <label className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                    <i className="fas fa-camera mr-2" />
                    {photoEvidence.preview || photoEvidence.url
                      ? "Trocar foto"
                      : "Adicionar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                      disabled={isDisabled}
                    />
                  </label>
                )}

                {(photoEvidence.preview || photoEvidence.url) && (
                  <div className="flex items-center gap-2">
                    <img
                      src={photoEvidence.preview || photoEvidence.url}
                      alt="Foto da vistoria"
                      className="h-16 w-16 rounded object-cover"
                    />
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={handleRemoveEvidencePhoto}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Danos gerais + lista de danos individuais */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Danos Gerais Observados
                </h3>
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={openDamageModal}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    <i className="fas fa-plus mr-1" />
                    Adicionar dano
                  </button>
                )}
              </div>

              <textarea
                rows={2}
                value={generalDamages}
                onChange={(e) => setGeneralDamages(e.target.value)}
                disabled={isDisabled}
                className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Descrição geral dos danos (se houver)..."
              />

              {damages.length > 0 && (
                <div className="mt-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Danos registrados
                  </h4>
                  <ul className="space-y-2">
                    {damages.map((damage) => (
                      <li
                        key={damage.id}
                        className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {damage.location}
                            </p>
                            <p className="text-sm text-gray-600">
                              {damage.description}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span>
                                Valor estimado:{" "}
                                <strong>
                                  {damage.estimatedCost
                                    ? `R$ ${damage.estimatedCost.toFixed(2)}`
                                    : "—"}
                                </strong>
                              </span>
                              <span>
                                Responsável:{" "}
                                <strong>
                                  {damage.responsibleType === "company"
                                    ? "Locadora"
                                    : "Motorista"}
                                </strong>
                              </span>
                            </div>

                            {formatDamagePreview(damage) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const src =
                                    damage.photoPreview || damage.photoURL;
                                  if (src) window.open(src, "_blank");
                                }}
                                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
                              >
                                <i className="fas fa-camera" /> Ver foto
                              </button>
                            )}
                          </div>

                          {!isViewMode && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDamage(damage.id)}
                              className="text-sm font-semibold text-red-600 hover:text-red-700"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            {!isViewMode && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? "Salvando..." : "Salvar Vistoria"}
              </button>
            )}
          </div>
        </div>

        {/* MODAL DE DANO INDIVIDUAL */}
        {isDamageModalOpen && !isViewMode && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800">
                Registrar dano do veículo
              </h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Local do dano
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={damageDraft.location}
                    onChange={(e) =>
                      setDamageDraft((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Descrição do dano
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={damageDraft.description}
                    onChange={(e) =>
                      setDamageDraft((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Valor estimado do dano
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 500,00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={damageDraft.estimatedCost}
                    onChange={(e) =>
                      setDamageDraft((prev) => ({
                        ...prev,
                        estimatedCost: e.target.value,
                      }))
                    }
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Esse valor será usado depois para gerar a pendência do
                    motorista, se aplicável.
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Responsável pelo dano
                  </p>
                  <div className="flex gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        className="h-4 w-4"
                        value="driver"
                        checked={damageDraft.responsibleType === "driver"}
                        onChange={() =>
                          setDamageDraft((prev) => ({
                            ...prev,
                            responsibleType: "driver",
                          }))
                        }
                      />
                      <span>Motorista</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        className="h-4 w-4"
                        value="company"
                        checked={damageDraft.responsibleType === "company"}
                        onChange={() =>
                          setDamageDraft((prev) => ({
                            ...prev,
                            responsibleType: "company",
                          }))
                        }
                      />
                      <span>Locadora</span>
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Foto do dano (opcional)
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                      <i className="fas fa-camera mr-2" />
                      {damageDraft.photoPreview ? "Trocar foto" : "Adicionar foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleDamagePhotoSelect}
                      />
                    </label>

                    {damageDraft.photoPreview && (
                      <div className="flex items-center gap-2">
                        <img
                          src={damageDraft.photoPreview}
                          alt="Pré-visualização do dano"
                          className="h-12 w-12 rounded object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveDamagePhotoDraft}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDamageDraft}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Salvar dano
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PARA ADICIONAR NOVA MARCA DE PNEU */}
        {isBrandModalOpen && !isViewMode && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
              <h3 className="text-base font-bold text-gray-800">
                Adicionar nova marca de pneu
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Essa marca ficará disponível para os demais pneus nas próximas
                vistorias.
              </p>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Nome da marca
                </label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: Continental"
                />
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsBrandModalOpen(false);
                    setBrandTargetTireKey(null);
                    setNewBrandName("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewBrand}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Salvar marca
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE MOTIVO DE REPROVAÇÃO POR ITEM */}
        {isRejectionModalOpen && currentRejectedField && !isViewMode && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
              <h3 className="text-base font-bold text-gray-800">
                Motivo da reprovação — {getSafetyLabel(currentRejectedField)}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Descreva o problema encontrado nesse item. Depois podemos usar
                essa informação para gerar lembretes ou orçamentos.
              </p>
              <div className="mt-3">
                <textarea
                  rows={4}
                  value={currentRejectionText}
                  onChange={(e) => setCurrentRejectionText(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: Vazamento de óleo no motor, ruído anormal na suspensão..."
                />
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const hadPrevious =
                      !!rejectionDetails[currentRejectedField];
                    if (!hadPrevious) {
                      // se não tinha motivo salvo e o usuário cancelar, voltamos o item para Aprovado
                      setChecklist((prev) => ({
                        ...prev,
                        [currentRejectedField]: "approved",
                      }));
                    }
                    setIsRejectionModalOpen(false);
                    setCurrentRejectedField(null);
                    setCurrentRejectionText("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = currentRejectionText.trim();
                    if (!text) {
                      alert("Descreva o motivo da reprovação.");
                      return;
                    }
                    setRejectionDetails((prev) => ({
                      ...prev,
                      [currentRejectedField]: text,
                    }));
                    setIsRejectionModalOpen(false);
                    setCurrentRejectedField(null);
                    setCurrentRejectionText("");
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  window.RoutineChecklistModal = RoutineChecklistModal;
})();

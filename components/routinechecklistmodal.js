const RoutineChecklistModal = ({ onClose, onSave, initialData = null, isViewMode = false }) => {
    const { useState, useEffect } = React;

    const defaultChecklist = {
        oilLevel: 'ok',
        tirePressure: 'medium',
        lights: 'ok',
        cooling: 'ok',
        brakes: 'ok',
        suspension: 'ok',
    };

    const defaultTires = {
        frontLeft: '',
        frontRight: '',
        rearLeft: '',
        rearRight: '',
    };

    const [checklist, setChecklist] = useState(defaultChecklist);
    const [tires, setTires] = useState(defaultTires);
    const [notes, setNotes] = useState({});
    const [generalDamages, setGeneralDamages] = useState('');
    const [checklistDate, setChecklistDate] = useState(new Date().toISOString().slice(0, 10));
    const [photoEvidence, setPhotoEvidence] = useState({ file: null, preview: '', url: '' });
    const [damages, setDamages] = useState([]);
    const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
    const [damageDraft, setDamageDraft] = useState({ id: null, location: '', description: '', photoFile: null, photoPreview: '', photoURL: '' });

    useEffect(() => {
        if (!initialData) {
            setChecklist(defaultChecklist);
            setTires(defaultTires);
            setNotes({});
            setGeneralDamages('');
            setPhotoEvidence({ file: null, preview: '', url: '' });
            setDamages([]);
            setChecklistDate(new Date().toISOString().slice(0, 10));
            return;
        }

        setChecklist(initialData.checklist || defaultChecklist);
        setTires(initialData.tires || defaultTires);
        setNotes(initialData.notes || {});
        setGeneralDamages(initialData.generalDamages || '');

        const rawDate = initialData.date;
        if (rawDate?.seconds) {
            setChecklistDate(new Date(rawDate.seconds * 1000).toISOString().slice(0, 10));
        } else if (rawDate instanceof Date) {
            setChecklistDate(rawDate.toISOString().slice(0, 10));
        } else {
            setChecklistDate(new Date().toISOString().slice(0, 10));
        }

        setPhotoEvidence({ file: null, preview: initialData.photoURL || '', url: initialData.photoURL || '' });

        const mappedDamages = (initialData.damages || []).map((damage, index) => ({
            id: damage.id || `damage_${index}_${Date.now()}`,
            location: damage.location || '',
            description: damage.description || '',
            photoURL: damage.photoURL || '',
            photoFile: null,
            photoPreview: damage.photoURL || '',
        }));
        setDamages(mappedDamages);
    }, [initialData]);

    const handleChecklistChange = (item, value) => {
        if (isViewMode) return;
        setChecklist(prev => ({ ...prev, [item]: value }));
    };

    const handleTireChange = (tire, value) => {
        if (isViewMode) return;
        setTires(prev => ({ ...prev, [tire]: value }));
    };

    const handleNoteChange = (item, value) => {
        if (isViewMode) return;
        setNotes(prev => ({ ...prev, [item]: value }));
    };

    const handlePhotoSelect = (file) => {
        if (isViewMode) return;
        if (!file) {
            setPhotoEvidence({ file: null, preview: '', url: '' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoEvidence({ file, preview: reader.result || '', url: '' });
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        if (isViewMode) return;
        setPhotoEvidence({ file: null, preview: '', url: '' });
    };

    const openDamageModal = () => {
        if (isViewMode) return;
        setDamageDraft({ id: null, location: '', description: '', photoFile: null, photoPreview: '', photoURL: '' });
        setIsDamageModalOpen(true);
    };

    const handleDamageDraftChange = (field, value) => {
        if (isViewMode) return;
        setDamageDraft(prev => ({ ...prev, [field]: value }));
    };

    const handleDamagePhotoSelect = (file) => {
        if (isViewMode) return;
        if (!file) {
            setDamageDraft(prev => ({ ...prev, photoFile: null, photoPreview: '', photoURL: '' }));
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setDamageDraft(prev => ({ ...prev, photoFile: file, photoPreview: reader.result || '', photoURL: '' }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveDamageDraft = () => {
        if (isViewMode) return;
        const location = (damageDraft.location || '').trim();
        const description = (damageDraft.description || '').trim();
        if (!location || !description) {
            alert('Informe o local e a descrição do dano.');
            return;
        }
        const id = damageDraft.id || `damage_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        setDamages(prev => [...prev, { id, location, description, photoFile: damageDraft.photoFile, photoPreview: damageDraft.photoPreview, photoURL: damageDraft.photoURL }]);
        setDamageDraft({ id: null, location: '', description: '', photoFile: null, photoPreview: '', photoURL: '' });
        setIsDamageModalOpen(false);
    };

    const handleRemoveDamage = (id) => {
        if (isViewMode) return;
        setDamages(prev => prev.filter(damage => damage.id !== id));
    };

    const formatDamagePreview = (damage) => damage.photoPreview || damage.photoURL || '';

    const handleSubmit = () => {
        const payload = {
            date: new Date(`${checklistDate}T12:00:00Z`),
            checklist,
            tires,
            notes,
            generalDamages,
            type: 'routine',
            photoFile: photoEvidence.file,
            photoURL: photoEvidence.url,
            damages,
        };
        onSave(payload);
    };

    const CheckItem = ({ label, itemKey }) => (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="font-semibold text-gray-800">{label}</span>
            <div className="flex gap-2">
                <button
                    disabled={isViewMode}
                    onClick={() => handleChecklistChange(itemKey, 'ok')}
                    className={`px-4 py-1 text-sm rounded-full transition ${
                        checklist[itemKey] === 'ok' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                    } disabled:opacity-60`}
                >
                    OK
                </button>
                <button
                    disabled={isViewMode}
                    onClick={() => handleChecklistChange(itemKey, 'problem')}
                    className={`px-4 py-1 text-sm rounded-full transition ${
                        checklist[itemKey] === 'problem' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
                    } disabled:opacity-60`}
                >
                    Problema
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
                <header className="px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{isViewMode ? 'Detalhes da Vistoria' : 'Checklist Rotineiro de Vistoria'}</h2>
                    <div className="max-w-xs">
                        <label className="block text-sm font-medium text-gray-700">Data da Vistoria</label>
                        <input
                            type="date"
                            value={checklistDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            disabled={isViewMode}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 shadow-sm disabled:bg-gray-100"
                        />
                    </div>
                </header>

                <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr,0.85fr]">
                        <div className="space-y-4">
                            <CheckItem label="Nível do óleo" itemKey="oilLevel" />
                            {checklist.oilLevel === 'problem' && (
                                <textarea
                                    readOnly={isViewMode}
                                    value={notes.oilLevel || ''}
                                    onChange={(e) => handleNoteChange('oilLevel', e.target.value)}
                                    placeholder="Descreva o problema com o óleo..."
                                    className="w-full rounded-lg border border-red-200 bg-red-50 p-2"
                                    rows="2"
                                />
                            )}

                            <CheckItem label="Luzes" itemKey="lights" />
                            {checklist.lights === 'problem' && (
                                <textarea
                                    readOnly={isViewMode}
                                    value={notes.lights || ''}
                                    onChange={(e) => handleNoteChange('lights', e.target.value)}
                                    placeholder="Quais luzes apresentam problema?"
                                    className="w-full rounded-lg border border-red-200 bg-red-50 p-2"
                                    rows="2"
                                />
                            )}

                            <CheckItem label="Arrefecimento" itemKey="cooling" />
                            {checklist.cooling === 'problem' && (
                                <textarea
                                    readOnly={isViewMode}
                                    value={notes.cooling || ''}
                                    onChange={(e) => handleNoteChange('cooling', e.target.value)}
                                    placeholder="Descreva o problema..."
                                    className="w-full rounded-lg border border-red-200 bg-red-50 p-2"
                                    rows="2"
                                />
                            )}

                            <CheckItem label="Freios" itemKey="brakes" />
                            {checklist.brakes === 'problem' && (
                                <textarea
                                    readOnly={isViewMode}
                                    value={notes.brakes || ''}
                                    onChange={(e) => handleNoteChange('brakes', e.target.value)}
                                    placeholder="Descreva o problema com os freios..."
                                    className="w-full rounded-lg border border-red-200 bg-red-50 p-2"
                                    rows="2"
                                />
                            )}

                            <CheckItem label="Suspensão" itemKey="suspension" />
                            {checklist.suspension === 'problem' && (
                                <textarea
                                    readOnly={isViewMode}
                                    value={notes.suspension || ''}
                                    onChange={(e) => handleNoteChange('suspension', e.target.value)}
                                    placeholder="Descreva o problema na suspensão..."
                                    className="w-full rounded-lg border border-red-200 bg-red-50 p-2"
                                    rows="2"
                                />
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm">
                                <h3 className="mb-3 font-semibold text-gray-700">Pneus</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">Pressão geral</label>
                                    <select
                                        value={checklist.tirePressure}
                                        onChange={(e) => handleChecklistChange('tirePressure', e.target.value)}
                                        disabled={isViewMode}
                                        className="w-full rounded-lg border border-gray-200 p-2 disabled:bg-gray-200"
                                    >
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média / OK</option>
                                        <option value="high">Alta</option>
                                    </select>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-600 mb-2">Estado de desgaste (TWI %)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input readOnly={isViewMode} type="number" placeholder="DD (%)" value={tires.frontRight} onChange={(e) => handleTireChange('frontRight', e.target.value)} className="w-full rounded-lg border border-gray-200 p-2" title="Dianteiro Direito" />
                                        <input readOnly={isViewMode} type="number" placeholder="DE (%)" value={tires.frontLeft} onChange={(e) => handleTireChange('frontLeft', e.target.value)} className="w-full rounded-lg border border-gray-200 p-2" title="Dianteiro Esquerdo" />
                                        <input readOnly={isViewMode} type="number" placeholder="TD (%)" value={tires.rearRight} onChange={(e) => handleTireChange('rearRight', e.target.value)} className="w-full rounded-lg border border-gray-200 p-2" title="Traseiro Direito" />
                                        <input readOnly={isViewMode} type="number" placeholder="TE (%)" value={tires.rearLeft} onChange={(e) => handleTireChange('rearLeft', e.target.value)} className="w-full rounded-lg border border-gray-200 p-2" title="Traseiro Esquerdo" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm">
                                <label className="block font-semibold text-gray-700 mb-2">Observações de danos na lataria</label>
                                <textarea
                                    readOnly={isViewMode}
                                    value={generalDamages}
                                    onChange={(e) => setGeneralDamages(e.target.value)}
                                    placeholder="Descreva qualquer novo dano encontrado..."
                                    className="w-full rounded-lg border border-gray-200 bg-white p-3"
                                    rows="4"
                                />
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-700">Danos registrados</span>
                                    {!isViewMode && (
                                        <button type="button" onClick={openDamageModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700">
                                            <i className="fas fa-plus" /> Adicionar dano
                                        </button>
                                    )}
                                </div>
                                {damages.length > 0 ? (
                                    <ul className="space-y-2">
                                        {damages.map(damage => (
                                            <li key={damage.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{damage.location}</p>
                                                        <p className="text-sm text-gray-600">{damage.description}</p>
                                                        {formatDamagePreview(damage) && (
                                                            <a href={damage.photoURL || damage.photoPreview} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">
                                                                <i className="fas fa-camera" /> Ver foto
                                                            </a>
                                                        )}
                                                    </div>
                                                    {!isViewMode && (
                                                        <button type="button" onClick={() => handleRemoveDamage(damage.id)} className="text-sm font-semibold text-red-600 hover:text-red-700">
                                                            Remover
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500">Nenhum dano registrado.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm">
                                <label className="block font-semibold text-gray-700 mb-2">Registro fotográfico (opcional)</label>
                                {photoEvidence.preview ? (
                                    <div className="space-y-3">
                                        <div className="w-full overflow-hidden rounded-lg border border-gray-200">
                                            <img src={photoEvidence.preview} alt="Registro da vistoria" className="h-48 w-full object-cover" />
                                        </div>
                                        {!isViewMode && (
                                            <div className="flex gap-3">
                                                <button type="button" onClick={handleRemovePhoto} className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600">
                                                    Remover foto
                                                </button>
                                                <label className="flex-1 cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700">
                                                    Trocar foto
                                                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} className="hidden" />
                                                </label>
                                            </div>
                                        )}
                                        {isViewMode && photoEvidence.url && (
                                            <a href={photoEvidence.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline">
                                                <i className="fas fa-external-link-alt" /> Ver foto em uma nova aba
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className={isViewMode ? 'text-sm text-gray-500' : 'rounded-lg border-2 border-dashed border-gray-300 p-4 text-center space-y-2'}>
                                        {isViewMode ? (
                                            <p className="text-sm">Nenhuma foto anexada a esta vistoria.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-600">Capture ou selecione uma foto do dispositivo para complementar a vistoria.</p>
                                                <label className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 cursor-pointer">
                                                    <i className="fas fa-camera" /> Adicionar foto
                                                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} className="hidden" />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
                        <button onClick={onClose} className="w-full rounded-lg bg-gray-500 px-6 py-3 font-bold text-white hover:bg-gray-600">
                            {isViewMode ? 'Fechar' : 'Cancelar'}
                        </button>
                        {!isViewMode && (
                            <button onClick={handleSubmit} className="w-full rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-900">
                                Salvar Checklist
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isDamageModalOpen && !isViewMode && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-gray-800">Registrar novo dano</h3>
                            <p className="text-sm text-gray-500">Informe o local afetado, descreva o dano e anexe uma foto.</p>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Local do dano</label>
                                <input
                                    type="text"
                                    value={damageDraft.location}
                                    onChange={(e) => handleDamageDraftChange('location', e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Ex.: Porta dianteira esquerda"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
                                <textarea
                                    value={damageDraft.description}
                                    onChange={(e) => handleDamageDraftChange('description', e.target.value)}
                                    rows="3"
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Detalhes do dano"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Foto do dano</label>
                                {damageDraft.photoPreview ? (
                                    <div className="space-y-3">
                                        <div className="overflow-hidden rounded-lg border border-gray-200">
                                            <img src={damageDraft.photoPreview} alt="Foto do dano" className="h-48 w-full object-cover" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => handleDamagePhotoSelect(null)} className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600">
                                                Remover foto
                                            </button>
                                            <label className="flex-1 cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700">
                                                Trocar foto
                                                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleDamagePhotoSelect(e.target.files?.[0] || null)} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                                        <i className="fas fa-camera" /> Selecionar foto
                                        <input type="file" accept="image/*" capture="environment" onChange={(e) => handleDamagePhotoSelect(e.target.files?.[0] || null)} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button type="button" onClick={() => setIsDamageModalOpen(false)} className="w-full rounded-lg bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-600">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleSaveDamageDraft} className="w-full rounded-lg bg-blue-800 px-4 py-2 font-bold text-white hover:bg-blue-900">
                                Adicionar dano
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.RoutineChecklistModal = RoutineChecklistModal;

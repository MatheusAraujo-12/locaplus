const DeliveryChecklistModal = ({ onClose, onSave, carName, initialData = null, isViewMode = false, app }) => {
    const { useState, useEffect, useRef } = React;
    const { getStorage, ref, uploadBytes, getDownloadURL } = window.firebase;
    const storage = getStorage(app);

    // --- ESTADOS DO COMPONENTE ---
    const [driverName, setDriverName] = useState('');
    const [emergencyContact1, setEmergencyContact1] = useState(''); // NOVO
    const [emergencyContact2, setEmergencyContact2] = useState(''); // NOVO
    const [hodometro, setHodometro] = useState('');
    const [fuelLevel, setFuelLevel] = useState('half');
    const [cleaning, setCleaning] = useState({ seats: 'limpo', ceiling: 'limpo', exterior: 'limpo' });
    const [vehicleItems, setVehicleItems] = useState({ oilLevel: 'ok', coolingLevel: 'ok', brakeFluid: 'ok', airConditioning: 'ok', wipers: 'ok', windows: 'ok', locks: 'ok', soundSystem: 'ok', wheelKey: 'ok', spareTire: 'ok', triangle: 'ok', headlights: 'ok', taillights: 'ok' });
    const [tires, setTires] = useState({ frontLeftBrand: '', frontLeftTwi: '', frontRightBrand: '', frontRightTwi: '', rearLeftBrand: '', rearLeftTwi: '', rearRightBrand: '', rearRightTwi: '' });
    const [damages, setDamages] = useState([]);
    const [newDamage, setNewDamage] = useState({ description: '', photo: null, photoName: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [signature, setSignature] = useState(false);

    useEffect(() => {
        if (isViewMode && initialData) {
            setDriverName(initialData.driverName || '');
            setEmergencyContact1(initialData.emergencyContact1 || ''); // NOVO
            setEmergencyContact2(initialData.emergencyContact2 || ''); // NOVO
            setHodometro(initialData.hodometro || '');
            setFuelLevel(initialData.fuelLevel || 'half');
            setCleaning(initialData.cleaning || { seats: 'limpo', ceiling: 'limpo', exterior: 'limpo' });
            setVehicleItems(initialData.vehicleItems || {});
            setTires(initialData.tires || { frontLeftBrand: '', frontLeftTwi: '', frontRightBrand: '', frontRightTwi: '', rearLeftBrand: '', rearLeftTwi: '', rearRightBrand: '', rearRightTwi: '' });
            setDamages(initialData.damages || []);
            setSignature(initialData.signature || false);
        }
    }, [initialData, isViewMode]);

    const handleChange = (setter, field, value) => { if (!isViewMode) setter(prev => ({ ...prev, [field]: value })); };
    const handleAddDamage = () => { if (!newDamage.description) { alert("Por favor, descreva o dano."); return; } setDamages(prev => [...prev, newDamage]); setNewDamage({ description: '', photo: null, photoName: '' }); };
    const handlePhotoSelect = (e) => { if (e.target.files[0]) setNewDamage(prev => ({ ...prev, photo: e.target.files[0], photoName: e.target.files[0].name })); };

    const handleSubmit = async () => {
        if (!driverName || !signature) { alert("É necessário preencher o nome do motorista e assinar a declaração."); return; }
        setIsUploading(true);
        try {
            const damageReportsWithUrls = await Promise.all(
                damages.map(async (damage) => {
                    if (damage.photo && !damage.photoURL) {
                        const photoRef = ref(storage, `checklists/${carName.replace(/\s/g, '_')}/${new Date().getTime()}_${damage.photo.name}`);
                        await uploadBytes(photoRef, damage.photo);
                        const photoURL = await getDownloadURL(photoRef);
                        return { description: damage.description, photoURL };
                    }
                    return damage;
                })
            );
            const dataToSave = { type: 'delivery_return', date: new Date(), driverName, emergencyContact1, emergencyContact2, hodometro, fuelLevel, cleaning, vehicleItems, tires, damages: damageReportsWithUrls, signature };
            onSave(dataToSave);
        } catch (error) { console.error("Erro ao fazer upload: ", error); alert("Falha no upload das imagens.");
        } finally { setIsUploading(false); }
    };
    
    const handleDownloadPdf = () => {
        const reportElement = document.getElementById('checklist-print-layout');
        if (!reportElement) return;

        html2canvas(reportElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.width / canvas.height;
            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth / canvasAspectRatio;
            
            if (imgHeight > pdfHeight - 20) {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight * canvasAspectRatio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            pdf.addImage(imgData, 'PNG', x, 10, imgWidth, imgHeight);
            pdf.save(`Vistoria_${carName.replace(/\s/g, '_')}.pdf`);
        });
    };

    const CheckItem = ({ label, itemKey }) => (<div className="flex justify-between items-center py-2 border-b"><span className="font-semibold text-gray-700">{label}</span><div className="flex gap-2"><button disabled={isViewMode} onClick={() => handleChange(setVehicleItems, itemKey, 'ok')} className={`px-4 py-1 text-sm rounded-full ${vehicleItems[itemKey] === 'ok' ? 'bg-green-500 text-white' : 'bg-gray-200'} disabled:opacity-70 disabled:cursor-not-allowed`}>OK</button><button disabled={isViewMode} onClick={() => handleChange(setVehicleItems, itemKey, 'problem')} className={`px-4 py-1 text-sm rounded-full ${vehicleItems[itemKey] === 'problem' ? 'bg-red-500 text-white' : 'bg-gray-200'} disabled:opacity-70 disabled:cursor-not-allowed`}>Problema</button></div></div>);
    const CleanItem = ({ label, itemKey }) => (<div><label className="text-sm">{label}</label><select disabled={isViewMode} value={cleaning[itemKey]} onChange={e => handleChange(setCleaning, itemKey, e.target.value)} className="w-full p-2 border rounded disabled:bg-gray-100 disabled:cursor-not-allowed"><option value="limpo">Limpo</option><option value="regular">Regular</option><option value="sujo">Sujo</option></select></div>);

    const translationMap = {
        oilLevel: "Nível de Óleo", coolingLevel: "Nível de Arrefecimento", brakeFluid: "Óleo de Freio", airConditioning: "Ar Condicionado", wipers: "Limpador de Para-brisas", windows: "Vidros Elétricos", locks: "Travas", soundSystem: "Som", wheelKey: "Chave de Roda", spareTire: "Estepe", triangle: "Triângulo", headlights: "Faróis Dianteiros", taillights: "Faróis Traseiros", seats: "Bancos", ceiling: "Teto", exterior: "Exterior",
        reserva: "Reserva", quarter: "1/4", half: "1/2", three_quarters: "3/4", full: "Cheio",
        ok: "OK", problem: "Problema"
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 modal-enter">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center no-print">
                    <h2 className="text-2xl font-bold text-gray-800">{isViewMode ? `Vistoria - ${carName}` : 'Checklist de Entrega / Devolução'}</h2>
                    {isViewMode && <button onClick={handleDownloadPdf} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"><i className="fas fa-file-pdf mr-2"></i>Baixar PDF</button>}
                </div>
                {isViewMode && <p className="text-sm text-gray-500 my-2 no-print">Realizada em: {initialData?.date?.seconds ? new Date(initialData.date.seconds * 1000).toLocaleString('pt-BR') : 'Data não disponível'}</p>}
                
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="mb-6"><label className="block font-semibold text-gray-700">Nome do Motorista</label><input type="text" value={driverName} disabled={isViewMode} onChange={(e) => setDriverName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg disabled:bg-gray-100" /></div>
                    
                    {/* --- NOVOS CAMPOS DE CONTATO DE EMERGÊNCIA --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block font-semibold text-gray-700">Contato de Emergência 1</label>
                            <input type="text" placeholder="Nome e Telefone" value={emergencyContact1} disabled={isViewMode} onChange={(e) => setEmergencyContact1(e.target.value)} className="w-full mt-1 p-2 border rounded-lg disabled:bg-gray-100" />
                        </div>
                        <div>
                            <label className="block font-semibold text-gray-700">Contato de Emergência 2</label>
                            <input type="text" placeholder="Nome e Telefone" value={emergencyContact2} disabled={isViewMode} onChange={(e) => setEmergencyContact2(e.target.value)} className="w-full mt-1 p-2 border rounded-lg disabled:bg-gray-100" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <div className="p-4 border rounded-lg space-y-2">
                                <h3 className="font-bold text-lg">Condições Gerais</h3>
                                <div><label className="text-sm">Hodômetro (km)</label><input type="number" disabled={isViewMode} value={hodometro} onChange={e=>setHodometro(e.target.value)} className="w-full p-2 border rounded disabled:bg-gray-100"/></div>
                                <div><label className="text-sm">Nível de Combustível</label><select disabled={isViewMode} value={fuelLevel} onChange={e=>setFuelLevel(e.target.value)} className="w-full p-2 border rounded disabled:bg-gray-100"><option value="reserva">Reserva</option><option value="quarter">1/4</option><option value="half">1/2</option><option value="three_quarters">3/4</option><option value="full">Cheio</option></select></div>
                                <CheckItem label="Nível de Óleo" itemKey="oilLevel"/>
                                <CheckItem label="Nível de Arrefecimento" itemKey="coolingLevel"/>
                                <CheckItem label="Óleo de Freio" itemKey="brakeFluid"/>
                                <CheckItem label="Ar Condicionado" itemKey="airConditioning"/>
                                <CheckItem label="Limpador de Para-brisas" itemKey="wipers"/>
                                <CheckItem label="Vidros Elétricos" itemKey="windows"/>
                                <CheckItem label="Travas" itemKey="locks"/>
                                <CheckItem label="Som" itemKey="soundSystem"/>
                            </div>
                            <div className="p-4 border rounded-lg mt-6 space-y-2">
                                <h3 className="font-bold text-lg">Itens de Segurança</h3>
                                <CheckItem label="Estepe" itemKey="spareTire"/>
                                <CheckItem label="Triângulo" itemKey="triangle"/>
                                <CheckItem label="Chave de Roda" itemKey="wheelKey"/>
                                <CheckItem label="Faróis Dianteiros" itemKey="headlights"/>
                                <CheckItem label="Faróis Traseiros" itemKey="taillights"/>
                            </div>
                        </div>
                        <div>
                            <div className="p-4 border rounded-lg mb-6"><h3 className="font-bold text-lg mb-3">Estado dos Pneus</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className="text-sm">DD Marca</label><input disabled={isViewMode} value={tires.frontRightBrand} onChange={e=>handleChange(setTires, 'frontRightBrand', e.target.value)} className="w-full p-2 border rounded" /></div><div><label className="text-sm">DD TWI%</label><input type="number" disabled={isViewMode} value={tires.frontRightTwi} onChange={e=>handleChange(setTires, 'frontRightTwi', e.target.value)} className="w-full p-2 border rounded" /></div><div><label className="text-sm">DE Marca</label><input disabled={isViewMode} value={tires.frontLeftBrand} onChange={e=>handleChange(setTires, 'frontLeftBrand', e.target.value)} className="w-full p-2 border rounded" /></div><div><label className="text-sm">DE TWI%</label><input type="number" disabled={isViewMode} value={tires.frontLeftTwi} onChange={e=>handleChange(setTires, 'frontLeftTwi', e.target.value)} className="w-full p-2 border rounded" /></div><div><label className="text-sm">TD Marca</label><input disabled={isViewMode} value={tires.rearRightBrand} onChange={e=>handleChange(setTires, 'rearRightBrand', e.target.value)} className="w-full p-2 border rounded" /></div><div><label className="text-sm">TD TWI%</label><input type="number" disabled={isViewMode} value={tires.rearRightTwi} onChange={e=>handleChange(setTires, 'rearRightTwi', e.target.value)} className="w-full p-2 border rounded" /></div><div><label className="text-sm">TE Marca</label><input disabled={isViewMode} value={tires.rearLeftBrand} onChange={e=>handleChange(setTires, 'rearLeftBrand', e.target.value)} className="w-full p-2 border rounded" /></div><div><label className="text-sm">TE TWI%</label><input type="number" disabled={isViewMode} value={tires.rearLeftTwi} onChange={e=>handleChange(setTires, 'rearLeftTwi', e.target.value)} className="w-full p-2 border rounded" /></div></div></div>
                            <div className="p-4 border rounded-lg mb-6"><h3 className="font-bold text-lg mb-3">Estado de Limpeza</h3><div className="grid grid-cols-3 gap-4"><CleanItem label="Bancos" itemKey="seats" /><CleanItem label="Teto" itemKey="ceiling" /><CleanItem label="Exterior" itemKey="exterior" /></div></div>
                            <div className="p-4 border rounded-lg"><h3 className="font-bold text-lg mb-3">Registo de Danos</h3>{!isViewMode && (<div className="bg-gray-50 p-3 rounded-lg flex items-end gap-3 mb-4"><div className="flex-grow"><label className="text-sm">Descrição do Dano</label><input value={newDamage.description} onChange={e=>handleDamageChange('description', e.target.value)} className="w-full p-2 border rounded"/></div><div><label className="text-sm">Foto</label><input type="file" accept="image/*" onChange={handlePhotoSelect} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/></div><button onClick={handleAddDamage} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 self-end">+</button></div>)}<div className="space-y-2">{damages.map((damage, index) => (<div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded"><span>{damage.description}</span>{damage.photoURL ? <a href={damage.photoURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"><i className="fas fa-camera"></i> Ver Foto</a> : damage.photoName && <span className="text-sm text-gray-500"><i className="fas fa-paperclip"></i> {damage.photoName}</span>}</div>))}</div></div>
                        </div>
                    </div>
                    <div className="mt-6 mb-6 p-4 border rounded-lg bg-gray-50"><label className="flex items-center gap-3"><input type="checkbox" checked={signature} disabled={isViewMode} onChange={(e) => setSignature(e.target.checked)} className="h-5 w-5"/><span className="text-sm">Eu, {driverName || '...'}, declaro que recebi/devolvi o veículo nas condições descritas neste checklist.</span></label></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t no-print">
                    <button onClick={onClose} className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600">{isViewMode ? 'Fechar' : 'Cancelar'}</button>
                    {!isViewMode && <button onClick={handleSubmit} disabled={isUploading} className="w-full bg-blue-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900 disabled:bg-blue-400">{isUploading ? 'A Salvar...' : 'Salvar Checklist'}</button>}
                </div>
            </div>
            
            {isViewMode && (
                <div id="checklist-print-layout" style={{ position: 'absolute', left: '-9999px', width: '210mm', color: 'black', backgroundColor: 'white', padding: '10mm', fontFamily: 'Arial, sans-serif' }}>
                    <div style={{marginBottom: '8mm'}}>
                        <h1 style={{fontSize: '18pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Relatório de Vistoria - {carName}</h1>
                        <p style={{fontSize: '10pt', color: '#555'}}>Realizado em: {initialData?.date?.seconds ? new Date(initialData.date.seconds * 1000).toLocaleString('pt-BR') : 'Data não disponível'}</p>
                    </div>
                    <div style={{marginBottom: '8mm'}}>
                        <h2 style={{fontSize: '14pt', borderTop: '1px solid #eee', paddingTop: '10px'}}>Dados da Entrega</h2>
                        <p><strong>Motorista:</strong> {driverName}</p>
                        <p><strong>Contato de Emergência 1:</strong> {emergencyContact1}</p>
                        <p><strong>Contato de Emergência 2:</strong> {emergencyContact2}</p>
                        <p><strong>Hodômetro:</strong> {hodometro} km</p>
                        <p><strong>Nível de Combustível:</strong> {translationMap[fuelLevel] || fuelLevel}</p>
                    </div>
                    <div style={{marginBottom: '8mm'}}>
                        <h2 style={{fontSize: '14pt', borderTop: '1px solid #eee', paddingTop: '10px'}}>Itens de Verificação</h2>
                        <table style={{width: '100%', fontSize: '10pt', borderCollapse: 'collapse'}}>
                            <tbody>
                                {Object.entries(vehicleItems).map(([key, value]) => (<tr key={key} style={{borderBottom: '1px solid #eee'}}><td style={{padding: '4px'}}>{translationMap[key] || key}</td><td style={{padding: '4px', fontWeight: 'bold', color: value === 'ok' ? 'green' : 'red'}}>{translationMap[value] || value.toUpperCase()}</td></tr>))}
                                {Object.entries(cleaning).map(([key, value]) => (<tr key={key} style={{borderBottom: '1px solid #eee'}}><td style={{padding: '4px'}}>Limpeza {translationMap[key] || key}</td><td style={{padding: '4px', fontWeight: 'bold'}}>{value.charAt(0).toUpperCase() + value.slice(1)}</td></tr>))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ pageBreakInside: 'avoid', marginTop: '10mm' }}>
                        <h2 style={{fontSize: '14pt', borderTop: '1px solid #eee', paddingTop: '10px'}}>Estado dos Pneus</h2>
                        <table style={{width: '100%', fontSize: '10pt', borderCollapse: 'collapse', marginTop: '5mm'}}>
                             <thead><tr style={{backgroundColor: '#f3f4f6'}}><th style={{padding: '4px'}}>Posição</th><th style={{padding: '4px'}}>Marca</th><th style={{padding: '4px'}}>TWI %</th></tr></thead>
                             <tbody>
                                <tr style={{borderBottom: '1px solid #eee'}}><td style={{padding: '4px'}}>Dianteiro Direito</td><td style={{padding: '4px'}}>{tires.frontRightBrand}</td><td style={{padding: '4px'}}>{tires.frontRightTwi}%</td></tr>
                                <tr style={{borderBottom: '1px solid #eee'}}><td style={{padding: '4px'}}>Dianteiro Esquerdo</td><td style={{padding: '4px'}}>{tires.frontLeftBrand}</td><td style={{padding: '4px'}}>{tires.frontLeftTwi}%</td></tr>
                                <tr style={{borderBottom: '1px solid #eee'}}><td style={{padding: '4px'}}>Traseiro Direito</td><td style={{padding: '4px'}}>{tires.rearRightBrand}</td><td style={{padding: '4px'}}>{tires.rearRightTwi}%</td></tr>
                                <tr style={{borderBottom: '1px solid #eee'}}><td style={{padding: '4px'}}>Traseiro Esquerdo</td><td style={{padding: '4px'}}>{tires.rearLeftBrand}</td><td style={{padding: '4px'}}>{tires.rearLeftTwi}%</td></tr>
                             </tbody>
                        </table>
                    </div>
                    <div style={{ pageBreakInside: 'avoid', marginTop: '10mm' }}>
                        <h2 style={{fontSize: '14pt', borderTop: '1px solid #eee', paddingTop: '10px'}}>Danos Registados</h2>
                        {damages.length > 0 ? (
                            <ul style={{listStyleType: 'disc', paddingLeft: '20px'}}>
                                {damages.map((damage, i) => (<li key={i}>{damage.description} {damage.photoURL && <a href={damage.photoURL} target="_blank" rel="noopener noreferrer" style={{color: 'blue'}}> (Ver Foto)</a>}</li>))}
                            </ul>
                        ) : (<p>Nenhum dano registado.</p>)}
                    </div>
                    <div style={{marginTop: '40mm', paddingTop: '10px', borderTop: '1px solid #000', width: '80%', margin: '40mm auto 0 auto', textAlign: 'center'}}>
                        <p>_________________________________________</p>
                        <p>Assinatura do Motorista: {driverName}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

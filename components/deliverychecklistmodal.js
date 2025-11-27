;(function () {
// src/components/DeliveryChecklistModal.js
const { useEffect, useRef, useState } = React;
const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
const html2canvas = window.html2canvas;

const DeliveryChecklistModal = ({
  onClose,
  onSave,
  carName,
  initialData = null,
  isViewMode = false,
}) => {
  const { ref, uploadBytes, getDownloadURL } = window.firebase || {};
  const storage = window.firebaseStorage;

  // --- ESTADOS PRINCIPAIS ---
  const [driverName, setDriverName] = useState('');
  const [emergencyContact1, setEmergencyContact1] = useState('');
  const [emergencyContact2, setEmergencyContact2] = useState('');
  const [hodometro, setHodometro] = useState('');
  const [fuelLevel, setFuelLevel] = useState('half');

  const [cleaning, setCleaning] = useState({
    seats: 'limpo',
    ceiling: 'limpo',
    exterior: 'limpo',
  });

  const [vehicleItems, setVehicleItems] = useState({
    oilLevel: 'ok',
    coolingLevel: 'ok',
    brakeFluid: 'ok',
    airConditioning: 'ok',
    wipers: 'ok',
    windows: 'ok',
    locks: 'ok',
    soundSystem: 'ok',
    spareTire: 'ok',
    triangle: 'ok',
    wheelKey: 'ok',
    headlights: 'ok',
    taillights: 'ok',
  });

  const [tires, setTires] = useState({
    frontLeftBrand: '',
    frontLeftTwi: '',
    frontRightBrand: '',
    frontRightTwi: '',
    rearLeftBrand: '',
    rearLeftTwi: '',
    rearRightBrand: '',
    rearRightTwi: '',
  });

  // DANOS COM VALOR E RESPONSÁVEL
  const [damages, setDamages] = useState([]);
  const [newDamage, setNewDamage] = useState({
    location: '',
    description: '',
    estimatedCost: '',
    responsible: 'driver', // 'driver' | 'company'
    photo: null,
    photoName: '',
    photoURL: '',
  });

  const [isUploading, setIsUploading] = useState(false);

  // ASSINATURA (checkbox + desenho)
  const [signatureChecked, setSignatureChecked] = useState(false);
  const [signatureDataURL, setSignatureDataURL] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // STATUS DE DEVOLUÇÃO (checklist continua sendo de entrega,
  // mas marcamos quando a devolução foi conferida)
  const [returnChecked, setReturnChecked] = useState(false);
  const [returnDate, setReturnDate] = useState(null);

  // ---------- HELPERS ----------
  const normalizeDate = (raw) => {
    if (!raw) return null;
    if (raw.seconds) {
      return new Date(raw.seconds * 1000);
    }
    if (raw instanceof Date) return raw;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDateTimeBR = (date) => {
    if (!date) return 'Data não disponível';
    try {
      return date.toLocaleString('pt-BR');
    } catch {
      return 'Data não disponível';
    }
  };

  // coords para mouse / touch no canvas
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (isViewMode) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || isViewMode) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    setSignatureDataURL(dataURL);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataURL('');
  };

  // ---------- CARREGA DADOS AO ENTRAR EM VIEW / EDIT ----------
  useEffect(() => {
    if (!initialData) return;

    setDriverName(initialData.driverName || '');
    setEmergencyContact1(initialData.emergencyContact1 || '');
    setEmergencyContact2(initialData.emergencyContact2 || '');
    setHodometro(initialData.hodometro || '');
    setFuelLevel(initialData.fuelLevel || 'half');
    setCleaning(
      initialData.cleaning || { seats: 'limpo', ceiling: 'limpo', exterior: 'limpo' }
    );
    setVehicleItems(initialData.vehicleItems || {});
    setTires(
      initialData.tires || {
        frontLeftBrand: '',
        frontLeftTwi: '',
        frontRightBrand: '',
        frontRightTwi: '',
        rearLeftBrand: '',
        rearLeftTwi: '',
        rearRightBrand: '',
        rearRightTwi: '',
      }
    );

    // Mapeia danos antigos + novos campos
    const mappedDamages = (initialData.damages || []).map((d, idx) => ({
      id: d.id || `damage_${idx}_${Date.now()}`,
      location: d.location || '',
      description: d.description || '',
      estimatedCost:
        typeof d.estimatedCost === 'number'
          ? d.estimatedCost
          : d.cost
          ? Number(String(d.cost).replace(',', '.')) || 0
          : 0,
      responsible: d.responsible || 'driver',
      photoURL: d.photoURL || '',
      photo: null,
      photoName: '',
    }));
    setDamages(mappedDamages);

    setSignatureChecked(!!initialData.signature);
    setSignatureDataURL(initialData.signatureDataURL || '');

    setReturnChecked(!!initialData.returnChecked);
    const rd = normalizeDate(initialData.returnDate);
    setReturnDate(rd);
  }, [initialData, isViewMode]);

  // ---------- HANDLERS DE CAMPOS ----------
  const handleChangeVehicleItem = (field, value) => {
    if (isViewMode) return;
    setVehicleItems((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeCleaning = (field, value) => {
    if (isViewMode) return;
    setCleaning((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeTire = (field, value) => {
    if (isViewMode) return;
    setTires((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoSelect = (e) => {
    if (isViewMode) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setNewDamage((prev) => ({
      ...prev,
      photo: file,
      photoName: file.name,
    }));
  };

  const handleAddDamage = () => {
    if (isViewMode) return;

    if (!newDamage.description && !newDamage.location) {
      alert('Descreva o dano ou informe o local.');
      return;
    }

    const costNumber = newDamage.estimatedCost
      ? Number(String(newDamage.estimatedCost).replace(',', '.')) || 0
      : 0;

    setDamages((prev) => [
      ...prev,
      {
        id: `damage_${prev.length}_${Date.now()}`,
        location: newDamage.location.trim(),
        description: newDamage.description.trim(),
        estimatedCost: costNumber,
        responsible: newDamage.responsible || 'driver',
        photo: newDamage.photo || null,
        photoName: newDamage.photoName || '',
        photoURL: newDamage.photoURL || '',
      },
    ]);

    setNewDamage({
      location: '',
      description: '',
      estimatedCost: '',
      responsible: 'driver',
      photo: null,
      photoName: '',
      photoURL: '',
    });
  };

  const handleRemoveDamage = (index) => {
    if (isViewMode) return;
    setDamages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRegisterReturnNow = () => {
    if (isViewMode) return;
    setReturnChecked(true);
    setReturnDate(new Date());
  };

  // ---------- SUBMIT ----------
  const handleSubmit = async () => {
    if (!driverName) {
      alert('Informe o nome do motorista.');
      return;
    }

    if (!signatureChecked || !signatureDataURL) {
      alert(
        'É necessário marcar a declaração e coletar a assinatura do motorista.'
      );
      return;
    }

    setIsUploading(true);
    try {
      const damageReportsWithUrls = await Promise.all(
        damages.map(async (damage) => {
          if (damage.photo && !damage.photoURL) {
            const safeName = damage.photo.name.replace(/\s/g, '_');
            const photoRef = ref(
              storage,
              `checklists/damages/${carName.replace(
                /\s/g,
                '_'
              )}/${Date.now()}_${safeName}`
            );
            await uploadBytes(photoRef, damage.photo);
            const photoURL = await getDownloadURL(photoRef);
            return {
              ...damage,
              photo: null,
              photoURL,
            };
          }
          return damage;
        })
      );

      const dataToSave = {
        type: 'delivery_return', // mantido por compatibilidade
        date: new Date(),
        driverName,
        emergencyContact1,
        emergencyContact2,
        hodometro,
        fuelLevel,
        cleaning,
        vehicleItems,
        tires,
        damages: damageReportsWithUrls,
        signature: signatureChecked,
        signatureDataURL,
        returnChecked,
        returnDate: returnDate || null,
      };

      onSave(dataToSave);
    } catch (error) {
      console.error('Erro ao fazer upload: ', error);
      alert('Falha no upload das imagens.');
    } finally {
      setIsUploading(false);
    }
  };

  // ---------- PDF ----------
  const handleDownloadPdf = () => {
    const reportElement = document.getElementById('checklist-print-layout');
    if (!reportElement) return;

    html2canvas(reportElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`vistoria_${carName || 'veiculo'}.pdf`);
    });
  };

  // ---------- SUB-COMPONENTES ----------
  const CheckItem = ({ label, itemKey }) => (
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={isViewMode}
          onClick={() => handleChangeVehicleItem(itemKey, 'ok')}
          className={`px-3 py-1 rounded text-xs border ${
            vehicleItems[itemKey] === 'ok'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-green-50'
          } ${isViewMode ? 'opacity-60 cursor-default' : ''}`}
        >
          OK
        </button>
        <button
          type="button"
          disabled={isViewMode}
          onClick={() => handleChangeVehicleItem(itemKey, 'problem')}
          className={`px-3 py-1 rounded text-xs border ${
            vehicleItems[itemKey] === 'problem'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-red-50'
          } ${isViewMode ? 'opacity-60 cursor-default' : ''}`}
        >
          Problema
        </button>
      </div>
    </div>
  );

  const CleanItem = ({ label, itemKey }) => (
    <div className="mb-2">
      <label className="text-sm text-gray-700">{label}</label>
      <select
        disabled={isViewMode}
        value={cleaning[itemKey] || 'limpo'}
        onChange={(e) => handleChangeCleaning(itemKey, e.target.value)}
        className="w-full p-2 border rounded text-sm mt-1 disabled:bg-gray-100"
      >
        <option value="limpo">Limpo</option>
        <option value="regular">Regular</option>
        <option value="sujo">Sujo</option>
      </select>
    </div>
  );

  const translationMap = {
    oilLevel: 'Nível de Óleo',
    coolingLevel: 'Nível de Arrefecimento',
    brakeFluid: 'Óleo de Freio',
    airConditioning: 'Ar Condicionado',
    wipers: 'Limpador de Para-brisas',
    windows: 'Vidros Elétricos',
    locks: 'Travas',
    soundSystem: 'Som',
    spareTire: 'Estepe',
    triangle: 'Triângulo',
    wheelKey: 'Chave de Roda',
    headlights: 'Faróis Dianteiros',
    taillights: 'Faróis Traseiros',
    seats: 'Bancos',
    ceiling: 'Teto',
    exterior: 'Exterior',
    reserva: 'Reserva',
    quarter: '1/4',
    half: '1/2',
    three_quarters: '3/4',
    full: 'Cheio',
    ok: 'OK',
    problem: 'Problema',
  };

  // ---------- RENDER ----------
  const createdAt = normalizeDate(initialData?.date);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 modal-enter">
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center no-print">
          <h2 className="text-2xl font-bold text-gray-800">
            {carName
              ? `Vistoria de Entrega - ${carName}`
              : 'Checklist de Entrega'}
          </h2>

          {isViewMode && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
            >
              <i className="fas fa-file-pdf mr-2" />
              Baixar PDF
            </button>
          )}
        </div>

        {isViewMode && (
          <p className="text-sm text-gray-500 mb-4">
            Criado em:{' '}
            {createdAt
              ? createdAt.toLocaleString('pt-BR')
              : 'Data não disponível'}
          </p>
        )}

        <div className="flex-grow overflow-y-auto pr-2">
          {/* DADOS BÁSICOS */}
          <div className="mb-6">
            <label className="block font-semibold text-gray-700">
              Motorista
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => !isViewMode && setDriverName(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg disabled:bg-gray-100"
              disabled={isViewMode}
            />
          </div>

          {/* CONTATOS DE EMERGÊNCIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-semibold text-gray-700">
                Contato de Emergência 1
              </label>
              <input
                type="text"
                placeholder="Nome e telefone"
                value={emergencyContact1}
                onChange={(e) =>
                  !isViewMode && setEmergencyContact1(e.target.value)
                }
                className="w-full mt-1 p-2 border rounded-lg disabled:bg-gray-100"
                disabled={isViewMode}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700">
                Contato de Emergência 2
              </label>
              <input
                type="text"
                placeholder="Nome e telefone"
                value={emergencyContact2}
                onChange={(e) =>
                  !isViewMode && setEmergencyContact2(e.target.value)
                }
                className="w-full mt-1 p-2 border rounded-lg disabled:bg-gray-100"
                disabled={isViewMode}
              />
            </div>
          </div>

          {/* CONDIÇÕES GERAIS / ITENS / PNEUS / LIMPEZA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-bold text-lg">Condições Gerais</h3>

                <div>
                  <label className="text-sm">Hodômetro (km)</label>
                  <input
                    type="number"
                    value={hodometro}
                    onChange={(e) =>
                      !isViewMode && setHodometro(e.target.value)
                    }
                    className="w-full p-2 border rounded disabled:bg-gray-100"
                    disabled={isViewMode}
                  />
                </div>

                <div>
                  <label className="text-sm">Nível de combustível</label>
                  <select
                    value={fuelLevel}
                    disabled={isViewMode}
                    onChange={(e) =>
                      !isViewMode && setFuelLevel(e.target.value)
                    }
                    className="w-full p-2 border rounded disabled:bg-gray-100"
                  >
                    <option value="reserva">Reserva</option>
                    <option value="quarter">1/4</option>
                    <option value="half">1/2</option>
                    <option value="three_quarters">3/4</option>
                    <option value="full">Cheio</option>
                  </select>
                </div>

                <CheckItem label="Nível de Óleo" itemKey="oilLevel" />
                <CheckItem
                  label="Nível de Arrefecimento"
                  itemKey="coolingLevel"
                />
                <CheckItem label="Óleo de Freio" itemKey="brakeFluid" />
                <CheckItem
                  label="Ar Condicionado"
                  itemKey="airConditioning"
                />
                <CheckItem
                  label="Limpador de Para-brisas"
                  itemKey="wipers"
                />
                <CheckItem
                  label="Vidros Elétricos"
                  itemKey="windows"
                />
                <CheckItem label="Travas" itemKey="locks" />
                <CheckItem label="Som" itemKey="soundSystem" />
              </div>

              <div className="p-4 border rounded-lg mt-6 space-y-2">
                <h3 className="font-bold text-lg">Itens de Segurança</h3>
                <CheckItem label="Estepe" itemKey="spareTire" />
                <CheckItem label="Triângulo" itemKey="triangle" />
                <CheckItem label="Chave de Roda" itemKey="wheelKey" />
                <CheckItem
                  label="Faróis Dianteiros"
                  itemKey="headlights"
                />
                <CheckItem
                  label="Faróis Traseiros"
                  itemKey="taillights"
                />
              </div>
            </div>

            <div>
              {/* PNEUS */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-bold text-lg">Pneus</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold">
                      Dianteiro Esquerdo - Marca
                    </label>
                    <input
                      type="text"
                      disabled={isViewMode}
                      value={tires.frontLeftBrand}
                      onChange={(e) =>
                        handleChangeTire('frontLeftBrand', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      Dianteiro Esquerdo - TWI (%)
                    </label>
                    <input
                      type="number"
                      disabled={isViewMode}
                      value={tires.frontLeftTwi}
                      onChange={(e) =>
                        handleChangeTire('frontLeftTwi', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold">
                      Dianteiro Direito - Marca
                    </label>
                    <input
                      type="text"
                      disabled={isViewMode}
                      value={tires.frontRightBrand}
                      onChange={(e) =>
                        handleChangeTire('frontRightBrand', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      Dianteiro Direito - TWI (%)
                    </label>
                    <input
                      type="number"
                      disabled={isViewMode}
                      value={tires.frontRightTwi}
                      onChange={(e) =>
                        handleChangeTire('frontRightTwi', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold">
                      Traseiro Esquerdo - Marca
                    </label>
                    <input
                      type="text"
                      disabled={isViewMode}
                      value={tires.rearLeftBrand}
                      onChange={(e) =>
                        handleChangeTire('rearLeftBrand', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      Traseiro Esquerdo - TWI (%)
                    </label>
                    <input
                      type="number"
                      disabled={isViewMode}
                      value={tires.rearLeftTwi}
                      onChange={(e) =>
                        handleChangeTire('rearLeftTwi', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold">
                      Traseiro Direito - Marca
                    </label>
                    <input
                      type="text"
                      disabled={isViewMode}
                      value={tires.rearRightBrand}
                      onChange={(e) =>
                        handleChangeTire('rearRightBrand', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      Traseiro Direito - TWI (%)
                    </label>
                    <input
                      type="number"
                      disabled={isViewMode}
                      value={tires.rearRightTwi}
                      onChange={(e) =>
                        handleChangeTire('rearRightTwi', e.target.value)
                      }
                      className="w-full p-2 border rounded disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* LIMPEZA */}
              <div className="p-4 border rounded-lg mt-6 space-y-2">
                <h3 className="font-bold text-lg">Limpeza</h3>
                <CleanItem label="Bancos" itemKey="seats" />
                <CleanItem label="Teto" itemKey="ceiling" />
                <CleanItem label="Exterior" itemKey="exterior" />
              </div>

              {/* DANOS */}
              <div className="p-4 border rounded-lg mt-6 space-y-2">
                <h3 className="font-bold text-lg">Danos encontrados</h3>

                {!isViewMode && (
                  <div className="bg-gray-50 p-3 rounded-lg flex flex-col gap-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold">
                          Local / tipo de dano
                        </label>
                        <input
                          type="text"
                          value={newDamage.location}
                          onChange={(e) =>
                            setNewDamage((prev) => ({
                              ...prev,
                              location: e.target.value,
                            }))
                          }
                          className="w-full p-2 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold">
                          Valor estimado (R$)
                        </label>
                        <input
                          type="text"
                          value={newDamage.estimatedCost}
                          onChange={(e) =>
                            setNewDamage((prev) => ({
                              ...prev,
                              estimatedCost: e.target.value,
                            }))
                          }
                          className="w-full p-2 border rounded text-sm"
                          placeholder="Ex: 250,00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold">
                        Descrição detalhada
                      </label>
                      <textarea
                        rows={3}
                        value={newDamage.description}
                        onChange={(e) =>
                          setNewDamage((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="text-xs font-semibold block">
                          Responsável
                        </label>
                        <select
                          value={newDamage.responsible}
                          onChange={(e) =>
                            setNewDamage((prev) => ({
                              ...prev,
                              responsible: e.target.value,
                            }))
                          }
                          className="p-2 border rounded text-sm"
                        >
                          <option value="driver">Motorista</option>
                          <option value="company">Locadora</option>
                        </select>
                      </div>

                      <label className="bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-700 cursor-pointer">
                        Anexar foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoSelect}
                        />
                      </label>

                      {newDamage.photoName && (
                        <span className="text-xs text-gray-700 flex items-center gap-1">
                          <i className="fas fa-paperclip" />
                          {newDamage.photoName}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleAddDamage}
                        className="ml-auto bg-green-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-700"
                      >
                        Adicionar dano
                      </button>
                    </div>
                  </div>
                )}

                {damages.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhum dano registrado.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {damages.map((damage, index) => (
                      <li
                        key={damage.id || index}
                        className="bg-gray-50 p-3 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {damage.location || 'Dano'} — {damage.description}
                          </p>
                          <p className="text-xs text-gray-600">
                            Valor:{' '}
                            {`R$ ${Number(
                              damage.estimatedCost || 0
                            ).toFixed(2)}`}{' '}
                            • Responsável:{' '}
                            {damage.responsible === 'company'
                              ? 'Locadora'
                              : 'Motorista'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {damage.photoURL && (
                            <a
                              href={damage.photoURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              Ver foto
                            </a>
                          )}
                          {!isViewMode && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDamage(index)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ASSINATURA + DEVOLUÇÃO */}
          {!isViewMode && (
            <>
              <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-700 mb-2">
                  Assinatura do motorista (use o dedo ou o mouse):
                </p>
                <div className="border rounded bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={180}
                    className="w-full h-40"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 gap-2">
                  <label className="flex items-start text-xs text-gray-600">
                    <input
                      type="checkbox"
                      className="mr-2 mt-0.5"
                      checked={signatureChecked}
                      onChange={(e) => setSignatureChecked(e.target.checked)}
                    />
                    <span>
                      Declaro que recebi o veículo nas condições descritas neste
                      checklist.
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                  >
                    Limpar assinatura
                  </button>
                </div>
              </div>

              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Devolução do veículo
                    </p>
                    {returnChecked && returnDate ? (
                      <p className="text-xs text-gray-600">
                        Devolução conferida em {formatDateTimeBR(returnDate)}.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Ainda não registrado. Quando o veículo retornar e
                        estiver tudo conforme, clique em &quot;Registrar
                        devolução&quot;.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRegisterReturnNow}
                    className="self-start sm:self-auto bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-700"
                  >
                    Registrar devolução agora
                  </button>
                </div>
              </div>
            </>
          )}

          {isViewMode && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Assinatura do motorista
              </p>
              {signatureDataURL ? (
                <img
                  src={signatureDataURL}
                  alt="Assinatura do motorista"
                  className="border rounded bg-white mx-auto max-h-32"
                />
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Assinatura não disponível.
                </p>
              )}

              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700">
                  Status da devolução
                </p>
                {returnChecked && returnDate ? (
                  <p className="text-xs text-gray-600">
                    Devolução conferida em {formatDateTimeBR(returnDate)}.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Devolução ainda não registrada neste checklist.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTÕES FINAIS */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t no-print">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600"
          >
            {isViewMode ? 'Fechar' : 'Cancelar'}
          </button>
          {!isViewMode && (
            <button
              onClick={handleSubmit}
              disabled={isUploading}
              className="w-full sm:w-auto bg-blue-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-800 disabled:opacity-60"
            >
              {isUploading ? 'Salvando...' : 'Salvar Checklist'}
            </button>
          )}
        </div>
      </div>

      {/* LAYOUT "OCULTO" PARA PDF (reaproveitando os estados) */}
      {isViewMode && (
        <div
          id="checklist-print-layout"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: 'white',
            padding: '10mm',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div style={{ marginBottom: '8mm' }}>
            <h1
              style={{
                fontSize: '18pt',
                fontWeight: 'bold',
                borderBottom: '1px solid #ddd',
                paddingBottom: '5px',
              }}
            >
              Relatório de Vistoria - {carName}
            </h1>
            <p style={{ fontSize: '10pt', color: '#555' }}>
              Criado em:{' '}
              {createdAt
                ? createdAt.toLocaleString('pt-BR')
                : 'Data não disponível'}
            </p>
          </div>

          <div style={{ marginBottom: '8mm' }}>
            <h2
              style={{
                fontSize: '14pt',
                borderTop: '1px solid #eee',
                paddingTop: '10px',
              }}
            >
              Dados da Entrega
            </h2>
            <p>
              <strong>Motorista:</strong> {driverName}
            </p>
            <p>
              <strong>Contato de Emergência 1:</strong> {emergencyContact1}
            </p>
            <p>
              <strong>Contato de Emergência 2:</strong> {emergencyContact2}
            </p>
            <p>
              <strong>Hodômetro:</strong> {hodometro} km
            </p>
            <p>
              <strong>Nível de Combustível:</strong>{' '}
              {translationMap[fuelLevel] || fuelLevel}
            </p>
          </div>

          <div style={{ marginBottom: '8mm' }}>
            <h2
              style={{
                fontSize: '14pt',
                borderTop: '1px solid #eee',
                paddingTop: '10px',
              }}
            >
              Itens de Verificação
            </h2>
            <table
              style={{
                width: '100%',
                fontSize: '10pt',
                borderCollapse: 'collapse',
              }}
            >
              <tbody>
                {Object.entries(vehicleItems).map(([key, value]) => (
                  <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}>
                      {translationMap[key] || key}
                    </td>
                    <td
                      style={{
                        padding: '4px',
                        fontWeight: 'bold',
                        color: value === 'ok' ? 'green' : 'red',
                      }}
                    >
                      {translationMap[value] || String(value || '').toUpperCase()}
                    </td>
                  </tr>
                ))}
                {Object.entries(cleaning).map(([key, value]) => (
                  <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}>
                      Limpeza {translationMap[key] || key}
                    </td>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ pageBreakInside: 'avoid', marginTop: '10mm' }}>
            <h2
              style={{
                fontSize: '14pt',
                borderTop: '1px solid #eee',
                paddingTop: '10px',
              }}
            >
              Estado dos Pneus
            </h2>
            <table
              style={{
                width: '100%',
                fontSize: '10pt',
                borderCollapse: 'collapse',
                marginTop: '5mm',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '4px' }}>Posição</th>
                  <th style={{ padding: '4px' }}>Marca</th>
                  <th style={{ padding: '4px' }}>TWI %</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px' }}>Dianteiro Direito</td>
                  <td style={{ padding: '4px' }}>
                    {tires.frontRightBrand}
                  </td>
                  <td style={{ padding: '4px' }}>
                    {tires.frontRightTwi}%
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px' }}>Dianteiro Esquerdo</td>
                  <td style={{ padding: '4px' }}>
                    {tires.frontLeftBrand}
                  </td>
                  <td style={{ padding: '4px' }}>
                    {tires.frontLeftTwi}%
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px' }}>Traseiro Direito</td>
                  <td style={{ padding: '4px' }}>
                    {tires.rearRightBrand}
                  </td>
                  <td style={{ padding: '4px' }}>
                    {tires.rearRightTwi}%
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px' }}>Traseiro Esquerdo</td>
                  <td style={{ padding: '4px' }}>
                    {tires.rearLeftBrand}
                  </td>
                  <td style={{ padding: '4px' }}>
                    {tires.rearLeftTwi}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

window.DeliveryChecklistModal = DeliveryChecklistModal;
})();

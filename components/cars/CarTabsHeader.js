;(function(){
// src/components/cars/CarTabsHeader.js
const CarTabsHeader = ({
  isAdmin,
  activeTab,
  setActiveTab,
  onCreateRoutineChecklist,
  onCreateDeliveryChecklist,
  onCreatePendency,
  onCreateMaintenance,
  onCreateService,
  onCreateReminder,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 border-b">
      {/* TABS */}
      <div className="flex flex-wrap justify-center md:justify-start">
        <button
          onClick={() => setActiveTab("checklists")}
          className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
            activeTab === "checklists"
              ? "tab-active"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Vistorias
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("financial")}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === "financial"
                ? "tab-active"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Financeiro
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab("pendings")}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === "pendings"
                ? "tab-active"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Pendências
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === "maintenance"
                ? "tab-active"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Manutenção
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab("services")}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === "services"
                ? "tab-active"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Serviços
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab("reminders")}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === "reminders"
                ? "tab-active"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Lembretes
          </button>
        )}
      </div>

      {/* BOTÕES DE AÇÃO POR ABA */}
      <div className="mt-4 md:mt-0 flex flex-wrap gap-2 justify-center">
        {isAdmin && activeTab === "checklists" && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={onCreateRoutineChecklist}
              className="flex-grow bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 text-sm"
            >
              <i className="fas fa-clipboard-list mr-2"></i>
              Vistoria Rotineira
            </button>
            <button
              onClick={onCreateDeliveryChecklist}
              className="flex-grow bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
            >
              <i className="fas fa-key mr-2"></i>
              Entrega/Devolução
            </button>
          </div>
        )}

        {isAdmin && activeTab === "pendings" && (
          <button
            onClick={onCreatePendency}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
          >
            <i className="fas fa-plus mr-2"></i>
            Adicionar Pendência
          </button>
        )}

        {isAdmin && activeTab === "maintenance" && (
          <button
            onClick={onCreateMaintenance}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
          >
            <i className="fas fa-plus mr-2"></i>
            Adicionar Manutenção
          </button>
        )}

        {isAdmin && activeTab === "services" && (
          <button
            onClick={onCreateService}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
          >
            <i className="fas fa-plus mr-2"></i>
            Adicionar Serviço
          </button>
        )}

        {isAdmin && activeTab === "reminders" && (
          <button
            onClick={onCreateReminder}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
          >
            <i className="fas fa-plus mr-2"></i>
            Criar Lembrete
          </button>
        )}
      </div>
    </div>
  );
};

window.CarTabsHeader = React.memo(CarTabsHeader);

})();

;(function(){
// src/components/cars/CarChecklistsTab.js
const { useMemo } = React;

const LABELS = {
  delivery: "Vistorias de Entrega",
  return: "Vistorias de Devolução",
  routine: "Vistorias Rotineiras",
  laudo: "Laudos / Orçamentos",
  legacy: "Vistorias (Entrega/Devolução - antigo)",
  other: "Outros tipos de Vistoria",
};

const TYPE_BADGE = {
  delivery: { label: "Entrega", className: "bg-blue-100 text-blue-800" },
  return: { label: "Devolução", className: "bg-indigo-100 text-indigo-800" },
  routine: { label: "Rotina", className: "bg-green-100 text-green-800" },
  laudo: { label: "Laudo", className: "bg-orange-100 text-orange-800" },
  legacy: {
    label: "Entrega/Devolução (antigo)",
    className: "bg-gray-100 text-gray-800",
  },
  other: { label: "Outro", className: "bg-gray-100 text-gray-800" },
};

function classifyType(type) {
  if (type === "delivery") return "delivery";
  if (type === "return") return "return";
  if (type === "routine") return "routine";
  if (type === "laudo" || type === "budget" || type === "orcamento")
    return "laudo";
  if (type === "delivery_return") return "legacy";
  return "other";
}

const CarChecklistsTab = ({
  checklists = [],
  isAdmin,
  onViewChecklist,
  onRequestDeleteChecklist,
}) => {
  const grouped = useMemo(() => {
    const groups = {
      delivery: [],
      return: [],
      routine: [],
      laudo: [],
      legacy: [],
      other: [],
    };

    const sorted = [...checklists].sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
      const db = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      return db - da;
    });

    for (const cl of sorted) {
      const t = classifyType(cl.type);
      groups[t].push(cl);
    }

    return groups;
  }, [checklists]);

  const renderChecklistCard = (cl) => {
    const t = classifyType(cl.type);
    const badge = TYPE_BADGE[t] || TYPE_BADGE.other;

    const damages = Array.isArray(cl.damages) ? cl.damages : [];
    const damageCount = damages.length;
    const totalDamageCost = damages.reduce(
      (sum, d) => sum + (Number(d.estimatedCost || d.cost || 0) || 0),
      0
    );

    const dateStr = formatDate(cl.date);
    const driverName = cl.driverName || "Não informado";

    return (
      <div
        key={cl.id}
        className="bg-white shadow-sm rounded-lg p-3 sm:p-4 border border-gray-100 flex flex-col gap-2"
      >
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-xs text-gray-500">Data</p>
            <p className="text-sm font-semibold text-gray-800">{dateStr}</p>
            <p className="text-xs text-gray-500 mt-1">
              Motorista: <span className="font-medium">{driverName}</span>
            </p>
          </div>

          <span
            className={
              "px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide " +
              badge.className
            }
          >
            {badge.label}
          </span>
        </div>

        {/* DANOS */}
        <div className="mt-1 text-xs text-gray-600 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <i className="fas fa-exclamation-triangle text-red-400" />
            {damageCount === 0
              ? "Sem danos registrados"
              : `${damageCount} dano(s) registrado(s)`}
          </span>

          {totalDamageCost > 0 && (
            <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
              💰 Total estimado: {formatCurrency(totalDamageCost)}
            </span>
          )}
        </div>

        {/* AÇÕES */}
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={() => onViewChecklist?.(cl)}
            className="text-xs px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1"
          >
            <i className="fas fa-eye" />
            Ver
          </button>

          {isAdmin && (
            <button
              onClick={() => onRequestDeleteChecklist?.(cl)}
              className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 flex items-center gap-1"
            >
              <i className="fas fa-trash-alt" />
              Excluir
            </button>
          )}
        </div>
      </div>
    );
  };

  const sectionsOrder = ["delivery", "return", "routine", "laudo", "legacy", "other"];

  const hasAny = sectionsOrder.some((key) => grouped[key].length > 0);

  if (!hasAny) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Nenhuma vistoria registrada para este veículo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sectionsOrder.map((key) => {
        const list = grouped[key];
        if (!list.length) return null;

        return (
          <section key={key}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-800">
                {LABELS[key]}
              </h3>
              <span className="text-[11px] text-gray-400">
                {list.length} registro(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map(renderChecklistCard)}
            </div>
          </section>
        );
      })}
    </div>
  );
};

window.CarChecklistsTab = CarChecklistsTab;

})();

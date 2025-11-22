const toDate = (value) => {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    if (value instanceof Date) return value;
    return new Date(value);
};

const formatDate = (value) => {
    const date = toDate(value);
    if (!date || Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
};

const ServicesTable = ({ services = [], onDelete, isAdmin }) => {
    if (!services.length) {
        return <p className="text-center text-gray-500 py-4">Nenhum serviço executado para este veículo.</p>;
    }

    return (
        <div className="space-y-4">
            {services.map((service) => (
                <div key={service.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <p className="text-lg font-semibold text-gray-900">{service.serviceName}</p>
                            <p className="text-sm text-gray-500">
                                {formatDate(service.date)}{service.mileage && ` • ${service.mileage} km`}
                            </p>
                            {service.performedBy && (
                                <p className="text-sm text-gray-500">Responsável: {service.performedBy}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-blue-700">R$ {Number(service.cost || 0).toFixed(2)}</span>
                            {isAdmin && (
                                <button
                                    onClick={() => onDelete?.(service)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Apagar registro"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            )}
                        </div>
                    </div>
                    {service.description && (
                        <p className="text-gray-700 mt-2 whitespace-pre-line">{service.description}</p>
                    )}
                </div>
            ))}
        </div>
    );
};

window.ServicesTable = ServicesTable;

;(function () {
  // src/components/CarServicesTab.js

  const { formatDate, formatCurrency } = window;

  const safeFormatDate = function (value) {
    if (typeof formatDate === "function") return formatDate(value);
    if (!value) return "";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("pt-BR");
    } catch (e) {
      return "";
    }
  };

  const safeFormatCurrency = function (value) {
    if (typeof formatCurrency === "function") return formatCurrency(value);
    const n = Number(value || 0);
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const CarServicesTab = function (props) {
    const services = props.services || [];
    const onEditService = props.onEditService;
    const onDeleteService = props.onDeleteService;

    // Sem serviços
    if (!services.length) {
      return React.createElement(
        "div",
        { className: "text-gray-500 text-sm mt-2" },
        "Nenhum serviço cadastrado para este veículo."
      );
    }

    return React.createElement(
      "div",
      { className: "mt-4 overflow-x-auto" },
      React.createElement(
        "table",
        { className: "min-w-full divide-y divide-gray-200 text-sm" },
        React.createElement(
          "thead",
          { className: "bg-gray-50" },
          React.createElement(
            "tr",
            null,
            React.createElement(
              "th",
              {
                scope: "col",
                className:
                  "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Data"
            ),
            React.createElement(
              "th",
              {
                scope: "col",
                className:
                  "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Descrição"
            ),
            React.createElement(
              "th",
              {
                scope: "col",
                className:
                  "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Oficina"
            ),
            React.createElement(
              "th",
              {
                scope: "col",
                className:
                  "px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Valor"
            ),
            React.createElement(
              "th",
              {
                scope: "col",
                className:
                  "px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Status"
            ),
            React.createElement(
              "th",
              {
                scope: "col",
                className:
                  "px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Ações"
            )
          )
        ),
        React.createElement(
          "tbody",
          { className: "bg-white divide-y divide-gray-200" },
          services.map(function (service) {
            var id = service.id || service.serviceId || Math.random().toString(36);
            var date = safeFormatDate(service.date || service.createdAt);
            var description = service.description || service.title || "";
            var workshop =
              service.workshopName ||
              service.workshop ||
              service.provider ||
              "";
            var value = safeFormatCurrency(service.cost || service.value || 0);
            var status = service.status || "—";

            return React.createElement(
              "tr",
              { key: id },
              React.createElement(
                "td",
                { className: "px-4 py-2 whitespace-nowrap text-gray-700" },
                date
              ),
              React.createElement(
                "td",
                { className: "px-4 py-2 whitespace-nowrap text-gray-700" },
                description
              ),
              React.createElement(
                "td",
                { className: "px-4 py-2 whitespace-nowrap text-gray-700" },
                workshop
              ),
              React.createElement(
                "td",
                {
                  className:
                    "px-4 py-2 whitespace-nowrap text-right text-gray-700",
                },
                value
              ),
              React.createElement(
                "td",
                {
                  className:
                    "px-4 py-2 whitespace-nowrap text-center text-gray-700",
                },
                status
              ),
              React.createElement(
                "td",
                {
                  className:
                    "px-4 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2",
                },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className:
                      "inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50",
                    onClick: function () {
                      if (typeof onEditService === "function") {
                        onEditService(service);
                      }
                    },
                  },
                  "Editar"
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className:
                      "inline-flex items-center px-2 py-1 border border-red-300 rounded-md text-xs text-red-600 hover:bg-red-50",
                    onClick: function () {
                      if (typeof onDeleteService === "function") {
                        onDeleteService(service.id || service);
                      }
                    },
                  },
                  "Excluir"
                )
              )
            );
          })
        )
      )
    );
  };

  window.CarServicesTab = CarServicesTab;
})();

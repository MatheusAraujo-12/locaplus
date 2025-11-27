;(function () {
  const { useEffect, useState } = React;

  const ExpenseFormModal = ({
    onClose,
    onSave,
    expenseToEdit = null,
    defaultCategory = "Manutenção",
    isCategoryLocked = false,
    maintenanceItems = [],
    workshops = [],
    companyId,
    onCreateMaintenanceItem, // callback para criar novo item no catálogo
  }) => {
    const [selectedItems, setSelectedItems] = useState([]);
    const [formData, setFormData] = useState({
      date: new Date().toISOString().slice(0, 10),
      cost: "0.00",
      category: defaultCategory,
      customCategory: "",
      description: "",
      workshopId: "",
    });
    const [isCostManual, setIsCostManual] = useState(false);

    // Popup para novo item (Peça/Serviço)
    const [showNewItemModal, setShowNewItemModal] = useState(false);
    const [newItemDraft, setNewItemDraft] = useState({
      name: "",
      price: "",
      type: "Peça",
    });
    const [isSavingNewItem, setIsSavingNewItem] = useState(false);

    const expenseCategories = [
      "Manutenção",
      "Funilaria",
      "Impostos",
      "Seguro",
      "Limpeza",
      "Outros",
    ];

    useEffect(() => {
      if (expenseToEdit) {
        setFormData({
          date:
            expenseToEdit.date || new Date().toISOString().slice(0, 10),
          cost: expenseToEdit.cost
            ? Number(expenseToEdit.cost).toFixed(2)
            : "0.00",
          category: expenseToEdit.category || defaultCategory,
          description: expenseToEdit.description || "",
          workshopId: expenseToEdit.workshopId || "",
          customCategory: "",
        });
        setSelectedItems(expenseToEdit.items || []);
        setIsCostManual(true);
      }
    }, [expenseToEdit, defaultCategory]);

    useEffect(() => {
      if (formData.category === "Manutenção" && !isCostManual) {
        const totalCost = selectedItems.reduce((sum, item) => {
          const price = Number(item.price) || 0;
          const quantity = Number(item.quantity) || 1;
          return sum + price * quantity;
        }, 0);
        setFormData((prev) => ({
          ...prev,
          cost: totalCost.toFixed(2),
        }));
      }
    }, [selectedItems, isCostManual, formData.category]);

    const handleChange = (e) => {
      const { name, value } = e.target;

      if (name === "cost") {
        setIsCostManual(true);
      }

      if (name === "category") {
        // Se mudar para categoria diferente de manutenção, limpa os itens
        if (value !== "Manutenção") {
          setSelectedItems([]);
          setIsCostManual(false);
        }
      }

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    const handleQuantityChange = (itemIndex, change) => {
      const newSelectedItems = selectedItems.map((item, index) => {
        if (index === itemIndex) {
          let newQuantity =
            typeof change === "number"
              ? (item.quantity || 1) + change
              : parseInt(change, 10);
          return {
            ...item,
            quantity: Math.max(
              1,
              isNaN(newQuantity) ? 1 : newQuantity
            ),
          };
        }
        return item;
      });
      setSelectedItems(newSelectedItems);
      setIsCostManual(false);
    };

    const handleSelectionChange = (newItems) => {
      setSelectedItems(newItems);
      setIsCostManual(false);
    };

    // Chamado pelo MultiItemSelector quando o usuário digita algo que não existe
    const handleRequestNewItem = (nameFromSearch) => {
      setNewItemDraft({
        name: nameFromSearch || "",
        price: "",
        type: "Peça",
      });
      setShowNewItemModal(true);
    };

    const handleSubmit = () => {
      const descriptionFromItems = selectedItems
        .map((item) => `${item.quantity || 1}x ${item.name}`)
        .join(", ");

      const finalDescription =
        formData.category === "Manutenção" &&
        selectedItems.length > 0
          ? descriptionFromItems
          : formData.description;

      const finalCategory =
        formData.category === "Outros" &&
        formData.customCategory.trim() !== ""
          ? formData.customCategory.trim()
          : formData.category;

      const selectedWorkshop = workshops.find(
        (w) => w.id === formData.workshopId
      );

      const dataToSave = {
        id: expenseToEdit ? expenseToEdit.id : undefined,
        date: formData.date,
        description: finalDescription,
        cost: Number(formData.cost) || 0,
        category: finalCategory,
        items: selectedItems.map(
          ({ id, name, price, quantity, type }) => ({
            id,
            name,
            price,
            quantity,
            type,
          })
        ),
        itemIds: selectedItems.map((item) => item.id),
        workshopId: formData.workshopId,
        workshopName: selectedWorkshop ? selectedWorkshop.name : "",
        companyId: companyId,
      };

      onSave(dataToSave);
    };

    const handleConfirmNewItem = async () => {
      const trimmedName = (newItemDraft.name || "").trim();
      if (!trimmedName) return;

      if (!onCreateMaintenanceItem) {
        console.warn(
          "onCreateMaintenanceItem não foi passado para ExpenseFormModal."
        );
        setShowNewItemModal(false);
        return;
      }

      setIsSavingNewItem(true);
      try {
        const created = await onCreateMaintenanceItem(newItemDraft);
        if (created) {
          setSelectedItems((prev) => [
            ...prev,
            { ...created, quantity: 1 },
          ]);
        }
        setShowNewItemModal(false);
      } catch (e) {
        console.error(
          "Erro ao criar novo item de manutenção pelo modal:",
          e
        );
      } finally {
        setIsSavingNewItem(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {expenseToEdit ? "Editar" : "Adicionar nova"}{" "}
            {isCategoryLocked ? "manutenção" : "despesa"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
            />

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={isCategoryLocked}
              className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200"
            >
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {(formData.category === "Manutenção" ||
              formData.category === "Funilaria") && (
              <select
                name="workshopId"
                value={formData.workshopId}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 md:col-span-2"
              >
                <option value="">
                  Selecione uma oficina (opcional)
                </option>
                {workshops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            )}

            {formData.category === "Outros" && !isCategoryLocked && (
              <input
                type="text"
                name="customCategory"
                placeholder="Digite a categoria personalizada"
                value={formData.customCategory}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 md:col-span-2"
              />
            )}

            {formData.category === "Manutenção" ? (
              <MultiItemSelector
                allItems={maintenanceItems}
                selectedItems={selectedItems}
                onSelectionChange={handleSelectionChange}
                onQuantityChange={handleQuantityChange}
                onRequestNewItem={handleRequestNewItem}
              />
            ) : (
              <input
                type="text"
                name="description"
                placeholder="Descrição da despesa"
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 md:col-span-2"
              />
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo total (R$)
              </label>
              <input
                type="number"
                name="cost"
                placeholder="Custo total (R$)"
                value={formData.cost}
                onChange={handleChange}
                step="0.01"
                className="w-full bg-gray-100 p-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={onClose}
              className="w-full bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="w-full bg-blue-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900"
            >
              Salvar
            </button>
          </div>
        </div>

        {/* POPUP: cadastrar nova peça/serviço usando o texto digitado */}
        {showNewItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4 text-gray-800">
                Cadastrar novo item
              </h3>
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={newItemDraft.name}
                  onChange={(e) =>
                    setNewItemDraft((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-100 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do item"
                />
                <input
                  type="number"
                  value={newItemDraft.price}
                  onChange={(e) =>
                    setNewItemDraft((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-100 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                  placeholder="Preço (R$)"
                />
                <select
                  value={newItemDraft.type}
                  onChange={(e) =>
                    setNewItemDraft((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-100 p-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Peça">Peça</option>
                  <option value="Serviço">Serviço (mão de obra)</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowNewItemModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmNewItem}
                  disabled={isSavingNewItem}
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold disabled:bg-blue-400"
                >
                  {isSavingNewItem ? "Salvando..." : "Salvar item"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  window.ExpenseFormModal = ExpenseFormModal;
})();

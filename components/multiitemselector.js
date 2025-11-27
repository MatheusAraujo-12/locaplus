;(function () {
// components/MultiItemSelector.js

const MultiItemSelector = ({
  allItems,
  selectedItems,
  onSelectionChange,
  onQuantityChange,
  onRequestNewItem, // <-- vem do ExpenseFormModal
}) => {
  const { useEffect, useMemo, useRef, useState } = React;
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const availableItems = useMemo(() => {
    const selectedIds = new Set(selectedItems.map((item) => item.id));
    return allItems.filter((item) => !selectedIds.has(item.id));
  }, [allItems, selectedItems]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return availableItems;
    const q = searchTerm.toLowerCase();
    return availableItems.filter((item) =>
      (item.name || "").toLowerCase().includes(q)
    );
  }, [searchTerm, availableItems]);

  const handleAddItem = (item) => {
    onSelectionChange([...selectedItems, { ...item, quantity: 1 }]);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const handleRemoveItem = (itemToRemove) => {
    onSelectionChange(
      selectedItems.filter((item) => item.id !== itemToRemove.id)
    );
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);

  const handleRequestNewItemClick = () => {
    if (!onRequestNewItem || !searchTerm.trim()) return;
    onRequestNewItem(searchTerm.trim());
  };

  return (
    <div className="relative md:col-span-2" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Itens/Serviços
      </label>

      <div className="w-full bg-gray-100 p-2 rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 flex flex-col gap-2 min-h-[48px]">
        {/* Itens selecionados */}
        <div className="flex flex-col gap-2">
          {selectedItems.map((item, index) => (
            <div
              key={item.id || index}
              className="bg-blue-100 text-blue-900 flex items-center justify-between gap-2 px-3 py-2 rounded"
            >
              <span className="text-sm font-medium flex-grow">
                {item.name}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onQuantityChange(index, -1)}
                  className="font-bold text-lg w-6 h-6 rounded bg-blue-200 hover:bg-blue-300"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onQuantityChange(index, e.target.value)}
                  className="w-12 text-center font-semibold bg-white rounded border border-blue-200 p-0 h-6"
                />
                <button
                  type="button"
                  onClick={() => onQuantityChange(index, 1)}
                  className="font-bold text-lg w-6 h-6 rounded bg-blue-200 hover:bg-blue-300"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveItem(item)}
                className="text-red-500 hover:text-red-700 font-bold text-xl ml-2"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        {/* Campo de busca / add */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder={
            selectedItems.length === 0
              ? "Pesquise e selecione os itens..."
              : "+ Adicionar mais itens"
          }
          className="w-full bg-transparent focus:outline-none p-1"
        />
      </div>

      {/* Dropdown de resultados */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border mt-1 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleAddItem(item)}
                className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
              >
                <span>{item.name}</span>
                <span className="text-sm text-gray-500">
                  {formatCurrency(item.price)}
                </span>
              </div>
            ))
          ) : (
            <div className="p-3 text-gray-500 space-y-2">
              <div>Nenhum item encontrado.</div>
              {onRequestNewItem && searchTerm.trim() && (
                <button
                  type="button"
                  onClick={handleRequestNewItemClick}
                  className="w-full bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Cadastrar novo item "{searchTerm.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

window.MultiItemSelector = MultiItemSelector;
})();

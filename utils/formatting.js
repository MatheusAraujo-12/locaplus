;(function () {
  // src/utils/formatting.js
  // Utilidades de formatação expostas em window para uso sem bundler.

  /** Converte Firestore Timestamp, Date, string ou null em objeto Date */
  function parseDate(value) {
    if (!value) return null;

    // Firestore Timestamp
    if (value?.toDate) return value.toDate();

    // Já é Date
    if (value instanceof Date) return value;

    // String com formato de data
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Formata data para DD/MM/YYYY */
  function formatDate(value) {
    const d = parseDate(value);
    if (!d) return "-";

    return d.toLocaleDateString("pt-BR");
  }

  /** Formata número para R$ 0,00 */
  function formatCurrency(value) {
    const num = Number(value || 0);
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  // Disponíveis globalmente
  window.parseDate = parseDate;
  window.formatDate = formatDate;
  window.formatCurrency = formatCurrency;
  window.formattingUtils = { parseDate, formatDate, formatCurrency };
})();

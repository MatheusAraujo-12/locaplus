;(function () {
  // src/utils/formatting.js
  // Utilidades de formatação e cálculo financeiro expostas em window para uso sem bundler.

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

  /**
   * Calcula o rateio do lucro entre EMPRESA e PROPRIETÁRIO.
   *
   * @param {number} netProfit  Lucro líquido total
   * @param {object} options
   *    - mode: "percentage" | "fixed"
   *        "percentage" → empresa recebe uma porcentagem do lucro
   *        "fixed"      → empresa recebe um valor fixo em R$
   *    - companyPercent: número (0–100) quando mode = "percentage"
   *    - companyFixedValue: número (R$) quando mode = "fixed"
   *
   * @returns {object} { netProfit, companyAmount, ownerAmount }
   */
  function calculateCompanyShare(netProfit, options = {}) {
    const safeProfit = Number(netProfit) || 0;
    const {
      mode = "percentage",      // "percentage" ou "fixed"
      companyPercent = 0,       // % do lucro para a empresa
      companyFixedValue = 0,    // valor fixo para a empresa
    } = options;

    // Se não há lucro, ninguém recebe nada
    if (safeProfit <= 0) {
      return {
        netProfit: safeProfit,
        companyAmount: 0,
        ownerAmount: 0,
      };
    }

    let companyAmount = 0;
    let ownerAmount = 0;

    if (mode === "fixed") {
      // Empresa recebe um valor fixo em R$ (limitado ao lucro)
      const fixed = Math.max(Number(companyFixedValue) || 0, 0);
      companyAmount = Math.min(fixed, safeProfit);
      ownerAmount = safeProfit - companyAmount;
    } else {
      // Default: empresa recebe uma porcentagem do lucro líquido
      const pct = Math.min(Math.max(Number(companyPercent) || 0, 0), 100);
      companyAmount = safeProfit * (pct / 100);
      ownerAmount = safeProfit - companyAmount;
    }

    return {
      netProfit: safeProfit,
      companyAmount,
      ownerAmount,
    };
  }

  // Disponíveis globalmente
  window.parseDate = parseDate;
  window.formatDate = formatDate;
  window.formatCurrency = formatCurrency;
  window.calculateCompanyShare = calculateCompanyShare;

  window.formattingUtils = {
    parseDate,
    formatDate,
    formatCurrency,
    calculateCompanyShare,
  };
})();

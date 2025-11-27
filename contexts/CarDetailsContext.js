;(function () {
  // src/contexts/CarDetailsContext.js
  // Contexto exposto globalmente para uso sem imports nem JSX.

  const { createContext, useContext } = React;

  // Cria o contexto
  const CarDetailsContext = createContext(null);

  /**
   * Provider do contexto.
   * Como estamos usando JS puro, o Provider é diretamente o Provider interno do React.
   * Ele será usado via React.createElement no CarDetailsPage.js.
   */
  const CarDetailsProvider = CarDetailsContext.Provider;

  /**
   * Hook de acesso ao contexto
   */
  const useCarDetails = function () {
    const ctx = useContext(CarDetailsContext);
    if (!ctx) {
      console.warn(
        "⚠️ useCarDetails foi usado fora de um CarDetailsProvider."
      );
    }
    return ctx;
  };

  // Expõe no escopo global
  window.CarDetailsContext = CarDetailsContext;
  window.CarDetailsProvider = CarDetailsProvider;
  window.useCarDetails = useCarDetails;

})();

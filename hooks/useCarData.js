;(function () {
  // src/hooks/useCarData.js
  // Hook de carregamento de dados do carro exposto globalmente.

  const { useEffect, useState } = React;

  function useCarData({ db, basePath, carId, goBack }) {
    const { doc, onSnapshot, query, collection, orderBy } = window.firebase || {};

    const [selectedCar, setSelectedCar] = useState(null);
    const [drivers, setDrivers] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [maintenanceItems, setMaintenanceItems] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [revenues, setRevenues] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [services, setServices] = useState([]);
    const [pendings, setPendings] = useState([]);
    const [accessDenied, setAccessDenied] = useState(false);
    const [loading, setLoading] = useState(true);

    // Carro em si
    useEffect(() => {
      if (!db || !basePath || !carId) return;

      const carRef = doc(db, `${basePath}/cars`, carId);
      const unsub = onSnapshot(carRef, (snap) => {
        if (snap.exists()) {
          setSelectedCar({ id: snap.id, ...snap.data() });
          setAccessDenied(false);
        } else if (goBack) {
          goBack();
        }
        setLoading(false);
      });

      return unsub;
    }, [db, basePath, carId, goBack]);

    // Motoristas
    useEffect(() => {
      if (!db || !basePath) return;
      const qDrivers = query(collection(db, `${basePath}/drivers`));
      return onSnapshot(qDrivers, (s) =>
        setDrivers(s.docs.map((d) => ({ id: d.id, name: d.data().name })))
      );
    }, [db, basePath]);

    // Itens de manutenção
    useEffect(() => {
      if (!db || !basePath) return;
      const qItems = query(
        collection(db, `${basePath}/maintenanceItems`),
        orderBy("name")
      );
      return onSnapshot(qItems, (s) =>
        setMaintenanceItems(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    }, [db, basePath]);

    // Oficinas
    useEffect(() => {
      if (!db || !basePath) return;
      const qWorkshops = query(
        collection(db, `${basePath}/workshops`),
        orderBy("name")
      );
      return onSnapshot(qWorkshops, (s) =>
        setWorkshops(s.docs.map((d) => ({ id: d.id, name: d.data().name })))
      );
    }, [db, basePath]);

    // Despesas
    useEffect(() => {
      if (!db || !basePath || !selectedCar) return;
      const q = query(
        collection(db, `${basePath}/cars/${selectedCar.id}/expenses`),
        orderBy("date", "desc")
      );
      return onSnapshot(q, (s) =>
        setExpenses(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    }, [db, basePath, selectedCar]);

    // Receitas
    useEffect(() => {
      if (!db || !basePath || !selectedCar) return;
      const q = query(
        collection(db, `${basePath}/cars/${selectedCar.id}/revenues`),
        orderBy("date", "desc")
      );
      return onSnapshot(q, (s) =>
        setRevenues(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    }, [db, basePath, selectedCar]);

    // Lembretes
    useEffect(() => {
      if (!db || !basePath || !selectedCar) return;
      const q = query(
        collection(db, `${basePath}/cars/${selectedCar.id}/reminders`),
        orderBy("createdAt", "desc")
      );
      return onSnapshot(q, (s) =>
        setReminders(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    }, [db, basePath, selectedCar]);

    // Checklists
    useEffect(() => {
      if (!db || !basePath || !selectedCar) return;
      const q = query(
        collection(db, `${basePath}/cars/${selectedCar.id}/checklists`),
        orderBy("date", "desc")
      );
      return onSnapshot(q, (s) =>
        setChecklists(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    }, [db, basePath, selectedCar]);

    // Serviços
    useEffect(() => {
      if (!db || !basePath || !selectedCar) return;
      const q = query(
        collection(db, `${basePath}/cars/${selectedCar.id}/services`),
        orderBy("date", "desc")
      );
      return onSnapshot(q, (snapshot) =>
        setServices(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        )
      );
    }, [db, basePath, selectedCar]);

    // Pendências
    useEffect(() => {
      if (!db || !basePath || !selectedCar) return;
      const q = query(
        collection(db, `${basePath}/cars/${selectedCar.id}/pendings`),
        orderBy("createdAt", "desc")
      );
      return onSnapshot(q, (s) =>
        setPendings(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    }, [db, basePath, selectedCar]);

    return {
      selectedCar,
      drivers,
      workshops,
      maintenanceItems,
      expenses,
      revenues,
      reminders,
      checklists,
      services,
      pendings,
      accessDenied,
      loading,
    };
  }

  window.useCarData = useCarData;
})();

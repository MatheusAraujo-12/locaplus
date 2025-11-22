// components/App.js - VERSÃO REVISADA (modular + basePath + header title)

const App = () => {
  const { useState, useEffect, useMemo, useCallback } = React;
  const {
    initializeApp,
    getAuth,
    onAuthStateChanged,
    signOut,
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    deleteDoc,
  } = window.firebase || {};

  const [firebaseApp, setFirebaseApp] = useState(null);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);

  // init Firebase app (idempotente via window.firebaseApp)
  useEffect(() => {
    if (!window.firebase_config) {
      console.error("firebase_config ausente no window.");
      return;
    }
    if (!window.firebaseApp) {
      window.firebaseApp = initializeApp(window.firebase_config);
    }
    setFirebaseApp(window.firebaseApp);
  }, []);

  const auth = useMemo(() => (firebaseApp ? getAuth(firebaseApp) : null), [firebaseApp]);
  const db = useMemo(() => (firebaseApp ? getFirestore(firebaseApp) : null), [firebaseApp]);

  const appInstanceId = useMemo(() => window.app_instance_id, []);
  const basePath = useMemo(
    () => (userData?.companyId ? `artifacts/${appInstanceId}/users/${userData.companyId}` : null),
    [appInstanceId, userData?.companyId]
  );

  const showAlert = useCallback((message, type) => {
    setAlertMessage({ message, type });
    const t = setTimeout(() => setAlertMessage(null), 5000);
    // Nota: se quiser, limpe timeout em unmount; aqui é simples e seguro.
  }, []);

  // Auth + bootstrap do profile
  useEffect(() => {
    if (!auth || !db) return;
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          const userDocRef = doc(db, "artifacts", appInstanceId, "users", authUser.uid);
          let snap = await getDoc(userDocRef);

          if (!snap.exists()) {
            const invitationsRef = collection(db, "artifacts", appInstanceId, "invitations");
            const q = query(invitationsRef, where("email", "==", authUser.email));
            const invitationSnap = await getDocs(q);

            let profileData = {};
            if (invitationSnap.empty) {
              profileData = {
                email: authUser.email,
                createdAt: new Date(),
                role: "admin",
                companyId: authUser.uid,
                companyType: "standard",
              };
            } else {
              const invitationData = invitationSnap.docs[0].data();
              profileData = {
                email: authUser.email,
                createdAt: new Date(),
                role: invitationData.role,
                companyId: invitationData.companyId,
              };
              await deleteDoc(invitationSnap.docs[0].ref);
            }

            await setDoc(userDocRef, profileData);
            snap = await getDoc(userDocRef);
          }

          // Restringe acesso: apenas administradores podem usar o app
          const __data = snap.data();
          if (__data && __data.role && __data.role !== "admin") {
            showAlert("Acesso restrito a administradores.", "error");
            try { await signOut(auth); } catch {}
            return;
          }
          setUserData({ uid: authUser.uid, ...__data });
          setUser(authUser);
        } else {
          setUserData(null);
          setUser(null);
        }
      } catch (err) {
        console.error(err);
        showAlert("Falha ao configurar o perfil.", "error");
        try { await signOut(auth); } catch {}
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, [auth, db, appInstanceId, showAlert]);

  const navigate = useCallback((page, id = null) => {
    setCurrentPage(page);
    setSelectedId(id);
  }, []);

  if (!firebaseApp || isLoading) return <LoadingSpinner />;

  const AppContent = ({ user, userData }) => {
    const { useState, useEffect } = React;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { companyType, role, email, companyName } = userData;
    const isAdmin = role === "admin";
    const isRentalCompany = companyType === "locadora";

    useEffect(() => {
      document.body.style.overflow = isSidebarOpen ? "hidden" : "auto";
      return () => { document.body.style.overflow = "auto"; };
    }, [isSidebarOpen]);

    const handleNavigate = (page, id = null) => {
      navigate(page, id);
      setIsSidebarOpen(false);
    };

            const TITLES = {
      dashboard: "Dashboard",
      drivers: "Motoristas",
      fleet: "Minha Frota",
      carDetails: "Detalhes do Veículo",
      stock: "Estoque",
      "price-comparator": "Comparador de Preços",
      reports: "Relatórios",
    };

    let pageContent;
    switch (currentPage) {
      case "dashboard":
        pageContent = (
          <DashboardPage
            userData={userData}
            onNavigate={handleNavigate}
            db={db}
            appInstanceId={appInstanceId}
            basePath={basePath}
            showAlert={showAlert}
          />
        );
        break;
      case \"drivers\":
        pageContent = (
          <DriversPage
            userData={userData}
            onNavigate={handleNavigate}
            db={db}
            appInstanceId={appInstanceId}
            basePath={basePath}
            showAlert={showAlert}
          />
        );
        break;
      
      case "stock":
        pageContent = (
          <StockReportPage
            userData={userData}
            db={db}
            appInstanceId={appInstanceId}
            basePath={basePath}
            showAlert={showAlert}
          />
        );
        break;
      case "price-comparator":
        pageContent = (
          <PriceComparatorPage
            userData={userData}
            db={db}
            appInstanceId={appInstanceId}
            basePath={basePath}
            showAlert={showAlert}
          />
        );
        break;
      case "carDetails":
        pageContent = (
          <CarDetailsPage
            user={user}
            userData={userData}
            showAlert={showAlert}
            carId={selectedId}
            goBack={() => handleNavigate("fleet")}
            db={db}
            auth={auth}
            appInstanceId={appInstanceId}
            basePath={basePath}
          />
        );
        break;
      case "reports":
        pageContent = (
          <ReportsPage
            userData={userData}
            showAlert={showAlert}
            db={db}
            appInstanceId={appInstanceId}
            basePath={basePath}
          />
        );
        break;
      case "fleet":
      default:
        pageContent = (
          <FleetListPage
            user={user}
            userData={userData}
            showAlert={showAlert}
            onSelectCar={(id) => handleNavigate("carDetails", id)}
            db={db}
            appInstanceId={appInstanceId}
            basePath={basePath}
          />
        );
    }

    return (
      <div className="min-h-screen bg-gray-100">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar (Drawer) */}
        <div
          className={`fixed inset-y-0 left-0 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out w-64 bg-white shadow-lg flex flex-col z-30 no-print`}
        >
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-blue-900">{companyName || "Meu Painel"}</h2>
            <p className="text-sm text-gray-500">{email}</p>
            {isRentalCompany && (
              <span className="mt-2 inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Locadora
              </span>
            )}
          </div>

          <nav className="flex-grow p-4 space-y-2">
            <button
              onClick={() => handleNavigate("dashboard")}
              className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors sidebar-link ${
                currentPage === "dashboard" ? "active" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <i className="fas fa-tachometer-alt fa-fw"></i>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNavigate(\"drivers\")}
              className={w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors sidebar-link }
            >
              <i className=\"fas fa-id-card fa-fw\"></i>
              <span>Motoristas</span>
            </button>


            <button
              onClick={() => handleNavigate("stock")}
              className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors sidebar-link ${
                currentPage === "stock" ? "active" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <i className="fas fa-boxes fa-fw"></i>
              <span>Estoque</span>
            </button>

            <button
              onClick={() => handleNavigate("price-comparator")}
              className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors sidebar-link ${
                currentPage === "price-comparator" ? "active" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <i className="fas fa-tags fa-fw"></i>
              <span>Comparador</span>
            </button>

            <button
              onClick={() => handleNavigate("reports")}
              className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors sidebar-link ${
                currentPage === "reports" ? "active" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <i className="fas fa-chart-line fa-fw"></i>
              <span>Relatórios</span>
            </button>

            {false && (
              <button
                onClick={() => setShowEmployeeModal(true)}
                className="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors hover:bg-gray-100 text-gray-600"
              >
                <i className="fas fa-users fa-fw"></i>
                <span>{isRentalCompany ? "Gerir " : "Gerir Funcionários"}</span>
              </button>
            )}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={() => signOut(auth)}
              className="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors text-gray-600 hover:bg-red-50 hover:text-red-600"
            >
              <i className="fas fa-sign-out-alt fa-fw"></i>
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex flex-col flex-1 w-full">
          <header className="sticky top-0 bg-white shadow-md p-4 flex items-center justify-between z-10 no-print">
            <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 hover:text-gray-800">
              <i className="fas fa-bars text-2xl"></i>
            </button>
            <h2 className="text-lg font-bold text-blue-900">
              {TITLES[currentPage] || "Painel"}
            </h2>
            <div className="w-8" />
          </header>

          <main className="flex-1 overflow-y-auto">{pageContent}</main>
        </div>

        
      </div>
    );
  };

  return (
    <React.Fragment>
      <CustomAlert
        message={alertMessage?.message}
        type={alertMessage?.type}
        onClose={() => setAlertMessage(null)}
      />
      {user && userData ? (
        <AppContent user={user} userData={userData} />
      ) : (
        <AuthScreen
          auth={auth}
          db={db}
          appInstanceId={appInstanceId}
          showAlert={showAlert}
        />
      )}
    </React.Fragment>
  );
};



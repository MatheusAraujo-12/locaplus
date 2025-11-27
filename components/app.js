;(function(){
const { useCallback, useEffect, useState } = React;

const App = () => {
  const auth = window.firebaseAuth;
  const db = window.firebaseDb;
  const appInstanceId = window.app_instance_id || window.APP_INSTANCE_ID || "";

  const {
    onAuthStateChanged,
    signOut,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    deleteDoc,
  } = window.firebase || {};

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);

  const showAlert = useCallback((message, type) => {
    setAlertMessage({ message, type });
    setTimeout(() => setAlertMessage(null), 5000);
  }, []);

  useEffect(() => {
    if (!auth || !db || !onAuthStateChanged) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          const userDocRef = doc(
            db,
            "artifacts",
            appInstanceId,
            "users",
            authUser.uid
          );
          let snap = await getDoc(userDocRef);

          if (!snap.exists()) {
            const invitationsRef = collection(
              db,
              "artifacts",
              appInstanceId,
              "invitations"
            );
            const invitesQuery = query(
              invitationsRef,
              where("email", "==", authUser.email)
            );
            const invitationSnap = await getDocs(invitesQuery);

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

          const data = snap.data();
          if (data && data.role && data.role !== "admin") {
            showAlert("Acesso restrito a administradores.", "error");
            try {
              await signOut(auth);
            } catch (err) {
              console.error(err);
            }
            return;
          }

          setUserData({ uid: authUser.uid, ...data });
          setUser(authUser);
        } else {
          setUserData(null);
          setUser(null);
        }
      } catch (error) {
        console.error(error);
        showAlert("Falha ao configurar o perfil.", "error");
        try {
          await signOut(auth);
        } catch (err) {
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe && unsubscribe();
  }, [appInstanceId, auth, db, onAuthStateChanged, showAlert, signOut]);

  const navigate = useCallback((page, id = null) => {
    setCurrentPage(page);
    setSelectedId(id);
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const AppContent = ({ user, userData }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { companyType, email, companyName } = userData || {};
    const isRentalCompany = companyType === "locadora";

    useEffect(() => {
      document.body.style.overflow = isSidebarOpen ? "hidden" : "auto";
      return () => {
        document.body.style.overflow = "auto";
      };
    }, [isSidebarOpen]);

    const handleNavigate = (page, id = null) => {
      navigate(page, id);
      setIsSidebarOpen(false);
    };

    const TITLES = {
      dashboard: "Dashboard",
      fleet: "Minha Frota",
      drivers: "Motoristas",
      stock: "Estoque",
      "price-comparator": "Comparador",
      reports: "Relatórios",
      carDetails: "Detalhes do Veículo",
      "pendings-report": "Relatório de Pendências",
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
            showAlert={showAlert}
          />
        );
        break;

      case "drivers":
        pageContent = (
          <DriversPage
            userData={userData}
            onNavigate={handleNavigate}
            db={db}
            appInstanceId={appInstanceId}
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
            onNavigate={handleNavigate}
          />
        );
        break;

      case "pendings-report":
        pageContent = (
          <PendingsReportPage
            db={db}
            userData={userData}
            appInstanceId={appInstanceId}
            goBack={() => handleNavigate("reports")}
            showAlert={showAlert}
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

        <div
          className={`fixed inset-y-0 left-0 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out w-64 bg-white shadow-lg flex flex-col z-30 no-print`}
        >
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-blue-900">
              {companyName || "Meu Painel"}
            </h2>
            <p className="text-sm text-gray-500">{email}</p>
            {isRentalCompany && (
              <span className="mt-2 inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Locadora
              </span>
            )}
          </div>

          <nav className="flex-grow p-4 space-y-2">
            {[
              { key: "dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
              { key: "fleet", icon: "fas fa-car-side", label: "Minha Frota" },
              { key: "drivers", icon: "fas fa-id-card", label: "Motoristas" },
              { key: "stock", icon: "fas fa-boxes", label: "Estoque" },
              { key: "price-comparator", icon: "fas fa-tags", label: "Comparador" },
              { key: "reports", icon: "fas fa-chart-line", label: "Relatórios" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors sidebar-link ${
                  currentPage === item.key
                    ? "active"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <i className={`${item.icon} fa-fw`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={() => signOut && auth && signOut(auth)}
              className="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors text-gray-600 hover:bg-red-50 hover:text-red-600"
            >
              <i className="fas fa-sign-out-alt fa-fw"></i>
              <span>Sair</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 w-full">
          <header className="sticky top-0 bg-white shadow-md p-4 flex items-center justify-between z-10 no-print">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-800"
            >
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
    <>
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
    </>
  );
};

window.App = App;

})();

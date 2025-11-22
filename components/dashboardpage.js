// components/DashboardPage.js - COM TÍTULO RESPONSIVO

const DashboardPage = ({ userData, onNavigate, db, appInstanceId, showAlert }) => {
    const { useState, useEffect, useMemo } = React;
    const { collection, query, where, getDocs, onSnapshot } = window.firebase;

    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { companyId } = userData;
    const basePath = `artifacts/${appInstanceId}/users/${companyId}`;

    useEffect(() => {
        if (!db) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Obter todos os carros da frota
                const carsRef = collection(db, `${basePath}/cars`);
                const carsSnapshot = await getDocs(carsRef);
                const carsList = carsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // 2. Definir o período (mês atual)
                const now = new Date();
                const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                
                // 3. Buscar finanças e lembretes para cada carro
                const carFinancials = await Promise.all(
                    carsList.map(async (car) => {
                        let totalRevenue = 0;
                        let totalExpense = 0;
                        
                        const revenuesQuery = query(collection(db, `${basePath}/cars/${car.id}/revenues`), where("date", ">=", startDate), where("date", "<=", endDate));
                        const revenuesSnap = await getDocs(revenuesQuery);
                        revenuesSnap.forEach(doc => totalRevenue += Number(doc.data().value || 0));

                        const expensesQuery = query(collection(db, `${basePath}/cars/${car.id}/expenses`), where("date", ">=", startDate), where("date", "<=", endDate));
                        const expensesSnap = await getDocs(expensesQuery);
                        expensesSnap.forEach(doc => totalExpense += Number(doc.data().cost || 0));

                        return { ...car, totalRevenue, totalExpense, netProfit: totalRevenue - totalExpense };
                    })
                );
                
                // 4. Buscar todos os lembretes pendentes
                let allReminders = [];
                for(const car of carsList){
                    const remindersQuery = query(collection(db, `${basePath}/cars/${car.id}/reminders`), where("status", "==", "active"));
                    const remindersSnap = await getDocs(remindersQuery);
                    remindersSnap.forEach(doc => {
                        const reminder = { id: doc.id, carName: car.name, carId: car.id, ...doc.data()};
                        const isDue = (reminder.type === 'mileage' && car.currentMileage >= reminder.targetMileage) || (reminder.type === 'date' && new Date(reminder.targetDate) <= now);
                        if(isDue) allReminders.push(reminder);
                    });
                }
                
                // 5. Processar e classificar os dados
                const totalRevenue = carFinancials.reduce((sum, car) => sum + car.totalRevenue, 0);
                const totalExpense = carFinancials.reduce((sum, car) => sum + car.totalExpense, 0);
                
                carFinancials.sort((a, b) => b.netProfit - a.netProfit);
                const topProfitable = carFinancials.slice(0, 3);
                
                carFinancials.sort((a, b) => b.totalExpense - a.totalExpense);
                const topExpensive = carFinancials.slice(0, 3);

                setDashboardData({
                    totalRevenue,
                    totalExpense,
                    netProfit: totalRevenue - totalExpense,
                    topProfitable,
                    topExpensive,
                    dueReminders: allReminders
                });

            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
                if (showAlert) showAlert("Falha ao carregar o dashboard.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [db, companyId]);

    if (isLoading) {
        return <LoadingSpinner text="A carregar dashboard..." />;
    }

    if (!dashboardData) {
        return <div className="p-6 text-center text-gray-500">Não foi possível carregar os dados.</div>;
    }
    
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Dashboard Geral</h1>

            {/* KPIs Financeiros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-100 p-6 rounded-xl shadow-lg text-center"><p className="text-sm font-bold text-green-800">Receita do Mês</p><p className="text-3xl md:text-4xl font-extrabold text-green-900 mt-2">{formatCurrency(dashboardData.totalRevenue)}</p></div>
                <div className="bg-red-100 p-6 rounded-xl shadow-lg text-center"><p className="text-sm font-bold text-red-800">Despesa do Mês</p><p className="text-3xl md:text-4xl font-extrabold text-red-900 mt-2">{formatCurrency(dashboardData.totalExpense)}</p></div>
                <div className="bg-blue-100 p-6 rounded-xl shadow-lg text-center"><p className="text-sm font-bold text-blue-800">Lucro Líquido do Mês</p><p className="text-3xl md:text-4xl font-extrabold text-blue-900 mt-2">{formatCurrency(dashboardData.netProfit)}</p></div>
            </div>

            {/* Rankings e Lembretes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ranking de Rentabilidade */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold text-lg text-gray-700 mb-4 border-b pb-2">Top 3 Veículos Mais Rentáveis</h3>
                    <ul className="space-y-3">
                        {dashboardData.topProfitable.map(car => (
                            <li key={car.id} onClick={() => onNavigate('carDetails', car.id)} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <span className="font-semibold">{car.name}</span>
                                <span className="font-bold text-green-600">+ {formatCurrency(car.netProfit)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Ranking de Despesas */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold text-lg text-gray-700 mb-4 border-b pb-2">Top 3 Veículos com Mais Despesas</h3>
                     <ul className="space-y-3">
                        {dashboardData.topExpensive.map(car => (
                            <li key={car.id} onClick={() => onNavigate('carDetails', car.id)} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <span className="font-semibold">{car.name}</span>
                                <span className="font-bold text-red-600">- {formatCurrency(car.totalExpense)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Lembretes Urgentes */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold text-lg text-yellow-700 mb-4 border-b border-yellow-200 pb-2">Lembretes Urgentes</h3>
                    <ul className="space-y-3">
                        {dashboardData.dueReminders.length > 0 ? dashboardData.dueReminders.map(reminder => (
                             <li key={reminder.id} onClick={() => onNavigate('carDetails', reminder.carId)} className="p-2 rounded-lg hover:bg-yellow-50 cursor-pointer">
                                <p className="font-semibold">{reminder.description}</p>
                                <p className="text-sm text-gray-600">{reminder.carName}</p>
                            </li>
                        )) : (<p className="text-center text-gray-500 pt-4">Nenhum lembrete pendente.</p>)}
                    </ul>
                </div>
            </div>
        </div>
    );
};
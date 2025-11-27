;(function(){
const AuthScreen = ({ showAlert, auth }) => {
  const { useState } = React;
  const {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
  } = window.firebase;

  const [view, setView] = useState('login');
  const [companyType, setCompanyType] = useState('standard');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    cnpj: '',
    address: '',
    rentalWebsite: '',
    rentalPhone: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleRegister = async () => {
    if (formData.password !== formData.confirmPassword)
      return showAlert('As senhas não coincidem.', 'error');
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      setView('success');
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    view === 'login' ? handleLogin() : handleRegister();
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center">
          <i className="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Registro concluído!
          </h2>
          <p className="text-gray-600 mb-6">
            Sua conta foi criada com sucesso. Por favor, faça login para continuar.
          </p>
          <button
            onClick={() => setView('login')}
            className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg"
          >
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-6">
          {view === 'login' ? 'Bem-vindo!' : 'Crie sua conta'}
        </h2>
        <form onSubmit={handleSubmit}>
          {view === 'register' && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Tipo de empresa
                </label>
                <div className="flex rounded-lg border border-gray-300 p-1">
                  <button
                    type="button"
                    onClick={() => setCompanyType('standard')}
                    className={`w-1/2 p-2 rounded-md text-sm font-semibold ${
                      companyType === 'standard'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyType('locadora')}
                    className={`w-1/2 p-2 rounded-md text-sm font-semibold ${
                      companyType === 'locadora'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    Locadora
                  </button>
                </div>
              </div>
              <input
                name="companyName"
                onChange={handleChange}
                placeholder="Nome da empresa"
                className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
              />
              <input
                name="cnpj"
                onChange={handleChange}
                placeholder="CNPJ"
                className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
              />
              <input
                name="address"
                onChange={handleChange}
                placeholder="Endereço"
                className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
              />
              {companyType === 'locadora' && (
                <>
                  <input
                    name="rentalWebsite"
                    onChange={handleChange}
                    placeholder="Website da locadora"
                    className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
                  />
                  <input
                    name="rentalPhone"
                    onChange={handleChange}
                    placeholder="Telefone para reservas"
                    className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
                  />
                </>
              )}
            </>
          )}
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="E-mail"
            className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
          />
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Senha"
            className="w-full bg-gray-100 p-3 rounded-lg border mb-4"
          />
          {view === 'register' && (
            <input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirmar senha"
              className="w-full bg-gray-100 p-3 rounded-lg border mb-6"
            />
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 disabled:bg-blue-400"
          >
            {isLoading ? '...' : view === 'login' ? 'Entrar' : 'Registrar'}
          </button>
        </form>

        <div className="my-4 flex items-center before:flex-1 before:border-t after:flex-1 after:border-t">
          <p className="text-center font-semibold mx-4">OU</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex justify-center items-center gap-2 bg-white border border-gray-300 font-bold py-3 rounded-lg hover:bg-gray-100"
        >
          <img
            className="w-6 h-6"
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="google logo"
          />
          <span>Entrar com Google</span>
        </button>

        <p className="text-center text-sm mt-6">
          {view === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button
            onClick={() => setView(view === 'login' ? 'register' : 'login')}
            className="font-bold text-blue-600 hover:text-blue-800 ml-2"
          >
            {view === 'login' ? 'Registre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
};

window.AuthScreen = AuthScreen;

})();

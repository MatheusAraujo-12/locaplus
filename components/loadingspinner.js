;(function(){
const LoadingSpinner = ({ text = "A carregar..." }) => (<div className="min-h-screen flex items-center justify-center"><div className="text-center"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i><p className="mt-4 text-lg text-gray-700">{text}</p></div></div>);
window.LoadingSpinner = LoadingSpinner;
})();

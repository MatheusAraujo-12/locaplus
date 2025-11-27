;(function(){
// src/components/cars/CarRemindersTab.js

const CarRemindersTab = ({ reminders, isAdmin, onAction }) => {
  return (
    <RemindersTable 
      reminders={reminders} 
      isAdmin={isAdmin} 
      onAction={onAction} 
    />
  );
};

window.CarRemindersTab = CarRemindersTab;

})();

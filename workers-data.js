// Workers Data - Auto-detect type from occupation
const WORKERS = [
  { id: 11152, name: "Md Abdur Rahman Md Akbar Hossain", occupation: "Electrician" },
  { id: 2944, name: "Jamal Abdul Mazid Miah", occupation: "Plumber" },
  { id: 11609, name: "Manoj Kumar", occupation: "Electrician" },
  { id: 12441, name: "Kabir Hosen", occupation: "HVAC Technician" },
  { id: 3366, name: "MD Alamgir Hossain", occupation: "Electrician" },
  { id: 5443, name: "Abu Daud Abdur Rahman", occupation: "Ductman" },
  { id: 31001, name: "Ali Hossain Sarker Abdul Aziz", occupation: "Ductman" },
  { id: 11108, name: "Aminul Islam Abul Borkot", occupation: "Electrician" },
  { id: 22535, name: "MD. Midul Late Abdul Aziz", occupation: "Electrician" },
  { id: 12030, name: "Md Razu Ahammed", occupation: "Plumber" },
  { id: 1966, name: "Mohmud Ziaul Hoque Md Jainul Abdi", occupation: "Plumber" },
  { id: 25402, name: "Md Mojahid Sadarudin", occupation: "Ductman" },
  { id: 25113, name: "Kishun Deo Yadav", occupation: "Ductman" },
  { id: 11980, name: "Guiam mohamad", occupation: "Ductman" },
  { id: 27121, name: "Mohammad Saukhat Mohammad Sameer", occupation: "Ductman" },
  { id: 2222, name: "Mohammad Zakir Hossain", occupation: "Plumber" },
  { id: 3369, name: "Abdul Basar", occupation: "Plumber" },
  { id: 11136, name: "Sobuz Mia Mojibur Rahman", occupation: "Ductman" },
  { id: 11214, name: "Sumon Miah Rahman Miah", occupation: "Electrician" },
  { id: 3009, name: "Jahurul Islam", occupation: "HVAC Technician" },
  { id: 11110, name: "Mohammad Chand Uddin Chowdhury Abdul Wahab", occupation: "MEP Helper" },
  { id: 12551, name: "Ramzan Fazal Haque", occupation: "MEP Helper" },
  { id: 12448, name: "Rasel Miah", occupation: "MEP Helper" },
  { id: 11114, name: "Anwer Abdul Khalek", occupation: "MEP Helper" },
  { id: 12209, name: "Samim Mia", occupation: "MEP Helper" },
  { id: 26020, name: "Harindra Kumar Vasant", occupation: "MEP Helper" },
  { id: 12199, name: "Oli Ullah Prodhan", occupation: "MEP Helper" }
];

// Auto-detect worker type from occupation
function getWorkerType(occupation) {
  const occ = occupation.toLowerCase();
  return occ.includes('helper') ? 'helper' : 'skilled';
}

// Add type to each worker
WORKERS.forEach(worker => {
  worker.type = getWorkerType(worker.occupation);
});

// Get worker by ID
function getWorkerById(workerId) {
  return WORKERS.find(w => w.id === workerId);
}

// Get workers by type
function getWorkersByType(type) {
  return WORKERS.filter(w => w.type === type);
}

// Search workers by name, ID, or occupation
function searchWorkers(query) {
  const q = query.toLowerCase();
  return WORKERS.filter(w => 
    w.name.toLowerCase().includes(q) || 
    w.id.toString().includes(q) ||
    w.occupation.toLowerCase().includes(q)
  );
}

// Get worker hours used for a specific date
function getWorkerHoursToday(workerId, date, excludeTaskId = null, tasks = []) {
  const todayTasks = tasks.filter(t => 
    t.date === date && 
    t.id !== excludeTaskId &&
    t.workers.some(w => w.id === workerId)
  );
  
  let totalHours = 0;
  todayTasks.forEach(task => {
    totalHours += task.hours;
  });
  
  return totalHours;
}

// Get worker availability status
function getWorkerStatus(workerId, date, maxHours, excludeTaskId = null, tasks = []) {
  const used = getWorkerHoursToday(workerId, date, excludeTaskId, tasks);
  const available = maxHours - used;
  
  if (used >= maxHours) {
    return { status: 'overbooked', available: 0, used, max: maxHours };
  }
  
  return { status: 'available', available, used, max: maxHours };
}

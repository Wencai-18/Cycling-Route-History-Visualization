// db.js - Dexie IndexedDB wrapper
// Depends on: Dexie (global)

const ROUTE_COLORS = [
  '#fc5200', '#2ecc71', '#3498db', '#f39c12', '#9b59b6',
  '#1abc9c', '#e74c3c', '#00bcd4', '#ff6b9d', '#a0d468',
];

var AppDB = (function() {
  const db = new Dexie('CyclingRoutesDB');
  db.version(1).stores({
    activities: '++id, name, date, source, stravaId'
  });

  async function getAllActivities() {
    return db.activities.orderBy('date').reverse().toArray();
  }

  async function addActivity(activity) {
    return db.activities.add(activity);
  }

  async function deleteActivity(id) {
    return db.activities.delete(id);
  }

  async function getNextColor() {
    const count = await db.activities.count();
    return ROUTE_COLORS[count % ROUTE_COLORS.length];
  }

  return { db, getAllActivities, addActivity, deleteActivity, getNextColor };
})();
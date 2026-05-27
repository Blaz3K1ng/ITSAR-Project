const fs = require("fs");
const path = require("path");
const Loki = require("lokijs");

async function createDatabase(filePath, collections = []) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const db = new Loki(filePath, {
    autoload: false,
    autosave: false,
  });

  await new Promise((resolve, reject) => {
    db.loadDatabase({}, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  let seeded = false;

  for (const collection of collections) {
    const existing =
      db.getCollection(collection.name) || db.addCollection(collection.name, collection.options || {});

    if (existing.count() === 0 && Array.isArray(collection.seed) && collection.seed.length > 0) {
      existing.insert(collection.seed.map((item) => JSON.parse(JSON.stringify(item))));
      seeded = true;
    }
  }

  if (seeded) {
    db.saveDatabase();
  }

  return db;
}

module.exports = {
  createDatabase,
};

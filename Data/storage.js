// storage.js
const fs = require("fs");
const file = "storage.json";

// Load storage from file or create empty array
function loadStorage() {
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  return [];
}

let storage = loadStorage();

function saveStorage() {
  fs.writeFileSync(file, JSON.stringify(storage, null, 2));
}


function addToStorage(item) {
  if (typeof item !== "string" || !item.trim()) {
    throw new Error("Only non-empty strings are allowed");
  }
  storage.push(item);
  saveStorage();
}

function getStorage() {
  return storage;
}

function clearStorage() {
  storage = [];
  saveStorage();
}

function removeByValue(text) {
  if (typeof text !== "string") throw new Error("text must be a string");
  const before = storage.length;
  storage = storage.filter((s) => s !== text);
  const removedCount = before - storage.length;
  saveStorage();
  return removedCount;
}

module.exports = {
  addToStorage,
  getStorage,
  clearStorage,
  removeByValue,
};

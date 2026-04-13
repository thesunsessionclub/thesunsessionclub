/**
 * SSC IndexedDB Storage — replaces localStorage for large admin data
 * DB: ssc_admin_db, Store: kv (key-value)
 */
(function(global){
  const DB_NAME = 'ssc_admin_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'kv';
  const LS_KEY = 'ssc_store_v1'; // legacy localStorage key to migrate from

  let _db = null;
  let _ready = false;
  let _queue = []; // callbacks waiting for DB to open

  function openDB(cb) {
    if (_ready && _db) { cb(_db); return; }
    _queue.push(cb);
    if (_queue.length > 1) return; // already opening

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = function(e) {
      _db = e.target.result;
      _ready = true;
      const cbs = _queue.slice();
      _queue = [];
      cbs.forEach(function(fn){ fn(_db); });
    };
    req.onerror = function(e) {
      console.error('[SSC-DB] Failed to open IndexedDB:', e);
      _ready = false;
      _queue = [];
    };
  }

  function dbGet(key, cb) {
    openDB(function(db) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = function() { cb(null, req.result); };
      req.onerror = function(e) { cb(e, null); };
    });
  }

  function dbSet(key, value, cb) {
    openDB(function(db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(value, key);
      req.onsuccess = function() { if(cb) cb(null); };
      req.onerror = function(e) { if(cb) cb(e); };
    });
  }

  function dbDelete(key, cb) {
    openDB(function(db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(key);
      req.onsuccess = function() { if(cb) cb(null); };
      req.onerror = function(e) { if(cb) cb(e); };
    });
  }

  // Promise wrappers
  function idbGet(key) {
    return new Promise(function(resolve, reject) {
      dbGet(key, function(err, val) {
        if (err) reject(err); else resolve(val);
      });
    });
  }

  function idbSet(key, value) {
    return new Promise(function(resolve, reject) {
      dbSet(key, value, function(err) {
        if (err) reject(err); else resolve();
      });
    });
  }

  function idbDelete(key) {
    return new Promise(function(resolve, reject) {
      dbDelete(key, function(err) {
        if (err) reject(err); else resolve();
      });
    });
  }

  // Migrate from localStorage if data exists there
  function migrateFromLocalStorage() {
    return new Promise(function(resolve) {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) { resolve(false); return; }
        const data = JSON.parse(raw);
        // Don't migrate slim/already-migrated markers
        if (data && (data._idb || data._migrated)) { resolve(false); return; }
        idbSet(LS_KEY, data).then(function() {
          // Keep localStorage as tiny fallback but clear big data
          try {
            const slim = { _migrated: true, settings: data.settings || {} };
            localStorage.setItem(LS_KEY, JSON.stringify(slim));
          } catch(e) {
            try { localStorage.removeItem(LS_KEY); } catch(_) {}
          }
          console.log('[SSC-DB] Migrated ssc_store_v1 from localStorage to IndexedDB');
          resolve(true);
        }).catch(function() { resolve(false); });
      } catch(e) {
        resolve(false);
      }
    });
  }

  // Initialize: open DB and migrate if needed
  function init() {
    return new Promise(function(resolve) {
      openDB(function(db) {
        idbGet(LS_KEY).then(function(existing) {
          if (existing && !existing._idb && !existing._migrated) {
            console.log('[SSC-DB] IndexedDB ready, data already present');
            resolve(existing);
          } else {
            migrateFromLocalStorage().then(function() {
              idbGet(LS_KEY).then(function(val) { resolve(val); });
            });
          }
        });
      });
    });
  }

  // Expose global API
  global.SSCDB = {
    get: idbGet,
    set: idbSet,
    delete: idbDelete,
    init: init,
    KEY: LS_KEY
  };

})(window);

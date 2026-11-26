let db = null;
const DB_FILENAME = 'sgg.sqlite';

// 1. Inicializar SQLite y cargar desde OPFS si ya existe
async function initDatabase() {
    if (db) return db;

    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(DB_FILENAME);
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();

        db = new SQL.Database(new Uint8Array(arrayBuffer));
        console.log("Base de datos cargada desde OPFS.");
    } catch (error) {
        console.log("Creando nueva base de datos SQLite en OPFS...");
        db = new SQL.Database();
        crearTablas();
        await guardarEnOPFS();
    }

    return db;
}

// 2. Crear estructura relacional
function crearTablas() {
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            fecha_nacimiento TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS movimientos (
            id_movimiento INTEGER PRIMARY KEY AUTOINCREMENT,
            email_usuario TEXT NOT NULL,
            tipo_movimiento TEXT NOT NULL CHECK(tipo_movimiento IN ('ingreso', 'egreso')),
            monto REAL NOT NULL,
            fecha TEXT NOT NULL,
            categoria TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            url_comprobante TEXT DEFAULT NULL,
            activo INTEGER DEFAULT 1
        );

        INSERT OR IGNORE INTO usuarios (nombre, apellido, fecha_nacimiento, email, password)
        VALUES 
            ('Admin', 'Sistema', '1995-01-01', 'admin@sgg.com', 'Password1!'),
            ('Juan', 'Perez', '1998-05-15', 'user@sgg.com', 'User2024#');
    `);
}

// 3. Persistir el binario .sqlite en OPFS
async function guardarEnOPFS() {
    if (!db) return;
    const data = db.export();
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    console.log("Archivo sgg.sqlite guardado en OPFS.");
}
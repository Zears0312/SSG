let db = null;
const DB_FILENAME = 'sgg.sqlite';

// Credenciales de Supabase Storage
const SUPABASE_URL = 'https://eehdamftehoqftmldkpv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J_RDMDbVjXqkuK30A22XSQ_6gnk1T3d';
const SUPABASE_BUCKET = 'backups';

// Helper interno para escribir el binario en OPFS
async function escribirArchivoOPFS(uint8Array) {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(uint8Array);
    await writable.close();
}

// Subir binario .sqlite a Supabase Storage (resiliente si no hay internet)
async function subirASupabase(uint8Array) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${DB_FILENAME}`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/octet-stream',
                    'x-upsert': 'true'
                },
                body: uint8Array
            }
        );

        if (!response.ok) {
            throw new Error(`Error Supabase ${response.status}`);
        }
        console.log("Respaldo sgg.sqlite sincronizado en Supabase Storage.");
    } catch (error) {
        console.warn("Modo offline o error al subir a Supabase (los datos siguen seguros en OPFS):", error);
    }
}

// Descargar binario .sqlite desde Supabase Storage
async function descargarDeSupabase() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${DB_FILENAME}?t=${Date.now()}`,
            { cache: 'no-store' }
        );
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        console.log("Base de datos descargada desde Supabase Storage.");
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        console.warn("Sin conexión a Supabase, usando OPFS local:", error);
        return null;
    }
}

// 1. Inicializar SQLite (Si hay internet baja última versión de Supabase -> si no, lee OPFS local -> si no existe, crea nueva)
async function initDatabase() {
    if (db) return db;

    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    const remoto = await descargarDeSupabase();
    if (remoto) {
        db = new SQL.Database(remoto);
        await escribirArchivoOPFS(remoto);
        console.log("OPFS actualizado con el respaldo de Supabase.");
        return db;
    }

    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(DB_FILENAME);
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();

        db = new SQL.Database(new Uint8Array(arrayBuffer));
        console.log("Base de datos cargada desde OPFS local.");
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

// 3. Persistir el binario .sqlite en OPFS y respaldar en Supabase
async function guardarEnOPFS() {
    if (!db) return;
    const data = db.export();
    await escribirArchivoOPFS(data);
    console.log("Archivo sgg.sqlite guardado en OPFS.");
    await subirASupabase(data);
}
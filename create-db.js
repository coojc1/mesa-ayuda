const sqlite3 =  require('sqlite3');
const db = new sqlite3.Database("mesa.db");

function crearTabla() {
    let consulta = `CREATE TABLE IF NOT EXISTS usuarios(
        id_usuario_pk INTEGER PRIMARY KEY NOT NULL,
        nombre TEXT,
        correo TEXT,
        password TEXT,
        tipo_usuario TEXT
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS empresas(
        id_empresa_pk INTEGER PRIMARY KEY NOT NULL,
        id_usuario_fk INTEGER,
        razon TEXT,
        telefono TEXT,
        FOREIGN KEY(id_usuario_fk) REFERENCES usuarios(id_usuario_pk)
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS administradores(
        id_admin_pk INTEGER PRIMARY KEY NOT NULL,
        id_usuario_fk INTEGER,
        edad int,
        FOREIGN KEY(id_usuario_fk) REFERENCES usuarios(id_usuario_pk)
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS ingenieros(
        id_ingeniero_pk INTEGER PRIMARY KEY NOT NULL,
        id_usuario_fk INTEGER,
        categoria TEXT,
        FOREIGN KEY(id_usuario_fk) REFERENCES usuarios(id_usuario_pk)
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS tickets(
        id_ticket_pk INTEGER PRIMARY KEY NOT NULL,
        id_empresa_fk INTEGER,
        id_ingeniero_fk INTEGER,
        id_referencia_fk TEXT,
        descripcion TEXT,
        fecha DATE,
        tiempo INTEGER,
        minutos INTEGER,
        version TEXT,
        prioridad TEXT,
        estado TEXT,
        FOREIGN KEY(id_empresa_fk) REFERENCES empresas(id_empresa_pk),
        FOREIGN KEY(id_ingeniero_fk) REFERENCES ingenieros(id_ingeniero_pk)
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS comentarios(
        id_comentario_pk INTEGER PRIMARY KEY NOT NULL,
        id_ticket_fk INTEGER,
        contenido TEXT,
        FOREIGN KEY(id_ticket_fk) REFERENCES tickets(id_ticket_pk)
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS referencia(
        id_referencia_pk INTEGER PRIMARY KEY NOT NULL,
        contenido TEXT
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS imagenes(
        id_imagen_pk INTEGER NOT NULL PRIMARY KEY,
        id_ticket_fk INTEGER,
        ruta TEXT
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS reportes(
        id_reporte_pk INTEGER NOT NULL PRIMARY KEY,
        mes INTEGER,
        year INTEGER
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS passwords(
        id_password_pk INTEGER NOT NULL PRIMARY KEY,
        password TEXT
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS profiles(
        id_profile_pk INTEGER NOT NULL PRIMARY KEY,
        id_usuario_fk INTEGER,
        ruta TEXT
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS reporte_mes(
        id_report_pk INTEGER NOT NULL PRIMARY KEY,
        fecha DATE,
        mes INTEGER,
        year INTEGER
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS reportes_estados(
        id_reporte_pk INTEGER NOT NULL PRIMARY KEY,
        fecha DATE,
        mes INTEGER,
        year INTEGER,
        estado TEXT
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS reporte_consultor(
        id_reporte_pk INTEGER NOT NULL PRIMARY KEY,
        id_consultor_fk INTEGER,
        nombre TEXT,
        mes INTEGER,
        year INTEGER,
        fecha DATE
    )`;

    consulta = `SELECT * FROM REPORTE_CONSULTOR`;

    
    db.all(consulta, (err, row) => {
        if(err) {
            return console.log(err);
        } else {
            console.log(row);
        }
    });
}

crearTabla();

// consulta = `ALTER TABLE tickets ADD minutos INTEGER`;

// consulta = `ALTER TABLE tickets ADD tipo_poliza TEXT`;

    // consulta = `UPDATE tickets SET estado = 'En proceso' WHERE estado = 'Liberado'`;

    // consulta = `DROP TABLE reporte_consultor`;

    // consulta = `SELECT id_ticket_pk, id_referencia_fk, fecha, tiempo, minutos, version, estado, prioridad, razon, nombre, contenido FROM tickets, empresas, ingenieros, usuarios, referencia WHERE substr(fecha, 6, 2) = '03' AND substr(fecha, 1, 4) = '2024' AND id_empresa_fk = id_empresa_pk AND id_ingeniero_fk = id_ingeniero_pk AND ingenieros.id_usuario_fk = usuarios.id_usuario_pk AND estado = 'Liberado' AND id_ingeniero_fk = 1 ORDER BY id_ticket_pk DESC`;

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

    consulta = `CREATE TABLE imagenes(
        id_imagen_pk INTEGER NOT NULL PRIMARY KEY,
        id_ticket_fk INTEGER,
        ruta TEXT
    )`;

    consulta = `DELETE FROM imagenes`;

    db.all(consulta, (err, row) => {
        if(err) {
            return console.log(err);
        } else {
            console.log(row);
        }
    });
}

crearTabla();

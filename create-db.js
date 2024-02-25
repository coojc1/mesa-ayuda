const sqlite3 =  require('sqlite3');
const db = new sqlite3.Database("mesa.db");

function tablaUsuarios() {
    let consulta = `CREATE TABLE IF NOT EXISTS usuarios(
        id_usuario_pk INTEGER PRIMARY KEY NOT NULL,
        NOMBRE TEXT,
        CORREO TEXT,
        PASSWORD TEXT,
        TIPO_USUARIO TEXT
    )`;

    db.all(consulta, (err) => {
        if(err) {
            return console.log(err);
        } else {
            console.log("Tabla creada");
        }
    });
}

function crearTabla() {
    let consulta = `CREATE TABLE IF NOT EXISTS usuarios(
        id_usuario_pk INTEGER PRIMARY KEY NOT NULL,
        NOMBRE TEXT,
        CORREO TEXT,
        PASSWORD TEXT,
        TIPO_USUARIO TEXT
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
        id_admin_pk INTEGER PRIMARY KEY NOT NULL,
        id_usuario_fk INTEGER,
        edad int,
        FOREIGN KEY(id_usuario_fk) REFERENCES usuarios(id_usuario_pk)
    )`;

    consulta = `CREATE TABLE IF NOT EXISTS tikets(
        id_tiket_pk INTEGER PRIMARY KEY NOT NULL,
        id_empresa_fk INTEGER,
        id_ingeniero_fk INTEGER,
        referencia TEXT,
        descripcion TEXT,
        tiempo INTEGER,
        version TEXT,
        prioridad TEXT,
        estado TEXT,
        FOREIGN KEY(id_empresa_fk) REFERENCES empresas(id_empresa_pk)
    )`;

    consulta = `INSERT INTO usuarios(nombre, correo, password, tipo_usuario) VALUES("Jose Torres", "Jose123@gmai.com", "Jose123", "Administrador")`;

    consulta = `SELECT * FROM usuarios`;

    db.all(consulta, (err, row) => {
        if(err) {
            return console.log(err);
        } else {
            console.log(row);
        }
    });
}

crearTabla();

// IMPORTANDO PAQUETES NECESARIOS
const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("mesa.db");
const session = require("express-session");
const Swal = require("sweetalert2");
var body = require('body-parser');

app.use(session({
    secret: "3b792f6f1d1f078e2c593d93ff3bba",
    resave: false,
    saveUninitialized: true
}));

// CONFIGURACION DEL SERVIDOR
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("src"));
app.use(body.urlencoded({ extended: true }));
app.use(body.json());


//  RUTAS DE LA APLICACION --------------------------------------------------------------------------------
app.get("/", (req, res) => {
    res.render("index.ejs")
});

app.post("/company-login", (req, res) => {
    let correo = req.body.correo;
    let password = req.body.password;

    let consulta = `SELECT id_usuario_pk, nombre FROM usuarios WHERE correo = ? AND password = ? AND tipo_usuario = 'Empresa'`;

    db.all(consulta, [correo, password], (err, row) => {
        if (err || row.length == 0) {
            res.redirect("/");
        } else {
            req.session.idCompany = row[0].id_usuario_pk;
            req.session.nameCompany = row[0].nombre;

            res.redirect("/company-panel");
        }
    });
});

app.get("/company-panel", (req, res) => {
    if (req.session.idCompany != undefined) {
        let id_usuario = req.session.idCompany;

        let consulta = `SELECT id_empresa_pk FROM empresas WHERE id_usuario_fk = ?`;

        db.all(consulta, [id_usuario], (err, row) => {
            let id_empresa_pk = row[0].id_empresa_pk;

            consulta = `SELECT id_ticket_pk, id_referencia_fk, fecha, version, prioridad, estado FROM tickets WHERE id_empresa_fk = ?`;

            req.session.idEmpresa = id_empresa_pk;

            db.all(consulta, [id_empresa_pk], (err, row) => {
                // CONTAR EL ESTADO DE LOS TICKETS
                let tickets = row;
                let ticketsEstados = [];
                const estadosOrdenados = ['Abierto', 'Liberado', 'En proceso'];

                estadosOrdenados.forEach(estado => {
                    ticketsEstados.push(0);
                });

                consulta = `SELECT estado, COUNT(id_ticket_pk) as cantidad FROM tickets WHERE id_empresa_fk = ? AND estado IN ('Abierto', 'Liberado', 'En proceso') GROUP BY estado`;

                db.all(consulta, [id_empresa_pk], (err, row) => {
                    row.forEach(row => {
                        const estadoIndex = estadosOrdenados.indexOf(row.estado);
                        if (estadoIndex !== -1) {
                            ticketsEstados[estadoIndex] = row.cantidad;
                        }
                    });

                    let data = {
                        "name": req.session.nameCompany,
                        "tickets": tickets,
                        "ticketsEstados": JSON.stringify(ticketsEstados)
                    }

                    res.render("company/panel-company.ejs", data);
                });
            });
        });
    } else {
        res.redirect("/");
    }
});

app.get("/ticket-generate", (req, res) => {
    if (req.session.idCompany != undefined) {
        let consulta = `SELECT id_referencia_pk, contenido FROM referencia`;

        db.all(consulta, (err, row) => {
            data = {
                "name": req.session.nameCompany,
                "referencias": row
            }

            res.render("company/generar-tikets.ejs", data);
        });
    } else {
        res.redirect("/");
    }
});

app.post("/ticket-generate/new", (req, res) => {
    let id_empresa_fk = req.session.idEmpresa;
    let referencia = req.body.referencia;
    let version = req.body.version;
    let descripcion = req.body.descripcion;

    let consulta = `INSERT INTO tickets(id_empresa_fk, id_referencia_fk, descripcion, fecha, version, prioridad, estado) VALUES(?,?,?,date("now"),?,"Por evaluar", "Abierto")`;

    db.all(consulta, [id_empresa_fk, referencia, descripcion, version], (err, row) => {
        if (err) {
            console.log(err);
        } else {
            let data = {
                "titulo": "Registro exitoso",
                "mensaje": "Listo... el ticket ha sido registrado con éxito. 😁😁",
                "link": "/company-panel",
                "tipo": "alert-success"
            }
            res.render("out-log.ejs", data);
        }
    });
});

// REGISTRO DE UNA NUEVA EMPRESA ****************************************************************************
app.get("/register-company", (req, res) => {
    res.render("company/register-company.ejs");
});

app.post("/register-company/new", (req, res) => {
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let telefono = req.body.telefono;
    let password = req.body.password;

    let consulta = `SELECT id_usuario_pk FROM usuarios WHERE nombre = ? OR correo = ?`;

    db.all(consulta, [nombre, correo], (err, row) => {
        if (row === undefined || row.length === 0) {
            console.log(row);
            consulta = `INSERT INTO usuarios(nombre, correo, password, tipo_usuario) VALUES(?,?,?,'Empresa')`;

            db.all(consulta, [nombre, correo, password], (err) => {
                consulta = `SELECT id_usuario_pk FROM usuarios WHERE correo = ?`;

                db.all(consulta, [correo], (err, row) => {
                    id = row[0].id_usuario_pk;
                    consulta = `INSERT INTO empresas(id_usuario_fk, razon, telefono) VALUES(?,?,?)`;

                    db.all(consulta, [id, nombre, telefono], (err) => {
                        let data = {
                            "titulo": "Registro exitoso",
                            "mensaje": "Listo... has sido registrado en la plataforma como " + nombre + ". 😁😁",
                            "link": "/",
                            "tipo": "alert-success"
                        }

                        res.render("out-log.ejs", data);
                    });
                });
            });
        } else {
            let data = {
                "titulo": "Error de registro",
                "mensaje": "Ups... al parecer ya existe una cuenta con los datos que has proporcionado. 😥😥",
                "link": "/register-company",
                "tipo": "alert-danger"
            }

            res.render("out-log.ejs", data);
        }
    });
});
// REGISTRO DE UNA NUEVA EMPRESA ****************************************************************************

//  RUTAS DE LA APLICACION --------------------------------------------------------------------------------

// CONFIGURACION DEL PUERTO
app.listen(3000);


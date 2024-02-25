// IMPORTANDO PAQUETES NECESARIOS
const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("mesa.db");

var body = require('body-parser');



// CONFIGURACION DEL SERVIDOR
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("src"));
app.use(body.urlencoded({ extended:true }));
app.use(body.json());


//  RUTAS DE LA APLICACION --------------------------------------------------------------------------------
app.get("/", (req, res) => {
    res.render("index.ejs")
});

app.get("/register-company", (req, res) => {
    res.render("company/register-company.ejs");
});

app.post("/register-company/new", (req, res) => {
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let telefono = req.body.telefono;
    let password = req.body.password;

    let consulta = ``;

    consulta = `INSERT INTO usuarios(nombre, correo, password, tipo_usuario) VALUES(?,?,?,'Empresa')`;

    db.all(consulta, [nombre, correo, password ], (err) => {
        let titulo, mensaje, texto_button, link;

        let data = {
            "titulo": titulo,
            "mensaje": mensaje,
            "texto_button": texto_button,
            "link": link
        }

        if (err) {
            titulo = "Error al registrar la empresa";
            mensaje = "Hubo un error al registrar la empresa";
            texto_button = "Regresar";
            link = "/register-company";

            console.log(err);

            res.render("out-log.ejs", data);
        } else {
            consulta = `SELECT id_usuario_pk FROM usuarios WHERE correo = ?`;
            db.all(consulta, [correo], (err, row) => {
                id = row[0].id_usuario_pk;

                consulta = `INSERT INTO empresas(id_usuario_fk, razon, telefono) VALUES(?,?,?)`;
                db.all(consulta, [id, nombre, telefono], (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        res.redirect("/");
                    }
                });
            });
        }
    });
});
//  RUTAS DE LA APLICACION --------------------------------------------------------------------------------

// CONFIGURACION DEL PUERTO
app.listen(3000);


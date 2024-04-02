// IMPORTANDO PAQUETES NECESARIOS
const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("mesa.db");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
var body = require('body-parser');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

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


// #########################################################################################################
//                                        PANEL DE EMPRESAS
// #########################################################################################################
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

app.get("/company-logout", (req, res) => {
    delete req.session.idCompany;
    delete req.session.nameCompany;
    delete req.session.idEmpresa;
    res.redirect("/");
});

app.get("/company-panel", (req, res) => {
    if (req.session.idCompany != undefined) {
        let id_usuario = req.session.idCompany;

        let consulta = `SELECT id_empresa_pk FROM empresas WHERE id_usuario_fk = ?`;

        db.all(consulta, [id_usuario], (err, row) => {
            let id_empresa_pk = row[0].id_empresa_pk;

            req.session.idEmpresa = id_empresa_pk;

            db.all("SELECT id_ticket_pk, contenido, fecha, version, prioridad, estado FROM tickets, referencia WHERE id_referencia_fk = id_referencia_pk AND id_empresa_fk = ? ORDER BY id_ticket_pk DESC", [id_empresa_pk], (err, row) => {
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

app.get("/company-profile", (req, res) => {
    if (req.session.idCompany != undefined) {
        db.all("SELECT correo, password, telefono, correo_empresarial, poliza, no_candado FROM usuarios, empresas WHERE id_usuario_fk = ? AND id_usuario_pk = ?", [req.session.idCompany, req.session.idCompany], (err, row) => {
            data = {
                "name": req.session.nameCompany,
                "correo": row[0].correo,
                "password": row[0].password,
                "telefono": row[0].telefono,
                "correo_empresarial": row[0].correo_empresarial,
                "poliza": row[0].poliza,
                "no_candado": row[0].no_candado
            }
            res.render("company/profile-company.ejs", data);
        });
    } else {
        res.redirect("/");
    }
});

app.post("/company-profile/update", (req, res) => {
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let correo_empresarial = req.body.correo_empresarial;
    let telefono = req.body.telefono;
    let password = req.body.password;
    let no_candado = req.body.no_candado;
    let idCompany = req.session.idCompany;

    db.run("UPDATE usuarios SET nombre = ?, correo = ?, password = ? WHERE id_usuario_pk = ?", [nombre, correo, password, idCompany], (err) => {
        db.run("UPDATE empresas SET telefono = ?, correo_empresarial = ?, no_candado = ? WHERE id_usuario_fk = ?", [telefono, correo_empresarial, no_candado, idCompany], (err) => {
            req.session.nameCompany = nombre;
            res.redirect("/company-profile");
        });
    });
});

let id_ticket;
app.get("/ticket-info/:id_ticket", (req, res) => {
    if (req.session.idCompany != undefined) {
        id_ticket = req.params.id_ticket;
        let info_tickets = [];
        let comentarios = [];
        let imagenes = [];

        db.all("SELECT descripcion, version, prioridad, estado, contenido FROM tickets, referencia WHERE id_ticket_pk = ? AND tickets.id_referencia_fk = referencia.id_referencia_pk", [id_ticket], (err, row) => {
            info_tickets = row;

            db.all("SELECT id_comentario_pk, contenido, tipo_usuario FROM comentarios WHERE id_ticket_fk = ?", [id_ticket], (err, row) => {
                comentarios = row;

                db.all("SELECT ruta, id_imagen_pk FROM imagenes WHERE id_ticket_fk = ?", [id_ticket], (err, row) => {
                    imagenes = row;
                    data = {
                        "name": req.session.nameCompany,
                        "id_ticket": id_ticket,
                        "ticket": info_tickets,
                        "comentarios": comentarios,
                        "imagenes": imagenes
                    }
                    res.render("company/ticket-info.ejs", data);
                });
            });
        });
    } else {
        res.redirect('/');
    }
});

app.post("/ticket-info-comment/post", (req, res) => {
    let comentario = req.body.comentario;
    let id_ticket = req.body.id_ticket;

    db.all("INSERT INTO comentarios(id_ticket_fk, contenido, tipo_usuario) VALUES(?,?, 'Empresa')", [id_ticket, comentario], (err, row) => {
        res.redirect("/ticket-info/" + id_ticket);
    });
});

app.get("/ticket-info-comment/delete/:id_comentario", (req, res) => {
    let id_comentario = req.params.id_comentario;
    db.all("DELETE FROM comentarios WHERE id_comentario_pk = ?", [id_comentario], (err, row) => {
        res.redirect("/ticket-info/" + id_ticket);
    });
});

app.post('/ticket-info-img/post', upload.single('imagen'), (req, res) => {
    if (!req.file) {
        res.status(400).send('No se ha enviado ninguna imagen');
        return;
    }

    const ruta = "/uploads/" + req.file.originalname;
    db.all("INSERT INTO imagenes(id_ticket_fk, ruta) VALUES(?,?)", [id_ticket, ruta], (err, row) => {
        res.redirect("/ticket-info/" + id_ticket);
    });
});

app.get("/ticket-info-img/delete/:id_imagen", (req, res) => {
    let id_imagen = req.params.id_imagen;
    db.all("SELECT ruta FROM imagenes WHERE id_imagen_pk = ?", [id_imagen], (err, row) => {
        let ruta_imagen = __dirname + "/src" + row[0].ruta;
        fs.access(ruta_imagen, fs.constants.F_OK, (err) => {
            fs.unlink(ruta_imagen, (err) => {
                db.all("DELETE FROM imagenes WHERE id_imagen_pk = ?", [id_imagen], (err, row) => {
                    res.redirect("/ticket-info/" + id_ticket);
                });
            });
        });
    });
});

app.get("/ticket-info/edit/:id_ticket", (req, res) => {
    if (req.session.idCompany != undefined) {
        id_ticket = req.params.id_ticket;
        let ticket = [];
        db.all("SELECT id_ticket_pk, descripcion, version, contenido FROM tickets, referencia WHERE tickets.id_referencia_fk = referencia.id_referencia_pk AND id_ticket_pk = ?", [id_ticket], (err, row) => {
            ticket = row;

            db.all("SELECT * FROM referencia", (err, row) => {
                data = {
                    "name": req.session.nameCompany,
                    "ticket": ticket,
                    "referencia": row
                }
                res.render("company/ticket-edit.ejs", data);
            });
        });
    } else {
        res.redirect("/");
    }
});

app.post("/ticket-info/edit/update", (req, res) => {
    let version = req.body.version;
    let descripcion = req.body.descripcion;
    let referencia = req.body.referencia;

    db.run("UPDATE tickets SET version = ?, descripcion = ?, id_referencia_fk = ? WHERE id_ticket_pk = ?", [version, descripcion, referencia, id_ticket], () => {
        res.redirect("/ticket-info/edit/" + id_ticket);
    });
});

app.get("/tickets-info/ended", (req, res) => {
    if (req.session.idCompany == undefined) {
        res.redirect("/");
    } else {
        let id_empresa = req.session.idEmpresa;
        db.all("SELECT id_ticket_pk, contenido, fecha, version, prioridad, estado FROM tickets, referencia WHERE id_referencia_fk = id_referencia_pk AND estado = 'Liberado' AND id_empresa_fk = ? ORDER BY id_ticket_pk DESC", [id_empresa], (err, row) => {
            let data = {
                "name": req.session.nameCompany,
                "tickets": row
            }
            res.render("company/tickets-ended.ejs", data);
        });
    }
});

app.get("/tickets-info/process", (req, res) => {
    if (req.session.idCompany == undefined) {
        res.redirect("/");
    } else {
        let id_empresa = req.session.idEmpresa;
        db.all("SELECT id_ticket_pk, contenido, fecha, version, prioridad, estado FROM tickets, referencia WHERE estado = 'En proceso' AND id_referencia_fk = id_referencia_pk AND id_empresa_fk = ? ORDER BY id_ticket_pk DESC", [id_empresa], (err, row) => {
            let data = {
                "name": req.session.nameCompany,
                "tickets": row
            }
            res.render("company/tickets-process.ejs", data);
        });
    }
});

app.get("/register-company", (req, res) => {
    res.render("company/register-company.ejs");
});

app.post("/register-company/new", (req, res) => {
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let correo_empresa = req.body.correo_empresa;
    let telefono = req.body.telefono;

    let password = req.body.password;
    let no_candado = req.body.no_candado;

    db.all("SELECT COUNT(id_usuario_fk) as id_user FROM empresas WHERE razon = ? OR telefono = ? OR correo_empresarial = ? OR no_candado = ?", [nombre, telefono, correo_empresa, no_candado], (err, row) => {
        if (row[0].id_user === 0) {
            db.all("INSERT INTO usuarios(nombre, correo, password, tipo_usuario) VALUES(?,?,?,'Empresa')", [nombre, correo, password], (err) => {
                db.all("SELECT id_usuario_pk FROM usuarios WHERE correo = ?", [correo], (err, row) => {
                    id = row[0].id_usuario_pk;
                    db.all("INSERT INTO empresas(id_usuario_fk, razon, telefono, correo_empresarial, no_candado) VALUES(?,?,?,?,?)", [id, nombre, telefono, correo_empresa, no_candado], (err) => {
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
            console.log(row);
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

// #########################################################################################################
//                                        PANEL DE EMPRESAS
// #########################################################################################################

// #########################################################################################################
//                                        PANEL DE SOPORTE
// #########################################################################################################

app.get("/support-login", (req, res) => {
    res.render("login-support.ejs");
});

app.post("/support-login/login", (req, res) => {
    let correo = req.body.correo;
    let password = req.body.password;
    
    db.all("SELECT id_usuario_pk, nombre, id_ingeniero_pk FROM usuarios, ingenieros WHERE id_usuario_pk = id_usuario_fk AND correo = ? AND password = ?", [correo, password], (err, row) => {
        req.session.idUser = row[0].id_usuario_pk;
        req.session.nameSupport = row[0].nombre;
        req.session.idSupport = row[0].id_ingeniero_pk;
        
        res.redirect("/dashboard-support");
    });
});

app.get("/support-logout", (req, res) => {
    delete req.session.nameSupport;
    delete req.session.idSupport;
    delete req.session.idUser;
    res.redirect("/support-login");
});

app.get("/dashboard-support", (req, res) => {
    if (req.session.idSupport === undefined) {
        res.redirect("/support-login");
    } else {
        let id_support = req.session.idSupport;
        db.all("SELECT SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abierto, SUM(CASE WHEN estado = 'En proceso' THEN 1 ELSE 0 END) as proceso, SUM(CASE WHEN estado = 'Liberado' THEN 1 ELSE 0 END) as liberado FROM tickets WHERE id_ingeniero_fk = ?", [id_support], (err, row) => {
            let stats = [row[0].abierto, row[0].proceso, row[0].liberado];

            db.all("SELECT SUM(CASE WHEN prioridad = 'Por evaluar' THEN 1 ELSE 0 END) as evaluar, SUM(CASE WHEN prioridad = 'Baja' THEN 1 ELSE 0 END) as baja, SUM(CASE WHEN prioridad = 'Normal' THEN 1 ELSE 0 END) as normal, SUM(CASE WHEN prioridad = 'Alta' THEN 1 ELSE 0 END) as alta, SUM(CASE WHEN prioridad = 'Urgente' THEN 1 ELSE 0 END) as urgente FROM tickets WHERE id_ingeniero_fk = ?;", [id_support], (err, row) => {
                let prioridad = [row[0].evaluar, row[0].baja, row[0].normal, row[0].alta, row[0].urgente];

                db.all("SELECT id_ticket_pk, fecha, version, prioridad, estado, razon, contenido FROM tickets, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND id_ingeniero_fk = ? AND estado = 'Abierto' ORDER BY id_ticket_pk DESC", [id_support], (err, row) => {
                    let data = {
                        "name": req.session.nameSupport,
                        "stats": stats,
                        "prioridad": prioridad,
                        "tickets": row
                    }
                    res.render("support/panel-support.ejs", data);
                });
            });
        });
    }
});

app.get("/dashboard-support/ticket-info/:id", (req, res) => {
    if (req.session.idSupport === undefined) {
        res.redirect("/support-login");
    } else {
        let id_ticket = req.params.id;

        db.all("SELECT id_ticket_pk, id_empresa_fk, descripcion, fecha, tiempo, version, prioridad, estado, contenido FROM tickets, empresas, referencia WHERE id_referencia_fk = id_referencia_pk AND id_ticket_pk = ?", [id_ticket], (err, row) => {
            let ticket_info = row;
            let id_empresa = row[0].id_empresa_fk;

            db.all("SELECT razon, telefono, correo_empresarial, correo FROM empresas, usuarios WHERE id_usuario_fk = id_usuario_pk AND id_empresa_pk = ?", [id_empresa], (err, row) => {
                let empresa = row;

                db.all("SELECT id_comentario_pk, tipo_usuario, contenido FROM comentarios WHERE id_ticket_fk = ?", [id_ticket], (err, row) => {
                    let comentarios = row;
                    db.all("SELECT ruta FROM imagenes WHERE id_ticket_fk = ?", [id_ticket], (err, row) => {
                        let data = {
                            "name": req.session.nameSupport,
                            "ticket": ticket_info,
                            "empresa": empresa,
                            "comentarios": comentarios,
                            "imagenes": row
                        }
                        res.render("support/panel-support-ticket-info.ejs", data);
                    });
                }); 
            });
        });
    }
});

app.get("/dashboard-support/ticket-info/status-update/:id", (req, res) => {
    let id = req.params.id;

    db.all("UPDATE tickets SET estado = 'En proceso' WHERE id_ticket_pk = ?", [id], () => {
        res.redirect("/dashboard-support/ticket-info/" + id);
    });
});

app.post("/dashboard-support/ticket-info/status-end", (req, res) => {
    let id_ticket = req.body.id_ticket;
    let horas = req.body.horas;

    db.run("UPDATE tickets SET estado = 'Liberado', tiempo = ? WHERE id_ticket_pk = ?", [horas, id_ticket], () => {
        res.redirect("/dashboard-support/ticket-info/"+id_ticket);
    });
});

app.post("/dashboard-support/ticket-info/comment-post", (req, res) => {
    let id_ticket = req.body.id_ticket;
    let contenido = req.body.contenido;

    db.all("INSERT INTO comentarios(id_ticket_fk, tipo_usuario, contenido) VALUES(?, 'Soporte',?)", [id_ticket, contenido], () => {
        res.redirect("/dashboard-support/ticket-info/" + id_ticket);
    })
});

app.get("/dashboard-support/ticket-info/comment-delete/:id/:id_ticket", (req, res) => {
    let id_comentario = req.params.id;
    let id_ticket = req.params.id_ticket;

    db.run("DELETE FROM comentarios WHERE id_comentario_pk = ?", [id_comentario], () => {
        res.redirect("/dashboard-support/ticket-info/" + id_ticket);
    });
});

app.get("/dashboard-support/tickets", (req, res) => {
    if (req.session.idSupport === undefined) {
        res.redirect("/support-login");
    } else {
        let id_support = req.session.idSupport;

        db.all("SELECT id_ticket_pk, razon, contenido, descripcion, fecha, tiempo, version, prioridad, estado FROM tickets, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND estado = 'Abierto' AND id_ingeniero_fk = ? ORDER BY id_ticket_pk DESC", [id_support], (err, row) => {
            let data = {
                "name": req.session.nameSupport,
                "tickets": row,
                "title_table": "Abiertos"
            }
            res.render("support/panel-support-tickets.ejs", data);
        });   
    }
});

app.get("/dashboard-support/tickets-process", (req, res) => {
    if (req.session.idSupport === undefined) {
        res.redirect("/support-login");
    } else {
        let id_support = req.session.idSupport;

        db.all("SELECT id_ticket_pk, razon, contenido, descripcion, fecha, tiempo, version, prioridad, estado FROM tickets, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND estado = 'En proceso' AND id_ingeniero_fk = ? ORDER BY id_ticket_pk DESC", [id_support], (err, row) => {
            let data = {
                "name": req.session.nameSupport,
                "tickets": row,
                "title_table": "En proceso"
            }
            res.render("support/panel-support-tickets.ejs", data);
        });
    }
});

app.get("/dashboard-support/tickets-ended", (req, res) => {
    if (req.session.idSupport === undefined) {
        res.redirect("/support-login");
    } else {
        let id_support = req.session.idSupport;

        db.all("SELECT id_ticket_pk, razon, contenido, descripcion, fecha, tiempo, version, prioridad, estado FROM tickets, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND estado = 'Liberado' AND id_ingeniero_fk = ? ORDER BY id_ticket_pk DESC", [id_support], (err, row) => {
            let data = {
                "name": req.session.nameSupport,
                "tickets": row,
                "title_table": "Liberados"
            }
            res.render("support/panel-support-tickets.ejs", data);
        });
    }
});

app.get("/dashboard-support/profile", (req, res) => {
    if (req.session.idSupport === undefined) {
        res.redirect("/support-login");
    } else {
        let id_usuario = req.session.idUser;

        db.all("SELECT nombre, correo, password, categoria FROM usuarios, ingenieros WHERE id_usuario_pk = id_usuario_fk AND id_usuario_pk = ?", [id_usuario], (err, row) => {
            let data = {
                "name": req.session.nameSupport,
                "support": row
            }
            res.render("support/panel-support-profile.ejs", data);
        });
    }
});

app.post("/dashboard-support/profile-update", (req, res) => {
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let password = req.body.password;
    let id_user = req.session.idUser;

    db.run("UPDATE usuarios SET nombre = ?, correo = ?, password = ? WHERE id_usuario_pk = ?", [nombre, correo, password, id_user], () => {
        res.redirect("/dashboard-support/profile");
    });
});

// #########################################################################################################
//                                        PANEL DE SOPORTE
// #########################################################################################################

// #########################################################################################################
//                                        PANEL DE ADMINISTRADOR
// #########################################################################################################

app.get("/login-admin", (req, res) => {
    res.render("login-admin.ejs");
});

app.get("/logout-admin", (req, res) => {
    delete req.session.idAdministrador;
    delete req.session.nameAdmin;
    
    res.redirect('/login-admin');
});

app.post("/login-admin/session", (req, res) => {
    let correo = req.body.correo;
    let password = req.body.password;

    db.all("SELECT id_usuario_pk, nombre FROM usuarios WHERE correo = ? AND password = ?", [correo, password], (err, row) => {
        if (row.length === 0 || row === undefined) {
            res.redirect("/login-admin");
        } else {
            req.session.idAdministrador = row[0].id_usuario_pk;
            req.session.nameAdmin = row[0].nombre;

            res.redirect("/dashboard-admin");
        }
    });
});

app.get("/dashboard-admin", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        let consulta = `SELECT(SELECT COUNT(*) FROM tickets WHERE estado = "Abierto") as abiertos,
            (SELECT COUNT(*) FROM tickets WHERE estado = "En proceso") as proceso,
            (SELECT COUNT(*) FROM tickets WHERE estado = "Liberado") as liberado,
            (SELECT COUNT(*) FROM tickets WHERE prioridad = "Por evaluar") as por_evaluar,
            (SELECT COUNT(*) FROM tickets WHERE prioridad = "Baja") as baja,
            (SELECT COUNT(*) FROM tickets WHERE prioridad = "Normal") as normal,
            (SELECT COUNT(*) FROM tickets WHERE prioridad = "Alta") as alta,
            (SELECT COUNT(*) FROM tickets WHERE prioridad = "Urgente") as urgente,
            (SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = "Empresa") as empresas,
            (SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = "Ingeniero") as ingenieros`;

        let estados = [], prioridades = [], abiertos, liberados, empresas, ingenieros;

        db.all(consulta, (err, row) => {
            estados = [row[0].abiertos, row[0].proceso, row[0].liberado];
            prioridades = [row[0].por_evaluar, row[0].baja, row[0].normal, row[0].alta, row[0].urgente];
            abiertos = row[0].abiertos;
            liberados = row[0].liberado;
            empresas = row[0].empresas;
            ingenieros = row[0].ingenieros;

            db.all("SELECT id_ticket_pk, contenido, fecha, version, prioridad, estado FROM tickets, referencia WHERE id_referencia_fk = id_referencia_pk ORDER BY id_ticket_pk DESC", (err, row) => {
                let data = {
                    "name": req.session.nameAdmin,
                    "estados": JSON.stringify(estados),
                    "prioridades": JSON.stringify(prioridades),
                    "abiertos": abiertos,
                    "liberados": liberados,
                    "empresas": empresas,
                    "ingenieros": ingenieros,
                    "tickets": row
                }
                res.render("admin/panel-admin.ejs", data);
            });
        });
    }
});

app.get("/dashboard-admin/ticket-info/:id_ticket", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        let id_ticket = req.params.id_ticket;

        db.all("SELECT id_ticket_pk, id_empresa_fk, id_ingeniero_fk, id_referencia_fk, descripcion, fecha, tiempo, version, prioridad, estado, contenido, id_usuario_fk, telefono, correo_empresarial, nombre, correo FROM tickets, referencia, empresas, usuarios WHERE id_ticket_pk = ? AND id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND id_usuario_fk = id_usuario_pk", [id_ticket], (err, row) => {
            let info_ticket = row;

            if (row[0].id_ingeniero_fk === null) {
                db.all("SELECT contenido, tipo_usuario FROM comentarios WHERE id_ticket_fk = ?", (err, row) => {
                    let comentarios = row;
                    db.all("SELECT ruta FROM imagenes WHERE id_ticket_fk = ?", [id_ticket], (err, row) => {
                        let imagenes = row;
                        db.all("SELECT id_ingeniero_pk, nombre FROM ingenieros, usuarios WHERE id_usuario_fk = id_usuario_pk", (err, row) => {
                            let ingenieros = row;
                            let data = {
                                "name": req.session.nameAdmin,
                                "ticket": info_ticket,
                                "comentarios": comentarios,
                                "imagenes": imagenes,
                                "ingenieros": ingenieros
                            }
                            res.render("admin/panel-admin-ticket.ejs", data);
                        });
                    });
                });
            } else {
                let id_ingeniero = row[0].id_ingeniero_fk;
                db.all("SELECT id_usuario_fk, categoria, nombre FROM ingenieros, usuarios WHERE id_usuario_fk = id_usuario_pk AND id_ingeniero_pk = ?", [id_ingeniero], (err, row) => {
                    let ingeniero = row;
                    db.all("SELECT contenido, tipo_usuario FROM comentarios WHERE id_ticket_fk = ?", [id_ticket], (err, row) => {
                        let comentarios = row;
                        db.all("SELECT ruta FROM imagenes WHERE id_ticket_fk = ?", [id_ticket], (err, row) => {
                            let imagenes = row;
                            let data = {
                                "name": req.session.nameAdmin,
                                "ticket": info_ticket,
                                "ingeniero": ingeniero,
                                "comentarios": comentarios,
                                "imagenes": imagenes
                            }
                            res.render("admin/panel-admin-ticket.ejs", data);
                        });
                    });
                });
            }
        });
    }
});

app.get("/dashboard-admin/ticket-infor/delete-inge/:id_ticket", (req, res) => {
    let id_ticket = req.params.id_ticket;

    db.run("UPDATE tickets SET id_ingeniero_fk = NULL WHERE id_ticket_pk = ?", [id_ticket], (err, row) => {
        res.redirect("/dashboard-admin/ticket-info/" + id_ticket);
    });
});

app.get("/dashboard-admin/ticket-infor/delete-priority/:id_ticket", (req, res) => {
    let id_ticket = req.params.id_ticket;

    db.run("UPDATE tickets SET prioridad = 'Por evaluar' WHERE id_ticket_pk = ?", [id_ticket], (err, row) => {
        res.redirect("/dashboard-admin/ticket-info/" + id_ticket);
    });
});

app.post("/dashboard-admin/ticket-info/asign-inge", (req, res) => {
    let id_ticket = req.body.id_ticket;
    let ingeniero = req.body.ingeniero;

    db.all("UPDATE tickets SET id_ingeniero_fk = ? WHERE id_ticket_pk = ?", [ingeniero, id_ticket], (err, row) => {
        res.redirect("/dashboard-admin/ticket-info/" + id_ticket);
    });
});

app.post("/dashboard-admin/ticket-info/asign-priority", (req, res) => {
    let id_ticket = req.body.id_ticket;
    let prioridad = req.body.prioridad;

    db.all("UPDATE tickets SET prioridad = ? WHERE id_ticket_pk = ?", [prioridad, id_ticket], (err, row) => {
        res.redirect("/dashboard-admin/ticket-info/" + id_ticket);
    });
});

app.get("/dashboard-admin/tickets", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        db.all("SELECT id_ticket_pk, razon, contenido, fecha, version, prioridad, razon FROM tickets, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND estado = 'Abierto'", (err, row) => {
            let data = {
                "name": req.session.nameAdmin,
                "tickets": row
            }
            res.render("admin/panel-admin-tickets.ejs", data);
        });
    }
});

app.get("/dashboard-admin/tickets-process", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        db.all("SELECT id_ticket_pk, razon, contenido, fecha, version, prioridad, razon FROM tickets, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND estado = 'En proceso'", (err, row) => {
            let data = {
                "name": req.session.nameAdmin,
                "tickets": row
            }
            res.render("admin/panel-admin-tickets-process.ejs", data);
        });
    }
});

app.get("/dashboard-admin/tickets-terminados", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        db.all("SELECT id_ticket_pk, razon, contenido, fecha, version, prioridad, razon FROM tickets, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND id_referencia_fk = id_referencia_pk AND estado = 'Liberado'", (err, row) => {
            let data = {
                "name": req.session.nameAdmin,
                "tickets": row
            }
            res.render("admin/panel-admin-tickets-ended.ejs", data);
        });
    }
});

app.get("/dashboard-admin/support", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        db.all("SELECT id_usuario_pk, nombre, correo, password, categoria FROM usuarios, ingenieros WHERE usuarios.id_usuario_pk = ingenieros.id_usuario_fk AND tipo_usuario = 'Ingeniero'", (err, row) => {
            data = {
                "name": req.session.nameAdmin,
                "administradores": row
            }
            res.render("admin/panel-admin-support.ejs", data);
        });
    }
});

app.post("/dashboard-admin/support/register", (req, res) => {
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let categoria = req.body.categoria;

    let fecha = new Date();
    let password = fecha.getDate() + '' + (fecha.getMonth() + 1) + '' + fecha.getFullYear() + '' + fecha.getHours() + '' + fecha.getMinutes() + '' + fecha.getSeconds();

    db.all("INSERT INTO usuarios(nombre, correo, password, tipo_usuario) VALUES(?,?,?, 'Ingeniero')", [nombre, correo, password], (err, row) => {
        db.all("SELECT id_usuario_pk FROM usuarios WHERE correo = ?", [correo], (err, row) => {
            id_usuario_pk = row[0].id_usuario_pk;
            db.all("INSERT INTO ingenieros(id_usuario_fk, categoria) VALUES(?, ?)", [id_usuario_pk, categoria], (err, row) => {
                res.redirect("/dashboard-admin/support");
            });
        });
    });
});

let id_ingeniero;

app.get("/support-info/:id", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        id_ingeniero = req.params.id;
        db.all("SELECT nombre, correo, password, categoria FROM usuarios, ingenieros WHERE usuarios.id_usuario_pk = ? AND usuarios.id_usuario_pk = ingenieros.id_usuario_fk", [id_ingeniero], (err, row) => {
            data = {
                "name": req.session.nameAdmin,
                "ingeniero": row
            }
            res.render("admin/panel-admin-support-info.ejs", data);
        });
    }
});

app.post("/support-info/update", (req, res) => {
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let password = req.body.password;
    let categoria = req.body.categoria;

    db.run("UPDATE usuarios SET nombre = ?, correo = ?, password = ? WHERE id_usuario_pk = ?", [nombre, correo, password, id_ingeniero], () => {
        db.run("UPDATE ingenieros SET categoria = ? WHERE id_usuario_fk = ?", [categoria, id_ingeniero], () => {
            res.redirect("/support-info/" + id_ingeniero);
        });
    });
});

app.get("/support-info/delete/:id", (req, res) => {
    let id = req.params.id;
    db.run("DELETE FROM ingenieros WHERE id_usuario_fk = ?", [id], () => {
        db.run("DELETE FROM usuarios WHERE id_usuario_pk = ?", [id], () => {
            res.redirect("/dashboard-admin/support");
        });
    });
});

app.get("/dashboard-admin/company-list", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        db.all("SELECT id_usuario_pk, nombre, correo, telefono, correo_empresarial, poliza, no_candado FROM usuarios, empresas WHERE id_usuario_pk = id_usuario_fk", (err, row) => {
            let data = {
                "name": req.session.nameAdmin,
                "empresas": row
            }
            res.render("admin/panel-admin-company-list.ejs", data);
        });
    }
});

app.get("/dashboard-admin/company-list/company-info/:id", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        let id = req.params.id;
        db.all("SELECT nombre, correo, telefono, id_empresa_pk, correo_empresarial, poliza, no_candado FROM usuarios, empresas WHERE id_usuario_pk = id_usuario_fk AND id_usuario_pk = ?", [id], (err, row) => {
            let info_empresa = row;
            let id_empresa = row[0].id_empresa_pk;
            db.all("SELECT id_ticket_pk, contenido, fecha, version, estado, prioridad FROM tickets, ingenieros, usuarios, referencia WHERE id_usuario_fk = id_usuario_pk AND id_referencia_fk = id_referencia_pk AND id_empresa_fk = ?", [id_empresa], (err, row) => {
                let data = {
                    "name": req.session.nameAdmin,
                    "empresa": info_empresa,
                    "tickets": row
                }
                console.log(data);
                res.render("admin/panel-admin-company-info.ejs", data);
            });
        });
    }
});

app.get("/dashboard-admin/references", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        db.all("SELECT id_referencia_pk, contenido FROM referencia", (err, row) => {
            let data = {
                "name": req.session.nameAdmin,
                "referencias": row
            }
            res.render("admin/panel-admin-references.ejs", data);
        });
    }
});

app.post("/dashboard-admin/references/register", (req, res) => {
    let referencia = req.body.referencia;
    db.all("INSERT INTO referencia(contenido) VALUES(?)", [referencia], () => {
        res.redirect("/dashboard-admin/references");
    });
});

app.get("/dashboard-admin/reportes", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        db.all("SELECT id_reporte_pk, mes, year, fecha FROM reportes ORDER BY id_reporte_pk DESC", (err, row) => {
            var fecha = new Date();
            let mes = fecha.getMonth();

            let data = {
                "name": req.session.nameAdmin,
                "mes": mes,
                "reportes": row
            }
            res.render("admin/panel-admin-reports.ejs", data);
        });
    }
});

app.post("/dashboard-admin/reportes/register", (req, res) => {
    let mes = req.body.mes;
    let fecha = new Date;
    let year = fecha.getFullYear();

    let fecha_completa = fecha.getDay() + "-" + (fecha.getMonth() + 1) + "-" + fecha.getFullYear();

    db.all("INSERT INTO reportes(mes, year, fecha) VALUES(?,?, ?)", [mes, year, fecha_completa], (err, row) => {
        res.redirect("/dashboard-admin/reportes");
    });
});

app.get("/dashboard-admin/reportes/delete/:id", (req, res) => {
    let id = req.params.id;

    db.run("DELETE FROM reportes WHERE id_reporte_pk = ?", [id], () => {
        res.redirect("/dashboard-admin/reportes");
    });
});

app.get("/dashboard-admin/reportes/info/:id", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        let id = req.params.id;

        db.all("SELECT mes, year FROM reportes WHERE id_reporte_pk = ?", [id], (err, row) => {
            let mes = "0" + row[0].mes;
            let year = row[0].year;

            db.all("SELECT id_ticket_pk, id_empresa_fk, fecha, version, tiempo, prioridad, nombre, contenido FROM tickets, usuarios, empresas, referencia WHERE id_empresa_fk = id_empresa_pk AND empresas.id_usuario_fk = usuarios.id_usuario_pk AND id_referencia_fk = id_referencia_pk AND estado = 'Liberado' AND id_empresa_fk = id_empresa_pk AND id_usuario_fk = id_usuario_pk AND strftime('%m', fecha) = '" + mes + "' AND strftime('%Y', fecha) = '" + year + "' ORDER BY id_ticket_pk DESC", (err, row) => {
                let data = {
                    "tickets": row
                }
                res.render("admin/template-report.ejs", data);
            });
        });
    }
});

app.get("/dashboard-admin/profile", (req, res) => {
    if (req.session.idAdministrador === undefined) {
        res.redirect("/login-admin");
    } else {
        let id_admin = req.session.idAdministrador;
        db.all("SELECT id_usuario_pk, nombre, correo, password FROM usuarios WHERE id_usuario_pk = ?", [id_admin], (err, row) => {
            let data = {
                "name": req.session.nameAdmin,
                "admin": row
            }
            res.render("admin/panel-admin-profile.ejs", data);
        });
    }
});

app.post("/dashboard-admin/profile/update", (req, res) => {
    let id_admin = req.session.idAdministrador;
    let nombre = req.body.nombre;
    let correo = req.body.correo;
    let password = req.body.password;

    db.run("UPDATE usuarios SET nombre = ?, correo = ?, password = ? WHERE id_usuario_pk = ?", [nombre, correo, password, id_admin], (err, row) => {
        res.redirect("/dashboard-admin/profile");
    })
});

app.post("/dashboard-admin/profile/new-admin", (req, res) => {
    let password_auth = req.body.password_auth;

    db.all("SELECT COUNT(id_password_pk) as pass FROM passwords WHERE password = ?", [password_auth], (err, row) => {
        if (row[0].pass > 0) {
            let nombre = req.body.nombre;
            let correo = req.body.correo;
            let password = req.body.password;

            db.all("INSERT INTO usuarios(nombre, correo, password, tipo_usuario) VALUES(?, ?, ?, 'Admin')", [nombre, correo, password], (err, row) => {
                res.redirect("/dashboard-admin/profile");
            });
        } else {
            res.redirect("/dashboard-admin/profile");
        }
    });
});


// #########################################################################################################
//                                        PANEL DE ADMINISTRADOR
// #########################################################################################################

//  RUTAS DE LA APLICACION --------------------------------------------------------------------------------

// CONFIGURACION DEL PUERTO
app.listen(3000, (req, res) => {
    console.log("u can see the project in http://localhost:3000");
});


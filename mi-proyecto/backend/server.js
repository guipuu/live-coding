const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // 👈 Módulo nativo de Node.js ¡No hay que instalar nada!

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 🛡️ MEMORIA DEL SERVIDOR: Aquí guardaremos las sesiones activas
// Funciona como un diccionario: { "token_super_largo": "Snopy" }
const sesionesActivas = new Map();

// ==========================================
// CONEXIÓN Y CREACIÓN DE TABLAS
// ==========================================
const db = new sqlite3.Database('./foro.db', (err) => {
    if (err) {
        console.error("❌ Error conectando a la base de datos:", err.message);
    } else {
        console.log("🌿 Base de datos conectada.");
        
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            username TEXT UNIQUE NOT NULL, 
            password TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            autor TEXT NOT NULL, 
            texto TEXT NOT NULL, 
            fecha TEXT NOT NULL,
            parent_id INTEGER DEFAULT NULL
        )`);
    }
});

// ==========================================
// 🛡️ MIDDLEWARE: EL PORTERO DE LA DISCOTECA
// ==========================================
function verificarToken(req, res, next) {
    const cabecera = req.headers['authorization'];
    if (!cabecera) return res.status(403).json({ error: "Falta el token de seguridad." });

    const token = cabecera.split(" ")[1]; // Quitamos la palabra "Bearer "
    
    // Buscamos el token en nuestra memoria
    const usuarioAsociado = sesionesActivas.get(token);

    if (!usuarioAsociado) {
        return res.status(401).json({ error: "Sesión inválida o caducada. Vuelve a iniciar sesión." });
    }
    
    // Si existe, le dejamos pasar y guardamos su nombre para la petición
    req.usuario = { username: usuarioAsociado }; 
    next(); 
}

// ==========================================
// RUTA 1: REGISTRO
// ==========================================
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan datos" });
    
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run("INSERT INTO usuarios (username, password) VALUES (?, ?)", [username, hash], function(err) {
            if (err) return res.status(409).json({ error: "Usuario ya existe" });
            res.status(201).json({ mensaje: "Registrado con éxito" });
        });
    } catch (e) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// ==========================================
// RUTA 2: LOGIN (CON NUESTRO SISTEMA CASERO)
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ error: "Faltan usuario o contraseña" });

    db.get("SELECT * FROM usuarios WHERE username = ?", [username], async (err, user) => {
        if (err) return res.status(500).json({ error: "Error en la base de datos" });
        if (!user) return res.status(401).json({ error: "El usuario no existe" });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            // 🛡️ 1. Generamos un código aleatorio indescifrable
            const token = crypto.randomBytes(32).toString('hex');
            
            // 🛡️ 2. Lo guardamos en la memoria del servidor
            sesionesActivas.set(token, user.username);
            
            // 🛡️ 3. Se lo enviamos al usuario
            res.json({ mensaje: "¡Bienvenido!", username: user.username, token: token });
        } else {
            res.status(401).json({ error: "Contraseña incorrecta" });
        }
    });
});

// ==========================================
// RUTA 3: MENSAJES (Muro e Hilos)
// ==========================================
app.get('/api/messages', (req, res) => {
    db.all("SELECT * FROM mensajes ORDER BY fecha ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al leer mensajes" });
        res.json(rows);
    });
});

// 🛡️ RUTA PROTEGIDA: PUBLICAR
app.post('/api/messages', verificarToken, (req, res) => {
    const { texto, parent_id } = req.body; 
    
    // Sacamos el autor directamente de nuestra comprobación de seguridad
    const autorReal = req.usuario.username; 

    if (!texto) return res.status(400).json({ error: "El mensaje está vacío" });

    db.run("INSERT INTO mensajes (autor, texto, fecha, parent_id) VALUES (?, ?, ?, ?)", 
        [autorReal, texto, new Date().toISOString(), parent_id || null], 
        function(err) {
            if (err) return res.status(500).json({ error: "Error en BD" });
            res.status(201).json({ id: this.lastID });
        }
    );
});

// ==========================================
// RUTA 4: BORRAR MENSAJE (🛡️ SÚPER PROTEGIDA)
// ==========================================
app.delete('/api/messages/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const usuarioPeticion = req.usuario.username;

    // Miramos de quién es el mensaje en la base de datos
    db.get("SELECT autor FROM mensajes WHERE id = ?", [id], (err, mensaje) => {
        if (err) return res.status(500).json({ error: "Error al buscar el mensaje" });
        if (!mensaje) return res.status(404).json({ error: "Mensaje no encontrado" });
        
        // Comprobamos si el autor coincide con el usuario que hace la petición
        if (mensaje.autor !== usuarioPeticion) {
            return res.status(403).json({ error: "¡Eh! No puedes borrar mensajes de otras personas." });
        }

        // Si es suyo, lo borramos
        db.run("DELETE FROM mensajes WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: "Error al borrar" });
            res.json({ mensaje: "Mensaje eliminado correctamente" });
        });
    });
});

app.listen(PORT, () => console.log(`🚀 API Segura corriendo en el puerto ${PORT}`));
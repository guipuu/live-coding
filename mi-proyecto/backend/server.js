const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// CONEXIÓN Y CREACIÓN DE TABLAS
// ==========================================
const db = new sqlite3.Database('./foro.db', (err) => {
    if (err) {
        console.error("❌ Error conectando a la base de datos:", err.message);
    } else {
        console.log("🌿 Base de datos conectada.");
        
        // 1. Crear tabla de usuarios
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            username TEXT UNIQUE NOT NULL, 
            password TEXT NOT NULL
        )`);

        // 2. ¡EL FIX!: Crear tabla de mensajes (Faltaba esto)
        db.run(`CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            autor TEXT NOT NULL, 
            texto TEXT NOT NULL, 
            fecha TEXT NOT NULL
        )`);
    }
});

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
// RUTA 2: LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Faltan usuario o contraseña" });
    }

    db.get("SELECT * FROM usuarios WHERE username = ?", [username], async (err, user) => {
        if (err) return res.status(500).json({ error: "Error en la base de datos" });
        if (!user) return res.status(401).json({ error: "El usuario no existe" });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ mensaje: "¡Bienvenido!", username: user.username });
        } else {
            res.status(401).json({ error: "Contraseña incorrecta" });
        }
    });
});

// ==========================================
// RUTA 3: MENSAJES
// ==========================================

// Obtener todos los mensajes
app.get('/api/messages', (req, res) => {
    db.all("SELECT * FROM mensajes ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al leer mensajes" });
        res.json(rows);
    });
});

// Publicar un mensaje nuevo
app.post('/api/messages', (req, res) => {
    const { autor, texto } = req.body;
    if (!autor || !texto) return res.status(400).json({ error: "Faltan datos" });

    db.run("INSERT INTO mensajes (autor, texto, fecha) VALUES (?, ?, ?)", 
        [autor, texto, new Date().toISOString()], 
        function(err) {
            if (err) {
                console.error("❌ Error de SQL:", err.message);
                return res.status(500).json({ error: "Error al guardar mensaje en DB" });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
});

// ==========================================
// RUTA 4: BORRAR MENSAJE
// ==========================================
app.delete('/api/messages/:id', (req, res) => {
    const { id } = req.params;
    
    // Borramos el mensaje por su ID
    db.run("DELETE FROM mensajes WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: "Error al borrar" });
        res.json({ mensaje: "Mensaje eliminado correctamente" });
    });
});

// El servidor se pone a escuchar al final
app.listen(PORT, () => console.log(`🚀 API corriendo en el puerto ${PORT}`));
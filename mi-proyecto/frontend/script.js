// ==========================================
// 0. MODO OSCURO (DARK MODE)
// ==========================================
const btnDarkMode = document.getElementById('btn-dark-mode');

if (localStorage.getItem('temaGreenPlace') === 'dark') {
    document.body.classList.add('dark-mode');
}

if (btnDarkMode) {
    btnDarkMode.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const esOscuro = document.body.classList.contains('dark-mode');
        localStorage.setItem('temaGreenPlace', esOscuro ? 'dark' : 'light');
    });
}

// ==========================================
// 1. SISTEMA DE POP-UPS (TOASTS)
// ==========================================
function mostrarPopUp(mensaje, esError = false) {
    let contenedor = document.getElementById('toast-container');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toast-container';
        document.body.appendChild(contenedor);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${esError ? 'error' : ''}`;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.4s reverse backwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ==========================================
// 2. CARGAR MENSAJES DESDE EL BACKEND (Muro)
// ==========================================
const contenedorMensajes = document.getElementById('lista-mensajes');

async function cargarMensajes() {
    if (!contenedorMensajes) return;
    contenedorMensajes.innerHTML = '<p style="text-align:center;">Cargando el jardín...</p>'; 

    try {
        const respuesta = await fetch('http://localhost:3000/api/messages');
        const mensajes = await respuesta.json();

        contenedorMensajes.innerHTML = ''; 

        if (mensajes.length === 0) {
            contenedorMensajes.innerHTML = '<p style="text-align:center;">El muro está vacío. ¡Planta el primer mensaje!</p>';
            return;
        }

        // Los mostramos (el backend ya los manda ordenados por fecha)
        mensajes.forEach(msg => { 
            const article = document.createElement('article');
            
            // Estructura de la tarjeta de mensaje
            article.innerHTML = `
                <header>
                    <strong>${msg.autor}</strong> 
                    <small style="float:right;">${new Date(msg.fecha).toLocaleString()}</small>
                </header>
                <p>${msg.texto}</p>
            `;
            contenedorMensajes.appendChild(article);
        });
    } catch (error) {
        contenedorMensajes.innerHTML = '<p style="color:red; text-align:center;">No se pudo conectar con el servidor.</p>';
    }
}
// Ejecutar al cargar la página
cargarMensajes();

// ==========================================
// 3. PUBLICAR MENSAJE (Enlace al Backend)
// ==========================================
const formMensaje = document.getElementById('form-mensaje');
if (formMensaje) {
    formMensaje.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usuarioActual = localStorage.getItem('usuarioActivo');
        const campoTexto = document.getElementById('texto-mensaje');
        const textoVal = campoTexto.value.trim();

        if (!usuarioActual) return mostrarPopUp("Inicia sesión para participar.", true);
        if (!textoVal) return mostrarPopUp("El mensaje no puede estar vacío.", true);

        try {
            const respuesta = await fetch('http://localhost:3000/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    autor: usuarioActual, 
                    texto: textoVal 
                })
            });

            if (respuesta.ok) {
                campoTexto.value = ''; 
                mostrarPopUp("¡Mensaje publicado!");
                cargarMensajes(); // Refrescar el muro
            } else {
                mostrarPopUp("Error al publicar en el servidor.", true);
            }
        } catch (error) {
            mostrarPopUp("Error de conexión.", true);
        }
    });
}

// ==========================================
// 4. REGISTRO Y LOGIN (Sincronizado)
// ==========================================

// Registro
const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (password !== confirmPass) return mostrarPopUp("Las contraseñas no coinciden.", true);

        try {
            const respuesta = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const datos = await respuesta.json();
            if (respuesta.ok) {
                mostrarPopUp("¡Cuenta creada con éxito!");
                setTimeout(() => window.location.href = 'login.html', 1500);
            } else {
                mostrarPopUp(datos.error || "Error en el registro.", true);
            }
        } catch (error) {
            mostrarPopUp("Error de conexión con el servidor.", true);
        }
    });
}

// Login
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            const respuesta = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const datos = await respuesta.json();
            if (respuesta.ok) {
                localStorage.setItem('usuarioActivo', datos.username);
                mostrarPopUp(`¡Bienvenido, ${datos.username}!`);
                setTimeout(() => window.location.href = 'index.html', 1000);
            } else {
                mostrarPopUp(datos.error || "Usuario o clave incorrectos.", true);
            }
        } catch (error) {
            mostrarPopUp("Error de conexión.", true);
        }
    });
}

// ==========================================
// 5. PERFIL Y LOGOUT
// ==========================================
const contenedorMisMensajes = document.getElementById('mis-mensajes');
const nombrePerfil = document.getElementById('nombre-usuario-perfil');
const fotoPerfil = document.getElementById('foto-perfil');
const btnLogout = document.getElementById('btn-logout');

if (contenedorMisMensajes && nombrePerfil) {
    const usuarioActual = localStorage.getItem('usuarioActivo');
    
    if (!usuarioActual) {
        window.location.href = 'login.html';
    } else {
        nombrePerfil.textContent = usuarioActual;
        fotoPerfil.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${usuarioActual}&backgroundColor=10b981`;
        
        // Cargar solo los mensajes de este usuario
        cargarMisMensajes(usuarioActual);
    }
}

async function cargarMisMensajes(usuario) {
    try {
        const respuesta = await fetch('http://localhost:3000/api/messages');
        const mensajes = await respuesta.json();
        // Filtramos solo los del usuario logueado
        const misMensajes = mensajes.filter(m => m.autor === usuario);
        
        contenedorMisMensajes.innerHTML = misMensajes.length ? '' : '<p style="text-align:center;">No has plantado nada aún.</p>';
        
        misMensajes.forEach(msg => {
            const article = document.createElement('article');
            article.innerHTML = `
                <header>
                    <strong>${msg.autor}</strong> 
                    <small style="float:right;">${new Date(msg.fecha).toLocaleString()}</small>
                </header>
                <p>${msg.texto}</p>
                <footer>
                    <button onclick="borrarMensaje(${msg.id})" style="background-color: #dc2626; border: none; padding: 5px 15px; font-size: 0.8rem;">🗑️ Borrar</button>
                </footer>
            `;
            contenedorMisMensajes.appendChild(article);
        });
    } catch (e) { console.error("Error en perfil"); }
}

// NUEVA FUNCIÓN: Habla con el backend para borrar
window.borrarMensaje = async function(id) {
    if (!confirm("¿Seguro que quieres arrancar esta planta? (Borrar mensaje)")) return;

    try {
        const respuesta = await fetch(`http://localhost:3000/api/messages/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            mostrarPopUp("Mensaje eliminado");
            const usuarioActual = localStorage.getItem('usuarioActivo');
            cargarMisMensajes(usuarioActual); // Recargamos para que desaparezca
        }
    } catch (e) {
        mostrarPopUp("No se pudo borrar", true);
    }
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('usuarioActivo');
        mostrarPopUp("Sesión cerrada.");
        setTimeout(() => window.location.href = 'login.html', 1000);
    });
}
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

// ---------------------------------------------------------
// VARIABLES GLOBALES
// ---------------------------------------------------------
let idParaBorrar = null;

// ==========================================
// 1. SISTEMA DE ALERTAS (MODAL GENÉRICO)
// ==========================================
// Creamos el HTML de la ventana emergente de avisos una sola vez
function crearModalAviso() {
    if (document.getElementById('modal-aviso')) return; 
    
    const modalHTML = `
    <dialog id="modal-aviso">
        <article>
            <header>
                <button aria-label="Close" class="close" onclick="cerrarModalAviso()"></button>
                <strong id="modal-aviso-titulo">Aviso</strong>
            </header>
            <p id="modal-aviso-mensaje" style="margin-top: 1rem; font-size: 1.1rem;"></p>
            <footer>
                <button onclick="cerrarModalAviso()" style="background-color: var(--verde-brillante); border: none; color: white;">Entendido</button>
            </footer>
        </article>
    </dialog>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
crearModalAviso();

// Función para cerrar este aviso
window.cerrarModalAviso = function() {
    const modal = document.getElementById('modal-aviso');
    if(modal) modal.removeAttribute('open');
};

// Transformamos la antigua función para que ahora use la ventana emergente
window.mostrarPopUp = function(mensaje, esError = false) {
    const modal = document.getElementById('modal-aviso');
    const titulo = document.getElementById('modal-aviso-titulo');
    const texto = document.getElementById('modal-aviso-mensaje');

    // Cambiamos el título y el color según si es un error o un éxito
    if (esError) {
        titulo.innerHTML = '⚠️ Error';
        titulo.style.color = '#dc2626'; // Rojo
    } else {
        titulo.innerHTML = '✅ Genial';
        titulo.style.color = 'var(--verde-brillante)'; // Verde
    }

    texto.textContent = mensaje;
    modal.setAttribute('open', true); // Mostramos el pop-up
};

// ==========================================
// 2. CARGAR MENSAJES (Muro Principal Anidado)
// ==========================================
async function cargarMensajes() {
    const contenedorMensajes = document.getElementById('lista-mensajes');
    if (!contenedorMensajes) return; 
    
    contenedorMensajes.innerHTML = '<p style="text-align:center;">Cargando el jardín...</p>'; 

    try {
        const urlFresca = `http://localhost:3000/api/messages?t=${new Date().getTime()}`;
        const respuesta = await fetch(urlFresca, { cache: 'no-store' });
        const mensajes = await respuesta.json();

        contenedorMensajes.innerHTML = ''; 

        if (mensajes.length === 0) {
            contenedorMensajes.innerHTML = '<p style="text-align:center;">El muro está vacío. ¡Planta el primer mensaje!</p>';
            return;
        }

        const principales = mensajes.filter(m => !m.parent_id).reverse();
        const respuestas = mensajes.filter(m => m.parent_id);

        principales.forEach(msg => { 
            const article = document.createElement('article');
            
            const susRespuestas = respuestas.filter(r => r.parent_id === msg.id);
            const numeroRespuestas = susRespuestas.length;
            
            const btnVerRespuestasHTML = numeroRespuestas > 0 
                ? `<button type="button" id="btn-toggle-${msg.id}" class="outline secondary" onclick="toggleRespuestas(${msg.id}, ${numeroRespuestas})" style="font-size: 0.7rem; padding: 2px 10px; border: none; color: var(--verde-brillante); cursor: pointer; background: transparent; margin-bottom: 0;">🔽 ${numeroRespuestas} respuesta(s)</button>` 
                : '';

            article.innerHTML = `
                <header style="display: flex; align-items: center; gap: 12px;">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${msg.autor}&backgroundColor=10b981" alt="Avatar" style="width: 45px; height: 45px; border-radius: 50%; background: #10b98140;">
                    <div style="flex-grow: 1;">
                        <strong style="margin: 0; display: block;">${msg.autor}</strong>
                        <small style="opacity: 0.7;">${new Date(msg.fecha).toLocaleString()}</small>
                    </div>
                </header>
                <p style="margin-top: 1rem;">${msg.texto}</p>
                <footer style="display: flex; gap: 10px; align-items: center; border-top: 1px solid #10b98140; padding-top: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                    <button type="button" class="outline" onclick="toggleFormularioRespuesta(${msg.id})" style="font-size: 0.7rem; padding: 2px 10px; margin-bottom: 0;">💬 Responder</button>
                    ${btnVerRespuestasHTML}
                </footer>
                
                <div id="caja-respuesta-${msg.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--verde-brillante);">
                    <input type="text" id="input-respuesta-${msg.id}" placeholder="Escribe tu respuesta a ${msg.autor}..." style="margin-bottom: 0.5rem; width: 100%;">
                    <button type="button" onclick="enviarRespuestaDirecta(${msg.id})" style="font-size: 0.8rem; padding: 5px 15px; background-color: var(--verde-brillante); color: white; border: none; border-radius: 5px; cursor:pointer;">Enviar Respuesta</button>
                </div>

                <div id="hilo-${msg.id}" style="display: none; margin-top: 1rem; padding-left: 1rem; border-left: 3px solid var(--verde-brillante); background-color: rgba(16, 185, 129, 0.05); border-radius: 0 0 8px 0;">
                </div>
            `;

            if (numeroRespuestas > 0) {
                const contenedorHilo = article.querySelector(`#hilo-${msg.id}`);
                
                susRespuestas.forEach(res => {
                    const reply = document.createElement('div');
                    reply.style = "padding: 0.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #10b98140; display: flex; gap: 10px; align-items: flex-start;";
                    reply.innerHTML = `
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${res.autor}&backgroundColor=10b981" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%; margin-top: 3px;">
                        <div style="flex-grow: 1;">
                            <strong style="font-size: 0.85rem; color: var(--verde-brillante);">${res.autor}</strong>
                            <p style="margin: 0; padding: 0; font-size: 0.9rem; margin-top: 0.2rem;">${res.texto}</p>
                        </div>
                        <small style="font-size: 0.7rem; opacity: 0.7; white-space: nowrap;">${new Date(res.fecha).toLocaleString()}</small>
                    `;
                    contenedorHilo.appendChild(reply);
                });
            }

            contenedorMensajes.appendChild(article);
        });
    } catch (error) {
        contenedorMensajes.innerHTML = '<p style="color:red; text-align:center;">No se pudo conectar con el servidor.</p>';
    }
}
cargarMensajes();

// ==========================================
// 3. LÓGICAS DE RESPUESTAS DIRECTAS E HILOS
// ==========================================
window.toggleRespuestas = function(id, total) {
    const hilo = document.getElementById(`hilo-${id}`);
    const btn = document.getElementById(`btn-toggle-${id}`);
    
    if (hilo.style.display === 'none') {
        hilo.style.display = 'block';
        btn.innerHTML = `🔼 Ocultar respuestas`;
    } else {
        hilo.style.display = 'none';
        btn.innerHTML = `🔽 ${total} respuesta(s)`;
    }
};

window.toggleFormularioRespuesta = function(id) {
    const caja = document.getElementById(`caja-respuesta-${id}`);
    if (caja.style.display === 'none') {
        caja.style.display = 'block';
        document.getElementById(`input-respuesta-${id}`).focus();
    } else {
        caja.style.display = 'none';
    }
};

window.enviarRespuestaDirecta = async function(parentId) {
    const usuarioActual = localStorage.getItem('usuarioActivo');
    const inputCaja = document.getElementById(`input-respuesta-${parentId}`);
    const textoVal = inputCaja.value.trim();

    if (!usuarioActual) return mostrarPopUp("Inicia sesión para participar.", true);
    if (!textoVal) return mostrarPopUp("La respuesta no puede estar vacía.", true);

    try {
        const respuesta = await fetch('http://localhost:3000/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                autor: usuarioActual, 
                texto: textoVal,
                parent_id: parentId 
            })
        });

        if (respuesta.ok) {
            mostrarPopUp("¡Respuesta enviada!");
            cargarMensajes(); 
        } else {
            mostrarPopUp("Error al publicar la respuesta.", true);
        }
    } catch (error) {
        mostrarPopUp("Error de conexión.", true);
    }
};

// ==========================================
// 4. PUBLICAR MENSAJE PRINCIPAL
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
                body: JSON.stringify({ autor: usuarioActual, texto: textoVal, parent_id: null })
            });

            if (respuesta.ok) {
                campoTexto.value = ''; 
                mostrarPopUp("¡Mensaje publicado!");
                cargarMensajes(); 
            }
        } catch (error) {
            mostrarPopUp("Error de conexión.", true);
        }
    });
}

// ==========================================
// 5. REGISTRO Y LOGIN
// ==========================================
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
                mostrarPopUp("¡Cuenta creada con éxito! Serás redirigido al login.");
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                mostrarPopUp(datos.error || "Error en el registro.", true);
            }
        } catch (error) {
            mostrarPopUp("Error de conexión con el servidor.", true);
        }
    });
}

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
                mostrarPopUp(`¡Bienvenido de nuevo, ${datos.username}!`);
                setTimeout(() => window.location.href = 'index.html', 1500);
            } else {
                mostrarPopUp(datos.error || "Usuario o clave incorrectos.", true);
            }
        } catch (error) {
            mostrarPopUp("Error de conexión.", true);
        }
    });
}

// ==========================================
// 6. PERFIL Y CARGA DE MIS MENSAJES
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
        if (fotoPerfil) fotoPerfil.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${usuarioActual}&backgroundColor=10b981`;
        cargarMisMensajes(usuarioActual);
    }
}

async function cargarMisMensajes(usuario) {
    try {
        const urlFresca = `http://localhost:3000/api/messages?t=${new Date().getTime()}`;
        const respuesta = await fetch(urlFresca, { cache: 'no-store' });
        const mensajes = await respuesta.json();
        
        const misMensajes = mensajes.filter(m => m.autor === usuario && !m.parent_id).reverse(); 
        
        contenedorMisMensajes.innerHTML = misMensajes.length ? '' : '<p style="text-align:center;">No has plantado nada aún.</p>';
        
        misMensajes.forEach(msg => {
            const article = document.createElement('article');
            article.innerHTML = `
                <header style="display: flex; align-items: center; gap: 12px;">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${msg.autor}&backgroundColor=10b981" alt="Avatar" style="width: 45px; height: 45px; border-radius: 50%; background: #10b98140;">
                    <div style="flex-grow: 1;">
                        <strong style="margin: 0; display: block;">${msg.autor}</strong>
                        <small style="opacity: 0.7;">${new Date(msg.fecha).toLocaleString()}</small>
                    </div>
                </header>
                <p style="margin-top: 1rem;">${msg.texto}</p>
                <footer>
                    <button onclick="borrarMensaje(${msg.id})" style="background-color: #dc2626; border: none; padding: 5px 15px; font-size: 0.8rem;">🗑️ Borrar</button>
                </footer>
            `;
            contenedorMisMensajes.appendChild(article);
        });
    } catch (e) { console.error("Error en perfil"); }
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('usuarioActivo');
        mostrarPopUp("Sesión cerrada correctamente.");
        setTimeout(() => window.location.href = 'login.html', 1500);
    });
}

// ==========================================
// 7. MODAL DE BORRADO
// ==========================================
function crearModalBorrar() {
    if (document.getElementById('modal-borrar')) return; 
    
    const modalHTML = `
    <dialog id="modal-borrar">
        <article>
            <header>
                <button aria-label="Close" class="close" onclick="cerrarModal()"></button>
                <strong>⚠️ ¿Arrancar esta planta?</strong>
            </header>
            <p>Esta acción no se puede deshacer. El mensaje desaparecerá para siempre del jardín.</p>
            <footer>
                <button class="secondary outline" onclick="cerrarModal()">Cancelar</button>
                <button style="background-color: #dc2626; border-color: #dc2626; color: white;" onclick="ejecutarBorrado()">🗑️ Sí, borrar</button>
            </footer>
        </article>
    </dialog>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
crearModalBorrar();

window.borrarMensaje = function(id) {
    idParaBorrar = id;
    const modal = document.getElementById('modal-borrar');
    if(modal) modal.setAttribute('open', true); 
};

window.cerrarModal = function() {
    idParaBorrar = null;
    const modal = document.getElementById('modal-borrar');
    if(modal) modal.removeAttribute('open'); 
};

window.ejecutarBorrado = async function() {
    if (!idParaBorrar) return;
    try {
        const respuesta = await fetch(`http://localhost:3000/api/messages/${idParaBorrar}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            mostrarPopUp("Mensaje eliminado correctamente 🗑️");
            const usuarioActual = localStorage.getItem('usuarioActivo');
            cargarMisMensajes(usuarioActual); 
        }
    } catch (e) {
        mostrarPopUp("No se pudo conectar con el servidor", true);
    }
    cerrarModal(); 
};
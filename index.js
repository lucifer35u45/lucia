// --- 0. SISTEMA DE USUARIOS Y AUTENTICACIÓN ---
const usuariosPorDefecto = [
    { user: "admin", pass: "admin123", nombreFormateado: "Administrador del Sistema", rol: "admin" },
    { user: "tecnico1", pass: "1234", nombreFormateado: "Pérez Gómez, Juan", rol: "tecnico" }
];

if (!localStorage.getItem("usuarios_sistema")) {
    localStorage.setItem("usuarios_sistema", JSON.stringify(usuariosPorDefecto));
}

// Control del Menú Desplegable de Usuario
document.addEventListener("DOMContentLoaded", () => {
    const btnUsuario = document.getElementById('btn-usuario');
    const dropdownUsuario = document.getElementById('dropdown-usuario');
    if (btnUsuario && dropdownUsuario) {
        btnUsuario.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownUsuario.classList.toggle('mostrar');
        });
        document.addEventListener('click', (e) => {
            if (!dropdownUsuario.contains(e.target)) dropdownUsuario.classList.remove('mostrar');
        });
    }
});

// Login
const formLogin = document.getElementById("form-login");
if (formLogin) {
    formLogin.addEventListener("submit", function(e) {
        e.preventDefault();
        const u = document.getElementById("login-user").value.trim();
        const p = document.getElementById("login-pass").value.trim();
        const usuariosDB = JSON.parse(localStorage.getItem("usuarios_sistema"));

        const encontrado = usuariosDB.find(user => user.user === u && user.pass === p);
        if (encontrado) {
            sessionStorage.setItem("usuarioLogueado", JSON.stringify(encontrado));
            location.reload(); 
        } else {
            alert("❌ Usuario o contraseña incorrectos.");
        }
    });
}

function cerrarSesion() {
    sessionStorage.removeItem("usuarioLogueado");
    location.reload();
}

function verificarSeguridad() {
    const usuarioActualJSON = sessionStorage.getItem("usuarioLogueado");
    if (!usuarioActualJSON) {
        document.getElementById("pantalla-login").style.display = "flex";
        return false;
    } else {
        document.getElementById("pantalla-login").style.display = "none";
        const usuario = JSON.parse(usuarioActualJSON);
        
        const infoTop = document.getElementById("nombre-usuario-display");
        if(infoTop) infoTop.textContent = usuario.nombreFormateado;

        const inputTecnico = document.getElementById("tecnico");
        const btnNuevoTecnico = document.getElementById("btn-añadir-tecnico");

        if (inputTecnico) {
            if (usuario.rol === "tecnico") {
                inputTecnico.value = usuario.nombreFormateado;
                inputTecnico.setAttribute("readonly", true);
                inputTecnico.style.opacity = "0.6"; 
                if (btnNuevoTecnico) btnNuevoTecnico.style.display = "none";
            } else if (usuario.rol === "admin") {
                inputTecnico.removeAttribute("readonly");
                inputTecnico.style.opacity = "1";
                if (btnNuevoTecnico) btnNuevoTecnico.style.display = "inline-block";
            }
        }
        return true;
    }
}

// Modal Técnicos (Admin)
const formNuevoTecnico = document.getElementById("form-nuevo-tecnico");
if (formNuevoTecnico) {
    formNuevoTecnico.addEventListener("submit", function(e) {
        e.preventDefault();
        const nombre = document.getElementById("nt_nombre").value.trim();
        const ape1 = document.getElementById("nt_ape1").value.trim();
        const ape2 = document.getElementById("nt_ape2").value.trim();
        const user = document.getElementById("nt_user").value.trim();
        const pass = document.getElementById("nt_pass").value.trim();
        const formatoOficial = `${ape1} ${ape2}, ${nombre}`;

        let usuariosDB = JSON.parse(localStorage.getItem("usuarios_sistema"));
        if (usuariosDB.find(u => u.user === user)) {
            alert("⚠️ Este nombre de usuario ya existe."); return;
        }

        usuariosDB.push({ user, pass, nombreFormateado: formatoOficial, rol: "tecnico" });
        localStorage.setItem("usuarios_sistema", JSON.stringify(usuariosDB));

        alert(`✅ Técnico añadido: ${formatoOficial}`);
        cerrarModalTecnico();
        inicializarDesplegablesInteligentes();
    });
}

function abrirModalTecnico() { document.getElementById("modal-tecnico").style.display = "flex"; }
function cerrarModalTecnico() { document.getElementById("modal-tecnico").style.display = "none"; document.getElementById("form-nuevo-tecnico").reset(); }

// --- 1. BASE DE DATOS Y ARRANQUE ---
let db;
async function conectarDB() {
    if (!verificarSeguridad()) return; 

    try {
        const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
        const respuesta = await fetch("almacen.db");
        const buffer = await respuesta.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buffer));
        arrancarApp();
    } catch (e) {
        console.log("No se pudo cargar .db. Usando memoria local.");
        arrancarApp();
    }
}

function arrancarApp() {
    inicializarDesplegablesInteligentes();
    mostrarTodoTabla();
    if(document.querySelector('.tablero-kanban')) {
        renderizarKanban();
        inicializarDragAndDrop();
    }
}

// --- 2. LISTAS INTELIGENTES ---
function inicializarDesplegablesInteligentes() {
    let categorias = new Set(["Portátil", "Monitor", "Cascos", "PC"]);
    let marcas = new Set(["HP", "Dell", "Lenovo"]);
    let modelos = new Set();
    let asignados = new Set();
    
    let usuariosDB = JSON.parse(localStorage.getItem("usuarios_sistema")) || [];
    let tecnicosOficiales = usuariosDB.filter(u => u.rol === "tecnico").map(u => u.nombreFormateado);

    if (db) {
        const res = db.exec("SELECT Nombre_modelo FROM Inventario");
        if (res.length > 0) { res[0].values.forEach(fila => { if(fila[0]) modelos.add(fila[0]); }); }
    }

    let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
    temporales.forEach(reg => {
        if(reg.tipo) categorias.add(reg.tipo);
        if(reg.marca) marcas.add(reg.marca);
        if(reg.modelo) modelos.add(reg.modelo);
        if(reg.asignado) asignados.add(reg.asignado);
    });

    if (document.getElementById("tipo")) {
        configurarDesplegableDinámico("tipo", "lista_categorias", Array.from(categorias));
        configurarDesplegableDinámico("marca", "lista_marcas", Array.from(marcas));
        configurarDesplegableDinámico("modelo", "lista_modelos", Array.from(modelos));
        configurarDatalist("lista_tecnicos_dl", "lista_tecnicos", tecnicosOficiales);
        configurarDatalist("lista_asignados_dl", "lista_asignados", Array.from(asignados));
    }

    if (document.getElementById("filtro_categoria")) {
        llenarFiltroNormal("filtro_categoria", Array.from(categorias));
        llenarFiltroNormal("filtro_marca", Array.from(marcas));
        llenarFiltroNormal("filtro_modelo", Array.from(modelos));
        document.getElementById("filtro_texto").addEventListener("input", filtrarTabla);
    }
}

function configurarDatalist(idDatalist, storageKey, datosExtraidos) {
    const datalist = document.getElementById(idDatalist);
    if (!datalist) return;
    let opcionesGuardadas = JSON.parse(localStorage.getItem(storageKey)) || [];
    let opcionesFinales = [...new Set([...datosExtraidos, ...opcionesGuardadas])];
    localStorage.setItem(storageKey, JSON.stringify(opcionesFinales));
    datalist.innerHTML = "";
    opcionesFinales.forEach(opt => { if (opt.trim() !== "") datalist.innerHTML += `<option value="${opt}">`; });
}

function llenarFiltroNormal(idSelect, opciones) {
    const select = document.getElementById(idSelect);
    if (!select) return;
    const storageKey = idSelect.replace("filtro_", "lista_") + "s";
    let opcionesGuardadas = JSON.parse(localStorage.getItem(storageKey)) || [];
    let opcionesFinales = [...new Set([...opciones, ...opcionesGuardadas])];
    select.innerHTML = `<option value="">-- Todas --</option>`;
    opcionesFinales.forEach(opt => { select.innerHTML += `<option value="${opt}">${opt}</option>`; });
    select.addEventListener("change", filtrarTabla);
}

function configurarDesplegableDinámico(idSelect, storageKey, datosExtraidos) {
    const select = document.getElementById(idSelect);
    if (!select) return;
    let opcionesGuardadas = JSON.parse(localStorage.getItem(storageKey)) || [];
    let opcionesFinales = [...new Set([...datosExtraidos, ...opcionesGuardadas])];
    localStorage.setItem(storageKey, JSON.stringify(opcionesFinales));

    function renderizar() {
        select.innerHTML = "";
        if (!select.hasAttribute("required")) select.innerHTML += `<option value="">-- Dejar en blanco --</option>`;
        else select.innerHTML += `<option value="" disabled selected>-- Seleccionar --</option>`;
        opcionesFinales.forEach(opt => { select.innerHTML += `<option value="${opt}">${opt}</option>`; });
        select.innerHTML += `<option value="OTRO_NUEVO" style="font-weight: bold; background: #8b5cf6; color: white;">➕ Añadir otro...</option>`;
    }
    renderizar();
    let valorAnterior = select.value;
    select.addEventListener("change", function() {
        if (this.value === "OTRO_NUEVO") {
            const nuevoValor = prompt("Nuevo valor:");
            if (nuevoValor && nuevoValor.trim() !== "") {
                const valorLimpio = nuevoValor.trim();
                if (!opcionesFinales.includes(valorLimpio)) {
                    opcionesFinales.push(valorLimpio);
                    localStorage.setItem(storageKey, JSON.stringify(opcionesFinales));
                    renderizar();
                }
                select.value = valorLimpio;
                valorAnterior = valorLimpio;
            } else { select.value = valorAnterior; }
        } else { valorAnterior = this.value; }
    });
}

// --- 3. GUARDAR FORMULARIO ---
const formulario = document.getElementById("formulario");
if (formulario) {
    formulario.addEventListener("submit", function(e) {
        e.preventDefault();
        let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
        let nuevoIdInterno = temporales.length > 0 ? temporales[temporales.length - 1].id_interno + 1 : 1;

        const nuevoEquipo = {
            id_interno: nuevoIdInterno,
            tipo: document.getElementById("tipo").value,
            marca: document.getElementById("marca").value,
            modelo: document.getElementById("modelo").value,
            serie: document.getElementById("serie").value,
            tecnico: document.getElementById("tecnico").value.trim(),
            estado_f: document.getElementById("estado_fisico").value,
            estado_l: document.getElementById("estado_logico").value,
            asignado: document.getElementById("asignado").value.trim()
        };

        temporales.push(nuevoEquipo);
        localStorage.setItem("mis_registros", JSON.stringify(temporales));
        alert("✅ Dispositivo registrado. ID Interno: " + nuevoIdInterno);
        this.reset();
        
        verificarSeguridad(); // Re-bloquear técnico
        arrancarApp(); // Refrescar todo
    });
}

// --- 4. SISTEMA KANBAN (ALMACÉN) ---
function inicializarDragAndDrop() {
    const zonasDrop = document.querySelectorAll('.zona-drop');
    zonasDrop.forEach(zona => {
        zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('drag-over'); });
        zona.addEventListener('dragleave', () => zona.classList.remove('drag-over'));
        zona.addEventListener('drop', e => {
            e.preventDefault();
            zona.classList.remove('drag-over');
            
            const idItemStr = e.dataTransfer.getData('text/plain');
            const nuevoEstado = zona.parentElement.id; // "Para Formatear", "Disponible", etc.

            let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
            const itemIndex = temporales.findIndex(i => i.id_interno.toString() === idItemStr);
            
            if(itemIndex > -1 && temporales[itemIndex].estado_f !== nuevoEstado) {
                temporales[itemIndex].estado_f = nuevoEstado;
                localStorage.setItem("mis_registros", JSON.stringify(temporales));
                renderizarKanban(); // Re-dibujar para asegurar consistencia
            }
        });
    });
}

function renderizarKanban() {
    document.querySelectorAll('.zona-drop').forEach(zona => zona.innerHTML = '');
    let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
    const iconos = { "PC": "🖥️", "Portátil": "💻", "Cascos": "🎧", "Monitor": "📺" };
    
    temporales.forEach(item => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta';
        tarjeta.draggable = true;
        tarjeta.id = "tarjeta-" + item.id_interno;
        tarjeta.innerHTML = `
            <span class="icono">${iconos[item.tipo] || "📦"}</span>
            <div class="info">
                <strong>${item.tipo} ${item.marca}</strong>
                <small>${item.modelo} | SN: ${item.serie}</small>
            </div>
        `;
        
        tarjeta.addEventListener('dragstart', (e) => {
            tarjeta.classList.add('dragging');
            e.dataTransfer.setData('text/plain', item.id_interno.toString());
        });
        tarjeta.addEventListener('dragend', () => tarjeta.classList.remove('dragging'));

        // Buscar la columna destino por el ID que coincide con estado_f
        const columnaDestino = document.getElementById(item.estado_f);
        if(columnaDestino) {
            const zona = columnaDestino.querySelector('.zona-drop');
            if(zona) zona.appendChild(tarjeta);
        }
    });
}

// --- 5. TABLA Y FILTROS ---
function mostrarTodoTabla() {
    const tabla = document.getElementById("tablaRegistros");
    if (!tabla) return;
    tabla.innerHTML = ""; 

    if (db) {
        const res = db.exec("SELECT id_inventario, Nombre_modelo, numer_serie FROM Inventario");
        if (res.length > 0) {
            res[0].values.forEach(fila => {
                tabla.innerHTML += `<tr><td style="text-align: center;"><input type="checkbox" disabled title="Base intocable"></td>
                <td>DB-${fila[0]}</td><td>-</td><td>-</td><td>${fila[1]}</td><td>${fila[2] || 'S/N'}</td>
                <td>-</td><td>-</td><td>-</td><td>-</td></tr>`;
            });
        }
    }

    let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
    temporales.forEach(reg => {
        tabla.innerHTML += `
            <tr>
                <td style="text-align: center;"><input type="checkbox" class="check-borrar" data-id="${reg.id_interno}"></td>
                <td>${reg.id_interno}</td><td>${reg.tipo}</td><td>${reg.marca}</td><td>${reg.modelo}</td>
                <td>${reg.serie}</td><td>${reg.tecnico || '-'}</td><td>${reg.estado_f}</td><td>${reg.estado_l}</td>
                <td>${reg.asignado || 'Sin dueño'}</td>
            </tr>`;
    });
}

function filtrarTabla() {
    const cat = document.getElementById("filtro_categoria").value.toLowerCase();
    const mar = document.getElementById("filtro_marca").value.toLowerCase();
    const mod = document.getElementById("filtro_modelo").value.toLowerCase();
    const txt = document.getElementById("filtro_texto").value.toLowerCase();
    const filas = document.querySelectorAll("#tablaRegistros tr");

    filas.forEach(fila => {
        const c_id = fila.cells[1].innerText.toLowerCase();
        const c_cat = fila.cells[2].innerText.toLowerCase();
        const c_mar = fila.cells[3].innerText.toLowerCase();
        const c_mod = fila.cells[4].innerText.toLowerCase();
        const c_serie = fila.cells[5].innerText.toLowerCase();

        const matchCat = cat === "" || c_cat === cat;
        const matchMar = mar === "" || c_mar === mar;
        const matchMod = mod === "" || c_mod === mod;
        const matchTxt = txt === "" || c_id.includes(txt) || c_serie.includes(txt);

        fila.style.display = (matchCat && matchMar && matchMod && matchTxt) ? "" : "none";
    });
}

function limpiarFiltros() {
    document.getElementById("filtro_categoria").value = "";
    document.getElementById("filtro_marca").value = "";
    document.getElementById("filtro_modelo").value = "";
    document.getElementById("filtro_texto").value = "";
    filtrarTabla(); 
}

function marcarTodos(origen) {
    document.querySelectorAll('.check-borrar').forEach(cb => {
        if(cb.closest('tr').style.display !== "none") cb.checked = origen.checked;
    });
}

function borrarSeleccionados() {
    const checkboxes = document.querySelectorAll('.check-borrar:checked');
    if (checkboxes.length === 0) { alert("Selecciona al menos un equipo."); return; }
    if(confirm(`¿Borrar permanentemente ${checkboxes.length} equipo(s)?`)) {
        let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
        const ids = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));
        temporales = temporales.filter(reg => !ids.includes(reg.id_interno));
        localStorage.setItem("mis_registros", JSON.stringify(temporales));
        location.reload();
    }
}

conectarDB();
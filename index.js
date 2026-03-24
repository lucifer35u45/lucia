// 1. Intentar conectar al .db (para ver lo que ya existe)
let db;
async function conectarDB() {
    try {
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        const respuesta = await fetch("almacen.db");
        const buffer = await respuesta.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buffer));
        mostrarTodo();
    } catch (e) {
        console.log("No se pudo cargar el archivo .db, usando solo memoria local.");
        mostrarTodo();
    }
}

// 2. GUARDAR EL EQUIPO (Cuando pulsas el botón)
const formulario = document.getElementById("formulario");
if (formulario) {
    formulario.addEventListener("submit", function(e) {
        e.preventDefault();

        // Creamos el objeto con lo que escribiste
        const nuevoEquipo = {
            tipo: document.getElementById("tipo").value,
            marca: document.getElementById("marca").value,
            modelo: document.getElementById("modelo").value,
            serie: document.getElementById("serie").value
        };

        // Lo guardamos en el "LocalStorage" (la memoria del navegador)
        let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
        temporales.push(nuevoEquipo);
        localStorage.setItem("mis_registros", JSON.stringify(temporales));

        alert("¡Equipo registrado! Ahora puedes verlo en la pestaña Registros.");
        this.reset();
    });
}

// 3. MOSTRAR TODO EN LA TABLA (Combina .db + LocalStorage)
function mostrarTodo() {
    const tabla = document.getElementById("tablaRegistros");
    if (!tabla) return;

    tabla.innerHTML = ""; // Limpiar

    // A. Primero ponemos los que vienen del archivo .db (si existe)
    if (db) {
        const res = db.exec("SELECT tipo, modelo, numero_serie FROM Inventario_Equipos");
        if (res.length > 0) {
            res[0].values.forEach(fila => {
                tabla.innerHTML += `<tr><td>${fila[0]}</td><td>-</td><td>${fila[1]}</td><td>${fila[2] || 'S/N'}</td></tr>`;
            });
        }
    }

    // B. Luego añadimos los que tú acabas de escribir en el formulario
    let temporales = JSON.parse(localStorage.getItem("mis_registros")) || [];
    temporales.forEach(reg => {
        tabla.innerHTML += `
            <tr style="background-color: #e6f2ff;">
                <td>${reg.tipo}</td>
                <td>${reg.marca}</td>
                <td>${reg.modelo}</td>
                <td>${reg.serie}</td>
            </tr>`;
    });
}

// Botón para borrar los que tú has puesto (opcional)
function borrarRegistros() {
    if(confirm("¿Borrar solo los equipos nuevos?")) {
        localStorage.removeItem("mis_registros");
        location.reload();
    }
}

conectarDB();

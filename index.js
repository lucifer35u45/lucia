let db;
let nuevosRegistros = JSON.parse(localStorage.getItem("inventario_local")) || [];

// 1. CONECTAR AL ARCHIVO .DB
async function iniciarDB() {
    try {
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        const respuesta = await fetch("almacen.db");
        const buffer = await respuesta.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buffer));
        
        console.log("Base de datos cargada");
        cargarTabla();
    } catch (err) {
        console.error("Error al cargar el .db:", err);
        cargarTabla(); // Intentar cargar aunque sea los locales
    }
}

// 2. GUARDAR DESDE EL FORMULARIO
const form = document.getElementById("formulario");
if (form) {
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const equipo = {
            tipo: document.getElementById("tipo").value,
            marca: document.getElementById("marca").value,
            modelo: document.getElementById("modelo").value,
            serie: document.getElementById("serie").value
        };

        // Guardar en la memoria del navegador (localStorage)
        nuevosRegistros.push(equipo);
        localStorage.setItem("inventario_local", JSON.stringify(nuevosRegistros));

        alert("¡Registrado con éxito! Ve a la pestaña de Registros.");
        this.reset();
    });
}

// 3. MOSTRAR TODO EN LA TABLA
function cargarTabla() {
    const tabla = document.getElementById("tablaRegistros");
    if (!tabla) return;

    tabla.innerHTML = ""; // Limpiar

    // A. Mostrar lo que hay en el archivo .db
    if (db) {
        const res = db.exec("SELECT tipo, modelo, numero_serie FROM Inventario_Equipos");
        if (res.length > 0) {
            res[0].values.forEach(fila => {
                tabla.innerHTML += `
                    <tr>
                        <td>${fila[0]}</td>
                        <td>-</td>
                        <td>${fila[1]}</td>
                        <td>${fila[2] || 'S/N'}</td>
                    </tr>`;
            });
        }
    }

    // B. Añadir lo que tú has escrito manualmente (localStorage)
    nuevosRegistros.forEach(reg => {
        tabla.innerHTML += `
            <tr style="background-color: #f0f8ff;">
                <td>${reg.tipo}</td>
                <td>${reg.marca}</td>
                <td>${reg.modelo}</td>
                <td>${reg.serie}</td>
            </tr>`;
    });
}

// Función para el botón borrar
window.borrarRegistros = function() {
    if(confirm("¿Quieres borrar los registros nuevos que has hecho?")) {
        localStorage.removeItem("inventario_local");
        location.reload();
    }
}

iniciarDB();

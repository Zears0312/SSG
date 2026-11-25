document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar sesión activa (Seguridad de ruta)
    const usuarioActivo = localStorage.getItem('usuario_activo');
    if (!usuarioActivo) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('user-display').textContent = `Usuario conectado: ${usuarioActivo}`;

    // Botón Cerrar Sesión
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('usuario_activo');
        window.location.href = 'index.html';
    });

    // Referencias al DOM del CRUD
    const form = document.getElementById('gasto-form');
    const inputId = document.getElementById('gasto-id');
    const inputMonto = document.getElementById('monto');
    const inputFecha = document.getElementById('fecha');
    const selectCategoria = document.getElementById('categoria');
    const inputDescripcion = document.getElementById('descripcion');
    const errorDiv = document.getElementById('form-error');
    const btnSave = document.getElementById('btn-save');
    const btnCancel = document.getElementById('btn-cancel');
    const formTitle = document.getElementById('form-title');

    const tbody = document.getElementById('gastos-tbody');
    const totalAmountEl = document.getElementById('total-amount');
    const activeCountEl = document.getElementById('active-count');

    // Referencias al Modal de Baja Lógica
    const deleteModal = document.getElementById('delete-modal');
    const modalBtnCancel = document.getElementById('modal-btn-cancel');
    const modalBtnConfirm = document.getElementById('modal-btn-confirm');
    let idParaEliminar = null;

    // Obtener gastos de localStorage
    function obtenerGastos() {
        return JSON.parse(localStorage.getItem('gastos_sgg')) || [];
    }

    function guardarGastos(gastos) {
        localStorage.setItem('gastos_sgg', JSON.stringify(gastos));
    }

    // Renderizar Dashboard (RF-06 y RF-09)
    function renderizarDashboard() {
        const todosLosGastos = obtenerGastos();
        // Filtrar solo los gastos del usuario actual que estén activos (estado_activo !== false)
        const misGastosActivos = todosLosGastos.filter(g => g.email === usuarioActivo && g.estado_activo !== false);

        tbody.innerHTML = '';
        let sumaTotal = 0;

        if (misGastosActivos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hay gastos registrados.</td></tr>`;
            totalAmountEl.textContent = '$0,00';
            activeCountEl.textContent = '0 registros';
            return;
        }

        misGastosActivos.forEach(gasto => {
            sumaTotal += Number(gasto.monto);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${gasto.fecha}</td>
                <td>${gasto.categoria}</td>
                <td>${gasto.descripcion}</td>
                <td><strong>$ ${Number(gasto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                <td>
                    <button class="btn-action btn-edit" data-id="${gasto.id}">Editar</button>
                    <button class="btn-action btn-delete" data-id="${gasto.id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        totalAmountEl.textContent = `$ ${sumaTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        activeCountEl.textContent = `${misGastosActivos.length} registro(s) activo(s)`;
    }

    // Guardar / Actualizar Gasto (RF-05 y RF-07)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        errorDiv.textContent = '';

        const monto = parseFloat(inputMonto.value);
        const fecha = inputFecha.value;
        const categoria = selectCategoria.value;
        const descripcion = inputDescripcion.value.trim();
        const idEditando = inputId.value;

        if (isNaN(monto) || monto <= 0) {
            errorDiv.textContent = 'El monto debe ser mayor a 0.';
            inputMonto.focus();
            return;
        }

        const gastos = obtenerGastos();

        if (idEditando) {
            // Actualizar (UPDATE - RF-07)
            const index = gastos.findIndex(g => g.id == idEditando && g.email === usuarioActivo);
            if (index !== -1) {
                gastos[index].monto = monto;
                gastos[index].fecha = fecha;
                gastos[index].categoria = categoria;
                gastos[index].descripcion = descripcion;
                guardarGastos(gastos);
            }
            limpiarFormulario();
        } else {
            // Crear nuevo gasto (CREATE - RF-05)
            const nuevoGasto = {
                id: Date.now(),
                email: usuarioActivo, // Relación con el usuario logueado
                monto: monto,
                fecha: fecha,
                categoria: categoria,
                descripcion: descripcion,
                estado_activo: true // Nace activo
            };
            gastos.push(nuevoGasto);
            guardarGastos(gastos);
            limpiarFormulario();
        }

        renderizarDashboard();
    });

    function limpiarFormulario() {
        form.reset();
        inputId.value = '';
        formTitle.textContent = 'Registrar Nuevo Gasto';
        btnSave.textContent = 'Guardar Gasto';
        btnCancel.classList.add('hidden');
        errorDiv.textContent = '';
    }

    btnCancel.addEventListener('click', limpiarFormulario);

    // Manejo de clicks en tabla (Editar / Baja lógica)
    tbody.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        const gastos = obtenerGastos();

        if (e.target.classList.contains('btn-edit')) {
            // Cargar datos para editar
            const gasto = gastos.find(g => g.id == id && g.email === usuarioActivo);
            if (gasto) {
                inputId.value = gasto.id;
                inputMonto.value = gasto.monto;
                inputFecha.value = gasto.fecha;
                selectCategoria.value = gasto.categoria;
                inputDescripcion.value = gasto.descripcion;

                formTitle.textContent = 'Editar Gasto';
                btnSave.textContent = 'Actualizar Gasto';
                btnCancel.classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else if (e.target.classList.contains('btn-delete')) {
            // Abrir modal de baja lógica (RF-08)
            idParaEliminar = id;
            deleteModal.classList.remove('hidden');
        }
    });

    // Confirmar Baja Lógica (RF-08)
    modalBtnConfirm.addEventListener('click', () => {
        if (idParaEliminar) {
            let gastos = obtenerGastos();
            const index = gastos.findIndex(g => g.id == idParaEliminar && g.email === usuarioActivo);
            if (index !== -1) {
                gastos[index].estado_activo = false;
                guardarGastos(gastos);
            }
            deleteModal.classList.add('hidden');
            idParaEliminar = null;
            limpiarFormulario();
            renderizarDashboard();
        }
    });

    modalBtnCancel.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        idParaEliminar = null;
    });

    // Cargar historial al iniciar
    renderizarDashboard();
});
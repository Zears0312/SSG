document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validar sesión activa
    const usuarioActivo = sessionStorage.getItem('usuario_activo');
    if (!usuarioActivo) {
        window.location.href = 'index.html';
        return;
    }

    await initDatabase();

    document.getElementById('user-display').textContent = `Usuario conectado: ${usuarioActivo}`;

    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('usuario_activo');
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

    const deleteModal = document.getElementById('delete-modal');
    const modalBtnCancel = document.getElementById('modal-btn-cancel');
    const modalBtnConfirm = document.getElementById('modal-btn-confirm');
    let idParaEliminar = null;

    function obtenerGastosActivos() {
        const stmt = db.prepare(
            "SELECT * FROM movimientos WHERE email_usuario = ? AND activo = 1 ORDER BY id_movimiento DESC"
        );
        stmt.bind([usuarioActivo]);

        const lista = [];
        while (stmt.step()) {
            lista.push(stmt.getAsObject());
        }
        stmt.free();
        return lista;
    }

    function renderizarDashboard() {
        const misGastosActivos = obtenerGastosActivos();

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
                    <button class="btn-action btn-edit" data-id="${gasto.id_movimiento}">Editar</button>
                    <button class="btn-action btn-delete" data-id="${gasto.id_movimiento}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        totalAmountEl.textContent = `$ ${sumaTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        activeCountEl.textContent = `${misGastosActivos.length} registro(s) activo(s)`;
    }

    form.addEventListener('submit', async (e) => {
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

        if (idEditando) {
            db.run(
                "UPDATE movimientos SET monto = ?, fecha = ?, categoria = ?, descripcion = ? WHERE id_movimiento = ? AND email_usuario = ?",
                [monto, fecha, categoria, descripcion, Number(idEditando), usuarioActivo]
            );
        } else {
            db.run(
                "INSERT INTO movimientos (email_usuario, tipo_movimiento, monto, fecha, categoria, descripcion, url_comprobante, activo) VALUES (?, 'egreso', ?, ?, ?, ?, NULL, 1)",
                [usuarioActivo, monto, fecha, categoria, descripcion]
            );
        }

        await guardarEnOPFS();
        limpiarFormulario();
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

    tbody.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.classList.contains('btn-edit')) {
            const stmt = db.prepare(
                "SELECT * FROM movimientos WHERE id_movimiento = ? AND email_usuario = ? AND activo = 1"
            );
            stmt.bind([Number(id), usuarioActivo]);
            if (stmt.step()) {
                const gasto = stmt.getAsObject();
                inputId.value = gasto.id_movimiento;
                inputMonto.value = gasto.monto;
                inputFecha.value = gasto.fecha;
                selectCategoria.value = gasto.categoria;
                inputDescripcion.value = gasto.descripcion;

                formTitle.textContent = 'Editar Gasto';
                btnSave.textContent = 'Actualizar Gasto';
                btnCancel.classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            stmt.free();
        } else if (e.target.classList.contains('btn-delete')) {
            idParaEliminar = Number(id);
            deleteModal.classList.remove('hidden');
        }
    });

    modalBtnConfirm.addEventListener('click', async () => {
        if (idParaEliminar) {
            db.run(
                "UPDATE movimientos SET activo = 0 WHERE id_movimiento = ? AND email_usuario = ?",
                [idParaEliminar, usuarioActivo]
            );
            await guardarEnOPFS();
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

    renderizarDashboard();
});
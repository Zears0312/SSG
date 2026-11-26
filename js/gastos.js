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

    const IMGBB_API_KEY = '96e837e2c08a4b48f913d62e570f7f3e';

    // Referencias al DOM del CRUD
    const form = document.getElementById('gasto-form');
    const inputId = document.getElementById('gasto-id');
    const selectTipo = document.getElementById('tipo-movimiento');
    const inputMonto = document.getElementById('monto');
    const inputFecha = document.getElementById('fecha');
    const selectCategoria = document.getElementById('categoria');
    const inputDescripcion = document.getElementById('descripcion');
    const inputComprobante = document.getElementById('comprobante');
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
    let urlComprobanteActual = null;

    // Subir imagen a ImgBB usando FormData + fetch + try/catch
    async function subirComprobanteImgBB(archivo) {
        try {
            const formData = new FormData();
            formData.append('image', archivo);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            const resultado = await response.json();
            if (!resultado.success || !resultado.data?.url) {
                throw new Error('La API no devolvió una URL válida.');
            }

            return resultado.data.url;
        } catch (error) {
            console.error('Error al subir comprobante:', error);
            alert('No se pudo subir la imagen del comprobante (falla de red o API). El movimiento se guardará sin comprobante.');
            return null;
        }
    }

    function obtenerMovimientosActivos() {
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

    // Renderizar Dashboard y recalcular Balance Acumulado
    function renderizarDashboard() {
        const misMovimientos = obtenerMovimientosActivos();

        tbody.innerHTML = '';
        let balance = 0;

        if (misMovimientos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No hay movimientos registrados.</td></tr>`;
            totalAmountEl.textContent = '$0,00';
            totalAmountEl.style.color = '';
            activeCountEl.textContent = '0 registros';
            return;
        }

        misMovimientos.forEach(mov => {
            const montoNum = Number(mov.monto);
            const esIngreso = mov.tipo_movimiento === 'ingreso';

            if (esIngreso) {
                balance += montoNum;
            } else {
                balance -= montoNum;
            }

            const tr = document.createElement('tr');
            const colorMonto = esIngreso ? '#22c55e' : '#ef4444';
            const signo = esIngreso ? '+' : '-';
            const textoTipo = esIngreso ? 'Ingreso' : 'Egreso';
            const celdaComprobante = mov.url_comprobante
                ? `<a href="${mov.url_comprobante}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline;">Ver</a>`
                : '-';

            tr.innerHTML = `
                <td>${mov.fecha}</td>
                <td>${textoTipo}</td>
                <td>${mov.categoria}</td>
                <td>${mov.descripcion}</td>
                <td>${celdaComprobante}</td>
                <td style="color: ${colorMonto};"><strong>${signo} $ ${montoNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                <td>
                    <button class="btn-action btn-edit" data-id="${mov.id_movimiento}">Editar</button>
                    <button class="btn-action btn-delete" data-id="${mov.id_movimiento}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const prefijo = balance < 0 ? '-$ ' : '$ ';
        totalAmountEl.textContent = `${prefijo}${Math.abs(balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

        if (balance > 0) {
            totalAmountEl.style.color = '#22c55e';
        } else if (balance < 0) {
            totalAmountEl.style.color = '#ef4444';
        } else {
            totalAmountEl.style.color = '';
        }

        activeCountEl.textContent = `${misMovimientos.length} registro(s) activo(s)`;
    }

    // Guardar / Actualizar Movimiento
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = '';

        const tipo = selectTipo.value;
        const monto = parseFloat(inputMonto.value);
        const fecha = inputFecha.value;
        const categoria = selectCategoria.value;
        const descripcion = inputDescripcion.value.trim();
        const idEditando = inputId.value;
        const archivo = inputComprobante.files[0];

        if (isNaN(monto) || monto <= 0) {
            errorDiv.textContent = 'El monto debe ser mayor a 0.';
            inputMonto.focus();
            return;
        }

        btnSave.disabled = true;
        btnSave.textContent = archivo ? 'Subiendo comprobante...' : 'Guardando...';

        try {
            let urlComprobante = idEditando ? urlComprobanteActual : null;
            if (archivo) {
                const urlSubida = await subirComprobanteImgBB(archivo);
                if (urlSubida) {
                    urlComprobante = urlSubida;
                } else if (!idEditando) {
                    urlComprobante = null;
                }
            }

            if (idEditando) {
                db.run(
                    "UPDATE movimientos SET tipo_movimiento = ?, monto = ?, fecha = ?, categoria = ?, descripcion = ?, url_comprobante = ? WHERE id_movimiento = ? AND email_usuario = ?",
                    [tipo, monto, fecha, categoria, descripcion, urlComprobante, Number(idEditando), usuarioActivo]
                );
            } else {
                db.run(
                    "INSERT INTO movimientos (email_usuario, tipo_movimiento, monto, fecha, categoria, descripcion, url_comprobante, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                    [usuarioActivo, tipo, monto, fecha, categoria, descripcion, urlComprobante]
                );
            }

            await guardarEnOPFS();
            limpiarFormulario();
            renderizarDashboard();
        } finally {
            btnSave.disabled = false;
        }
    });

    function limpiarFormulario() {
        form.reset();
        inputId.value = '';
        urlComprobanteActual = null;
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
                const mov = stmt.getAsObject();
                inputId.value = mov.id_movimiento;
                selectTipo.value = mov.tipo_movimiento;
                inputMonto.value = mov.monto;
                inputFecha.value = mov.fecha;
                selectCategoria.value = mov.categoria;
                inputDescripcion.value = mov.descripcion;
                urlComprobanteActual = mov.url_comprobante;

                formTitle.textContent = 'Editar Movimiento';
                btnSave.textContent = 'Actualizar Movimiento';
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
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();

    const recoveryForm = document.getElementById('recovery-form');
    const btnRecover = document.getElementById('btn-recover');
    const newPasswordInput = document.getElementById('new-password');

    const rules = {
        length: /.{8,}/,
        upper: /[A-Z]/,
        lower: /[a-z]/,
        num: /[0-9]/,
        spec: /[!@#\$%\^&\*\(\)_\+\-\=\[\]\{\};':"\\|,.<>\/?]/
    };

    newPasswordInput.addEventListener('input', () => {
        const val = newPasswordInput.value;
        let allValid = true;

        const updateReq = (id, regex) => {
            const el = document.getElementById(id);
            if (regex.test(val)) {
                el.className = 'req-valid';
            } else {
                el.className = 'req-invalid';
                allValid = false;
            }
        };

        updateReq('req-length', rules.length);
        updateReq('req-upper', rules.upper);
        updateReq('req-lower', rules.lower);
        updateReq('req-num', rules.num);
        updateReq('req-spec', rules.spec);

        btnRecover.disabled = !allValid;
    });

    recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email-recup').value.trim();
        const nuevaClave = newPasswordInput.value;
        const repNuevaClave = document.getElementById('rep-new-password').value;

        if (nuevaClave !== repNuevaClave) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        const stmt = db.prepare("SELECT password FROM usuarios WHERE email = ?");
        stmt.bind([email]);

        if (!stmt.step()) {
            stmt.free();
            alert('El correo ingresado no se encuentra registrado.');
            return;
        }

        const usuario = stmt.getAsObject();
        stmt.free();

        if (usuario.password === nuevaClave) {
            alert('La nueva contraseña no puede ser igual a la actual.');
            return;
        }

        db.run("UPDATE usuarios SET password = ? WHERE email = ?", [nuevaClave, email]);
        await guardarEnOPFS();

        alert('Contraseña actualizada con éxito.');
        window.location.href = 'index.html';
    });
});
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();

    const registerForm = document.getElementById('register-form');
    const btnRegister = document.getElementById('btn-register');
    const passwordInput = document.getElementById('password-reg');

    const rules = {
        length: /.{8,}/,
        upper: /[A-Z]/,
        lower: /[a-z]/,
        num: /[0-9]/,
        spec: /[!@#\$%\^&\*\(\)_\+\-\=\[\]\{\};':"\\|,.<>\/?]/
    };

    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
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

        btnRegister.disabled = !allValid;
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();
        const fechaNac = document.getElementById('fecha-nac').value;
        const email = document.getElementById('email-reg').value.trim();
        const password = passwordInput.value;
        const passwordRep = document.getElementById('password-rep').value;

        // 1. Validar Edad (> 14 años)
        const hoy = new Date();
        const nacimiento = new Date(fechaNac);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }

        if (edad < 14) {
            alert('Debes tener más de 14 años para registrarte.');
            return;
        }

        // 2. Validar Email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            alert('El formato del correo no es válido.');
            return;
        }

        // 3. Confirmar contraseñas
        if (password !== passwordRep) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        // 4. Verificar si el email ya existe en SQLite
        const stmt = db.prepare("SELECT id_usuario FROM usuarios WHERE email = ?");
        stmt.bind([email]);
        const existe = stmt.step();
        stmt.free();

        if (existe) {
            alert('Este correo electrónico ya se encuentra registrado.');
            return;
        }

        // 5. Insertar en SQLite y guardar en OPFS
        db.run(
            "INSERT INTO usuarios (nombre, apellido, fecha_nacimiento, email, password) VALUES (?, ?, ?, ?, ?)",
            [nombre, apellido, fechaNac, email, password]
        );
        await guardarEnOPFS();

        alert('Usuario registrado con éxito. Serás redirigido al login.');
        window.location.href = 'index.html';
    });
});
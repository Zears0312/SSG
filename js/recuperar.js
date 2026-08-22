document.addEventListener('DOMContentLoaded', () => {
    const recoveryForm = document.getElementById('recovery-form');
    const btnRecover = document.getElementById('btn-recover');
    const newPasswordInput = document.getElementById('new-password');

    const rules = {
        length: /.{8,}/, upper: /[A-Z]/, lower: /[a-z]/, num: /[0-9]/,
        spec: /[!@#\$%\^&\*\(\)_\+\-\=\[\]\{\};':"\\|,.<>\/?]/
    };

    // Mismo feedback visual en tiempo real que en registro
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

        updateReq('req-length', rules.length); updateReq('req-upper', rules.upper);
        updateReq('req-lower', rules.lower); updateReq('req-num', rules.num);
        updateReq('req-spec', rules.spec);
        
        btnRecover.disabled = !allValid;
    });

    recoveryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email-recup').value.trim();
        const nuevaClave = newPasswordInput.value;
        const repNuevaClave = document.getElementById('rep-new-password').value;

        if (nuevaClave !== repNuevaClave) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        let usuarios = JSON.parse(localStorage.getItem('usuarios_sgg')) || [];
        const indexUsuario = usuarios.findIndex(u => u.email === email);

        if (indexUsuario === -1) {
            alert('El correo ingresado no se encuentra registrado.');
            return;
        }

        // Regla: No repetir contraseña actual
        if (usuarios[indexUsuario].password === nuevaClave) {
            alert('La nueva contraseña no puede ser igual a la actual.');
            return;
        }

        // Actualizar y guardar
        usuarios[indexUsuario].password = nuevaClave;
        localStorage.setItem('usuarios_sgg', JSON.stringify(usuarios));
        alert('Contraseña actualizada con éxito.');
        window.location.href = 'index.html';
    });
});
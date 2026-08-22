document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const btnRegister = document.getElementById('btn-register');
    const passwordInput = document.getElementById('password-reg');
    
    // Reglas de Expresión Regular para Contraseña
    const rules = {
        length: /.{8,}/,
        upper: /[A-Z]/,
        lower: /[a-z]/,
        num: /[0-9]/,
        spec: /[!@#\$%\^&\*\(\)_\+\-\=\[\]\{\};':"\\|,.<>\/?]/
    };

    // Feedback visual en tiempo real
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

    // Envío del formulario
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();
        const fechaNac = document.getElementById('fecha-nac').value;
        const email = document.getElementById('email-reg').value.trim();
        const password = passwordInput.value;
        const passwordRep = document.getElementById('password-rep').value;

        // 1. Validar Edad Crítica (> 14 años)
        const hoy = new Date();
        const nacimiento = new Date(fechaNac);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }
        
        if (edad < 14) {
            alert('Debes tener más de 14 años para registrarte.');
            return;
        }

        // 2. Restricciones de Email Estricto
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            alert('El formato del correo no es válido.');
            return;
        }

        // 3. Confirmación Doble Match
        if (password !== passwordRep) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        // 4. Guardar en LocalStorage si no existe el email
        let usuarios = JSON.parse(localStorage.getItem('usuarios_sgg')) || [];
        if (usuarios.some(u => u.email === email)) {
            alert('Este correo electrónico ya se encuentra registrado.');
            return;
        }

        usuarios.push({ email, password, nombre, apellido });
        localStorage.setItem('usuarios_sgg', JSON.stringify(usuarios));
        alert('Usuario registrado con éxito. Serás redirigido al login.');
        window.location.href = 'index.html';
    });
});
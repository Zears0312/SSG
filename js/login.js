document.addEventListener('DOMContentLoaded', () => {
    // Inicializar usuarios predeterminados si el array está vacío
    if (!localStorage.getItem('usuarios_sgg')) {
        const usuariosDefault = [
            { email: 'admin@sgg.com', password: 'Password1!', nombre: 'Admin', apellido: 'Sistema' },
            { email: 'user@sgg.com', password: 'User2024#', nombre: 'Juan', apellido: 'Perez' }
        ];
        localStorage.setItem('usuarios_sgg', JSON.stringify(usuariosDefault));
    }

    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const btnLogin = document.getElementById('btn-login');
    let intentosFallidos = 0;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const usuarios = JSON.parse(localStorage.getItem('usuarios_sgg')) || [];
        const usuarioEncontrado = usuarios.find(u => u.email === email && u.password === password);

        if (usuarioEncontrado) {
            errorDiv.textContent = '';
            alert('¡Inicio de sesión exitoso! Bienvenido ' + usuarioEncontrado.nombre);
            intentosFallidos = 0;

        } else {
            intentosFallidos++;
            errorDiv.textContent = 'Credenciales incorrectas. Intento ' + intentosFallidos + ' de 3.';
            
            // Bloqueo por Intentos Fallidos
            if (intentosFallidos >= 3) {
                errorDiv.textContent = 'Demasiados intentos fallidos. Botón bloqueado por 30 segundos.';
                btnLogin.disabled = true;
                setTimeout(() => {
                    btnLogin.disabled = false;
                    intentosFallidos = 0;
                    errorDiv.textContent = '';
                }, 30000); 
            }
        }
    });
});
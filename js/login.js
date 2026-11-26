document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();

    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const btnLogin = document.getElementById('btn-login');
    let intentosFallidos = 0;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const stmt = db.prepare("SELECT email FROM usuarios WHERE email = ? AND password = ?");
        stmt.bind([email, password]);

        let usuarioEncontrado = null;
        if (stmt.step()) {
            usuarioEncontrado = stmt.getAsObject();
        }
        stmt.free();

        if (usuarioEncontrado) {
            errorDiv.textContent = '';
            intentosFallidos = 0;
            sessionStorage.setItem('usuario_activo', usuarioEncontrado.email);
            window.location.href = 'dashboard.html';
        } else {
            intentosFallidos++;
            errorDiv.textContent = `Credenciales incorrectas. Intento ${intentosFallidos} de 3.`;

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
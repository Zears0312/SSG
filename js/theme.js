document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const currentTheme = localStorage.getItem('theme');

    // Función unificada para aplicar tema e icono
    const aplicarTema = (tema) => {
        if (tema === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.src = 'img/sol.svg';
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (themeIcon) themeIcon.src = 'img/luna.svg';
        }
    };

    // 1. Verificar y aplicar persistencia al cargar la página
    if (currentTheme === 'dark') {
        aplicarTema('dark');
    } else {
        aplicarTema('light'); 
    }

    // 2. Lógica del botón Switch
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                localStorage.setItem('theme', 'light');
                aplicarTema('light');
            } else {
                localStorage.setItem('theme', 'dark');
                aplicarTema('dark');
            }
        });
    }

    // 3. Lógica global para Ver/Ocultar contraseñas
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const inputId = this.getAttribute('aria-controls');
            const input = document.getElementById(inputId);
            const img = this.querySelector('img'); 
            
            if (input.type === 'password') {
                input.type = 'text';
                img.src = 'img/nover.svg'; 
            } else {
                input.type = 'password';
                img.src = 'img/ver.svg';
            }
        });
    });
});
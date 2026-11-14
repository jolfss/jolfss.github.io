(() => {
    const root = document.documentElement;
    const toggles = document.querySelectorAll('[data-theme-toggle]');
    const systemTheme = matchMedia('(prefers-color-scheme: dark)');

    function storedTheme() {
        try {
            const value = localStorage.getItem('theme');
            return value === 'light' || value === 'dark' ? value : null;
        } catch (_) {
            return null;
        }
    }

    function update(theme) {
        root.dataset.theme = theme;
        const target = theme === 'dark' ? 'light' : 'dark';
        toggles.forEach((toggle) => {
            toggle.setAttribute('aria-label', `Switch to ${target} mode`);
            toggle.title = `Switch to ${target} mode`;
        });
    }

    toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('theme', theme); } catch (_) {}
            update(theme);
        });
    });

    systemTheme.addEventListener('change', (event) => {
        if (!storedTheme()) update(event.matches ? 'dark' : 'light');
    });
    update(storedTheme() || (systemTheme.matches ? 'dark' : 'light'));
})();

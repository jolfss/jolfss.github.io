(function () {
    const order = ['auto', 'light', 'dark'];
    const buttons = Array.from(document.querySelectorAll('[data-theme-toggle]'));
    const icons = {
        auto: '☀︎☾',
        light: '☀︎',
        dark: '☾'
    };
    const names = {
        auto: 'Auto theme',
        light: 'Light theme',
        dark: 'Dark theme'
    };

    if (!buttons.length) return;

    function apply(theme) {
        document.documentElement.dataset.theme = theme;
        buttons.forEach(function (button) {
            const label = button.querySelector('[data-theme-toggle-label]');
            if (label) label.textContent = icons[theme];
            button.setAttribute('aria-label', names[theme] + '. Toggle color theme.');
            button.setAttribute('title', names[theme]);
        });
        if (theme === 'auto') {
            localStorage.removeItem('theme');
        } else {
            localStorage.setItem('theme', theme);
        }
    }

    const current = localStorage.getItem('theme') || 'auto';
    apply(order.includes(current) ? current : 'auto');

    buttons.forEach(function (button) {
        button.addEventListener('click', function () {
            const active = document.documentElement.dataset.theme || 'auto';
            const next = order[(order.indexOf(active) + 1) % order.length];
            apply(next);
        });
    });
}());

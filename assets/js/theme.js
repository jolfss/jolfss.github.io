(function () {
    const order = ['auto', 'light', 'dark'];
    const button = document.querySelector('[data-theme-toggle]');
    const label = document.querySelector('[data-theme-toggle-label]');

    if (!button || !label) return;

    function apply(theme) {
        document.documentElement.dataset.theme = theme;
        label.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
        if (theme === 'auto') {
            localStorage.removeItem('theme');
        } else {
            localStorage.setItem('theme', theme);
        }
    }

    const current = localStorage.getItem('theme') || 'auto';
    apply(order.includes(current) ? current : 'auto');

    button.addEventListener('click', function () {
        const active = document.documentElement.dataset.theme || 'auto';
        const next = order[(order.indexOf(active) + 1) % order.length];
        apply(next);
    });
}());

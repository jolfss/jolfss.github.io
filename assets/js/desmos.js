(function () {
    function init() {
        if (!window.Desmos) return;

        document.querySelectorAll('[data-desmos]').forEach(function (el) {
            if (el.dataset.desmosReady === 'true') return;

            const calculator = Desmos.GraphingCalculator(el, {
                expressionsCollapsed: true,
                settingsMenu: false,
                zoomButtons: false
            });

            calculator.setExpression({
                id: 'default-expression',
                latex: el.dataset.expression || 'y=x^2'
            });

            el.dataset.desmosReady = 'true';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());

// Contact form: submits to the same Worker (see cf-worker/worker.js), which
// verifies Turnstile server-side and stores the message. No page reload.
(function () {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    const messageInput = document.getElementById('contactMessage');
    const submitBtn = document.getElementById('contactSubmit');
    const status = document.getElementById('contactStatus');

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let widgetId = null;

    function initWidget() {
        if (widgetId !== null || typeof window.turnstile === 'undefined') return;
        const container = document.getElementById('turnstileContactContainer');
        if (!container) return;
        try {
            widgetId = window.turnstile.render(container, {
                sitekey: container.getAttribute('data-sitekey'),
                size: 'normal',
                execution: 'execute',
                appearance: 'interaction-only',
            });
        } catch (e) {
            // Placeholder/invalid site key until this is deployed for real.
            widgetId = null;
        }
    }

    function waitForTurnstileScript(retries) {
        return new Promise((resolve) => {
            (function check(n) {
                if (typeof window.turnstile !== 'undefined') { resolve(true); return; }
                if (n <= 0) { resolve(false); return; }
                setTimeout(() => check(n - 1), 200);
            })(retries);
        });
    }

    async function getToken() {
        const ready = await waitForTurnstileScript(15);
        if (!ready) return null;
        initWidget();
        if (widgetId === null) return null;

        return new Promise((resolve) => {
            let settled = false;
            const finish = (token) => {
                if (settled) return;
                settled = true;
                resolve(token || null);
            };
            try {
                window.turnstile.execute(widgetId, {
                    callback: (token) => finish(token),
                    'error-callback': () => finish(null),
                });
            } catch (e) {
                finish(null);
                return;
            }
            setTimeout(() => finish(null), 6000);
        }).finally(() => {
            try { window.turnstile.reset(widgetId); } catch (e) { /* noop */ }
        });
    }

    function setStatus(text, kind) {
        status.textContent = text;
        status.className = 'contact-status' + (kind ? ' ' + kind : '');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !email || !message) {
            setStatus('Please fill in every field.', 'error');
            return;
        }
        if (!EMAIL_RE.test(email)) {
            setStatus('That email address doesn\'t look right.', 'error');
            return;
        }

        submitBtn.disabled = true;
        setStatus('Sending…', '');

        const turnstileToken = await getToken();

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message, turnstileToken }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.ok) {
                setStatus('✅ Message sent — thanks for reaching out! I\'ll reply by email soon.', 'success');
                form.reset();
            } else {
                setStatus('Something went wrong sending that. Please email matiouimouad9@gmail.com directly instead.', 'error');
            }
        } catch (err) {
            setStatus('Network error — please email matiouimouad9@gmail.com directly instead.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
})();

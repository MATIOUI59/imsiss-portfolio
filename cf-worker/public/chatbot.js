// Portfolio assistant: tries the Claude-powered proxy first (see cf-worker/),
// and falls back to a built-in rule-based matcher if that's unreachable/unconfigured.
(function () {
    // Same-origin API route, served by the same Worker as this page (see
    // cf-worker/worker.js). Falls back to the rule-based matcher below if
    // this is ever unreachable/unconfigured.
    const CHAT_API_URL = '/api/chat';

    const KB = [
        {
            keywords: ['hi', 'hello', 'hey', 'sup', 'yo', 'greetings'],
            answer: "👋 Hey! I'm a virtual assistant trained on Mouad's application portfolio. Ask me about his education, experience, skills, or projects — or tap a suggestion below."
        },
        {
            keywords: ['who', 'yourself', 'name', 'intro', 'mouad'],
            answer: "👨‍💻 I'm **Mouad Matioui** — a final year Cybersecurity student at the University of Hertfordshire (3.72 CGPA, First Class), currently working as an **AI Junior Solutions Analyst at Immunocore**. My work sits at the intersection of technical security, compliance, and information assurance — the same intersection of technology, policy and strategy that IMSISS trains its graduates in."
        },
        {
            keywords: ['education', 'university', 'degree', 'study', 'studied', 'school', 'hertfordshire', 'gpa', 'cgpa', 'grade', 'baccalaureate'],
            answer: "🎓 **Education**\n- University of Hertfordshire (2022-2026) — BSc Cybersecurity, First Class Honours, 3.72 CGPA. Selected as Teaching Assistant.\n- French Baccalaureate (2018-2021) — Math & Economics, 87%."
        },
        {
            keywords: ['experience', 'work', 'job', 'career', 'immunocore', 'internship', 'intern', 'current', 'role', 'trajectory'],
            answer: "💼 **Experience**\n- AI Junior Solutions Analyst @ Immunocore (Sep 2025-Present) — fine-tunes AI models (+30% accuracy), audit-ready documentation.\n- Cyber Security Intern @ Immunocore (Sep 2024-Sep 2025) — automated onboarding via Python/Graph API (-50% manual work), ISO 27001 compliance.\n- Teaching Assistant @ University of Hertfordshire (2023-2024) — assembly/C labs."
        },
        {
            keywords: ['skill', 'skills', 'tech', 'technology', 'stack', 'expertise', 'python', 'cryptography', 'security', 'active directory', 'gdpr'],
            answer: "🛠️ **Core skills**\n- Python & Bash scripting\n- Active Directory security\n- ISO 27001 & GDPR compliance\n- AI model fine-tuning\n- Cryptography & secure networking\n- Risk & compliance analysis"
        },
        {
            keywords: ['project', 'projects', 'lab', 'labs', 'portfolio', 'built', 'compliance automater', 'vpn'],
            answer: "🚀 **Featured projects**\n- **Compliance Automater** — Python + Graph API tool for ISO 27001 audits on Active Directory.\n- **VPN Protocol Analysis** — resilience of VPN protocols against post-quantum attacks.\n- **AI Security Audit** — framework to assess bias & data-leakage risk in ML models."
        },
        {
            keywords: ['contact', 'email', 'reach', 'hire', 'linkedin', 'connect', 'get in touch'],
            answer: "📧 You can reach Mouad directly at **matiouimouad9@gmail.com** — feel free to say hi!"
        },
        {
            keywords: ['scholarship', 'imsiss', 'erasmus', 'why this site', 'purpose'],
            answer: "🏆 This site was built for Mouad's application to the **IMSISS Erasmus Mundus Scholarship** (International Master in Security, Intelligence & Strategic Studies), showcasing his academic and professional trajectory at the intersection of cybersecurity and international security."
        },
        {
            keywords: ['transcript', 'download'],
            answer: "📄 You can download the academic transcript from the Profile section — it's password protected, as noted right there on the page."
        },
        {
            keywords: ['language', 'languages', 'multilingual'],
            answer: "🌍 Mouad is multilingual, which helps when working across international teams and research."
        },
        {
            keywords: ['thank', 'thanks', 'thank you', 'cheers'],
            answer: "🙌 You're welcome! Let me know if there's anything else you'd like to know."
        }
    ];

    const FALLBACK = "🤔 I'm not totally sure about that one — but you can ask about my education, experience, skills, projects, or how to get in touch. Or email me directly at **matiouimouad9@gmail.com**.";

    const SUGGESTIONS = ['Skills', 'Experience', 'Education', 'Projects', 'Contact'];

    function findAnswer(rawInput) {
        const text = rawInput.toLowerCase();
        const words = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
        let best = null;
        let bestScore = 0;
        KB.forEach(topic => {
            let score = 0;
            topic.keywords.forEach(k => {
                const matches = k.includes(' ') ? text.includes(k) : words.has(k);
                if (matches) score++;
            });
            if (score > bestScore) {
                bestScore = score;
                best = topic;
            }
        });
        return best ? best.answer : FALLBACK;
    }

    // --- Lightweight, safe markdown-ish rendering for bot replies ---
    // Escapes HTML first, then only re-introduces <strong>/<ul><li>/<p> for a
    // small whitelisted subset of markdown, so model output can never inject
    // arbitrary HTML/script even though it's rendered via innerHTML.
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function inlineFormat(text) {
        return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }

    function renderMarkup(raw) {
        const lines = raw.split('\n');
        let html = '';
        let inList = false;
        lines.forEach(line => {
            const trimmed = line.trim();
            const isListItem = /^[-•]\s+/.test(trimmed);
            if (isListItem) {
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                html += '<li>' + inlineFormat(trimmed.replace(/^[-•]\s+/, '')) + '</li>';
            } else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                if (trimmed) html += '<p>' + inlineFormat(trimmed) + '</p>';
            }
        });
        if (inList) html += '</ul>';
        return html;
    }

    const toggle = document.getElementById('chatbotToggle');
    const panel = document.getElementById('chatbotPanel');
    const closeBtn = document.getElementById('chatbotClose');
    const messages = document.getElementById('chatbotMessages');
    const suggestions = document.getElementById('chatbotSuggestions');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');

    if (!toggle || !panel) return;

    let greeted = false;
    let conversationHistory = [];
    const isConfigured = !CHAT_API_URL.includes('YOUR_SUBDOMAIN');

    function createRow(sender) {
        const row = document.createElement('div');
        row.className = 'chatbot-row ' + sender;

        const avatar = document.createElement('div');
        avatar.className = 'chatbot-avatar';
        avatar.textContent = sender.indexOf('user') === 0 ? '🙂' : '🧭';

        const bubble = document.createElement('div');
        bubble.className = 'chatbot-msg ' + sender;

        if (sender.indexOf('user') === 0) {
            row.appendChild(bubble);
            row.appendChild(avatar);
        } else {
            row.appendChild(avatar);
            row.appendChild(bubble);
        }
        return { row, bubble };
    }

    function addMessage(text, sender, asHtml) {
        const { row, bubble } = createRow(sender);
        if (asHtml) {
            bubble.innerHTML = renderMarkup(text);
        } else {
            bubble.textContent = text;
        }
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
        return row;
    }

    function showTyping() {
        const { row, bubble } = createRow('bot typing');
        bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
        return row;
    }

    function botReply(text) {
        const typingRow = showTyping();
        const delay = 400 + Math.random() * 400;
        setTimeout(() => {
            typingRow.remove();
            addMessage(text, 'bot', true);
        }, delay);
    }

    function renderSuggestions() {
        suggestions.innerHTML = '';
        SUGGESTIONS.forEach(label => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'chip';
            chip.textContent = label;
            chip.addEventListener('click', () => handleUserInput(label));
            suggestions.appendChild(chip);
        });
    }

    // --- Cloudflare Turnstile: proves a human is driving before we spend
    // money calling the AI API. Runs invisibly; only shows a challenge if
    // Cloudflare thinks the traffic looks risky. ---
    let turnstileWidgetId = null;
    let turnstileResolve = null;

    function initTurnstileWidget() {
        if (turnstileWidgetId !== null || typeof window.turnstile === 'undefined') return;
        const container = document.getElementById('turnstileContainer');
        if (!container) return;
        try {
            turnstileWidgetId = window.turnstile.render(container, {
                sitekey: container.getAttribute('data-sitekey'),
                size: 'normal',
                execution: 'execute',
                appearance: 'interaction-only',
                callback: (token) => {
                    if (turnstileResolve) {
                        const resolve = turnstileResolve;
                        turnstileResolve = null;
                        resolve(token);
                    }
                },
                'error-callback': () => {
                    if (turnstileResolve) {
                        const resolve = turnstileResolve;
                        turnstileResolve = null;
                        resolve(null);
                    }
                }
            });
        } catch (e) {
            // Placeholder/invalid site key until this is deployed for real - fall
            // back silently to the rule-based bot rather than breaking the chat.
            turnstileWidgetId = null;
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

    async function getTurnstileToken() {
        const scriptReady = await waitForTurnstileScript(15);
        if (!scriptReady) return null;
        initTurnstileWidget();
        if (turnstileWidgetId === null) return null;

        const token = await new Promise((resolve) => {
            turnstileResolve = resolve;
            try {
                window.turnstile.execute(turnstileWidgetId);
            } catch (e) {
                turnstileResolve = null;
                resolve(null);
                return;
            }
            setTimeout(() => {
                if (turnstileResolve) {
                    turnstileResolve = null;
                    resolve(null);
                }
            }, 6000);
        });

        try {
            window.turnstile.reset(turnstileWidgetId);
        } catch (e) {
            // ignore - widget will just re-render fresh next execute
        }
        return token;
    }

    async function getSmartReply(text) {
        if (!isConfigured) return null;
        const turnstileToken = await getTurnstileToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: conversationHistory, turnstileToken }),
                signal: controller.signal
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data && typeof data.reply === 'string' ? data.reply : null;
        } catch (err) {
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function handleUserInput(text) {
        if (!text.trim()) return;
        addMessage(text, 'user');
        input.value = '';
        const typingRow = showTyping();

        getSmartReply(text).then(smartAnswer => {
            const answer = smartAnswer || findAnswer(text);
            typingRow.remove();
            addMessage(answer, 'bot', true);
            conversationHistory.push({ role: 'user', content: text });
            conversationHistory.push({ role: 'assistant', content: answer });
            if (conversationHistory.length > 12) {
                conversationHistory = conversationHistory.slice(-12);
            }
        });
    }

    toggle.addEventListener('click', () => {
        panel.classList.toggle('open');
        if (panel.classList.contains('open') && !greeted) {
            greeted = true;
            renderSuggestions();
            botReply("👋 Hi, I'm Mouad's application assistant. Ask me about his education, experience, skills, or projects, or tap a suggestion below.");
        }
        if (panel.classList.contains('open')) {
            input.focus();
        }
    });

    closeBtn.addEventListener('click', () => panel.classList.remove('open'));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUserInput(input.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUserInput(input.value);
        }
    });
})();

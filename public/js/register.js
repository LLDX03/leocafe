// ── Password visibility toggles ──
const eyeOpen = `<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2"/>`;
const eyeClosed = `<line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5"/><path d="M6.7 6.7A3 3 0 0 0 5.3 8c0 1.7 1.2 3 2.7 3 .6 0 1.1-.2 1.5-.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M9.3 9.3c.3-.4.5-.8.5-1.3C9.8 6.4 9 5.5 8 5.5c-.5 0-.9.2-1.3.4" stroke="currentColor" stroke-width="1.5" fill="none"/>`;

function makeToggle(btnId, inputId, eyeId) {
    let visible = false;
    document.getElementById(btnId).addEventListener('click', () => {
        visible = !visible;
        document.getElementById(inputId).type = visible ? 'text' : 'password';
        document.getElementById(eyeId).innerHTML = visible ? eyeClosed : eyeOpen;
    });
}
makeToggle('togglePw1', 'password', 'eye1');
makeToggle('togglePw2', 'confirm', 'eye2');

// ── Password strength ──
const pwInput = document.getElementById('password');
const strengthWrap = document.getElementById('strengthWrap');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    if (!val) { strengthWrap.style.display = 'none'; return; }
    strengthWrap.style.display = 'block';

    let score = 0;
    if (val.length >= 8) score++;
    if (/[a-z]/.test(val)) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;


    const levels = [
        { label: 'Very weak', color: '#c0735e', width: '20%' },
        { label: 'Weak', color: '#d4956a', width: '40%' },
        { label: 'Fair', color: '#c9b84a', width: '60%' },
        { label: 'Strong', color: '#7aad6e', width: '80%' },
        { label: 'Very strong', color: '#3D5C42', width: '100%' },
    ];

    const lvlIndex = score === 0 ? 0 : Math.min(score - 1, 4);
    const lvl = levels[lvlIndex];
    strengthFill.style.width = lvl.width;
    strengthFill.style.background = lvl.color;
    strengthLabel.textContent = lvl.label;
    strengthLabel.style.color = lvl.color;
});

// ── Validation ──
const fields = {
    username: { el: document.getElementById('username'), err: document.getElementById('username-err') },
    email: { el: document.getElementById('email'), err: document.getElementById('email-err') },
    password: { el: pwInput, err: document.getElementById('pw-err') },
    confirm: { el: document.getElementById('confirm'), err: document.getElementById('confirm-err') },
};

Object.values(fields).forEach(({ el, err }) => {
    el.addEventListener('input', () => {
        el.classList.remove('error');
        err.style.display = 'none';
    });
});

function showError(key, msg) {
    fields[key].el.classList.add('error');
    fields[key].err.textContent = msg;
    fields[key].err.style.display = 'block';
}

function validate() {
    let ok = true;
    const u = fields.username.el.value.trim();
    const e = fields.email.el.value.trim();
    const p = fields.password.el.value;
    const c = fields.confirm.el.value;

    if (u.length < 3) { showError('username', 'Username must be at least 3 characters.'); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { showError('email', 'Please enter a valid email address.'); ok = false; }
    if (p.length < 8) { showError('password', 'Password must be at least 8 characters.'); ok = false; }
    if (!/[a-z]/.test(p)) { showError('password', 'Password must be at contain a lower case.'); ok = false; };
    if (!/[A-Z]/.test(p)) { showError('password', 'Password must be at contain a upper case.'); ok = false; };
    if (!/[0-9]/.test(p)) { showError('password', 'Password must be at contain a number.'); ok = false; };
    if (!/[^A-Za-z0-9]/.test(p)) { showError('password', 'Password must be at contain a special character.'); ok = false; };
    if (p !== c) { showError('confirm', 'Passwords do not match.'); ok = false; }

    return ok;
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) return;

    const data = {
        username: fields.username.el.value.trim(),
        email: fields.email.el.value.trim(),
        password: fields.password.el.value
    };

    try {
        const res = await fetch("http://localhost:3000/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {

            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            document.getElementById('successMsg').style.display = 'block';

            setTimeout(() => {
                window.location.href = "/views/login.html";
            }, 1500);

        } else {
            showError('email', result.message || "Registration failed");
        }


    } catch (err) {
        console.log(err);
        alert("Server not running");
    }
});
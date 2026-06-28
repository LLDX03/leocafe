let emailUsed = '';

const eyeOpen = `<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2"/>`;
const eyeClosed = `<line x1="2" y1="2" x2="14" y2="14"/><path d="M6.7 6.7A3 3 0 0 0 5.3 8s1.2 3 2.7 3c.6 0 1.1-.2 1.5-.5"/><path d="M9.3 9.3c.3-.4.5-.8.5-1.3C9.8 6.4 9 5.5 8 5.5c-.5 0-.9.2-1.3.4"/>`;
let pwVisible = false;
document.getElementById('togglePw').addEventListener('click', () => {
    pwVisible = !pwVisible;
    document.getElementById('newPwInput').type = pwVisible ? 'text' : 'password';
    document.getElementById('eyeIcon').innerHTML = pwVisible ? eyeClosed : eyeOpen;
});

function showStep(n) {
    document.querySelectorAll('.step').forEach((s, i) => {
        s.classList.toggle('active', i === n - 1);
    });
    ['dot1', 'dot2', 'dot3'].forEach((id, i) => {
        const dot = document.getElementById(id);
        dot.classList.toggle('active', i === n - 1);
        dot.classList.toggle('done', i < n - 1);
    });
}

function goBack() {
    showStep(1);
    document.getElementById('codeInput').value = '';
    document.getElementById('newPwInput').value = '';
}

async function sendCode() {
    const email = document.getElementById('emailInput').value.trim();
    const emailErr = document.getElementById('emailErr');
    const btn = document.getElementById('sendBtn');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailErr.style.display = 'block';
        return;
    }
    emailErr.style.display = 'none';
    btn.textContent = 'Sendingâ€¦';
    btn.disabled = true;

    try {
        const res = await fetch('http://localhost:3000/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.success) {
            emailUsed = email;
            showStep(2);
        } else {
            emailErr.textContent = data.message || 'Something went wrong.';
            emailErr.style.display = 'block';
        }
    } catch {
        emailErr.textContent = 'Cannot connect to server.';
        emailErr.style.display = 'block';
    }

    btn.textContent = 'Send Reset Code';
    btn.disabled = false;
}

async function resetPassword() {
    const code = document.getElementById('codeInput').value.trim();
    const newPassword = document.getElementById('newPwInput').value;
    const codeErr = document.getElementById('codeErr');
    const pwErr = document.getElementById('pwErr');

    codeErr.style.display = 'none';
    pwErr.style.display = 'none';

    if (!code || code.length !== 6) { codeErr.style.display = 'block'; return; }
    if (newPassword.length < 8) { pwErr.style.display = 'block'; return; }

    try {
        const res = await fetch('http://localhost:3000/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailUsed, code, newPassword })
        });
        const data = await res.json();

        if (data.success) {
            showStep(3);
        } else {
            codeErr.textContent = data.message || 'Invalid or expired code.';
            codeErr.style.display = 'block';
        }
    } catch {
        codeErr.textContent = 'Cannot connect to server.';
        codeErr.style.display = 'block';
    }
}

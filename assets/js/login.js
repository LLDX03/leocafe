const form = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const pwEl = document.getElementById('password');
const emailErr = document.getElementById('email-err');
const pwErr = document.getElementById('pw-err');
const successMsg = document.getElementById('successMsg');
const togglePw = document.getElementById('togglePw');
const eyeIcon = document.getElementById('eye-icon');

// Toggle password visibility
const eyeOpen = `<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2"/>`;
const eyeClosed = `<line x1="2" y1="2" x2="14" y2="14"/><path d="M6.7 6.7A3 3 0 0 0 5.3 8s1.2 3 2.7 3c.6 0 1.1-.2 1.5-.5"/><path d="M9.3 9.3c.3-.4.5-.8.5-1.3C9.8 6.4 9 5.5 8 5.5c-.5 0-.9.2-1.3.4"/><path d="M1 8s1.3-2.1 3.5-3.5M12.5 3.5C14.7 5 16 8 16 8s-2.5 5-8 5c-.8 0-1.5-.1-2.2-.3"/>`;
let pwVisible = false;
togglePw.addEventListener('click', () => {
    pwVisible = !pwVisible;
    pwEl.type = pwVisible ? 'text' : 'password';
    eyeIcon.innerHTML = pwVisible ? eyeClosed : eyeOpen;
});

function validate() {
    let ok = true;
    const emailVal = emailEl.value.trim();
    const pwVal = pwEl.value;

    // Email
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        emailEl.classList.add('error');
        emailErr.style.display = 'block';
        ok = false;
    } else {
        emailEl.classList.remove('error');
        emailErr.style.display = 'none';
    }

    // Password
    if (pwVal.length < 6) {
        pwEl.classList.add('error');
        pwErr.style.display = 'block';
        ok = false;
    } else {
        pwEl.classList.remove('error');
        pwErr.style.display = 'none';
    }

    return ok;
}

// Live clear on input
emailEl.addEventListener('input', () => {
    emailEl.classList.remove('error');
    emailErr.style.display = 'none';
});
pwEl.addEventListener('input', () => {
    pwEl.classList.remove('error');
    pwErr.style.display = 'none';
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validate()) {
        successMsg.style.display = 'block';
        form.querySelectorAll('input, button[type=submit]').forEach(el => el.disabled = true);
    }
});
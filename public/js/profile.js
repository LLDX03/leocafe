// Global state
let currentUser = null;
let newEmailPending = null;
let currentPasswordValid = false;

// Load user data on page load
window.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
});

// Load user profile from backend
async function loadUserProfile() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.success) {
      localStorage.removeItem("token");
      window.location.href = 'login.html';
      return;
    }

    currentUser = data.user;
    displayUserData();
  } catch (err) {
    console.error("Error loading profile:", err);
    showToast("Error loading profile");
  }
}

// Display user data on the page
function displayUserData() {
  // Basic info
  document.getElementById('usernameView').textContent = currentUser.username;
  document.getElementById('usernameEdit').value = currentUser.username;
  
  // Birthday
  if (currentUser.birthday) {
    const date = new Date(currentUser.birthday);
    const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('birthdayView').textContent = formatted;
    document.getElementById('birthdayEdit').value = currentUser.birthday;
  } else {
    document.getElementById('birthdayView').textContent = 'Not set';
    document.getElementById('birthdayEdit').value = '';
  }

  // Email
  document.getElementById('emailDisplay').textContent = currentUser.email;
  document.getElementById('emailSignedIn').textContent = currentUser.email;

  // Points and tier
  document.getElementById('pointsDisplay').textContent = currentUser.points || 0;
  document.getElementById('tierDisplay').textContent = currentUser.tier || 'Bronze';

  // Member since
  if (currentUser.createdAt) {
    const memberDate = new Date(currentUser.createdAt);
    const monthYear = memberDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('memberSinceDisplay').textContent = monthYear;
  }
}

// ===== BASIC INFO EDITING =====

function toggleBasicInfoEdit() {
  const card = document.getElementById('basicInfoCard');
  const editOnly = card.querySelectorAll('.edit-only');
  
  if (card.classList.contains('view-mode')) {
    card.classList.remove('view-mode');
    card.classList.add('edit-mode');
    editOnly.forEach(el => el.style.display = 'block');
    document.querySelector('#basicInfoCard .edit-btn').textContent = 'Cancel';
  } else {
    card.classList.remove('edit-mode');
    card.classList.add('view-mode');
    editOnly.forEach(el => el.style.display = 'none');
    document.querySelector('#basicInfoCard .edit-btn').textContent = 'Edit';
  }
}

async function saveBasicInfo() {
  const token = localStorage.getItem("token");
  const username = document.getElementById('usernameEdit').value.trim();
  const birthday = document.getElementById('birthdayEdit').value;

  if (!username) {
    showToast('Username cannot be empty');
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/profile/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        username,
        birthday: birthday || null
      })
    });

    const data = await res.json();

    if (data.success) {
      currentUser.username = username;
      currentUser.birthday = birthday || null;
      displayUserData();
      toggleBasicInfoEdit();
      showToast('Profile updated successfully!');
    } else {
      showToast(data.message || 'Error updating profile');
    }
  } catch (err) {
    console.error("Error:", err);
    showToast('Error updating profile');
  }
}

// ===== CHANGE EMAIL =====

function openChangeEmailModal() {
  document.getElementById('changeEmailModal').style.display = 'flex';
  resetEmailSteps();
}

function closeChangeEmailModal() {
  document.getElementById('changeEmailModal').style.display = 'none';
  resetEmailSteps();
}

function resetEmailSteps() {
  document.getElementById('emailStep1').style.display = 'block';
  document.getElementById('emailStep2').style.display = 'none';
  document.getElementById('emailStep3').style.display = 'none';
  document.getElementById('newEmailInput').value = '';
  document.getElementById('emailCodeInput').value = '';
  newEmailPending = null;
}

async function sendEmailCode() {
  const token = localStorage.getItem("token");
  const newEmail = document.getElementById('newEmailInput').value.trim();

  if (!newEmail) {
    showToast('Please enter a new email');
    return;
  }

  if (!isValidEmail(newEmail)) {
    showToast('Please enter a valid email');
    return;
  }

  if (newEmail === currentUser.email) {
    showToast('New email must be different from current email');
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/profile/send-email-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ newEmail })
    });

    const data = await res.json();

    if (data.success) {
      newEmailPending = newEmail;
      showToast('Code sent! Check spam folder if not in inbox');
      document.getElementById('emailStep1').style.display = 'none';
      document.getElementById('emailStep2').style.display = 'block';
    } else {
      showToast(data.message || 'Error sending code');
    }
  } catch (err) {
    console.error("Error:", err);
    showToast('Error sending verification code');
  }
}

async function verifyEmailCode() {
  const token = localStorage.getItem("token");
  const code = document.getElementById('emailCodeInput').value.trim();

  if (!code || code.length !== 6) {
    showToast('Please enter a valid 6-digit code');
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/profile/verify-email-change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        newEmail: newEmailPending,
        code
      })
    });

    const data = await res.json();

    if (data.success) {
      currentUser.email = newEmailPending;
      displayUserData();
      document.getElementById('emailStep2').style.display = 'none';
      document.getElementById('emailStep3').style.display = 'block';
    } else {
      showToast(data.message || 'Invalid verification code');
    }
  } catch (err) {
    console.error("Error:", err);
    showToast('Error verifying code');
  }
}

// ===== CHANGE PASSWORD =====

function openChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'flex';
  resetPasswordSteps();
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'none';
  resetPasswordSteps();
}

function resetPasswordSteps() {
  document.getElementById('pwStep1').style.display = 'block';
  document.getElementById('pwStep2').style.display = 'none';
  document.getElementById('pwStep3').style.display = 'none';
  document.getElementById('currentPasswordInput').value = '';
  document.getElementById('newPasswordInput').value = '';
  document.getElementById('passwordCodeInput').value = '';
  currentPasswordValid = false;
}

async function sendPasswordCode() {
  const token = localStorage.getItem("token");
  const currentPassword = document.getElementById('currentPasswordInput').value;

  if (!currentPassword) {
    showToast('Please enter your current password');
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/profile/send-password-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword })
    });

    const data = await res.json();

    if (data.success) {
      currentPasswordValid = true;
      showToast('Code sent! Check spam folder if not in inbox');
      document.getElementById('pwStep1').style.display = 'none';
      document.getElementById('pwStep2').style.display = 'block';
    } else {
      showToast(data.message || 'Incorrect password');
    }
  } catch (err) {
    console.error("Error:", err);
    showToast('Error sending verification code');
  }
}

async function verifyPasswordChange() {
  const token = localStorage.getItem("token");
  const newPassword = document.getElementById('newPasswordInput').value;
  const code = document.getElementById('passwordCodeInput').value.trim();

  if (!newPassword || newPassword.length < 6) {
    showToast('Password must be at least 6 characters');
    return;
  }

  if (!code || code.length !== 6) {
    showToast('Please enter a valid 6-digit code');
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/profile/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        newPassword,
        code
      })
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById('pwStep2').style.display = 'none';
      document.getElementById('pwStep3').style.display = 'block';
    } else {
      showToast(data.message || 'Error changing password');
    }
  } catch (err) {
    console.error("Error:", err);
    showToast('Error changing password');
  }
}

// ===== LOGOUT =====

function logout() {
  if (confirm('Are you sure you want to sign out?')) {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
    localStorage.removeItem("leos_username");
    window.location.href = 'login.html';
  }
}

// ===== UTILITIES =====

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
  const emailModal = document.getElementById('changeEmailModal');
  const passwordModal = document.getElementById('changePasswordModal');

  if (e.target === emailModal) {
    closeChangeEmailModal();
  }
  if (e.target === passwordModal) {
    closeChangePasswordModal();
  }
});
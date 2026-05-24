if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    const token = localStorage.getItem("token");
    const expiry = localStorage.getItem("token_expiry");

    if (!token || Date.now() > expiry) {
        window.location.href = "login.html";
    }
}
(function () {
  const storageKey = "ivl-theme";
  const body = document.body;
  const toggle = document.querySelector('[data-ivl-theme-toggle]');
  const toggleIcon = document.querySelector('[data-ivl-theme-icon]');
  const toggleLabel = document.querySelector('[data-ivl-theme-label]');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function normalizeTheme(value) {
    return value === "dark" || value === "light" ? value : null;
  }

  function resolveInitialTheme() {
    const stored = normalizeTheme(localStorage.getItem(storageKey));
    if (stored) {
      return stored;
    }
    return prefersDark.matches ? "dark" : "light";
  }

  function setTheme(theme, persist) {
    if (theme === "dark") {
      body.classList.add("ivl-theme-dark");
      body.setAttribute("data-ivl-theme", "dark");
    } else {
      body.classList.remove("ivl-theme-dark");
      body.setAttribute("data-ivl-theme", "light");
    }
    if (persist) {
      localStorage.setItem(storageKey, theme);
    }
    if (toggleIcon) {
      toggleIcon.setAttribute("data-ivl-icon", theme === "dark" ? "moon" : "sun");
      toggleIcon.innerHTML = theme === "dark"
        ? '<img src="/public/assets/icon-sun.svg" alt="" aria-hidden="true" />'
        : '<img src="/public/assets/icon-moon.svg" alt="" aria-hidden="true" />';
      toggleIcon.classList.toggle("ivl-theme-toggle__icon--dark", theme === "dark");
    }
    if (toggleLabel) {
      toggleLabel.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    }
    if (toggle) {
      toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      toggle.setAttribute("data-ivl-theme-state", theme);
    }
  }

  if (toggle) {
    const initial = resolveInitialTheme();
    setTheme(initial, false);

    toggle.addEventListener("click", () => {
      const current = body.classList.contains("ivl-theme-dark") ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      setTheme(next, true);
    });

    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle.click();
      }
    });
  }

  prefersDark.addEventListener("change", (event) => {
    const stored = normalizeTheme(localStorage.getItem(storageKey));
    if (!stored) {
      setTheme(event.matches ? "dark" : "light", false);
    }
  });

  const navLinks = document.querySelectorAll('.ivl-nav-link[href^="/"]');
  const rawPath = window.location.pathname.replace(/\/$/, "");
  const normalizedPath = rawPath || "/";
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (!href) {
      return;
    }
    const normalizedHref = href.replace(/\/$/, "") || "/";
    if (normalizedHref === "#") {
      return;
    }
    if (normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`)) {
      link.setAttribute("aria-current", "page");
    }
  });

  const autoGrow = document.querySelector('[data-ivl-autogrow]');
  if (autoGrow) {
    const input = autoGrow;
    const resize = () => {
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
    };
    input.addEventListener("input", resize);
    resize();
  }
})();

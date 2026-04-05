/**
 * Resume Toolbar Controls
 *
 * Provides theme toggle, accent color picker, and PDF download.
 * Persists preferences to localStorage.
 *
 * Expects this HTML structure in the page:
 *
 *   <div class="toolbar">
 *     <button class="primary" data-action="pdf">📄 Download PDF</button>
 *     <button data-action="theme" id="themeBtn">🌙 Dark</button>
 *     <input  data-action="accent" type="color" id="accentPicker">
 *     <button data-action="reset-accent">Reset</button>
 *   </div>
 */

const Toolbar = (() => {

    const DEFAULT_ACCENT = '#2563eb';
    const KEYS = { theme: 'resume-theme', accent: 'resume-accent' };
  
    // ── Theme ────────────────────────────────────
  
    function getTheme() {
      return localStorage.getItem(KEYS.theme) || 'light';
    }
  
    function applyTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = t === 'dark' ? '☀️ Light' : '🌙 Dark';
      localStorage.setItem(KEYS.theme, t);
    }
  
    function toggleTheme() {
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    }
  
    // ── Accent Color ─────────────────────────────
  
    function getAccent() {
      return localStorage.getItem(KEYS.accent) || DEFAULT_ACCENT;
    }
  
    function setAccent(color) {
      document.documentElement.style.setProperty('--accent', color);
      const picker = document.getElementById('accentPicker');
      const preview = document.getElementById('colorPreview');
      if (picker) picker.value = color;
      if (preview) preview.style.borderColor = color;
      localStorage.setItem(KEYS.accent, color);
    }
  
    function resetAccent() {
      setAccent(DEFAULT_ACCENT);
    }
  
    // ── PDF ──────────────────────────────────────
  
    function downloadPDF() {
      window.print();
    }
  
    // ── Init ─────────────────────────────────────
  
    function init() {
      // Apply saved preferences
      applyTheme(getTheme());
      setAccent(getAccent());
  
      // Bind event listeners via data-action attributes
      document.querySelectorAll('[data-action]').forEach(el => {
        const action = el.getAttribute('data-action');
  
        if (action === 'pdf') {
          el.addEventListener('click', downloadPDF);
        }
        else if (action === 'theme') {
          el.addEventListener('click', toggleTheme);
        }
        else if (action === 'accent') {
          el.addEventListener('input', (e) => setAccent(e.target.value));
        }
        else if (action === 'reset-accent') {
          el.addEventListener('click', resetAccent);
        }
      });
    }
  
    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    return { toggleTheme, setAccent, resetAccent, downloadPDF };
  
  })();
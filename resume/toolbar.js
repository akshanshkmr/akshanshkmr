/**
 * Resume Toolbar Controls
 *
 * Theme toggle, accent color picker, template switcher.
 * Persists preferences to localStorage.
 *
 * Expects data-action attributes on toolbar elements:
 *   data-action="pdf"            → window.print()
 *   data-action="theme"          → toggle dark/light
 *   data-action="accent"         → color input
 *   data-action="reset-accent"   → reset to default
 *   data-action="template"       → <select> for template
 */

const Toolbar = (() => {

    const DEFAULT_ACCENT = '#2563eb';
    const KEYS = {
      theme: 'resume-theme',
      accent: 'resume-accent',
      template: 'resume-template',
    };
  
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
  
    // ── Template ─────────────────────────────────
  
    function getTemplate() {
      return localStorage.getItem(KEYS.template) || 'classic';
    }
  
    function setTemplate(tpl) {
      localStorage.setItem(KEYS.template, tpl);
      const select = document.getElementById('tplSelect');
      if (select) select.value = tpl;
      if (typeof ResumeParser !== 'undefined') {
        ResumeParser.setTemplate(tpl);
      }
    }
  
    // ── PDF ──────────────────────────────────────
  
    function downloadPDF() {
      window.print();
    }
  
    // ── Init ─────────────────────────────────────
  
    function init() {
      applyTheme(getTheme());
      setAccent(getAccent());
  
      const savedTpl = getTemplate();
      const select = document.getElementById('tplSelect');
      if (select) select.value = savedTpl;
      if (typeof ResumeParser !== 'undefined') {
        ResumeParser.setTemplate(savedTpl);
      }
  
      document.querySelectorAll('[data-action]').forEach(el => {
        const action = el.getAttribute('data-action');
  
        if (action === 'pdf')           el.addEventListener('click', downloadPDF);
        else if (action === 'theme')    el.addEventListener('click', toggleTheme);
        else if (action === 'accent')   el.addEventListener('input', e => setAccent(e.target.value));
        else if (action === 'reset-accent') el.addEventListener('click', resetAccent);
        else if (action === 'template') el.addEventListener('change', e => setTemplate(e.target.value));
      });
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    return { toggleTheme, setAccent, resetAccent, setTemplate, downloadPDF };
  
  })();
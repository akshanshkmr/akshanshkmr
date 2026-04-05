var ResumeParser = (function () {
  var currentTemplate = 'classic';
  var parsedMeta = {};
  var parsedSections = [];

  /* ── Parsers ───────────────────────────── */

  function parseFrontmatter(md) {
    var m = md.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return [{}, md];
    var meta = {};
    m[1].split('\n').forEach(function (l) {
      var i = l.indexOf(':');
      if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    });
    return [meta, md.slice(m[0].length).trim()];
  }

  function parseSections(body) {
    var out = [], cur = null;
    body.split('\n').forEach(function (l) {
      if (/^# /.test(l)) {
        cur = { title: l.slice(2), lines: [] };
        out.push(cur);
      } else if (cur) {
        cur.lines.push(l);
      }
    });
    return out.map(function (s) {
      return { title: s.title, content: s.lines.join('\n').trim() };
    });
  }

  function parseTableRows(text) {
    return text.split('\n').filter(function (l) {
      return l.startsWith('|');
    }).map(function (l) {
      var cols = l.split('|').map(function (c) { return c.trim(); }).filter(Boolean);
      return cols.length >= 2 ? cols : null;
    }).filter(Boolean);
  }

  function parseExperience(text) {
    var jobs = [], job = null, proj = null;
    text.split('\n').forEach(function (l) {
      if (/^## /.test(l)) {
        var p = l.slice(3).split('|').map(function (s) { return s.trim(); });
        job = { role: p[0], company: p[1] || '', date: p[2] || '', projects: [] };
        jobs.push(job);
        proj = null;
      } else if (/^### /.test(l) && job) {
        proj = { title: l.slice(4), desc: [] };
        job.projects.push(proj);
      } else if (proj && l.trim()) {
        proj.desc.push(l.trim());
      }
    });
    jobs.forEach(function (j) {
      j.projects.forEach(function (p) { p.desc = p.desc.join(' '); });
    });
    return jobs;
  }

  function parseListItems(text) {
    return text.split('\n').filter(function (l) {
      return l.startsWith('- ');
    }).map(function (l) {
      var p = l.slice(2).split('|').map(function (s) { return s.trim(); });
      return { text: p[0], year: p[1] || '' };
    });
  }

  function boldify(str) {
    return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  function getInitials(name) {
    return (name || '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }

  /* ── Avatar ────────────────────────────── */

  function avatarHTML(meta, sizeClass) {
    if (meta.image) {
      return '<img class="avatar ' + (sizeClass || '') + '" src="' + meta.image + '" alt="Photo">';
    }
    var ini = getInitials(meta.name);
    if (ini) {
      return '<div class="avatar-placeholder ' + (sizeClass || '') + '">' + ini + '</div>';
    }
    return '';
  }

  function hasAvatar(meta) {
    return !!(meta.image || getInitials(meta.name));
  }

  /* ── Shared Renderers ──────────────────── */

  function renderContact(meta) {
    var h = '';
    ['email', 'phone', 'location'].forEach(function (k) {
      if (meta[k]) h += '<span>' + meta[k] + '</span>';
    });
    ['linkedin', 'github', 'website', 'portfolio'].forEach(function (k) {
      if (meta[k]) h += '<a href="https://' + meta[k] + '">' + meta[k] + '</a>';
    });
    return h;
  }

  function renderSkills(c) {
    var r = parseTableRows(c);
    var h = '<div class="skills-grid">';
    r.forEach(function (row) {
      h += '<div class="label">' + row[0] + '</div><div class="value">' + row[1] + '</div>';
    });
    return h + '</div>';
  }

  function renderExp(c) {
    var jobs = parseExperience(c);
    var h = '';
    jobs.forEach(function (j) {
      h += '<div class="job-header"><span class="role">' + j.role + '</span><span class="date">' + j.date + '</span></div>';
      h += '<div class="company">' + j.company + '</div>';
      j.projects.forEach(function (p) {
        h += '<div class="proj"><div class="proj-title">' + p.title + '</div><div class="proj-desc">' + boldify(p.desc) + '</div></div>';
      });
    });
    return h;
  }

  function renderEdu(c) {
    var r = parseTableRows(c);
    var h = '<table class="edu-table"><thead><tr><th>Degree</th><th>Institution</th><th>Year</th><th>Notes</th></tr></thead><tbody>';
    r.forEach(function (row) {
      h += '<tr><td>' + row[0] + '</td><td>' + row[1] + '</td><td>' + row[2] + '</td><td class="note">' + (row[3] || '') + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function renderAch(c) {
    var items = parseListItems(c);
    var h = '<div class="ach-grid">';
    items.forEach(function (a) {
      h += '<div class="ach-item">' + boldify(a.text) + ' <span class="ach-year">' + a.year + '</span></div>';
    });
    return h + '</div>';
  }

  function renderGeneric(c) {
    var li = parseListItems(c);
    var tr = parseTableRows(c);
    if (li.length) {
      var h = '<div class="generic-list">';
      li.forEach(function (i) {
        h += '<div class="g-item">' + boldify(i.text) + (i.year ? ' <span class="g-year">' + i.year + '</span>' : '') + '</div>';
      });
      return h + '</div>';
    }
    if (tr.length) {
      var h2 = '<div class="skills-grid">';
      tr.forEach(function (r) {
        h2 += '<div class="label">' + r[0] + '</div><div class="value">' + r.slice(1).join(' \u00B7 ') + '</div>';
      });
      return h2 + '</div>';
    }
    return '<div class="generic-para">' + boldify(c) + '</div>';
  }

  function ST(t) {
    return '<div class="section-title">' + t + '</div>';
  }

  function renderSections(sections, exclude) {
    var skip = (exclude || []).map(function (s) { return s.toLowerCase(); });
    var h = '';
    sections.forEach(function (sec) {
      var k = sec.title.toLowerCase();
      if (skip.indexOf(k) >= 0) return;
      if (k === 'summary') h += '<div class="section">' + ST('Summary') + '<div class="summary">' + boldify(sec.content) + '</div></div>';
      else if (k === 'skills') h += '<div class="section">' + ST('Technical Skills') + renderSkills(sec.content) + '</div>';
      else if (k === 'experience') h += '<div class="section">' + ST('Experience') + renderExp(sec.content) + '</div>';
      else if (k === 'education') h += '<div class="section">' + ST('Education') + renderEdu(sec.content) + '</div>';
      else if (k === 'achievements') h += '<div class="section">' + ST('Achievements') + renderAch(sec.content) + '</div>';
      else h += '<div class="section">' + ST(sec.title) + renderGeneric(sec.content) + '</div>';
    });
    return h;
  }

  /* ── Template: Classic ─────────────────── */

  function renderClassic(meta, sections) {
    var img = hasAvatar(meta);
    var h = '<div class="header ' + (img ? '' : 'no-img') + '">';
    if (img) h += avatarHTML(meta, '');
    h += '<div class="header-text"><h1>' + (meta.name || '') + '</h1>';
    if (meta.title) h += '<div class="htitle">' + meta.title + '</div>';
    h += '<div class="contact">' + renderContact(meta) + '</div></div></div>';
    h += renderSections(sections);
    return h;
  }

  /* ── Template: Sidebar ─────────────────── */

  function renderSidebar(meta, sections) {
    var skillsSec = sections.find(function (s) { return s.title.toLowerCase() === 'skills'; });
    var eduSec = sections.find(function (s) { return s.title.toLowerCase() === 'education'; });

    var sb = '<div class="sidebar">';
    sb += '<div class="sb-avatar">' + avatarHTML(meta, 'avatar-lg') + '</div>';
    sb += '<h1>' + (meta.name || '') + '</h1>';
    if (meta.title) sb += '<div class="htitle">' + meta.title + '</div>';

    sb += '<div class="sb-section"><div class="sb-title">Contact</div>';
    ['email', 'phone', 'location'].forEach(function (k) {
      if (meta[k]) sb += '<div class="sb-item">' + meta[k] + '</div>';
    });
    ['linkedin', 'github'].forEach(function (k) {
      if (meta[k]) sb += '<div class="sb-item"><a href="https://' + meta[k] + '">' + meta[k].replace(/.*\//, '') + '</a></div>';
    });
    sb += '</div>';

    if (skillsSec) {
      sb += '<div class="sb-section"><div class="sb-title">Skills</div>';
      parseTableRows(skillsSec.content).forEach(function (r) {
        sb += '<div class="sb-item"><div class="sb-item-label">' + r[0] + '</div><div class="sb-item-value">' + r[1] + '</div></div>';
      });
      sb += '</div>';
    }

    if (eduSec) {
      sb += '<div class="sb-section"><div class="sb-title">Education</div>';
      parseTableRows(eduSec.content).forEach(function (r) {
        sb += '<div class="sb-item"><div class="sb-item-label">' + r[0] + '</div><div class="sb-item-value">' + r[1] + ' \u00B7 ' + r[2] + '</div></div>';
      });
      sb += '</div>';
    }
    sb += '</div>';

    var main = '<div class="main">' + renderSections(sections, ['skills', 'education']) + '</div>';
    return sb + main;
  }

  /* ── Template: Bold ────────────────────── */

  function renderBold(meta, sections) {
    var img = hasAvatar(meta);
    var h = '<div class="bold-header ' + (img ? '' : 'no-img') + '">';
    if (img) h += avatarHTML(meta, 'avatar-lg');
    h += '<div><h1>' + (meta.name || '') + '</h1>';
    if (meta.title) h += '<div class="htitle">' + meta.title + '</div>';
    h += '<div class="contact">' + renderContact(meta) + '</div></div></div>';
    h += '<div class="bold-body">' + renderSections(sections) + '</div>';
    return h;
  }

  /* ── Template: Minimal ─────────────────── */

  function renderMinimal(meta, sections) {
    var img = hasAvatar(meta);
    var h = '<div class="header ' + (img ? '' : 'no-img') + '">';
    if (img) h += avatarHTML(meta, 'avatar-sm');
    h += '<div class="header-text"><h1>' + (meta.name || '') + '</h1>';
    if (meta.title) h += '<div class="htitle">' + meta.title + '</div>';
    h += '<div class="contact">' + renderContact(meta) + '</div></div></div>';
    h += renderSections(sections);
    return h;
  }

  /* ── Render Dispatch ───────────────────── */

  var renderers = {
    classic: renderClassic,
    sidebar: renderSidebar,
    bold: renderBold,
    minimal: renderMinimal
  };

  /* ── Multi-Page A4 Layout ──────────────── */

  function measureA4() {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:297mm;';
    document.body.appendChild(probe);
    var h = probe.offsetHeight;
    document.body.removeChild(probe);
    return h;
  }

  function buildPages() {
    var wrapper = document.getElementById('wrapper');
    if (!wrapper) return;

    var a4h = measureA4();

    // Get all page-sheet-inner divs and measure content height
    // We rendered content into a hidden measurer first
    var measurer = document.createElement('div');
    measurer.className = 't-' + currentTemplate;
    measurer.style.cssText = 'position:absolute;visibility:hidden;width:210mm;';
    var innerPage = document.createElement('div');
    innerPage.className = 'page';
    var fn = renderers[currentTemplate] || renderClassic;
    innerPage.innerHTML = fn(parsedMeta, parsedSections);
    measurer.appendChild(innerPage);
    document.body.appendChild(measurer);

    var totalHeight = innerPage.scrollHeight;
    var numPages = Math.max(1, Math.ceil(totalHeight / a4h));

    document.body.removeChild(measurer);

    // Build page sheets
    var html = '';

    // Page count badge
    if (numPages > 1) {
      html += '<div class="page-count-badge warn">\u26A0 Content spans ' + numPages + ' pages \u2014 trim to fit 1 page</div>';
    } else {
      html += '<div class="page-count-badge">\u2713 Fits on 1 page</div>';
    }

    for (var i = 0; i < numPages; i++) {
      html += '<div class="page-sheet">';
      html += '<div class="page-sheet-inner" style="top:' + (-(i * a4h)) + 'px;">';
      html += '<div class="page" id="' + (i === 0 ? 'resume' : 'resume-p' + (i + 1)) + '">';
      html += fn(parsedMeta, parsedSections);
      html += '</div>';
      html += '</div>';
      html += '<div class="page-label">Page ' + (i + 1) + ' of ' + numPages + '</div>';
      html += '</div>';
    }

    wrapper.className = 't-' + currentTemplate;
    wrapper.innerHTML = html;
  }

  function renderToDOM() {
    var wrapper = document.getElementById('wrapper');
    if (!wrapper) return;

    // Temporary loading state
    wrapper.className = 't-' + currentTemplate;
    wrapper.innerHTML = '<div class="page-sheet"><div class="page" id="resume"><div class="status">Rendering\u2026</div></div></div>';

    setTimeout(buildPages, 30);
  }

  function parse(md) {
    var result = parseFrontmatter(md);
    parsedMeta = result[0];
    var body = result[1];
    parsedSections = parseSections(body);
    renderToDOM();
  }

  /* ── Public API ────────────────────────── */

  function load(path) {
    fetch(path)
      .then(function (r) {
        if (!r.ok) throw new Error('Could not load ' + path);
        return r.text();
      })
      .then(parse)
      .catch(function () {
        var wrapper = document.getElementById('wrapper');
        if (wrapper) {
          wrapper.innerHTML =
            '<div class="page-sheet"><div class="page"><div class="status">' +
            '<p><strong>Could not load ' + path + '</strong></p>' +
            '<p style="margin-top:8px;font-size:12px;color:var(--light);">' +
            'Make sure the file is in the same directory as index.html</p></div></div></div>';
        }
      });
  }

  function setTemplate(tpl) {
    if (renderers[tpl]) {
      currentTemplate = tpl;
      renderToDOM();
    }
  }

  return {
    load: load,
    renderFromString: parse,
    setTemplate: setTemplate,
    getTemplate: function () { return currentTemplate; }
  };

})();
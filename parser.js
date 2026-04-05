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
    if (meta.email) h += '<a href="mailto:' + meta.email + '">' + meta.email + '</a>';
    if (meta.phone) h += '<a href="tel:' + meta.phone.replace(/\s/g, '') + '">' + meta.phone + '</a>';
    if (meta.location) h += '<span>' + meta.location + '</span>';
    ['linkedin', 'github', 'website', 'portfolio'].forEach(function (k) {
      if (meta[k]) h += '<a href="https://' + meta[k] + '">' + meta[k] + '</a>';
    });
    return h;
  }

  function renderSkills(c) {
    var r = parseTableRows(c);
    var h = '<div class="skills-section">';
    r.forEach(function (row) {
      h += '<span class="skill-category">' + row[0] + ':</span>';
      var skills = row[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      skills.forEach(function (skill) {
        h += '<span class="skill-pill">' + skill + '</span>';
      });
    });
    return h + '</div>';
  }

  function renderExp(c) {
    var jobs = parseExperience(c);
    var h = '';
    jobs.forEach(function (j) {
      h += '<div class="job-header"><span class="role">' + j.role + '</span><span class="date">' + j.date + '</span></div>';
      h += '<div class="company">' + j.company + '</div>';
      h += '<div class="projects">';
      j.projects.forEach(function (p) {
        h += '<div class="proj"><div class="proj-title">' + p.title + '</div><div class="proj-desc">' + boldify(p.desc) + '</div></div>';
      });
      h += '</div>';
    });
    return h;
  }

  function renderEdu(c) {
    var r = parseTableRows(c);
    var h = '<div class="edu-list">';
    r.forEach(function (row) {
      h += '<div class="edu-entry">';
      h += '<div class="edu-top">';
      h += '<span class="edu-degree">' + row[0] + '</span>';
      if (row[2]) h += '<span class="edu-year">' + row[2] + '</span>';
      h += '</div>';
      var detail = [];
      if (row[1]) detail.push(row[1]);
      if (row[3]) detail.push(row[3]);
      if (detail.length) h += '<div class="edu-detail">' + detail.join(' · ') + '</div>';
      h += '</div>';
    });
    return h + '</div>';
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
    if (meta.email) sb += '<div class="sb-item"><a href="mailto:' + meta.email + '">' + meta.email + '</a></div>';
    if (meta.phone) sb += '<div class="sb-item"><a href="tel:' + meta.phone.replace(/\s/g, '') + '">' + meta.phone + '</a></div>';
    if (meta.location) sb += '<div class="sb-item">' + meta.location + '</div>';
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

  /* ── Page Break Overlay ──────────────────── */

  function measureA4() {
    // Match @page margin: 5mm — printable height = 297mm - 5mm top - 5mm bottom = 287mm
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:287mm;';
    document.body.appendChild(probe);
    var h = probe.offsetHeight;
    document.body.removeChild(probe);
    return h;
  }

  function updatePageBreaks() {
    var wrapper = document.getElementById('wrapper');
    var frame = wrapper && wrapper.querySelector('.page-frame');
    var page = frame && frame.querySelector('.page');
    if (!wrapper || !frame || !page) return;

    // Remove old overlays and badges
    var old = wrapper.querySelectorAll('.page-break-line, .page-count-badge');
    for (var i = 0; i < old.length; i++) old[i].remove();

    var a4h = measureA4();
    var contentHeight = page.scrollHeight;
    var numPages = Math.max(1, Math.ceil(contentHeight / a4h));

    // Insert badge before the frame
    var badge = document.createElement('div');
    badge.className = 'page-count-badge' + (numPages > 1 ? ' warn' : '');
    badge.textContent = numPages > 1
      ? '\u26A0 Content spans ' + numPages + ' pages \u2014 trim to fit 1 page'
      : '\u2713 Fits on 1 page';
    frame.parentNode.insertBefore(badge, frame);

    // Insert page break lines inside the frame
    for (var p = 1; p < numPages; p++) {
      var line = document.createElement('div');
      line.className = 'page-break-line';
      line.style.top = (p * a4h - 12) + 'px';
      line.innerHTML = '<span class="page-break-label">Page ' + p + ' ends \u00B7 Page ' + (p + 1) + ' starts</span>';
      frame.appendChild(line);
    }
  }

  /* ── Render Dispatch ───────────────────── */

  var renderers = {
    classic: renderClassic,
    sidebar: renderSidebar,
    bold: renderBold,
    minimal: renderMinimal
  };

  function renderToDOM() {
    var wrapper = document.getElementById('wrapper');
    if (!wrapper) return;

    wrapper.className = 't-' + currentTemplate;

    var fn = renderers[currentTemplate] || renderClassic;
    wrapper.innerHTML =
      '<div class="page-frame">' +
      '<div class="page">' +
      fn(parsedMeta, parsedSections) +
      '</div></div>';

    setTimeout(updatePageBreaks, 50);
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
            '<div class="page-frame"><div class="page"><div class="status">' +
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
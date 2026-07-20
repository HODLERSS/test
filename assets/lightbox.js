(function () {
  var lb, img, cap, count, prev, next, items = [], idx = 0;
  function ensure() {
    if (lb) return;
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.innerHTML =
      '<span class="lb-count"></span>' +
      '<button class="lb-x" aria-label="Close">\u00d7</button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous photo">\u2039</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-next" aria-label="Next photo">\u203a</button>' +
      '<div class="lb-strip" role="listbox" aria-label="Photos on this page"></div>';
    document.body.appendChild(lb);
    img = lb.querySelector('img');
    cap = lb.querySelector('figcaption');
    count = lb.querySelector('.lb-count');
    prev = lb.querySelector('.lb-prev');
    next = lb.querySelector('.lb-next');
    prev.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    next.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    img.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    lb.querySelector('.lb-x').addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }
  function thumbSrc(href) {
    return href.split('?')[0].replace('assets/images/', 'assets/images/thumbs/').replace('.gif', '.jpg');
  }
  function buildStrip() {
    var strip = lb.querySelector('.lb-strip');
    strip.innerHTML = '';
    items.forEach(function (a, i) {
      var im = document.createElement('img');
      im.src = thumbSrc(a.getAttribute('href'));
      im.alt = '';
      im.addEventListener('click', function (e) { e.stopPropagation(); show(i); });
      strip.appendChild(im);
    });
    strip.style.display = items.length > 1 ? '' : 'none';
  }
  function show(i) {
    idx = (i + items.length) % items.length;
    var a = items[idx];
    img.src = a.getAttribute('href');
    cap.textContent = a.getAttribute('data-cap') || '';
    count.textContent = items.length > 1 ? (idx + 1) + ' / ' + items.length : '';
    var solo = items.length < 2;
    prev.style.display = next.style.display = solo ? 'none' : '';
    var kids = lb.querySelectorAll('.lb-strip img');
    kids.forEach(function (k, j) { k.classList.toggle('sel', j === idx); });
    if (kids[idx] && kids[idx].scrollIntoView) kids[idx].scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function step(d) { show(idx + d); }
  function close() {
    lb.classList.remove('open');
    img.removeAttribute('src');
    document.body.style.overflow = '';
  }
  function collect() {
    var list = [];
    var nodes = document.querySelectorAll('a.lightbox, .thumbs a');
    Array.prototype.forEach.call(nodes, function (n) {
      var href = n.getAttribute('href') || '';
      if (href.indexOf('.html') !== -1) return;
      var photo = n.closest('.photo');
      if (n.classList.contains('lightbox') && photo && photo.classList.contains('stage')) return;
      list.push(n);
    });
    return list;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.lightbox');
    if (!a) return;
    e.preventDefault();
    ensure();
    items = collect();
    var href = a.getAttribute('href');
    var start = 0;
    items.some(function (it, i) {
      if (it.getAttribute('href') === href) { start = i; return true; }
      return false;
    });
    buildStrip();
    show(start);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
})();

/* pagenav-spy: highlight the section being read */
(function () {
  var nav = document.querySelector('.pagenav');
  if (!nav || !('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var targets = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if (!targets.length) return;
  function setActive(id) {
    links.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }
  var vis = {};
  var lock = null;
  setActive(targets[0].id);
  function atBottom() {
    return window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 4;
  }
  function refresh() {
    if (lock) return;
    if (atBottom()) { setActive(targets[targets.length - 1].id); return; }
    var top = null;
    targets.some(function (t) { if (vis[t.id]) { top = t.id; return true; } return false; });
    if (top) setActive(top);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { vis[e.target.id] = e.isIntersecting; });
    refresh();
  }, { rootMargin: '-20% 0px -60% 0px' });
  targets.forEach(function (t) { io.observe(t); });
  window.addEventListener('scroll', function () { window.requestAnimationFrame(refresh); }, { passive: true });
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    lock = a.getAttribute('href').slice(1);
    setActive(lock);
  });
  ['wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      if (lock) { lock = null; refresh(); }
    }, { passive: true });
  });
  window.addEventListener('keydown', function (e) {
    if (!lock) return;
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].indexOf(e.key) !== -1) {
      lock = null; refresh();
    }
  });
})();

/* gallery-swap: fixed thumb strip, clicked thumb displays in a stable main stage */
(function () {
  document.querySelectorAll('.entry .body').forEach(function (body) {
    var photoLink = body.querySelector('.photo a.lightbox');
    var thumbs = body.querySelector('.thumbs');
    if (!photoLink || !thumbs) return;
    var stage = photoLink.closest('.photo');
    stage.classList.add('stage');
    var mainImg = photoLink.querySelector('img');
    function lockRatio() {
      if (mainImg.naturalWidth) {
        stage.style.aspectRatio = mainImg.naturalWidth + ' / ' + mainImg.naturalHeight;
      }
    }
    if (mainImg.complete) lockRatio();
    else mainImg.addEventListener('load', lockRatio, { once: true });

    // original main joins the strip as the first, selected thumb
    var first = document.createElement('a');
    first.setAttribute('href', photoLink.getAttribute('href'));
    first.setAttribute('data-cap', photoLink.getAttribute('data-cap') || '');
    var fi = document.createElement('img');
    fi.src = photoLink.getAttribute('href').split('?')[0].replace('assets/images/', 'assets/images/thumbs/').replace('.gif', '.jpg');
    fi.alt = mainImg.alt; fi.loading = 'lazy'; fi.decoding = 'async';
    first.appendChild(fi);
    thumbs.insertBefore(first, thumbs.firstChild);

    var items = Array.prototype.slice.call(thumbs.querySelectorAll('a'));
    if (items.length === 6) thumbs.classList.add('c6');

    function select(a) {
      items.forEach(function (x) { x.classList.toggle('sel', x === a); });
      mainImg.src = a.getAttribute('href');
      mainImg.alt = a.querySelector('img').alt;
      photoLink.setAttribute('href', a.getAttribute('href'));
      photoLink.setAttribute('data-cap', a.getAttribute('data-cap') || '');
      thumbs.scrollTo({
        left: a.offsetLeft - (thumbs.clientWidth - a.offsetWidth) / 2,
        behavior: 'smooth'
      });
    }
    items.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('.html') !== -1) return;
      a.classList.remove('lightbox');
      a.addEventListener('click', function (e) { e.preventDefault(); select(a); });
    });
    first.classList.add('sel');
  });
})();

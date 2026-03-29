const menu = document.querySelector('.about-menu');
const menuItems = Array.from(document.querySelectorAll('.menu-item'));
const panels = Array.from(document.querySelectorAll('.about-panel'));

function activatePanel(panelName, { updateHash = true } = {}) {
  const hasPanel = panels.some((panel) => panel.dataset.panel === panelName);
  if (!hasPanel) return;

  menuItems.forEach((item, index) => {
    const active = item.dataset.panel === panelName;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
     item.setAttribute('tabindex', active ? '0' : '-1');
    item.id = item.id || `tab-${item.dataset.panel || index}`;
  });

  panels.forEach((panel, index) => {
      const active = panel.dataset.panel === panelName;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('tabindex', '0');
    panel.id = panel.id || `panel-${panel.dataset.panel || index}`;

    const controller = menuItems.find((item) => item.dataset.panel === panel.dataset.panel);
    if (controller) {
      panel.setAttribute('aria-labelledby', controller.id);
      controller.setAttribute('aria-controls', panel.id);
    }
  });
  if (updateHash) {
    window.history.replaceState(null, '', `#${panelName}`);
  }
}

function getInitialPanel() {
  const hashPanel = window.location.hash.replace('#', '').trim();
  if (hashPanel && panels.some((panel) => panel.dataset.panel === hashPanel)) {
    return hashPanel;
  }

  const activeItem = menuItems.find((item) => item.classList.contains('is-active'));
  return activeItem?.dataset.panel || panels[0]?.dataset.panel;
}

if (menu && menuItems.length && panels.length) {
  menu.setAttribute('role', 'tablist');

  menuItems.forEach((item, index) => {
    item.setAttribute('role', 'tab');
    item.setAttribute('aria-selected', 'false');
    item.setAttribute('tabindex', '-1');
    item.id = item.id || `tab-${item.dataset.panel || index}`;

    item.addEventListener('click', (event) => {
      event.preventDefault();
      activatePanel(item.dataset.panel);
      item.focus();
    });

    item.addEventListener('keydown', (event) => {
      const currentIndex = menuItems.indexOf(item);
      if (currentIndex === -1) return;

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (currentIndex + direction + menuItems.length) % menuItems.length;
        const nextItem = menuItems[nextIndex];
        activatePanel(nextItem.dataset.panel);
        nextItem.focus();
      }
    });
  });

  activatePanel(getInitialPanel(), { updateHash: false });

  window.addEventListener('hashchange', () => {
    const hashPanel = window.location.hash.replace('#', '').trim();
    activatePanel(hashPanel, { updateHash: false });
  });
}

function buildReaderReturnUrl() {
  let target = './index.html';
  try {
    const rawState = sessionStorage.getItem('lectorState');
    const state = rawState ? JSON.parse(rawState) : null;
    const refSearch = String(state?.lastReferenceSearch || localStorage.getItem('lectorLastReferenceSearch') || '').trim();
    const book = String(state?.currentBookSlug || '').trim();
    const name = String(state?.currentBookName || '').trim();

    if (refSearch) {
      const p = new URLSearchParams();
      if (book) p.set('book', book);
      if (name) p.set('name', name);
      p.set('search', refSearch);
      p.set('version', 'RVR1960');
      p.set('orig', '1');
      target = `./index.html?${p.toString()}`;
    }
  } catch (_) {}
  return target;
}

const backToReaderLink = document.querySelector('a.btn-back[href="./index.html"]');
if (backToReaderLink) {
  backToReaderLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = buildReaderReturnUrl();
  });
}
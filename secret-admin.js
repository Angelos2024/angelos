(function(){
  const ACCESS_KEY = 'angelos.admin.interlinear.access';
  const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
  const ADMIN_PASSWORD_HASH = '9ece8d19ac8b4bb531ad35e6e6ef440e9e4815868d0f8912585b97f0e6dc2d8c';
  const CLICK_TARGET = 7;
  const CLICK_RESET_MS = 2500;

  const trigger = document.getElementById('secretAdminTrigger');
  if(!trigger) return;

  let clickCount = 0;
  let clickTimer = 0;
  let overlay = null;
  let input = null;
  let status = null;

  function ensureOverlay(){
    if(overlay) return overlay;
    const markup = document.createElement('div');
    markup.className = 'secret-admin-overlay';
    markup.innerHTML = `
      <div class="secret-admin-card" role="dialog" aria-modal="true" aria-labelledby="secretAdminTitle">
        <div class="secret-admin-head">
          <div class="secret-admin-kicker">Admin</div>
          <h2 id="secretAdminTitle" class="secret-admin-title">Acceso editor interlineal</h2>
          <p class="secret-admin-copy">Ingresa la contraseña del panel privado para abrir el espacio de edición.</p>
        </div>
        <div class="secret-admin-body">
          <label class="secret-admin-label" for="secretAdminPassword">Contraseña</label>
          <input id="secretAdminPassword" class="secret-admin-input" type="password" autocomplete="current-password"/>
          <div id="secretAdminStatus" class="secret-admin-status" aria-live="polite"></div>
          <div class="secret-admin-actions">
            <button type="button" class="secret-admin-btn secret-admin-btn-secondary" data-secret-admin-close>Cerrar</button>
            <button type="button" class="secret-admin-btn secret-admin-btn-primary" data-secret-admin-submit>Entrar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(markup);
    overlay = markup;
    input = overlay.querySelector('#secretAdminPassword');
    status = overlay.querySelector('#secretAdminStatus');

    overlay.addEventListener('click', (event) => {
      if(event.target === overlay || event.target.hasAttribute('data-secret-admin-close')){
        hideOverlay();
      }
    });

    overlay.querySelector('[data-secret-admin-submit]')?.addEventListener('click', submitPassword);
    input?.addEventListener('keydown', (event) => {
      if(event.key === 'Enter'){
        event.preventDefault();
        submitPassword();
      }
      if(event.key === 'Escape'){
        event.preventDefault();
        hideOverlay();
      }
    });

    return overlay;
  }

  async function sha256(text){
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function grantAccess(){
    sessionStorage.setItem(ACCESS_KEY, String(Date.now()));
    window.location.href = './admin-interlinear.html';
  }

  function setStatus(message, ok){
    if(!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-ok', Boolean(ok));
  }

  function showOverlay(){
    ensureOverlay();
    overlay.classList.add('is-visible');
    setStatus('', false);
    if(input){
      input.value = '';
      window.setTimeout(() => input.focus(), 30);
    }
  }

  function hideOverlay(){
    if(!overlay) return;
    overlay.classList.remove('is-visible');
    clickCount = 0;
    setStatus('', false);
  }

  async function submitPassword(){
    if(!input) return;
    const candidate = input.value.trim();
    if(!candidate){
      setStatus('Escribe la contraseña.', false);
      input.focus();
      return;
    }

    setStatus('Verificando acceso…', true);
    const candidateHash = await sha256(candidate);
    if(candidateHash !== ADMIN_PASSWORD_HASH){
      setStatus('Contraseña incorrecta.', false);
      input.select();
      return;
    }

    setStatus('Acceso concedido.', true);
    grantAccess();
  }

  function resetClickSequence(){
    clickCount = 0;
    if(clickTimer){
      window.clearTimeout(clickTimer);
      clickTimer = 0;
    }
  }

  function registerSecretClick(){
    clickCount += 1;
    if(clickTimer) window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(resetClickSequence, CLICK_RESET_MS);
    if(clickCount >= CLICK_TARGET){
      resetClickSequence();
      showOverlay();
    }
  }

  function hasFreshAccess(){
    const raw = Number(sessionStorage.getItem(ACCESS_KEY) || 0);
    return raw > 0 && (Date.now() - raw) < ACCESS_TTL_MS;
  }

  trigger.addEventListener('click', registerSecretClick);
  trigger.addEventListener('keydown', (event) => {
    if(event.key === 'Enter' || event.key === ' '){
      event.preventDefault();
      registerSecretClick();
    }
  });

  if(hasFreshAccess()){
    sessionStorage.setItem(ACCESS_KEY, String(Date.now()));
  }
})();

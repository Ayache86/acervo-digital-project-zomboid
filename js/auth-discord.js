// Autenticação independente. Mantém a compatibilidade com marcações locais antigas.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js';
import {getSupabase} from './cloud-client.js';

const root = document.getElementById('discordAuth');
const button = document.getElementById('discordAuthButton');
const avatar = document.getElementById('discordAuthAvatar');
const name = document.getElementById('discordAuthName');
const message = document.getElementById('discordAuthMessage');
if (!root || !button || !avatar || !name || !message) throw new Error('Elementos do login Discord nao encontrados.');

const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL) && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(SUPABASE_PUBLISHABLE_KEY);
const url = new URL(window.location.href);
const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');
if (oauthError) {
  message.textContent = 'Falha ao autenticar: ' + oauthError;
  for (const key of ['error','error_description','error_code']) url.searchParams.delete(key);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

function render(user) {
  message.hidden = Boolean(user);
  if (!user) {
    name.textContent = '';
    avatar.hidden = true;
    avatar.removeAttribute('src');
    root.classList.remove('discord-auth-signed-in');
    button.textContent = 'Entrar com Discord';
    button.setAttribute('aria-label', 'Entrar com Discord');
    return;
  }
  const meta = user.user_metadata || {};
  const displayName = meta.custom_claims?.global_name || meta.full_name || meta.name || meta.preferred_username || user.email || 'Jogador';
  name.textContent = String(displayName);
  // Avatar somente de servidor HTTPS do Discord ou URL padrao fornecida pelo provedor.
  const avatarUrl = meta.avatar_url || meta.picture || '';
  try {
    const parsed = new URL(avatarUrl);
    if (parsed.protocol === 'https:' && ['cdn.discordapp.com','media.discordapp.net'].includes(parsed.hostname)) {
      avatar.src = parsed.href;
      avatar.hidden = false;
    } else {
      avatar.hidden = true;
      avatar.removeAttribute('src');
    }
  } catch {
    avatar.hidden = true;
    avatar.removeAttribute('src');
  }
  root.classList.add('discord-auth-signed-in');
  button.textContent = 'Sair';
  button.setAttribute('aria-label', 'Sair da conta Discord');
}

if (!configured) {
  button.disabled = true;
  message.textContent = 'Login ainda nao configurado: informe sua sb_publishable_ em js/auth-config.js.';
} else {
  button.disabled = true;
  button.textContent = 'Carregando login…';
  try {
    // Dependencia ESM oficial distribuida via jsDelivr. Requer internet.
    const supabase = await getSupabase();
    let currentUser = null;
    const notify = () => queueMicrotask(() => window.dispatchEvent(new CustomEvent('acervo:auth', {detail:{userId:currentUser?.id || null}})));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      render(currentUser);
      notify();
    });
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') console.warn('Falha ao consultar usuario:', error.message);
    currentUser = data?.user || null;
    render(currentUser);
    notify();
    button.disabled = false;
      if (!oauthError && !currentUser) {
        message.textContent = 'Entre com Discord para salvar sua coleção na nuvem e sincronizar suas marcações entre dispositivos.';
      }
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        if (currentUser) {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) throw signOutError;
          currentUser = null;
          render(null);
          notify();
          message.textContent = 'Sessao encerrada. Seus itens locais foram preservados.';
        } else {
          // Ao retornar, a biblioteca Supabase detecta automaticamente a sessao OAuth.
          const redirectTo = new URL('./', window.location.href).href;
          const { error: signInError } = await supabase.auth.signInWithOAuth({
            provider: 'discord', options: { redirectTo }
          });
          if (signInError) throw signInError;
          message.textContent = 'Redirecionando ao Discord…';
        }
      } catch (err) {
        message.textContent = 'Erro no login: ' + (err.message || String(err));
      } finally {
        button.disabled = false;
      }
    });
    window.addEventListener('pagehide', () => subscription?.subscription?.unsubscribe(), { once:true });
  } catch (err) {
    render(null);
    button.disabled = true;
    message.textContent = 'Nao foi possivel carregar o login (verifique a conexao): ' + (err.message || err);
  }
}

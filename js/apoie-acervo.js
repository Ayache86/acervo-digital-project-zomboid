/* Acervo Digital: copiar chave Pix e Pix Copia e Cola; sem rastreamento ou envio de dados. */
(() => {
  'use strict';
  const feedback = document.getElementById('apoie-feedback');
  async function copiar(texto, ok, fallbackEl) {
    if (!feedback || !texto) return;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard indisponivel');
      await navigator.clipboard.writeText(texto);
      feedback.textContent = ok;
    } catch (_erro) {
      feedback.textContent = 'Selecione e copie manualmente o texto indicado, depois cole no aplicativo bancário.';
      if (fallbackEl && typeof fallbackEl.select === 'function') fallbackEl.select();
      else if (fallbackEl) {
        const sel=window.getSelection();
        if (sel){const range=document.createRange();range.selectNodeContents(fallbackEl);sel.removeAllRanges();sel.addRange(range);}
      }
    }
  }
  const btnChave = document.getElementById('apoie-copiar');
  const chave = document.getElementById('apoie-chave');
  if (btnChave && chave) btnChave.addEventListener('click', () => copiar(chave.textContent.trim(), 'Chave Pix aleatória copiada. Selecione Pix por chave no banco.', chave));
  const btnCodigo = document.getElementById('apoie-copiar-codigo');
  const codigo = document.getElementById('apoie-pix-codigo');
  if (btnCodigo && codigo) btnCodigo.addEventListener('click', () => copiar(codigo.value.trim(), 'Código Pix Copia e Cola copiado. No banco, escolha Pix Copia e Cola.', codigo));
})();

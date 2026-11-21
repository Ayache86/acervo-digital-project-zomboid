// Compartilha uma unica instancia Supabase entre login e colecao.
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './auth-config.js';
let promise;
export function getSupabase(){
  if(!promise){
    if(!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(SUPABASE_PUBLISHABLE_KEY))
      return Promise.reject(new Error('Configure a chave publica do Supabase em js/auth-config.js'));
    promise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}))
      .catch(e=>{promise=undefined;throw e});
  }
  return promise;
}

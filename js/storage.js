// Armazenamento do Acervo Digital. Sem migração de identificadores antigos.
function normalizeCustomItems(items){return items.filter(x=>x&&typeof x==='object').map(x=>({...x}));}
const KEY='acervo-digital-v4';
function normalize(value){return {
 owned:value?.owned&&typeof value.owned==='object'&&!Array.isArray(value.owned)?value.owned:{},
 custom:normalizeCustomItems(Array.isArray(value?.custom)?value.custom:[])
}}
export function loadState(){
 try{
  const existing=localStorage.getItem(KEY);
  if(existing!==null)return normalize(JSON.parse(existing));
 }catch(err){console.warn('Falha ao ler coleção local:',err)}
 return {owned:{},custom:[]};
}
export function saveState(state){localStorage.setItem(KEY,JSON.stringify(normalize(state)))}
export function importBackup(data){
 if(!data||typeof data!=='object'||!data.owned||typeof data.owned!=='object'||Array.isArray(data.owned)||!Array.isArray(data.custom))throw Error('Backup inválido: esperados owned e custom.');
 return {owned:data.owned,custom:normalizeCustomItems(data.custom).filter(x=>x&&typeof x.id==='string'&&typeof x.nome==='string'&&['livros','revistas','vhs'].includes(x.tipo))};
}

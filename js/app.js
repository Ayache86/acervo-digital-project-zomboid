import {fetchCatalog} from './catalogo.js';
import {loadState,saveState} from './storage.js';
import {renderBooks,renderItems} from './interface.js';
import {exportState,readBackup} from './import-export.js';
import {loadCollection,saveMark,addCustom,removeCustom,mergeLocal} from './cloud-collection.js';
import {getSupabase} from './cloud-client.js';
const $=id=>document.getElementById(id);
let catalog={livros:[],revistas:[],vhs:[]};
let localState=loadState(), cloudState={owned:{},custom:[]},state=localState;
let active='livros',ready=false,mode='local',userId=null,sequence=0,busy=false;
function itemsFor(tab){return [...catalog[tab],...state.custom.filter(x=>x.tipo===tab)]}
function setStatus(message){$('saveStatus').textContent=message}
function localPersist(){saveState(localState);setStatus('✓ Alterações salvas neste navegador')}
function status(message){$('cloudSyncStatus').textContent=message}
function controls(){
 const banner=$('cloudSyncBanner');banner.hidden=mode==='local';
 $('cloudImportLocal').hidden=mode==='local'||mode==='loading';
 $('cloudNewCollection').hidden=mode!=='deciding';
 $('cloudRefresh').hidden=mode==='local'||mode==='loading'||mode==='deciding';
 $('cloudImportLocal').disabled=busy;
 $('cloudNewCollection').disabled=busy;
 $('cloudRefresh').disabled=busy;
 $('addForm').querySelector('button[type="submit"]').disabled=busy||mode==='loading'||mode==='deciding'||mode==='error';
}
function chooseState(){
 state=mode==='cloud'?cloudState:localState;
 controls();render();
}
// A classificação usa campos reais do catálogo; não deduz "mod" a partir de nomes provisórios.
// Registros personalizados ou de origem não confirmada são exibidos como "a classificar".
function originOf(item, tab){
 if(item.personalizado)return 'pending';
 if(tab==='livros'){
  if(item.origem_catalogo==='mod')return 'mods';
  if(typeof item.id==='string' && item.id.startsWith('Base.'))return 'vanilla';
  return 'pending';
 }
 if(tab==='revistas'){
  if(typeof item.id_jogo==='string' && item.id_jogo.startsWith('Base.'))return 'vanilla';
  if(typeof item.id==='string' && item.id.startsWith('mod-'))return 'mods';
  return 'pending';
 }
 if(tab==='vhs'){
  if(item.origem_catalogo==='vanilla')return 'vanilla';
  if(item.origem_catalogo==='mod')return 'mods';
  return 'pending';
 }
 return 'pending';
}
function newCounts(){return {total:0,have:0,vanilla:{total:0,have:0},mods:{total:0,have:0},pending:0}}
function percent(have,total){return total?Math.round(100*have/total):0}
function countCategory(tab){
 const counts=newCounts();
 const unique=new Map(itemsFor(tab).map(item=>[item.id,item]));
 for(const item of unique.values()){
  const owned=!!state.owned[item.id],origin=originOf(item,tab);
  counts.total++;if(owned)counts.have++;
  if(origin==='pending'){counts.pending++;continue}
  counts[origin].total++;if(owned)counts[origin].have++;
 }
 return counts;
}
function fillProgress(prefix,counts){
 const pct=percent(counts.have,counts.total);
 $(prefix+'Percent').textContent=pct+'%';
 $(prefix+'Fraction').textContent=counts.have+' de '+counts.total+' itens encontrados';
 const bar=$(prefix+'Bar');bar.style.width=pct+'%';
 bar.parentElement?.setAttribute('aria-valuenow',String(pct));
 for(const type of ['Vanilla','Mods']){
  const c=counts[type.toLowerCase()],p=percent(c.have,c.total);
  $(prefix+type+'Text').textContent=c.total?`${p}% · ${c.have}/${c.total}`:'— · 0/0';
  const subBar=$(prefix+type+'Bar');subBar.style.width=p+'%';
  subBar.parentElement?.setAttribute('aria-valuenow',String(p));
  subBar.parentElement?.setAttribute('aria-label',`${type}: ${c.have} de ${c.total} encontrados`);
 }
 const pending=$(prefix+'Pending');
 pending.hidden=!counts.pending;
 pending.textContent=counts.pending+' item(ns) ainda sem classificação de origem';
}
function updateMetricsV44(){
 const keys={livros:'books',revistas:'magazines',vhs:'vhs'};
 const overall=newCounts();
 for(const [tab,prefix] of Object.entries(keys)){
  const counts=countCategory(tab);
  fillProgress(prefix,counts);
  overall.total+=counts.total;overall.have+=counts.have;overall.pending+=counts.pending;
  for(const origin of ['vanilla','mods']){
   overall[origin].total+=counts[origin].total;
   overall[origin].have+=counts[origin].have;
  }
 }
 fillProgress('overall',overall);
}

async function action(task){
 if(busy)return;busy=true;controls();
 try{await task()}catch(e){status('⚠ '+(e.message||String(e)));setStatus('⚠ A alteração não foi confirmada na nuvem')}finally{busy=false;controls()}
}
function writable(){if(['deciding','loading','error'].includes(mode)){status('Escolha como iniciar sua coleção ou resolva o erro antes de marcar itens.');return false}return !busy}
async function toggle(id){
 if(!writable())return;
 if(mode==='local'){localState.owned[id]=!localState.owned[id];localPersist();render();return}
 const who=userId,next=!cloudState.owned[id];
 await action(async()=>{await saveMark(who,id,next);if(userId!==who)return;if(next)cloudState.owned[id]=true;else delete cloudState.owned[id];status('✓ Marcação salva na conta Discord');setStatus('✓ Salvo na nuvem');render()});
}
async function remove(id){
 if(!writable()||!confirm('Excluir este item personalizado?'))return;
 if(mode==='local'){localState.custom=localState.custom.filter(x=>x.id!==id);delete localState.owned[id];localPersist();render();return}
 const who=userId;
 await action(async()=>{await removeCustom(who,id);if(userId!==who)return;cloudState.custom=cloudState.custom.filter(x=>x.id!==id);delete cloudState.owned[id];status('✓ Item removido da coleção online');render()});
}
function render(){
 if(!ready)return;
 const term=$('search').value.trim(),filter=$('filter').value,node=$('content');
 if(active==='livros'){
  renderBooks(node,catalog.livros,state,term,filter,toggle);
  const extras=state.custom.filter(x=>x.tipo==='livros');
  if(extras.length){const section=document.createElement('section'),h=document.createElement('h2');h.textContent='Livros personalizados';h.style.padding='16px';section.append(h);const holder=document.createElement('div');renderItems(holder,extras,state,term,filter,toggle,remove);section.append(holder);node.append(section)}
 }else renderItems(node,itemsFor(active),state,term,filter,toggle,remove);
 updateMetricsV44();
}
function setTab(tab){active=tab;for(const [name,id] of Object.entries({livros:'tabBooks',revistas:'tabMagazines',vhs:'tabVhs'})){const b=$(id);b.classList.toggle('active',name===tab);b.setAttribute('aria-selected',String(name===tab))}$('filter').value='all';$('search').value='';render()}
async function addItem(ev){
 ev.preventDefault();if(!writable())return;
 const data=new FormData(ev.currentTarget),tipo=String(data.get('tipo')),nome=String(data.get('nome')||'').trim();if(!nome)return;
 const item={id:'custom-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),tipo,nome,nome_catalogo:nome,nome_en:String(data.get('en')||'').trim()||null,nome_ptbr_vanilla:String(data.get('pt')||'').trim()||null,personalizado:true};
 if(mode==='local'){localState.custom.push(item);localPersist();ev.currentTarget.reset();setTab(tipo);return}
 const who=userId;
 await action(async()=>{await addCustom(who,item);if(userId!==who)return;cloudState.custom.push(item);ev.currentTarget.reset();status('✓ Item personalizado salvo na nuvem');setTab(tipo)});
}
async function authChanged(nextUser){
 if(nextUser && userId===nextUser && (mode==='cloud'||mode==='deciding'))return;
 const ticket=++sequence;userId=nextUser;
 if(!nextUser){mode='local';state=localState;status('Modo local: nenhuma informação enviada à nuvem');chooseState();setStatus('✓ Catálogo carregado — modo local');return}
 mode='loading';status('Carregando coleção individual…');controls();
 try{
  const loaded=await loadCollection(nextUser);
  if(ticket!==sequence)return;
  cloudState=loaded;
  const count=Object.values(localState.owned).filter(Boolean).length+localState.custom.length;
  const remoteCount=Object.keys(loaded.owned).length+loaded.custom.length;
  mode=count>0&&remoteCount===0?'deciding':'cloud';
  if(mode==='deciding')status(`Você tem ${count} registros locais e a conta está vazia. Escolha importar ou começar uma coleção nova.`);
  else status('✓ Coleção individual carregada. As alterações serão salvas na nuvem.');
  chooseState();setStatus('✓ Conta Discord conectada');
 }catch(e){if(ticket!==sequence)return;mode='error';state=localState;status('⚠ Não foi possível abrir a coleção online: '+e.message+' — não altere marcações até resolver.');chooseState()}
}
async function importLocal(){if(mode==='local'||busy||!userId)return;
 const count=Object.values(localState.owned).filter(Boolean).length;
 if(!confirm(`Importar suas ${count} marcações locais e ${localState.custom.length} itens personalizados para esta conta Discord? Os dados online existentes serão preservados; as marcações locais não serão apagadas.`))return;
 const who=userId;
 await action(async()=>{const report=await mergeLocal(who,localState,cloudState);if(who!==userId)return;cloudState=await loadCollection(who);mode='cloud';status(`✓ Importação concluída: ${report.marks} marcações e ${report.custom} itens personalizados enviados.`);chooseState()});
}
async function refreshCloud(){if(mode!=='cloud'||busy||!userId)return;const who=userId;await action(async()=>{const fresh=await loadCollection(who);if(userId!==who)return;cloudState=fresh;status('✓ Dados atualizados a partir da nuvem');chooseState()})}
async function init(){
 for(const [id,tab] of [['tabBooks','livros'],['tabMagazines','revistas'],['tabVhs','vhs']])$(id).addEventListener('click',()=>setTab(tab));
 $('search').addEventListener('input',render);$('filter').addEventListener('change',render);
 $('addForm').addEventListener('submit',addItem);
 $('exportBtn').addEventListener('click',()=>exportState(state));
 $('importBtn').addEventListener('click',()=>$('fileInput').click());
 $('fileInput').addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;try{const imported=await readBackup(file);if(mode!=='local'){alert('Para proteger a coleção online, importe seu backup primeiro no modo local (após sair do Discord), depois use "Importar coleção local".');return}if(!confirm('Substituir suas marcações e itens locais pelos dados do backup?'))return;localState=imported;state=localState;localPersist();render()}catch(e){alert('Não foi possível importar: '+e.message)}finally{ev.target.value=''}});
 $('cloudImportLocal').addEventListener('click',importLocal);
 $('cloudNewCollection').addEventListener('click',()=>{if(mode!=='deciding')return;mode='cloud';status('✓ Coleção online iniciada vazia. As marcações locais continuam preservadas.');chooseState()});
 $('cloudRefresh').addEventListener('click',refreshCloud);
 window.addEventListener('acervo:auth',ev=>{void authChanged(ev.detail?.userId||null)});
 getSupabase().then(client=>client.auth.getUser()).then(({data})=>{if(data?.user?.id&&!userId)void authChanged(data.user.id)}).catch(()=>{});
 controls();
 try{catalog=await fetchCatalog();ready=true;setStatus('✓ Catálogo carregado');render()}catch(e){setStatus('⚠ Falha ao carregar catálogo');const area=$('errorArea');area.hidden=false;area.textContent='Não foi possível carregar os arquivos JSON. Detalhes: '+e.message;updateMetricsV44()}
}
init();

import {groupBooks,skillKey} from './catalogo.js';
import {matches} from './filtros.js';
export function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node}
export function markButton(item,owned,onToggle){const b=el('button','mark',owned?'✓':'+');b.type='button';b.setAttribute('aria-pressed',String(!!owned));b.title=(owned?'Remover marcação: ':'Marcar encontrado: ')+(item.nome_en||item.nome||item.id);b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>onToggle(item.id));return b}
function sub(parent,text){if(text)parent.append(el('span','skill-sub',text))}
// Origem e nome do mod: sempre derivados dos metadados do catálogo, nunca de HTML injetado.
const modDisplayNames=Object.freeze({LifestyleHobbies:'Lifestyle: Hobbies',Lifestyle:'Lifestyle: Hobbies',damnlib:'DamnLib'});
// Colecao KI5 verificada na Oficina Steam; apenas itens de revistas de veiculos.
// Os IDs tecnicos dos mods permanecem intactos para preservar marcacoes e filtros.
const KI5_STEAM_COLLECTION = 'https://steamcommunity.com/sharedfiles/filedetails/?id=2490220997';
const LIFESTYLE_STEAM_PAGE = 'https://steamcommunity.com/sharedfiles/filedetails/?id=3403870858';
function isKi5VehicleMagazine(item){
 return item?.tipo==='revistas' && item?.origem_catalogo==='mod' && item?.categoria_mod==='veiculos';
}
function itemModLabel(item){
 if(item?.origem_catalogo!=='mod')return null;
 if(isKi5VehicleMagazine(item))return "KI5's Vehicles Collection";
 const raw=(item.mod_nome||item.mod||item.origem_mod||'').trim();
 return modDisplayNames[raw]||raw||'Mod não identificado';
}
function modBadge(item){
 const label=itemModLabel(item);
 if(!label)return null;
 const isKi5=isKi5VehicleMagazine(item);
 const isLifestyle=label==='Lifestyle: Hobbies';
 const href=isKi5?KI5_STEAM_COLLECTION:isLifestyle?LIFESTYLE_STEAM_PAGE:null;
 if(href){
   const badge=el('a','mod-origin-badge mod-origin-link','MOD · '+label+' ↗');
   badge.href=href;
   badge.target='_blank';
   badge.rel='noopener noreferrer';
   badge.title='Abrir '+label+' na Oficina Steam';
   badge.setAttribute('aria-label','MOD: '+label+' — abrir a Oficina Steam em nova guia');
   return badge;
 }
 return el('span','mod-origin-badge','MOD · '+label);
}

function iconPath(item){
  if(!item)return null;
  // Arquivos locais dos itens, identificados pelo ID do jogo.
  // O campo icone_local permite usar caminhos específicos confirmados.
  const specified=typeof item.icone_local==='string'?item.icone_local.trim():'';
  if(specified && /^assets\/icons\/(livros|revistas|vhs)\/[a-z0-9_.-]+\.(png|webp|svg)$/i.test(specified))return specified;
  if(item.tipo==='livro_habilidade' && /^[a-z0-9_.-]+$/i.test(item.id||''))return `assets/icons/livros/${item.id}.png`;
  return null;
}
function itemIcon(item, showPlaceholder=true, loadImage=true){
  const wrap=el('span','item-icon');
  if(!showPlaceholder)wrap.classList.add('skill-icon-pending');
  if(showPlaceholder){const fallback=el('span','item-icon-placeholder','▣');fallback.setAttribute('aria-hidden','true');wrap.append(fallback);}
  const path=loadImage?iconPath(item):null;
  if(path){const img=el('img','item-icon-img');img.alt='';img.loading=showPlaceholder?'lazy':'eager';img.decoding='async';img.addEventListener('load',()=>wrap.classList.add('icon-loaded'));img.addEventListener('error',()=>{if(!showPlaceholder){wrap.remove();}else{img.remove();wrap.classList.remove('icon-loaded');}});img.src=path;wrap.append(img)}
  return wrap;
}

// V3.4: texturas originais identificadas nos scripts do Project Zomboid.
// Utilizadas apenas junto ao nome da habilidade; volumes nao sao alterados.
// Texturas confirmadas pelo literature.txt da Build 42 (24 habilidades vanilla).
// O nome exibido continua vindo de data/livros.json.
const skillTextures = Object.freeze({
  Aiming:'Item_Book12.png', Blacksmith:'Item_Book_Generic.png', Blacksmithing:'Item_Book_Generic.png',
  Butchering:'Item_Book_Generic.png', Carpentry:'Item_Book8.png', Carving:'Item_Book_Generic.png',
  Cooking:'Item_Book9.png', Electricity:'Item_Book6.png', Electrical:'Item_Book6.png',
  Farming:'Item_Book3.png', Agriculture:'Item_Book3.png', FirstAid:'Item_Book2.png', 'First Aid':'Item_Book2.png',
  Fishing:'Item_Book5.png', FlintKnapping:'Item_Book_Generic.png', Knapping:'Item_Book_Generic.png',
  Foraging:'Item_Book10.png', Glassmaking:'Item_Book_Generic.png', Husbandry:'Item_Book14.png',
  'Animal Care':'Item_Book14.png', LongBlade:'Item_Book_Generic.png', 'Long Blade':'Item_Book_Generic.png',
  Maintenance:'Item_Book8.png', Masonry:'Item_Book_Generic.png', Mechanics:'Item_Book11.png',
  MetalWelding:'Item_Book7.png', Welding:'Item_Book7.png', Pottery:'Item_Book_Generic.png',
  Reloading:'Item_Book13.png', Tailoring:'Item_Book_Generic.png', Tracking:'Item_Book_Generic.png',
  Trapping:'Item_Book4.png'
});
// Cores RGB das definicoes vanilla. Para Book_Generic a V3.6 aplica uma
// colorizacao aproximada no navegador; a mascara original sera integrada depois.
const skillColors = Object.freeze({
  Blacksmith:[58,69,72], Blacksmithing:[58,69,72], Butchering:[78,0,0],
  Carving:[206,162,253], FlintKnapping:[135,206,250], Knapping:[135,206,250],
  Glassmaking:[38,23,9], LongBlade:[23,9,38], 'Long Blade':[23,9,38],
  Masonry:[171,195,100], Pottery:[203,104,67], Tailoring:[244,194,194], Tracking:[38,23,9]
});
function tintGenericBook(image, color) {
  if(image.dataset.colorized || !image.naturalWidth) return;
  try {
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return;
    ctx.drawImage(image,0,0);
    const bitmap=ctx.getImageData(0,0,canvas.width,canvas.height);
    const d=bitmap.data;
    for(let i=0;i<d.length;i+=4){
      if(d[i+3]===0)continue;
      const r=d[i],g=d[i+1],b=d[i+2];
      // Alterar somente pixels claros de baixa saturacao (capa clara).
      // Preserva bordas escuras e outros detalhes do sprite.
      const light=(r+g+b)/3;
      if(light<78 || Math.max(r,g,b)-Math.min(r,g,b)>105)continue;
      const strength=Math.min(.93,Math.max(0,(light-78)/125));
      d[i]=Math.round(r*(1-strength)+color[0]*strength);
      d[i+1]=Math.round(g*(1-strength)+color[1]*strength);
      d[i+2]=Math.round(b*(1-strength)+color[2]*strength);
    }
    ctx.putImageData(bitmap,0,0);
    image.dataset.colorized='1';
    image.src=canvas.toDataURL('image/png');
  } catch(err){ console.warn('Nao foi possivel colorir o icone:',err); }
}
// Icones provisorios para quatro habilidades de livros com ícones provisórios.
// Reutilizam a textura vanilla genérica com tonalidade aproximada;
// nao representam uma correspondencia oficial de mod.
const customBookColors = Object.freeze({
  Art:[38,40,45],
  'Dança':[170,58,158],
  Limpeza:[79,146,213],
  'Música':[102,50,174]
});
function skillBookIcon(item){
  const skill=item?.habilidade_en;
  const customName=item?.nome_catalogo;
  const hasCustomColor=Object.prototype.hasOwnProperty.call(customBookColors,customName);
  const file=skillTextures[skill] || (hasCustomColor ? 'Item_Book_Generic.png' : null);
  if(!file)return el('span','skill-icon-absent');
  const wrap=itemIcon({...item,icone_local:`assets/icons/livros/${file}`},false);
  const image=wrap.querySelector('img');
  const color=skillColors[skill] || (hasCustomColor ? customBookColors[customName] : null);
  if(file==='Item_Book_Generic.png' && image && color){
    const recolor=()=>tintGenericBook(image,color);
    image.addEventListener('load',recolor);
    if(image.complete && image.naturalWidth)recolor();
  }
  return wrap;
}


// catálogo V4.7 - VHS 2 colunas e links wiki
// Uma pagina especifica so e aberta quando o catalogo traz wiki_url validada.
// Caso contrario, a busca na wiki e identificada como busca (nao pagina confirmada).
function wikiLinkV47(item){
  if(item?.origem_catalogo==='mod'||item?.personalizado)return null;
  let url='', label='Buscar na PZwiki';
  if(typeof item?.wiki_url==='string'&&/^https:\/\/pzwiki\.net\/wiki\/[A-Za-z0-9_()%.,+~:-]+(?:#[A-Za-z0-9_%-]+)?$/i.test(item.wiki_url)){
    url=item.wiki_url;label='Consultar Wiki';
  }else{
    const name=String(item?.nome_en||item?.habilidade_en||item?.nome||'').trim();
    if(!name)return null;
    const type=item?.tipo==='livro_habilidade'?'skill book ':item?.tipo==='vhs'?'VHS ':'magazine ';
    url='https://pzwiki.net/w/index.php?search='+encodeURIComponent(type+name);
  }
  const link=el('a','wiki-link-v47',label+' ↗');
  link.href=url;link.target='_blank';link.rel='noopener noreferrer';
  link.title=label==='Consultar Wiki'?'Abrir pagina verificada na PZwiki':'Pesquisar este item na PZwiki (sem pagina individual confirmada)';
  return link;
}

export function renderBooks(container,books,state,term,filter,onToggle){const matching=books.filter(x=>matches(x,term,filter,state.owned));if(!matching.length){container.replaceChildren(el('div','empty','Nenhum livro corresponde ao filtro.'));return}const wrap=el('div','table-scroller');const table=el('table','books-table');const thead=el('thead');const tr=el('tr');tr.append(el('th','', 'Habilidade / nome no catálogo'));for(let n=1;n<=5;n++)tr.append(el('th','volume-head',`Vol. ${n}`));thead.append(tr);table.append(thead);const tbody=el('tbody');const bySkill=groupBooks(books);for(const [name,items] of bySkill){const visible=matching.filter(x=>skillKey(x)===name);if(!visible.length)continue;const row=el('tr');const cell=el('td');const skillWrap=el('span','skill-heading');skillWrap.append(skillBookIcon(items[0]),el('span','skill-name',name));const bookBadge=modBadge(items[0]);if(bookBadge)skillWrap.append(bookBadge);cell.append(skillWrap);const example=items[0];sub(cell,`EN: ${example.habilidade_en||'Não informado'}`);if(example.origem_catalogo==='mod')sub(cell,'Itens do mod · IDs dos volumes ainda em confirmação');else sub(cell,`Vanilla PT-BR: ${example.nome_ptbr_vanilla||'Tradução pendente'}`);row.append(cell);for(let n=1;n<=5;n++){const c=el('td','volume-cell');const book=visible.find(x=>Number(x.volume)===n);if(book){const b=markButton(book,state.owned[book.id],onToggle);b.classList.add('mark-with-icon');b.prepend(itemIcon(book,true,false));b.title+=` | ${book.nome_en||''} | PT-BR: ${book.nome_ptbr_vanilla||'A confirmar'}`;c.append(b);const wiki=wikiLinkV47(book);if(wiki)c.append(wiki)}row.append(c)}tbody.append(row)}table.append(tbody);wrap.append(table);container.replaceChildren(wrap,el('div','help','Clique em + para marcar um volume encontrado; ✓ indica que ele já está no depósito. Passe o mouse sobre cada volume para ver seu título individual.'))}
// Paginacao apenas para revistas: nao afeta livros e VHS.
let revistaPagina = 1;
let revistaGrupo = 'todos';
const REVISTAS_POR_PAGINA = 12;
export function renderItems(container,items,state,term,filter,onToggle,onDelete){
  if(items.some(x=>x.tipo==='vhs')){renderVhsItemsV45(container,items,state,term,filter,onToggle,onDelete);return;}
  const isMagazines=items.some(x=>x.tipo==='revistas');
  const allMatched=items.filter(x=>matches(x,term,filter,state.owned));
  const filtered=isMagazines ? allMatched.filter(x=>revistaGrupo==='todos'||(revistaGrupo==='mods' ? x.origem_catalogo==='mod' : x.origem_catalogo!=='mod')) : allMatched;
  if(!filtered.length && !isMagazines){container.replaceChildren(el('div','empty','Nenhum item nesta categoria ainda. Use o formulário abaixo para cadastrar.'));return}

  const pages=isMagazines?Math.max(1,Math.ceil(filtered.length/REVISTAS_POR_PAGINA)):1;
  if(isMagazines) revistaPagina=Math.min(Math.max(1,revistaPagina),pages);
  const shown=isMagazines?filtered.slice((revistaPagina-1)*REVISTAS_POR_PAGINA,revistaPagina*REVISTAS_POR_PAGINA):filtered;
  const wrap=el('div','table-scroller');const table=el('table','items-table');const header=el('tr');for(const name of ['Item / traduções','Encontrado','Ações'])header.append(el('th','',name));const head=el('thead');head.append(header);table.append(head);const tbody=el('tbody');
  for(const item of shown){const row=el('tr');const info=el('td');const titleWrap=el('div','item-heading');titleWrap.append(itemIcon(item),el('div','item-title',item.nome_catalogo||item.nome||item.nome_en||item.id));const rowBadge=modBadge(item);if(rowBadge)titleWrap.append(rowBadge);info.append(titleWrap);info.append(el('div','item-sub',`EN: ${item.nome_en||'A confirmar'}`));info.append(el('div','item-sub',`${item.origem_catalogo==='mod'?'PT-BR':'Vanilla PT-BR'}: ${item.nome_ptbr_vanilla||item.nome_ptbr_referencia||'A confirmar'}`));const wiki=wikiLinkV47(item);if(wiki)info.append(wiki);row.append(info);const owned=el('td');owned.append(markButton(item,state.owned[item.id],onToggle));row.append(owned);const actions=el('td');if(item.personalizado){const b=el('button','delete','Excluir');b.type='button';b.addEventListener('click',()=>onDelete(item.id));actions.append(b)}else actions.append(el('span','item-detail',item.origem_catalogo==='mod'?'Mod: '+itemModLabel(item):'Catálogo base'));row.append(actions);tbody.append(row)}
  table.append(tbody);wrap.append(table);
  if(!isMagazines){container.replaceChildren(wrap);return}
  const navigation=el('nav','magazine-pagination');navigation.setAttribute('aria-label','Paginação das revistas');
  const first=(revistaPagina-1)*REVISTAS_POR_PAGINA+1;
  const last=Math.min(revistaPagina*REVISTAS_POR_PAGINA,filtered.length);
  const counter=el('span','magazine-page-status',`${first}–${last} de ${filtered.length} revistas · Página ${revistaPagina} de ${pages}`);
  const previous=el('button','magazine-page-button','← Anterior');previous.type='button';previous.disabled=revistaPagina===1;
  const next=el('button','magazine-page-button','Próxima →');next.type='button';next.disabled=revistaPagina===pages;
  const go=(to)=>{revistaPagina=to;renderItems(container,items,state,term,filter,onToggle,onDelete)};
  previous.addEventListener('click',()=>go(revistaPagina-1));next.addEventListener('click',()=>go(revistaPagina+1));
  navigation.append(previous,counter,next);
  const selector=el('div','magazine-groups');selector.setAttribute('aria-label','Origem das revistas');
  for(const [key,label] of [['todos','Todas'],['vanilla','Catálogo inicial'],['mods','Mods instalados']]){
    const button=el('button','magazine-group-button'+(revistaGrupo===key?' active':''),label);
    button.type='button';button.setAttribute('aria-pressed',String(revistaGrupo===key));
    button.addEventListener('click',()=>{revistaGrupo=key;revistaPagina=1;renderItems(container,items,state,term,filter,onToggle,onDelete)});
    selector.append(button);
  }
  if(!filtered.length){container.replaceChildren(selector,el('div','empty','Nenhuma revista encontrada nesse grupo.'));return}
  container.replaceChildren(selector,navigation,wrap,navigation.cloneNode(false));
  const foot=container.lastElementChild;foot.className='magazine-pagination';foot.append(
    Object.assign(el('button','magazine-page-button','← Anterior'),{type:'button',disabled:revistaPagina===1}),
    el('span','magazine-page-status',`Página ${revistaPagina} de ${pages}`),
    Object.assign(el('button','magazine-page-button','Próxima →'),{type:'button',disabled:revistaPagina===pages})
  );
  foot.firstElementChild.addEventListener('click',()=>go(revistaPagina-1));
  foot.lastElementChild.addEventListener('click',()=>go(revistaPagina+1));
}


// catálogo V4.5 - VHS vanilla: separação por origem, filtros e paginação.
let vhsPaginaV45=1;
let vhsGrupoV45='todas';
let vhsEfeitoV45='todos';
let vhsOrigemV46='vanilla';
// catálogo V4.6 - VHS mods e nomes

function renderVhsItemsV45(container,items,state,term,filter,onToggle,onDelete){
  const all=items.filter(x=>matches(x,term,filter,state.owned));
  const originKey=typeof vhsOrigemV46==='string'?vhsOrigemV46:'vanilla';
  const subset=all.filter(x=>(originKey==='vanilla'?x.origem_catalogo!=='mod':x.origem_catalogo==='mod') &&
    (vhsGrupoV45==='todas'||x.categoria_vhs===vhsGrupoV45) &&
    (vhsEfeitoV45==='todos'||(vhsEfeitoV45==='efeitos'?x.possui_efeito_adicional:!x.possui_efeito_adicional)));
  const size=12;
  const pages=Math.max(1,Math.ceil(subset.length/size));
  vhsPaginaV45=Math.min(Math.max(1,vhsPaginaV45),pages);
  const shown=subset.slice((vhsPaginaV45-1)*size,vhsPaginaV45*size);
  const origin=el('div','magazine-groups');origin.setAttribute('aria-label','Origem das VHS');
  for(const [key,label] of [['vanilla','Vanilla'],['mods','Mods']]){
    const count=all.filter(x=>key==='vanilla'?x.origem_catalogo!=='mod':x.origem_catalogo==='mod').length;
    const btn=el('button','magazine-group-button'+(originKey===key?' active':''),label+' ('+count+')');
    btn.type='button';btn.setAttribute('aria-pressed',String(originKey===key));
    btn.addEventListener('click',()=>{vhsOrigemV46=key;vhsGrupoV45='todas';vhsEfeitoV45='todos';vhsPaginaV45=1;renderVhsItemsV45(container,items,state,term,filter,onToggle,onDelete)});
    origin.append(btn);
  }
  const groups=el('div','magazine-groups');groups.setAttribute('aria-label','Tipo das VHS');
  for(const [key,label] of [['todas','Todas'],['loja','VHS de loja'],['caseiras','VHS caseiras']]){
    const btn=el('button','magazine-group-button'+(vhsGrupoV45===key?' active':''),label);
    btn.type='button';btn.setAttribute('aria-pressed',String(vhsGrupoV45===key));
    btn.addEventListener('click',()=>{vhsGrupoV45=key;vhsPaginaV45=1;renderVhsItemsV45(container,items,state,term,filter,onToggle,onDelete)});
    groups.append(btn);
  }
  const effects=el('div','magazine-groups');effects.setAttribute('aria-label','Efeitos das VHS');
  for(const [key,label] of [['todos','Todos os efeitos'],['efeitos','Com efeitos adicionais'],['comuns','Somente tédio']]){
    const btn=el('button','magazine-group-button'+(vhsEfeitoV45===key?' active':''),label);
    btn.type='button';btn.setAttribute('aria-pressed',String(vhsEfeitoV45===key));
    btn.addEventListener('click',()=>{vhsEfeitoV45=key;vhsPaginaV45=1;renderVhsItemsV45(container,items,state,term,filter,onToggle,onDelete)});
    effects.append(btn);
  }
  function nav(){
    const n=el('nav','magazine-pagination');n.setAttribute('aria-label','Paginacao VHS');
    const first=subset.length?(vhsPaginaV45-1)*size+1:0,last=Math.min(vhsPaginaV45*size,subset.length);
    const prev=el('button','magazine-page-button','← Anterior');prev.type='button';prev.disabled=vhsPaginaV45===1;
    const next=el('button','magazine-page-button','Próxima →');next.type='button';next.disabled=vhsPaginaV45===pages;
    prev.addEventListener('click',()=>{vhsPaginaV45--;renderVhsItemsV45(container,items,state,term,filter,onToggle,onDelete)});
    next.addEventListener('click',()=>{vhsPaginaV45++;renderVhsItemsV45(container,items,state,term,filter,onToggle,onDelete)});
    n.append(prev,el('span','magazine-page-status',first+'–'+last+' de '+subset.length+' VHS · Página '+vhsPaginaV45+' de '+pages),next);
    return n;
  }
  if(!subset.length){container.replaceChildren(origin,groups,effects,el('div','empty','Nenhuma VHS corresponde aos filtros.'));return;}
  const grid=el('div','vhs-grid-v47');
  for(const item of shown){
    const card=el('article','vhs-card-v47');
    const info=el('div','vhs-card-info-v47');
    const heading=el('div','item-heading');
    heading.append(itemIcon(item),el('div','item-title',item.nome_catalogo||item.nome||item.nome_en||item.id));
    const vhsBadge=modBadge(item);if(vhsBadge)heading.append(vhsBadge);
    info.append(heading);
    info.append(el('div','item-sub','EN: '+(item.nome_en||'Não informado')));
    if(item.nome_ptbr_vanilla && item.nome_ptbr_vanilla!==item.nome_en)info.append(el('div','item-sub','PT-BR: '+item.nome_ptbr_vanilla));
    info.append(el('div','item-sub',(item.categoria_vhs==='loja'?'VHS de loja':'VHS caseira')+(item.possui_efeito_adicional?' · Efeitos adicionais':' · Somente tédio')));
    if(item.possui_efeito_adicional&&item.codigos_efeitos)info.append(el('div','item-sub','Códigos: '+item.codigos_efeitos));
    const wiki=wikiLinkV47(item);if(wiki)info.append(wiki);
    const actions=el('div','vhs-card-actions-v47');
    actions.append(markButton(item,state.owned[item.id],onToggle));
    if(item.personalizado){const del=el('button','delete','Excluir');del.type='button';del.addEventListener('click',()=>onDelete(item.id));actions.append(del)}
    else actions.append(el('span','item-detail',item.origem_catalogo==='mod'?'Mod: '+itemModLabel(item):'Vanilla'));
    card.append(info,actions);grid.append(card);
  }
  container.replaceChildren(origin,groups,effects,nav(),grid,nav());
}

// FIM catálogo V4.5 VHS

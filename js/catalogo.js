// Catalogo e ordenacao visual do Refugio — V3.6
export async function fetchCatalog(){const [livros,revistas,vhs]=await Promise.all(['livros','revistas','vhs'].map(async tipo=>{const response=await fetch(`data/${tipo}.json`,{cache:'no-cache'});if(!response.ok)throw Error(`Falha ao carregar data/${tipo}.json`);const records=await response.json();if(!Array.isArray(records))throw Error(`O arquivo ${tipo}.json precisa ser uma lista JSON.`);return records}));return{livros,revistas,vhs}}
export function skillKey(item){return item.nome_refugio||item.habilidade_en||'Não identificado no Refúgio'}
// Ordem de 28 grupos aprovada para a interface; nao reordena nem altera o JSON.
const ORDER=[
 'Abate','Agricultura','Alvenaria','Armadilhas','Art','Carpintaria','Cerâmica',
 'Coleta','Costura','Cuidado com Animais','Culinária','Dança','Elétrica','Entalhamento',
 'Ferraria','Lascamento','Limpeza','Lâminas Longas','Manutenção','Mecânica',
 'Música','Pesca','Pontaria','Primeiros Socorros','Rastreamento','Recarga',
 'Soldagem','Vidraçaria'
];
const ALIASES={Blacksmithing:'Ferraria',Aiming:'Pontaria',Knapping:'Lascamento','Long Blade':'Lâminas Longas',Reloading:'Recarga'};
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const index=new Map(ORDER.map((x,i)=>[normal(x),i]));
export function groupBooks(items){
 const map=new Map();
 for(const item of items){const key=skillKey(item);if(!map.has(key))map.set(key,[]);map.get(key).push(item)}
 return [...map.entries()].sort((a,b)=>{
  const nameA=ALIASES[a[0]]||a[0],nameB=ALIASES[b[0]]||b[0];
  const ia=index.get(normal(nameA))??999,ib=index.get(normal(nameB))??999;
  return ia-ib || nameA.localeCompare(nameB,'pt-BR');
 });
}

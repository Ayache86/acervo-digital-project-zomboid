const KEY='refugio-acervo-v3';
export function loadState(){try{const value=JSON.parse(localStorage.getItem(KEY)||'{}');return{owned:value.owned&&typeof value.owned==='object'&&!Array.isArray(value.owned)?value.owned:{},custom:Array.isArray(value.custom)?value.custom:[]}}catch{return{owned:{},custom:[]}}}
export function saveState(state){localStorage.setItem(KEY,JSON.stringify(state))}
export function importBackup(data){if(!data||typeof data!=='object'||!data.owned||typeof data.owned!=='object'||Array.isArray(data.owned)||!Array.isArray(data.custom))throw Error('Backup inválido: esperados owned e custom.');return{owned:data.owned,custom:data.custom.filter(x=>x&&typeof x.id==='string'&&typeof x.nome==='string'&&['livros','revistas','vhs'].includes(x.tipo))}}

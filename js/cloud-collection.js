// Cada consulta filtra o usuario; as politicas RLS sao a barreira de seguranca real.
import {getSupabase} from './cloud-client.js';
async function db(){return getSupabase()}
function check(error){if(error)throw new Error(error.message||String(error))}
function asCustom(row){return {id:row.item_id,tipo:row.item_type,nome:row.name,nome_catalogo:row.name,nome_en:row.name_en,nome_ptbr_vanilla:row.name_ptbr,personalizado:true}}
function customRow(userId,item){return {user_id:userId,item_id:item.id,item_type:item.tipo,name:item.nome,name_en:item.nome_en||null,name_ptbr:item.nome_ptbr_vanilla||null}}
export async function loadCollection(userId){
 const client=await db();
 const [marks,custom]=await Promise.all([
   client.from('user_collection').select('item_id,owned').eq('user_id',userId).range(0,999),
   client.from('user_custom_items').select('item_id,item_type,name,name_en,name_ptbr').eq('user_id',userId).range(0,999)
 ]);
 check(marks.error);check(custom.error);
 if((marks.data||[]).length===1000||(custom.data||[]).length===1000)throw new Error('Limite de consulta atingido; revise a paginacao antes de continuar.');
 return {owned:Object.fromEntries((marks.data||[]).filter(r=>r.owned).map(r=>[r.item_id,true])),custom:(custom.data||[]).map(asCustom)};
}
export async function saveMark(userId,itemId,owned){
 const client=await db();
 const result=owned?await client.from('user_collection').upsert({user_id:userId,item_id:itemId,owned:true},{onConflict:'user_id,item_id'})
                   :await client.from('user_collection').delete().eq('user_id',userId).eq('item_id',itemId);
 check(result.error);
}
export async function addCustom(userId,item){const client=await db();const r=await client.from('user_custom_items').insert(customRow(userId,item));check(r.error)}
export async function removeCustom(userId,id){
 const client=await db();
 // Excluir marcacao primeiro; a exclusao da definicao ocorre em seguida.
 const r=await client.from('user_collection').delete().eq('user_id',userId).eq('item_id',id);check(r.error);
 const r2=await client.from('user_custom_items').delete().eq('user_id',userId).eq('item_id',id);check(r2.error)
}
export async function mergeLocal(userId,local,remote){
 const client=await db();
 // Nunca sobrescrever as marcacoes existentes na nuvem com false.
 const marked=Object.keys(local.owned||{}).filter(id=>local.owned[id]===true&&id.length>0&&id.length<=200);
 const existing=new Set((remote.custom||[]).map(item=>item.id));
 const newcomers=(local.custom||[]).filter(item=>item&&item.personalizado!==false&&['livros','revistas','vhs'].includes(item.tipo)&&typeof item.id==='string'&&item.id.startsWith('custom-')&&!existing.has(item.id)&&typeof item.nome==='string');
 for(let i=0;i<newcomers.length;i+=100){const r=await client.from('user_custom_items').upsert(newcomers.slice(i,i+100).map(x=>customRow(userId,x)),{onConflict:'user_id,item_id',ignoreDuplicates:true});check(r.error)}
 for(let i=0;i<marked.length;i+=100){const r=await client.from('user_collection').upsert(marked.slice(i,i+100).map(id=>({user_id:userId,item_id:id,owned:true})),{onConflict:'user_id,item_id',ignoreDuplicates:false});check(r.error)}
 return {marks:marked.length,custom:newcomers.length};
}

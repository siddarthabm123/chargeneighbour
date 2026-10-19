import 'server-only';
import { supabaseRequests, type RequestRow } from './supabase-rest';
function config() {
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw Error('The database is not configured');
 return {url,key};
}
export function listRequests(userId:string){return supabaseRequests(config(),'GET',userId);}
export async function createRequest(record:RequestRow){await supabaseRequests(config(),'POST',record.userId,record);}
export async function cancelRequest(userId:string,id:string){return (await supabaseRequests(config(),'PATCH',userId,id)).length>0;}

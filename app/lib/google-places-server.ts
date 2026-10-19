import 'server-only';
export const privateJson=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function useGoogleAllowance() {
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return false;
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};
 if(key.startsWith('eyJ'))headers.Authorization=`Bearer ${key}`;
 const response=await fetch(new URL('/rest/v1/rpc/consume_search_allowance',url),{method:'POST',headers,body:'{}',cache:'no-store',signal:AbortSignal.timeout(12000)});
 return response.ok&&(await response.json())===true;
}

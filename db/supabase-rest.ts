export type SupabaseConfig={url:string,key:string};
export type RequestRow={id:string,userId:string,email:string,kind:string,payload:string,status:string,createdAt:string};
type RemoteRow={id:string,user_id:string,email:string,kind:string,payload:unknown,status:string,created_at:string};

export async function supabaseRequests(config:SupabaseConfig,method:'GET'|'POST'|'PATCH',userId:string,record?:RequestRow|string,request=fetch):Promise<RequestRow[]> {
 const base=new URL(config.url);
 if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.username||base.password)throw new Error('Invalid database configuration.');
 const url=new URL('/rest/v1/marketplace_requests',base);
 url.searchParams.set('user_id',`eq.${userId}`);
 if(method==='GET')url.searchParams.set('order','created_at.desc');
 if(method==='PATCH')url.searchParams.set('id',`eq.${record}`);
 const headers:Record<string,string>={apikey:config.key,'Content-Type':'application/json',Prefer:'return=representation'};
 if(config.key.startsWith('eyJ'))headers.Authorization=`Bearer ${config.key}`;
 const row=typeof record==='object'?{id:record.id,user_id:userId,email:record.email,kind:record.kind,payload:JSON.parse(record.payload),status:record.status,created_at:record.createdAt}:undefined;
 const response=await request(url,{method,headers,cache:'no-store',signal:AbortSignal.timeout(12000),...(method==='GET'?{}:{body:JSON.stringify(method==='PATCH'?{status:'cancelled'}:row)})});
 if(!response.ok){const error=await response.json().catch(()=>({})) as {code?:string};throw new Error(`Database request failed (${response.status}${error.code?`, ${error.code}`:''}).`);}
 const rows=await response.json() as RemoteRow[];
 return rows.map(r=>({id:r.id,userId:r.user_id,email:r.email,kind:r.kind,payload:JSON.stringify(r.payload),status:r.status,createdAt:r.created_at}));
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(request:NextRequest) {
 let response=NextResponse.next({request});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!request.cookies.getAll().some(c=>c.name.startsWith('sb-')))return response;
 const client=createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},cookies:{getAll:()=>request.cookies.getAll(),setAll(items,cacheHeaders){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));if(cacheHeaders)Object.entries(cacheHeaders).forEach(([name,value])=>response.headers.set(name,value));response.headers.set('Cache-Control','private, no-store');}}});
 await client.auth.getUser();
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.svg|images/).*)']};

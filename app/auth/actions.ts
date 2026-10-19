'use server';
import { redirect } from 'next/navigation';
import { appOrigin, authClient, safeNext } from './server';

export async function sendSignInLink(form:FormData) {
 const next=safeNext(form.get('next'));
 const email=String(form.get('email')||'').trim();
 const destination=`/auth/login?next=${encodeURIComponent(next)}`;
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))redirect(`${destination}&status=invalid`);
 const client=await authClient();if(!client)redirect(`${destination}&status=unavailable`);
 const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:`${appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`}});
 if(error)redirect(`${destination}&status=${error.status===429?'limited':'failed'}`);
 redirect(`${destination}&status=sent`);
}
export async function signOut() {
 const client=await authClient();
 if(client)await client.auth.signOut({scope:'local'});
 redirect('/');
}

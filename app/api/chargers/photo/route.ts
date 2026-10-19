const env=process.env;
import { privateJson as json, useGoogleAllowance } from '../../../lib/google-places-server';
export async function GET(request: Request) {
  const name=new URL(request.url).searchParams.get('name')||'';
  if(name.length>2000 || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) return json({message:'Invalid photo reference.'},400);
  if(!env.GOOGLE_PLACES_API_KEY) return json({message:'Google photos are not active yet.'},503);
  try {
    if(!await useGoogleAllowance()) return json({message:'Photo allowance reached.'},429);
    const response=await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=900&skipHttpRedirect=true`,{headers:{'X-Goog-Api-Key':env.GOOGLE_PLACES_API_KEY},signal:AbortSignal.timeout(12000)});
    if(!response.ok) return json({message:'Photo unavailable. View photos on Google Maps.'},502);
    const data=await response.json() as {photoUri?:string};
    const url=new URL(data.photoUri||'');
    if(url.protocol!=='https:' || !(url.hostname==='googleusercontent.com'||url.hostname.endsWith('.googleusercontent.com'))) throw Error('Invalid image host');
    return new Response(null,{status:302,headers:{Location:url.href,'Cache-Control':'private, no-store'}});
  } catch { return json({message:'Photo unavailable. View photos on Google Maps.'},503); }
}

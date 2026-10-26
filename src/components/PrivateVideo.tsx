import { useEffect, useState } from 'react';
import { privateFileUrl } from '@/lib/storage';

export default function PrivateVideo({bucket,path,className,autoPlay=false}:{bucket:string;path:string;className?:string;autoPlay?:boolean}) {
 const [url,setUrl]=useState('');const [error,setError]=useState(false);
 useEffect(()=>{let active=true;setUrl('');setError(false);privateFileUrl(bucket,path).then(u=>{if(active)setUrl(u);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[bucket,path]);
 return error?<p role="alert">Could not load this recording. Check your access and reopen it.</p>:url?<video src={url} autoPlay={autoPlay} controls className={className} />:<p role="status">Loading recording…</p>;
}

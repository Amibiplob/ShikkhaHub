import { useEffect, useState } from 'react';
import { privateFileUrl } from '@/lib/storage';

function PrivateVideoContent({bucket,path,className,autoPlay=false}:{bucket:string;path:string;className?:string;autoPlay?:boolean}) {
 const [url,setUrl]=useState('');const [error,setError]=useState(false);
 useEffect(()=>{let active=true;privateFileUrl(bucket,path).then(u=>{if(active)setUrl(u);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[bucket,path]);
 return error?<p role="alert">Could not load this recording. Check your access and reopen it.</p>:url?<video src={url} autoPlay={autoPlay} controls className={className} />:<p role="status">Loading recording…</p>;
}

export default function PrivateVideo(props: Parameters<typeof PrivateVideoContent>[0]) {
 return <PrivateVideoContent key={`${props.bucket}:${props.path}`} {...props} />;
}

import { useEffect, useRef } from 'react';
import type { ChatMessage } from './useWebRTCBroadcast';
import { useLanguage } from '@/hooks/useLanguage';
export default function ClassroomChat({ messages }: { messages: ChatMessage[] }) {
  const end = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  return <div className="space-y-4">
    {messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'bn' ? 'কথা শুরু করুন। প্রশ্ন করুন বা শুভেচ্ছা জানান।' : 'Start the conversation. Ask a question or say hello.'}</p>}
    {messages.map(message => <div key={message.id} className="min-w-0 text-sm">
      <p className="mb-1 text-xs font-semibold text-primary">{message.userName}</p>
      <p className="break-words rounded-xl bg-muted px-3 py-2 [overflow-wrap:anywhere]">{message.message}</p>
    </div>)}
    <div ref={end} />
  </div>;
}

import { describe, expect, it, vi } from 'vitest';
import { allowedDocument, privateFileUrl } from './storage';
const signed=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({createSignedUrl:signed})}}}));
describe('private resource access',()=>{
 it('refreshes legacy public storage links through signing',async()=>{signed.mockResolvedValue({data:{signedUrl:'https://example.test/signed'},error:null});expect(await privateFileUrl('submissions','https://project.supabase.co/storage/v1/object/public/submissions/user/file.pdf')).toBe('https://example.test/signed');expect(signed).toHaveBeenCalledWith('user/file.pdf',300);});
 it('propagates denied file access',async()=>{signed.mockResolvedValue({data:null,error:new Error('denied')});await expect(privateFileUrl('lesson-files','course/file.pdf')).rejects.toThrow('denied');});
 it('rejects executable uploads and permits small documents',()=>{expect(allowedDocument(new File(['x'],'answer.pdf'))).toBe(true);expect(allowedDocument(new File(['x'],'payload.html'))).toBe(false);expect(allowedDocument(new File([new Uint8Array(11*1024*1024)],'too-large.pdf'))).toBe(false);});
});

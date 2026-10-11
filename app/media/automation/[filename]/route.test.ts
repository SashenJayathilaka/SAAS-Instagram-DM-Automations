import { beforeEach, describe, expect, it, vi } from 'vitest';
const findUnique = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ client: { automationImage: { findUnique } } }));
import { GET } from './route';
const id = '11111111-1111-4111-8111-111111111111';
const request = new Request(`https://ap3k.com/media/automation/${id}.jpg`);
beforeEach(() => vi.clearAllMocks());
describe('public product delivery images', () => {
  it('returns image bytes without authentication and keeps them out of search', async () => {
    const bytes = new Uint8Array([255,216,255,217]);
    findUnique.mockResolvedValue({ data: bytes });
    const response = await GET(request, {params:Promise.resolve({ filename: `${id}.jpg` })});
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(findUnique).toHaveBeenCalledWith({ where:{id},select:{data:true} });
  });
  it('rejects malformed filenames before querying storage', async () => {
    for (const filename of ['invalid.jpg', `${id}.png`, `${id}.jpg.jpg`, `${id}`]) {
      expect((await GET(request,{params:Promise.resolve({filename})})).status).toBe(404);
    }
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('returns 404 for missing images', async () => {
    findUnique.mockResolvedValue(null);
    expect((await GET(request,{params:Promise.resolve({filename:`${id}.jpg`})})).status).toBe(404);
  });
});

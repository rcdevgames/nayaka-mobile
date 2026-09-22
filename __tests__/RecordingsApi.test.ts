/**
 * Regresi: CameraDetailScreen crash "Cannot read property 'length' of undefined".
 *
 * Akarnya: recordingsApi.list dideklarasikan api<{ data: Recording[] }>,
 * padahal api() sudah membuka envelope {data, meta}. Hasilnya res.data
 * adalah undefined dan relatedRecordings.length meledak.
 *
 * Kontrak yang dikunci di sini: list endpoint mengembalikan array langsung
 * (bukan envelope), dan layar aman terhadap payload non-array.
 */

import { recordingsApi } from '../src/api';

const recordings = [
  {
    id: 'rec-1',
    camera_id: 'cam-1',
    camera_name: 'Kamera Teras Utama',
    title: 'Rekaman 1',
    started_at: '2026-09-21T08:00:00Z',
    ended_at: '2026-09-21T08:05:00Z',
    duration: 300,
    size_bytes: 1024,
    status: 'available',
    has_motion: false,
  },
];

describe('recordings list contract', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ data: recordings, meta: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mengembalikan array langsung, bukan envelope', async () => {
    const res = await recordingsApi.list({ camera_id: 'cam-1', limit: 20 });

    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('rec-1');
  });
});

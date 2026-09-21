import { camerasApi } from '../src/api';

const streamUrl = 'http://110.232.92.134:3001/api/stream';

const camera = {
  id: '78e12a4c-c0cb-4b78-86e0-5193859f4159',
  name: 'Kamera Teras Utama',
  serial_number: 'SN-2026-000125',
  model: 'Model X',
  status: 'active',
  recording_status: 'recording',
  thumbnail_url: streamUrl,
  stream_url: streamUrl,
  thumbnail_expires_at: '2026-09-21T10:41:00Z',
  last_seen_at: '2026-09-21T08:00:00Z',
};

describe('camera stream URL contract', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ data: [camera], meta: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns stream_url exactly as supplied by the API', async () => {
    const cameras = await camerasApi.list();

    expect(cameras[0].stream_url).toBe(streamUrl);
    expect(cameras[0].thumbnail_url).toBe(streamUrl);
  });
});
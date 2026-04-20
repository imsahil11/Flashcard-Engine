import request from 'supertest';
import { app } from '../app.js';

describe('health', () => {
  it('returns ok', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });
});

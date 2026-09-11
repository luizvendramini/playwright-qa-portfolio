import { test, expect } from '@playwright/test';

/**
 * Testes de API contra o endpoint /api/products da mock-app.
 *
 * Cada teste que cria dados tambem os remove ao final (cleanup),
 * garantindo independencia entre execucoes e evitando que a ordem
 * dos testes influencie o resultado.
 */
test.describe('API de produtos', () => {
  test('GET /api/products retorna a lista de produtos com status 200', async ({ request }) => {
    const response = await request.get('/api/products');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
    expect(body[0]).toHaveProperty('price');
  });

  test('GET /api/products/:id retorna um produto existente', async ({ request }) => {
    const response = await request.get('/api/products/1');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(1);
  });

  test('GET /api/products/:id retorna 404 para produto inexistente', async ({ request }) => {
    const response = await request.get('/api/products/999999');

    expect(response.status()).toBe(404);
  });

  test('POST /api/products cria um novo produto e permite remocao', async ({ request }) => {
    const payload = { name: 'Webcam Full HD', price: 199.9, description: 'Webcam 1080p com microfone integrado.' };

    const createResponse = await request.post('/api/products', { data: payload });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created.name).toBe(payload.name);
    expect(created).toHaveProperty('id');

    // cleanup: remove o produto criado para nao deixar residuo entre execucoes
    const deleteResponse = await request.delete(`/api/products/${created.id}`);
    expect(deleteResponse.status()).toBe(204);

    const getAfterDelete = await request.get(`/api/products/${created.id}`);
    expect(getAfterDelete.status()).toBe(404);
  });

  test('POST /api/products sem os campos obrigatorios retorna 400', async ({ request }) => {
    const response = await request.post('/api/products', { data: { description: 'faltando name e price' } });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('DELETE /api/products/:id retorna 404 para produto inexistente', async ({ request }) => {
    const response = await request.delete('/api/products/999999');

    expect(response.status()).toBe(404);
  });
});

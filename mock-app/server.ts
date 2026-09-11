/**
 * mock-app/server.ts
 *
 * Aplicacao "alvo" de testes, totalmente local, deterministica e SEM
 * dependencias externas de runtime (usa apenas modulos nativos do Node.js).
 * Escrita em TypeScript para manter o projeto inteiro (mock-app, Page Objects
 * e testes) na mesma linguagem, com o mesmo nivel de tipagem.
 *
 * Por que uma mock-app em vez de testar um site publico de demonstracao?
 * - Elimina flakiness causada por indisponibilidade/mudancas de terceiros.
 * - Garante que a suite roda de forma identica em qualquer ambiente (local, CI),
 *   sem depender de rede externa.
 * - Mantem os testes 100% deterministicos e independentes (nao ha rate limit,
 *   captcha ou dados que mudam entre execucoes).
 *
 * A aplicacao expõe:
 *  - Fluxo Web (server-rendered HTML): login -> catalogo -> carrinho -> checkout
 *  - API REST (/api/products): CRUD simples usado pelos testes de API
 */
import http, { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { URL, URLSearchParams } from 'url';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface User {
  username: string;
  password: string;
  locked: boolean;
}

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
}

interface CartItem {
  productId: number;
  qty: number;
}

interface Session {
  username: string;
  cart: CartItem[];
}

interface RouteContext {
  params: Record<string, string>;
  query: URLSearchParams;
  session: Session;
}

type Handler = (req: IncomingMessage, res: ServerResponse, ctx: RouteContext) => void | Promise<void>;

interface Route {
  method: string;
  pattern: string;
  handler: Handler;
}

// ---------------------------------------------------------------------------
// "Banco de dados" em memoria
// ---------------------------------------------------------------------------
const USERS: User[] = [
  { username: 'standard_user', password: 'secret123', locked: false },
  { username: 'locked_user', password: 'secret123', locked: true },
];

let PRODUCTS: Product[] = [
  { id: 1, name: 'Teclado Mecanico', price: 249.9, description: 'Teclado mecanico ABNT2, switches azuis.' },
  { id: 2, name: 'Mouse Sem Fio', price: 89.5, description: 'Mouse ergonomico com sensor optico.' },
  { id: 3, name: 'Monitor 27" 4K', price: 1899.0, description: 'Monitor IPS 27 polegadas, resolucao 4K.' },
  { id: 4, name: 'Headset Gamer', price: 349.0, description: 'Headset com som surround 7.1.' },
];
let nextProductId = 5;

// sessionId -> { username, cart: [{ productId, qty }] }
const SESSIONS = new Map<string, Session>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.split('=')[1] : null;
}

function getSession(req: IncomingMessage): { sid: string | null; session: Session | null } {
  const sid = parseCookie(req.headers.cookie, 'sid');
  if (sid && SESSIONS.has(sid)) return { sid, session: SESSIONS.get(sid)! };
  return { sid: null, session: null };
}

function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      try {
        if (contentType.includes('application/json')) {
          resolve(raw ? JSON.parse(raw) : {});
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          resolve(Object.fromEntries(new URLSearchParams(raw)));
        } else {
          resolve({});
        }
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendJson(res: ServerResponse, status: number, obj: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(302, { Location: location });
  res.end();
}

function setSessionCookie(res: ServerResponse, sid: string): void {
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/`);
}

function clearSessionCookie(res: ServerResponse): void {
  res.setHeader('Set-Cookie', 'sid=; Path=/; Max-Age=0');
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <title>${title} | Loja QA Demo</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; color: #222; }
    h1 { font-size: 22px; }
    .product { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .error { color: #b00020; margin-bottom: 12px; }
    input, button { font-size: 14px; padding: 8px; }
    button { cursor: pointer; }
    nav a { margin-right: 12px; }
    .price { font-weight: bold; }
  </style>
</head>
<body>
  <nav>
    <a href="/products" data-testid="nav-products">Produtos</a>
    <a href="/cart" data-testid="nav-cart">Carrinho</a>
    <a href="/logout" data-testid="nav-logout">Sair</a>
  </nav>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
}

function loginPageHtml(showError: boolean): string {
  const error = showError
    ? '<p class="error" data-testid="login-error">Usuario ou senha invalidos, ou usuario bloqueado.</p>'
    : '';
  return `<!doctype html>
<html lang="pt-br">
<head><meta charset="utf-8" /><title>Login | Loja QA Demo</title>
<style>body{font-family:Arial,sans-serif;max-width:360px;margin:80px auto;} input{display:block;width:100%;margin-bottom:10px;padding:8px;} button{padding:8px 16px;}</style>
</head>
<body>
  <h1>Login</h1>
  ${error}
  <form method="POST" action="/login">
    <input name="username" placeholder="usuario" data-testid="username-input" />
    <input name="password" type="password" placeholder="senha" data-testid="password-input" />
    <button type="submit" data-testid="login-button">Entrar</button>
  </form>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------
const routes: Route[] = [];
function on(method: string, pattern: string, handler: Handler): void {
  routes.push({ method, pattern, handler });
}

function matchRoute(
  method: string,
  pathname: string
): { handler: Handler; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const paramNames: string[] = [];
    const regexStr = route.pattern.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const match = pathname.match(new RegExp(`^${regexStr}$`));
    if (!match) continue;
    const params: Record<string, string> = {};
    paramNames.forEach((name, i) => (params[name] = match[i + 1]));
    return { handler: route.handler, params };
  }
  return null;
}

on('GET', '/', (req, res) => redirect(res, '/login'));

on('GET', '/login', (req, res, ctx) => {
  sendHtml(res, 200, loginPageHtml(ctx.query.get('error') === '1'));
});

on('POST', '/login', async (req, res) => {
  const { username, password } = await readBody(req);
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user || user.locked) return redirect(res, '/login?error=1');

  const sid = crypto.randomUUID();
  SESSIONS.set(sid, { username: user.username, cart: [] });
  setSessionCookie(res, sid);
  redirect(res, '/products');
});

on('GET', '/logout', (req, res) => {
  const { sid } = getSession(req);
  if (sid) SESSIONS.delete(sid);
  clearSessionCookie(res);
  redirect(res, '/login');
});

on('GET', '/products', (req, res, ctx) => {
  const items = PRODUCTS.map(
    (p) => `<div class="product" data-testid="product-${p.id}">
      <div>
        <strong>${p.name}</strong><br/>
        <span class="price">R$ ${p.price.toFixed(2)}</span>
      </div>
      <form method="POST" action="/cart/add">
        <input type="hidden" name="productId" value="${p.id}" />
        <button type="submit" data-testid="add-to-cart-${p.id}">Adicionar ao carrinho</button>
      </form>
    </div>`
  ).join('\n');
  sendHtml(
    res,
    200,
    layout('Produtos', `<p data-testid="cart-count">Itens no carrinho: ${ctx.session.cart.length}</p>${items}`)
  );
});

on('POST', '/cart/add', async (req, res, ctx) => {
  const { productId } = await readBody(req);
  const product = PRODUCTS.find((p) => p.id === Number(productId));
  if (product) ctx.session.cart.push({ productId: product.id, qty: 1 });
  redirect(res, '/products');
});

on('POST', '/cart/remove', async (req, res, ctx) => {
  const { productId } = await readBody(req);
  const idx = ctx.session.cart.findIndex((i) => i.productId === Number(productId));
  if (idx >= 0) ctx.session.cart.splice(idx, 1);
  redirect(res, '/cart');
});

on('GET', '/cart', (req, res, ctx) => {
  if (ctx.session.cart.length === 0) {
    return sendHtml(res, 200, layout('Carrinho', '<p data-testid="empty-cart">Seu carrinho esta vazio.</p>'));
  }
  let total = 0;
  const rows = ctx.session.cart
    .map((item) => {
      const product = PRODUCTS.find((p) => p.id === item.productId)!;
      total += product.price * item.qty;
      return `<div class="product" data-testid="cart-item-${product.id}">
        <span>${product.name} (x${item.qty})</span>
        <span class="price">R$ ${(product.price * item.qty).toFixed(2)}</span>
        <form method="POST" action="/cart/remove">
          <input type="hidden" name="productId" value="${product.id}" />
          <button type="submit" data-testid="remove-${product.id}">Remover</button>
        </form>
      </div>`;
    })
    .join('\n');
  sendHtml(
    res,
    200,
    layout(
      'Carrinho',
      `${rows}<p data-testid="cart-total">Total: R$ ${total.toFixed(2)}</p><a href="/checkout" data-testid="checkout-link">Finalizar compra</a>`
    )
  );
});

on('GET', '/checkout', (req, res, ctx) => {
  if (ctx.session.cart.length === 0) return redirect(res, '/cart');
  sendHtml(
    res,
    200,
    layout(
      'Checkout',
      `<form method="POST" action="/checkout">
        <input name="fullName" placeholder="Nome completo" data-testid="checkout-name" /><br/><br/>
        <input name="postalCode" placeholder="CEP" data-testid="checkout-postal" /><br/><br/>
        <button type="submit" data-testid="checkout-submit">Confirmar pedido</button>
      </form>`
    )
  );
});

on('POST', '/checkout', async (req, res, ctx) => {
  const { fullName, postalCode } = await readBody(req);
  if (!fullName || !postalCode) {
    return sendHtml(
      res,
      200,
      layout('Checkout', '<p class="error" data-testid="checkout-error">Preencha nome e CEP para continuar.</p>')
    );
  }
  ctx.session.cart = [];
  sendHtml(
    res,
    200,
    layout(
      'Pedido confirmado',
      `<p data-testid="order-confirmation">Obrigado, ${fullName}! Seu pedido foi confirmado e sera enviado para o CEP ${postalCode}.</p>`
    )
  );
});

// ---------------------------------------------------------------------------
// API REST (usada pelos testes de API) — nao exige autenticacao
// ---------------------------------------------------------------------------
on('GET', '/api/products', (req, res) => sendJson(res, 200, PRODUCTS));

on('GET', '/api/products/:id', (req, res, ctx) => {
  const product = PRODUCTS.find((p) => p.id === Number(ctx.params.id));
  if (!product) return sendJson(res, 404, { error: 'Produto nao encontrado' });
  sendJson(res, 200, product);
});

on('POST', '/api/products', async (req, res) => {
  const body = (await readBody(req)) || {};
  const { name, price, description } = body;
  if (!name || typeof price !== 'number') {
    return sendJson(res, 400, { error: 'Campos obrigatorios: name (string) e price (number)' });
  }
  const product: Product = { id: nextProductId++, name, price, description: description || '' };
  PRODUCTS.push(product);
  sendJson(res, 201, product);
});

on('DELETE', '/api/products/:id', (req, res, ctx) => {
  const idx = PRODUCTS.findIndex((p) => p.id === Number(ctx.params.id));
  if (idx === -1) return sendJson(res, 404, { error: 'Produto nao encontrado' });
  PRODUCTS.splice(idx, 1);
  sendJson(res, 204, undefined);
});

// Rotas que exigem sessao autenticada (fluxo web, exceto a API e o login)
const PUBLIC_PREFIXES = ['/login', '/api/'];
function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname === '/';
}

// ---------------------------------------------------------------------------
// Servidor HTTP
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const matched = matchRoute(req.method ?? 'GET', pathname);

  if (!matched) {
    sendJson(res, 404, { error: 'Rota nao encontrada' });
    return;
  }

  const { session } = getSession(req);
  if (!isPublic(pathname) && !session) {
    redirect(res, '/login');
    return;
  }

  try {
    await matched.handler(req, res, { params: matched.params, query: url.searchParams, session: session! });
  } catch (err) {
    sendJson(res, 500, { error: 'Erro interno', detail: String(err) });
  }
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => console.log(`mock-app rodando em http://localhost:${PORT}`));

export default server;

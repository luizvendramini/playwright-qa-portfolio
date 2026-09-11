/**
 * Massa de dados centralizada para os testes.
 * Manter os dados de teste em um unico lugar facilita a manutencao
 * e evita "valores magicos" espalhados pelos specs.
 */
export const users = {
  valid: { username: 'standard_user', password: 'secret123' },
  locked: { username: 'locked_user', password: 'secret123' },
  invalid: { username: 'standard_user', password: 'wrong-password' },
};

export const products = {
  keyboard: { id: 1, name: 'Teclado Mecanico' },
  mouse: { id: 2, name: 'Mouse Sem Fio' },
};

export const checkoutInfo = {
  valid: { fullName: 'Luiz Vendramini', postalCode: '01310-100' },
};

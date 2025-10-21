const STORAGE_CART_KEY = 'sim_carrito_v1';


let carrito = loadCartFromStorage(); 


function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error leyendo carrito de storage', e);
    return [];
  }
}
function saveCartToStorage() {
  try {
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(carrito));
  } catch (e) {
    console.warn('No se pudo guardar el carrito', e);
  }
}


function agregarAlCarrito(productId, cantidad = 1) {
  productId = Number(productId);
  cantidad = Number(cantidad) || 1;
  const idx = carrito.findIndex(i => Number(i.productId) === productId);
  if (idx >= 0) carrito[idx].qty += cantidad;
  else carrito.push({ productId, qty: cantidad });

  saveCartToStorage();
  window.renderCarrito?.();
}

function actualizarCantidad(productId, qty) {
  productId = Number(productId);
  qty = Math.max(1, Number(qty) || 1);
  const idx = carrito.findIndex(i => Number(i.productId) === productId);
  if (idx >= 0) carrito[idx].qty = qty;

  carrito = carrito.filter(i => i.qty > 0);
  saveCartToStorage();
  window.renderCarrito?.();
}

function eliminarDelCarrito(productId) {
  productId = Number(productId);
  carrito = carrito.filter(i => Number(i.productId) !== productId);
  saveCartToStorage();
  window.renderCarrito?.();
}

function vaciarCarrito() {
  carrito = [];
  saveCartToStorage();
  window.renderCarrito?.();
}

function obtenerItemsDelCarritoConProducto() {

  const catalogo = Array.isArray(window.productos) ? window.productos : [];
  return carrito
    .map(item => {
      const product = catalogo.find(p => Number(p.id) === Number(item.productId));
      return product ? { product, qty: item.qty, subtotal: product.precio * item.qty } : null;
    })
    .filter(Boolean);
}

function calcularTotalCarrito() {
  return obtenerItemsDelCarritoConProducto()
    .reduce((acc, cur) => acc + cur.subtotal, 0);
}

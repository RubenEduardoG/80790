// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Utils ----------
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const money = v => Number(v).toFixed(2);
  const esc = (text) => typeof text !== 'string' ? text :
    text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---------- Carga de catálogo (LS -> fetch -> fallback/ producto.js) ----------
  async function loadProducts() {
    // 1) LocalStorage extendido por admin
    const ls = localStorage.getItem('dyd_products_v1');
    if (ls) {
      try {
        const parsed = JSON.parse(ls);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {}
    }
    // 2) JSON remoto simulado
    try {
      const res = await fetch('./data/products.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) return data;
      }
    } catch {}
    // 3) producto.js global (si existe)
    if (Array.isArray(window.productos) && window.productos.length) {
      return window.productos.slice();
    }
    // 4) Fallback duro
  //   return [
  //     { id: 1, nombre: "Plegado industrial", precio: 2500.00, unidad: "1 unidad", imagen: "https://via.placeholder.com/400x300?text=Plegado" },
  //     { id: 2, nombre: "Soldadura MIG", precio: 1800.00, unidad: "por hora",   imagen: "https://via.placeholder.com/400x300?text=Soldadura" },
  //     { id: 3, nombre: "Corte láser",       precio: 1200.00, unidad: "m²",      imagen: "https://via.placeholder.com/400x300?text=Corte" }
  //   ];
  // }

  // ---------- Estado en memoria ----------
  let productosList = [];

  // ---------- Render productos ----------
  function renderProductos() {
    const wrap = $('#productos');
    if (!wrap) return; // página sin grilla
    wrap.innerHTML = productosList.map(p => `
      <article class="producto card" data-id="${p.id}">
        <img src="${esc(p.imagen || 'https://via.placeholder.com/400x300?text=Sin+imagen')}" alt="${esc(p.nombre)}" />
        <h4>${esc(p.nombre)}</h4>
        <div class="meta">$${money(p.precio)} · ${esc(p.unidad)}</div>
        <div class="actions">
          <button class="add-to-cart" data-id="${p.id}">Agregar</button>
          <button class="secondary view-details" data-id="${p.id}">Detalles</button>
        </div>
      </article>
    `).join('');
  }

  // ---------- Render carrito (global, lo llama carrito.js) ----------
  window.renderCarrito = function renderCarrito() {
    const list = $('#cart-list');
    const totalEl = $('#cart-total');
    const clearBtn = $('#clear-cart');

    if (!list || !totalEl) return; // página sin carrito

    // carrito.js usa 'productos' global, espejamos
    window.productos = productosList;

    const items = typeof obtenerItemsDelCarritoConProducto === 'function'
      ? obtenerItemsDelCarritoConProducto() : [];

    list.innerHTML = items.length
      ? items.map(({ product, qty, subtotal }) => `
          <div class="cart-item" data-id="${product.id}">
            <div>
              <div><strong>${esc(product.nombre)}</strong></div>
              <div class="meta">${esc(product.unidad)} · $${money(product.precio)}</div>
            </div>
            <div class="controls">
              <input class="qty" type="number" min="1" value="${qty}" />
              <button class="secondary remove">Eliminar</button>
            </div>
          </div>
        `).join('')
      : `<div class="empty">Tu carrito está vacío.</div>`;

    const total = typeof calcularTotalCarrito === 'function' ? calcularTotalCarrito() : 0;
    totalEl.textContent = money(total);

    // Listeners del carrito (delegados)
    list.onclick = e => {
      const item = e.target.closest('.cart-item');
      if (!item) return;
      const id = Number(item.dataset.id);
      if (e.target.matches('.remove')) {
        eliminarDelCarrito?.(id);
      }
    };
    list.onchange = e => {
      const item = e.target.closest('.cart-item');
      if (!item) return;
      if (e.target.matches('.qty')) {
        const id = Number(item.dataset.id);
        const qty = Number(e.target.value);
        actualizarCantidad?.(id, qty);
      }
    };

    // Vaciar carrito
    if (clearBtn && !clearBtn._bound) {
      clearBtn.addEventListener('click', () => vaciarCarrito?.());
      clearBtn._bound = true;
    }
  };

  // ---------- Form admin (agregar producto dinámico) ----------
  function bindAdminForm() {
    const form = $('#add-product-form');
    const msg = $('#add-product-msg');
    if (!form) return;

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const price = Number(fd.get('price'));
      const unit  = String(fd.get('unit') || '').trim();
      const image = String(fd.get('image') || '').trim();

      if (!name || !unit || Number.isNaN(price) || price <= 0) {
        if (msg) { msg.textContent = 'Completá nombre, precio (>0) y unidad.'; msg.style.color = 'salmon'; }
        return;
      }
      const newId = productosList.length ? Math.max(...productosList.map(p => p.id)) + 1 : 1;
      productosList.push({ id: newId, nombre: name, precio: price, unidad: unit, imagen: image });

      try { localStorage.setItem('dyd_products_v1', JSON.stringify(productosList)); } catch {}
      renderProductos();
      form.reset();
      if (msg) { msg.textContent = 'Producto agregado'; msg.style.color = 'lightgreen'; setTimeout(()=> msg.textContent='', 1500); }
    });
  }

  // ---------- Eventos de productos (Agregar / Detalles) ----------
  function bindProductGrid() {
    const wrap = $('#productos');
    if (!wrap) return;
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.classList.contains('add-to-cart')) {
        agregarAlCarrito?.(id, 1);
      } else if (btn.classList.contains('view-details')) {
        // Aquí podés abrir un modal con detalles (librería externa opcional)
        const p = productosList.find(x => x.id === id);
        if (p) alert(`${p.nombre}\n$${money(p.precio)} · ${p.unidad}`); // reemplazar por SweetAlert2 más adelante
      }
    });
  }

  // ---------- Init ----------
  (async function init() {
    productosList = await loadProducts();
    // espejo global para carrito.js
    window.productos = productosList;

    renderProductos();
    bindProductGrid();
    bindAdminForm();
    // Primer render del carrito si la página lo tiene
    window.renderCarrito();
  })();
});

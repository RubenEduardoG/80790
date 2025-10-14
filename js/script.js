// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Utils ----------
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const fmt = v => Number(v).toFixed(2);
  const esc = (text) =>
    typeof text !== 'string'
      ? text
      : text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---------- Carga de catálogo (LS -> fetch -> window.productos -> fallback) ----------
  async function loadProducts() {
    // 1) Catálogo extendido por admin (localStorage)
    try {
      const ls = localStorage.getItem('dyd_products_v1');
      if (ls) {
        const parsed = JSON.parse(ls);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {
      console.warn('No se pudo leer dyd_products_v1', e);
    }

    // 2) JSON remoto simulado (intentamos varias rutas y nombres)
    const candidates = [
      '/data/productos.json',
      '/data/products.json',
      './data/productos.json',
      './data/products.json',
      'data/productos.json',
      'data/products.json'
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length) return data;
        }
      } catch {}
    }

    // 3) producto.js global (si existe)
    if (Array.isArray(window.productos) && window.productos.length) {
      return window.productos.slice();
    }

    // 4) Fallback duro
    console.warn('Usando fallback de productos');
    return [
      { id: 1, nombre: "Plegado industrial", precio: 2500, unidad: "1 unidad", imagen: "https://via.placeholder.com/400x300?text=Plegado" },
      { id: 2, nombre: "Soldadura MIG",      precio: 1800, unidad: "por hora", imagen: "https://via.placeholder.com/400x300?text=Soldadura" },
      { id: 3, nombre: "Corte láser",         precio: 1200, unidad: "m²",      imagen: "https://via.placeholder.com/400x300?text=Corte" }
    ];
  }

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
        <div class="meta">$${fmt(p.precio)} · ${esc(p.unidad)}</div>
        <div class="actions">
          <button class="add-to-cart" data-id="${p.id}">Agregar</button>
          <button class="secondary view-details" data-id="${p.id}">Detalles</button>
        </div>
      </article>
    `).join('');
  }

  // ---------- Render carrito (global, lo llama carrito.js también) ----------
  window.renderCarrito = function renderCarrito() {
    const list = $('#cart-list');
    const totalEl = $('#cart-total');
    const clearBtn = $('#clear-cart');

    if (!list || !totalEl) return; // página sin carrito

    // carrito.js usa 'productos' global → espejamos
    window.productos = productosList;

    const items = (typeof obtenerItemsDelCarritoConProducto === 'function')
      ? obtenerItemsDelCarritoConProducto()
      : [];

    list.innerHTML = items.length
      ? items.map(({ product, qty, subtotal }) => `
          <div class="cart-item" data-id="${product.id}">
            <div>
              <div><strong>${esc(product.nombre)}</strong></div>
              <div class="meta">${esc(product.unidad)} · $${fmt(product.precio)}</div>
            </div>
            <div class="controls">
              <input class="qty" type="number" min="1" value="${qty}" />
              <button class="secondary remove">Eliminar</button>
            </div>
          </div>
        `).join('')
      : `<div class="empty">Tu carrito está vacío.</div>`;

    const total = (typeof calcularTotalCarrito === 'function') ? calcularTotalCarrito() : 0;
    totalEl.textContent = fmt(total);

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
      const nuevo = { id: newId, nombre: name, precio: price, unidad: unit, imagen: image };
      productosList.push(nuevo);

      // Persistimos catálogo extendido
      try { localStorage.setItem('dyd_products_v1', JSON.stringify(productosList)); } catch {}

      // Espejo global para carrito
      window.productos = productosList;

      renderProductos();
      // Si hay carrito visible, refrescamos para que conozca el catálogo actualizado
      window.renderCarrito?.();

      form.reset();
      if (msg) {
        msg.textContent = 'Producto agregado';
        msg.style.color = 'lightgreen';
        setTimeout(() => (msg.textContent = ''), 1500);
      }
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
        // feedback bonito (si está SweetAlert)
        if (window.Swal) {
          const p = productosList.find(x => x.id === id);
          if (p) Swal.fire({ toast:true, position:'top-end', timer:1200, showConfirmButton:false, icon:'success', title:`Agregado: ${esc(p.nombre)}` });
        }
      } else if (btn.classList.contains('view-details')) {
        const p = productosList.find(x => x.id === id);
        if (!p) return;
        if (window.Swal) {
          Swal.fire({
            title: esc(p.nombre),
            html: `<p style="margin:.25rem 0;">$ ${fmt(p.precio)} · ${esc(p.unidad)}</p>`,
            imageUrl: p.imagen || undefined,
            imageAlt: p.nombre,
            confirmButtonText: 'Cerrar'
          });
        } else {
          alert(`${p.nombre}\n$${fmt(p.precio)} · ${p.unidad}`);
        }
      }
    });
  }

  // ---------- Checkout ----------
  function bindCheckout() {
    const btn = $('#checkout-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const total = (typeof calcularTotalCarrito === 'function') ? calcularTotalCarrito() : 0;
      if (!total) { window.Swal?.fire({ icon:'info', title:'Tu carrito está vacío' }); return; }

      const { value: data } = await Swal.fire({
        title: 'Finalizar compra',
        html: `
          <input id="co-nombre" class="swal2-input" placeholder="Nombre *">
          <input id="co-email" type="email" class="swal2-input" placeholder="Email *">
          <input id="co-dir" class="swal2-input" placeholder="Dirección (opcional)">
          <p style="margin:.5rem 0 0;">Total: <strong>$ ${fmt(total)}</strong></p>
        `,
        focusConfirm: false,
        confirmButtonText: 'Confirmar',
        showCancelButton: true,
        preConfirm: () => {
          const nombre = $('#co-nombre').value.trim();
          const email  = $('#co-email').value.trim();
          if (!nombre || !email) {
            Swal.showValidationMessage('Completá nombre y email');
            return;
          }
          return { nombre, email, direccion: ($('#co-dir').value || '').trim() };
        }
      });

      if (data) {
        const nro = Date.now().toString().slice(-8);
        await Swal.fire({ icon:'success', title:'¡Compra confirmada!', text:`Orden #${nro}` });
        vaciarCarrito?.();
      }
    });
  }

  // ---------- Init ----------
  (async function init() {
    productosList = await loadProducts();

    // Espejo global para carrito.js
    window.productos = productosList;

    // Productos (si la página tiene grilla)
    renderProductos();
    bindProductGrid();
    bindAdminForm();

    // Carrito (si la página lo tiene)
    window.renderCarrito();
    bindCheckout(); // disponible en productos.html (aside) y carrito.html (página)
  })();
});

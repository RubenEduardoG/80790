let carrito = [];

// Función para agregar un producto
function agregarAlCarrito(productoId) {
  const producto = productos.find(p => p.id === productoId);
  carrito.push(producto);
  renderCarrito();
}

// Renderizar carrito
function renderCarrito() {
  const carritoHTML = document.getElementById("carrito");
  const totalHTML = document.getElementById("total");

  carritoHTML.innerHTML = "";
  carrito.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${item.nombre} - $${item.precio}`;
    carritoHTML.appendChild(li);
  });

  const total = carrito.reduce((acc, item) => acc + item.precio, 0);
  totalHTML.textContent = total;
}

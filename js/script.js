// Renderizar productos en pantalla
function renderProductos() {
  const productosHTML = document.getElementById("productos");

  // Vaciar antes de renderizar (por si se vuelve a llamar la función)
  productosHTML.innerHTML = "";

  productos.forEach(prod => {
    const div = document.createElement("div");
    div.className = "producto";
    div.innerHTML = `
      <h3>${prod.nombre}</h3>
      <p>Precio: $${prod.precio}</p>
      <button onclick="agregarAlCarrito(${prod.id})">Agregar</button>
    `;
    productosHTML.appendChild(div);
  });
}

// Ejecutar cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
  renderProductos();
});

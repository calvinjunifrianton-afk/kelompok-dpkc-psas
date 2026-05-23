const products = [

{
    id:1,
    game:"Mobile Legends",
    title:"Skin Sultan ML",
    price:1200000,
    image:"https://wallpapercave.com/wp/wp7252432.jpg"
},

{
    id:2,
    game:"Free Fire",
    title:"Akun Sultan FF",
    price:1500000,
    image:"https://wallpapercave.com/wp/wp7180409.jpg"
}

];

let cart = [];

window.onload = function(){

    renderProducts(products);

}

function renderProducts(data){

    const grid =
    document.getElementById("productGrid");

    grid.innerHTML = "";

    data.forEach(product => {

        grid.innerHTML += `

        <div class="card">

            <img src="${product.image}">

            <div class="card-body">

                <p>${product.game}</p>

                <h3>${product.title}</h3>

                <p class="price">
                    Rp ${product.price.toLocaleString("id-ID")}
                </p>

                <button onclick="addToCart(${product.id})">

                    Tambah ke Cart

                </button>

            </div>

        </div>

        `;

    });

}

function addToCart(id){

    const item =
    products.find(product => product.id === id);

    cart.push(item);

    document
    .getElementById("cartCount")
    .innerText = cart.length;

    showToast("Produk ditambahkan!");

}

function searchProduct(){

    const keyword =
    document
    .getElementById("searchInput")
    .value
    .toLowerCase();

    const filtered =
    products.filter(product =>

        product.title
        .toLowerCase()
        .includes(keyword)

    );

    renderProducts(filtered);

}

function showHome(){

    document
    .getElementById("homePage")
    .style.display = "block";

    document
    .getElementById("cartPage")
    .style.display = "none";

}

function showCart(){

    document
    .getElementById("homePage")
    .style.display = "none";

    document
    .getElementById("cartPage")
    .style.display = "block";

}

async function register(){
    // 1. Ambil data yang diketik user di form input
    const username = document.getElementById("regUser").value;
    const password = document.getElementById("regPass").value;

    // Validasi sederhana jika input kosong
    if (!username || !password) {
        return showToast("Username dan Password tidak boleh kosong!");
    }

    try {
        // 2. Kirim data tersebut ke API backend Node.js
        const response = await fetch("http://localhost:3000/api/register", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        // 3. Tampilkan pesan sukses / gagal dari server
        showToast(result.message);
        
        // Jika sukses, otomatis alihkan tampilan ke kotak login
        if (result.success) {
            showLogin();
        }
    } catch (error) {
        console.error("Error saat register:", error);
        showToast("Gagal menyambung ke server!");
    }
}

function login(){

    document
    .getElementById("authContainer")
    .classList.add("hidden");

    document
    .getElementById("mainApp")
    .classList.remove("hidden");

    showToast("Login berhasil!");

}

function logout(){

    location.reload();

}

function showLogin(){

    document
    .getElementById("registerBox")
    .classList.add("hidden");

    document
    .getElementById("loginBox")
    .classList.remove("hidden");

}

function showToast(message){

    const toast =
    document.getElementById("toast");

    toast.innerText = message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },2000);

}
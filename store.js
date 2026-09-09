async function loadStore() {

    // Read the "store" value from the URL, e.g. store.html?store=grace-painting
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("store");

    const loading = document.getElementById("storeLoading");
    const notFound = document.getElementById("storeNotFound");
    const content = document.getElementById("storeContent");

    if (!slug) {
        loading.style.display = "none";
        notFound.style.display = "block";
        return;
    }

    // This works even for visitors who are NOT logged in,
    // because of the public-read policy we added in Supabase.
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, business_name, business_description, product_type")
        .eq("store_slug", slug)
        .maybeSingle();

    loading.style.display = "none";

    if (error || !data) {
        notFound.style.display = "block";
        return;
    }

    document.getElementById("storeBusinessName").textContent =
        data.business_name || "Unnamed Business";

    document.getElementById("storeBusinessDescription").textContent =
        data.business_description || "";

    document.getElementById("storeProductType").textContent =
        data.product_type ? data.product_type.toUpperCase() : "";

    content.style.display = "block";

    // Now load this business's products (also public, via our
    // "Public can view products of published stores" policy).
    await loadStoreProducts(data.id);
}


async function loadStoreProducts(ownerId) {

    const { data: products, error } = await supabaseClient
        .from("products")
        .select("name, price, description, image_url")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: false });

    const storeProducts = document.getElementById("storeProducts");

    if (error || !products || products.length === 0) {
        storeProducts.innerHTML = "";
        return;
    }

    storeProducts.innerHTML = "<h3>Products</h3>";

    products.forEach((product) => {

        const item = document.createElement("div");
        item.className = "product-item";

        const priceText = product.price !== null
            ? `$${Number(product.price).toFixed(2)}`
            : "";

        const imageHtml = product.image_url
            ? `<img src="${product.image_url}" alt="${escapeHtml(product.name)}" style="width: 100%; max-width: 300px; height: auto; border-radius: 10px; margin-top: 12px; display: block;">`
            : "";

        item.innerHTML = `
            <div class="product-item-info" style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4>${escapeHtml(product.name)}</h4>
                        <p>${escapeHtml(product.description || "")}</p>
                    </div>
                    <span class="product-item-price">${priceText}</span>
                </div>
                ${imageHtml}
            </div>
        `;

        storeProducts.appendChild(item);
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

loadStore();

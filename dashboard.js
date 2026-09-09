let currentUserId = null;

// This runs as soon as the page loads, before showing anything.
async function checkLogin() {

    const { data, error } = await supabaseClient.auth.getSession();

    if (!data.session) {
        // Nobody is logged in — send them to the login page.
        window.location.href = "login.html";
        return;
    }

    currentUserId = data.session.user.id;

    // Show their email in the sidebar.
    const userEmail = document.getElementById("userEmail");
    userEmail.textContent = data.session.user.email;

       // Load everything saved about this user.
    await loadProfile();
    await loadProducts();
}

checkLogin();


// =========================
// LOAD PROFILE (product type + business info)
// =========================

async function loadProfile() {

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("product_type, business_name, business_description, store_slug")
        .eq("id", currentUserId)
        .maybeSingle();

    // --- Product type section ---
    const productSelection = document.getElementById("productSelection");
    const currentSelection = document.getElementById("currentSelection");
    const selectedTypeText = document.getElementById("selectedTypeText");

    if (data && data.product_type) {
        selectedTypeText.textContent = data.product_type;
        currentSelection.style.display = "block";
        productSelection.style.display = "none";
    } else {
        currentSelection.style.display = "none";
        productSelection.style.display = "block";
    }

    // --- Business info form (pre-fill if already saved) ---
    if (data && data.business_name) {
        document.getElementById("businessName").value = data.business_name;
    }
    if (data && data.business_description) {
        document.getElementById("businessDescription").value = data.business_description;
    }
        if (data && data.store_slug) {
        document.getElementById("storeSlug").value = data.store_slug;
        showStoreLinkPreview(data.store_slug);
    }


    // --- Overview section ---
    const overviewBusinessName = document.querySelector("#overviewBusinessName span");
    const overviewProductType = document.querySelector("#overviewProductType span");

    overviewBusinessName.textContent =
        (data && data.business_name) ? data.business_name : "Not set yet";

    overviewProductType.textContent =
        (data && data.product_type) ? data.product_type : "Not set yet";
}


// =========================
// SAVE PRODUCT TYPE (when a card is clicked)
// =========================

const productOptions = document.querySelectorAll(".product-type-option");

productOptions.forEach((card) => {

    card.addEventListener("click", async () => {

        const chosenType = card.getAttribute("data-type");

        const { error } = await supabaseClient
            .from("profiles")
            .upsert({ id: currentUserId, product_type: chosenType });

        if (error) {
            alert("Something went wrong saving your choice: " + error.message);
            return;
        }

        await loadProfile();
    });

});


// =========================
// "CHANGE" BUTTON (product type)
// =========================

const changeSelectionButton = document.getElementById("changeSelectionButton");

changeSelectionButton.addEventListener("click", () => {
    document.getElementById("currentSelection").style.display = "none";
    document.getElementById("productSelection").style.display = "block";
});


// =========================
// SAVE BUSINESS INFO
// =========================

const businessForm = document.getElementById("businessForm");

businessForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const businessName = document.getElementById("businessName").value;
    const businessDescription = document.getElementById("businessDescription").value;
    const storeSlug = document.getElementById("storeSlug").value.trim();
    const businessMessage = document.getElementById("businessMessage");

    // Validate the slug format: lowercase letters, numbers, and dashes only
    const slugPattern = /^[a-z0-9-]+$/;

    if (storeSlug && !slugPattern.test(storeSlug)) {
        businessMessage.textContent =
            "Store URL can only contain lowercase letters, numbers, and dashes (no spaces).";
        return;
    }

    businessMessage.textContent = "Saving...";

    const { error } = await supabaseClient
        .from("profiles")
        .upsert({
            id: currentUserId,
            business_name: businessName,
            business_description: businessDescription,
            store_slug: storeSlug || null
        });

    if (error) {
        if (error.code === "23505") {
            businessMessage.textContent =
                "That store URL is already taken — please choose a different one.";
        } else {
            businessMessage.textContent = "Something went wrong: " + error.message;
        }
        return;
    }

    businessMessage.textContent = "Saved!";

    if (storeSlug) {
        showStoreLinkPreview(storeSlug);
    }

    await loadProfile();
});


function showStoreLinkPreview(slug) {
    const preview = document.getElementById("storeLinkPreview");
    const url = `store.html?store=${slug}`;
    preview.innerHTML = `Your public store link: <a href="${url}" target="_blank">${url}</a>`;
}

// =========================
// PRODUCTS
// =========================

async function loadProducts() {

    const { data, error } = await supabaseClient
        .from("products")
        .select("id, name, price, description, image_url")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

    const productList = document.getElementById("productList");
    productList.innerHTML = "";

    if (error) {
        productList.textContent = "Couldn't load products right now.";
        return;
    }

    if (!data || data.length === 0) {
        productList.innerHTML = "<p>No products added yet.</p>";
        return;
    }

    data.forEach((product) => {

        const item = document.createElement("div");
        item.className = "product-item";

                 const priceText = product.price !== null
            ? `$${Number(product.price).toFixed(2)}`
            : "";

                const imageHtml = product.image_url
            ? `<p style="color: red; font-weight: bold;">TEST123 - image_url is: ${product.image_url}</p>`
            : `<p style="color: red; font-weight: bold;">TEST123 - no image_url</p>`;
            

        item.innerHTML = `
            <div class="product-item-info" style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4>${escapeHtml(product.name)}</h4>
                        <p>${escapeHtml(product.description || "")}</p>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <span class="product-item-price">${priceText}</span>
                        <button class="product-delete-button" data-id="${product.id}">Delete</button>
                    </div>
                </div>
                ${imageHtml}
            </div>
        
        `;

        item.innerHTML = `
            <div class="product-item-info">
                <h4>${escapeHtml(product.name)}</h4>
                <p>${escapeHtml(product.description || "")}</p>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <span class="product-item-price">${priceText}</span>
                <button class="product-delete-button" data-id="${product.id}">Delete</button>
            </div>
        `;

        productList.appendChild(item);
    });

    // Wire up all the delete buttons we just created.
    document.querySelectorAll(".product-delete-button").forEach((button) => {
        button.addEventListener("click", async () => {
            const productId = button.getAttribute("data-id");
            await deleteProduct(productId);
        });
    });
}

// Very small helper to avoid raw user text breaking the page layout.
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

const productForm = document.getElementById("productForm");

productForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("productName").value;
    const priceValue = document.getElementById("productPrice").value;
    const description = document.getElementById("productDescription").value;
    const imageFile = document.getElementById("productImage").files[0];
    const productMessage = document.getElementById("productMessage");

    const price = priceValue ? parseFloat(priceValue) : null;

    let imageUrl = null;

    if (imageFile) {

        productMessage.textContent = "Uploading image...";

        // Path MUST start with the user's own ID to match our storage policy.
        const filePath = `${currentUserId}/${Date.now()}-${imageFile.name}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from("product-images")
            .upload(filePath, imageFile);

        if (uploadError) {
            productMessage.textContent = "Image upload failed: " + uploadError.message;
            return;
        }

        const { data: publicUrlData } = supabaseClient
            .storage
            .from("product-images")
            .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
    }

    productMessage.textContent = "Adding...";

    const { error } = await supabaseClient
        .from("products")
        .insert({
            user_id: currentUserId,
            name: name,
            price: price,
            description: description,
            image_url: imageUrl
        });

    if (error) {
        productMessage.textContent = "Something went wrong: " + error.message;
        return;
    }

    productMessage.textContent = "Product added!";
    productForm.reset();
    await loadProducts();
});

async function deleteProduct(productId) {

    const { error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", productId);

    if (error) {
        alert("Couldn't delete this product: " + error.message);
        return;
    }

    await loadProducts();
}

// =========================
// LOG OUT
// =========================

const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
});


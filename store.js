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
        .select("business_name, business_description, product_type")
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
}

loadStore();
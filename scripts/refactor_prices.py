import os
import re

# List of files from grep results
files = [
    "src/shared/components/MiniCartRow.tsx",
    "src/features/cart/pages/CartPage.tsx",
    "src/features/cart/pages/CheckoutPage.tsx",
    "src/features/stores/pages/StoreDetailsPage.tsx",
    "src/features/users/pages/ProfilePage.tsx",
    "src/features/laundry/pages/LaundryPage.tsx",
    "src/features/tracking/pages/OrderTrackingPage.tsx",
    "src/features/favorites/pages/FavoritesPage.tsx",
    "src/features/food/pages/FoodPage.tsx",
    "src/features/home/pages/HomePage.tsx",
    "src/features/orders/pages/OrdersPage.tsx",
    "src/features/discovery/pages/DiscoveryPage.tsx",
    "src/features/products/pages/ProductsPage.tsx",
    "src/features/products/pages/ProductDetailPage.tsx",
]

base_dir = "/home/zalongwa/taskplace/Tulete-Client-New/tulete_web_app"

patterns = [
    (re.compile(r"\{rowTotal\.toLocaleString\(\)\}"), r"{formatPrice(rowTotal)}"),
    (re.compile(r"\{itemTotal\.toLocaleString\(\)\}"), r"{formatPrice(itemTotal)}"),
    (re.compile(r"\{subtotal\.toLocaleString\(\)\}"), r"{formatPrice(subtotal)}"),
    (re.compile(r"\{deliveryFee\.toLocaleString\(\)\}"), r"{formatPrice(deliveryFee)}"),
    (re.compile(r"\{total\.toLocaleString\(\)\}"), r"{formatPrice(total)}"),
    (re.compile(r"\{finalTotalWithDelivery\.toLocaleString\(\)\}"), r"{formatPrice(finalTotalWithDelivery)}"),
    (re.compile(r"\{prod\.price\.toLocaleString\(\)\}"), r"{formatPrice(prod.price)}"),
    (re.compile(r"\{prod\.oldprice\.toLocaleString\(\)\}"), r"{formatPrice(prod.oldprice)}"),
    (re.compile(r"\{cartTotal\.toLocaleString\(\)\}"), r"{formatPrice(cartTotal)}"),
    (re.compile(r"\(\(profile\.totalSpent \|\| 0\)\.toLocaleString\(\)\)"), r"formatPrice(profile.totalSpent || 0)"),
    (re.compile(r"\{Math\.round\(livePrice\)\.toLocaleString\(\)\}"), r"{formatPrice(livePrice)}"),
    (re.compile(r"\{calculateItemTotal\(cartItem\)\.toLocaleString\(\)\}"), r"{formatPrice(calculateItemTotal(cartItem))}"),
    (re.compile(r"\{order\.totalAmount\.toLocaleString\(\)\}"), r"{formatPrice(order.totalAmount)}"),
    (re.compile(r"\{fav\.price\.toLocaleString\(\)\}"), r"{formatPrice(fav.price)}"),
    (re.compile(r"\{item\.price\.toLocaleString\(\)\}"), r"{formatPrice(item.price)}"),
    (re.compile(r"\{rec\.price\.toLocaleString\(\)\}"), r"{formatPrice(rec.price)}"),
    (re.compile(r"\{dynamicPrice\.toLocaleString\(\)\}"), r"{formatPrice(dynamicPrice)}"),
    (re.compile(r"\{magicPrice\.toLocaleString\(\)\}"), r"{formatPrice(magicPrice)}"),
    (re.compile(r"\{magicOldPrice\.toLocaleString\(\)\}"), r"{formatPrice(magicOldPrice)}"),
]

for file_path in files:
    full_path = os.path.join(base_dir, file_path)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue
        
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content
    
    # Calculate depth for relative import
    # e.g., src/features/cart/pages/CartPage.tsx -> 4 parts -> 3 levels up
    parts = file_path.split("/")
    depth = len(parts) - 2 # -1 for file, -1 for src
    # Wait, if we use absolute path with src/ it might be easier. Let's just use relative path calculation:
    # "src/shared/components/MiniCartRow.tsx" -> depth 3
    # Actually, calculating it is:
    relative_prefix = "../" * (len(parts) - 2) if len(parts) > 2 else "./"
    if "shared/utils" not in file_path:
        import_stmt = f"import {{ formatPrice }} from '{relative_prefix}shared/utils/formatPrice';"
        if file_path.startswith("src/shared/"):
            # from src/shared/components/MiniCartRow.tsx to src/shared/utils/formatPrice
            # 2 levels up -> ../utils/formatPrice
            import_stmt = f"import {{ formatPrice }} from '../utils/formatPrice';"
            
    # simpler approach: just find out if we need to add import. We can use a simpler relative import logic:
    # Let's count the number of slashes after src/.
    # "src/features/cart/pages/CartPage.tsx" -> 4 slashes -> "../../../shared/utils/formatPrice"
    slashes = file_path.count('/') - 1
    import_path = ("../" * slashes) + "shared/utils/formatPrice"
    
    import_stmt = f"import {{ formatPrice }} from '{import_path}';"

    for pattern, repl in patterns:
        content = pattern.sub(repl, content)
        
    if content != original_content:
        # Add import at the top of the file if not already there
        if "import { formatPrice }" not in content:
            # find first import
            import_idx = content.find("import ")
            if import_idx != -1:
                content = content[:import_idx] + import_stmt + "\n" + content[import_idx:]
            else:
                content = import_stmt + "\n\n" + content
                
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")

print("Done")

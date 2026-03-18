import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Import semua file JSON Anda
import customersData from '../data/customers.json';
import kingdomsData from '../data/kingdoms.json';
import accountsData from '../data/game_accounts.json';
import charactersData from '../data/characters.json';
import ordersData from '../data/orders.json';
import orderItemsData from '../data/order_items.json';

export const runMigration = async () => {
  try {
    console.log("Memulai proses migrasi dari SQLite ke Firebase...");

    // 1. Migrasi Kingdoms (Menggunakan ID asli dari SQLite)
    for (const item of kingdomsData) {
      // Kita pakai setDoc dan mengubah ID angka menjadi string agar relasi tetap terjaga
      await setDoc(doc(db, "kingdoms", item.id.toString()), {
        server_number: item.server_number,
        name: item.name || `Kingdom ${item.server_number}`,
        created_at: serverTimestamp(),
      });
    }
    console.log(`✅ ${kingdomsData.length} Kingdoms berhasil dimigrasi.`);

    // 2. Migrasi Customers
    // 2. Migrasi Customers
        for (const item of customersData) {
        await setDoc(doc(db, "customers", item.id.toString()), {
            name: item.name || "Anonim", // Tambahkan fallback ini
            whatsapp: item.whatsapp || "",
            created_at: serverTimestamp(),
        });
        }
    console.log(`✅ ${customersData.length} Customers berhasil dimigrasi.`);

    // 3. Migrasi Game Accounts
    for (const item of accountsData) {
      await setDoc(doc(db, "game_accounts", item.id.toString()), {
        // Coba baca item.email, jika tidak ada coba item.account_email, jika tidak ada juga beri teks default
        email: item.email || item.account_email || "tanpa_email@domain.com",
        login_method: item.login_method || "unknown",
        status: item.status || "active",
        notes: item.notes || "",
        created_at: serverTimestamp(),
      });
    }
    console.log(`✅ ${accountsData.length} Game Accounts berhasil dimigrasi.`);

    // 4. Migrasi Characters
    for (const item of charactersData) {
      await setDoc(doc(db, "characters", item.id.toString()), {
        game_account_id: item.game_account_id ? item.game_account_id.toString() : null,
        kingdom_id: item.kingdom_id ? item.kingdom_id.toString() : null,
        name: item.ign || "Unknown", // Menggunakan ign sebagai name
        power: item.power || 0,
        status: item.status || "ready",
        created_at: serverTimestamp(),
      });
    }
    console.log(`✅ ${charactersData.length} Characters berhasil dimigrasi.`);

    // 5. Migrasi Orders & Menggabungkan Order Items
    for (const order of ordersData) {
      // Cari semua item di order_items.json yang memiliki order_id sama dengan order ini
      const relatedItems = orderItemsData.filter(item => item.order_id === order.id);

      // Format ulang data item tersebut
      const formattedItems = relatedItems.map(item => ({
        item_id: item.id?.toString() ?? null, // Simpan ID asli item
        target_character_id: item.target_character_id ? item.target_character_id.toString() : null,
        resource_type: item.resource_type ?? null,
        quantity: item.quantity ?? 0,
        price: item.price ?? 0,
        status: item.status || 'pending'
      }));

      // Simpan pesanan beserta array items-nya ke Firestore
      await setDoc(doc(db, "orders", order.id.toString()), {
        order_number: order.order_number || `ORD-${order.id}`,
        customer_id: order.customer_id ? order.customer_id.toString() : null,
        total_amount: order.total_amount ?? 0,
        status: order.status || 'pending',
        payment_status: order.payment_status || 'unpaid',
        payment_method: order.payment_method || "",
        notes: order.notes || "",
        items: formattedItems, // Array dari item-item yang sudah difilter di atas
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }
    console.log(`✅ ${ordersData.length} Orders (beserta Items) berhasil dimigrasi.`);

    alert("Migrasi Seluruh Data (Termasuk Orders) Berhasil! Silakan cek Firebase Console.");
  } catch (error) {
    console.error("Gagal melakukan migrasi:", error);
    alert("Error saat migrasi: " + error.message);
  }
};
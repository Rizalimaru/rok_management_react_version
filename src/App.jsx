import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
// 1. IMPORT KOMPONEN HALAMAN BARU DI SINI
import GameAccounts from "./pages/GameAccounts"; // Sesuaikan path-nya jika Anda memasukkannya ke folder /pages
import Characters from "./pages/Characters"; // Sesuaikan path-nya jika Anda memasukkannya ke folder /pages

function App() {
  return (
    <Router>
      <Routes>
        {/* Rute untuk halaman Login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard diubah menjadi parent route (tanpa /*) */}
        <Route path="/" element={<Dashboard />}>
          
          {/* 2. DAFTARKAN SUB-ROUTE DI DALAM DASHBOARD */}
          <Route path="game-accounts" element={<GameAccounts />} />

          <Route path="characters" element={<Characters />} />
          
          {/* Nanti jika Anda membuat halaman Orders, daftarkan di sini juga */}
          {/* <Route path="orders" element={<Orders />} /> */}
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
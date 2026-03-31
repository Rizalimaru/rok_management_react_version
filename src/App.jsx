import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
// Pastikan semua halaman di-import
import GameAccounts from "./pages/GameAccounts";
import Characters from "./pages/Characters";
import Kingdoms from "./pages/Kingdoms";
import Customers from "./pages/Customers";
import Orders from "./pages/Order";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Dashboard sebagai parent route */}
        <Route path="/" element={<Dashboard />}>
          {/* Index route untuk halaman utama dashboard (/) */}
          <Route index element={
            <div>
              <h2>Selamat Datang di Dashboard Admin</h2>
              <p>Pilih menu di sebelah kiri untuk mulai mengelola data Anda.</p>
            </div>
          } />
          
          {/* Child routes yang akan merender konten di dalam <Outlet /> */}
          <Route path="game-accounts" element={<GameAccounts />} />
          <Route path="characters" element={<Characters />} />
          <Route path="kingdoms" element={<Kingdoms />} />
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
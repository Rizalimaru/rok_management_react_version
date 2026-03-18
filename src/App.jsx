import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import GameAccounts from "./pages/GameAccounts";
import Characters from "./pages/Characters";
import Kingdoms from "./pages/Kingdoms"; // 1. Tambahkan Import ini

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Dashboard />}>
          <Route index element={
            <div>
              <h2>Selamat Datang di Dashboard Admin</h2>
              <p>Pilih menu di sebelah kiri untuk mulai mengelola data Rise of Kingdoms Anda.</p>
            </div>
          } />
          
          <Route path="game-accounts" element={<GameAccounts />} />
          <Route path="characters" element={<Characters />} />
          
          {/* 2. Tambahkan Route untuk Kingdoms di sini */}
          <Route path="kingdoms" element={<Kingdoms />} />
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
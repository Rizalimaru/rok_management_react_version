import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { runMigration } from '../utils/seedDatabase'; // Perbaikan nama ekspor dari 'runSeeder' menjadi 'runMigration'
import { Layout, Menu, Button, Typography, Dropdown, Avatar, theme, message } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  DashboardOutlined, 
  ShoppingCartOutlined, 
  UserOutlined, 
  TeamOutlined, 
  GlobalOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mengambil token warna bawaan Ant Design agar UI konsisten
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  // Mengecek status login user secara real-time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Jika belum login atau token kedaluwarsa, lempar kembali ke Login
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fungsi Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      message.success('Berhasil logout');
      navigate('/login');
    } catch (error) {
      message.error('Gagal logout: ' + error.message);
    }
  };

  // Menu Dropdown Profil di pojok kanan atas
  const profileMenu = {
    items: [
      {
        key: '1',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: handleLogout,
        danger: true,
      },
    ],
  };

  // Konfigurasi Menu Sidebar (Berdasarkan Resource Filament Anda sebelumnya)
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard Overview</Link>,
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/orders">Orders</Link>,
    },
    {
      key: '/game-accounts',
      icon: <UserOutlined />,
      label: <Link to="/game-accounts">Game Accounts</Link>,
    },
    {
      key: '/characters',
      icon: <TeamOutlined />,
      label: <Link to="/characters">Characters</Link>,
    },
    {
      key: '/kingdoms',
      icon: <GlobalOutlined />,
      label: <Link to="/kingdoms">Kingdoms</Link>,
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: <Link to="/customers">Customers</Link>,
    },
  ];

  // Tampilkan loading screen kosong selagi mengecek auth Firebase
  if (!user) return <div style={{ minHeight: '100vh', background: '#f5f5f5' }}></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="dark" // Ganti ke "light" jika ingin sidebar terang
        style={{ background: '#001529' }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Title level={4} style={{ color: '#fff', margin: 0, transition: 'all 0.3s' }}>
            {collapsed ? 'RoK' : 'RoK Portal'}
          </Title>
        </div>
        
        {/* Active menu menyesuaikan dengan URL saat ini */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ marginTop: '16px' }}
        />
      </Sider>

      {/* KONTEN UTAMA */}
      <Layout>
        {/* HEADER */}
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          zIndex: 1
        }}>
          {/* Tombol Toggle Sidebar */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64, marginLeft: '-24px' }}
          />

          {/* Profil User */}
          <Dropdown menu={profileMenu} placement="bottomRight" arrow>
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <div style={{ textAlign: 'right', display: collapsed ? 'none' : 'block' }}>
                <Text strong style={{ display: 'block', lineHeight: '1.2' }}>Admin</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>{user.email}</Text>
              </div>
              <Avatar style={{ backgroundColor: '#d1a054' }} icon={<UserOutlined />} />
            </div>
          </Dropdown>
        </Header>

        {/* KONTEN DINAMIS / HALAMAN */}
        <Content style={{ margin: '24px 16px', padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          
          {/* Outlet adalah tempat di mana child-route akan dirender. 
              Jika di halaman root (/), kita tampilkan teks selamat datang sementara. */}
          {location.pathname === '/' ? (
            <div>
              <Title level={3}>Selamat Datang di Dashboard Admin</Title>
              <Text>Pilih menu di sebelah kiri untuk mulai mengelola data Rise of Kingdoms Anda.</Text>
              <br /><br />
                {/* Tombol Seeder Sementara */}
                <Button type="primary" danger onClick={runMigration}>
                Jalankan Seeder Database (Klik 1x Saja)
                </Button>
            </div>
          ) : (
            <Outlet /> 
          )}

        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Dropdown, Avatar, theme, message, Card, Row, Col, Statistic, Space, Switch } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  DashboardOutlined, 
  ShoppingCartOutlined, 
  UserOutlined, 
  TeamOutlined, 
  GlobalOutlined,
  LogoutOutlined,
  ArrowUpOutlined,
  BellOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase'; 
import { collection, onSnapshot } from 'firebase/firestore';
import AdminChat from '../components/AdminChat';
import { ThemeContext } from '../context/ThemeContext';

// HAPUS import kingdomsData dari JSON

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  
  // State untuk menyimpan semua data statistik
  const [stats, setStats] = useState({ 
    income: 0, 
    pendingOrders: 0, 
    activeAccounts: 0,
    totalCustomers: 0,
    totalKingdoms: 0,
    totalCharacters: 0
  });
  
  const [characters, setCharacters] = useState([]);
  // TAMBAHKAN state untuk kingdoms
  const [kingdoms, setKingdoms] = useState([]);

  // UBAH fungsi getKingdom menggunakan state kingdoms terbaru
  const getKingdomName = (kingdomId) => {
    const kingdom = kingdoms.find(k => String(k.id) === String(kingdomId));
    return kingdom ? (kingdom.server_number || kingdom.name || '-') : '-';
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    const n = Number(num);
    if (n >= 1000000) return parseFloat((n / 1000000).toFixed(2)) + 'M';
    if (n >= 1000) return parseFloat((n / 1000).toFixed(2)) + 'K';
    return n.toLocaleString('id-ID');
  };

  const resourceTotalsPerKingdom = useMemo(() => {
    const totals = {};
    characters.forEach((char) => {
      const kingdom = getKingdomName(char.kingdom_id);
      if (!totals[kingdom]) {
        totals[kingdom] = { food: 0, wood: 0, stone: 0, gold: 0 };
      }
      totals[kingdom].food += Number(char.resources?.food || 0);
      totals[kingdom].wood += Number(char.resources?.wood || 0);
      totals[kingdom].stone += Number(char.resources?.stone || 0);
      totals[kingdom].gold += Number(char.resources?.gold || 0);
    });
    return totals;
  }, [characters, kingdoms]); // tambahkan kingdoms sebagai dependency

  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  // 1. Cek Status Autentikasi User
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const unsubCharacters = onSnapshot(collection(db, 'characters'), (snapshot) => {
      setCharacters(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    });
    return () => unsubCharacters();
  }, []);

  // 2. Mengambil Semua Data Statistik secara Real-time
  useEffect(() => {
    if (!user) return;

    // Snapshot Orders (Omset & Pending)
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      let income = 0;
      let pendingOrders = 0;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.status === 'pending' || data.status === 'processing') {
          pendingOrders++;
        }

        if (data.status === 'completed' && data.created_at) {
          const createdAt = data.created_at.toDate ? data.created_at.toDate() : new Date(data.created_at);
          if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
            income += Number(data.total_price || 0);
          }
        }
      });
      setStats(prev => ({ ...prev, income, pendingOrders }));
    });

    // Snapshot Game Accounts (Akun Aktif)
    const unsubAccounts = onSnapshot(collection(db, 'game_accounts'), (snapshot) => {
      let activeAccounts = 0;
      snapshot.forEach((doc) => {
        if (doc.data().status === 'active') activeAccounts++;
      });
      setStats(prev => ({ ...prev, activeAccounts }));
    });

    // Snapshot Customers (Total Pelanggan)
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setStats(prev => ({ ...prev, totalCustomers: snapshot.size }));
    });

    // Snapshot Characters (Total Karakter)
    const unsubCharactersCount = onSnapshot(collection(db, 'characters'), (snapshot) => {
      setStats(prev => ({ ...prev, totalCharacters: snapshot.size }));
    });

    // Snapshot Kingdoms (Fetch Data & Total Server/Kingdom)
    const unsubKingdoms = onSnapshot(collection(db, 'kingdoms'), (snapshot) => {
      let fetchedKingdoms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Update data kingdoms state
      setKingdoms(fetchedKingdoms);
      // Update totalKingdoms di stats
      setStats(prev => ({ ...prev, totalKingdoms: snapshot.size }));
    });

    // Bersihkan semua listener ketika komponen unmount
    return () => {
      unsubOrders();
      unsubAccounts();
      unsubCustomers();
      unsubCharactersCount();
      unsubKingdoms();
    };
  }, [user]);

  // Handler Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      message.success('Berhasil logout');
      navigate('/login');
    } catch (error) {
      message.error('Gagal logout: ' + error.message);
    }
  };

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

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard Overview</Link> },
    { key: '/orders', icon: <ShoppingCartOutlined />, label: <Link to="/orders">Orders</Link> },
    { key: '/game-accounts', icon: <UserOutlined />, label: <Link to="/game-accounts">Game Accounts</Link> },
    { key: '/characters', icon: <TeamOutlined />, label: <Link to="/characters">Characters</Link> },
    { key: '/kingdoms', icon: <GlobalOutlined />, label: <Link to="/kingdoms">Kingdoms</Link> },
    { key: '/customers', icon: <IdcardOutlined />, label: <Link to="/customers">Customers</Link> },
  ];

  if (!user) return <div style={{ minHeight: '100vh', background: '#f5f5f5' }}></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="dark"
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
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64, marginLeft: '-24px' }}
          />

          <Space size="large" align="center">
            <Switch 
              checked={isDarkMode} 
              onChange={toggleTheme} 
              checkedChildren="🌙" 
              unCheckedChildren="☀️" 
            />
            <Dropdown menu={profileMenu} placement="bottomRight" arrow>
              <Space align="center" style={{ cursor: 'pointer', gap: '8px' }}>
                <div style={{ textAlign: 'right', display: collapsed ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 140 }}>
                  <Text strong style={{ display: 'block', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>Admin</Text>
                  <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{user.email}</Text>
                </div>
                <Avatar style={{ backgroundColor: '#d1a054' }} icon={<UserOutlined />} />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* KONTEN DINAMIS / HALAMAN */}
        <Content style={{ margin: '24px 16px', padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          
          {location.pathname === '/' ? (
            <div>
              <Title level={4} style={{ marginBottom: 24 }}>Dashboard Overview</Title>
              
              {/* === BARIS 1: METRIK BISNIS UTAMA === */}
              <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                <Col xs={24} sm={12} md={8}>
                  <Card bordered={true} style={{ borderLeft: '4px solid #52c41a' }}>
                    <Statistic
                      title={<Text type="secondary">Omset Bulan Ini</Text>}
                      value={stats.income}
                      precision={0}
                      valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                      prefix={<ArrowUpOutlined />}
                      formatter={(value) => `Rp ${new Intl.NumberFormat('id-ID').format(value)}`}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Total order selesai bulan ini</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card bordered={true} style={{ borderLeft: `4px solid ${stats.pendingOrders > 0 ? '#ff4d4f' : '#52c41a'}` }}>
                    <Statistic
                      title={<Text type="secondary">Order Perlu Proses</Text>}
                      value={stats.pendingOrders}
                      valueStyle={{ color: stats.pendingOrders > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}
                      prefix={<BellOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Status Pending & Processing</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card bordered={true} style={{ borderLeft: '4px solid #1677ff' }}>
                    <Statistic
                      title={<Text type="secondary">Farm Accounts Aktif</Text>}
                      value={stats.activeAccounts}
                      valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                      prefix={<UserOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Akun yang siap digunakan</Text>
                  </Card>
                </Col>
              </Row>

              {/* === BARIS 2: METRIK DATA SISTEM === */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card bordered={true} style={{ borderLeft: '4px solid #722ed1' }}>
                    <Statistic
                      title={<Text type="secondary">Total Pelanggan</Text>}
                      value={stats.totalCustomers}
                      valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                      prefix={<IdcardOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Pelanggan terdaftar dalam sistem</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card bordered={true} style={{ borderLeft: '4px solid #fa8c16' }}>
                    <Statistic
                      title={<Text type="secondary">Total Karakter (Farm)</Text>}
                      value={stats.totalCharacters}
                      valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                      prefix={<TeamOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Karakter yang dikelola</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card bordered={true} style={{ borderLeft: '4px solid #13c2c2' }}>
                    <Statistic
                      title={<Text type="secondary">Total Kingdoms</Text>}
                      value={stats.totalKingdoms}
                      valueStyle={{ color: '#13c2c2', fontWeight: 'bold' }}
                      prefix={<GlobalOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Server yang dikelola saat ini</Text>
                  </Card>
                </Col>
              </Row>

              {/* === BARIS 3: TOTAL RESOURCE PER KINGDOM === */}
              {Object.keys(resourceTotalsPerKingdom).length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <Title level={5} style={{ marginBottom: 16 }}>Total Resource per Kingdom</Title>
                  <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                    {/* Mengurutkan Object Entries berdasarkan nama kingdom (angka) agar tampil dari terkecil ke terbesar */}
                    {Object.entries(resourceTotalsPerKingdom)
                      .sort(([kingA], [kingB]) => {
                        const numA = parseInt(kingA);
                        const numB = parseInt(kingB);
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return String(kingA).localeCompare(String(kingB));
                      })
                      .map(([kingdom, res]) => (
                      <Col xs={24} sm={12} md={8} lg={6} key={kingdom}>
                        <Card size="small" title={`Server ${kingdom}`} bordered={true} style={{ borderTop: '3px solid #d1a054' }}>
                          <Row justify="space-between" style={{ marginBottom: 4 }}>
                            <Text>Food 🌽</Text><Text strong>{formatNumber(res.food)}</Text>
                          </Row>
                          <Row justify="space-between" style={{ marginBottom: 4 }}>
                            <Text>Wood 🪵</Text><Text strong>{formatNumber(res.wood)}</Text>
                          </Row>
                          <Row justify="space-between" style={{ marginBottom: 4 }}>
                            <Text>Stone 🪨</Text><Text strong>{formatNumber(res.stone)}</Text>
                          </Row>
                          <Row justify="space-between">
                            <Text>Gold 🪙</Text><Text strong>{formatNumber(res.gold)}</Text>
                          </Row>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </div>
          ) : (
            <Outlet /> 
          )}

        </Content>
      </Layout>
      <AdminChat user={user} />
    </Layout>
  );
};

export default Dashboard;
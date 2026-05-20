import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Dropdown, Avatar, theme, message, Card, Row, Col, Statistic, Space, Switch, Progress, Tag, Drawer } from 'antd';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [collapsed, setCollapsed] = useState(window.innerWidth < 992); // Auto collapse on load for mobile
  const [user, setUser] = useState(null);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [kingdoms, setKingdoms] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

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

  const kingdomOverviews = useMemo(() => {
    const data = {};
    kingdoms.forEach(k => {
      data[k.id] = {
        id: k.id,
        name: k.server_number ? `Server ${k.server_number}` : (k.name || 'Unknown'),
        rawStock: { food: 0, wood: 0, stone: 0, gold: 0 },
        lastUpdateDate: null,
        lastUpdateMs: 0,
        reservedDemands: { food: 0, wood: 0, stone: 0, gold: 0 },
        totalPendingOrders: 0,
        monthlyOrdersCount: 0
      };
    });

    characters.forEach(char => {
      const kd = char.kingdom_id;
      if (kd && data[kd]) {
        data[kd].rawStock.food += Number(char.resources?.food || 0);
        data[kd].rawStock.wood += Number(char.resources?.wood || 0);
        data[kd].rawStock.stone += Number(char.resources?.stone || 0);
        data[kd].rawStock.gold += Number(char.resources?.gold || 0);

        if (char.updated_at) {
          const updMs = char.updated_at.toDate ? char.updated_at.toDate().getTime() : new Date(char.updated_at).getTime();
          if (updMs > data[kd].lastUpdateMs) {
            data[kd].lastUpdateMs = updMs;
            data[kd].lastUpdateDate = char.updated_at.toDate ? char.updated_at.toDate() : new Date(char.updated_at);
          }
        }
      }
    });

    ordersList.forEach(order => {
      const kd = order.kingdom_id;
      if (kd && data[kd]) {
        // --- LOGIKA 1: Hitung Semua Transaksi di Bulan Berlaku (Untuk Leaderboard) ---
        let orderCreatedMonth = -1;
        let orderCreatedYear = -1;
        if (order.created_at) {
          const dt = order.created_at.toDate ? order.created_at.toDate() : new Date(order.created_at);
          orderCreatedMonth = dt.getMonth();
          orderCreatedYear = dt.getFullYear();
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if (orderCreatedMonth === currentMonth && orderCreatedYear === currentYear) {
          data[kd].monthlyOrdersCount += 1;
        }

        // --- LOGIKA 2: Hitung Pending & Reserve Orders ---
        if (order.status === 'pending' || order.status === 'processing') {
          data[kd].totalPendingOrders += 1;

          const createdMs = order.created_at?.toDate ? order.created_at.toDate().getTime() : 0;
          if (createdMs > data[kd].lastUpdateMs) {
            order.items?.forEach(item => {
              const resType = item.resource_type?.toLowerCase();
              if (['food', 'wood', 'stone', 'gold'].includes(resType)) {
                // Cadangkan sisa pengiriman dari order ini dari dashboard stock kita
                const remainingAmount = Math.max(0, Number(item.amount || 0) - Number(item.amount_filled || 0));
                data[kd].reservedDemands[resType] += remainingAmount;
              }
            });
          }
        }
      }
    });

    return Object.values(data);
  }, [characters, kingdoms, ordersList]);

  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG, colorBorderSecondary } } = theme.useToken();

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
      const currentOrders = [];

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      snapshot.forEach((doc) => {
        const data = doc.data();
        currentOrders.push({ id: doc.id, ...data });

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
      setOrdersList(currentOrders);
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
      {!isMobile ? (
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
      ) : (
        <Drawer
          placement="left"
          onClose={() => setCollapsed(true)}
          open={!collapsed}
          styles={{ body: { padding: 0, background: '#001529' }, header: { background: '#001529', borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
          title={<Title level={4} style={{ color: '#fff', margin: 0 }}>RoK Portal</Title>}
          width={250}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ marginTop: '16px' }}
            onClick={() => setCollapsed(true)}
          />
        </Drawer>
      )}

      {/* KONTEN UTAMA */}
      <Layout>
        {/* HEADER */}
        <Header style={{
          padding: isMobile ? '0 16px' : '0 24px',
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
            style={{ fontSize: '16px', width: isMobile ? 40 : 64, height: 64, marginLeft: isMobile ? 0 : '-24px' }}
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
                <div style={{ textAlign: 'right', display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: isMobile ? 'auto' : 140 }}>
                  <Text strong style={{ display: 'block', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>Admin</Text>
                  <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{user.email}</Text>
                </div>
                <Avatar style={{ backgroundColor: '#d1a054' }} icon={<UserOutlined />} />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* KONTEN DINAMIS / HALAMAN */}
        <Content style={{ margin: isMobile ? '16px 8px' : '24px 16px', padding: isMobile ? 12 : 24, background: colorBgContainer, borderRadius: borderRadiusLG, overflowX: 'hidden' }}>

          {location.pathname === '/' ? (
            <div>
              <Title level={4} style={{ marginBottom: 24 }}>Dashboard Overview</Title>

              {/* === BARIS 1: METRIK BISNIS UTAMA === */}
              <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                <Col xs={24} sm={12} md={8}>
                  <Card variant="outlined" style={{ borderLeft: '4px solid #52c41a' }}>
                    <Statistic
                      title={<Text type="secondary">Omset Bulan Ini</Text>}
                      value={stats.income}
                      precision={0}
                      styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }}
                      prefix={<ArrowUpOutlined />}
                      formatter={(value) => `Rp ${new Intl.NumberFormat('id-ID').format(value)}`}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Total order selesai bulan ini</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card variant="outlined" style={{ borderLeft: `4px solid ${stats.pendingOrders > 0 ? '#ff4d4f' : '#52c41a'}` }}>
                    <Statistic
                      title={<Text type="secondary">Order Perlu Proses</Text>}
                      value={stats.pendingOrders}
                      styles={{ content: { color: stats.pendingOrders > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' } }}
                      prefix={<BellOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Status Pending & Processing</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card variant="outlined" style={{ borderLeft: '4px solid #1677ff' }}>
                    <Statistic
                      title={<Text type="secondary">Farm Accounts Aktif</Text>}
                      value={stats.activeAccounts}
                      styles={{ content: { color: '#1677ff', fontWeight: 'bold' } }}
                      prefix={<UserOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Akun yang siap digunakan</Text>
                  </Card>
                </Col>
              </Row>

              {/* === BARIS 2: METRIK DATA SISTEM === */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card variant="outlined" style={{ borderLeft: '4px solid #722ed1' }}>
                    <Statistic
                      title={<Text type="secondary">Total Pelanggan</Text>}
                      value={stats.totalCustomers}
                      styles={{ content: { color: '#722ed1', fontWeight: 'bold' } }}
                      prefix={<IdcardOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Pelanggan terdaftar dalam sistem</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card variant="outlined" style={{ borderLeft: '4px solid #fa8c16' }}>
                    <Statistic
                      title={<Text type="secondary">Total Karakter (Farm)</Text>}
                      value={stats.totalCharacters}
                      styles={{ content: { color: '#fa8c16', fontWeight: 'bold' } }}
                      prefix={<TeamOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Karakter yang dikelola</Text>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card variant="outlined" style={{ borderLeft: '4px solid #13c2c2' }}>
                    <Statistic
                      title={<Text type="secondary">Total Kingdoms</Text>}
                      value={stats.totalKingdoms}
                      styles={{ content: { color: '#13c2c2', fontWeight: 'bold' } }}
                      prefix={<GlobalOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Server yang dikelola saat ini</Text>
                  </Card>
                </Col>
              </Row>

              {/* BARIS 2.5: GRAFIK LEADERBOARD SERVER TERLARIS */}
              <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
                <Col span={24}>
                  <Card title="🏆 Leaderboard: Server Terlaris Bulan Ini" variant="outlined">
                    {kingdomOverviews.filter(kd => kd.monthlyOrdersCount > 0).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>Belum ada pesanan masuk bulan ini di server manapun.</div>
                    ) : (
                      kingdomOverviews
                        .filter(kd => kd.monthlyOrdersCount > 0)
                        .sort((a, b) => b.monthlyOrdersCount - a.monthlyOrdersCount)
                        .map((kd, index) => {
                          let rankAvatar = <Avatar style={{ backgroundColor: '#1890ff' }}>{index + 1}</Avatar>;
                          if (index === 0) rankAvatar = <Avatar style={{ backgroundColor: '#fadb14', color: '#d48806', fontSize: '18px' }}>🥇</Avatar>;
                          else if (index === 1) rankAvatar = <Avatar style={{ backgroundColor: '#e8e8e8', color: '#595959', fontSize: '18px' }}>🥈</Avatar>;
                          else if (index === 2) rankAvatar = <Avatar style={{ backgroundColor: '#d48806', color: '#fff', fontSize: '18px' }}>🥉</Avatar>;
                          
                          return (
                            <div key={kd.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <Space size="middle">
                                {rankAvatar}
                                <div>
                                  <Text strong style={{ fontSize: '16px', display: 'block' }}>{kd.name}</Text>
                                  <Text type="secondary" style={{ fontSize: '14px' }}>Total frekuensi order di bulan yang sama (semua status)</Text>
                                </div>
                              </Space>
                              <div style={{ textAlign: 'right' }}>
                                <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>{kd.monthlyOrdersCount}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: '12px' }}>Pesanan</Text>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </Card>
                </Col>
              </Row>

              {/* === BARIS 3: TOTAL RESOURCE PER KINGDOM === */}
              {kingdomOverviews.length > 0 && (
                <div>
                  <Title level={5} style={{ marginBottom: 16 }}>Taksiran Stok Bersih (Net) per Kingdom</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: '13px' }}>
                    *Stok yang ditampilkan merupakan hasil potong pajak in-game (Tersisa 81%). <br />
                    *Otomatis memotong (*reserve*) stok untuk order yang diinisiasi SETELAH waktu last update.
                  </Text>
                  <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                    {kingdomOverviews
                      .sort((a, b) => {
                        const numA = parseInt(a.name.replace(/\D/g, ''));
                        const numB = parseInt(b.name.replace(/\D/g, ''));
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return a.name.localeCompare(b.name);
                      })
                      .map((kd) => {
                        // Kalkulasi Real 81% - Reserved Orders
                        const getAvailable = (type) => {
                          const netStock = kd.rawStock[type] * 0.81;
                          const available = netStock - kd.reservedDemands[type];
                          return Math.max(0, available);
                        };

                        const dtStr = kd.lastUpdateDate
                          ? kd.lastUpdateDate.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '-';

                        return (
                          <Col xs={24} sm={12} md={8} lg={6} key={kd.id}>
                            <Card size="small" title={kd.name} variant="outlined" style={{ borderTop: '3px solid #d1a054' }}>
                              <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px dashed ${colorBorderSecondary || '#f0f0f0'}` }}>
                                <Text style={{ fontSize: '11px', display: 'block' }} type="secondary">Last Updated Stock:</Text>
                                <Tag color={kd.lastUpdateDate ? "blue" : "default"} style={{ border: 'none', margin: '4px 0 0 0', fontWeight: 'bold' }}>
                                  {dtStr}
                                </Tag>
                              </div>
                              <Row justify="space-between" style={{ marginBottom: 4 }}>
                                <Text>Food 🌽</Text><Text strong>{formatNumber(getAvailable('food'))}</Text>
                              </Row>
                              <Row justify="space-between" style={{ marginBottom: 4 }}>
                                <Text>Wood 🪵</Text><Text strong>{formatNumber(getAvailable('wood'))}</Text>
                              </Row>
                              <Row justify="space-between" style={{ marginBottom: 4 }}>
                                <Text>Stone 🪨</Text><Text strong>{formatNumber(getAvailable('stone'))}</Text>
                              </Row>
                              <Row justify="space-between">
                                <Text>Gold 🪙</Text><Text strong>{formatNumber(getAvailable('gold'))}</Text>
                              </Row>
                            </Card>
                          </Col>
                        );
                      })}
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
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Dropdown, Avatar, theme, message, Card, Row, Col, Statistic, Space, Switch, Progress, Tag, Drawer, Table } from 'antd';
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
  IdcardOutlined,
  LineChartOutlined
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
    completedOrdersThisMonth: 0,
    totalOrdersThisMonth: 0,
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

  // Kolom Tabel Taksiran Stok
  const stockColumns = [
    {
      title: 'Server / Last Update',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ''));
        const numB = parseInt(b.name.replace(/\D/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.name.localeCompare(b.name);
      },
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br/>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.lastUpdateDate ? record.lastUpdateDate.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
          </Text>
        </div>
      )
    },
    {
      title: 'Food 🌽',
      key: 'food',
      render: (_, record) => {
        const available = Math.max(0, record.rawStock.food * 0.81 - record.reservedDemands.food);
        return <Text strong style={{ color: available < 10000000 ? '#ff4d4f' : 'inherit' }}>{formatNumber(available)}</Text>;
      }
    },
    {
      title: 'Wood 🪵',
      key: 'wood',
      render: (_, record) => {
        const available = Math.max(0, record.rawStock.wood * 0.81 - record.reservedDemands.wood);
        return <Text strong style={{ color: available < 10000000 ? '#ff4d4f' : 'inherit' }}>{formatNumber(available)}</Text>;
      }
    },
    {
      title: 'Stone 🪨',
      key: 'stone',
      render: (_, record) => {
        const available = Math.max(0, record.rawStock.stone * 0.81 - record.reservedDemands.stone);
        return <Text strong style={{ color: available < 10000000 ? '#ff4d4f' : 'inherit' }}>{formatNumber(available)}</Text>;
      }
    },
    {
      title: 'Gold 🪙',
      key: 'gold',
      render: (_, record) => {
        const available = Math.max(0, record.rawStock.gold * 0.81 - record.reservedDemands.gold);
        return <Text strong style={{ color: available < 10000000 ? '#ff4d4f' : 'inherit' }}>{formatNumber(available)}</Text>;
      }
    },
  ];

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
      let completedOrdersThisMonth = 0;
      let totalOrdersThisMonth = 0;
      const currentOrders = [];

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      snapshot.forEach((doc) => {
        const data = doc.data();
        currentOrders.push({ id: doc.id, ...data });

        if (data.status === 'pending' || data.status === 'processing') {
          pendingOrders++;
        }

        if (data.created_at) {
          const createdAt = data.created_at.toDate ? data.created_at.toDate() : new Date(data.created_at);
          if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
            totalOrdersThisMonth++;
            if (data.status === 'completed') {
              completedOrdersThisMonth++;
              income += Number(data.total_price || 0);
            }
          }
        }
      });
      setOrdersList(currentOrders);
      setStats(prev => ({ ...prev, income, pendingOrders, completedOrdersThisMonth, totalOrdersThisMonth }));
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
    { key: '/reports', icon: <LineChartOutlined />, label: <Link to="/reports">Laporan Keuangan</Link> },
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
            <div style={{ margin: '-24px -16px 0 -16px' }}>
              <div className="dashboard-blue-header">
                <Title level={3} style={{ color: 'white', margin: 0 }}>Dashboard</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Terakhir diperbarui: Secara Real-time</Text>
              </div>

              <div style={{ padding: '0 24px' }}>
                <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
                  {/* WIDGET 1: Performa Keuangan & Pesanan */}
                  <Col xs={24} lg={8}>
                    <Card className="overlapping-card" styles={{ body: { padding: '24px' } }}>
                      <Title level={5} style={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>Performa Keuangan</Title>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <Progress 
                            type="circle" 
                            percent={stats.totalOrdersThisMonth > 0 ? Math.round((stats.completedOrdersThisMonth / stats.totalOrdersThisMonth) * 100) : 0} 
                            strokeColor="#52c41a"
                            size={120}
                            format={percent => <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{percent}%</span>}
                          />
                          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Selesai (Bulan Ini)</Text>
                        </div>
                        <div style={{ flex: 1, paddingLeft: 16 }}>
                          <Text type="secondary">Omset Bulan Ini</Text>
                          <Title level={3} style={{ marginTop: 0, marginBottom: 16, color: '#1677ff' }}>
                            Rp {formatNumber(stats.income)}
                          </Title>
                          
                          <Space direction="vertical" size={2}>
                            <Text type="secondary"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#52c41a', marginRight: 8 }}></span>Completed: {stats.completedOrdersThisMonth}</Text>
                            <Text type="secondary"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f', marginRight: 8 }}></span>Pending: {stats.pendingOrders}</Text>
                          </Space>
                        </div>
                      </div>
                    </Card>
                  </Col>

                  {/* WIDGET 2: Kapasitas Farm */}
                  <Col xs={24} lg={8}>
                    <Card className="overlapping-card" styles={{ body: { padding: '24px' } }}>
                      <Title level={5} style={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>Kapasitas Farm (Akun)</Title>
                      <div style={{ textAlign: 'center' }}>
                        <Progress 
                          type="dashboard" 
                          percent={stats.totalCharacters > 0 ? Math.round((stats.activeAccounts / stats.totalCharacters) * 100) : 0}
                          strokeColor="#1677ff"
                          size={150}
                          format={percent => <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{percent}%</span>}
                        />
                        <Text type="secondary" style={{ display: 'block', marginTop: -15 }}>Proporsi Akun Aktif</Text>
                      </div>
                      <Row style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                        <Col span={12} style={{ textAlign: 'center', borderRight: '1px solid #f0f0f0' }}>
                          <Text type="secondary">Akun Aktif</Text>
                          <Title level={4} style={{ margin: 0, color: '#1677ff' }}>{stats.activeAccounts}</Title>
                        </Col>
                        <Col span={12} style={{ textAlign: 'center' }}>
                          <Text type="secondary">Total Karakter</Text>
                          <Title level={4} style={{ margin: 0 }}>{stats.totalCharacters}</Title>
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  {/* WIDGET 3: Jangkauan Sistem */}
                  <Col xs={24} lg={8}>
                    <Card className="overlapping-card" styles={{ body: { padding: '24px' } }}>
                      <Title level={5} style={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>Jangkauan Sistem</Title>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <Progress 
                            type="circle" 
                            percent={100} 
                            strokeColor="#722ed1"
                            size={120}
                            format={() => <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>{stats.totalKingdoms}</span>}
                          />
                          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Total Kingdom</Text>
                        </div>
                        <div style={{ flex: 1, paddingLeft: 16 }}>
                          <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(114,46,209,0.05)', borderRadius: '8px', borderLeft: '4px solid #722ed1' }}>
                            <Text type="secondary" style={{ display: 'block' }}>Total Pelanggan</Text>
                            <Title level={3} style={{ margin: 0, color: '#722ed1' }}>{stats.totalCustomers}</Title>
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>*Pelanggan tersebar di seluruh server aktif.</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>

              {/* BARIS 2: LEADERBOARD & TAKSIRAN STOK (SIDE BY SIDE) */}
              <Row gutter={[24, 24]} style={{ padding: '0 24px', paddingBottom: '32px' }}>
                
                {/* KIRI 30%: LEADERBOARD */}
                <Col xs={24} lg={8}>
                  <Card title="🏆 Top 5 Server Terlaris" className="overlapping-card" style={{ height: '100%' }}>
                    {kingdomOverviews.filter(kd => kd.monthlyOrdersCount > 0).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>Belum ada pesanan bulan ini.</div>
                    ) : (
                      kingdomOverviews
                        .filter(kd => kd.monthlyOrdersCount > 0)
                        .sort((a, b) => b.monthlyOrdersCount - a.monthlyOrdersCount)
                        .slice(0, 5) // Batasi hanya Top 5
                        .map((kd, index) => {
                          let rankAvatar = <Avatar style={{ backgroundColor: '#1890ff' }}>{index + 1}</Avatar>;
                          let glowClass = '';
                          if (index === 0) { rankAvatar = <Avatar style={{ backgroundColor: '#fadb14', color: '#d48806', fontSize: '18px' }}>🥇</Avatar>; glowClass = 'glow-gold'; }
                          else if (index === 1) { rankAvatar = <Avatar style={{ backgroundColor: '#e8e8e8', color: '#595959', fontSize: '18px' }}>🥈</Avatar>; glowClass = 'glow-silver'; }
                          else if (index === 2) { rankAvatar = <Avatar style={{ backgroundColor: '#d48806', color: '#fff', fontSize: '18px' }}>🥉</Avatar>; glowClass = 'glow-bronze'; }
                          
                          return (
                            <div key={kd.id} className={`leaderboard-row ${glowClass}`}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space size="middle">
                                  {rankAvatar}
                                  <div>
                                    <Text strong style={{ fontSize: '16px', display: 'block' }}>{kd.name}</Text>
                                  </div>
                                </Space>
                                <div style={{ textAlign: 'right' }}>
                                  <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>{kd.monthlyOrdersCount}</Text>
                                  <br />
                                  <Text type="secondary" style={{ fontSize: '12px' }}>Pesanan</Text>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </Card>
                </Col>

                {/* KANAN 70%: TAKSIRAN STOK BERSIH (TABEL) */}
                <Col xs={24} lg={16}>
                  <Card 
                    title="Taksiran Stok Bersih (Net) per Kingdom" 
                    className="overlapping-card" 
                    style={{ height: '100%' }}
                  >
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: '13px' }}>
                      *Stok telah dipotong pajak in-game (Tersisa 81%). <br />
                      *Otomatis menahan (*reserve*) stok untuk order berstatus pending.
                    </Text>
                    
                    <Table 
                      columns={stockColumns} 
                      dataSource={kingdomOverviews} 
                      rowKey="id"
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      scroll={{ x: 'max-content' }}
                      size="middle"
                    />
                  </Card>
                </Col>
              </Row>
            </div>
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
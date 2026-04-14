import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Input as AntInput, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, DatabaseOutlined } from '@ant-design/icons';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = AntInput; 

const formatNumber = (num) => {
  if (!num) return '0';
  const n = Number(num);
  if (n >= 1000000) {
    return parseFloat((n / 1000000).toFixed(2)) + 'M';
  }
  if (n >= 1000) {
    return parseFloat((n / 1000).toFixed(2)) + 'K';
  }
  return n.toLocaleString('id-ID');
};

const Characters = () => {
  const [characters, setCharacters] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [kingdoms, setKingdoms] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const [isResourceModalVisible, setIsResourceModalVisible] = useState(false);
  const [resourceEditingId, setResourceEditingId] = useState(null);
  const [resourceFormLoading, setResourceFormLoading] = useState(false);
  const [resourceForm] = Form.useForm();
  
  const [searchText, setSearchText] = useState('');

  // FETCH DATA DARI FIREBASE SECARA REAL-TIME 
  useEffect(() => {
    // Fetch Akun
    const unsubAccounts = onSnapshot(collection(db, 'game_accounts'), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Kingdoms & URUTKAN DARI TERKECIL KE TERBESAR
    const unsubKingdoms = onSnapshot(collection(db, 'kingdoms'), (snapshot) => {
      let fetchedKingdoms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Proses pengurutan berdasarkan angka server_number
      fetchedKingdoms.sort((a, b) => Number(a.server_number || 0) - Number(b.server_number || 0));
      
      setKingdoms(fetchedKingdoms);
    });

    // Fetch Karakter
    const unsubChars = onSnapshot(collection(db, 'characters'), (snapshot) => {
      const charsData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        ign: docSnap.data().name || '-', 
        resources: docSnap.data().resources || { food: 0, wood: 0, stone: 0, gold: 0 }
      }));
      setCharacters(charsData);
      setLoading(false);
    });

    return () => { 
      unsubAccounts(); 
      unsubKingdoms(); 
      unsubChars(); 
    };
  }, []);

  // Helper untuk mendapatkan nama Kingdom
  const getKingdomName = (kingdomId) => {
    const k = kingdoms.find(k => String(k.id) === String(kingdomId));
    return k ? (k.server_number || k.name || '-') : '-';
  };

  const showAddModal = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalVisible(true);
  };

  const showEditModal = (record) => {
    form.setFieldsValue(record);
    setEditingId(record.id);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleFinish = async (values) => {
    if (!navigator.onLine) {
      message.warning('Koneksi internet terputus! Tidak dapat menyimpan data ke server saat offline.');
      return;
    }

    setFormLoading(true);
    try {
      const formattedData = {
        ...values,
        power: Number(values.power || 0),
        resources: {
          food: Number(values.resources?.food || 0),
          wood: Number(values.resources?.wood || 0),
          stone: Number(values.resources?.stone || 0),
          gold: Number(values.resources?.gold || 0),
        }
      };

      if (editingId) {
        await updateDoc(doc(db, 'characters', editingId), { ...formattedData, updated_at: serverTimestamp() });
        message.success('Karakter berhasil diperbarui!');
      } else {
        await addDoc(collection(db, 'characters'), { ...formattedData, created_at: serverTimestamp(), updated_at: serverTimestamp() });
        message.success('Karakter baru berhasil ditambahkan!');
      }
      handleCancel();
    } catch (error) {
      message.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const showResourceModal = (record) => {
    resourceForm.setFieldsValue(record.resources);
    setResourceEditingId(record.id);
    setIsResourceModalVisible(true);
  };

  const handleResourceCancel = () => {
    setIsResourceModalVisible(false);
    resourceForm.resetFields();
  };

  const handleResourceFinish = async (values) => {
    if (!navigator.onLine) {
      message.warning('Koneksi internet terputus!');
      return;
    }
    setResourceFormLoading(true);
    try {
      await updateDoc(doc(db, 'characters', resourceEditingId), {
        resources: {
          food: Number(values.food || 0),
          wood: Number(values.wood || 0),
          stone: Number(values.stone || 0),
          gold: Number(values.gold || 0),
        },
        updated_at: serverTimestamp()
      });
      message.success('Resources berhasil diperbarui!');
      handleResourceCancel();
    } catch (error) {
      message.error('Gagal memperbarui resources');
    } finally {
      setResourceFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!navigator.onLine) return message.warning('Koneksi internet terputus!');
    try {
      await deleteDoc(doc(db, 'characters', id));
      message.success('Karakter berhasil dihapus!');
    } catch (error) {
      message.error('Gagal menghapus');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success('Disalin ke clipboard!'))
      .catch(() => message.error('Gagal menyalin!'));
  };

  const kingdomFilters = kingdoms.map(k => ({ text: k.server_number || k.name, value: k.id }));

  const columns = [
    { title: 'IGN', dataIndex: 'ign', key: 'ign', render: (ign) => ign || '-' },
    {
      title: 'Akun Game', dataIndex: 'game_account_id', key: 'game_account_id',
      render: (id) => {
        const acc = accounts.find(a => String(a.id) === String(id));
        return acc ? (acc.email || acc.username || acc.id) : '-';
      }
    },
    {
      title: 'Kingdom', width: 120, align: 'center', dataIndex: 'kingdom_id', key: 'kingdom_id', 
      render: (id) => getKingdomName(id),
      filters: kingdomFilters, 
      onFilter: (value, record) => record.kingdom_id === value,
    },
    { title: 'Food 🌽', dataIndex: ['resources', 'food'], width: 100, align: 'center', render: (val) => formatNumber(val) },
    { title: 'Wood 🪵', dataIndex: ['resources', 'wood'], width: 100, align: 'center', render: (val) => formatNumber(val) },
    { title: 'Stone 🪨', dataIndex: ['resources', 'stone'], width: 100, align: 'center', render: (val) => formatNumber(val) },
    { title: 'Gold 🪙', dataIndex: ['resources', 'gold'], width: 100, align: 'center', render: (val) => formatNumber(val) },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100, align: 'center',
      filters: [{ text: 'Ready', value: 'ready' }, { text: 'Banned', value: 'banned' }],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        let color = status === 'ready' ? 'green' : status === 'banned' ? 'red' : 'default';
        return <Tag color={color}>{status?.toUpperCase() || '-'}</Tag>;
      }
    },
    {
      title: 'Aksi', key: 'action', fixed: 'right', width: 180, align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(record.ign)} title="Salin IGN" />
          <Button type="text" icon={<DatabaseOutlined />} style={{ color: '#52c41a' }} onClick={() => showResourceModal(record)} title="Update Resources" />
          <Button type="text" icon={<EditOutlined />} style={{ color: '#1890ff' }} onClick={() => showEditModal(record)} title="Edit Profil Karakter" />
          <Popconfirm title="Hapus Karakter?" description="Anda yakin ingin menghapus karakter ini secara permanen?" onConfirm={() => handleDelete(record.id)} okText="Ya, Hapus" cancelText="Batal" okButtonProps={{ danger: true }}>
            <Button type="text" danger icon={<DeleteOutlined />} title="Hapus Karakter" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredCharacters = characters.filter((char) => {
    const searchLower = searchText.toLowerCase();
    const ignMatch = (char.ign || '').toLowerCase().includes(searchLower);
    const acc = accounts.find(a => String(a.id) === String(char.game_account_id));
    const accMatch = (acc?.email || acc?.username || '').toLowerCase().includes(searchLower);
    return ignMatch || accMatch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '16px' }}>
        <Title level={3} style={{ margin: 0 }}>Characters</Title>
        <Space style={{ flexWrap: 'wrap' }}>
          <Search placeholder="Cari IGN / Email Akun..." allowClear onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
            Tambah Karakter
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0, overflowX: 'auto' } }}>
        <Table columns={columns} dataSource={filteredCharacters} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 1300 }} />
      </Card>
      
      <Modal title={editingId ? 'Edit Profil Character' : 'Tambah Character Baru'} open={isModalVisible} onCancel={handleCancel} footer={null} width={600}>
        <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: '20px' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="IGN (In Game Name)" rules={[{ required: true }]}>
                <Input placeholder="Masukkan IGN karakter" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="game_account_id" label="Akun Game (Relasi)" rules={[{ required: true }]}>
                {/* === PENAMBAHAN FITUR SEARCH === 
                  Menambahkan properti showSearch, optionFilterProp, dan filterOption 
                */}
                <Select 
                  showSearch
                  placeholder="Pilih akun game / Cari Email"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {accounts.map(acc => (<Option key={acc.id} value={acc.id}>{acc.email || acc.username || acc.id}</Option>))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="kingdom_id" label="Kingdom" rules={[{ required: true }]}>
                {/* Menambahkan search juga untuk dropdown Kingdom sekalian agar lebih praktis */}
                <Select 
                  showSearch
                  placeholder="Pilih kingdom / Server"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {kingdoms.map(k => (<Option key={k.id} value={k.id}>{k.server_number || k.name}</Option>))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select placeholder="Pilih status"><Option value="ready">Ready</Option><Option value="banned">Banned</Option></Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="power" label="Power" rules={[{ required: true }]}>
            <Input type="number" placeholder="Masukkan power karakter" />
          </Form.Item>

          <Card size="small" title="Data Resources" style={{ marginBottom: '24px', background: '#fafafa' }}>
            <Row gutter={16}>
              <Col span={12}><Form.Item name={['resources', 'food']} label="Food 🌽" initialValue={0}><Input type="number" /></Form.Item></Col>
              <Col span={12}><Form.Item name={['resources', 'wood']} label="Wood 🪵" initialValue={0}><Input type="number" /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name={['resources', 'stone']} label="Stone 🪨" initialValue={0}><Input type="number" /></Form.Item></Col>
              <Col span={12}><Form.Item name={['resources', 'gold']} label="Gold 🪙" initialValue={0}><Input type="number" /></Form.Item></Col>
            </Row>
          </Card>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleCancel}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={formLoading} style={{ background: '#101828' }}>
                {editingId ? 'Simpan Perubahan' : 'Tambahkan'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={<span style={{ color: '#52c41a' }}><DatabaseOutlined style={{ marginRight: '8px' }}/>Update Resources</span>} open={isResourceModalVisible} onCancel={handleResourceCancel} footer={null} width={400}>
        <Form form={resourceForm} layout="vertical" onFinish={handleResourceFinish} style={{ marginTop: '20px' }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="food" label="Food 🌽" initialValue={0}><Input type="number" /></Form.Item></Col>
            <Col span={12}><Form.Item name="wood" label="Wood 🪵" initialValue={0}><Input type="number" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="stone" label="Stone 🪨" initialValue={0}><Input type="number" /></Form.Item></Col>
            <Col span={12}><Form.Item name="gold" label="Gold 🪙" initialValue={0}><Input type="number" /></Form.Item></Col>
          </Row>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: '16px' }}>
            <Space>
              <Button onClick={handleResourceCancel}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={resourceFormLoading} style={{ background: '#52c41a', borderColor: '#52c41a' }}>Simpan Resources</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Characters;
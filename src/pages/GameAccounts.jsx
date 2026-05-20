import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Input as AntInput, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { db } from '../config/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// Tambahkan Text dari Typography untuk fitur copyable
const { Title, Text } = Typography; 
const { Option } = Select;
const { TextArea } = Input;
const { Search } = AntInput; 

const GameAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // State untuk Modal Form
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  // State untuk pencarian
  const [searchText, setSearchText] = useState('');

  // 1. READ: Mengambil data dari Firestore secara real-time
  useEffect(() => {
    const accountsRef = collection(db, 'game_accounts');
    const unsubscribe = onSnapshot(accountsRef, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAccounts(accountsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
      if (editingId) {
        const docRef = doc(db, 'game_accounts', editingId);
        await updateDoc(docRef, {
          ...values,
          updated_at: serverTimestamp()
        });
        message.success('Akun berhasil diperbarui!');
      } else {
        const accountsRef = collection(db, 'game_accounts');
        await addDoc(accountsRef, {
          ...values,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        message.success('Akun baru berhasil ditambahkan!');
      }
      handleCancel();
    } catch (error) {
      console.error("Error submit:", error);
      message.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!navigator.onLine) {
      message.warning('Koneksi internet terputus! Tidak dapat menyimpan data ke server saat offline.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'game_accounts', id));
      message.success('Akun berhasil dihapus!');
    } catch (error) {
      message.error('Gagal menghapus akun: ' + error.message);
    }
  };

  // Definisi kolom tabel
  const desktopColumns = [
    {
      title: 'Email Akun',
      dataIndex: 'email',
      key: 'email',
      fontWeight: 'bold',
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    // --- TAMBAHAN KOLOM PASSWORD ---
    {
      title: 'Password',
      dataIndex: 'password',
      key: 'password',
      render: (text) => text ? <Text copyable={{ text }}>{text}</Text> : '-',
    },
    {
      title: 'Login via',
      dataIndex: 'login_method',
      key: 'login_method',
      filters: [
        { text: 'Google', value: 'google' },
        { text: 'Facebook', value: 'facebook' },
        { text: 'Lilith', value: 'lilith' },
        { text: 'Apple ID', value: 'apple' },
      ],
      onFilter: (value, record) => record.login_method === value,
      render: (method) => <span style={{ textTransform: 'capitalize' }}>{method || '-'}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Resting', value: 'resting' },
        { text: 'Process', value: 'process' },
        { text: 'Banned', value: 'banned' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        let color = status === 'active' ? 'green' : status === 'banned' ? 'red' : status === 'resting' ? 'orange' : 'default';
        return <Tag color={color}>{status?.toUpperCase() || 'UNKNOWN'}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            style={{ color: '#1890ff' }} 
            onClick={() => showEditModal(record)}
          />
          <Popconfirm
            title="Hapus Akun?"
            description="Anda yakin ingin menghapus akun ini secara permanen?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const mobileColumns = [
    {
      title: 'Data Akun Game',
      key: 'mobile_data',
      render: (_, record) => {
        let color = record.status === 'active' ? 'green' : record.status === 'banned' ? 'red' : record.status === 'resting' ? 'orange' : 'default';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <Text strong style={{ fontSize: '15px', wordBreak: 'break-all' }}>{record.email || '-'}</Text>
               <Tag color={color} style={{ margin: 0, marginLeft: '8px' }}>{record.status?.toUpperCase() || 'UNKNOWN'}</Tag>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
               <Text type="secondary">Password:</Text>
               <Text copyable={{ text: record.password }}>{record.password || '-'}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
               <Text type="secondary">Login via:</Text>
               <Text style={{ textTransform: 'capitalize' }}>{record.login_method || '-'}</Text>
            </div>
            
            <Divider style={{ margin: '12px 0 8px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => showEditModal(record)}>Edit</Button>
              <Popconfirm title="Hapus Akun?" onConfirm={() => handleDelete(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />}>Hapus</Button>
              </Popconfirm>
            </div>
          </div>
        );
      }
    }
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  // Logika untuk Global Search (Mencari berdasarkan Email atau Catatan/Notes)
  const filteredAccounts = accounts.filter((acc) => {
    const searchLower = searchText.toLowerCase();
    
    const emailMatch = (acc.email || '').toLowerCase().includes(searchLower);
    const notesMatch = (acc.notes || '').toLowerCase().includes(searchLower);

    return emailMatch || notesMatch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '16px' }}>
        <Title level={3} style={{ margin: 0 }}>Game Accounts</Title>
        
        <Space style={{ flexWrap: 'wrap' }}>
          <Search 
            placeholder="Cari Email / Notes..." 
            allowClear 
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
            Tambah Akun
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table 
          columns={columns} 
          dataSource={filteredAccounts} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: isMobile ? undefined : 800 }}
        />
      </Card>

      {/* MODAL FORM TAMBAH/EDIT */}
      <Modal
        title={editingId ? "Edit Game Account" : "Tambah Game Account Baru"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null} 
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="email"
            label="Email Akun"
            rules={[{ required: true, message: 'Email tidak boleh kosong!' }, { type: 'email', message: 'Format email salah!' }]}
          >
            <Input placeholder="Masukkan email akun game" />
          </Form.Item>

          {/* --- TAMBAHAN FORM INPUT PASSWORD --- */}
          <Form.Item
            name="password"
            label="Password Akun"
            rules={[{ required: true, message: 'Password tidak boleh kosong!' }]}
          >
            <Input.Password placeholder="Masukkan password akun game" />
          </Form.Item>

          <Form.Item
            name="login_method"
            label="Metode Login"
            rules={[{ required: true, message: 'Pilih metode login!' }]}
          >
            <Select placeholder="Pilih metode">
              <Option value="google">Google</Option>
              <Option value="facebook">Facebook</Option>
              <Option value="lilith">Lilith</Option>
              <Option value="apple">Apple ID</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Status Akun"
            rules={[{ required: true, message: 'Pilih status akun!' }]}
          >
            <Select placeholder="Pilih status">
              <Option value="active">Active</Option>
              <Option value="resting">Resting (Istirahat)</Option>
              <Option value="process">Process (Sedang Digunakan)</Option>
              <Option value="banned">Banned</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Catatan Tambahan"
          >
            <TextArea rows={3} placeholder="Misal: Akun khusus untuk farming kayu..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleCancel}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={formLoading} style={{ background: '#101828' }}>
                {editingId ? "Simpan Perubahan" : "Tambahkan"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GameAccounts;
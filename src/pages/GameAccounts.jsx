import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Input as AntInput } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { db } from '../config/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Search } = AntInput; // Menggunakan komponen Search dari Ant Design

const GameAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // Definisi kolom tabel dengan penambahan fitur Filter
  const columns = [
    {
      title: 'Email Akun',
      dataIndex: 'email',
      key: 'email',
      fontWeight: 'bold',
      // Menambahkan fitur sorting alfebetik berdasarkan email
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    {
      title: 'Login via',
      dataIndex: 'login_method',
      key: 'login_method',
      // Fitur Filter Metode Login
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
      // Fitur Filter Status Akun
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
          {/* Kotak Pencarian Global */}
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

      <Card>
        <Table 
          columns={columns} 
          // Menggunakan data yang sudah difilter oleh pencarian
          dataSource={filteredAccounts} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
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
import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { db } from '../config/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const GameAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal Form
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null); // Jika null berarti mode "Tambah", jika ada ID berarti mode "Edit"
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

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

  // Buka Modal untuk Tambah
  const showAddModal = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalVisible(true);
  };

  // Buka Modal untuk Edit
  const showEditModal = (record) => {
    form.setFieldsValue(record); // Isi form dengan data yang dipilih
    setEditingId(record.id);
    setIsModalVisible(true);
  };

  // Tutup Modal
  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 2. CREATE & UPDATE: Submit Form
  const handleFinish = async (values) => {
    setFormLoading(true);
    try {
      if (editingId) {
        // Mode UPDATE
        const docRef = doc(db, 'game_accounts', editingId);
        await updateDoc(docRef, {
          ...values,
          updated_at: serverTimestamp()
        });
        message.success('Akun berhasil diperbarui!');
      } else {
        // Mode CREATE
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

  // 3. DELETE: Hapus Data
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'game_accounts', id));
      message.success('Akun berhasil dihapus!');
    } catch (error) {
      message.error('Gagal menghapus akun: ' + error.message);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Berhasil disalin!');
    }).catch(() => {
      message.error('Gagal menyalin teks');
    });
  };

  // Definisi kolom tabel
  const columns = [
    {
      title: 'Email Akun',
      dataIndex: 'email',
      key: 'email',
      fontWeight: 'bold',
      render: (email) => (
        <Space>
          <span>{email}</span>
          <Button
            type="text"
            icon={<CopyOutlined />}
            size="small"
            onClick={() => copyToClipboard(email)}
            title="Salin Email"
          />
        </Space>
      ),
    },
    {
      title: 'Password',
      dataIndex: 'password',
      key: 'password',
      render: (pw) => (
        <Space>
          <span>{pw || '-'}</span>
          <Button
            type="text"
            icon={<CopyOutlined />}
            size="small"
            onClick={() => copyToClipboard(pw || '')}
            title="Salin Password"
          />
        </Space>
      ),
    },
    {
      title: 'Login via',
      dataIndex: 'login_method',
      key: 'login_method',
      render: (method) => <span style={{ textTransform: 'capitalize' }}>{method || '-'}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Game Accounts</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
          Tambah Akun
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={accounts} 
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
        footer={null} // Kita gunakan tombol submit dari dalam form
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
            name="password"
            label="Password"
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
            label="CatatanTambahan"
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
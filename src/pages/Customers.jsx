import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Button, Space, Modal, Form, Input, message, Popconfirm, Input as AntInput } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { db } from '../config/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const { Title } = Typography;
const { Search } = AntInput;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
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
    const customersRef = collection(db, 'customers');
    const unsubscribe = onSnapshot(customersRef, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customersData);
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
    setFormLoading(true);
    try {
      if (editingId) {
        // Update data
        const docRef = doc(db, 'customers', editingId);
        await updateDoc(docRef, {
          ...values,
          updated_at: serverTimestamp()
        });
        message.success('Data pelanggan berhasil diperbarui!');
      } else {
        // Tambah data baru
        const customersRef = collection(db, 'customers');
        await addDoc(customersRef, {
          ...values,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        message.success('Pelanggan baru berhasil ditambahkan!');
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
    try {
      await deleteDoc(doc(db, 'customers', id));
      message.success('Data pelanggan berhasil dihapus!');
    } catch (error) {
      message.error('Gagal menghapus pelanggan: ' + error.message);
    }
  };

  // Fungsi untuk merapikan nomor WA agar bisa dibuka di web (mengganti 0 di depan jadi 62)
  const formatWhatsAppLink = (number) => {
    if (!number) return '#';
    let formatted = number.replace(/\D/g, ''); // Hapus semua karakter non-angka
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.substring(1);
    }
    return `https://wa.me/${formatted}`;
  };

  // Definisi kolom tabel
  const columns = [
    {
      title: 'Nama Pelanggan',
      dataIndex: 'name',
      key: 'name',
      fontWeight: 'bold',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Nomor WhatsApp',
      dataIndex: 'whatsapp',
      key: 'whatsapp',
      render: (whatsapp) => {
        if (!whatsapp) return '-';
        return (
          <Space>
            <span>{whatsapp}</span>
            <Button 
              type="text" 
              icon={<WhatsAppOutlined style={{ color: '#25D366' }} />} 
              href={formatWhatsAppLink(whatsapp)}
              target="_blank"
              title="Chat via WhatsApp"
              size="small"
            />
          </Space>
        );
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            style={{ color: '#1890ff' }} 
            onClick={() => showEditModal(record)}
            title="Edit Pelanggan"
          />
          <Popconfirm
            title="Hapus Pelanggan?"
            description="Anda yakin ingin menghapus data pelanggan ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} title="Hapus Pelanggan" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Logika Pencarian (Mencari berdasarkan Nama atau WhatsApp)
  const filteredCustomers = customers.filter((cust) => {
    const searchLower = searchText.toLowerCase();
    
    const nameMatch = (cust.name || '').toLowerCase().includes(searchLower);
    const waMatch = (cust.whatsapp || '').toLowerCase().includes(searchLower);

    return nameMatch || waMatch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '16px' }}>
        <Title level={3} style={{ margin: 0 }}>Customers</Title>
        
        <Space style={{ flexWrap: 'wrap' }}>
          <Search 
            placeholder="Cari Nama / No. WA..." 
            allowClear 
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
            Tambah Pelanggan
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0, overflowX: 'auto' } }}>
        <Table 
          columns={columns} 
          dataSource={filteredCustomers} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL FORM TAMBAH/EDIT */}
      <Modal
        title={editingId ? "Edit Data Pelanggan" : "Tambah Pelanggan Baru"}
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
            name="name"
            label="Nama Pelanggan"
            rules={[{ required: true, message: 'Nama pelanggan tidak boleh kosong!' }]}
          >
            <Input placeholder="Contoh: Budi Santoso" />
          </Form.Item>

          <Form.Item
            name="whatsapp"
            label="Nomor WhatsApp"
            rules={[
              { required: true, message: 'Nomor WhatsApp tidak boleh kosong!' },
              { pattern: /^[0-9+]+$/, message: 'Hanya boleh berisi angka atau tanda +' }
            ]}
            extra="Mulai dengan 08... atau 628..."
          >
            <Input placeholder="Contoh: 081234567890" />
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

export default Customers;
import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Button, Space, Modal, Form, Input, message, Popconfirm, Input as AntInput } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { db } from '../config/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const { Title } = Typography;
const { Search } = AntInput;

const Kingdoms = () => {
  const [kingdoms, setKingdoms] = useState([]);
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
    const kingdomsRef = collection(db, 'kingdoms');
    const unsubscribe = onSnapshot(kingdomsRef, (snapshot) => {
      const kingdomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setKingdoms(kingdomsData);
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
        const docRef = doc(db, 'kingdoms', editingId);
        await updateDoc(docRef, {
          ...values,
          updated_at: serverTimestamp()
        });
        message.success('Kingdom berhasil diperbarui!');
      } else {
        // Tambah data baru
        const kingdomsRef = collection(db, 'kingdoms');
        await addDoc(kingdomsRef, {
          ...values,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        message.success('Kingdom baru berhasil ditambahkan!');
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
      await deleteDoc(doc(db, 'kingdoms', id));
      message.success('Kingdom berhasil dihapus!');
    } catch (error) {
      message.error('Gagal menghapus Kingdom: ' + error.message);
    }
  };

  // Definisi kolom tabel (Lebih simpel)
  const columns = [
    {
      title: 'Server Number',
      dataIndex: 'server_number',
      key: 'server_number',
      fontWeight: 'bold',
      sorter: (a, b) => Number(a.server_number || 0) - Number(b.server_number || 0),
    },
    {
      title: 'Nama Kingdom',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => name || `Kingdom ${record.server_number}`
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
            title="Hapus Kingdom?"
            description="Anda yakin ingin menghapus Kingdom ini?"
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

  // Logika Pencarian (Mencari berdasarkan Server Number atau Nama Kingdom)
  const filteredKingdoms = kingdoms.filter((kd) => {
    const searchLower = searchText.toLowerCase();
    
    const serverMatch = String(kd.server_number || '').toLowerCase().includes(searchLower);
    const nameMatch = (kd.name || '').toLowerCase().includes(searchLower);

    return serverMatch || nameMatch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: '16px' }}>
        <Title level={3} style={{ margin: 0 }}>Kingdoms</Title>
        
        <Space style={{ flexWrap: 'wrap' }}>
          <Search 
            placeholder="Cari Server / Nama..." 
            allowClear 
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
            Tambah Kingdom
          </Button>
        </Space>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredKingdoms} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL FORM TAMBAH/EDIT */}
      <Modal
        title={editingId ? "Edit Kingdom" : "Tambah Kingdom Baru"}
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
            name="server_number"
            label="Server Number"
            rules={[{ required: true, message: 'Server Number tidak boleh kosong!' }]}
          >
            <Input type="number" placeholder="Contoh: 1001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nama Kingdom (Opsional)"
          >
            <Input placeholder="Contoh: Kingdom of The Sun" />
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

export default Kingdoms;
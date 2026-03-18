import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Input as AntInput } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import kingdomsData from '../data/kingdoms.json';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Characters = () => {
  const [characters, setCharacters] = useState([]);
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  // State untuk filter dan pencarian
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kingdomFilter, setKingdomFilter] = useState('');

  // Helper: get kingdom server number
  const getKingdom = (kingdomId) => {
    const k = kingdomsData.find(k => String(k.id) === String(kingdomId));
    return k ? (k.server_number || k.name || '-') : '-';
  };

  // Ambil daftar akun game untuk relasi
  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'game_accounts'), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const charsRef = collection(db, 'characters');
    const unsubscribe = onSnapshot(charsRef, (snapshot) => {
      const charsData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          ign: data.name || '-', // gunakan 'name' dari firestore sebagai IGN
          kingdom: getKingdom(data.kingdom_id),
        };
      });
      setCharacters(charsData);
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
        const docRef = doc(db, 'characters', editingId);
        await updateDoc(docRef, {
          ...values,
          updated_at: serverTimestamp()
        });
        message.success('Karakter berhasil diperbarui!');
      } else {
        const charsRef = collection(db, 'characters');
        await addDoc(charsRef, {
          ...values,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        message.success('Karakter baru berhasil ditambahkan!');
      }
      handleCancel();
    } catch (error) {
      message.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'characters', id));
      message.success('Karakter berhasil dihapus!');
    } catch (error) {
      message.error('Gagal menghapus karakter: ' + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success('Disalin ke clipboard!'))
      .catch(() => message.error('Gagal menyalin!'));
  };

  const columns = [
    {
      title: 'IGN',
      dataIndex: 'ign',
      key: 'ign',
      render: (ign) => ign || '-',
    },
    {
      title: 'Akun Game',
      dataIndex: 'game_account_id',
      key: 'game_account_id',
      render: (id) => {
        const acc = accounts.find(a => String(a.id) === String(id));
        return acc ? (acc.email || acc.username || acc.id) : '-';
      }
    },
    {
      title: 'Kingdom',
      dataIndex: 'kingdom',
      key: 'kingdom',
      render: (kingdom) => kingdom || '-',
    },
    {
      title: 'Power',
      dataIndex: 'power',
      key: 'power',
      render: (power) => power ? power.toLocaleString() : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'ready' ? 'green' : status === 'banned' ? 'red' : 'default';
        return <Tag color={color}>{status?.toUpperCase() || '-'}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(record.ign)} title="Salin IGN" />
          <Button type="text" icon={<EditOutlined />} style={{ color: '#1890ff' }} onClick={() => showEditModal(record)} />
          <Popconfirm
            title="Hapus Karakter?"
            description="Anda yakin ingin menghapus karakter ini secara permanen?"
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
        <Title level={3} style={{ margin: 0 }}>Characters</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
          Tambah Karakter
        </Button>
      </div>
      <Card>
        <Table
          columns={columns}
          dataSource={characters}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      <Modal
        title={editingId ? 'Edit Character' : 'Tambah Character Baru'}
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
            label="IGN (In Game Name)"
            rules={[{ required: true, message: 'IGN tidak boleh kosong!' }]}
          >
            <Input placeholder="Masukkan IGN karakter" />
          </Form.Item>
          <Form.Item
            name="game_account_id"
            label="Akun Game (Relasi)"
            rules={[{ required: true, message: 'Pilih akun game!' }]}
          >
            <Select placeholder="Pilih akun game">
              {accounts.map(acc => (
                <Option key={acc.id} value={acc.id}>{acc.email || acc.username || acc.id}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="kingdom_id"
            label="Kingdom"
            rules={[{ required: true, message: 'Pilih kingdom!' }]}
          >
            <Select placeholder="Pilih kingdom">
              {kingdomsData.map(k => (
                <Option key={k.id} value={k.id}>{k.server_number || k.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="power"
            label="Power"
            rules={[{ required: true, message: 'Power tidak boleh kosong!' }]}
          >
            <Input type="number" placeholder="Masukkan power karakter" />
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Pilih status karakter!' }]}
          >
            <Select placeholder="Pilih status">
              <Option value="ready">Ready</Option>
              <Option value="banned">Banned</Option>
            </Select>
          </Form.Item>
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
    </div>
  );
};

export default Characters;

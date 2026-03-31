import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Row, Col, InputNumber, Divider, Progress, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, SendOutlined } from '@ant-design/icons';
import { db } from '../config/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [kingdoms, setKingdoms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal Utama (Add/Edit)
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  // State untuk Pencarian
  const [searchText, setSearchText] = useState('');

  // State untuk Update Progress Cepat
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [progressForm] = Form.useForm();

  // 1. Sinkronisasi Data secara Real-time
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubCust = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubKingdoms = onSnapshot(collection(db, 'kingdoms'), (snapshot) => {
      setKingdoms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubOrders(); unsubCust(); unsubKingdoms(); };
  }, []);

  // 2. Handler Modal Utama
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

  const handleFinish = async (values) => {
    setFormLoading(true);
    try {
      const payload = {
        ...values,
        total_price: Number(values.total_price || 0),
        items: values.items.map(item => ({
          ...item,
          amount: Number(item.amount || 0),
          amount_filled: Number(item.amount_filled || 0),
          is_completed: (item.amount_filled >= item.amount) ? 1 : 0
        })),
        updated_at: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'orders', editingId), payload);
        message.success('Pesanan berhasil diperbarui!');
      } else {
        await addDoc(collection(db, 'orders'), { 
          ...payload, 
          created_at: serverTimestamp(),
          order_number: values.order_number || `ORD-${Date.now()}`
        });
        message.success('Pesanan baru berhasil dibuat!');
      }
      setIsModalVisible(false);
    } catch (error) {
      message.error('Gagal memproses pesanan: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  // 3. Handler Update Progress Live
  const handleUpdateProgress = async (values) => {
    const newItems = [...activeOrder.items];
    const item = newItems[activeItemIndex];
    
    // Tambahkan jumlah baru ke progress yang sudah ada
    item.amount_filled = (Number(item.amount_filled) || 0) + Number(values.add_amount);
    item.is_completed = (item.amount_filled >= item.amount) ? 1 : 0;

    try {
      await updateDoc(doc(db, 'orders', activeOrder.id), {
        items: newItems,
        updated_at: serverTimestamp()
      });
      message.success('Progress pengiriman diperbarui secara live!');
      setIsProgressModalVisible(false);
      progressForm.resetFields();
    } catch (error) {
      message.error('Gagal memperbarui progress');
    }
  };

  // --- KOLOM TABEL UTAMA ---
  const columns = [
    { 
      title: 'Invoice / Pelanggan', 
      key: 'customer',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.order_number || record.id}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {customers.find(c => String(c.id) === String(record.customer_id))?.name || 'Unknown Customer'}
          </Text>
        </Space>
      )
    },
    { 
      title: 'Kingdom', 
      key: 'kingdom',
      render: (_, record) => {
        const kd = kingdoms.find(k => String(k.id) === String(record.kingdom_id));
        return kd ? `Server ${kd.server_number}` : '-';
      }
    },
    {
      title: 'Total Harga',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price) => `Rp ${Number(price || 0).toLocaleString('id-ID')}`
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        const colors = { completed: 'green', processing: 'blue', pending: 'orange', cancelled: 'red' };
        return <Tag color={colors[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => showEditModal(record)} title="Edit Order" />
          <Popconfirm title="Hapus pesanan ini?" onConfirm={() => deleteDoc(doc(db, 'orders', record.id))}>
            <Button type="text" danger icon={<DeleteOutlined />} title="Hapus Order" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // --- FUNGSI RENDER UNTUK DROPDOWN/EXPANDABLE ROW (PROGRESS LIVE) ---
  const expandedRowRender = (record) => {
    return (
      <div style={{ padding: '16px 24px', background: '#f5f5f5', borderRadius: '8px' }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Detail Progress Pengiriman (Live)</Title>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {record.items?.map((item, idx) => {
            const percent = Math.min(100, Math.round((item.amount_filled / item.amount) * 100) || 0);
            
            // UPDATE DI SINI: Cek apakah target sudah tercapai
            const isCompleted = item.amount_filled >= item.amount;

            return (
              <div key={idx} style={{ flex: '1 1 300px', maxWidth: '400px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                  <Col>
                    <Tag color="orange" style={{ fontWeight: 'bold' }}>{item.resource_type?.toUpperCase()}</Tag>
                    <Text strong>{Number(item.amount_filled || 0).toLocaleString('id-ID')}M</Text>
                    <Text type="secondary"> / {Number(item.amount || 0).toLocaleString('id-ID')}M</Text>
                  </Col>
                  <Col>
                    {/* UPDATE DI SINI: Disable tombol jika isCompleted true */}
                    <Tooltip title={isCompleted ? "Target Tercapai" : "Input Pengiriman Baru"}>
                      <Button 
                        type="primary" 
                        size="small" 
                        shape="circle" 
                        icon={<SendOutlined />} 
                        style={isCompleted ? {} : { background: '#52c41a', borderColor: '#52c41a' }}
                        disabled={isCompleted}
                        onClick={() => {
                          setActiveOrder(record);
                          setActiveItemIndex(idx);
                          setIsProgressModalVisible(true);
                        }}
                      />
                    </Tooltip>
                  </Col>
                </Row>
                <Progress 
                  percent={percent} 
                  size="small" 
                  status={percent >= 100 ? "success" : "active"} 
                  strokeColor={percent >= 100 ? '#52c41a' : '#1890ff'}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Orders</Title>
        <Space>
          <Search 
            placeholder="Cari Invoice / Pelanggan..." 
            allowClear 
            onChange={e => setSearchText(e.target.value)} 
            style={{ width: 280 }} 
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
            Tambah Order
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table 
          columns={columns} 
          dataSource={orders.filter(o => 
            (o.order_number || '').toLowerCase().includes(searchText.toLowerCase()) ||
            customers.find(c => String(c.id) === String(o.customer_id))?.name?.toLowerCase().includes(searchText.toLowerCase())
          )} 
          rowKey="id" 
          loading={loading} 
          scroll={{ x: 800 }} 
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.items && record.items.length > 0,
          }}
        />
      </Card>

      {/* MODAL UTAMA: CREATE / EDIT ORDER */}
      <Modal 
        title={editingId ? "Edit Order & Item" : "Buat Order Baru"} 
        open={isModalVisible} 
        onCancel={() => setIsModalVisible(false)} 
        footer={null} 
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="order_number" label="Nomor Invoice" rules={[{ required: true }]}><Input placeholder="INV-001" /></Form.Item></Col>
            <Col span={6}><Form.Item name="customer_id" label="Pelanggan" rules={[{ required: true }]}><Select placeholder="Pilih Pelanggan">{customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Form.Item></Col>
            <Col span={6}><Form.Item name="kingdom_id" label="Kingdom" rules={[{ required: true }]}><Select placeholder="Pilih Kingdom">{kingdoms.map(k => <Option key={k.id} value={k.id}>{k.server_number}</Option>)}</Select></Form.Item></Col>
            <Col span={6}><Form.Item name="status" label="Status Global" initialValue="pending"><Select><Option value="pending">Pending</Option><Option value="processing">Processing</Option><Option value="completed">Completed</Option></Select></Form.Item></Col>
          </Row>

          <Divider orientation="left">Detail Resource (Items)</Divider>
          
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ marginBottom: 12, background: '#fafafa' }}>
                    <Row gutter={16} align="middle">
                      <Col span={10}>
                        <Form.Item {...restField} name={[name, 'resource_type']} label="Jenis Resource" rules={[{ required: true }]}>
                          <Select><Option value="food">Food</Option><Option value="wood">Wood</Option><Option value="stone">Stone</Option><Option value="gold">Gold</Option></Select>
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item {...restField} name={[name, 'amount']} label="Jumlah Target (M)" rules={[{ required: true }]}>
                          <InputNumber 
                            style={{ width: '100%' }} 
                            formatter={val => val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' M' : ''}
                            parser={val => val.replace(/[^\d.]/g, '')}
                            placeholder="Contoh: 15"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4} style={{ textAlign: 'center' }}>
                        <Button type="text" danger onClick={() => remove(name)} icon={<MinusCircleOutlined />} style={{ marginTop: 24 }}>Hapus</Button>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Tambah Baris Resource</Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Row gutter={16} justify="end">
            <Col span={8}>
              <Form.Item name="total_price" label="Total Harga Keseluruhan (Rp)">
                <InputNumber style={{ width: '100%' }} formatter={val => `Rp ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={formLoading} style={{ background: '#101828' }}>Simpan Order</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL QUICK UPDATE PROGRESS (LIVE UPDATE) */}
      <Modal 
        title={<span><SendOutlined style={{ color: '#52c41a', marginRight: 8 }} />Input Progress Pengiriman</span>}
        open={isProgressModalVisible} 
        onCancel={() => setIsProgressModalVisible(false)} 
        footer={null}
        width={400}
      >
        <Form form={progressForm} onFinish={handleUpdateProgress} layout="vertical">
            <Form.Item 
                name="add_amount" 
                label="Jumlah Resource yang Baru Dikirim (M)" 
                rules={[{ required: true, message: 'Masukkan jumlah!' }]}
            >
                <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="Contoh: 5"
                    autoFocus
                    formatter={val => val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' M' : ''}
                    parser={val => val.replace(/[^\d.]/g, '')}
                />
            </Form.Item>
            <Button type="primary" htmlType="submit" block style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                Update Progress Sekarang
            </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Orders;
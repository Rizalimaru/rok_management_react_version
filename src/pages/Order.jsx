import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Tag, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Row, Col, InputNumber, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { db } from '../config/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Helper format angka besar (M/K)
const formatNumber = (num) => {
  if (!num) return '0';
  const n = Number(num);
  if (n >= 1000000) return parseFloat((n / 1000000).toFixed(2)) + 'M';
  if (n >= 1000) return parseFloat((n / 1000).toFixed(2)) + 'K';
  return n.toLocaleString('id-ID');
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // 1. Ambil Data (Orders, Customers, Characters)
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubCust = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubChars = onSnapshot(collection(db, 'characters'), (snapshot) => {
      setCharacters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubOrders(); unsubCust(); unsubChars(); };
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

  const handleFinish = async (values) => {
    setFormLoading(true);
    try {
      const payload = {
        ...values,
        total_amount: Number(values.total_amount || 0),
        items: values.items.map(item => ({
          ...item,
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0)
        })),
        updated_at: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'orders', editingId), payload);
        message.success('Pesanan diperbarui!');
      } else {
        await addDoc(collection(db, 'orders'), { ...payload, created_at: serverTimestamp() });
        message.success('Pesanan dibuat!');
      }
      setIsModalVisible(false);
    } catch (error) {
      message.error('Gagal: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    { 
      title: 'Order #', 
      dataIndex: 'order_number', 
      key: 'order_number',
      render: (text) => <Text strong>{text}</Text>
    },
    { 
      title: 'Customer', 
      dataIndex: 'customer_id', 
      key: 'customer_id',
      render: (id) => customers.find(c => c.id === id)?.name || '-'
    },
    { 
      title: 'Items', 
      dataIndex: 'items', 
      key: 'items',
      render: (items) => (
        <ul style={{ paddingLeft: 16, margin: 0, fontSize: '12px' }}>
          {items?.map((item, idx) => (
            <li key={idx}>
              {formatNumber(item.quantity)} {item.resource_type} → {characters.find(c => c.id === item.target_character_id)?.name || 'Unknown'}
            </li>
          ))}
        </ul>
      )
    },
    { 
      title: 'Total', 
      dataIndex: 'total_amount', 
      key: 'total_amount',
      render: (val) => `Rp ${val?.toLocaleString('id-ID')}`
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        const colors = { pending: 'orange', processing: 'blue', completed: 'green', cancelled: 'red' };
        return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => showEditModal(record)} />
          <Popconfirm title="Hapus pesanan?" onConfirm={() => deleteDoc(doc(db, 'orders', record.id))}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const filteredOrders = orders.filter(o => 
    o.order_number?.toLowerCase().includes(searchText.toLowerCase()) ||
    customers.find(c => c.id === o.customer_id)?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>Orders</Title>
        <Space>
          <Search placeholder="Cari order/customer..." onChange={e => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#d1a054', borderColor: '#d1a054' }}>
            New Order
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table columns={columns} dataSource={filteredOrders} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
      </Card>

      <Modal 
        title={editingId ? "Edit Order" : "Create New Order"} 
        open={isModalVisible} 
        onCancel={() => setIsModalVisible(false)} 
        footer={null} 
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="order_number" label="Order Number" rules={[{ required: true }]}>
                <Input placeholder="INV-001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="customer_id" label="Customer" rules={[{ required: true }]}>
                <Select placeholder="Select Customer">
                  {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status" initialValue="pending">
                <Select>
                  <Option value="pending">Pending</Option>
                  <Option value="processing">Processing</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Order Items</Divider>
          
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'target_character_id']} rules={[{ required: true, message: 'Missing target' }]}>
                      <Select placeholder="Target Character" style={{ width: 180 }}>
                        {characters.map(ch => <Option key={ch.id} value={ch.id}>{ch.name}</Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'resource_type']} rules={[{ required: true }]}>
                      <Select placeholder="Resource" style={{ width: 120 }}>
                        <Option value="food">Food</Option>
                        <Option value="wood">Wood</Option>
                        <Option value="stone">Stone</Option>
                        <Option value="gold">Gold</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true }]}>
                      <InputNumber placeholder="Quantity" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} style={{ width: 150 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Item</Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Row gutter={16} justify="end">
            <Col span={8}>
              <Form.Item name="total_amount" label="Total Amount (Rp)">
                <InputNumber style={{ width: '100%' }} formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={formLoading} style={{ background: '#101828' }}>Save Order</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Orders;
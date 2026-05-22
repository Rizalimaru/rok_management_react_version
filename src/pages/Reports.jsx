import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Space, DatePicker, Row, Col, Statistic, InputNumber, message, Collapse } from 'antd';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [kingdoms, setKingdoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);

  // Fetch Data
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      // Hanya ambil yang completed
      const fetchedOrders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(o => o.status === 'completed');
      
      // Urutkan berdasarkan tanggal selesai terbaru
      fetchedOrders.sort((a, b) => {
        const dateA = (a.completed_at || a.updated_at || a.created_at)?.toDate ? (a.completed_at || a.updated_at || a.created_at).toDate().getTime() : 0;
        const dateB = (b.completed_at || b.updated_at || b.created_at)?.toDate ? (b.completed_at || b.updated_at || b.created_at).toDate().getTime() : 0;
        return dateB - dateA;
      });

      setOrders(fetchedOrders);
      setLoading(false);
    });

    const unsubKingdoms = onSnapshot(collection(db, 'kingdoms'), (snapshot) => {
      setKingdoms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubOrders(); unsubKingdoms(); };
  }, []);

  // Filter berdasarkan Range Tanggal (Berdasarkan Waktu Selesai)
  const filteredOrders = orders.filter(o => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
    
    const relevantDate = o.completed_at || o.updated_at || o.created_at;
    if (!relevantDate) return false;
    const orderDate = relevantDate.toDate ? relevantDate.toDate() : new Date(relevantDate);
    
    const normalizedOrderDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    const startDate = new Date(dateRange[0].year(), dateRange[0].month(), dateRange[0].date());
    const endDate = new Date(dateRange[1].year(), dateRange[1].month(), dateRange[1].date());

    return normalizedOrderDate >= startDate && normalizedOrderDate <= endDate;
  });

  // Handle Update Rate
  const handleRateChange = async (orderId, newRate) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { profit_rate: newRate });
      message.success('Rate berhasil diupdate');
    } catch (error) {
      message.error('Gagal mengupdate rate: ' + error.message);
    }
  };

  // Kalkulasi Global
  let grandTotalKotor = 0;
  let grandTotalBank = 0;
  let grandTotalSisa = 0;
  const adminIncomes = {};

  // Kelompokkan data menjadi Batch per hari
  const batches = {};

  filteredOrders.forEach(record => {
    const totalKotor = Number(record.total_price || 0);
    const setoranBank = totalKotor * 0.10;
    const sisaBagi = totalKotor - setoranBank;
    
    const handlerRate = record.profit_rate !== undefined ? Number(record.profit_rate) : 95;
    const partnerRate = 100 - handlerRate;

    const jatahHandler = sisaBagi * (handlerRate / 100);
    const jatahPartner = sisaBagi * (partnerRate / 100);

    grandTotalKotor += totalKotor;
    grandTotalBank += setoranBank;
    grandTotalSisa += sisaBagi;

    const handlerEmail = record.admin_email || 'Unknown Admin';
    if (!adminIncomes[handlerEmail]) adminIncomes[handlerEmail] = 0;
    adminIncomes[handlerEmail] += jatahHandler;

    // Menentukan Tanggal Batch
    const relevantDate = record.completed_at || record.updated_at || record.created_at;
    let batchKey = 'Unknown Date';
    if (relevantDate) {
      const dt = relevantDate.toDate ? relevantDate.toDate() : new Date(relevantDate);
      batchKey = dt.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    if (!batches[batchKey]) {
      batches[batchKey] = {
        dateStr: batchKey,
        totalKotor: 0,
        setoranBank: 0,
        orders: []
      };
    }

    batches[batchKey].totalKotor += totalKotor;
    batches[batchKey].setoranBank += setoranBank;
    batches[batchKey].orders.push({
      ...record,
      totalKotor,
      setoranBank,
      sisaBagi,
      handlerRate,
      jatahHandler,
      jatahPartner,
      handlerEmail
    });
  });

  const columns = [
    {
      title: 'Kode Data',
      key: 'kode_data',
      render: (_, record) => {
        const kd = kingdoms.find(k => String(k.id) === String(record.kingdom_id));
        return kd ? kd.server_number : '-';
      }
    },
    {
      title: 'Admin (Handler)',
      dataIndex: 'handlerEmail',
      key: 'handlerEmail',
      render: (email) => <Text type="secondary">{email.split('@')[0]}</Text>
    },
    {
      title: 'Total Kotor',
      dataIndex: 'totalKotor',
      key: 'totalKotor',
      align: 'right',
      render: (val) => new Intl.NumberFormat('id-ID').format(val)
    },
    {
      title: 'Setoran Bank (10%)',
      dataIndex: 'setoranBank',
      key: 'setoranBank',
      align: 'right',
      render: (val) => new Intl.NumberFormat('id-ID').format(val)
    },
    {
      title: 'Sisa (90%)',
      dataIndex: 'sisaBagi',
      key: 'sisaBagi',
      align: 'right',
      render: (val) => <Text strong>{new Intl.NumberFormat('id-ID').format(val)}</Text>
    },
    {
      title: 'Pembagian (%)',
      key: 'rate',
      align: 'center',
      render: (_, record) => (
        <InputNumber
          min={0}
          max={100}
          value={record.handlerRate}
          onChange={(val) => handleRateChange(record.id, val)}
          formatter={value => `${value}%`}
          parser={value => value.replace('%', '')}
          style={{ width: '80px' }}
        />
      )
    },
    {
      title: 'Jatah Handler',
      dataIndex: 'jatahHandler',
      key: 'jatahHandler',
      align: 'right',
      render: (val) => <Text strong style={{ color: '#1677ff' }}>{new Intl.NumberFormat('id-ID').format(val)}</Text>
    },
    {
      title: 'Jatah Partner',
      dataIndex: 'jatahPartner',
      key: 'jatahPartner',
      align: 'right',
      render: (val) => <Text type="secondary">{new Intl.NumberFormat('id-ID').format(val)}</Text>
    }
  ];

  const collapseItems = Object.values(batches).map((batch, index) => ({
    key: String(index),
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '24px' }}>
        <Text strong style={{ fontSize: '16px' }}>Batch: {batch.dateStr}</Text>
        <Space size="large">
          <Text type="secondary">Total Omset: <Text strong style={{ color: '#1677ff' }}>Rp {new Intl.NumberFormat('id-ID').format(batch.totalKotor)}</Text></Text>
          <Text type="secondary">Setoran Bank: <Text strong style={{ color: '#faad14' }}>Rp {new Intl.NumberFormat('id-ID').format(batch.setoranBank)}</Text></Text>
        </Space>
      </div>
    ),
    children: (
      <Table
        columns={columns}
        dataSource={batch.orders}
        rowKey="id"
        pagination={false}
        scroll={{ x: 800 }}
        size="small"
      />
    )
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '16px' }}>
        <Title level={3} style={{ margin: 0 }}>Laporan Keuangan</Title>
        <Space>
          <Text strong>Filter Tanggal Selesai:</Text>
          <RangePicker 
            onChange={(dates) => setDateRange(dates)} 
            format="DD MMM YYYY"
          />
        </Space>
      </div>

      {/* SUMMARY CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" variant="outlined">
            <Statistic title="Total Kotor (Seluruh Batch)" value={grandTotalKotor} prefix="Rp" formatter={(val) => new Intl.NumberFormat('id-ID').format(val)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" variant="outlined">
            <Statistic title="Total Setoran Bank" value={grandTotalBank} prefix="Rp" formatter={(val) => new Intl.NumberFormat('id-ID').format(val)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12}>
          <Card size="small" title="Akumulasi Pendapatan Bersih Admin" variant="outlined" style={{ borderTop: '3px solid #52c41a' }}>
            {Object.keys(adminIncomes).length === 0 ? (
              <Text type="secondary">Belum ada data pendapatan di periode ini.</Text>
            ) : (
              Object.keys(adminIncomes).map(admin => (
                <Row justify="space-between" key={admin} style={{ marginBottom: 8 }}>
                  <Text strong>{admin.split('@')[0]}</Text>
                  <Text strong style={{ color: '#52c41a' }}>Rp {new Intl.NumberFormat('id-ID').format(adminIncomes[admin])}</Text>
                </Row>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* BATCH COLLAPSE */}
      {loading ? (
        <Card loading={true} />
      ) : collapseItems.length === 0 ? (
        <Card><Text type="secondary">Tidak ada data pesanan yang selesai pada periode ini.</Text></Card>
      ) : (
        <Collapse items={collapseItems} defaultActiveKey={['0']} />
      )}
    </div>
  );
};

export default Reports;

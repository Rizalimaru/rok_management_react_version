import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Space, DatePicker, Row, Col, Statistic, InputNumber, message, Collapse, Button, Select } from 'antd';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Komponen Input Kustom untuk mencegah Race Condition saat mengetik %
const RateInput = ({ record, onSave }) => {
  const [val, setVal] = useState(record.handlerRate);
  
  useEffect(() => {
    setVal(record.handlerRate);
  }, [record.handlerRate]);

  return (
    <InputNumber
      min={0}
      max={100}
      value={val}
      onChange={setVal}
      onBlur={() => {
        if (val !== record.handlerRate) onSave(record.id, val);
      }}
      onPressEnter={() => {
        if (val !== record.handlerRate) onSave(record.id, val);
      }}
      formatter={value => `${value}%`}
      parser={value => value.replace('%', '')}
      style={{ width: '80px' }}
    />
  );
};

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [kingdoms, setKingdoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Hanya fetch kingdoms secara real-time (karena datanya kecil)
  useEffect(() => {
    const unsubKingdoms = onSnapshot(collection(db, 'kingdoms'), (snapshot) => {
      setKingdoms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubKingdoms();
  }, []);

  const fetchReportData = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('Silakan pilih rentang tanggal terlebih dahulu!');
      return;
    }

    setLoading(true);
    try {
      const startDate = dateRange[0].startOf('day').toDate();
      const endDate = dateRange[1].endOf('day').toDate();

      // Hanya tarik data order yang waktu selesainya berada di rentang tanggal yang dipilih
      // Ini akan menghemat reads Firebase hingga 99%
      const q = query(
        collection(db, 'orders'),
        where('completed_at', '>=', startDate),
        where('completed_at', '<=', endDate)
      );

      const snapshot = await getDocs(q);
      
      const fetchedOrders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(o => o.status === 'completed'); // Pastikan hanya status completed
      
      fetchedOrders.sort((a, b) => {
        const dateA = a.completed_at?.toDate ? a.completed_at.toDate().getTime() : 0;
        const dateB = b.completed_at?.toDate ? b.completed_at.toDate().getTime() : 0;
        return dateB - dateA;
      });

      setOrders(fetchedOrders);
      setHasFetched(true);
      message.success(`Berhasil menarik ${fetchedOrders.length} data pesanan.`);
    } catch (error) {
      console.error(error);
      if (error.message.includes('index')) {
        message.error('Sistem membutuhkan Indexing di database. Hubungi developer.');
      } else {
        message.error('Gagal mengambil laporan: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter berdasarkan Range Tanggal (Berdasarkan Waktu Selesai)
  // Karena kita sudah mengambil data yang tepat sesuai rentang waktu dari Firebase (Server-side filtering),
  // kita tidak perlu memfilter secara manual lagi di Client-side.
  const filteredOrders = orders;

  // Handle Update Rate
  const handleRateChange = async (orderId, newRate) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { profit_rate: newRate });
      
      // Update state lokal agar UI langsung merender ulang perhitungan pembagian
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === orderId ? { ...order, profit_rate: newRate } : order
      ));

      message.success('Rate berhasil diupdate');
    } catch (error) {
      message.error('Gagal mengupdate rate: ' + error.message);
    }
  };

  // Kumpulkan semua email unik untuk dropdown Partner
  const uniqueEmails = React.useMemo(() => {
    const emails = new Set();
    orders.forEach(o => {
      if (o.admin_email) emails.add(o.admin_email);
      if (o.partner_email) emails.add(o.partner_email);
    });
    return Array.from(emails);
  }, [orders]);

  // Handle Update Partner
  const handlePartnerChange = async (orderId, newPartner) => {
    try {
      const partnerEmail = newPartner || null;
      await updateDoc(doc(db, 'orders', orderId), { partner_email: partnerEmail });
      
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === orderId ? { ...order, partner_email: partnerEmail } : order
      ));

      message.success('Partner berhasil diupdate');
    } catch (error) {
      message.error('Gagal mengupdate partner: ' + error.message);
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
    const partnerEmail = record.partner_email;

    if (!adminIncomes[handlerEmail]) adminIncomes[handlerEmail] = 0;
    adminIncomes[handlerEmail] += jatahHandler;

    if (partnerEmail) {
      if (!adminIncomes[partnerEmail]) adminIncomes[partnerEmail] = 0;
      adminIncomes[partnerEmail] += jatahPartner;
    }

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
        adminOmzet: {},
        orders: []
      };
    }

    if (!batches[batchKey].adminOmzet[handlerEmail]) {
      batches[batchKey].adminOmzet[handlerEmail] = 0;
    }
    batches[batchKey].adminOmzet[handlerEmail] += jatahHandler; // Jatah bersih Handler

    if (partnerEmail) {
      if (!batches[batchKey].adminOmzet[partnerEmail]) {
        batches[batchKey].adminOmzet[partnerEmail] = 0;
      }
      batches[batchKey].adminOmzet[partnerEmail] += jatahPartner; // Jatah bersih Partner
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
      handlerEmail,
      partnerEmail
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
      title: 'Partner',
      key: 'partner',
      render: (_, record) => (
        <Select
          mode="tags"
          maxCount={1}
          style={{ width: 140 }}
          placeholder="Pilih/Ketik Email"
          value={record.partnerEmail ? [record.partnerEmail] : []}
          onChange={(val) => handlePartnerChange(record.id, val[0])}
          options={uniqueEmails.map(email => ({ value: email, label: email.split('@')[0] }))}
        />
      )
    },
    {
      title: 'Pembagian (%)',
      key: 'rate',
      align: 'center',
      render: (_, record) => (
        <RateInput record={record} onSave={handleRateChange} />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <Text strong style={{ fontSize: '16px' }}>Batch: {batch.dateStr}</Text>
        <Space size="large" wrap>
          {Object.keys(batch.adminOmzet).map(admin => (
            <Text type="secondary" key={admin}>
              Pendapatan {admin.split('@')[0]}: <Text strong style={{ color: '#52c41a' }}>Rp {new Intl.NumberFormat('id-ID').format(batch.adminOmzet[admin])}</Text>
            </Text>
          ))}
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
          <Text strong>Pilih Rentang Tanggal:</Text>
          <RangePicker 
            onChange={(dates) => {
              setDateRange(dates);
              setHasFetched(false); // Reset status fetch saat tanggal diubah
            }} 
            format="DD MMM YYYY"
            style={{ width: 260 }}
          />
          <Button type="primary" onClick={fetchReportData} loading={loading}>
            Tarik Laporan
          </Button>
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
      ) : !hasFetched ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Title level={4} style={{ color: '#8c8c8c', margin: 0 }}>Pilih tanggal dan tekan "Tarik Laporan" untuk menampilkan data.</Title>
        </Card>
      ) : collapseItems.length === 0 ? (
        <Card><Text type="secondary">Tidak ada data pesanan yang selesai pada periode ini.</Text></Card>
      ) : (
        <Collapse items={collapseItems} defaultActiveKey={['0']} />
      )}
    </div>
  );
};

export default Reports;

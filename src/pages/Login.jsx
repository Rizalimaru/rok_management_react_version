import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const basePath = import.meta.env.BASE_URL;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      message.success('Welcome back!');
      navigate('/');
    } catch (error) {
      console.error("Login Error:", error.code);
      if (error.code === 'auth/invalid-credential') {
        message.error('Email atau password salah!');
      } else {
        message.error('Terjadi kesalahan saat sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a', // Warna latar belakang diubah menjadi gelap (slate dark)
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px' 
    }}>
      <div style={{ 
        display: 'flex', 
        width: '100%', 
        maxWidth: '900px', 
        minHeight: '520px',
        backgroundColor: '#ffffff', 
        borderRadius: '24px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        {/* SISI KIRI: Background Beige & Logo */}
        <div style={{ 
          display: 'flex', 
          flex: 1,
          backgroundColor: '#fbfaf8', // Warna cream/beige sangat terang
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          position: 'relative'
        }} className="login-left-side">
          <div style={{ textAlign: 'center' }}>
            {/* Menggunakan gambar yang ada, dengan ukuran disesuaikan */}
            <img 
              src={`${basePath}rok_1.jpg`} 
              alt="RoK Logo" 
              style={{ width: '100%', maxWidth: '280px', borderRadius: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
            <Title level={3} style={{ color: '#101828', marginTop: '24px', marginBottom: '8px', fontWeight: 800, letterSpacing: '1px' }}>
              ROK PORTAL
            </Title>
            <Text style={{ color: '#667085', fontSize: '13px' }}>Management & Analytics Dashboard</Text>
            
            <div style={{ marginTop: '32px' }}>
              <span style={{ 
                background: '#e5e7eb', 
                padding: '6px 16px', 
                borderRadius: '20px', 
                fontSize: '11px',
                fontWeight: 600,
                color: '#4b5563',
                letterSpacing: '0.5px'
              }}>
                ADMIN PANEL
              </span>
            </div>
          </div>
        </div>

        {/* SISI KANAN: Form Login Minimalis */}
        <div style={{ 
          flex: 1, 
          padding: '40px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#ffffff'
        }} className="login-right-side">
          <div style={{ marginBottom: '32px' }}>
            <Title level={2} style={{ margin: '0 0 8px 0', color: '#1a2b4c', fontWeight: 800 }}>
              Welcome Back
            </Title>
            <Text style={{ color: '#667085', fontSize: '13px' }}>
              Masuk untuk mengakses data analitik.
            </Text>
          </div>

          <Form
            name="login_form"
            layout="vertical"
            onFinish={onFinish}
            size="large"
            requiredMark={false}
          >
            <Form.Item
              label={<span style={{ fontWeight: 700, color: '#344054', fontSize: '12px' }}>Email Akses</span>}
              name="email"
              rules={[
                { required: true, message: 'Masukkan email Anda!' },
                { type: 'email', message: 'Email tidak valid!' }
              ]}
              style={{ marginBottom: '20px' }}
            >
              <Input 
                placeholder="admin@rok.com" 
                style={{ 
                  borderRadius: '8px', 
                  backgroundColor: '#f0f4f8', // Warna latar input kebiruan terang
                  border: 'none',
                  padding: '12px 16px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                  color: '#101828'
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 700, color: '#344054', fontSize: '12px' }}>Password</span>}
              name="password"
              rules={[{ required: true, message: 'Masukkan password Anda!' }]}
              style={{ marginBottom: '32px' }}
            >
              <Input.Password 
                placeholder="••••••••" 
                style={{ 
                  borderRadius: '8px', 
                  backgroundColor: '#f0f4f8', 
                  border: 'none',
                  padding: '12px 16px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                  color: '#101828'
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '24px' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                style={{ 
                  height: '48px', 
                  borderRadius: '8px',
                  backgroundColor: '#1a2b4c', // Warna biru dongker pekat sesuai referensi
                  borderColor: '#1a2b4c',
                  fontWeight: 600,
                  fontSize: '15px'
                }}
              >
                Sign In <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ borderColor: '#f3f4f6', color: '#9ca3af', fontSize: '12px', marginTop: '16px' }}>
            RoK Management Dashboard
          </Divider>
        </div>
      </div>
      
      {/* CSS internal agar Sisi Kiri hilang di layar Mobile */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-side {
            display: none !important;
          }
          .login-right-side {
            padding: 40px 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
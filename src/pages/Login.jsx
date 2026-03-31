import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Checkbox, Row, Col } from 'antd';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase'; // Pastikan path ini sesuai

const { Title, Text, Link } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fungsi Login dengan Email & Password
  const onFinish = async (values) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      message.success('Welcome back!');
      navigate('/');
    } catch (error) {
      console.error("Login Error:", error.code);
      if (error.code === 'auth/invalid-credential') {
        message.error('Invalid email or password!');
      } else {
        message.error('An error occurred during sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fungsi Login dengan Google
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      message.success('Google sign-in successful!');
      navigate('/');
    } catch (error) {
      console.error("Google Login Error:", error);
      message.error('Failed to sign in with Google.');
    }
  };

  // Menggunakan BASE_URL bawaan Vite agar path file di public menyesuaikan dengan GitHub Pages
  const basePath = import.meta.env.BASE_URL;

  return (
    <Row style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      
      {/* SISI KIRI: Banner / Gambar Latar (Akan disembunyikan di layar kecil) */}
      <Col 
        xs={0} sm={0} md={12} lg={12} 
        style={{
          // UPDATE DI SINI: Menggunakan template literal untuk menyisipkan basePath
          background: `url('${basePath}rok_1.jpg') no-repeat center center`,
          backgroundSize: 'cover',
          backgroundColor: '#f3f4f6', // Warna cadangan jika gambar tidak ada
          position: 'relative',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {/* Placeholder Logo di Kiri Atas */}
        <div>
          <Title level={4} style={{ color: '#101828', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 24, height: 24, background: '#101828', borderRadius: 4 }}></div>
            RoK Portal
          </Title>
        </div>

        {/* Testimonial di Kiri Bawah */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.3)', 
          backdropFilter: 'blur(10px)', 
          padding: '32px', 
          borderRadius: '16px',
          maxWidth: '400px'
        }}>
          <Title level={4} style={{ color: '#101828', marginTop: 0 }}>
            "We've been using this system to manage hundreds of Rise of Kingdoms accounts effortlessly."
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
            <img
              // UPDATE DI SINI JUGA: Menambahkan basePath untuk foto profil
              src={`${basePath}profile.jpg`}
              alt="Rizalimaru Luca"
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.8)' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://avatars.githubusercontent.com/u/113398108?s=96&v=4';
              }}
            />
            <div>
              <Text strong style={{ display: 'block', color: '#101828' }}>Rizalimaru "Luca"</Text>
              <Text style={{ color: '#475467' }}>Lead Programmer of C&C Studio</Text>
            </div>
          </div>
        </div>
      </Col>

      {/* SISI KANAN: Form Login */}
      <Col xs={24} sm={24} md={12} lg={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
          
          <div style={{ marginBottom: '32px' }}>
            <Title level={2} style={{ margin: '0 0 8px 0', color: '#101828' }}>
              Welcome back
            </Title>
            <Text style={{ color: '#475467', fontSize: '16px' }}>
              Welcome back! Please enter your details.
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
              label={<span style={{ color: '#344054', fontWeight: 500 }}>Email</span>}
              name="email"
              rules={[
                { required: true, message: 'Please enter your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input 
                placeholder="Enter your email" 
                style={{ borderRadius: '8px', borderColor: '#D0D5DD' }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#344054', fontWeight: 500 }}>Password</span>}
              name="password"
              rules={[{ required: true, message: 'Please enter your password!' }]}
            >
              <Input.Password 
                placeholder="••••••••" 
                style={{ borderRadius: '8px', borderColor: '#D0D5DD' }}
              />
            </Form.Item>

            {/* Baris Remember Me & Forgot Password */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <Form.Item name="remember" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox style={{ color: '#344054' }}>Remember for 30 days</Checkbox>
              </Form.Item>
              <Link href="#" style={{ color: '#6941C6', fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>

            {/* Tombol Sign In Email */}
            <Form.Item style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                style={{ 
                  height: '44px', 
                  borderRadius: '8px',
                  backgroundColor: '#101828', // Warna tombol hitam/gelap
                  borderColor: '#101828',
                  fontWeight: 500
                }}
              >
                Sign in
              </Button>
            </Form.Item>
            
            {/* Tombol Sign In Google */}
            <Button 
              block 
              onClick={handleGoogleLogin}
              style={{ 
                height: '44px', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 500,
                color: '#344054',
                borderColor: '#D0D5DD'
              }}
            >
              {/* Ikon Google SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </Button>
          </Form>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Text style={{ color: '#475467' }}>Don't have an account? </Text>
            <Link href="#" style={{ color: '#6941C6', fontWeight: 500 }}>Sign up</Link>
          </div>

        </div>
      </Col>
    </Row>
  );
};

export default Login;
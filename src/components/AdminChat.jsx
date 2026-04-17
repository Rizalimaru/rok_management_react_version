import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Typography, Badge, message, theme } from 'antd';
import { CommentOutlined, CloseOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const { Text } = Typography;

const AdminChat = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const { token } = theme.useToken();

  // Load last read timestamp from local storage
  const getLastReadTime = () => {
    const time = localStorage.getItem('adminChatLastRead');
    return time ? parseInt(time, 10) : 0;
  };

  const setLastReadTime = (time) => {
    localStorage.setItem('adminChatLastRead', time.toString());
  };

  // Meminta izin notifikasi browser saat pertama kali render
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/communication/bubble_pop.ogg');
      audio.play().catch(e => console.log('Audio autoplay blocked:', e));
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const showBrowserNotification = (docData) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const sender = getName(docData.senderEmail);
      new Notification(`Pesan baru dari ${sender}`, {
        body: docData.text,
      });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'admin_chats'), orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);

      // Hitung unread (jika chat tidak terbuka)
      if (!isOpen) {
        const lastRead = getLastReadTime();
        let unread = 0;
        msgs.forEach(m => {
          const mTime = m.timestamp?.toMillis() || Date.now();
          if (mTime > lastRead) {
            unread++;
          }
        });
        setUnreadCount(unread);
      }

      // Deteksi pesan baru untuk SFX dan Notifikasi
      if (!isInitialLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const docData = change.doc.data();
            // Cek apakah pesan berasal dari orang lain
            if (docData.senderEmail !== user?.email) {
              playNotificationSound();
              // Jangan tampilkan notifikasi browser jika chat window sedang terbuka dan tab aktif (tapi bisa disesuaikan, untuk amannya kita tampilkan jika chat ditutup ATAU kalau document hidden)
              if (!isOpen || document.hidden) {
                showBrowserNotification(docData);
              }
            }
          }
        });
      } else {
        // Tandai bahwa initial load telah selesai
        isInitialLoadRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [isOpen, user]); // tambah user ke dependency

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleChat = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      // Saat membuka chat, reset unread count dan perbarui lastReadTime
      setUnreadCount(0);
      setLastReadTime(Date.now());
    } else {
      // Sama seperti saat membuka, kita set current time pas dia tutup agar pesan kedepannya masuk unread
      setLastReadTime(Date.now());
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    const text = inputValue.trim();
    setInputValue(''); // Clear input optimistically

    try {
      await addDoc(collection(db, 'admin_chats'), {
        text,
        senderEmail: user.email,
        timestamp: serverTimestamp()
      });
      // Ketika mengirim pesan, langsung update read time supaya pesan sendiri tidak masuk unread
      setLastReadTime(Date.now());
    } catch (error) {
      console.error("Gagal mengirim chat: ", error);
      message.error("Gagal mengirim pesan.");
    }
  };

  // Get name from email (e.g., admin@example.com -> Admin)
  const getName = (email) => {
    if (!email) return 'User';
    return email.split('@')[0];
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date();
    let hours = date.getHours().toString().padStart(2, '0');
    let mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  // Floating button & Card styles
  const styles = {
    floatingButton: {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: 1000,
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: token.colorPrimary || '#1677ff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#fff',
      fontSize: '24px',
      transition: 'all 0.3s',
    },
    chatWindow: {
      position: 'fixed',
      bottom: '100px',
      right: '30px',
      width: '350px',
      height: '500px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: token.colorBgContainer || '#fff',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid ${token.colorBorderSecondary || '#f0f0f0'}`,
    },
    chatHeader: {
      padding: '16px',
      backgroundColor: token.colorPrimary || '#1677ff',
      color: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    chatBody: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
      backgroundColor: token.colorBgLayout || '#f5f5f5',
    },
    chatFooter: {
      padding: '12px',
      backgroundColor: token.colorBgContainer || '#fff',
      borderTop: `1px solid ${token.colorBorderSecondary || '#f0f0f0'}`,
      display: 'flex',
      gap: '8px'
    },
    messageBubble: (isMine) => ({
      padding: '6px 12px',
      borderRadius: '12px',
      backgroundColor: isMine ? (token.colorPrimary || '#1677ff') : '#fff',
      color: isMine ? '#fff' : (token.colorText || '#000'),
      width: 'fit-content',
      border: isMine ? 'none' : `1px solid ${token.colorBorderSecondary || '#f0f0f0'}`,
      boxShadow: isMine ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
      display: 'inline-flex',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: '8px',
    })
  };

  return (
    <>
      <div
        style={styles.floatingButton}
        onClick={toggleChat}
        className="admin-chat-trigger"
      >
        <Badge count={unreadCount} overflowCount={99} offset={[-5, 5]} size="default">
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            justifyContent: 'center', alignItems: 'center', color: '#fff'
          }}>
            {isOpen ? <CloseOutlined style={{ fontSize: '20px' }} /> : <CommentOutlined style={{ fontSize: '24px' }} />}
          </div>
        </Badge>
      </div>

      <div style={{
        ...styles.chatWindow,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)'
      }}>
        <div style={styles.chatHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CommentOutlined style={{ fontSize: '18px' }} />
            <Text style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>Admin Chat</Text>
          </div>
          <CloseOutlined style={{ cursor: 'pointer', fontSize: '16px' }} onClick={toggleChat} />
        </div>

        <div style={styles.chatBody}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: token.colorTextSecondary || '#8c8c8c', marginTop: '20px' }}>
              Belum ada pesan. Mulai obrolan!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, idx) => {
                const isMine = msg.senderEmail === user?.email;
                return (
                  <div key={msg.id || idx} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px' }}>
                    <Avatar
                      size="small"
                      style={{ backgroundColor: isMine ? '#f56a00' : '#87d068', flexShrink: 0 }}
                      icon={<UserOutlined />}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <Text style={{ fontSize: '11px', color: token.colorTextSecondary || '#8c8c8c', marginBottom: '2px', marginLeft: '4px', marginRight: '4px' }}>
                        {getName(msg.senderEmail)}
                      </Text>
                      <div style={styles.messageBubble(isMine)}>
                        <Text style={{ color: 'inherit', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{msg.text}</Text>
                        <span style={{
                          fontSize: '10px',
                          color: isMine ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)',
                          position: 'relative',
                          top: '2px',
                          display: 'inline-block',
                          marginLeft: 'auto' // push to right if multi-line
                        }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div style={styles.chatFooter}>
          <Input
            placeholder="Tulis pesan..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSendMessage}
            bordered={false}
            style={{ backgroundColor: token.colorBgLayout || '#f5f5f5', borderRadius: '20px', padding: '8px 16px' }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          />
        </div>
      </div>
    </>
  );
};

export default AdminChat;

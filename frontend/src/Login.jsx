import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/todos';
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert('Sơn ơi, bạn chưa nhập Tên hoặc Mật khẩu!');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username: username.trim(),
        password,
      });

      const token = response.data.token;
      localStorage.setItem('token', token);

      alert('Đăng nhập thành công! Chào mừng Sơn trở lại.');
      window.location.href = '/todos';
    } catch (error) {
      console.error('Lỗi đăng nhập:', error.response?.data);
      alert(error.response?.data?.error || 'Sai tài khoản hoặc mật khẩu rồi Sơn ơi!');
    }
  };

  return (
    <div
      style={{
        padding: '40px',
        maxWidth: '400px',
        margin: '100px auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#333' }}>Đăng nhập Hệ thống</h2>
      <hr style={{ marginBottom: '30px' }} />

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label>Tên đăng nhập</label>
          <input
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '5px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
            type="text"
            placeholder="Nhập username của Sơn..."
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label>Mật khẩu</label>
          <input
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '5px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
            type="password"
            placeholder="Nhập mật khẩu..."
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Vào ứng dụng To-do
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px' }}>Chưa có tài khoản?</p>
        <button
          onClick={() => {
            window.location.href = '/register';
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#3498db',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Đăng ký thành viên mới tại đây
        </button>
      </div>
    </div>
  );
}

export default Login;
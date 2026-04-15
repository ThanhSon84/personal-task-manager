import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();

  try {
    await axios.post('http://localhost:5000/api/register', {
      username,
      password,
    });

    alert('Đăng ký thành công! Giờ bạn có thể đăng nhập.');
    window.location.href = '/';
  } catch (error) {
    console.error('Lỗi đăng ký:', error.response?.data || error.message);
    alert(error.response?.data?.error || 'Lỗi hệ thống khi đăng ký');
  }
};

  return (
    <div style={{ padding: '20px' }}>
      <h2>Tạo tài khoản mới</h2>

      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Tên đăng nhập mới"
          onChange={(e) => setUsername(e.target.value)}
        />
        <br />
        <br />

        <input
          type="password"
          placeholder="Mật khẩu"
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <br />

        <button type="submit">Đăng ký</button>
      </form>

      <p>
        Đã có tài khoản? <a href="/">Đăng nhập ngay</a>
      </p>
    </div>
  );
}

export default Register;
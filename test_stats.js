const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'test3@email.com',
      password: 'testpassword'
    });
    const token = loginRes.data.token;
    console.log("Token:", token.substring(0,20) + '...');
    
    // Test the exact failing endpoint
    const statsRes = await axios.get('http://localhost:8080/api/user/statistics', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Stats Success:", statsRes.status, statsRes.data);
    
  } catch (err) {
    console.log("ERROR:", err.response?.status, err.response?.data || err.message);
  }
}
test();

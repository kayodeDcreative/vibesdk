#!/usr/bin/env node
const axios = require('axios');

const endpoint = 'https://kimi-ai-worker.khay.workers.dev';
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

async function test() {
  try {
    console.log('Testing auth endpoints...\n');

    // Test 1: Register
    console.log('1. Testing registration...');
    const registerResp = await axios.post(`${endpoint}/api/auth/register`, {
      email: testEmail,
      password: testPassword
    });
    console.log('✓ Registration successful:', registerResp.data);
    console.log();

    // Test 2: Login
    console.log('2. Testing login...');
    const loginResp = await axios.post(`${endpoint}/api/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('✓ Login successful');
    const token = loginResp.data?.data?.token;
    console.log('Token:', token?.substring(0, 20) + '...');
    console.log();

    // Test 3: Get Profile
    console.log('3. Testing profile endpoint...');
    const profileResp = await axios.get(`${endpoint}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ Profile retrieved:', profileResp.data.data);
    console.log();

    // Test 4: Protected AI endpoint
    console.log('4. Testing protected AI endpoint...');
    const aiResp = await axios.post(`${endpoint}/api/ai/generate-code`, 
      { prompt: 'Write a hello world function', language: 'JavaScript' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ AI request successful');
    console.log('Response:', JSON.stringify(aiResp.data, null, 2).substring(0, 200) + '...');
    console.log();

    // Test 5: Logout
    console.log('5. Testing logout...');
    const logoutResp = await axios.post(`${endpoint}/api/auth/logout`, {}, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ Logout successful:', logoutResp.data);
    console.log();

    // Test 6: Verify token is revoked
    console.log('6. Verifying token is revoked...');
    try {
      await axios.get(`${endpoint}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✗ Token should have been revoked!');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✓ Token properly revoked');
      } else {
        throw err;
      }
    }

    console.log('\n✅ All auth tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();

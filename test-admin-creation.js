/**
 * Admin Creation Test Script
 * Tests the actual API endpoint with various password scenarios
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test cases
const testCases = [
  {
    name: 'Invalid: Too Short',
    payload: {
      username: 'testadmin1',
      email: 'test1@example.com',
      password: 'Pass1!',
      role: 'ADMIN'
    },
    shouldFail: true,
    expectedError: 'at least 10 characters'
  },
  {
    name: 'Invalid: No Special Character',
    payload: {
      username: 'testadmin2',
      email: 'test2@example.com',
      password: 'Password123',
      role: 'ADMIN'
    },
    shouldFail: true,
    expectedError: 'special character'
  },
  {
    name: 'Invalid: No Uppercase',
    payload: {
      username: 'testadmin3',
      email: 'test3@example.com',
      password: 'password123!',
      role: 'ADMIN'
    },
    shouldFail: true,
    expectedError: 'uppercase'
  },
  {
    name: 'Invalid: Repeated Characters',
    payload: {
      username: 'testadmin4',
      email: 'test4@example.com',
      password: 'Pass111word!',
      role: 'ADMIN'
    },
    shouldFail: true,
    expectedError: 'repeated'
  },
  {
    name: 'Valid: Strong Password',
    payload: {
      username: 'testadmin5',
      email: 'test5@example.com',
      password: 'SecurePass123!',
      role: 'ADMIN'
    },
    shouldFail: false
  }
];

async function runTests() {
  console.log('🚀 Starting Admin Creation Tests\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Username: ${test.payload.username}`);
    console.log(`   Password: ${test.payload.password}`);
    console.log(`   Expected: ${test.shouldFail ? 'FAIL' : 'SUCCESS'}`);
    
    try {
      // Note: This requires authentication
      // You'll need to add your auth token here
      const response = await axios.post(`${BASE_URL}/admins`, test.payload, {
        headers: {
          'Content-Type': 'application/json',
          // Add your auth headers here
          // 'Cookie': 'accessToken=YOUR_TOKEN',
          // 'X-CSRF-Token': 'YOUR_CSRF_TOKEN'
        },
        withCredentials: true
      });
      
      if (test.shouldFail) {
        console.log(`   ❌ FAILED: Expected error but got success`);
        console.log(`   Response:`, response.data);
        failed++;
      } else {
        console.log(`   ✅ PASSED: Admin created successfully`);
        console.log(`   Admin ID:`, response.data.data?.admin?.id);
        passed++;
      }
    } catch (error) {
      if (test.shouldFail) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        const details = error.response?.data?.details || [];
        
        console.log(`   ✅ PASSED: Got expected error`);
        console.log(`   Error:`, errorMsg);
        if (details.length > 0) {
          console.log(`   Details:`, details);
        }
        passed++;
      } else {
        console.log(`   ❌ FAILED: Expected success but got error`);
        console.log(`   Error:`, error.response?.data || error.message);
        failed++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
  console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
}

// Run tests
runTests().catch(console.error);

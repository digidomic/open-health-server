class ApiService {
  async sendHealthData(serverIp, backendPort, token, data) {
    try {
      const url = `http://${serverIp}:${backendPort}/api/health?token=${token}`;
      
      console.log('Sending data to:', url);
      console.log('Data:', JSON.stringify(data, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log('API Response:', result);
      return true;
    } catch (error) {
      console.error('Network error:', error);
      return false;
    }
  }

  async testConnection(serverIp, backendPort, token) {
    try {
      const url = `http://${serverIp}:${backendPort}/api/health/latest?token=${token}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export default new ApiService();
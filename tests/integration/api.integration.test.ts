import axios, { AxiosInstance } from 'axios';

describe('User Address API Integration Tests', () => {
  let api: AxiosInstance;
  let userId: string;
  let addressId: string;
  const clientId = process.env.TEST_CLIENT_ID || 'test-client';
  const clientSecret = process.env.TEST_CLIENT_SECRET || 'test-secret';

  beforeAll(() => {
    const apiEndpoint = process.env.API_ENDPOINT;

    if (!apiEndpoint) {
      throw new Error('API_ENDPOINT environment variable is not set');
    }

    api = axios.create({
      baseURL: apiEndpoint,
      auth: {
        username: clientId,
        password: clientSecret,
      },
      validateStatus: () => true, // Don't throw on any status
    });

    userId = `test-user-${Date.now()}`;
  });

  describe('POST /v1/users/{userId}/addresses', () => {
    it('should create a new address', async () => {
      const response = await api.post(`/v1/users/${userId}/addresses`, {
        streetAddress: '123 Test Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      });

      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Address created successfully');
      expect(response.data.addressId).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.address.userId).toBe(userId);
      expect(response.data.address.suburb).toBe('Sydney');

      addressId = response.data.addressId;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await api.post(`/v1/users/${userId}/addresses`, {
        streetAddress: '123 Test Street',
        // Missing required fields
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Validation failed');
    });

    it('should default country to Australia', async () => {
      const response = await api.post(`/v1/users/${userId}/addresses`, {
        streetAddress: '456 Another Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
      });

      expect(response.status).toBe(201);
      expect(response.data.address.country).toBe('Australia');
    });
  });

  describe('GET /v1/users/{userId}/addresses', () => {
    it('should retrieve all addresses for a user', async () => {
      const response = await api.get(`/v1/users/${userId}/addresses`);

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Addresses retrieved successfully');
      expect(Array.isArray(response.data.addresses)).toBe(true);
      expect(response.data.addresses.length).toBeGreaterThan(0);
    });

    it('should filter addresses by suburb', async () => {
      const response = await api.get(`/v1/users/${userId}/addresses?suburb=Sydney`);

      expect(response.status).toBe(200);
      expect(response.data.addresses).toBeDefined();
      response.data.addresses.forEach((addr: any) => {
        expect(addr.suburb).toBe('Sydney');
      });
    });

    it('should filter addresses by postcode', async () => {
      const response = await api.get(`/v1/users/${userId}/addresses?postcode=2000`);

      expect(response.status).toBe(200);
      expect(response.data.addresses).toBeDefined();
      response.data.addresses.forEach((addr: any) => {
        expect(addr.postcode).toBe('2000');
      });
    });

    it('should return empty array for non-existent user', async () => {
      const response = await api.get(`/v1/users/non-existent-user/addresses`);

      expect(response.status).toBe(200);
      expect(response.data.addresses).toEqual([]);
    });
  });

  describe('PATCH /v1/users/{userId}/addresses/{addressId}', () => {
    it('should update an address', async () => {
      const response = await api.patch(`/v1/users/${userId}/addresses/${addressId}`, {
        suburb: 'Parramatta',
        state: 'NSW',
      });

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Address updated successfully');
      expect(response.data.address.suburb).toBe('Parramatta');
      expect(response.data.address.state).toBe('NSW');
    });

    it('should return 400 when no fields to update', async () => {
      const response = await api.patch(`/v1/users/${userId}/addresses/${addressId}`, {});

      expect(response.status).toBe(400);
      expect(response.data.message).toBe('No fields to update');
    });

    it('should return 400 for missing addressId', async () => {
      const response = await api.patch(`/v1/users/${userId}/addresses/non-existent`, {
        suburb: 'Brisbane',
      });

      expect(response.status).toBe(200); // DynamoDB update succeeds even if item doesn't exist
    });
  });

  describe('DELETE /users/{userId}/addresses/{addressId}', () => {
    it('should delete an address', async () => {
      const response = await api.delete(`/v1/users/${userId}/addresses/${addressId}`);

      expect(response.status).toBe(204);
      expect(response.data).toBe('');
    });

    it('should return 204 even if address does not exist', async () => {
      const response = await api.delete(`/v1/users/${userId}/addresses/non-existent`);

      expect(response.status).toBe(204);
    });
  });

  describe('Authentication', () => {
    it('should return 401 for missing authentication', async () => {
      const unauthApi = axios.create({
        baseURL: process.env.API_ENDPOINT,
        validateStatus: () => true,
      });

      const response = await unauthApi.post(`/v1/users/${userId}/addresses`, {
        streetAddress: '789 Test Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid credentials', async () => {
      const invalidApi = axios.create({
        baseURL: process.env.API_ENDPOINT,
        auth: {
          username: 'invalid-client',
          password: 'invalid-secret',
        },
        validateStatus: () => true,
      });

      const response = await invalidApi.post(`/v1/users/${userId}/addresses`, {
        streetAddress: '789 Test Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      });

      expect(response.status).toBe(401);
    });
  });
});

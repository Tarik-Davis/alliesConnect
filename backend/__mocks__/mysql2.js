const mockConnection = {
  query: jest.fn().mockResolvedValue([[], []]),
  release: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  beginTransaction: jest.fn()
};

const mockPool = {
  getConnection: jest.fn((cb) => {
    if (cb) cb(null, mockConnection);
    return mockConnection;
  }),
  query: jest.fn((query, params, cb) => {
    if (cb) cb(null, [], []);
  }),
  promise: jest.fn().mockReturnValue({
    query: jest.fn().mockResolvedValue([[], []]),
    getConnection: jest.fn().mockResolvedValue(mockConnection)
  })
};

module.exports = {
  createPool: jest.fn(() => mockPool),
  // Expose for asserting in tests
  _mockConnection: mockConnection,
  _mockPool: mockPool
};

import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const predictTransaction = (data) =>
  api.post('/predict', data).then(r => r.data)

export const getTransactions = (limit = 50) =>
  api.get(`/transactions?limit=${limit}`).then(r => r.data)

export const getUserTransactions = (userId) =>
  api.get(`/transactions/${userId}`).then(r => r.data)
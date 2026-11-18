import client from './client.js'

// Agents with their categories: [{ id, name, categories: [{ id, name }] }] (agents and admins only).
export const listAgents = (categoryId) =>
  client.get('/agents', { params: { categoryId } }).then((r) => r.data)

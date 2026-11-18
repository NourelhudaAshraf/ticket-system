import client from './client.js'

// Non-deleted categories sorted by name (customers get only id and name).
export const listCategories = () => client.get('/categories').then((r) => r.data)

// Admin only. { name, defaultAgentId } → the saved category; the default agent is added to it.
export const createCategory = (category) => client.post('/categories', category).then((r) => r.data)

export const updateCategory = (id, category) => client.put(`/categories/${id}`, category).then((r) => r.data)

// Soft delete: hidden everywhere, but existing tickets keep showing its name.
export const deleteCategory = (id) => client.delete(`/categories/${id}`)

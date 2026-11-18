import client from './client.js'

// Admin user management (/admin/users). Admins only; there is no delete.

// params: { role, q, page, pageSize } → { items, page, pageSize, totalCount }
export const listUsers = (params) => client.get('/admin/users', { params }).then((r) => r.data)

export const getUser = (id) => client.get(`/admin/users/${id}`).then((r) => r.data)

// Invites a user: { name, email, role, categoryIds } — they get an email to choose a password.
export const createUser = (user) => client.post('/admin/users', user).then((r) => r.data)

// { name, role, categoryIds } (the email can't be changed)
export const updateUser = (id, user) => client.put(`/admin/users/${id}`, user).then((r) => r.data)

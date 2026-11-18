import client from './client.js'

// Admin only. params: { createdFrom, createdTo } (yyyy-mm-dd, both optional)
// → { total, byStatus: { Open, InProgress, Resolved, Closed }, byPriority: { Low, Medium, High, Urgent } }
export const getDashboard = (params) => client.get('/admin/dashboard', { params }).then((r) => r.data)

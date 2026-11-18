import client from './client.js'

// One function per ticket endpoint; each returns the response body. Errors arrive as the
// { status, code, message, errors } object built in client.js.

// params: { scope, status: [], priority: [], q, sort, dir, page, pageSize }. `indexes: null` sends
// arrays as repeated keys (status=Open&status=Resolved), which is what the API expects.
export const listTickets = (params) =>
  client.get('/tickets', { params, paramsSerializer: { indexes: null } }).then((r) => r.data)

export const getTicket = (id) => client.get(`/tickets/${id}`).then((r) => r.data)

// { title, description, categoryId, priority, relatedTicketId? } → the new ticket.
export const createTicket = (ticket) => client.post('/tickets', ticket).then((r) => r.data)

export const addComment = (ticketId, body) =>
  client.post(`/tickets/${ticketId}/comments`, { body }).then((r) => r.data)

// Agent/admin actions; each returns the updated ticket detail.
export const changeStatus = (ticketId, status) =>
  client.post(`/tickets/${ticketId}/status`, { status }).then((r) => r.data)

export const updatePriority = (ticketId, priority) =>
  client.patch(`/tickets/${ticketId}`, { priority }).then((r) => r.data)

// Moves the ticket to another agent and one of that agent's categories.
export const assignTicket = (ticketId, { agentId, categoryId }) =>
  client.post(`/tickets/${ticketId}/assign`, { agentId, categoryId }).then((r) => r.data)

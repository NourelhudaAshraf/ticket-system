import { createBrowserRouter } from 'react-router'
import GuestRoute from './auth/GuestRoute.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import RoleHomeRedirect from './auth/RoleHomeRedirect.jsx'
import Layout from './components/Layout.jsx'
import AdminCategoriesPage from './features/admin/AdminCategoriesPage.jsx'
import AdminTicketsPage from './features/admin/AdminTicketsPage.jsx'
import AdminUsersPage from './features/admin/AdminUsersPage.jsx'
import DashboardPage from './features/admin/DashboardPage.jsx'
import AgentQueuePage from './features/agent/AgentQueuePage.jsx'
import CategoryTicketsPage from './features/agent/CategoryTicketsPage.jsx'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import RegisterPage from './features/auth/RegisterPage.jsx'
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx'
import VerifyEmailPage from './features/auth/VerifyEmailPage.jsx'
import NotFoundPage from './features/common/NotFoundPage.jsx'
import MyTicketsPage from './features/tickets/MyTicketsPage.jsx'
import NewTicketPage from './features/tickets/NewTicketPage.jsx'
import TicketDetailPage from './features/tickets/TicketDetailPage.jsx'

// Every URL of the app and the page it shows (contracts/ui-routes.md).
// Public pages first; everything else needs sign-in and is drawn inside <Layout />.
// `roles` limits a page to some roles; the API checks permissions again on every request.
const only = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
const guest = (element) => <GuestRoute>{element}</GuestRoute>

export const router = createBrowserRouter([
  // Guest-only: a signed-in user is sent to their start page instead.
  { path: '/login', element: guest(<LoginPage />) },
  { path: '/register', element: guest(<RegisterPage />) },
  { path: '/forgot-password', element: guest(<ForgotPasswordPage />) },
  // Open to everyone: emailed links must work whether or not someone is signed in on this browser.
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleHomeRedirect /> },

      // Customer
      { path: 'tickets', element: only(['Customer'], <MyTicketsPage />) },
      { path: 'tickets/new', element: only(['Customer'], <NewTicketPage />) },

      // Any role; the API answers 404 when this user may not see the ticket.
      { path: 'tickets/:id', element: <TicketDetailPage /> },

      // Agent
      { path: 'queue', element: only(['Agent'], <AgentQueuePage />) },
      { path: 'categories/:categoryId?', element: only(['Agent'], <CategoryTicketsPage />) },

      // Admin
      { path: 'admin/dashboard', element: only(['Admin'], <DashboardPage />) },
      { path: 'admin/tickets', element: only(['Admin'], <AdminTicketsPage />) },
      { path: 'admin/users', element: only(['Admin'], <AdminUsersPage />) },
      { path: 'admin/categories', element: only(['Admin'], <AdminCategoriesPage />) },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

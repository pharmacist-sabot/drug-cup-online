import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

// Import components for routes
import Login from '@/views/Login.vue'
import Home from '@/views/Home.vue'
import PcuDashboard from '@/views/pcu/PcuDashboard.vue'
import RequisitionForm from '@/views/pcu/RequisitionForm.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import ReportGenerator from '@/views/admin/ReportGenerator.vue'
import RequisitionDetail from '@/views/pcu/RequisitionDetail.vue' 
import AdminRequisitionDetail from '@/views/admin/AdminRequisitionDetail.vue';

const routes = [
  { 
    path: '/login', 
    name: 'Login', 
    component: Login 
  },
  { 
    path: '/', 
    name: 'Home', 
    component: Home, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/pcu/dashboard', 
    name: 'PcuDashboard', 
    component: PcuDashboard, 
    meta: { requiresAuth: true, requiresPcu: true } 
  },
  { 
    // --- UPDATED PATH ---
    // Added ':requisitionId?' to handle both 'new' and 'edit' modes.
    // The '?' makes the parameter optional.
    path: '/pcu/requisition/:periodId/:requisitionId?', 
    name: 'RequisitionForm', 
    component: RequisitionForm, 
    meta: { requiresAuth: true, requiresPcu: true },
    props: true // This allows the component to receive params as props
  },
  { 
    path: '/admin/dashboard', 
    name: 'AdminDashboard', 
    component: AdminDashboard, 
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { 
    path: '/admin/reports', 
    name: 'ReportGenerator', 
    component: ReportGenerator, 
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    // Fallback route for any path that doesn't match
    path: '/:pathMatch(.*)*',
    redirect: '/'
  },
  {
    path: '/pcu/history/:requisitionId',
    name: 'RequisitionDetail',
    component: RequisitionDetail,
    meta: { requiresAuth: true, requiresPcu: true },
    props: true
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  },
  {
    path: '/admin/requisition/:requisitionId',
    name: 'AdminRequisitionDetail',
    component: AdminRequisitionDetail,
    meta: { requiresAuth: true, requiresAdmin: true },
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation Guard: Protects routes based on authentication and roles
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Try to fetch the user session if it's not already in the store
  if (!authStore.isLoggedIn) {
    await authStore.fetchSession()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // Redirect to login if route requires auth and user is not logged in
  if (requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  } 
  
  // Redirect to home if user is already logged in and tries to access login page
  if (to.name === 'Login' && authStore.isLoggedIn) {
    return next({ name: 'Home' });
  }

  // Role-based protection
  const isAdminRoute = to.matched.some(record => record.meta.requiresAdmin);
  const isPcuRoute = to.matched.some(record => record.meta.requiresPcu);

  if (isAdminRoute && !authStore.isAdmin) {
    // Non-admin user trying to access admin route
    console.warn('Access denied: Non-admin user trying to access an admin route.');
    return next({ name: 'Home' });
  }

  if (isPcuRoute && authStore.isAdmin) {
    // Admin trying to access a PCU-specific route
    console.warn('Access denied: Admin user trying to access a PCU route.');
    return next({ name: 'Home' });
  }

  // If all checks pass, proceed to the requested route
  next()
})

export default router
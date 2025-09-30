import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

// Import Components 
import Login from '@/views/Login.vue'
import Home from '@/views/Home.vue'

// PCU Views
import PcuDashboard from '@/views/pcu/PcuDashboard.vue'
import RequisitionForm from '@/views/pcu/RequisitionForm.vue'
import RequisitionDetail from '@/views/pcu/RequisitionDetail.vue' 

// Admin Views
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import AdminRequisitionDetail from '@/views/admin/AdminRequisitionDetail.vue'
import ReportGenerator from '@/views/admin/ReportGenerator.vue'
import ItemManagement from '@/views/admin/ItemManagement.vue'
import RequisitionSummary from '@/views/admin/RequisitionSummary.vue'
import PrintableView from '@/views/admin/PrintableView.vue'
import RequisitionSummaryPrint from '@/views/admin/RequisitionSummaryPrint.vue'
import SystemSettings from '@/views/admin/SystemSettings.vue';
import AccountingReport from '@/views/admin/AccountingReport.vue';
import AccountingReportPrint from '@/views/admin/AccountingReportPrint.vue';

// Define Routes 
const routes = [
  // Public Routes
  { 
    path: '/login', 
    name: 'Login', 
    component: Login 
  },

  // Authenticated Routes 
  { 
    path: '/', 
    name: 'Home', 
    component: Home, 
    meta: { requiresAuth: true } 
  },

  // PCU Specific Routes 
  { 
    path: '/pcu/dashboard', 
    name: 'PcuDashboard', 
    component: PcuDashboard, 
    meta: { requiresAuth: true, requiresPcu: true } 
  },
  { 
    path: '/pcu/requisition/:periodId/:requisitionId?', 
    name: 'RequisitionForm', 
    component: RequisitionForm, 
    meta: { requiresAuth: true, requiresPcu: true },
    props: true 
  },
  {
    path: '/pcu/history/:requisitionId',
    name: 'RequisitionDetail',
    component: RequisitionDetail,
    meta: { requiresAuth: true, requiresPcu: true },
    props: true
  },

  // Admin Specific Routes 
  { 
    path: '/admin/dashboard', 
    name: 'AdminDashboard', 
    component: AdminDashboard, 
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/requisition/:requisitionId',
    name: 'AdminRequisitionDetail',
    component: AdminRequisitionDetail,
    meta: { requiresAuth: true, requiresAdmin: true },
    props: true
  },
  { 
    path: '/admin/item-management', 
    name: 'ItemManagement',
    component: ItemManagement,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/requisition-summary',
    name: 'RequisitionSummary',
    component: RequisitionSummary,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { 
    path: '/admin/reports', 
    name: 'ReportGenerator', 
    component: ReportGenerator, 
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/settings', 
    name: 'SystemSettings',
    component: SystemSettings,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  
  // Print Routes (No Layout)
  {
    path: '/print/requisition',
    name: 'PrintRequisition',
    component: PrintableView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/print/summary',
    name: 'PrintRequisitionSummary',
    component: RequisitionSummaryPrint,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
   {
    path: '/admin/accounting-report',
    name: 'AccountingReport',
    component: AccountingReport,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/print/accounting-report',
    name: 'AccountingReportPrint',
    component: AccountingReportPrint,
    meta: { requiresAuth: true, requiresAdmin: true }
  },

  // Fallback Route 
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    await authStore.fetchSession()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  } 
  
  if (to.name === 'Login' && authStore.isLoggedIn) {
    return next({ name: 'Home' });
  }

  const isAdminRoute = to.matched.some(record => record.meta.requiresAdmin);
  const isPcuRoute = to.matched.some(record => record.meta.requiresPcu);

  if (isAdminRoute && !authStore.isAdmin) {
    console.warn('Access denied: Non-admin user trying to access an admin route.');
    return next({ name: 'Home' });
  }

  if (isPcuRoute && authStore.isAdmin) {
    console.warn('Access denied: Admin user trying to access a PCU route.');
    return next({ name: 'Home' });
  }

  next()
})

export default router
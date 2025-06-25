import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ClientManagement from '../views/ClientManagement.vue'
import StaffManagement from '../views/StaffManagement.vue'
import InvoiceCreate from '../views/InvoiceCreate.vue'
import InvoiceList from '../views/InvoiceList.vue'
import InvoiceDetails from '../views/InvoiceDetails.vue'
import ProductServiceManagement from '../views/ProductServiceManagement.vue' // Renamed from ItemCatalogManagement

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/clients',
      name: 'clients',
      component: ClientManagement
    },
    { // MODIFIED ROUTE
      path: '/staff',
      name: 'staff',
      component: StaffManagement
    },
    {
      path: '/products-services', // Renamed route path
      name: 'products-services', // Renamed route name
      component: ProductServiceManagement
    },
    {
      path: '/invoices/create',
      name: 'create-invoice',
      component: InvoiceCreate
    },
    {
      path: '/invoices',
      name: 'invoice-list',
      component: InvoiceList
    },
    {
      path: '/invoices/:id',
      name: 'invoice-details',
      component: InvoiceDetails,
      props: true
    },
    {
      path: '/invoices/edit/:id',
      name: 'edit-invoice',
      component: InvoiceCreate,
      props: true
    }
  ]
})

export default router
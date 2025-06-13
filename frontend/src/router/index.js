import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ClientManagement from '../views/ClientManagement.vue'
import ArtistManagement from '../views/ArtistManagement.vue'
import InvoiceCreate from '../views/InvoiceCreate.vue'
import InvoiceList from '../views/InvoiceList.vue'
import InvoiceDetails from '../views/InvoiceDetails.vue'

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
    {
      path: '/artists',
      name: 'artists',
      component: ArtistManagement
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
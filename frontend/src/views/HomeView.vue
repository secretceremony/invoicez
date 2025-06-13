<template>
  <v-container>
    <v-card class="mx-auto" max-width="800">
      <v-card-title class="text-h4">Welcome to Invoice Manager!</v-card-title>
      <v-card-text>
        <p class="text-subtitle-1">
          Your comprehensive solution for managing artist checks, art commissions, and custom merch invoices.
        </p>
        <p>
          Use the navigation drawer on the left to:
        </p>
        <ul>
          <li>Manage your clients.</li>
          <li>Manage your artists.</li>
          <li>Create new invoices.</li>
          <li>View and manage all your existing invoices.</li>
        </ul>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" :to="{ name: 'create-invoice' }">
          <v-icon left>mdi-file-document-plus</v-icon>
          Create New Invoice
        </v-btn>
        <v-btn color="secondary" :to="{ name: 'invoice-list' }">
          <v-icon left>mdi-format-list-bulleted</v-icon>
          View All Invoices
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
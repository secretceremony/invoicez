<script setup>
import { computed, watch } from 'vue';

const props = defineProps({
  item: {
    type: Object,
    required: true,
    default: () => ({
      Description: '',
      Quantity: 1,
      UnitPrice: 0,
      LineTotal: 0,
    }),
  },
  index: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['update:item', 'remove']);

const localItem = computed({
  get: () => props.item,
  set: (newValue) => {
    emit('update:item', newValue);
  },
});

const computedLineTotal = computed(() => {
  const qty = parseFloat(localItem.value.Quantity) || 0;
  const price = parseFloat(localItem.value.UnitPrice) || 0;
  return qty * price;
});

watch(computedLineTotal, (newVal) => {
    if (localItem.value.LineTotal !== newVal) { // Only update if different to avoid infinite loop
        localItem.value = {
            ...localItem.value,
            LineTotal: newVal
        };
    }
}, { immediate: true }); // immediate: true ensures calculation on initial load
</script>

<template>
  <v-row align="center">
    <v-col cols="12" sm="5">
      <v-text-field
        v-model="localItem.Description"
        label="Description"
        density="compact"
        hide-details
      ></v-text-field>
    </v-col>
    <v-col cols="4" sm="2">
      <v-text-field
        v-model.number="localItem.Quantity"
        label="Qty"
        type="number"
        min="1"
        density="compact"
        hide-details
      ></v-text-field>
    </v-col>
    <v-col cols="4" sm="2">
      <v-text-field
        v-model.number="localItem.UnitPrice"
        label="Unit Price (IDR)"
        type="number"
        min="0"
        density="compact"
        hide-details
      ></v-text-field>
    </v-col>
    <v-col cols="4" sm="2">
      <v-text-field
        :model-value="computedLineTotal"
        label="Line Total (IDR)"
        readonly
        density="compact"
        hide-details
      ></v-text-field>
    </v-col>
    <v-col cols="12" sm="1" class="d-flex justify-end">
      <v-btn icon color="error" size="small" @click="$emit('remove', index)">
        <v-icon>mdi-close-circle</v-icon>
      </v-btn>
    </v-col>
  </v-row>
</template>
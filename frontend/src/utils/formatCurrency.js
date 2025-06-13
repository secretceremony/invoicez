export function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value) || value === '') {
    return 'Rp 0';
  }

  const numericValue = parseFloat(value);

  if (isNaN(numericValue)) {
    return 'Rp 0';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function formatRupiahWithDecimals(value) {
    if (value === null || value === undefined || isNaN(value) || value === '') {
        return 'Rp 0.00';
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
        return 'Rp 0.00';
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue);
}
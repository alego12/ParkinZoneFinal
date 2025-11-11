/**
 * Utilidades para traducción de textos y valores
 */

/**
 * Traduce el tipo de vehículo al español
 */
export const translateVehicleType = (vehicleType: 'car' | 'motorcycle' | 'both' | string): string => {
  const typeMap: { [key: string]: string } = {
    'car': 'Auto',
    'motorcycle': 'Motocicleta',
    'both': 'Ambos (Auto y Motocicleta)',
  };
  return typeMap[vehicleType] || vehicleType;
};

/**
 * Traduce el estado del espacio al español
 */
export const translateSpaceStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'available': 'Disponible',
    'occupied': 'Ocupado',
    'maintenance': 'Mantenimiento',
    'reserved': 'Reservado',
  };
  return statusMap[status] || status;
};

/**
 * Traduce el tipo de vehículo de forma corta (para uso en etiquetas)
 */
export const translateVehicleTypeShort = (vehicleType: 'car' | 'motorcycle' | 'both' | string): string => {
  const typeMap: { [key: string]: string } = {
    'car': 'Auto',
    'motorcycle': 'Moto',
    'both': 'Mixto',
  };
  return typeMap[vehicleType] || vehicleType;
};


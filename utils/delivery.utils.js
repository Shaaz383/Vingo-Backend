import User from '../models/user.model.js';

export const getAllAvailableDeliveryBoys = async () => {
  const deliveryBoys = await User.find({ role: 'deliveryBoy' }).select('_id fullName mobile'); // Select relevant fields

  if (deliveryBoys.length === 0) {
    return [];
  }

  return deliveryBoys;
};
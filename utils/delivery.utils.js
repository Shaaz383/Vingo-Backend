import User from '../models/user.model.js';

let lastAssignedIndex = 0;

export const getNextDeliveryBoy = async () => {
  const deliveryBoys = await User.find({ role: 'delivery' });

  if (deliveryBoys.length === 0) {
    return null;
  }

  const deliveryBoy = deliveryBoys[lastAssignedIndex];
  lastAssignedIndex = (lastAssignedIndex + 1) % deliveryBoys.length;

  return deliveryBoy._id;
};
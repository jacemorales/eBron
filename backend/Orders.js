export const ORDER_STATUS = {
  AWAITING_PAYMENT: 'awaiting_payment',
  PAYMENT_SUCCESSFUL: 'payment_successful',
  AWAITING_SELLER_CONFIRMATION: 'awaiting_seller_confirmation',
  AWAITING_BUYER_CONFIRMATION: 'awaiting_buyer_confirmation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
};

export function validateOrderCreation(buyer, product, deliveryInfo, buyerWallet = null) {
  const errors = [];
  if (!buyer) errors.push('Buyer must be logged in.');
  if (!product) errors.push('Product does not exist.');
  if (product && product.status === 'deleted') errors.push('This product is no longer listed.');
  if (product && product.availability !== 'available') errors.push('This product has already been sold or reserved.');
  if (product && product.sellerId === buyer?.userId) errors.push('You cannot purchase your own product.');
  if (!deliveryInfo || !deliveryInfo.fullName || !deliveryInfo.gender || !deliveryInfo.hallOfResidence || !deliveryInfo.roomNumber) {
    errors.push('Complete delivery information is required.');
  }
  if (buyerWallet && Number(buyerWallet.availableBalance || 0) < Number(product?.price || 0)) {
    const deficit = Number((Number(product?.price || 0) - Number(buyerWallet.availableBalance || 0)).toFixed(2));
    errors.push(`Insufficient wallet balance. You need ₦${deficit.toLocaleString()} more. Please top up your wallet.`);
  }
  return { valid: errors.length === 0, errors };
}

export function createOrderRecord({ buyer, product, deliveryInfo, paymentMode = 'TEST_MODE' }) {
  const now = new Date().toISOString();
  return {
    orderId: 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    orderReference: 'EBR-' + Math.floor(100000 + Math.random() * 900000),
    productId: product.productId,
    buyerId: buyer.userId,
    sellerId: product.sellerId,
    amount: Number(product.price),
    status: ORDER_STATUS.PAYMENT_SUCCESSFUL,
    paymentMode,
    paymentRef: 'SIM_PAY_' + Date.now(),
    deliveryFullName: deliveryInfo.fullName,
    deliveryGender: deliveryInfo.gender,
    deliveryHall: deliveryInfo.hallOfResidence,
    deliveryRoom: deliveryInfo.roomNumber,
    sellerConfirmedAt: null,
    buyerConfirmedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

export function processOrderConfirmation(order, role, userId) {
  if (!order) throw new Error('Order not found.');
  if (order.status === ORDER_STATUS.COMPLETED) {
    return { order, statusChanged: false, fundsReleased: false, message: 'Order is already completed.' };
  }
  const updatedOrder = { ...order };
  const now = new Date().toISOString();
  let fundsReleased = false;

  if (role === 'seller') {
    if (order.sellerId !== userId) throw new Error('Unauthorized');
    if (updatedOrder.sellerConfirmedAt) return { order: updatedOrder, statusChanged: false, fundsReleased: false };
    updatedOrder.sellerConfirmedAt = now;
  } else if (role === 'buyer') {
    if (order.buyerId !== userId) throw new Error('Unauthorized');
    if (updatedOrder.buyerConfirmedAt) return { order: updatedOrder, statusChanged: false, fundsReleased: false };
    updatedOrder.buyerConfirmedAt = now;
  }

  if (updatedOrder.sellerConfirmedAt && updatedOrder.buyerConfirmedAt) {
    updatedOrder.status = ORDER_STATUS.COMPLETED;
    updatedOrder.completedAt = now;
    fundsReleased = true;
  } else if (updatedOrder.sellerConfirmedAt) {
    updatedOrder.status = ORDER_STATUS.AWAITING_BUYER_CONFIRMATION;
  } else if (updatedOrder.buyerConfirmedAt) {
    updatedOrder.status = ORDER_STATUS.AWAITING_SELLER_CONFIRMATION;
  }
  updatedOrder.updatedAt = now;

  return {
    order: updatedOrder,
    statusChanged: true,
    fundsReleased,
    message: fundsReleased ? 'Transaction completed! Funds released.' : 'Confirmation recorded.'
  };
}

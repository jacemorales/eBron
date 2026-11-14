export const ORDER_STATUS = {
  PENDING: 'payment_successful',
  PROCESSING: 'payment_successful',
  AWAITING_PAYMENT: 'awaiting_payment',
  PAYMENT_SUCCESSFUL: 'payment_successful',
  AWAITING_SELLER_CONFIRMATION: 'awaiting_seller_confirmation',
  AWAITING_BUYER_CONFIRMATION: 'awaiting_buyer_confirmation',
  REFUND_PENDING_APPROVAL: 'refund_pending_approval',
  REFUNDED: 'refunded',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
};

export const CANCELLATION_REASONS = {
  BUYER: [
    'Changed my mind',
    'Ordered by mistake',
    'Found alternative / No longer needed',
    'Seller is unresponsive',
    'Delivery delay',
    'Other'
  ],
  SELLER: [
    'Item out of stock or damaged',
    'Cannot fulfill delivery to buyer\'s hall',
    'Pricing error',
    'Buyer requested cancellation',
    'Other'
  ]
};

export function validateOrderCreation(buyer, product, deliveryInfo, buyerWallet = null, quantity = 1) {
  const errors = [];
  const qty = Number(quantity) || 1;
  if (qty <= 0) errors.push('Quantity must be at least 1.');
  if (!buyer) errors.push('Buyer must be logged in.');
  if (!product) errors.push('Product does not exist.');
  if (product && product.status === 'deleted') errors.push('This product is no longer listed.');
  if (product && (product.availability === 'sold' || product.stockStatus === 'sold_out')) {
    errors.push('This product has already been sold out.');
  }
  if (product && product.availableStock !== undefined && Number(product.availableStock) < qty) {
    errors.push(`Insufficient stock. Only ${product.availableStock} unit(s) available.`);
  }
  if (product && product.sellerId === buyer?.userId) errors.push('You cannot purchase your own product.');
  if (!deliveryInfo || !deliveryInfo.fullName || !deliveryInfo.gender || !deliveryInfo.hallOfResidence || !deliveryInfo.roomNumber) {
    errors.push('Complete delivery information is required.');
  }

  const totalAmount = Number((Number(product?.price || 0) * qty).toFixed(2));
  if (buyerWallet && Number(buyerWallet.availableBalance || 0) < totalAmount) {
    const deficit = Number((totalAmount - Number(buyerWallet.availableBalance || 0)).toFixed(2));
    errors.push(`Insufficient wallet balance. You need ₦${deficit.toLocaleString()} more. Please top up your wallet.`);
  }
  return { valid: errors.length === 0, errors, totalAmount, quantity: qty };
}

export function createOrderRecord(buyerOrData, product, deliveryInfo, quantity = 1, paymentMode = 'WALLET_ESCROW') {
  let buyer, prod, delivery, qty, mode;
  if (buyerOrData && buyerOrData.buyer) {
    buyer = buyerOrData.buyer;
    prod = buyerOrData.product;
    delivery = buyerOrData.deliveryInfo;
    qty = buyerOrData.quantity || 1;
    mode = buyerOrData.paymentMode || 'WALLET_ESCROW';
  } else {
    buyer = buyerOrData;
    prod = product;
    delivery = deliveryInfo;
    qty = quantity;
    mode = paymentMode;
  }
  const now = new Date().toISOString();
  const validQty = Math.max(1, Number(qty) || 1);
  const totalAmount = Number((Number(prod.price) * validQty).toFixed(2));

  return {
    orderId: 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    orderReference: 'EBR-' + Math.floor(100000 + Math.random() * 900000),
    productId: prod.productId,
    productName: prod.name,
    productImage: prod.primaryImageUrl || (Array.isArray(prod.images) ? prod.images[0] : ''),
    buyerId: buyer.userId,
    buyerName: buyer.fullName,
    sellerId: prod.sellerId,
    sellerName: prod.sellerName || '',
    amount: totalAmount,
    quantity: validQty,
    status: ORDER_STATUS.PAYMENT_SUCCESSFUL,
    paymentMode: mode,
    paymentRef: 'WAL_PAY_' + Date.now(),
    deliveryFullName: delivery.fullName,
    deliveryGender: delivery.gender,
    deliveryHall: delivery.hallOfResidence,
    deliveryRoom: delivery.roomNumber,
    sellerConfirmedAt: null,
    buyerConfirmedAt: null,
    completedAt: null,
    cancellationRequested: false,
    cancellationRequestedBy: null,
    cancellationReason: null,
    cancellationExplanation: null,
    cancellationRequestedAt: null,
    refundStatus: 'none',
    refundAdminNotes: null,
    refundProcessedAt: null,
    disputeReason: '',
    createdAt: now,
    updatedAt: now
  };
}

export function processOrderConfirmation(order, role, userId) {
  if (!order) throw new Error('Order not found.');
  if (order.status === ORDER_STATUS.COMPLETED) {
    return { order, statusChanged: false, fundsReleased: false, message: 'Order is already completed.' };
  }
  if (order.status === ORDER_STATUS.REFUND_PENDING_APPROVAL) {
    throw new Error('Cannot confirm order while refund request is pending administrative review.');
  }
  if (order.status === ORDER_STATUS.REFUNDED || order.status === ORDER_STATUS.CANCELLED) {
    throw new Error('Order has been cancelled or refunded.');
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

export function requestOrderCancellation(order, requestedBy, reason, explanation = '') {
  if (!order) throw new Error('Order not found.');
  if (requestedBy !== 'buyer' && requestedBy !== 'seller') {
    throw new Error('Invalid requester role for order cancellation.');
  }
  if (order.status === ORDER_STATUS.COMPLETED) {
    throw new Error('Completed orders cannot be cancelled.');
  }
  if (order.status === ORDER_STATUS.REFUNDED || order.status === ORDER_STATUS.CANCELLED) {
    throw new Error('Order has already been cancelled or refunded.');
  }
  if (order.status === ORDER_STATUS.REFUND_PENDING_APPROVAL) {
    throw new Error('Cancellation request is already pending administrator approval for this order.');
  }

  const allowedReasons = requestedBy === 'buyer' ? CANCELLATION_REASONS.BUYER : CANCELLATION_REASONS.SELLER;
  if (!reason || !allowedReasons.includes(reason)) {
    throw new Error(`Please select a valid cancellation reason.`);
  }

  const now = new Date().toISOString();
  return {
    ...order,
    status: ORDER_STATUS.REFUND_PENDING_APPROVAL,
    cancellationRequested: true,
    cancellationRequestedBy: requestedBy,
    cancellationReason: reason,
    cancellationExplanation: explanation ? String(explanation).trim() : '',
    cancellationRequestedAt: now,
    refundStatus: 'pending_approval',
    updatedAt: now
  };
}

export function processRefundApproval(order, decision, adminNotes = '', buyerWallet = null, sellerBalance = null) {
  if (!order) throw new Error('Order not found.');
  if (order.status === ORDER_STATUS.REFUNDED || order.refundStatus === 'approved' || order.refundStatus === 'rejected') {
    throw new Error('This refund request has already been processed.');
  }
  if (order.status !== ORDER_STATUS.REFUND_PENDING_APPROVAL) {
    throw new Error('Order does not have a pending refund request.');
  }

  const now = new Date().toISOString();
  const amt = Number(order.amount);

  if (decision === 'approved') {
    let updatedBuyerWallet = null;
    let walletTx = null;
    if (buyerWallet) {
      updatedBuyerWallet = {
        ...buyerWallet,
        availableBalance: Number((Number(buyerWallet.availableBalance || 0) + amt).toFixed(2)),
        updatedAt: now
      };
      walletTx = {
        transactionId: 'wtx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: order.buyerId,
        type: 'refund',
        amount: amt,
        reference: order.orderReference || 'REFUND_' + Date.now(),
        status: 'successful',
        description: `Refund for order ${order.orderReference || ''} (${order.cancellationReason || 'Admin approved'})`,
        createdAt: now
      };
    }

    let updatedSellerBalance = null;
    let salesTx = null;
    if (sellerBalance) {
      const curPending = Number(sellerBalance.pendingBalance || 0);
      const newPending = Math.max(0, Number((curPending - amt).toFixed(2)));
      updatedSellerBalance = {
        ...sellerBalance,
        pendingBalance: newPending,
        updatedAt: now
      };
      salesTx = {
        transactionId: 'stx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sellerId: order.sellerId,
        orderId: order.orderId,
        orderReference: order.orderReference,
        amount: amt,
        type: 'cancelled_sale',
        status: 'refunded',
        createdAt: now
      };
    }

    const updatedOrder = {
      ...order,
      status: ORDER_STATUS.REFUNDED,
      refundStatus: 'approved',
      refundAdminNotes: adminNotes ? String(adminNotes).trim() : 'Approved by administrator',
      refundProcessedAt: now,
      updatedAt: now
    };

    return {
      order: updatedOrder,
      buyerWallet: updatedBuyerWallet,
      walletTx,
      sellerBalance: updatedSellerBalance,
      salesTx,
      decision: 'approved'
    };
  }

  if (decision === 'rejected') {
    // Revert to active pending state
    let revertedStatus = ORDER_STATUS.PAYMENT_SUCCESSFUL;
    if (order.sellerConfirmedAt && order.buyerConfirmedAt) {
      revertedStatus = ORDER_STATUS.COMPLETED;
    } else if (order.sellerConfirmedAt) {
      revertedStatus = ORDER_STATUS.AWAITING_BUYER_CONFIRMATION;
    } else if (order.buyerConfirmedAt) {
      revertedStatus = ORDER_STATUS.AWAITING_SELLER_CONFIRMATION;
    }

    const updatedOrder = {
      ...order,
      status: revertedStatus,
      cancellationRequested: false,
      refundStatus: 'rejected',
      refundDecision: 'rejected',
      refundAdminNotes: adminNotes ? String(adminNotes).trim() : 'Rejected by administrator',
      refundProcessedAt: now,
      updatedAt: now
    };

    return {
      order: updatedOrder,
      decision: 'rejected'
    };
  }

  throw new Error(`Invalid refund decision: ${decision}`);
}

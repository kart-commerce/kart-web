export type NotificationKind = 'order-update' | 'price-drop' | 'promotion';

/**
 * A persisted, list/mark-read notification-center entry — distinct from `Toast`
 * (data/notification.service.ts), which is a fire-and-forget, auto-dismissing
 * confirmation for the browser's own actions (add-to-cart, coupon applied).
 * This is the customer-visible surface for events the *backend* raised
 * (order status changes, `WishlistPriceAlertTriggered`, promotions) —
 * api-integration-map.md's "In-app notification center" row.
 */
export interface AppNotification {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly message: string;
  readonly createdAt: string;
  readonly read: boolean;
  readonly link?: string;
}

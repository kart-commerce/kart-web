import { placeholderImage } from '../../../shared/util/placeholder-image';
import { Product, ProductRating, Review } from './models';

function usd(amount: number) {
  return { amount, currency: 'USD' };
}

/**
 * Stand-in catalog until kart-product-service/kart-search-service contracts land in this repo
 * (see architecture.md's frontend-module table). Shaped exactly like `Product` so swapping
 * `ProductService`'s implementation for a generated OpenAPI client is a drop-in change — same
 * pattern CategoryNavService already follows for kart-category-service.
 */
export const MOCK_PRODUCTS: readonly Product[] = [
  {
    sku: 'PHN-AURA-256-BLK',
    groupId: 'PHN-AURA',
    name: 'Aura Phone 15 Pro',
    brand: 'Nova',
    categoryId: 'electronics',
    thumbnailUrl: placeholderImage('PHN-AURA-256-BLK', 'Aura Phone'),
    price: usd(999),
    listPrice: usd(1099),
    ratingAverage: 4.6,
    ratingCount: 2140,
    inStock: true,
    description:
      'The Aura Phone 15 Pro pairs a titanium frame with a 48MP camera system and all-day battery life.',
    images: [
      placeholderImage('PHN-AURA-256-BLK-1', 'Aura Phone'),
      placeholderImage('PHN-AURA-256-BLK-2', 'Aura Phone'),
      placeholderImage('PHN-AURA-256-BLK-3', 'Aura Phone'),
    ],
    attributes: { Color: 'Black', Storage: '256GB' },
    variants: [
      { sku: 'PHN-AURA-256-BLK', attributes: { Color: 'Black', Storage: '256GB' }, price: usd(999), inStock: true },
      { sku: 'PHN-AURA-512-BLK', attributes: { Color: 'Black', Storage: '512GB' }, price: usd(1199), inStock: true },
      { sku: 'PHN-AURA-256-SLV', attributes: { Color: 'Silver', Storage: '256GB' }, price: usd(999), inStock: true },
      { sku: 'PHN-AURA-512-SLV', attributes: { Color: 'Silver', Storage: '512GB' }, price: usd(1199), inStock: false },
    ],
  },
  {
    sku: 'LAP-ZEN-14-GRY',
    groupId: 'LAP-ZEN',
    name: 'ZenBook Air 14',
    brand: 'Nova',
    categoryId: 'electronics',
    thumbnailUrl: placeholderImage('LAP-ZEN-14-GRY', 'ZenBook Air'),
    price: usd(1249),
    ratingAverage: 4.4,
    ratingCount: 860,
    inStock: true,
    description: 'A 2.6lb ultraportable with a 14" 2.8K OLED display and 20-hour battery life.',
    images: [placeholderImage('LAP-ZEN-14-GRY-1', 'ZenBook Air'), placeholderImage('LAP-ZEN-14-GRY-2', 'ZenBook Air')],
    attributes: { Color: 'Graphite', RAM: '16GB' },
    variants: [
      { sku: 'LAP-ZEN-14-GRY', attributes: { Color: 'Graphite', RAM: '16GB' }, price: usd(1249), inStock: true },
      { sku: 'LAP-ZEN-14-GRY-32', attributes: { Color: 'Graphite', RAM: '32GB' }, price: usd(1549), inStock: true },
    ],
  },
  {
    sku: 'AUD-PULSE-BUD-WHT',
    groupId: 'AUD-PULSE',
    name: 'Pulse Buds Pro',
    brand: 'Sonique',
    categoryId: 'electronics',
    thumbnailUrl: placeholderImage('AUD-PULSE-BUD-WHT', 'Pulse Buds'),
    price: usd(179),
    listPrice: usd(219),
    ratingAverage: 4.3,
    ratingCount: 5320,
    inStock: true,
    description: 'Active noise cancelling earbuds with adaptive EQ and 30-hour case battery.',
    images: [placeholderImage('AUD-PULSE-BUD-WHT-1', 'Pulse Buds')],
    attributes: { Color: 'White' },
    variants: [
      { sku: 'AUD-PULSE-BUD-WHT', attributes: { Color: 'White' }, price: usd(179), inStock: true },
      { sku: 'AUD-PULSE-BUD-BLK', attributes: { Color: 'Black' }, price: usd(179), inStock: true },
    ],
  },
  {
    sku: 'CAM-SNAP-X100',
    groupId: 'CAM-SNAP',
    name: 'Snap X100 Mirrorless Camera',
    brand: 'Lucent',
    categoryId: 'electronics',
    thumbnailUrl: placeholderImage('CAM-SNAP-X100', 'Snap X100'),
    price: usd(1399),
    ratingAverage: 4.7,
    ratingCount: 410,
    inStock: true,
    description: '26MP APS-C sensor with in-body stabilization and 4K60 video.',
    images: [placeholderImage('CAM-SNAP-X100-1', 'Snap X100')],
    attributes: { Color: 'Black' },
    variants: [{ sku: 'CAM-SNAP-X100', attributes: { Color: 'Black' }, price: usd(1399), inStock: true }],
  },
  {
    sku: 'APL-TRK-JKT-BLU-M',
    groupId: 'APL-TRK-JKT',
    name: 'Trailhead Packable Jacket',
    brand: 'Northline',
    categoryId: 'fashion',
    thumbnailUrl: placeholderImage('APL-TRK-JKT-BLU-M', 'Trailhead Jacket'),
    price: usd(89),
    listPrice: usd(120),
    ratingAverage: 4.5,
    ratingCount: 1230,
    inStock: true,
    description: 'Windproof, water-resistant shell that packs into its own pocket.',
    images: [placeholderImage('APL-TRK-JKT-BLU-M-1', 'Trailhead Jacket')],
    attributes: { Color: 'Blue', Size: 'M' },
    variants: [
      { sku: 'APL-TRK-JKT-BLU-S', attributes: { Color: 'Blue', Size: 'S' }, price: usd(89), inStock: true },
      { sku: 'APL-TRK-JKT-BLU-M', attributes: { Color: 'Blue', Size: 'M' }, price: usd(89), inStock: true },
      { sku: 'APL-TRK-JKT-BLU-L', attributes: { Color: 'Blue', Size: 'L' }, price: usd(89), inStock: false },
      { sku: 'APL-TRK-JKT-GRN-M', attributes: { Color: 'Green', Size: 'M' }, price: usd(89), inStock: true },
    ],
  },
  {
    sku: 'FTW-STRIDE-RUN-9',
    groupId: 'FTW-STRIDE',
    name: 'Stride Runner Sneakers',
    brand: 'Northline',
    categoryId: 'fashion',
    thumbnailUrl: placeholderImage('FTW-STRIDE-RUN-9', 'Stride Runner'),
    price: usd(64),
    ratingAverage: 4.2,
    ratingCount: 3021,
    inStock: true,
    description: 'Breathable knit upper with responsive foam midsole for daily miles.',
    images: [placeholderImage('FTW-STRIDE-RUN-9-1', 'Stride Runner')],
    attributes: { Size: '9' },
    variants: [
      { sku: 'FTW-STRIDE-RUN-8', attributes: { Size: '8' }, price: usd(64), inStock: true },
      { sku: 'FTW-STRIDE-RUN-9', attributes: { Size: '9' }, price: usd(64), inStock: true },
      { sku: 'FTW-STRIDE-RUN-10', attributes: { Size: '10' }, price: usd(64), inStock: true },
    ],
  },
  {
    sku: 'BAG-COMMUTE-BLK',
    groupId: 'BAG-COMMUTE',
    name: 'Commute Laptop Backpack',
    brand: 'Northline',
    categoryId: 'fashion',
    thumbnailUrl: placeholderImage('BAG-COMMUTE-BLK', 'Commute Backpack'),
    price: usd(58),
    ratingAverage: 4.6,
    ratingCount: 970,
    inStock: true,
    description: 'Water-resistant 22L backpack with a padded 16" laptop sleeve.',
    images: [placeholderImage('BAG-COMMUTE-BLK-1', 'Commute Backpack')],
    attributes: { Color: 'Black' },
    variants: [{ sku: 'BAG-COMMUTE-BLK', attributes: { Color: 'Black' }, price: usd(58), inStock: true }],
  },
  {
    sku: 'KIT-BREW-POUR-STL',
    groupId: 'KIT-BREW-POUR',
    name: 'Pour-Over Coffee Set',
    brand: 'Hearthstead',
    categoryId: 'home-kitchen',
    thumbnailUrl: placeholderImage('KIT-BREW-POUR-STL', 'Pour-Over Set'),
    price: usd(42),
    ratingAverage: 4.8,
    ratingCount: 640,
    inStock: true,
    description: 'Borosilicate glass carafe with reusable stainless steel filter.',
    images: [placeholderImage('KIT-BREW-POUR-STL-1', 'Pour-Over Set')],
    attributes: { Material: 'Stainless steel' },
    variants: [{ sku: 'KIT-BREW-POUR-STL', attributes: { Material: 'Stainless steel' }, price: usd(42), inStock: true }],
  },
  {
    sku: 'KIT-KNIFE-CHEF-8',
    groupId: 'KIT-KNIFE-CHEF',
    name: "8\" Forged Chef's Knife",
    brand: 'Hearthstead',
    categoryId: 'home-kitchen',
    thumbnailUrl: placeholderImage('KIT-KNIFE-CHEF-8', "Chef's Knife"),
    price: usd(75),
    listPrice: usd(95),
    ratingAverage: 4.9,
    ratingCount: 1840,
    inStock: true,
    description: 'High-carbon stainless steel blade, full tang, walnut handle.',
    images: [placeholderImage('KIT-KNIFE-CHEF-8-1', "Chef's Knife")],
    attributes: { Size: '8 inch' },
    variants: [{ sku: 'KIT-KNIFE-CHEF-8', attributes: { Size: '8 inch' }, price: usd(75), inStock: true }],
  },
  {
    sku: 'HOM-LAMP-ARC-BRS',
    groupId: 'HOM-LAMP-ARC',
    name: 'Arc Floor Lamp',
    brand: 'Hearthstead',
    categoryId: 'home-kitchen',
    thumbnailUrl: placeholderImage('HOM-LAMP-ARC-BRS', 'Arc Floor Lamp'),
    price: usd(149),
    ratingAverage: 4.1,
    ratingCount: 205,
    inStock: false,
    description: 'Adjustable arc lamp with a brushed-brass finish and dimmable LED bulb included.',
    images: [placeholderImage('HOM-LAMP-ARC-BRS-1', 'Arc Floor Lamp')],
    attributes: { Finish: 'Brass' },
    variants: [{ sku: 'HOM-LAMP-ARC-BRS', attributes: { Finish: 'Brass' }, price: usd(149), inStock: false }],
  },
  {
    sku: 'SPT-YOGA-MAT-TEAL',
    groupId: 'SPT-YOGA-MAT',
    name: 'Grip Pro Yoga Mat',
    brand: 'Summit',
    categoryId: 'sports-outdoors',
    thumbnailUrl: placeholderImage('SPT-YOGA-MAT-TEAL', 'Yoga Mat'),
    price: usd(38),
    ratingAverage: 4.5,
    ratingCount: 2210,
    inStock: true,
    description: '6mm non-slip mat with alignment lines, includes carry strap.',
    images: [placeholderImage('SPT-YOGA-MAT-TEAL-1', 'Yoga Mat')],
    attributes: { Color: 'Teal' },
    variants: [
      { sku: 'SPT-YOGA-MAT-TEAL', attributes: { Color: 'Teal' }, price: usd(38), inStock: true },
      { sku: 'SPT-YOGA-MAT-CHR', attributes: { Color: 'Charcoal' }, price: usd(38), inStock: true },
    ],
  },
  {
    sku: 'SPT-TENT-DOME2-GRN',
    groupId: 'SPT-TENT-DOME2',
    name: '2-Person Dome Tent',
    brand: 'Summit',
    categoryId: 'sports-outdoors',
    thumbnailUrl: placeholderImage('SPT-TENT-DOME2-GRN', 'Dome Tent'),
    price: usd(129),
    listPrice: usd(159),
    ratingAverage: 4.3,
    ratingCount: 512,
    inStock: true,
    description: 'Freestanding 3-season tent, sets up in under 5 minutes, packs to 18in.',
    images: [placeholderImage('SPT-TENT-DOME2-GRN-1', 'Dome Tent')],
    attributes: { Color: 'Green' },
    variants: [{ sku: 'SPT-TENT-DOME2-GRN', attributes: { Color: 'Green' }, price: usd(129), inStock: true }],
  },
];

export const MOCK_RATINGS: Readonly<Record<string, ProductRating>> = Object.fromEntries(
  MOCK_PRODUCTS.map((product) => {
    const count = product.ratingCount;
    const distribution = {
      5: Math.round(count * 0.62),
      4: Math.round(count * 0.22),
      3: Math.round(count * 0.09),
      2: Math.round(count * 0.04),
      1: Math.round(count * 0.03),
    } as const;
    return [product.sku, { sku: product.sku, average: product.ratingAverage, count, distribution }];
  }),
);

const REVIEW_AUTHORS = ['Jordan M.', 'Priya S.', 'Alex T.', 'Sam R.', 'Morgan L.'];

export const MOCK_REVIEWS: readonly Review[] = MOCK_PRODUCTS.flatMap((product, productIndex) =>
  Array.from({ length: 3 }, (_, index) => {
    const rating = Math.max(3, Math.round(product.ratingAverage) - (index === 2 ? 1 : 0));
    return {
      reviewId: `${product.sku}-r${index + 1}`,
      sku: product.sku,
      author: REVIEW_AUTHORS[(productIndex + index) % REVIEW_AUTHORS.length],
      rating,
      title: rating >= 4 ? 'Exactly what I needed' : 'Good, with a few caveats',
      body:
        rating >= 4
          ? `The ${product.name} has been solid for daily use — build quality feels a step above the price point.`
          : `The ${product.name} works well overall, though it took a bit of adjusting to get used to.`,
      createdAt: new Date(2026, (productIndex + index) % 12, ((productIndex * 3 + index) % 27) + 1).toISOString(),
      verifiedPurchase: index !== 1,
      status: 'published' as const,
    };
  }),
);

const QA_PATTERN =
  /\b(qa|quality assurance|sdet|test engineer|test analyst|test automation|automation qa|automation engineer|manual tester|software tester|test lead)\b/i;

const PRODUCT_PATTERN =
  /\b(product manager|product owner|product lead|head of product|product analyst|product management|business analyst|product marketing manager)\b/i;

export function categorize(title) {
  if (!title) return 'other';
  if (PRODUCT_PATTERN.test(title)) return 'product';
  if (QA_PATTERN.test(title)) return 'qa';
  return 'other';
}

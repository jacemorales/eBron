/**
 * Masks an institutional email for public listings.
 * e.g. david.oyedepo33@stu.cu.edu.ng -> d*************33@stu.cu.edu.ng
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return local[0] + '*@' + domain;
  }
  const first = local[0];
  const last = local.slice(-2);
  const stars = '*'.repeat(Math.max(3, local.length - 3));
  return `${first}${stars}${last}@${domain}`;
}

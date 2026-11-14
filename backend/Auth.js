import crypto from 'node:crypto';

export const VALID_HALLS = {
  Male: ['Peter', 'John', 'Paul', 'Daniel', 'Joseph', 'Joshua'],
  Female: ['Mary', 'Lydia', 'Deborah', 'Dorcas']
};

export const SCHOOL_EMAIL_SUFFIX = '@stu.cu.edu.ng';

export function validateRegistrationData(data) {
  const errors = [];
  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }
  if (!data.regNumber || typeof data.regNumber !== 'string' || data.regNumber.trim().length < 3) {
    errors.push('Registration number is required.');
  }
  if (!data.matricNumber || typeof data.matricNumber !== 'string' || data.matricNumber.trim().length < 3) {
    errors.push('Matriculation number is required.');
  }
  if (!data.schoolEmail || typeof data.schoolEmail !== 'string') {
    errors.push('School email is required.');
  } else {
    const email = data.schoolEmail.trim().toLowerCase();
    if (!email.endsWith(SCHOOL_EMAIL_SUFFIX) || email.length <= SCHOOL_EMAIL_SUFFIX.length) {
      errors.push(`Email must be a valid Covenant University student email ending with ${SCHOOL_EMAIL_SUFFIX}`);
    }
  }
  if (!data.gender || !['Male', 'Female'].includes(data.gender)) {
    errors.push('Gender must be either "Male" or "Female".');
  }
  if (data.gender && VALID_HALLS[data.gender]) {
    if (!data.hallOfResidence || !VALID_HALLS[data.gender].includes(data.hallOfResidence)) {
      errors.push(`Selected hall must be one of: ${VALID_HALLS[data.gender].join(', ')} for gender ${data.gender}.`);
    }
  }
  if (!data.roomNumber || typeof data.roomNumber !== 'string' || data.roomNumber.trim().length === 0) {
    errors.push('Room number is required.');
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }
  return { valid: errors.length === 0, errors };
}

export function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(password + s).digest('hex');
  return { hash, salt: s };
}

export function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

export function validateDeliveryProfile(data) {
  const errors = [];
  if (data.fullName && (typeof data.fullName !== 'string' || data.fullName.trim().length < 2)) {
    errors.push('Full name must be at least 2 characters.');
  }
  if (data.gender && !['Male', 'Female'].includes(data.gender)) {
    errors.push('Gender must be either Male or Female.');
  }
  if (data.gender && data.hallOfResidence) {
    if (!VALID_HALLS[data.gender].includes(data.hallOfResidence)) {
      errors.push(`Hall must be valid for ${data.gender}: ${VALID_HALLS[data.gender].join(', ')}`);
    }
  }
  if (data.roomNumber && (typeof data.roomNumber !== 'string' || data.roomNumber.trim().length === 0)) {
    errors.push('Room number cannot be empty.');
  }
  return { valid: errors.length === 0, errors };
}

export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated'
};

export function checkAccountActive(user) {
  if (!user) return { active: false, allowed: false, error: 'User does not exist.' };
  if (user.status === USER_STATUS.DEACTIVATED || user.status === USER_STATUS.SUSPENDED) {
    return {
      active: false,
      allowed: false,
      status: user.status,
      error: 'Your account has been deactivated. Access to marketplace operations is restricted.'
    };
  }
  return { active: true, allowed: true };
}

export function validateAppeal(user, explanation, existingAppeals = []) {
  const errors = [];
  if (!user) errors.push('Account not found.');
  if (user && user.status !== USER_STATUS.DEACTIVATED && user.status !== USER_STATUS.SUSPENDED) {
    errors.push('Your account is currently active. Only deactivated accounts may submit an appeal.');
  }
  if (!explanation || typeof explanation !== 'string' || explanation.trim().length < 10) {
    errors.push('Please provide a detailed explanation of at least 10 characters.');
  }
  if (existingAppeals && existingAppeals.some(a => a.userId === user?.userId && a.status === 'pending')) {
    errors.push('You already have a pending appeal awaiting administrative review. Please wait for the admin decision.');
  }
  return { valid: errors.length === 0, errors };
}


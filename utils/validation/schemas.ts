import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  userType: z.enum(['customer', 'restaurant', 'delivery'], {
    required_error: 'Please select a user type',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile schemas
const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be less than 50 characters'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val), {
      message: 'Please enter a valid phone number',
    }),
});

// Address schemas
export const addressSchema = z.object({
  tag: z.enum(['home', 'work', 'other', 'custom']).optional(),
  label: z
    .string()
    .min(1, 'Address label is required')
    .max(30, 'Label must be less than 30 characters'),
  addressLine1: z
    .string()
    .min(1, 'Street address is required')
    .max(100, 'Street address must be less than 100 characters'),
  addressLine2: z
    .string()
    .max(100, 'Address line 2 must be less than 100 characters')
    .optional(),
  city: z
    .string()
    .min(1, 'City is required')
    .max(50, 'City must be less than 50 characters'),
  state: z
    .string()
    .min(1, 'State/Region is required')
    .max(50, 'State/Region must be less than 50 characters'),
  postalCode: z
    .string()
    .max(20, 'Postal code must be less than 20 characters')
    .optional(),
  country: z
    .string()
    .max(56, 'Country name too long')
    .optional(),
  deliveryInstructions: z
    .string()
    .max(200, 'Instructions must be less than 200 characters')
    .optional(),
  isDefault: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Restaurant schemas
const menuItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  price: z
    .number()
    .min(0.01, 'Price must be greater than $0')
    .max(999.99, 'Price must be less than $1000'),
  image: z
    .string()
    .min(1, 'Image URL is required')
    .url('Please enter a valid image URL'),
  category: z
    .string()
    .min(1, 'Category is required'),
  preparationTime: z
    .number()
    .min(1, 'Preparation time must be at least 1 minute')
    .max(120, 'Preparation time must be less than 120 minutes'),
  isPopular: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

// Delivery driver schemas
const driverProfileSchema = z.object({
  licenseNumber: z
    .string()
    .min(1, 'License number is required')
    .max(20, 'License number must be less than 20 characters'),
  vehicleType: z.enum(['bicycle', 'motorcycle', 'car', 'scooter'], {
    required_error: 'Please select a vehicle type',
  }),
  vehicleMake: z
    .string()
    .max(30, 'Vehicle make must be less than 30 characters')
    .optional(),
  vehicleModel: z
    .string()
    .max(30, 'Vehicle model must be less than 30 characters')
    .optional(),
  vehicleYear: z
    .number()
    .min(1990, 'Vehicle year must be 1990 or later')
    .max(new Date().getFullYear() + 1, 'Vehicle year cannot be in the future')
    .optional(),
  vehicleColor: z
    .string()
    .max(20, 'Vehicle color must be less than 20 characters')
    .optional(),
  licensePlate: z
    .string()
    .max(10, 'License plate must be less than 10 characters')
    .optional(),
});

// Order schemas
const orderSchema = z.object({
  deliveryAddress: z
    .string()
    .min(1, 'Delivery address is required'),
  deliveryInstructions: z
    .string()
    .max(200, 'Instructions must be less than 200 characters')
    .optional(),
  paymentMethod: z
    .string()
    .min(1, 'Payment method is required'),
});

// Payout & wallet schemas
export const payoutMethodSchema = z.object({
  type: z.enum(['bank_account', 'instapay', 'card']),
  bankName: z.string().min(1, 'Bank name is required'),
  last4: z.string().length(4, 'Last 4 digits required').optional(),
  isDefault: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export const payoutRequestSchema = z.object({
  walletId: z.string().uuid('Wallet ID required'),
  amount: z.number().positive('Amount must be greater than 0'),
  methodId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

// KYC schemas
export const kycSubmissionSchema = z.object({
  restaurantId: z.string().uuid('Restaurant ID is required'),
  status: z.enum(['pending', 'reviewing', 'approved', 'rejected']).default('pending'),
  notes: z.string().max(500).optional(),
});

export const kycDocumentSchema = z.object({
  submissionId: z.string().uuid('Submission ID is required'),
  docType: z.string().min(1, 'Document type is required'),
  docUrl: z.string().url('Document URL must be valid'),
});

// Order events/timeline
export const orderEventSchema = z.object({
  orderId: z.string().uuid('Order ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  eventNote: z.string().max(500).optional(),
});

// Contact/Support schemas
const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be less than 100 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message must be less than 1000 characters'),
});

// Type exports for TypeScript
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
type MenuItemFormData = z.infer<typeof menuItemSchema>;
type DriverProfileFormData = z.infer<typeof driverProfileSchema>;
type OrderFormData = z.infer<typeof orderSchema>;
type ContactFormData = z.infer<typeof contactSchema>;

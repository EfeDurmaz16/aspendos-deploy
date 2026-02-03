export default {
  // Login
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to continue to YULA',
    emailLabel: 'Email',
    emailPlaceholder: 'your.email@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign In',
    signInWithPasskey: 'Sign in with Passkey',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
  },

  // Signup
  signup: {
    title: 'Create your account',
    subtitle: 'Start your YULA journey today',
    nameLabel: 'Full name',
    namePlaceholder: 'John Doe',
    emailLabel: 'Email',
    emailPlaceholder: 'your.email@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Create a strong password',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordPlaceholder: 'Confirm your password',
    termsAgreement: 'I agree to the {terms} and {privacy}',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    createAccount: 'Create Account',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
  },

  // Password strength
  passwordStrength: {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
    requirements: {
      length: 'At least 8 characters',
      uppercase: 'One uppercase letter',
      lowercase: 'One lowercase letter',
      number: 'One number',
      special: 'One special character',
    },
  },

  // Forgot password
  forgotPassword: {
    title: 'Reset your password',
    subtitle: "Enter your email and we'll send you a reset link",
    emailLabel: 'Email',
    emailPlaceholder: 'your.email@example.com',
    sendLink: 'Send Reset Link',
    backToLogin: 'Back to login',
    emailSent: 'Check your email',
    emailSentSubtitle: "We've sent a password reset link to {email}",
  },

  // Reset password
  resetPassword: {
    title: 'Create new password',
    subtitle: 'Enter your new password below',
    newPasswordLabel: 'New password',
    newPasswordPlaceholder: 'Enter new password',
    confirmPasswordLabel: 'Confirm new password',
    confirmPasswordPlaceholder: 'Confirm new password',
    resetPassword: 'Reset Password',
    success: 'Password reset successful',
    successSubtitle: 'You can now sign in with your new password',
  },

  // Email verification
  verifyEmail: {
    title: 'Verify your email',
    subtitle: "We've sent a verification link to {email}",
    resendLink: 'Resend verification email',
    resendIn: 'Resend in {seconds}s',
    verified: 'Email verified!',
    verifiedSubtitle: 'Your email has been verified successfully',
    continue: 'Continue to YULA',
  },

  // Social auth
  social: {
    continueWith: 'Or continue with',
    google: 'Google',
    github: 'GitHub',
    apple: 'Apple',
  },

  // Errors
  errors: {
    invalidCredentials: 'Invalid email or password',
    emailInUse: 'This email is already in use',
    weakPassword: 'Password is too weak',
    passwordMismatch: 'Passwords do not match',
    invalidEmail: 'Please enter a valid email address',
    required: 'This field is required',
    networkError: 'Network error. Please try again.',
    tooManyAttempts: 'Too many attempts. Please try again later.',
  },
};

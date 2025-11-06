import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { authAPI } from '../../services/api';
import ChangePasswordModal from './components/ChangePasswordModal';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email', 'verify', 'success'
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [debugCode, setDebugCode] = useState(null);

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = (email) => {
    if (!email) {
      return 'Email address is required';
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleEmailSubmit = async (e) => {
    e?.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await authAPI.requestPasswordResetCode(email);
      setStep('verify');
      setResendCooldown(60);
      
      // Store debug code if provided (for development)
      if (response?.data?.debug_code) {
        setDebugCode(response.data.debug_code);
      }
    } catch (error) {
      console.error('Failed to request password reset code:', error);
      setErrors({
        general: error.response?.data?.detail || 'Failed to send password reset code. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setErrors({});

    try {
      const response = await authAPI.requestPasswordResetCode(email);
      setResendCooldown(60);
      setVerificationCode('');
      
      if (response?.data?.debug_code) {
        setDebugCode(response.data.debug_code);
      }
    } catch (error) {
      console.error('Failed to resend code:', error);
      setErrors({
        general: error.response?.data?.detail || 'Failed to resend code. Please try again.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode?.trim() || verificationCode.length !== 6) {
      setErrors({ general: 'Please enter a 6-digit verification code' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await authAPI.verifyPasswordResetCode(email, verificationCode);
      setShowChangePasswordModal(true);
    } catch (error) {
      console.error('Failed to verify code:', error);
      setErrors({
        general: error.response?.data?.detail || 'Invalid verification code. Please check and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSuccess = () => {
    setShowChangePasswordModal(false);
    setStep('success');
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password | Renewmart</title>
        <meta name="description" content="Reset your Renewmart password" />
      </Helmet>
      <div className="min-h-screen bg-background flex">
        {/* Hero Section - Left Panel (60% width on desktop) */}
        <div className="hidden lg:flex lg:w-3/5 relative bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="Lock" size={48} className="text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">Reset Your Password</h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Follow the steps to securely reset your password and regain access to your account.
              </p>
            </div>
          </div>
        </div>

        {/* Form Section - Right Panel */}
        <div className="w-full lg:w-2/5 flex flex-col justify-center bg-background">
          <div className="px-6 py-8 lg:px-12 lg:py-16">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <span className="text-2xl font-bold text-foreground">Renewmart</span>
              </div>
            </div>

            {/* Back to Login */}
            <button
              onClick={() => navigate('/login')}
              className="mb-6 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              Back to Login
            </button>

            <div className="w-full max-w-md mx-auto">
              {/* Step 1: Email Input */}
              {step === 'email' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon name="Mail" size={32} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Forgot Password?</h1>
                    <p className="text-muted-foreground">
                      Enter your email address and we'll send you a verification code to reset your password.
                    </p>
                  </div>

                  {errors?.general && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive flex items-center">
                        <Icon name="AlertCircle" size={16} className="mr-2" />
                        {errors.general}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors?.email) {
                          setErrors({ ...errors, email: '' });
                        }
                      }}
                      error={errors?.email}
                      required
                      disabled={loading}
                    />

                    <Button
                      type="submit"
                      variant="default"
                      size="lg"
                      fullWidth
                      loading={loading}
                      iconName={loading ? "Loader2" : "Send"}
                      iconPosition="right"
                      disabled={loading}
                    >
                      {loading ? 'Sending Code...' : 'Send Verification Code'}
                    </Button>
                  </form>
                </div>
              )}

              {/* Step 2: Verification Code */}
              {step === 'verify' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon name="Shield" size={32} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h1>
                    <p className="text-muted-foreground">
                      We've sent a verification code to <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Please check your inbox and spam folder for the 6-digit code
                    </p>
                  </div>

                  {errors?.general && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive flex items-center">
                        <Icon name="AlertCircle" size={16} className="mr-2" />
                        {errors.general}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Input
                      label="Verification Code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(value);
                        if (errors?.general) {
                          setErrors({});
                        }
                      }}
                      description="Enter the 6-digit code sent to your email"
                      maxLength={6}
                      error={errors?.general}
                    />

                    <Button
                      onClick={handleVerifyCode}
                      loading={loading}
                      disabled={!verificationCode?.trim() || verificationCode.length !== 6}
                      fullWidth
                      iconName="Shield"
                      iconPosition="left"
                    >
                      {loading ? 'Verifying...' : 'Verify Code'}
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Didn't receive the code?
                      </p>
                      <Button
                        variant="ghost"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0 || isResending}
                        loading={isResending}
                        iconName="RefreshCw"
                        iconPosition="left"
                      >
                        {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                      </Button>
                    </div>
                  </div>

                  {/* Debug Code Display (only in development) */}
                  {debugCode && (
                    <div className="bg-muted/50 p-4 rounded-lg border border-warning/20">
                      <div className="flex items-start space-x-3">
                        <Icon name="Info" size={16} className="text-warning mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">Development Mode</p>
                          <p>Your verification code is: <strong className="text-foreground font-mono">{debugCode}</strong></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Success */}
              {step === 'success' && (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="CheckCircle" size={32} className="text-success" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">Password Reset Successful!</h1>
                  <p className="text-muted-foreground mb-6">
                    Your password has been reset successfully. You can now login with your new password.
                  </p>
                  <Button
                    onClick={() => navigate('/login')}
                    variant="default"
                    size="lg"
                    fullWidth
                    iconName="LogIn"
                    iconPosition="right"
                  >
                    Go to Login
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date()?.getFullYear()} Renewmart. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        email={email}
        verificationCode={verificationCode}
        onSuccess={handlePasswordResetSuccess}
      />
    </>
  );
};

export default ForgotPasswordPage;


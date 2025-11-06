import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { authAPI } from '../../../services/api';

const VerificationStep = ({ formData, onComplete, errors, setErrors, isUserRegistered, isPreRegister = false }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSent, setVerificationSent] = useState(false);
  const [debugCode, setDebugCode] = useState(null);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);

  useEffect(() => {
    // Request verification code when component mounts
    // For pre-registration: always request when component mounts
    // For post-registration: only request if user is registered
    if (isPreRegister || isUserRegistered) {
      if (!hasRequestedCode) {
        requestVerificationCode();
        setHasRequestedCode(true);
      }
    }
  }, [isPreRegister, isUserRegistered]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const requestVerificationCode = async () => {
    try {
      setIsResending(true);
      setErrors({});
      // Use pre-registration endpoint if isPreRegister is true
      const response = await authAPI.requestVerificationCode(formData.email, isPreRegister);
      setVerificationSent(true);
      setResendCooldown(60);
      setVerificationCode('');
      
      // Store debug code if provided (for development)
      if (response?.data?.debug_code) {
        setDebugCode(response.data.debug_code);
      }
    } catch (error) {
      console.error('Failed to request verification code:', error);
      setErrors({ general: error.response?.data?.detail || 'Failed to send verification code. Please try again.' });
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode?.trim() || verificationCode.length !== 6) {
      setErrors({ general: 'Please enter a 6-digit verification code' });
      return;
    }

    setIsVerifying(true);
    setErrors({});
    
    try {
      await onComplete(verificationCode);
    } catch (error) {
      // Error is handled in parent component
      console.error('Verification error in child component:', error);
    } finally {
      // Always reset loading state, even if error occurs
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await requestVerificationCode();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Mail" size={32} className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Verify Your Email</h2>
        <p className="text-muted-foreground">
          We've sent a verification code to <strong>{formData?.email}</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Please check your inbox and spam folder for the 6-digit code
        </p>
      </div>
      
      {errors?.general && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Icon name="AlertCircle" size={20} className="text-error" />
            <p className="text-sm text-error">{errors.general}</p>
          </div>
        </div>
      )}
      
      {verificationSent && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Icon name="CheckCircle" size={20} className="text-success" />
            <div>
              <p className="text-sm font-medium text-success">Verification email sent!</p>
              <p className="text-xs text-success/80">Check your inbox and spam folder</p>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <Input
          label="Verification Code"
          type="text"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChange={(e) => {
            const value = e?.target?.value?.replace(/\D/g, '')?.slice(0, 6);
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
          loading={isVerifying}
          disabled={!verificationCode?.trim() || verificationCode.length !== 6}
          fullWidth
          iconName="Shield"
          iconPosition="left"
        >
          {isVerifying ? 'Verifying...' : 'Verify Email & Complete Registration'}
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
      {/* Account Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Account Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name:</span>
            <span className="text-foreground font-medium">{formData?.firstName} {formData?.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="text-foreground font-medium">{formData?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role:</span>
            <span className="text-foreground font-medium capitalize">{formData?.role?.replace('_', ' ')}</span>
          </div>
          {formData?.address && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span className="text-foreground font-medium">{formData?.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationStep;
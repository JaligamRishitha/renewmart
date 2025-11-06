import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { authAPI } from '../../../services/api';

const ChangePasswordModal = ({ isOpen, onClose, email, verificationCode, onSuccess }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one digit';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    const newPasswordError = validatePassword(formData.newPassword);
    const confirmPasswordError = formData.newPassword !== formData.confirmPassword
      ? 'Passwords do not match'
      : null;

    if (newPasswordError || confirmPasswordError) {
      setErrors({
        newPassword: newPasswordError || '',
        confirmPassword: confirmPasswordError || ''
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await authAPI.resetPassword(
        email,
        verificationCode,
        formData.newPassword,
        formData.confirmPassword
      );
      onSuccess();
    } catch (error) {
      console.error('Failed to reset password:', error);
      setErrors({
        general: error.response?.data?.detail || 'Failed to reset password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      size="md"
    >
      <div className="space-y-6">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="Lock" size={24} className="text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your new password below. Make sure it's strong and secure.
          </p>
        </div>

        {errors?.general && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive flex items-center">
              <Icon name="AlertCircle" size={16} className="mr-2" />
              {errors.general}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="relative">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              error={errors?.newPassword}
              required
              disabled={loading}
              description="Must be at least 8 characters with uppercase, lowercase, number, and special character"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-smooth"
              disabled={loading}
            >
              <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              error={errors?.confirmPassword}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-smooth"
              disabled={loading}
            >
              <Icon name={showConfirmPassword ? 'EyeOff' : 'Eye'} size={16} />
            </button>
          </div>

          {/* Password Requirements */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-xs font-medium text-foreground mb-2">Password Requirements:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className={`flex items-center ${formData.newPassword.length >= 8 ? 'text-success' : ''}`}>
                <Icon name={formData.newPassword.length >= 8 ? 'CheckCircle' : 'Circle'} size={12} className="mr-2" />
                At least 8 characters
              </li>
              <li className={`flex items-center ${/[A-Z]/.test(formData.newPassword) ? 'text-success' : ''}`}>
                <Icon name={/[A-Z]/.test(formData.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-2" />
                One uppercase letter
              </li>
              <li className={`flex items-center ${/[a-z]/.test(formData.newPassword) ? 'text-success' : ''}`}>
                <Icon name={/[a-z]/.test(formData.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-2" />
                One lowercase letter
              </li>
              <li className={`flex items-center ${/\d/.test(formData.newPassword) ? 'text-success' : ''}`}>
                <Icon name={/\d/.test(formData.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-2" />
                One number
              </li>
              <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'text-success' : ''}`}>
                <Icon name={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'CheckCircle' : 'Circle'} size={12} className="mr-2" />
                One special character
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={loading}
              disabled={loading}
              fullWidth
              iconName={loading ? "Loader2" : "Check"}
              iconPosition="right"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;


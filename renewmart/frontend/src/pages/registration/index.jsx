import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import RegistrationHeader from './components/RegistrationHeader';
import StepIndicator from './components/StepIndicator';
import AccountDetailsStep from './components/AccountDetailsStep';
import RoleSelectionStep from './components/RoleSelectionStep';
import VerificationStep from './components/VerificationStep';
import TrustSignals from './components/TrustSignals';
import NavigationButtons from './components/NavigationButtons';

// Toast notification styles
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg animate-slide-in-right ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
  }`}>
    <div className="flex items-center space-x-3">
      {type === 'success' && (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {type === 'info' && (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="font-medium">{message}</span>
    </div>
  </div>
);

const Registration = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showToast, setShowToast] = useState(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Account Details
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    
    // Step 2: Role Selection
    role: '',
    
    // Role-specific fields
    portfolioSize: '',
    investmentFocus: '',
    propertyType: '',
    propertySize: '',
    propertyLocation: '',
    certifications: [],
    experience: '',
    
    // Preferences
    marketingConsent: false,
    industryUpdates: true
  });
  
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const totalSteps = 3;

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData?.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData?.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData?.email?.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData?.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        if (!formData?.password) {
          newErrors.password = 'Password is required';
        } else if (formData?.password?.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData?.password !== formData?.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!formData?.phone?.trim()) newErrors.phone = 'Phone number is required';
        if (!formData?.address?.trim()) newErrors.address = 'Address is required';
        break;

      case 2:
        if (!formData?.role) newErrors.role = 'Please select your role';
        break;

      case 3:
        // Verification step - no validation needed here
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      console.log('Validation failed for step:', currentStep);
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      // Step 1 -> Step 2: Move to role selection (no action needed)
      // Step 2 -> Step 3: Move to verification (no action needed)
      // Step 3: Registration happens in handleComplete after verification

      // Advance to next step
      if (currentStep < totalSteps) {
        console.log('Moving to step:', currentStep + 1);
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Unexpected error in handleNext:', error);
      // Handle unexpected errors
      setErrors({ general: error.message || 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleComplete = async (verificationCode) => {
    setIsLoading(true);
    setErrors({});
    
    try {
      // Step 1: Verify the code using pre-registration endpoint
      await authAPI.confirmPreRegisterVerificationCode(formData.email, verificationCode);
      
      // Mark email as verified
      setIsEmailVerified(true);
      
      // Step 2: Register the user after verification
      console.log('Registering user after email verification...');
      const registrationData = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword || formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        role: formData.role
      };
      
      console.log('Registration data:', { ...registrationData, password: '***' });
      
      const userResponse = await authAPI.register(registrationData);
      console.log('User registered successfully:', userResponse);
      setIsUserRegistered(true);
      
      // Show success toast and redirect
      setShowToast({ type: 'success', message: 'Email verified! Account created successfully!' });
      setTimeout(() => {
        setShowToast({ type: 'info', message: 'Redirecting to login page...' });
        localStorage.setItem('pendingRegisteredEmail', formData.email);
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }, 1500);
      
    } catch (error) {
      console.error('Verification/Registration failed:', error);
      
      // Handle errors
      if (error.response?.data?.detail) {
        setErrors({ general: error.response.data.detail });
      } else if (error.response?.status === 400) {
        if (error.response?.data?.detail?.includes('verification')) {
          setErrors({ general: 'Invalid or expired verification code. Please try again.' });
        } else {
          setErrors({ general: 'Registration failed. Please check your information and try again.' });
        }
      } else {
        setErrors({ general: 'An error occurred. Please try again later.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData?.firstName && formData?.lastName && formData?.email && 
               formData?.password && formData?.confirmPassword && formData?.phone && formData?.address;
      case 2:
        return formData?.role;
      case 3:
        return true; // Verification step - proceed is handled by verification button
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AccountDetailsStep
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 2:
        return (
          <RoleSelectionStep
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
          />
        );
      case 3:
        return (
          <VerificationStep
            formData={formData}
            onComplete={handleComplete}
            errors={errors}
            setErrors={setErrors}
            isUserRegistered={false}
            isPreRegister={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Toast Notifications */}
      {showToast && (
        <Toast
          message={showToast.message}
          type={showToast.type}
          onClose={() => setShowToast(null)}
        />
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Registration Form */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg shadow-subtle p-8">
                <RegistrationHeader />
                
                <StepIndicator 
                  currentStep={currentStep} 
                  totalSteps={totalSteps} 
                />
                
                <div className="mb-8">
                  {renderCurrentStep()}
                </div>
                
                {currentStep < 3 && (
                  <NavigationButtons
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    onNext={handleNext}
                    onBack={handleBack}
                    isLoading={isLoading}
                    canProceed={canProceed()}
                  />
                )}
              </div>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Registration;
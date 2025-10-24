import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';

const LoginForm = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const roleOptions = [
    { value: 'landowner', label: 'Landowner', description: 'Property owner seeking renewable energy opportunities' },
    { value: 'investor', label: 'Investor', description: 'Investment professional focused on renewable energy assets' },
    { value: 're_sales_advisor', label: 'RE Sales Advisor', description: 'Sales professional managing client relationships' },
    { value: 're_analyst', label: 'RE Analyst', description: 'Technical and financial analysis specialist' },
    { value: 'project_manager', label: 'Project Manager', description: 'Operations professional overseeing project development' },
    { value: 're_governance_lead', label: 'RE Governance Lead', description: 'Compliance and regulatory specialist' },
    { value: 'administrator', label: 'Administrator', description: 'System administrator managing platform operations' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/?.test(formData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData?.password) {
      newErrors.password = 'Password is required';
    } else if (formData?.password?.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData?.role) {
      newErrors.role = 'Please select your role';
    }

    return newErrors;
  };

  // Toast notification handler
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, type === 'success' ? 2000 : 5000); // Success toasts show for 2s, error toasts for 5s
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors)?.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      console.log('Attempting login with:', { email: formData.email, role: formData.role });
      const result = await login({
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      console.log('Login result:', result);
      
      // Check if login was successful
      if (result.success && result.user) {
        // Show success toast
        showToast('Login successful! Redirecting...', 'success');
        
        const userRoles = result.user.roles || [];
        
        // Navigate to appropriate dashboard based on role (hierarchical routes)
        setTimeout(() => {
          if (userRoles.includes('administrator')) {
            navigate('/admin/dashboard');
          } else if (userRoles.includes('landowner')) {
            navigate('/landowner/dashboard');
          } else if (userRoles.includes('investor')) {
            navigate('/investor/portal');
          } else if (userRoles.includes('re_sales_advisor')) {
            navigate('/sales-advisor/dashboard');
          } else if (userRoles.includes('re_analyst')) {
            navigate('/analyst/dashboard');
          } else if (userRoles.includes('re_governance_lead')) {
            navigate('/governance/dashboard');
          } else if (userRoles.includes('project_manager')) {
            navigate('/project-manager/dashboard');
          } else if (userRoles.includes('reviewer')) {
            navigate('/reviewer/dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 1000); // Short delay to show the toast before redirecting
      } else {
        // Handle login failure - clear form and show error
        const error = result.error;
        console.log('Login error:', error); // Log the full error for debugging
        
        // Clear the form
        setFormData({
          email: '',
          password: '',
          role: '',
          rememberMe: false
        });
        
        // Show error toast
        if (error?.status === 401) {
          showToast('Incorrect email or password. Please try again.', 'error');
        } else if (error?.message?.includes('role')) {
          showToast('Selected role does not match your account.', 'error');
        } else if (error?.message?.includes('email')) {
          showToast('No account found with this email address.', 'error');
        } else {
          showToast('Login failed. Please check your credentials.', 'error');
        }
      }
    } catch (error) {
      console.log('Unexpected login error:', error); // Log unexpected errors
      
      // Clear the form on unexpected error
      setFormData({
        email: '',
        password: '',
        role: '',
        rememberMe: false
      });
      
      showToast('An unexpected error occurred. Please try again.', 'error');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border-2 transition-all duration-300 transform max-w-sm ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white border-green-600' 
            : 'bg-red-500 text-white border-red-600'
        }`} style={{ 
          animation: 'slideInRight 0.3s ease-out',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}>
          <Icon name={toast.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={24} />
          <div className="flex-1">
            <span className="font-semibold text-sm block">{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast({ ...toast, show: false })}
            className="ml-3 hover:opacity-80 transition-opacity p-1 rounded-full hover:bg-white/20"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Sign in to your RenewMart account</p>
      </div>
      
      {/* General Error Display */}
      {errors?.general && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive flex items-center">
            <Icon name="AlertCircle" size={16} className="mr-2" />
            {errors.general}
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input */}
        <Input
          label="Email Address"
          type="email"
          placeholder="Enter your email address"
          value={formData?.email}
          onChange={(e) => handleInputChange('email', e?.target?.value)}
          error={errors?.email}
          required
          disabled={loading}
        />

        {/* Password Input */}
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={formData?.password}
            onChange={(e) => handleInputChange('password', e?.target?.value)}
            error={errors?.password}
            required
            disabled={loading}
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

        {/* Role Selection */}
        <Select
          label="Select Your Role"
          placeholder="Choose your role"
          options={roleOptions}
          value={formData?.role}
          onChange={(value) => handleInputChange('role', value)}
          error={errors?.role}
          required
          disabled={loading}
          searchable
        />

        {/* Remember Me */}
        <Checkbox
          label="Remember me for 30 days"
          checked={formData?.rememberMe}
          onChange={(e) => handleInputChange('rememberMe', e?.target?.checked)}
          disabled={loading}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          size="lg"
          fullWidth
          loading={loading}
          iconName={loading ? "Loader2" : "LogIn"}
          iconPosition="right"
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>

        {/* Alternative Actions */}
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-primary hover:text-primary/80 font-medium transition-smooth"
            disabled={loading}
          >
            Forgot Password?
          </button>
          <button
            type="button"
            onClick={() => navigate('/registration')}
            className="text-primary hover:text-primary/80 font-medium transition-smooth"
            disabled={loading}
          >
            Create Account
          </button>
        </div>
      </form>
      {/* Demo Credentials Info */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center">
          <Icon name="Info" size={14} className="mr-2" />
          Demo Credentials - Click to Auto-Fill
        </h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'landowner@renewmart.com',
                password: 'Land2024!',
                role: 'landowner',
                rememberMe: false
              });
              setErrors({});
            }}
            className="w-full text-left p-2 rounded border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
            disabled={loading}
          >
            <strong className="text-green-600">Landowner:</strong> landowner@renewmart.com / Land2024!
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'investor@renewmart.com',
                password: 'Invest2024!',
                role: 'investor',
                rememberMe: false
              });
              setErrors({});
            }}
            className="w-full text-left p-2 rounded border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
            disabled={loading}
          >
            <strong className="text-blue-600">Investor:</strong> investor@renewmart.com / Invest2024!
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'admin@renewmart.com',
                password: 'Admin2024!',
                role: 'administrator',
                rememberMe: false
              });
              setErrors({});
            }}
            className="w-full text-left p-2 rounded border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
            disabled={loading}
          >
            <strong className="text-purple-600">Administrator:</strong> admin@renewmart.com / Admin2024!
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'sales@renewmart.com',
                password: 'Sales2024!',
                role: 're_sales_advisor',
                rememberMe: false
              });
              setErrors({});
            }}
            className="w-full text-left p-2 rounded border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
            disabled={loading}
          >
            <strong className="text-orange-600">RE Sales Advisor:</strong> sales@renewmart.com / Sales2024!
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'analyst@renewmart.com',
                password: 'Analyst2024!',
                role: 're_analyst',
                rememberMe: false
              });
              setErrors({});
            }}
            className="w-full text-left p-2 rounded border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
            disabled={loading}
          >
            <strong className="text-cyan-600">RE Analyst:</strong> analyst@renewmart.com / Analyst2024!
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'manager@renewmart.com',
                password: 'Manager2024!',
                role: 'project_manager',
                rememberMe: false
              });
              setErrors({});
            }}
            className="w-full text-left p-2 rounded border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
            disabled={loading}
          >
            <strong className="text-indigo-600">Project Manager:</strong> manager@renewmart.com / Manager2024!
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'governance@renewmart.com',
                password: 'Gov2024!',
                role: 're_governance_lead',
                rememberMe: false
              });
              setErrors({});
            }}
            className="w-full text-left p-2 rounded border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
            disabled={loading}
          >
            <strong className="text-red-600">RE Governance Lead:</strong> governance@renewmart.com / Gov2024!
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">
          Click any credential above to automatically fill the login form
        </p>
      </div>
    </div>
  );
};

export default LoginForm;

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, Coffee, Trash2, Save, X, LogIn, LogOut, Minus, User, Settings, BarChart3, Download, ArrowLeft, Eye, EyeOff, UserPlus, Shield } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
// Import Supabase (uncomment when ready for production)
// // Supabase Configuration (Replace with your actual Supabase URL and anon key)
const SUPABASE_URL = 'https://ajuimiedhxrmtorlflhy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqdWltaWVkaHhybXRvcmxmbGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODU0MTQsImV4cCI6MjA2ODc2MTQxNH0.6rhOdi7pvSEOBNc9ImrOs9-jNXaxYt57s3oB3VhIu1Y';

// Demo mode for testing without Supabasee
const DEMO_MODE = true; // Set to false when you have Supabase configured
// Supabase Client
const createSupabaseClient = () => {
  if (DEMO_MODE) {
    // Mock Supabase client for demo
    return {
      auth: {
        signInWithPassword: async ({ email, password }) => {
          // Demo users - replace with real authentication
          const demoUsers = {
            'admin@company.com': { password: 'admin123', role: 'admin', name: 'Admin User', employee_id: 'EMP001' },
            'john@company.com': { password: 'john123', role: 'employee', name: 'John Doe', employee_id: 'EMP002' },
            'jane@company.com': { password: 'jane123', role: 'employee', name: 'Jane Smith', employee_id: 'EMP003' }
          };
          
          const user = demoUsers[email];
          if (user && user.password === password) {
            return {
              data: {
                user: {
                  id: Math.random().toString(36).substr(2, 9),
                  email: email,
                  user_metadata: {
                    full_name: user.name,
                    role: user.role,
                    employee_id: user.employee_id
                  }
                }
              },
              error: null
            };
          }
          return { data: null, error: { message: 'Invalid email or password' } };
        },
        signUp: async ({ email, password, options }) => {
          // Mock signup - in production, this creates real users
          return {
            data: {
              user: {
                id: Math.random().toString(36).substr(2, 9),
                email: email,
                user_metadata: options.data
              }
            },
            error: null
          };
        },
        signOut: async () => ({ error: null }),
        getUser: async () => {
          const savedUser = sessionStorage.getItem('workq_current_user');
          return savedUser ? { data: { user: JSON.parse(savedUser) }, error: null } : { data: { user: null }, error: null };
        },
        onAuthStateChange: (callback) => {
          // Mock auth state change listener
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
      from: (table) => ({
        select: (columns = '*') => ({
          eq: (column, value) => ({
            single: async () => ({ 
              data: sessionStorage.getItem(`demo_${table}_${value}`) ? 
                JSON.parse(sessionStorage.getItem(`demo_${table}_${value}`)) : null, 
              error: null 
            }),
            limit: (count) => ({
              order: (column, options) => ({
                data: [],
                error: null
              })
            })
          }),
          order: (column, options) => ({
            data: [],
            error: null
          })
        }),
        insert: async (data) => {
          if (Array.isArray(data)) {
            data.forEach(item => {
              sessionStorage.setItem(`demo_${table}_${item.user_id || item.id}`, JSON.stringify(item));
            });
          } else {
            sessionStorage.setItem(`demo_${table}_${data.user_id || data.id}`, JSON.stringify(data));
          }
          return { data, error: null };
        },
        upsert: async (data) => {
          const key = `demo_${table}_${data.user_id || data.id}`;
          sessionStorage.setItem(key, JSON.stringify(data));
          return { data, error: null };
        },
        update: (updateData) => ({
          eq: async (column, value) => {
            const key = `demo_${table}_${value}`;
            const existing = sessionStorage.getItem(key);
            if (existing) {
              const updated = { ...JSON.parse(existing), ...updateData };
              sessionStorage.setItem(key, JSON.stringify(updated));
              return { data: updated, error: null };
            }
            return { data: null, error: null };
          }
        }),
        delete: () => ({
          eq: async (column, value) => {
            sessionStorage.removeItem(`demo_${table}_${value}`);
            return { data: null, error: null };
          }
        })
      })
    };
  }
  
  // Production Supabase client
  // Uncomment these lines when you have your Supabase credentials:
  
  if (SUPABASE_URL.includes('https://wzitkaoblwfyuvvbgkgh.supabase.co') || SUPABASE_ANON_KEY.includes('sb_secret_U5sXBN5bjRhtlAwd-w8fzw_J04qgwLV')) {
    throw new Error('Please configure your Supabase credentials');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

const supabase = createSupabaseClient();

const WorkTimeCalculator = () => {
  // Auth State
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(true);
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    showPassword: false,
    isLoading: false,
    error: ''
  });
  
  // Registration Form State  
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    employeeId: '',
    role: 'employee',
    showPassword: false,
    isLoading: false,
    error: ''
  });
  
  // App State
  const [currentView, setCurrentView] = useState('timetracker');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workRecords, setWorkRecords] = useState({});
  const [leaveRecords, setLeaveRecords] = useState({});
  const [salaryPerHour, setSalaryPerHour] = useState(500);
  const [showSalarySettings, setShowSalarySettings] = useState(true);
  
  // Time entry form state
  const [timeEntry, setTimeEntry] = useState({
    selectedDate: '',
    inTime: { hour: '', minute: '', period: 'AM' },
    outTime: { hour: '', minute: '', period: 'PM' },
    breakTime: 60
  });
  
  const [timeStatus, setTimeStatus] = useState({
    inTimeSet: false,
    outTimeSet: false
  });

  const [selectedDateModal, setSelectedDateModal] = useState({
    isOpen: false,
    date: '',
    dateStr: ''
  });

  // Initialize app
  useEffect(() => {
    checkUserSession();
  }, []);

  // Auto-fill current date
  useEffect(() => {
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    setTimeEntry(prev => ({ ...prev, selectedDate: currentDateStr }));
  }, []);

  // Save data when records change (only if authenticated)
  useEffect(() => {
    if (user && isAuthenticated) {
      saveUserData();
    }
  }, [workRecords, leaveRecords, salaryPerHour, user, isAuthenticated]);

  // Check for existing user session
  const checkUserSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setIsAuthenticated(true);
        setShowLogin(false);
        await loadUserData(user.id);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginForm(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });
      
      if (error) {
        setLoginForm(prev => ({ ...prev, error: error.message, isLoading: false }));
        return;
      }
      
      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setShowLogin(false);
        
        // Save session in demo mode
        if (DEMO_MODE) {
          sessionStorage.setItem('workq_current_user', JSON.stringify(data.user));
        }
        
        await loadUserData(data.user.id);
        setLoginForm({ email: '', password: '', showPassword: false, isLoading: false, error: '' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginForm(prev => ({ ...prev, error: 'Login failed. Please try again.', isLoading: false }));
    }
  };

  // Handle Registration (Admin only)
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterForm(prev => ({ ...prev, isLoading: true, error: '' }));
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterForm(prev => ({ ...prev, error: 'Passwords do not match', isLoading: false }));
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            full_name: registerForm.fullName,
            employee_id: registerForm.employeeId,
            role: registerForm.role
          }
        }
      });
      
      if (error) {
        setRegisterForm(prev => ({ ...prev, error: error.message, isLoading: false }));
        return;
      }
      
      alert('Employee registered successfully!');
      setRegisterForm({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        employeeId: '',
        role: 'employee',
        showPassword: false,
        isLoading: false,
        error: ''
      });
      setShowRegister(false);
    } catch (error) {
      console.error('Registration error:', error);
      setRegisterForm(prev => ({ ...prev, error: 'Registration failed. Please try again.', isLoading: false }));
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem('workq_current_user');
      setUser(null);
      setIsAuthenticated(false);
      setWorkRecords({});
      setLeaveRecords({});
      setSalaryPerHour(500);
      setCurrentView('timetracker');
      setShowLogin(true);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Data Management Functions
  const saveUserData = async () => {
    if (!user || !isAuthenticated) return;
    
    try {
      const userData = {
        user_id: user.id,
        work_records: workRecords,
        leave_records: leaveRecords,
        salary_per_hour: salaryPerHour,
        last_updated: new Date().toISOString()
      };
      
      if (DEMO_MODE) {
        // Save to sessionStorage in demo mode
        sessionStorage.setItem(`workq_data_${user.id}`, JSON.stringify(userData));
      } else {
        // Save to Supabase
        await supabase.from('user_data').upsert(userData);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const loadUserData = async (userId) => {
    try {
      if (DEMO_MODE) {
        // Load from sessionStorage in demo mode
        const userData = sessionStorage.getItem(`workq_data_${userId}`);
        if (userData) {
          const parsed = JSON.parse(userData);
          setWorkRecords(parsed.work_records || {});
          setLeaveRecords(parsed.leave_records || {});
          setSalaryPerHour(parsed.salary_per_hour || 500);
        }
      } else {
        // Load from Supabase
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (data) {
          setWorkRecords(data.work_records || {});
          setLeaveRecords(data.leave_records || {});
          setSalaryPerHour(data.salary_per_hour || 500);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Return to index.html function
  const returnToIndex = () => {
  window.location.href = '../index.html';
};


  // Time utility functions (same as before)
  const timeObjectTo24Hour = (timeObj) => {
    if (!timeObj.hour || !timeObj.minute) return '';
    let hour = parseInt(timeObj.hour);
    if (timeObj.period === 'PM' && hour !== 12) hour += 12;
    if (timeObj.period === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${timeObj.minute}`;
  };

  const formatTimeDisplay = (timeObj) => {
    if (!timeObj.hour || !timeObj.minute) return '';
    return `${timeObj.hour}:${timeObj.minute} ${timeObj.period}`;
  };

  const getCurrentTimeObject = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return {
      hour: hour12.toString().padStart(2, '0'),
      minute: minutes.toString().padStart(2, '0'),
      period: period
    };
  };

  const getCurrentTimeDisplay = () => {
    const timeObj = getCurrentTimeObject();
    return formatTimeDisplay(timeObj);
  };

  const handleInTimeEntry = () => {
    const currentTimeObj = getCurrentTimeObject();
    setTimeEntry(prev => ({ ...prev, inTime: currentTimeObj }));
    setTimeStatus(prev => ({ ...prev, inTimeSet: true }));
  };

  const handleOutTimeEntry = () => {
    const currentTimeObj = getCurrentTimeObject();
    setTimeEntry(prev => ({ ...prev, outTime: currentTimeObj }));
    setTimeStatus(prev => ({ ...prev, outTimeSet: true }));
  };

  const formatCurrency = (amount) => {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    if (paise === 0) {
      return `₹${rupees.toLocaleString('en-IN')}`;
    }
    return `₹${rupees.toLocaleString('en-IN')}.${paise.toString().padStart(2, '0')}`;
  };

  // Calendar functions (same as before)
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const getDaysInMonth = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const formatDate = (day) => {
    if (!day) return '';
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const calculateWorkingHours = (inTimeObj, outTimeObj, breakMinutes = 60) => {
    const inTime24 = timeObjectTo24Hour(inTimeObj);
    const outTime24 = timeObjectTo24Hour(outTimeObj);
    
    if (!inTime24 || !outTime24) return 0;
    
    const inDate = new Date(`2000-01-01T${inTime24}`);
    const outDate = new Date(`2000-01-01T${outTime24}`);
    
    if (outDate < inDate) {
      outDate.setDate(outDate.getDate() + 1);
    }
    
    const diffMs = outDate - inDate;
    const diffHours = diffMs / (1000 * 60 * 60);
    const breakHours = breakMinutes / 60;
    
    return Math.max(0, diffHours - breakHours);
  };

  const handleTimeSubmit = () => {
    if (!timeEntry.selectedDate || !timeEntry.inTime.hour || !timeEntry.outTime.hour) {
      alert('Please fill in all required fields (Date, In Time, Out Time)');
      return;
    }
    
    const workingHours = calculateWorkingHours(timeEntry.inTime, timeEntry.outTime, timeEntry.breakTime);
    
    setWorkRecords(prev => ({
      ...prev,
      [timeEntry.selectedDate]: {
        inTime: timeEntry.inTime,
        outTime: timeEntry.outTime,
        breakTime: timeEntry.breakTime,
        workingHours: workingHours
      }
    }));
    
    setTimeEntry(prev => ({
      ...prev,
      inTime: { hour: '', minute: '', period: 'AM' },
      outTime: { hour: '', minute: '', period: 'PM' },
      breakTime: 60
    }));
    
    setTimeStatus({
      inTimeSet: false,
      outTimeSet: false
    });
    
    alert('Work time added successfully!');
  };

  const handleDateClick = (day) => {
    if (!day) return;
    const dateStr = formatDate(day);
    const date = new Date(currentYear, currentMonth, day);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    setSelectedDateModal({
      isOpen: true,
      date: formattedDate,
      dateStr: dateStr
    });
  };

  const handleLeaveToggle = (dateStr) => {
    setLeaveRecords(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const deleteWorkRecord = (dateStr) => {
    setWorkRecords(prev => {
      const newRecords = { ...prev };
      delete newRecords[dateStr];
      return newRecords;
    });
  };

  const editWorkRecord = (dateStr) => {
    const record = workRecords[dateStr];
    if (record) {
      setTimeEntry({
        selectedDate: dateStr,
        inTime: record.inTime,
        outTime: record.outTime,
        breakTime: record.breakTime
      });
      setTimeStatus({
        inTimeSet: true,
        outTimeSet: true
      });
      setCurrentView('timetracker');
    }
  };

  // Statistics functions (same as before)
  const getTotalHours = () => {
    return Object.values(workRecords).reduce((total, record) => total + record.workingHours, 0);
  };

  const getTotalSalary = () => {
    return getTotalHours() * salaryPerHour;
  };

  const getWorkingDays = () => {
    return Object.keys(workRecords).length;
  };

  const getLeaveDays = () => {
    return Object.values(leaveRecords).filter(Boolean).length;
  };

  const getMonthlyStats = () => {
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthlyRecords = Object.entries(workRecords).filter(([date]) => 
      date.startsWith(currentMonthStr)
    );
    
    const monthlyHours = monthlyRecords.reduce((total, [, record]) => total + record.workingHours, 0);
    const monthlySalary = monthlyHours * salaryPerHour;
    const monthlyDays = monthlyRecords.length;
    
    return { monthlyHours, monthlySalary, monthlyDays };
  };

  const exportData = () => {
    // Export functionality (same as before)
    alert('Export functionality - would generate PDF report');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = getDaysInMonth(currentMonth, currentYear);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading WorkQ...</h2>
          <p className="text-gray-500 mt-2">Initializing Application</p>
        </div>
      </div>
    );
  }

  // Login/Register screens
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Return to Index Button */}
          <button
            onClick={returnToIndex}
            className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          >
            <ArrowLeft size={20} />
            <span>Return to Home</span>
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                WorkQ
              </h1>
              <p className="text-gray-600">Employee Time Tracking System</p>
              <p className="text-sm text-gray-500 mt-2">Secure Employee Dashboard</p>
            </div>

            {/* Login Form */}
            {showLogin && !showRegister && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Login</h2>
                
                {loginForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {loginForm.error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={loginForm.showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setLoginForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {loginForm.showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleLogin}
                  disabled={loginForm.isLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {loginForm.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn size={20} />
                      Sign In
                    </>
                  )}
                </button>
                
                {user?.user_metadata?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <UserPlus size={20} />
                    Register New Employee
                  </button>
                )}
              </div>
            )}

            {/* Registration Form (Admin Only) */}
            {showRegister && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Register Employee</h2>
                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                {registerForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {registerForm.error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={registerForm.employeeId}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="EMP001"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@company.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={registerForm.showPassword ? 'text' : 'password'}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setRegisterForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {registerForm.showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type={registerForm.showPassword ? 'text' : 'password'}
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm password"
                  />
                </div>
                
                <button
                  onClick={handleRegister}
                  disabled={registerForm.isLoading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {registerForm.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Register Employee
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Demo Credentials */}
            {DEMO_MODE && showLogin && !showRegister && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Demo Credentials</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Admin:</strong> admin@company.com / admin123</p>
                  <p><strong>Employee:</strong> john@company.com / john123</p>
                  <p><strong>Employee:</strong> jane@company.com / jane123</p>
                </div>
              </div>
            )}

            {/* System Info */}
            <div className="mt-6 text-xs text-gray-500 text-center">
              <p>🔒 {DEMO_MODE ? 'Demo Mode - Sample Data' : 'Secure Database Authentication'}</p>
              <p className="mt-1">Your data is stored safely and privately</p>
              {DEMO_MODE && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
                  <p className="font-medium">⚠️ Demo Mode Active</p>
                  <p className="text-xs">Configure Supabase for production use</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Time Input Component (same as before)
  const TimeInput = ({ label, timeObj, onChange, buttonLabel, buttonIcon, buttonColor, onButtonClick }) => (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-1">
          <select
            value={timeObj.hour}
            onChange={(e) => onChange({ ...timeObj, hour: e.target.value })}
            className="p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          >
            <option value="">--</option>
            {[...Array(12)].map((_, i) => {
              const hour = (i + 1).toString().padStart(2, '0');
              return <option key={hour} value={hour}>{hour}</option>;
            })}
          </select>
          <span className="p-2 sm:p-3 text-gray-500 font-bold text-sm sm:text-base">:</span>
          <select
            value={timeObj.minute}
            onChange={(e) => onChange({ ...timeObj, minute: e.target.value })}
            className="p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          >
            <option value="">--</option>
            {[...Array(60)].map((_, i) => {
              const minute = i.toString().padStart(2, '0');
              return <option key={minute} value={minute}>{minute}</option>;
            })}
          </select>
          <select
            value={timeObj.period}
            onChange={(e) => onChange({ ...timeObj, period: e.target.value })}
            className="p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        <button
          onClick={onButtonClick}
          className={`${buttonColor} text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base w-full sm:w-auto transition-all duration-200 transform hover:scale-105 shadow-lg`}
          title="Use current time"
        >
          {buttonIcon}
          <span className="hidden sm:inline">{buttonLabel}</span>
          <span className="sm:hidden">{buttonLabel.split(' ')[0]}</span>
        </button>
      </div>
    </div>
  );

  // Navigation Component
  const Navigation = () => (
    <div className="bg-white shadow-lg rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">
              {user?.user_metadata?.full_name || user?.email}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">
                {user?.user_metadata?.role === 'admin' ? 'Admin' : 'Employee'} 
                {user?.user_metadata?.employee_id && ` • ${user.user_metadata.employee_id}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.user_metadata?.role === 'admin' && (
           <button
  onClick={async () => {
    await handleSignOut();         // 👈 Sign out the current user
    setShowAdminPanel(true);       // 👈 Show the Admin Panel
    setShowRegister(true);         // 👈 Show the Register form
    setShowLogin(false);           // 👈 Hide the Login form
  }}
  className="text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200 flex items-center gap-2"
>
  <Shield size={18} />
  <span className="hidden sm:inline">Admin</span>
</button>

          )}
          <button
            onClick={returnToIndex}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-800 font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
      
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setCurrentView('timetracker')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            currentView === 'timetracker' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock size={18} />
          Time Tracker
        </button>
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            currentView === 'dashboard' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BarChart3 size={18} />
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('settings')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            currentView === 'settings' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Settings size={18} />
          Settings
        </button>
      </div>
    </div>
  );

  // Dashboard View (same structure as before, but with user-specific data)
  const DashboardView = () => {
    const { monthlyHours, monthlySalary, monthlyDays } = getMonthlyStats();
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Your personal work analytics</p>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <div className="text-xs sm:text-sm text-blue-600 font-semibold">Total Hours</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-800">{getTotalHours().toFixed(1)}h</div>
          </div>
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
            <div className="text-xs sm:text-sm text-green-600 font-semibold">Total Earnings</div>
            <div className="text-lg sm:text-2xl font-bold text-green-800">{formatCurrency(getTotalSalary())}</div>
          </div>
          <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
            <div className="text-xs sm:text-sm text-purple-600 font-semibold">Working Days</div>
            <div className="text-lg sm:text-2xl font-bold text-purple-800">{getWorkingDays()}</div>
          </div>
          <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
            <div className="text-xs sm:text-sm text-orange-600 font-semibold">Leave Days</div>
            <div className="text-lg sm:text-2xl font-bold text-orange-800">{getLeaveDays()}</div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {monthNames[currentMonth]} {currentYear} Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-600 font-semibold">Monthly Hours</p>
              <p className="text-2xl font-bold text-blue-800">{monthlyHours.toFixed(1)}h</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-600 font-semibold">Monthly Earnings</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(monthlySalary)}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-purple-600 font-semibold">Working Days</p>
              <p className="text-2xl font-bold text-purple-800">{monthlyDays}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Work Records</h3>
          <div className="space-y-3">
            {Object.entries(workRecords)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .slice(0, 5)
              .map(([date, record]) => (
                <div key={date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatTimeDisplay(record.inTime)} - {formatTimeDisplay(record.outTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{record.workingHours.toFixed(1)}h</p>
                    <p className="text-sm text-green-600">{formatCurrency(record.workingHours * salaryPerHour)}</p>
                  </div>
                </div>
              ))}
            {Object.keys(workRecords).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="mx-auto mb-2" size={48} />
                <p>No work records yet. Start tracking your time!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Settings View (enhanced with user info)
  const SettingsView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your preferences and data</p>
      </div>
      
      {/* Profile Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User size={24} />
          Profile Information
        </h3>
        
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">
              {user?.user_metadata?.full_name || 'User'}
            </h4>
            <p className="text-gray-600">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-green-600">
                ✓ {user?.user_metadata?.role === 'admin' ? 'Administrator' : 'Employee'} Account
              </p>
            </div>
            {user?.user_metadata?.employee_id && (
              <p className="text-xs text-gray-500 mt-1">
                Employee ID: {user.user_metadata.employee_id}
              </p>
            )}
            <p className="text-xs text-gray-500">User ID: {user?.id?.substring(0, 8)}...</p>
          </div>
        </div>
      </div>

      {/* Salary Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign size={24} />
          Salary Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Hourly Rate</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                value={salaryPerHour}
                onChange={(e) => setSalaryPerHour(parseFloat(e.target.value) || 0)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter hourly rate"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-700">
              <p>Current calculations based on ₹{salaryPerHour}/hour:</p>
              <p className="mt-1">• Daily (8h): {formatCurrency(salaryPerHour * 8)}</p>
              <p>• Monthly (160h): {formatCurrency(salaryPerHour * 160)}</p>
              <p>• Total earned: {formatCurrency(getTotalSalary())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Download size={24} />
          Data Management
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Export Report</h4>
              <p className="text-sm text-green-600 mb-3">Download a professional PDF report with all your data</p>
              <button
                onClick={exportData}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Export PDF Report
              </button>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Data Summary</h4>
              <div className="text-sm text-blue-600 space-y-1">
                <p>• {getWorkingDays()} work records</p>
                <p>• {getLeaveDays()} leave days</p>
                <p>• {getTotalHours().toFixed(1)} total hours</p>
                <p>• Data since: {Object.keys(workRecords).sort()[0] || 'No data'}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">🔒 Data Storage</h4>
            <p className="text-sm text-yellow-700">
              Your data is stored securely in {DEMO_MODE ? 'browser session storage (demo)' : 'Supabase database'} and 
              is linked to your user account. Data is automatically saved when you make changes.
            </p>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">About WorkQ</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>Version: 3.0.0 (Custom Authentication System)</p>
          <p>Authentication: {DEMO_MODE ? 'Demo Mode' : 'Supabase Database Auth'}</p>
          <p>Database: {DEMO_MODE ? 'Session Storage (Demo)' : 'Supabase PostgreSQL'}</p>
          <p>Features: Time tracking, salary calculation, secure login, data export, user management</p>
          <p className="text-green-600 font-medium">✓ Secure • ✓ Private • ✓ User-Specific Data</p>
        </div>
      </div>
    </div>
  );

  // Time Tracker View (same as before)
  const TimeTrackerView = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
      {/* Time Entry Section */}
      <div className="xl:col-span-1">
        <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Clock className="text-blue-600" size={20} />
            Time Entry
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Date</label>
              <input
                type="date"
                value={timeEntry.selectedDate}
                onChange={(e) => setTimeEntry(prev => ({ ...prev, selectedDate: e.target.value }))}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            
            <TimeInput
              label="In Time"
              timeObj={timeEntry.inTime}
              onChange={(newTime) => setTimeEntry(prev => ({ ...prev, inTime: newTime }))}
              buttonLabel={timeStatus.inTimeSet ? "Update In" : "In Now"}
              buttonIcon={<LogIn size={16} />}
              buttonColor={timeStatus.inTimeSet ? "bg-green-700 hover:bg-green-800" : "bg-green-600 hover:bg-green-700"}
              onButtonClick={handleInTimeEntry}
            />
            
            <TimeInput
              label="Out Time"
              timeObj={timeEntry.outTime}
              onChange={(newTime) => setTimeEntry(prev => ({ ...prev, outTime: newTime }))}
              buttonLabel={timeStatus.outTimeSet ? "Update Out" : "Out Now"}
              buttonIcon={<LogOut size={16} />}
              buttonColor={timeStatus.outTimeSet ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700"}
              onButtonClick={handleOutTimeEntry}
            />
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-2">
                <Minus size={16} />
                Break Time (minutes)
              </label>
              <input
                type="number"
                value={timeEntry.breakTime}
                onChange={(e) => setTimeEntry(prev => ({ ...prev, breakTime: parseInt(e.target.value) || 0 }))}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="60"
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 font-medium">Current Time:</div>
              <div className="text-base sm:text-lg font-bold text-gray-800">{getCurrentTimeDisplay()}</div>
              
              {/* Status Indicators */}
              <div className="mt-2 flex flex-col gap-1">
                {timeStatus.inTimeSet && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium">Clocked In at {formatTimeDisplay(timeEntry.inTime)}</span>
                  </div>
                )}
                {timeStatus.outTimeSet && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-medium">Clocked Out at {formatTimeDisplay(timeEntry.outTime)}</span>
                  </div>
                )}
                {!timeStatus.inTimeSet && !timeStatus.outTimeSet && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-600">Ready to clock in</span>
                  </div>
                )}
                {timeStatus.inTimeSet && !timeStatus.outTimeSet && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-blue-700 font-medium">Currently working...</span>
                  </div>
                )}
              </div>
            </div>
            
            {timeStatus.inTimeSet && timeStatus.outTimeSet && timeEntry.inTime.hour && timeEntry.outTime.hour && (
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700 font-medium mb-1">Preview:</div>
                <div className="text-xs sm:text-sm text-blue-600 mb-1">Working Hours: {calculateWorkingHours(timeEntry.inTime, timeEntry.outTime, timeEntry.breakTime).toFixed(1)}h</div>
                <div className="text-xs sm:text-sm text-blue-600">Salary: {formatCurrency(calculateWorkingHours(timeEntry.inTime, timeEntry.outTime, timeEntry.breakTime) * salaryPerHour)}</div>
              </div>
            )}
            
            <button
              onClick={handleTimeSubmit}
              className="w-full bg-blue-600 text-white py-2 sm:py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <Save size={18} />
              Save Work Time
            </button>
            
            <button
              onClick={() => {
                setTimeEntry(prev => ({ 
                  ...prev, 
                  inTime: { hour: '', minute: '', period: 'AM' },
                  outTime: { hour: '', minute: '', period: 'PM' },
                  breakTime: 60 
                }));
                setTimeStatus({
                  inTimeSet: false,
                  outTimeSet: false
                });
              }}
              className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <X size={16} />
              Clear Times
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <div className="text-xs sm:text-sm text-blue-600 font-semibold">Total Hours</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-800">{getTotalHours().toFixed(1)}h</div>
          </div>
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
            <div className="text-xs sm:text-sm text-green-600 font-semibold">Total Salary</div>
            <div className="text-lg sm:text-2xl font-bold text-green-800">{formatCurrency(getTotalSalary())}</div>
          </div>
          <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
            <div className="text-xs sm:text-sm text-purple-600 font-semibold">Working Days</div>
            <div className="text-lg sm:text-2xl font-bold text-purple-800">{getWorkingDays()}</div>
          </div>
          <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
            <div className="text-xs sm:text-sm text-orange-600 font-semibold">Leave Days</div>
            <div className="text-lg sm:text-2xl font-bold text-orange-800">{getLeaveDays()}</div>
          </div>
        </div>
      </div>

      {/* Calendar Section (same as before) */}
      <div className="xl:col-span-2">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} />
              Work Calendar
            </h1>
          </div>

          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm sm:text-base font-medium transition-all duration-200"
            >
              <span className="hidden sm:inline">← Previous</span>
              <span className="sm:hidden">← Prev</span>
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-center">
              <span className="block sm:inline">{monthNames[currentMonth]}</span>
              <span className="block sm:inline sm:ml-2">{currentYear}</span>
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm sm:text-base font-medium transition-all duration-200"
            >
              <span className="hidden sm:inline">Next →</span>
              <span className="sm:hidden">Next →</span>
            </button>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 bg-gray-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <div key={day} className="p-3 sm:p-4 text-center font-semibold text-gray-700 text-xs sm:text-sm">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dateStr = formatDate(day);
                const workRecord = workRecords[dateStr];
                const isLeave = leaveRecords[dateStr];
                const isToday = day && new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day)}
                    className={`min-h-[100px] sm:min-h-[130px] p-2 sm:p-3 border-r border-b relative transition-all duration-200 ${
                      day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                    } ${isLeave ? 'bg-red-50' : ''} ${isToday ? 'bg-yellow-50' : ''}`}
                  >
                    {day && (
                      <>
                        {/* Date Number */}
                        <div className={`font-bold mb-2 text-base sm:text-lg ${
                          isToday ? 'text-blue-600 bg-blue-100 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base' : 
                          workRecord ? 'text-green-700' : 
                          isLeave ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          {day}
                        </div>
                        
                        {/* Status Indicators */}
                        <div className="space-y-1">
                          {workRecord && (
                            <div className="text-center">
                              <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium mb-1">
                                {workRecord.workingHours.toFixed(1)}h
                              </div>
                              <div className="text-xs text-green-700 font-semibold hidden sm:block">
                                {formatCurrency(workRecord.workingHours * salaryPerHour)}
                              </div>
                            </div>
                          )}
                          
                          {isLeave && (
                            <div className="text-center">
                              <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Leave
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons - Desktop Only */}
                        {workRecord && (
                          <div className="hidden sm:flex gap-1 mt-2 justify-end absolute bottom-2 right-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                editWorkRecord(dateStr);
                              }}
                              className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Clock size={10} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteWorkRecord(dateStr);
                              }}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                        
                        {/* Leave Toggle - Desktop Only */}
                        {!workRecord && (
                          <div className="hidden sm:block absolute bottom-2 right-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLeaveToggle(dateStr);
                              }}
                              className={`p-1 rounded text-xs transition-all duration-200 ${
                                isLeave ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                              }`}
                              title={isLeave ? "Remove Leave" : "Mark Leave"}
                            >
                              <Coffee size={10} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          WorkQ
        </h1>
        <p className="text-gray-600">Employee Time Tracking System with Secure Authentication</p>
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      {currentView === 'timetracker' && <TimeTrackerView />}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'settings' && <SettingsView />}

      {/* Date Details Modal (same as before) */}
      {selectedDateModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Date Details</h3>
              <button
                onClick={() => setSelectedDateModal({ isOpen: false, date: '', dateStr: '' })}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">{selectedDateModal.date}</h4>
            </div>
            
            {(() => {
              const workRecord = workRecords[selectedDateModal.dateStr];
              const isLeave = leaveRecords[selectedDateModal.dateStr];
              
              if (workRecord) {
                return (
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-semibold text-green-700">Work Day</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Clock In:</span>
                          <span className="font-medium">{formatTimeDisplay(workRecord.inTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Clock Out:</span>
                          <span className="font-medium">{formatTimeDisplay(workRecord.outTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Break Time:</span>
                          <span className="font-medium">{workRecord.breakTime} minutes</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-gray-600">Working Hours:</span>
                          <span className="font-bold text-green-700">{workRecord.workingHours.toFixed(1)} hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Salary:</span>
                          <span className="font-bold text-green-700">{formatCurrency(workRecord.workingHours * salaryPerHour)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          editWorkRecord(selectedDateModal.dateStr);
                          setSelectedDateModal({ isOpen: false, date: '', dateStr: '' });
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Edit Record
                      </button>
                      <button
                        onClick={() => {
                          deleteWorkRecord(selectedDateModal.dateStr);
                          setSelectedDateModal({ isOpen: false, date: '', dateStr: '' });
                        }}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              } else if (isLeave) {
                return (
                  <div className="space-y-3">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-semibold text-red-700">Leave Day</span>
                      </div>
                      <p className="text-sm text-red-600">You are on leave for this day.</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        handleLeaveToggle(selectedDateModal.dateStr);
                        setSelectedDateModal({ isOpen: false, date: '', dateStr: '' });
                      }}
                      className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove Leave
                    </button>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="font-semibold text-gray-700">No Activity</span>
                      </div>
                      <p className="text-sm text-gray-600">No work record or leave marked for this day.</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTimeEntry(prev => ({ ...prev, selectedDate: selectedDateModal.dateStr }));
                          setSelectedDateModal({ isOpen: false, date: '', dateStr: '' });
                          setCurrentView('timetracker');
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Add Work Time
                      </button>
                      <button
                        onClick={() => {
                          handleLeaveToggle(selectedDateModal.dateStr);
                          setSelectedDateModal({ isOpen: false, date: '', dateStr: '' });
                        }}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Mark Leave
                      </button>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkTimeCalculator;
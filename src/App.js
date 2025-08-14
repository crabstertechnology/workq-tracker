import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, Coffee, Trash2, Save, X, LogIn, LogOut, User, Settings, BarChart3, Download, ArrowLeft, Eye, EyeOff, UserPlus, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
        
const WorkQ = () => {
  // Auth State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // UI State
  const [currentView, setCurrentView] = useState('timetracker');
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Form States
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    showPassword: false,
    isLoading: false,
    error: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    employeeId: '',
    role: 'employee',
    hourlyRate: 500,
    showPassword: false,
    isLoading: false,
    error: ''
  });
  
  // Data States
  const [timeEntries, setTimeEntries] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayEntry, setTodayEntry] = useState(null);
  
  // Time Entry Form
  const [timeForm, setTimeForm] = useState({
    clockIn: '',
    clockOut: '',
    breakDuration: 60,
    notes: ''
  });

  // Initialize app
  useEffect(() => {
    initializeApp();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleUserSignIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        handleUserSignOut();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user profile changes
  useEffect(() => {
    if (userProfile) {
      loadTimeEntries();
      loadLeaveRequests();
      loadTodayEntry();
    }
  }, [userProfile, currentDate]);

  const initializeApp = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await handleUserSignIn(user);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSignIn = async (user) => {
    setUser(user);
    const profile = await loadUserProfile(user.id);
    if (profile) {
      setUserProfile(profile);
      setIsAuthenticated(true);
      setShowLogin(false);
    }
  };

  const handleUserSignOut = () => {
    setUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setTimeEntries([]);
    setLeaveRequests([]);
    setTodayEntry(null);
    setShowLogin(true);
    setCurrentView('timetracker');
  };

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Auth Functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginForm(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });
      
      if (error) throw error;
      
      setLoginForm({ email: '', password: '', showPassword: false, isLoading: false, error: '' });
      showNotification('Successfully logged in!');
    } catch (error) {
      setLoginForm(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

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
            role: registerForm.role,
            hourly_rate: registerForm.hourlyRate
          }
        }
      });
      
      if (error) throw error;
      
      showNotification('Registration successful! Please check your email to verify your account.');
      setRegisterForm({
        email: '', password: '', confirmPassword: '', fullName: '', employeeId: '',
        role: 'employee', hourlyRate: 500, showPassword: false, isLoading: false, error: ''
      });
      setShowRegister(false);
      setShowLogin(true);
    } catch (error) {
      setRegisterForm(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      showNotification('Successfully logged out!');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Data Loading Functions
  const loadTimeEntries = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userProfile.id)
        .gte('work_date', startOfMonth.toISOString().split('T')[0])
        .lte('work_date', endOfMonth.toISOString().split('T')[0])
        .order('work_date', { ascending: false });
      
      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userProfile.id)
        .gte('leave_date', startOfMonth.toISOString().split('T')[0])
        .lte('leave_date', endOfMonth.toISOString().split('T')[0]);
      
      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
  };

  const loadTodayEntry = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('work_date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setTodayEntry(data);
      
      if (data) {
        setTimeForm({
          clockIn: data.clock_in_time || '',
          clockOut: data.clock_out_time || '',
          breakDuration: data.break_duration || 60,
          notes: data.notes || ''
        });
      }
    } catch (error) {
      console.error('Error loading today entry:', error);
    }
  };

  // Time Entry Functions
  const handleClockIn = async () => {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0].substring(0, 5);
    const today = now.toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .upsert({
          user_id: userProfile.id,
          work_date: today,
          clock_in_time: timeString,
          break_duration: 60,
          status: 'present'
        }, {
          onConflict: 'user_id,work_date'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setTodayEntry(data);
      setTimeForm(prev => ({ ...prev, clockIn: timeString }));
      showNotification('Clocked in successfully!');
      await loadTimeEntries();
    } catch (error) {
      console.error('Error clocking in:', error);
      showNotification('Error clocking in. Please try again.', 'error');
    }
  };

  const handleClockOut = async () => {
    if (!todayEntry) {
      showNotification('Please clock in first!', 'error');
      return;
    }
    
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0].substring(0, 5);
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          clock_out_time: timeString
        })
        .eq('id', todayEntry.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setTodayEntry(data);
      setTimeForm(prev => ({ ...prev, clockOut: timeString }));
      showNotification('Clocked out successfully!');
      await loadTimeEntries();
    } catch (error) {
      console.error('Error clocking out:', error);
      showNotification('Error clocking out. Please try again.', 'error');
    }
  };

  const handleManualTimeEntry = async () => {
    if (!timeForm.clockIn) {
      showNotification('Please enter clock in time!', 'error');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .upsert({
          user_id: userProfile.id,
          work_date: selectedDate,
          clock_in_time: timeForm.clockIn,
          clock_out_time: timeForm.clockOut || null,
          break_duration: timeForm.breakDuration,
          notes: timeForm.notes,
          status: 'present'
        }, {
          onConflict: 'user_id,work_date'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      showNotification('Time entry saved successfully!');
      setTimeForm({ clockIn: '', clockOut: '', breakDuration: 60, notes: '' });
      await loadTimeEntries();
      if (selectedDate === new Date().toISOString().split('T')[0]) {
        await loadTodayEntry();
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
      showNotification('Error saving time entry. Please try again.', 'error');
    }
  };

  const handleDeleteTimeEntry = async (entryId) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      
      showNotification('Time entry deleted successfully!');
      await loadTimeEntries();
      if (todayEntry && todayEntry.id === entryId) {
        setTodayEntry(null);
        setTimeForm({ clockIn: '', clockOut: '', breakDuration: 60, notes: '' });
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
      showNotification('Error deleting time entry.', 'error');
    }
  };

  const handleLeaveRequest = async (date, leaveType = 'personal', reason = '') => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .upsert({
          user_id: userProfile.id,
          leave_date: date,
          leave_type: leaveType,
          reason: reason,
          status: 'approved' // Auto-approve for now
        }, {
          onConflict: 'user_id,leave_date'
        });
      
      if (error) throw error;
      
      showNotification('Leave request submitted successfully!');
      await loadLeaveRequests();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showNotification('Error submitting leave request.', 'error');
    }
  };

  const handleUpdateProfile = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userProfile.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setUserProfile(data);
      showNotification('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Error updating profile.', 'error');
    }
  };

  // Utility Functions
  const getCurrentTime = () => {
    return new Date().toTimeString().split(' ')[0].substring(0, 5);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const calculateTotalHours = () => {
    return timeEntries.reduce((total, entry) => total + (entry.total_hours || 0), 0);
  };

  const calculateTotalEarnings = () => {
    return calculateTotalHours() * (userProfile?.hourly_rate || 0);
  };

  const getWorkingDays = () => {
    return timeEntries.filter(entry => entry.status === 'present').length;
  };

  const getLeaveDays = () => {
    return leaveRequests.filter(req => req.status === 'approved').length;
  };

  // Calendar Functions
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const getDateData = (dateStr) => {
    const timeEntry = timeEntries.find(entry => entry.work_date === dateStr);
    const leaveRequest = leaveRequests.find(req => req.leave_date === dateStr);
    return { timeEntry, leaveRequest };
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading WorkQ...</h2>
        </div>
      </div>
    );
  }

  // Auth Screens
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                WorkQ
              </h1>
              <p className="text-gray-600">Professional Employee Time Tracking</p>
            </div>

            {/* Register Form */}
            {showRegister && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Register Employee</h2>
                  <button
                    onClick={() => {
                      setShowRegister(false);
                      setShowLogin(true);
                    }}
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
                
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
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
                        required
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
                      required
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="john@company.com"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={registerForm.hourlyRate}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={registerForm.showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Enter password (min 6 characters)"
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
                      required
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm password"
                    />
                  </div>
                  
                  <button
                    type="submit"
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
                </form>
              </div>
            )}

            {/* Login Form */}
            {showLogin && !showRegister && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Login</h2>
                
                {loginForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {loginForm.error}
                  </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={loginForm.showPassword ? 'text' : 'password'}
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
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
                    type="submit"
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
                </form>
                
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setShowRegister(true);
                      setShowLogin(false);
                    }}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Shield size={20} />
                    Register New Employee
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 text-center">
              <p>🔒 Secure • Professional • Database-Powered</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          WorkQ
        </h1>
        <p className="text-gray-600">Employee Time Tracking System</p>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-lg rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {userProfile?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{userProfile?.full_name}</h2>
              <p className="text-sm text-gray-500">{userProfile?.email}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">
                  {userProfile?.role === 'admin' ? 'Administrator' : 'Employee'} 
                  {userProfile?.employee_id && ` • ${userProfile.employee_id}`}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-800 font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
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

      {/* Time Tracker View */}
      {currentView === 'timetracker' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Clock className="text-blue-600" size={20} />
                Quick Clock In/Out
              </h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Current Time</div>
                  <div className="text-xl font-bold text-gray-800">{getCurrentTime()}</div>
                  <div className="text-sm text-gray-500">{new Date().toLocaleDateString()}</div>
                </div>
                
                {todayEntry ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-sm text-green-700 font-medium">Today's Entry</div>
                      <div className="text-sm text-green-600">
                        In: {todayEntry.clock_in_time || 'Not clocked in'}<br/>
                        Out: {todayEntry.clock_out_time || 'Not clocked out'}<br/>
                        Hours: {todayEntry.total_hours?.toFixed(1) || '0'} hrs
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleClockIn}
                        className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn size={16} />
                        Update In
                      </button>
                      <button
                        onClick={handleClockOut}
                        disabled={!todayEntry.clock_in_time}
                        className="bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <LogOut size={16} />
                        Clock Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleClockIn}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-lg font-medium"
                  >
                    <LogIn size={20} />
                    Clock In Now
                  </button>
                )}
              </div>
            </div>

            {/* Manual Time Entry */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Manual Time Entry</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock In</label>
                    <input
                      type="time"
                      value={timeForm.clockIn}
                      onChange={(e) => setTimeForm(prev => ({ ...prev, clockIn: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out</label>
                    <input
                      type="time"
                      value={timeForm.clockOut}
                      onChange={(e) => setTimeForm(prev => ({ ...prev, clockOut: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Break Duration (minutes)</label>
                  <input
                    type="number"
                    value={timeForm.breakDuration}
                    onChange={(e) => setTimeForm(prev => ({ ...prev, breakDuration: parseInt(e.target.value) || 0 }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={timeForm.notes}
                    onChange={(e) => setTimeForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                    placeholder="Optional notes..."
                  />
                </div>
                
                <button
                  onClick={handleManualTimeEntry}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Time Entry
                </button>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={24} />
                  Work Calendar
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    ← Previous
                  </button>
                  <h3 className="text-lg font-semibold min-w-[200px] text-center">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 bg-gray-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-3 text-center font-semibold text-gray-700">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                  {getDaysInMonth().map((day, index) => {
                    const dateStr = formatDate(day);
                    const { timeEntry, leaveRequest } = getDateData(dateStr);
                    const isToday = day && dateStr === new Date().toISOString().split('T')[0];
                    
                    return (
                      <div
                        key={index}
                        onClick={() => day && setSelectedDate(dateStr)}
                        className={`min-h-[120px] p-2 border-r border-b relative cursor-pointer hover:bg-gray-50 transition-colors ${
                          isToday ? 'bg-blue-50' : ''
                        } ${leaveRequest ? 'bg-red-50' : ''}`}
                      >
                        {day && (
                          <>
                            <div className={`font-bold mb-2 ${
                              isToday ? 'text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center text-sm' : 
                              timeEntry ? 'text-green-700' : 
                              leaveRequest ? 'text-red-700' : 'text-gray-700'
                            }`}>
                              {day}
                            </div>
                            
                            {timeEntry && (
                              <div className="space-y-1">
                                <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                                  {timeEntry.total_hours?.toFixed(1) || '0'}h
                                </div>
                                <div className="text-xs text-green-700">
                                  {formatCurrency((timeEntry.total_hours || 0) * (userProfile?.hourly_rate || 0))}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTimeEntry(timeEntry.id);
                                  }}
                                  className="absolute bottom-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                  title="Delete entry"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                            
                            {leaveRequest && (
                              <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Leave
                              </div>
                            )}
                            
                            {!timeEntry && !leaveRequest && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLeaveRequest(dateStr);
                                }}
                                className="absolute bottom-1 right-1 p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                                title="Mark as leave"
                              >
                                <Coffee size={12} />
                              </button>
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
      )}

      {/* Dashboard View */}
      {currentView === 'dashboard' && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600">Your work analytics and statistics</p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-semibold">Total Hours</div>
              <div className="text-2xl font-bold text-blue-800">{calculateTotalHours().toFixed(1)}h</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-semibold">Total Earnings</div>
              <div className="text-2xl font-bold text-green-800">{formatCurrency(calculateTotalEarnings())}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600 font-semibold">Working Days</div>
              <div className="text-2xl font-bold text-purple-800">{getWorkingDays()}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-600 font-semibold">Leave Days</div>
              <div className="text-2xl font-bold text-orange-800">{getLeaveDays()}</div>
            </div>
          </div>

          {/* Recent Entries */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Time Entries</h3>
            <div className="space-y-3">
              {timeEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">
                      {new Date(entry.work_date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {entry.clock_in_time} - {entry.clock_out_time || 'Not clocked out'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{entry.total_hours?.toFixed(1) || '0'}h</p>
                    <p className="text-sm text-green-600">
                      {formatCurrency((entry.total_hours || 0) * (userProfile?.hourly_rate || 0))}
                    </p>
                  </div>
                </div>
              ))}
              {timeEntries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto mb-2" size={48} />
                  <p>No time entries yet. Start tracking your work!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings View */}
      {currentView === 'settings' && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your profile and preferences</p>
          </div>
          
          {/* Profile Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User size={24} />
              Profile Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userProfile?.full_name || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={userProfile?.employee_id || ''}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userProfile?.email || ''}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={userProfile?.hourly_rate || 0}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={userProfile?.role || ''}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 capitalize"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={userProfile?.department || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your department"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => handleUpdateProfile({
                  full_name: userProfile.full_name,
                  hourly_rate: userProfile.hourly_rate,
                  department: userProfile.department
                })}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                Update Profile
              </button>
            </div>
          </div>

          {/* Salary Calculator */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign size={24} />
              Salary Calculator
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-semibold">Hourly Rate</div>
                <div className="text-2xl font-bold text-blue-800">{formatCurrency(userProfile?.hourly_rate || 0)}</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-semibold">Daily (8h)</div>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency((userProfile?.hourly_rate || 0) * 8)}
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-semibold">Monthly (160h)</div>
                <div className="text-2xl font-bold text-purple-800">
                  {formatCurrency((userProfile?.hourly_rate || 0) * 160)}
                </div>
              </div>
            </div>
          </div>

          {/* Export Data */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Download size={24} />
              Data Export
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Export Time Entries</h4>
                <p className="text-sm text-green-600 mb-3">Download all your time entries as a CSV file</p>
                <button
                  onClick={() => {
                    // Create CSV export functionality
                    const csvContent = [
                      ['Date', 'Clock In', 'Clock Out', 'Break (min)', 'Total Hours', 'Earnings'],
                      ...timeEntries.map(entry => [
                        entry.work_date,
                        entry.clock_in_time || '',
                        entry.clock_out_time || '',
                        entry.break_duration,
                        entry.total_hours?.toFixed(2) || '0',
                        ((entry.total_hours || 0) * (userProfile?.hourly_rate || 0)).toFixed(2)
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `workq-time-entries-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    showNotification('Time entries exported successfully!');
                  }}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Summary Report</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <p>• Total Hours: {calculateTotalHours().toFixed(1)}</p>
                  <p>• Total Earnings: {formatCurrency(calculateTotalEarnings())}</p>
                  <p>• Working Days: {getWorkingDays()}</p>
                  <p>• Leave Days: {getLeaveDays()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkQ;
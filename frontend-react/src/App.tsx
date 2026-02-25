
import React, { useState, useEffect } from 'react';
import { CreateCourse } from './components/courses';
import Login from './components/Login';
import Register from './components/Register';
import  StudentList  from './components/TeacherDashboard';
import StudentGrades from './components/StudentDashboard';

interface User {
  id: number;
  username: string;
  role: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  teacher_name: string;  // Made this required since backend always sends it for students
  enrolled?: boolean;
}


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('login');
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(null);
  const [enrollingCourse, setEnrollingCourse] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Validate token by making a request to the server
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            // Token is valid, restore user session
            const userData = JSON.parse(atob(token.split('.')[1]));
            setUser(userData);
            setCurrentView('dashboard');
            const coursesData = await response.json();
            setCourses(Array.isArray(coursesData) ? coursesData : []);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            setCurrentView('login');
          }
        } catch (error) {
          console.error('Session initialization error:', error);
          localStorage.removeItem('token');
          setCurrentView('login');
        }
      }
      setIsLoading(false);
    };

    initializeSession();
  }, []);


  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        const userData = JSON.parse(atob(data.token.split('.')[1]));
        setUser(userData);
        setCurrentView('dashboard');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentView('login');
    setCourses([]);
    setSelectedCourse(null);
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView(user?.role === 'teacher' ? 'teacherCourse' : 'studentCourse');
  };

  const handleEnrollConfirm = async (courseId: number) => {
    try {
      setEnrollingCourse(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ course_id: courseId })
      });

      if (response.ok) {
        alert('Successfully enrolled in the course!');
        fetchCourses(); // Refresh course list
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to enroll in course');
      }
    } catch (error) {
      console.error('Failed to enroll:', error);
      alert('Failed to enroll in course');
    } finally {
      setEnrollingCourse(false);
      setShowConfirmDialog(null);
    }
  };
  const renderCourseList = () => {
    if (courses.length === 0) {
      return (
        <div className="text-center p-4 text-gray-600">
          No courses available.
        </div>
      );
    }
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <div key={course.id} className="border rounded-lg shadow p-4 flex flex-col h-full">
            {/* Course Header */}
            <h3 className="text-xl font-bold mb-2">{course.title}</h3>
            
            {/* Course Description */}
            <p className="mb-3 flex-grow">{course.description}</p>
            
            {/* Teacher Info */}
            {user?.role === 'student' && course.teacher_name && (
              <div className="flex items-center mb-4 text-gray-600">
                <svg 
                  className="w-5 h-5 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
                <span className="text-sm">Instructor: {course.teacher_name}</span>
              </div>
            )}
            
            {/* Action Buttons */}
            {user?.role === 'teacher' ? (
              <div className="mt-auto">
                <button
                  onClick={() => handleCourseSelect(course)}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Manage Course
                </button>
              </div>
            ) : (
              <div className="mt-auto space-y-2">
                <button
                  onClick={() => handleCourseSelect(course)}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  View Course
                </button>
                {!course.enrolled ? (
                  <button
                    onClick={() => setShowConfirmDialog(course.id)}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    disabled={enrollingCourse}
                  >
                    {enrollingCourse && showConfirmDialog === course.id 
                      ? 'Enrolling...' 
                      : 'Enroll'
                    }
                  </button>
                ) : (
                  <div className="w-full text-center py-2 text-green-600 font-medium flex items-center justify-center">
                    <svg 
                      className="w-5 h-5 mr-1" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                    Enrolled
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDashboardContent = () => {
    if (selectedCourse) {
      if (user?.role === 'teacher') {
        return (
          <div>
            <button 
              onClick={() => setSelectedCourse(null)}
              className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Courses
            </button>
            <h2 className="text-2xl font-bold mb-4">{selectedCourse.title}</h2>
            <StudentList courseId={selectedCourse.id} />
          </div>
        );
      } else {
        return (
          <div>
            <button 
              onClick={() => setSelectedCourse(null)}
              className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Courses
            </button>
            <h2 className="text-2xl font-bold mb-4">{selectedCourse.title}</h2>
            <StudentGrades courseId={selectedCourse.id} />
          </div>
        );
      }
    }

    return (
      <div className="container mx-auto p-4">
        {user?.role === 'teacher' && <CreateCourse onCourseCreated={fetchCourses} />}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Available Courses</h2>
          {isLoading ? (
            <div className="text-center p-4">Loading courses...</div>
          ) : error ? (
            <div className="text-center p-4 text-red-500">{error}</div>
          ) : (
            renderCourseList()
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentView('register')}
          />
        );
      case 'register':
        return (
          <Register
            onRegister={() => setCurrentView('login')}
            onSwitchToLogin={() => setCurrentView('login')}
          />
        );
      case 'dashboard':
      case 'teacherCourse':
      case 'studentCourse':
        return renderDashboardContent();
      default:
        return <div>Page not found</div>;
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100">
      {user && (
        <nav className="bg-white shadow-md p-4 mb-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Learning Platform</h1>
            <div className="flex items-center space-x-4">
              <span>{user.username} ({user.role})</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      {renderContent()}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Confirm Enrollment</h3>
            <p className="mb-4">Are you sure you want to enroll in this course?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEnrollConfirm(showConfirmDialog)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                disabled={enrollingCourse}
              >
                {enrollingCourse ? 'Enrolling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
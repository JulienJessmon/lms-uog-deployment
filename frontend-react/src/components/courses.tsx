import React, { useState } from 'react';

interface Course {
    id: number;
    title: string;
    description: string;
    teacher_id: number;
  }

  
// Registration component that handles both student and teacher signup
const Register: React.FC<{ onRegister: () => void }> = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'student' // Default role
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Vulnerability: No input validation
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Registration successful! Please login.');
        onRegister();
      } else {
        alert('Registration failed!');
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Register for Learning Platform</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              className="w-full p-2 border rounded"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 border rounded"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div>
            <select
              className="w-full p-2 border rounded"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

// Component for teachers to create new courses
const CreateCourse: React.FC<{ onCourseCreated: () => void }> = ({ onCourseCreated }) => {
  const [courseData, setCourseData] = useState({
    title: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Vulnerability: No CSRF protection
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Vulnerability: Token stored in localStorage
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(courseData)
      });

      if (response.ok) {
        alert('Course created successfully!');
        setCourseData({ title: '', description: '' });
        onCourseCreated();
      }
    } catch (error) {
      console.error('Failed to create course:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Create New Course</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Course Title"
            className="w-full p-2 border rounded"
            value={courseData.title}
            onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
          />
        </div>
        <div>
          <textarea
            placeholder="Course Description"
            className="w-full p-2 border rounded"
            value={courseData.description}
            onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
          />
        </div>
        <button 
          type="submit"
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Create Course
        </button>
      </form>
    </div>
  );
};

// Enhanced course listing with enrollment functionality
const CourseList: React.FC<{ courses: Course[], onEnroll: (courseId: number) => void }> = 
  ({ courses, onEnroll }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {courses.map(course => (
        <div key={course.id} className="border rounded-lg shadow p-4">
          <h3 className="text-xl font-bold mb-2">{course.title}</h3>
          {/* Vulnerability: XSS through description */}
          <div dangerouslySetInnerHTML={{ __html: course.description }} className="mb-4" />
          <button
            onClick={() => onEnroll(course.id)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Enroll in Course
          </button>
        </div>
      ))}
    </div>
  );
};

export { Register, CreateCourse, CourseList };
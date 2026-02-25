import React, { useState, useEffect } from 'react';

  interface Grade {
    id: number;
    value: number;
    feedback: string;
    graded_at: string;
  }
  
  const StudentGrades: React.FC<{ courseId: number }> = ({ courseId }) => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      const fetchGrades = async () => {
        try {
          setIsLoading(true);
          const token = localStorage.getItem('token');
          const payload = JSON.parse(atob(token!.split('.')[1]));
          const studentId = payload.user_id;
  
          const response = await fetch(
            `${process.env.REACT_APP_API_URL}/api/courses/${courseId}/student-grades/${studentId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            setGrades(data);
          } else {
            throw new Error('Failed to fetch grades');
          }
        } catch (error) {
          console.error('Failed to fetch grades:', error);
          setError('Failed to load grades');
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchGrades();
    }, [courseId]);
  
    if (isLoading) {
      return <div className="text-center p-4">Loading grades...</div>;
    }
  
    if (error) {
      return <div className="text-center text-red-500 p-4">{error}</div>;
    }
  
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Your Grades</h2>
        {grades.length === 0 ? (
          <p className="text-gray-600">No grades available for this course yet.</p>
        ) : (
          <div className="space-y-4">
            {grades.map((grade) => (
              <div key={grade.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-lg">Grade: {grade.value}/100</span>
                  <span className="text-sm text-gray-500">
                    {new Date(grade.graded_at).toLocaleDateString()}
                  </span>
                </div>
                {grade.feedback && (
                  <p className="text-gray-700">
                    <span className="font-medium">Feedback:</span> {grade.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  export default StudentGrades;

import React, { useState, useEffect ,useCallback} from 'react';
// interface Student {
//     id: number;
//     username: string;
//     grades: {
//       value: number;
//       feedback: string;
//       graded_at: string;
//     }[];
//   }
  
  interface GradeFormData {
    student_id: number;
    course_id: number;
    grade: number;
    feedback: string;
  }
  
  interface Grade {
    value: number;
    feedback: string;
    graded_at: string;
  }
  
  interface Student {
    id: number;
    username: string;
    grades: Grade[];
  }
  const StudentList: React.FC<{ courseId: number }> = ({ courseId }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gradeData, setGradeData] = useState<GradeFormData>({
        student_id: 0,
        course_id: courseId,
        grade: 0,
        feedback: ''
      });
      const fetchStudents = useCallback(async () => {
        try {
          setIsLoading(true);
          setError(null);
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses/${courseId}/students`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch students');
          }
    
          const data = await response.json();
          setStudents(data);
        } catch (error) {
          console.error('Failed to fetch students:', error);
          setError('Failed to load students');
        } finally {
          setIsLoading(false);
        }
      }, [courseId]);
    
      useEffect(() => {
        fetchStudents();
      }, [fetchStudents]);
    
      const handleGradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/grade/student`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              student_id: selectedStudent?.id,
              course_id: courseId,
              grade: gradeData.grade,
              feedback: gradeData.feedback
            })
          });
    
          if (response.ok) {
            alert('Grade submitted successfully!');
            await fetchStudents(); // Refresh the list
            setSelectedStudent(null);
            setGradeData({
              student_id: 0,
              course_id: courseId,
              grade: 0,
              feedback: ''
            });
          } else {
            const data = await response.json();
            alert(data.message || 'Failed to submit grade');
          }
        } catch (error) {
          console.error('Failed to submit grade:', error);
          alert('Failed to submit grade');
        }
      };
  
    if (isLoading) {
      return <div className="text-center p-4">Loading students...</div>;
    }
  
    if (error) {
      return <div className="text-center text-red-500 p-4">{error}</div>;
    }
  
   
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Enrolled Students</h2>
      {isLoading ? (
        <div className="text-center p-4">Loading students...</div>
      ) : error ? (
        <div className="text-center text-red-500 p-4">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {students.map(student => (
            <div key={student.id} className="border rounded-lg p-4 shadow">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{student.username}</h3>
                <button
                  onClick={() => setSelectedStudent(student)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add Grade
                </button>
              </div>
              {student.grades.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium">Grades for this course:</h4>
                  <div className="mt-2 space-y-2">
                    {student.grades.map((grade, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Grade: {grade.value}/100</span>
                          <span className="text-sm text-gray-500">
                            {new Date(grade.graded_at).toLocaleDateString()}
                          </span>
                        </div>
                        {grade.feedback && (
                          <p className="text-gray-600 mt-1">{grade.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grade Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Add Grade for {selectedStudent.username}</h3>
            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Grade (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  className="w-full p-2 border rounded"
                  value={gradeData.grade}
                  onChange={(e) => setGradeData({
                    ...gradeData,
                    grade: parseInt(e.target.value)
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Feedback</label>
                <textarea
                  className="w-full p-2 border rounded"
                  required
                  value={gradeData.feedback}
                  onChange={(e) => setGradeData({
                    ...gradeData,
                    feedback: e.target.value
                  })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Submit Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

  
  export default StudentList;


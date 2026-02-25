# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import sqlite3
import os
import jwt
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///learning.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'very-secret-key'  # Vulnerability: Hardcoded secret
app.config['UPLOAD_FOLDER'] = 'uploads'

db = SQLAlchemy(app)


class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey(
        'course.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)


class Grade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey(
        'submission.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey(
        'course.id'), nullable=False)  # Add this
    value = db.Column(db.Integer, nullable=False)
    feedback = db.Column(db.Text)
    graded_at = db.Column(db.DateTime, default=datetime.utcnow)

# Update submission model to ensure course relationship


class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey(
        'course.id'), nullable=False)
    grade = db.Column(db.Integer)
    feedback = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    grades = db.relationship('Grade', backref='submission', lazy=True)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    # Vulnerability: Passwords stored in plaintext
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'student' or 'teacher'


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)  # Vulnerability: Stored XSS
    teacher_id = db.Column(
        db.Integer, db.ForeignKey('user.id'), nullable=False)


class Assignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    course_id = db.Column(db.Integer, db.ForeignKey(
        'course.id'), nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)


def is_course_teacher(course_id: int, teacher_id: int) -> bool:
    """
    Check if the given teacher is the owner of the course.

    Args:
        course_id (int): The ID of the course to check
        teacher_id (int): The ID of the teacher

    Returns:
        bool: True if the teacher owns the course, False otherwise
    """
    course = Course.query.filter_by(
        id=course_id, teacher_id=teacher_id).first()
    return course is not None

# New routes for enhanced functionality


@app.route('/', methods=['GET'])
def first():

    return jsonify({'message': 'Backend flask app running'}), 200


@app.route('/api', methods=['GET'])
def api_route():

    return jsonify({'message': '/API endpoint called !'}), 200


@app.route('/api/grade-submission', methods=['POST'])
def grade_submission():
    data = request.get_json()

    # Vulnerability: No authentication or authorization check
    submission = Submission.query.get(data['submissionId'])

    if submission:
        grade = Grade(
            submission_id=submission.id,
            value=data['grade'],
            feedback=data['feedback']
        )
        db.session.add(grade)
        db.session.commit()

        return jsonify({'message': 'Grade submitted successfully'})

    return jsonify({'message': 'Submission not found'}), 404


@app.route('/api/student-submissions/<int:student_id>', methods=['GET'])
def get_student_submissions(student_id):
    # Vulnerability: IDOR possible - no authentication check
    submissions = Submission.query.filter_by(student_id=student_id).all()

    return jsonify([{
        'id': sub.id,
        'file_path': sub.file_path,
        'submitted_at': sub.submitted_at.isoformat() if hasattr(sub, 'submitted_at') else None,
        'grade': {
            'value': sub.grade.value,
            'feedback': sub.grade.feedback
        } if sub.grade else None
    } for sub in submissions])


@app.route('/api/courses/<int:course_id>/assignments', methods=['GET'])
def get_course_assignments(course_id):
    # Vulnerability: No authentication check
    assignments = Assignment.query.filter_by(course_id=course_id).all()

    return jsonify([{
        'id': a.id,
        'title': a.title,
        'description': a.description,
        'due_date': a.due_date.isoformat()
    } for a in assignments])

# Vulnerability: No input validation or sanitization
# Modified registration endpoint with role-based signup


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    # Vulnerability: No input validation
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    # Vulnerability: Password stored in plaintext
    new_user = User(
        username=data['username'],
        password=data['password'],
        role=data['role']  # Vulnerability: Role can be manipulated
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'Registration successful'})

# New endpoint for course creation (teachers only)


@app.route('/api/courses', methods=['POST'])
def create_course():
    token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    data = request.get_json()

    try:
        payload = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.filter_by(id=payload['user_id']).first()

        if not user or user.role != 'teacher':
            return jsonify({'message': 'Unauthorized'}), 403

        new_course = Course(
            title=data['title'],
            description=data['description'],
            teacher_id=user.id  # Explicitly set the teacher_id
        )

        db.session.add(new_course)
        db.session.commit()

        return jsonify({
            'message': 'Course created successfully',
            'course': {
                'id': new_course.id,
                'title': new_course.title,
                'description': new_course.description,
                'teacher_id': new_course.teacher_id
            }
        })

    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401


@app.route('/api/enroll', methods=['POST'])
def enroll_in_course():
    data = request.get_json()
    token = request.headers.get('Authorization', '').split('Bearer ')[-1]

    try:
        # Vulnerability: No token expiration check
        payload = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload['user_id'])

        if not user or user.role != 'student':
            return jsonify({'message': 'Unauthorized'}), 403

        # Vulnerability: No duplicate enrollment check
        enrollment = Enrollment(
            student_id=user.id,
            course_id=data['course_id']
        )

        db.session.add(enrollment)
        db.session.commit()

        return jsonify({'message': 'Enrolled successfully'})

    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401

# Modified get_courses endpoint to include enrollment status for students


@app.route('/api/courses', methods=['GET'])
def get_courses():
    token = request.headers.get('Authorization', '').split('Bearer ')[-1]

    try:
        payload = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.filter_by(id=payload['user_id']).first()

        if not user:
            return jsonify({'message': 'User not found'}), 404

        if user.role == 'teacher':
            # Teachers only see their own courses
            courses = Course.query.filter_by(teacher_id=user.id).all()
            return jsonify([{
                'id': c.id,
                'title': c.title,
                'description': c.description,
                'teacher_id': c.teacher_id,
                'teacher_name': user.username  # Include teacher's own name
            } for c in courses])
        else:
            # Students see all courses
            courses = Course.query.all()
            enrollments = Enrollment.query.filter_by(student_id=user.id).all()
            enrolled_course_ids = [e.course_id for e in enrollments]

            # Get all teachers at once to avoid N+1 query problem
            teachers = {u.id: u.username for u in User.query.filter_by(
                role='teacher').all()}

            return jsonify([{
                'id': c.id,
                'title': c.title,
                'description': c.description,
                'teacher_id': c.teacher_id,
                'teacher_name': teachers.get(c.teacher_id, 'Unknown Teacher'),
                'enrolled': c.id in enrolled_course_ids
            } for c in courses])

    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    # Vulnerability: Direct string concatenation in SQL query
    query = f"SELECT * FROM user WHERE username='{data['username']}' AND password='{data['password']}'"

    # Using SQLAlchemy instead of direct SQLite
    user = User.query.filter_by(
        username=data['username'],
        # Vulnerability: plain text password comparison
        password=data['password']
    ).first()

    if user:
        token = jwt.encode({
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        return jsonify({'token': token})

    return jsonify({'message': 'Invalid credentials'}), 401
# Vulnerability: No proper authentication check


@app.route('/api/submissions/<int:submission_id>', methods=['GET'])
def get_submission(submission_id):
    # Vulnerability: No authorization check
    submission = Submission.query.get(submission_id)
    if not submission:
        return jsonify({'message': 'Submission not found'}), 404

    return jsonify({
        'id': submission.id,
        'student_id': submission.student_id,
        'grade': submission.grade,
        'feedback': submission.feedback
    })

# Vulnerability: Insecure file handling


@app.route('/api/submit-assignment', methods=['POST'])
def submit_assignment():
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400

    file = request.files['file']
    assignment_id = request.form.get('assignment_id')
    student_id = request.form.get('student_id')

    # Vulnerability: No file type validation
    filename = secure_filename(file.filename)
    # Vulnerability: Path traversal possible
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    submission = Submission(
        student_id=student_id,
        assignment_id=assignment_id,
        file_path=filename
    )
    db.session.add(submission)
    db.session.commit()

    return jsonify({'message': 'Assignment submitted successfully'})

# Vulnerability: Directory traversal possible


@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file(filename):
    # Vulnerability: No authorization check
    # Vulnerability: No path validation
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))


# Vulnerability: Command injection possible
with app.app_context():
    db.create_all()


@app.route('/api/export-grades', methods=['POST'])
def export_grades():
    course_id = request.json.get('course_id')
    format_type = request.json.get('format', 'csv')

    # Vulnerability: Command injection through format parameter
    os.system(f'generate_report {course_id} --format {format_type}')

    return jsonify({'message': 'Export completed'})


@app.route('/api/courses/<int:course_id>/students', methods=['GET'])
def get_course_students(course_id):
    token = request.headers.get('Authorization', '').split('Bearer ')[-1]

    try:
        payload = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.filter_by(id=payload['user_id']).first()

        if not user or user.role != 'teacher':
            return jsonify({'message': 'Unauthorized'}), 403

        # Check if teacher owns this course
        if not is_course_teacher(course_id, user.id):
            return jsonify({'message': 'You are not authorized to view students in this course'}), 403

        # Get enrollments for this course
        enrollments = Enrollment.query.filter_by(course_id=course_id).all()
        student_ids = [e.student_id for e in enrollments]

        # Get students and their grades for this specific course
        students_data = []
        for student_id in student_ids:
            student = User.query.get(student_id)
            # Only get grades for this specific course
            grades = Grade.query.join(Submission).filter(
                Submission.student_id == student_id,
                Submission.course_id == course_id
            ).all()

            grades_data = [{
                'value': grade.value,
                'feedback': grade.feedback,
                'graded_at': grade.graded_at.isoformat()
            } for grade in grades]

            students_data.append({
                'id': student.id,
                'username': student.username,
                'grades': grades_data
            })

        return jsonify(students_data)

    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401


@app.route('/api/courses/<int:course_id>/student-grades/<int:student_id>', methods=['GET'])
def get_student_course_grades(course_id, student_id):
    token = request.headers.get('Authorization', '').split('Bearer ')[-1]

    try:
        payload = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.filter_by(id=payload['user_id']).first()

        # Check authorization
        if user.role == 'teacher' and not is_course_teacher(course_id, user.id):
            return jsonify({'message': 'Unauthorized'}), 403
        elif user.role == 'student' and user.id != student_id:
            return jsonify({'message': 'Unauthorized'}), 403

        # Get grades for the specific course and student
        grades = Grade.query.join(Submission).filter(
            Submission.student_id == student_id,
            Grade.course_id == course_id
        ).order_by(Grade.graded_at.desc()).all()

        return jsonify([{
            'id': grade.id,
            'value': grade.value,
            'feedback': grade.feedback,
            'graded_at': grade.graded_at.isoformat()
        } for grade in grades])

    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401

# Update the grade submission endpoint


@app.route('/api/grade/student', methods=['POST'])
def grade_student():
    token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    data = request.get_json()

    try:
        payload = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.filter_by(id=payload['user_id']).first()

        if not user or user.role != 'teacher':
            return jsonify({'message': 'Unauthorized'}), 403

        # Check if teacher owns this course
        if not is_course_teacher(data['course_id'], user.id):
            return jsonify({'message': 'Unauthorized to grade in this course'}), 403

        # First check if student is enrolled in this course
        enrollment = Enrollment.query.filter_by(
            student_id=data['student_id'],
            course_id=data['course_id']
        ).first()

        if not enrollment:
            return jsonify({'message': 'Student is not enrolled in this course'}), 400

        # Create submission for this specific course
        submission = Submission(
            student_id=data['student_id'],
            course_id=data['course_id'],
            grade=data['grade']
        )
        db.session.add(submission)
        db.session.flush()  # Get submission ID

        # Create grade record
        grade = Grade(
            submission_id=submission.id,
            course_id=data['course_id'],
            value=data['grade'],
            feedback=data['feedback']
        )
        db.session.add(grade)
        db.session.commit()

        return jsonify({'message': 'Grade submitted successfully'})

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting grade: {str(e)}")
        return jsonify({'message': 'Error submitting grade'}), 500


if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    with app.app_context():
        db.create_all()

        # Create default teacher only if they don't exist
        default_teacher = User.query.filter_by(username='john.smith').first()
        if not default_teacher:
            default_teacher = User(
                username='john.smith',
                password='teacher123',  # In production, this should be hashed
                role='teacher'
            )
            db.session.add(default_teacher)
            db.session.commit()
            print("Default teacher created - username: john.smith, password: teacher123")

            # Only create sample courses if the teacher was just created
            sample_courses = [
                Course(
                    title='Web Security Basics',
                    description='Learn about XSS, CSRF, and SQL Injection',
                    teacher_id=default_teacher.id
                ),
                Course(
                    title='Network Security',
                    description='Understanding network protocols and security measures',
                    teacher_id=default_teacher.id
                ),
                Course(
                    title='Machine Learning & AI',
                    description='Understanding Supervised and unsupervised learning. ',
                    teacher_id=default_teacher.id
                )
            ]
            for course in sample_courses:
                db.session.add(course)

            db.session.commit()
            print("Sample courses created and assigned to John Smith")

    app.run(debug=True, host='0.0.0.0', port=4000)

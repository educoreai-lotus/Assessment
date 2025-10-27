import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/WelcomeExam.css'

export default function WelcomePostCourse() {
  const navigate = useNavigate();
  const userName =
    localStorage.getItem('username') ||
    localStorage.getItem('userName') ||
    localStorage.getItem('user_id') ||
    localStorage.getItem('userId') ||
    'Learner';

  return (
    <div className="welcome-screen fade-in">
      <h1>👋 Hello, {userName || 'Learner'}</h1>
      <h2>Are you ready for your exam?</h2>
      <p>
        This exam will assess your post-course understanding and provide AI-driven feedback on your skills.
      </p>
      <button
        className="start-exam-button"
        onClick={() => navigate('/postcourse')}
      >
        Start Exam
      </button>
    </div>
  )
}



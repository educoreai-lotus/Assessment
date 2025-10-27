import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/WelcomeExam.css'

export default function WelcomeBaseline() {
  const navigate = useNavigate();
  const userName =
    localStorage.getItem('username') ||
    localStorage.getItem('userName') ||
    localStorage.getItem('user_id') ||
    localStorage.getItem('userId') ||
    'Learner';

  return (
    <div className="welcome-screen fade-in">
      <h1>👋 Welcome aboard, {userName || 'Learner'}!</h1>
      <p className="intro-caption">
        This Baseline Exam will help us evaluate your current skills and identify learning gaps.
        You will see questions covering each skill — answer as best you can, or skip if unsure.
        Once you finish, click “Finish Exam” to view your results and personalized feedback.
      </p>
      <button
        className="start-exam-button"
        onClick={() => {
          sessionStorage.setItem('cameFromWelcome', 'true');
          navigate('/baseline');
        }}
      >
        Start Baseline Exam
      </button>
    </div>
  )
}



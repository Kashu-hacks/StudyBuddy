// Quiz page – dynamically fetches questions from the backend using AI data
import { useState, useRef } from "react";
import "./Quiz.css";

// Backend URL (adjust if needed)
const BACKEND_URL = "http://127.0.0.1:8000";

function Quiz({ onNavigate }) {
  // ----- Upload handling (mirrors VisualLearning) -----
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle | uploading | success | error
  const [uploadError, setUploadError] = useState(null);

  const uploadFile = async (file) => {
    setUploadStatus("uploading");
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${BACKEND_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Upload failed ${response.status}`);
      }
      // Persist AI data for Quiz and other pages
      localStorage.setItem("aiData", JSON.stringify(data));
      setUploadStatus("success");
    } catch (error) {
      console.error("[Quiz] Upload error:", error);
      setUploadStatus("error");
      setUploadError(error.message);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // ----- Dynamic quiz state -----
  const [questions, setQuestions] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState(null);

  // ----- UI flow state -----
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // ----- Start the quiz – fetch questions from backend -----
  const handleStartQuiz = async () => {
    const stored = localStorage.getItem("aiData");
    if (!stored) {
      setQuizError("No AI data found. Please upload your notes image first.");
      return;
    }
    const aiData = JSON.parse(stored);
    setLoadingQuiz(true);
    setQuizError(null);
    try {
      const payload = {
        notes: aiData.notes,
        visuals: aiData.visuals,
        question_count: 5,
        difficulty: "mixed",
        chat_history: [],
      };
      const resp = await fetch(`${BACKEND_URL}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Quiz generation failed");

      let quizData = data.quiz;
      // If backend returns a JSON string, parse it
      if (typeof quizData === "string") {
        try {
          quizData = JSON.parse(quizData);
        } catch (parseErr) {
          console.error("Failed to parse quiz JSON:", parseErr);
          throw new Error("Invalid quiz format received from server.");
        }
      }
      if (!Array.isArray(quizData)) {
        console.error("Unexpected quiz format:", quizData);
        throw new Error("Quiz data is not an array. Check backend response.");
      }
      setQuestions(quizData);
      setQuizStarted(true);
    } catch (e) {
      console.error("Quiz fetch error:", e);
      setQuizError(e.message);
    } finally {
      setLoadingQuiz(false);
    }
  };

  // ----- Answer handlers -----
  const handleSelectAnswer = (answer) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    setShowFeedback(true);
    if (selectedAnswer === question?.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setQuizCompleted(false);
    setQuizError(null);
  };

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question?.correctAnswer;

  return (
    <div className="quiz-app">
      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <div className="brand-name">StudyAI</div>
            <div className="brand-tagline">Learn · Practice · Grow</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => onNavigate?.("home")}>⌂ Home</button>
          <button className="nav-item" onClick={() => onNavigate?.("visual-learning")}>🎴 Visual Learning</button>
          <button className="nav-item active">▣ Quiz</button>
          <button className="nav-item">◔ My Progress</button>
          <button className="nav-item">↶ Past Attempts</button>
          <button className="nav-item">▤ Notes</button>
          <button className="nav-item">⚙ Settings</button>
        </nav>
        <div className="sidebar-tip">
          <div><strong>Small steps</strong><br />build big results.</div>
          <span>⌁</span>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="quiz-main">
        {/* TOP BAR */}
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-icon">✦</div><span>StudyAI</span></div>
          <div className="student-profile"><div className="avatar">S</div><div className="student-name">Student</div><span className="profile-arrow">⌄</span></div>
        </header>

        {/* ================= START SCREEN ================= */}
        {!quizStarted && !quizCompleted && (
          <section className="start-screen">
            <div className="hero-glow" />
            <div className="start-content">
              <div className="ai-badge"><span>✦</span> AI POWERED QUIZ</div>
              <h1>Ready to test your <span>knowledge?</span></h1>
              <p className="start-description">
                Your questions are generated from your own study notes and adapt as you learn.
              </p>

              <div className="feature-row">
                <div className="feature-card">
                  <div className="feature-icon purple">✦</div>
                  <div><strong>Adaptive</strong><span>Questions</span></div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon blue">◉</div>
                  <div><strong>Personalized</strong><span>for You</span></div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon yellow">↯</div>
                  <div><strong>Instant</strong><span>Feedback</span></div>
                </div>
              </div>

              {/* Upload Section */}
              <div className="upload-section" style={{ marginBottom: "1rem" }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                />
                <button
                  className="upload-button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={uploadStatus === "uploading"}
                >
                  {uploadStatus === "idle" && "Upload Notes Image"}
                  {uploadStatus === "uploading" && "Uploading..."}
                  {uploadStatus === "success" && "Upload Successful ✓"}
                  {uploadStatus === "error" && ("Upload Failed: " + uploadError)}
                </button>
              </div>

              {/* Start / Loading button */}
              {loadingQuiz ? (
                <button className="start-quiz-button" disabled>
                  Generating Quiz…
                </button>
              ) : (
                <button
                  className="start-quiz-button"
                  onClick={handleStartQuiz}
                  disabled={uploadStatus !== "success"}
                >
                  Start Quiz <span>→</span>
                </button>
              )}

              {/* Loading message */}
              {loadingQuiz && (
                <div className="loading-status" style={{ marginTop: "1rem" }}>
                  Analyzing notes… Generating visuals… Almost done…
                </div>
              )}

              {/* Error message */}
              {quizError && (
                <div className="error-message" style={{ color: "red", marginTop: "1rem" }}>
                  {quizError}
                </div>
              )}

              <div className="quiz-meta">
                <span>◫  {questions.length} Questions</span>
                <span>✦  Adaptive</span>
                <span>◈  AI Generated</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="floating-orb" />
              <div className="book-stack">
                <div className="book book-one">TCP</div>
                <div className="book book-two">NETWORK</div>
                <div className="book book-three">LEARN</div>
                <div className="ai-brain">✦</div>
              </div>
            </div>
          </section>
        )}

        {/* ================= QUIZ SCREEN ================= */}
        {quizStarted && !quizCompleted && (
          <section className="question-screen">
            <div className="quiz-top">
              <div className="topic-info">
                <div className="topic-icon">◈</div>
                <div><span>Current Topic</span> <strong>{question?.topic}</strong></div>
              </div>
              <div className="question-counter">
                {String(currentQuestion + 1).padStart(2, "0")}
                <span>/</span>
                {String(questions.length).padStart(2, "0")}
              </div>
            </div>
            <div className="progress-track">
              <div
                className="progress-value"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
            <div className="question-card">
              <div className="question-label">QUESTION {String(currentQuestion + 1).padStart(2, "0")}</div>
              <h1>{question?.question}</h1>
              <div className="options-list">
                {question?.options.map((option, idx) => {
                  const optionLetter = String.fromCharCode(65 + idx);
                  const isSelected = selectedAnswer === option;
                  const isCorrectOption = showFeedback && option === question.correctAnswer;
                  const isWrongSelected = showFeedback && isSelected && option !== question.correctAnswer;
                  return (
                    <button
                      key={option}
                      className={`answer-option ${isSelected ? "selected" : ""} ${isCorrectOption ? "correct-option" : ""} ${isWrongSelected ? "wrong-option" : ""}`}
                      onClick={() => handleSelectAnswer(option)}
                    >
                      <span className="option-letter">{optionLetter}</span>
                      <span className="option-text">{option}</span>
                      {isCorrectOption && <span className="option-status">✓</span>}
                      {isWrongSelected && <span className="option-status">×</span>}
                    </button>
                  );
                })}
              </div>
              {!showFeedback && (
                <button
                  className="check-answer-button"
                  disabled={!selectedAnswer}
                  onClick={handleCheckAnswer}
                >
                  Check Answer <span>→</span>
                </button>
              )}
              {showFeedback && (
                <div className={`feedback-card ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}>
                  <div className="feedback-icon">{isCorrect ? "✓" : "×"}</div>
                  <div className="feedback-content">
                    <div className="feedback-title">{isCorrect ? "Correct!" : "Not quite!"}</div>
                    {!isCorrect && (
                      <div className="correct-answer-text">
                        Correct answer: <strong>{question.correctAnswer}</strong>
                      </div>
                    )}
                    <p>{question.explanation}</p>
                  </div>
                </div>
              )}
              {showFeedback && (
                <button className="next-question-button" onClick={handleNextQuestion}>
                  {currentQuestion === questions.length - 1 ? "Finish Quiz" : "Next Question"}
                  <span>→</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* ================= COMPLETED SCREEN ================= */}
        {quizCompleted && (
          <section className="completed-screen">
            <div className="completion-card">
              <div className="confetti-symbols">✦　✧　✦</div>
              <div className="trophy">🏆</div>
              <div className="completion-label">QUIZ COMPLETE</div>
              <h1>You finished the quiz!</h1>
              <p>Great job. Here's how you performed.</p>
              <div className="score-grid">
                <div className="score-item"><strong>{questions.length}</strong><span>Total Questions</span></div>
                <div className="score-item score-success"><strong>{score}</strong><span>Correct</span></div>
                <div className="score-item score-error"><strong>{questions.length - score}</strong><span>Incorrect</span></div>
              </div>
              <div className="next-step-card">
                <div className="next-step-icon">💡</div>
                <div>
                  <strong>Next Step</strong>
                  <p>Review your mistakes and keep building your knowledge.</p>
                </div>
              </div>
              <button className="report-button">View Detailed Report<span>→</span></button>
              <button className="home-button" onClick={handleRestartQuiz}>Take Quiz Again</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Quiz;
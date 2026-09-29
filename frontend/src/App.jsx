import { useState } from "react";
import Quiz from "./pages/Quiz";
import VisualLearning from "./pages/VisualLearning";

function App() {
  const [currentPage, setCurrentPage] = useState("visual-learning");

  return (
    <>
      {currentPage === "quiz" ? (
        <Quiz onNavigate={setCurrentPage} />
      ) : (
        <VisualLearning onNavigate={setCurrentPage} />
      )}
    </>
  );
}

export default App;
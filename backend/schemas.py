"""
schemas.py - Data contracts for AI Study Assistant Pipeline.
Defines standard JSON structures passed between Agent 1, Agent 2, and Agent 3.
Uses standard Python dataclasses (no external packages required).
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional


# -------------------------------------------------------------
# AGENT 1 DATA STRUCTURES (Notes Digitizer)
# -------------------------------------------------------------

@dataclass
class Flashcard:
    question: str
    answer: str
    topic: str


@dataclass
class TopicNote:
    topic: str
    summary: str
    key_points: List[str] = field(default_factory=list)
    definitions: List[str] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)


@dataclass
class StructuredNotes:
    title: str
    topics: List[TopicNote] = field(default_factory=list)
    flashcards: List[Flashcard] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# -------------------------------------------------------------
# AGENT 2 DATA STRUCTURES (Quiz Master)
# -------------------------------------------------------------

@dataclass
class QuizQuestion:
    question_id: str
    topic: str
    question: str
    options: List[str]          # 4 multiple choice options
    correct_option_index: int    # 0, 1, 2, or 3
    explanation: str
    difficulty: str             # "easy", "medium", "hard"


@dataclass
class QuizAttempt:
    question_id: str
    topic: str
    difficulty: str
    student_answer: str
    correct_answer: str
    is_correct: bool
    explanation_shown: str


@dataclass
class TopicPerformance:
    topic: str
    total_questions: int = 0
    correct_count: int = 0
    incorrect_count: int = 0

    @property
    def percentage(self) -> float:
        if self.total_questions == 0:
            return 0.0
        return round((self.correct_count / self.total_questions) * 100, 1)


# -------------------------------------------------------------
# AGENT 3 DATA STRUCTURES (Revision Planner)
# -------------------------------------------------------------

@dataclass
class RevisionTopicItem:
    topic: str
    priority: int                # 1 = High/Weak, 2 = Medium, 3 = Quick Recap
    performance_percentage: float
    why_revise: str
    key_points_to_revise: List[str] = field(default_factory=list)
    quick_revision_summary: str = ""


@dataclass
class RevisionPlan:
    title: str
    priority_topics: List[RevisionTopicItem] = field(default_factory=list)
    strong_topics: List[str] = field(default_factory=list)
    recommended_sequence: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
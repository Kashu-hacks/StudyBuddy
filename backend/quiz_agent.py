"""
quiz_agent.py - Agent 2: Quiz Master Agent.
Generates questions grounded in notes and conducts an adaptive quiz.
Tracks performance per topic for Agent 3.
"""

import json
from typing import List, Dict, Optional
from schemas import StructuredNotes, QuizQuestion, QuizAttempt, TopicPerformance


class QuizMasterAgent:
    def __init__(self, azure_client=None, model_name: str = "gpt-4o-mini"):
        """
        Initializes the Quiz Master Agent.
        - azure_client: Optional Azure OpenAI client for cloud generation.
        """
        self.client = azure_client
        self.model_name = model_name
        self.attempts: List[QuizAttempt] = []
        self.current_difficulty_level = 2  # 1 = Easy, 2 = Medium, 3 = Hard

    @property
    def current_difficulty_str(self) -> str:
        levels = {1: "easy", 2: "medium", 3: "hard"}
        return levels.get(self.current_difficulty_level, "medium")

    def generate_quiz(self, notes: StructuredNotes) -> List[QuizQuestion]:
        """
        Generates a pool of questions strictly grounded in the student's notes.
        """
        if self.client:
            return self._generate_with_azure(notes)
        else:
            return self._generate_locally(notes)

    def _generate_locally(self, notes: StructuredNotes) -> List[QuizQuestion]:
        """
        Local generator: builds questions from flashcards and key points.
        Costs $0.00 to run and test!
        """
        questions = []
        q_counter = 1

        for topic_note in notes.topics:
            topic = topic_note.topic

            # Level 1 (Easy): Direct definition/term questions
            for definition in topic_note.definitions:
                questions.append(QuizQuestion(
                    question_id=f"q_{q_counter}",
                    topic=topic,
                    question=f"Regarding {topic}, which statement is a correct definition?",
                    options=[
                        definition,
                        f"It is an obsolete concept replaced by modern protocols.",
                        f"It is only used for hardware manufacturing.",
                        f"None of the above."
                    ],
                    correct_option_index=0,
                    explanation=f"Definition from your notes: {definition}",
                    difficulty="easy"
                ))
                q_counter += 1

            # Level 2 (Medium): Key points questions
            if topic_note.key_points:
                correct_pt = topic_note.key_points[0]
                questions.append(QuizQuestion(
                    question_id=f"q_{q_counter}",
                    topic=topic,
                    question=f"Which of the following is a true characteristic of {topic}?",
                    options=[
                        "It requires manual physical reconfiguration every hour.",
                        correct_pt,
                        "It cannot transmit data over electronic signals.",
                        "It was developed in the 1800s for telegraphs."
                    ],
                    correct_option_index=1,
                    explanation=f"From your notes: {correct_pt}",
                    difficulty="medium"
                ))
                q_counter += 1

            # Level 3 (Hard): Conceptual application
            if len(topic_note.key_points) > 1:
                hard_pt = topic_note.key_points[1]
                questions.append(QuizQuestion(
                    question_id=f"q_{q_counter}",
                    topic=topic,
                    question=f"When analyzing {topic}, which key property must be considered?",
                    options=[
                        "It strictly operates without any protocols.",
                        "It is limited to a single device with no connectivity.",
                        hard_pt,
                        "All network traffic is unencrypted by default."
                    ],
                    correct_option_index=2,
                    explanation=f"Important detail from your notes: {hard_pt}",
                    difficulty="hard"
                ))
                q_counter += 1

        return questions

    def _generate_with_azure(self, notes: StructuredNotes) -> List[QuizQuestion]:
        """
        Azure OpenAI / Foundry integration:
        Generates grounded MCQs across easy, medium, and hard tiers.
        """
        notes_dict = notes.to_dict()
        system_prompt = (
            "You are the Quiz Master Agent.\n"
            "Generate 5 to 6 multiple choice questions strictly grounded in the provided notes.\n"
            "Include a mix of difficulties: 'easy', 'medium', 'hard'.\n"
            "Return ONLY a valid JSON object matching:\n"
            "{\n"
            '  "questions": [\n'
            "    {\n"
            '      "question_id": "q1",\n'
            '      "topic": "Topic Name",\n'
            '      "question": "Question text?",\n'
            '      "options": ["A", "B", "C", "D"],\n'
            '      "correct_option_index": 0,\n'
            '      "explanation": "Clear explanation grounded in notes",\n'
            '      "difficulty": "medium"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        response = self.client.chat.completions.create(
            model=self.model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Student Notes:\n{json.dumps(notes_dict, indent=2)}"}
            ],
            temperature=0.3
        )

        data = json.loads(response.choices[0].message.content)
        questions = []
        for q in data.get("questions", []):
            questions.append(QuizQuestion(
                question_id=q.get("question_id", "q"),
                topic=q.get("topic", "General"),
                question=q.get("question", ""),
                options=q.get("options", []),
                correct_option_index=q.get("correct_option_index", 0),
                explanation=q.get("explanation", ""),
                difficulty=q.get("difficulty", "medium")
            ))
        return questions

    def evaluate_answer(self, question: QuizQuestion, selected_index: int) -> Dict:
        """
        Evaluates the student's answer, updates adaptive difficulty,
        and logs the attempt.
        """
        is_correct = (selected_index == question.correct_option_index)
        student_ans = question.options[selected_index] if 0 <= selected_index < len(question.options) else "None"
        correct_ans = question.options[question.correct_option_index]

        # Adaptive Logic:
        # If correct -> increase difficulty (up to 3 = Hard)
        # If incorrect -> decrease difficulty (down to 1 = Easy)
        old_level = self.current_difficulty_level
        if is_correct:
            if self.current_difficulty_level < 3:
                self.current_difficulty_level += 1
        else:
            if self.current_difficulty_level > 1:
                self.current_difficulty_level -= 1

        attempt = QuizAttempt(
            question_id=question.question_id,
            topic=question.topic,
            difficulty=question.difficulty,
            student_answer=student_ans,
            correct_answer=correct_ans,
            is_correct=is_correct,
            explanation_shown=question.explanation
        )
        self.attempts.append(attempt)

        return {
            "is_correct": is_correct,
            "correct_answer": correct_ans,
            "explanation": question.explanation,
            "old_difficulty": old_level,
            "new_difficulty": self.current_difficulty_level,
            "new_difficulty_label": self.current_difficulty_str
        }

    def get_topic_performance(self) -> Dict[str, TopicPerformance]:
        """
        Aggregates quiz results by topic.
        This scorecard is passed directly to Agent 3 (Revision Planner).
        """
        perf_map: Dict[str, TopicPerformance] = {}

        for att in self.attempts:
            if att.topic not in perf_map:
                perf_map[att.topic] = TopicPerformance(topic=att.topic)

            perf_map[att.topic].total_questions += 1
            if att.is_correct:
                perf_map[att.topic].correct_count += 1
            else:
                perf_map[att.topic].incorrect_count += 1

        return perf_map
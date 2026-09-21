"""
revivion_planner.py - Agent 3: Revision Planner Agent.
Converts quiz performance data from Agent 2 into a personalized,
prioritized revision plan.
"""

import json
from typing import Dict, List, Optional
from schemas import TopicPerformance, StructuredNotes, RevisionPlan, RevisionTopicItem


class RevisionPlannerAgent:
    def __init__(self, azure_client=None, model_name: str = "gpt-4o-mini"):
        """
        Initializes the Revision Planner Agent.
        - azure_client: Optional Azure OpenAI client for GenAI recommendations.
        """
        self.client = azure_client
        self.model_name = model_name

    def create_revision_plan(
        self,
        performance_data: Dict[str, TopicPerformance],
        notes: StructuredNotes
    ) -> RevisionPlan:
        """
        Main entry point for Agent 3.
        Consumes Agent 2's scorecard and Agent 1's structured notes to build the plan.
        """
        if self.client:
            return self._create_with_azure(performance_data, notes)
        else:
            return self._create_locally(performance_data, notes)

    def _create_locally(
        self,
        performance_data: Dict[str, TopicPerformance],
        notes: StructuredNotes
    ) -> RevisionPlan:
        """
        Local analytical engine:
        Ranks topics by score, classifies weak vs strong, and extracts revision points.
        Runs locally for $0.00.
        """
        priority_items: List[RevisionTopicItem] = []
        strong_topics: List[str] = []

        # Map topics from notes for quick lookup of definitions and key points
        notes_topic_map = {t.topic.lower(): t for t in notes.topics}

        # Sort topics by performance percentage (lowest first)
        sorted_perfs = sorted(performance_data.values(), key=lambda p: p.percentage)

        for perf in sorted_perfs:
            matched_note = notes_topic_map.get(perf.topic.lower())
            key_pts = matched_note.key_points if matched_note else []
            defs = matched_note.definitions if matched_note else []

            # Priority Classification
            if perf.percentage < 50.0:
                # Priority 1: Critical Weakness
                why = f"You struggled on {perf.topic} with {perf.incorrect_count} incorrect answer(s) ({perf.percentage}% score)."
                summary = defs[0] if defs else f"Review core fundamentals of {perf.topic}."
                priority_items.append(RevisionTopicItem(
                    topic=perf.topic,
                    priority=1,
                    performance_percentage=perf.percentage,
                    why_revise=why,
                    key_points_to_revise=key_pts[:3],
                    quick_revision_summary=summary
                ))
            elif perf.percentage <= 75.0:
                # Priority 2: Moderate Understanding
                why = f"Moderate understanding ({perf.percentage}% score). Review key details to reach mastery."
                summary = f"Reinforce intermediate concepts in {perf.topic}."
                priority_items.append(RevisionTopicItem(
                    topic=perf.topic,
                    priority=2,
                    performance_percentage=perf.percentage,
                    why_revise=why,
                    key_points_to_revise=key_pts[:2],
                    quick_revision_summary=summary
                ))
            else:
                # Strong topic (Score > 75%)
                strong_topics.append(f"{perf.topic} ({perf.percentage}% correct - Mastered)")

        # Recommended study sequence: Priority 1 first, then Priority 2
        study_sequence = [item.topic for item in priority_items]

        return RevisionPlan(
            title="Personalized Revision Plan",
            priority_topics=priority_items,
            strong_topics=strong_topics,
            recommended_sequence=study_sequence
        )

    def _create_with_azure(
        self,
        performance_data: Dict[str, TopicPerformance],
        notes: StructuredNotes
    ) -> RevisionPlan:
        """
        Azure OpenAI / Foundry integration:
        Generates deeply personalized pedagogical revision recommendations.
        """
        perf_summary = {
            topic: {
                "percentage": p.percentage,
                "correct": p.correct_count,
                "incorrect": p.incorrect_count
            }
            for topic, p in performance_data.items()
        }

        system_prompt = (
            "You are the Revision Planner Agent for an AI Study Assistant.\n"
            "Analyze the student's quiz performance and their original notes.\n"
            "Identify weak areas (<50% = Priority 1, 50-75% = Priority 2, >75% = Strong).\n"
            "Return ONLY a valid JSON object matching:\n"
            "{\n"
            '  "title": "Personalized Revision Plan",\n'
            '  "priority_topics": [\n'
            "    {\n"
            '      "topic": "Topic Name",\n'
            '      "priority": 1,\n'
            '      "performance_percentage": 30.0,\n'
            '      "why_revise": "Reason for revision",\n'
            '      "key_points_to_revise": ["Point 1", "Point 2"],\n'
            '      "quick_revision_summary": "Short revision summary"\n'
            "    }\n"
            "  ],\n"
            '  "strong_topics": ["Topic 1 (90%)"],\n'
            '  "recommended_sequence": ["Topic A", "Topic B"]\n'
            "}"
        )

        user_content = (
            f"Quiz Performance Data:\n{json.dumps(perf_summary, indent=2)}\n\n"
            f"Original Structured Notes:\n{json.dumps(notes.to_dict(), indent=2)}"
        )

        response = self.client.chat.completions.create(
            model=self.model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3
        )

        data = json.loads(response.choices[0].message.content)
        priority_items = [
            RevisionTopicItem(
                topic=item.get("topic", "General"),
                priority=item.get("priority", 1),
                performance_percentage=float(item.get("performance_percentage", 0.0)),
                why_revise=item.get("why_revise", ""),
                key_points_to_revise=item.get("key_points_to_revise", []),
                quick_revision_summary=item.get("quick_revision_summary", "")
            )
            for item in data.get("priority_topics", [])
        ]

        return RevisionPlan(
            title=data.get("title", "Personalized Revision Plan"),
            priority_topics=priority_items,
            strong_topics=data.get("strong_topics", []),
            recommended_sequence=data.get("recommended_sequence", [])
        )
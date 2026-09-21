"""
notes_digitizer.py - Agent 1: Notes Digitizer Agent.
Takes raw notes text and transforms it into structured notes and flashcards.
Supports both local rule-based structuring (free testing) and Azure OpenAI.
"""

import json
import re
from typing import Optional
from schemas import StructuredNotes, TopicNote, Flashcard


class NotesDigitizerAgent:
    def __init__(self, azure_client=None, model_name: str = "gpt-4o-mini"):
        """
        Initializes the Notes Digitizer Agent.
        - azure_client: Optional Azure OpenAI client for cloud processing.
        - model_name: Deployment name of the model in Microsoft Foundry.
        """
        self.client = azure_client
        self.model_name = model_name

    def digitize_notes(self, raw_text: str) -> StructuredNotes:
        """
        Main entry point for Agent 1.
        Takes raw text and returns a StructuredNotes object.
        """
        if self.client:
            return self._digitize_with_azure(raw_text)
        else:
            return self._digitize_locally(raw_text)

    def _digitize_locally(self, raw_text: str) -> StructuredNotes:
        """
        Local processor: parses and structures notes without calling cloud APIs.
        Perfect for testing the pipeline locally for $0.00.
        """
        lines = [line.strip() for line in raw_text.strip().split("\n") if line.strip()]
        
        # Determine Title
        title = "Study Notes"
        if lines and len(lines[0]) < 60 and not lines[0].startswith(("-", "*")):
            title = lines[0].replace("#", "").strip()
            content_lines = lines[1:]
        else:
            content_lines = lines

        topics = []
        flashcards = []
        
        current_topic_name = title
        current_points = []
        current_definitions = []
        current_examples = []

        for line in content_lines:
            # Check if line is a topic header (e.g. "Topic: LAN" or "## LAN")
            if line.startswith(("#", "Topic:", "TOPIC:")) or (line.endswith(":") and len(line) < 40):
                if current_points or current_definitions:
                    topics.append(TopicNote(
                        topic=current_topic_name,
                        summary=f"Key concepts regarding {current_topic_name}.",
                        key_points=current_points,
                        definitions=current_definitions,
                        examples=current_examples
                    ))
                    current_points = []
                    current_definitions = []
                    current_examples = []

                cleaned_name = re.sub(r"^[#\s]+|Topic:\s*", "", line, flags=re.IGNORECASE).rstrip(":")
                current_topic_name = cleaned_name.strip()
                continue

            # Detect definitions
            lower_line = line.lower()
            if "stands for" in lower_line or "is defined as" in lower_line or "refers to" in lower_line:
                clean_def = line.lstrip("*-• ").strip()
                current_definitions.append(clean_def)
                current_points.append(clean_def)
                
                # Auto-generate a flashcard from definition
                if "stands for" in lower_line:
                    parts = re.split(r"stands for", line, flags=re.IGNORECASE)
                    if len(parts) == 2:
                        term = parts[0].strip(" *-•")
                        meaning = parts[1].strip(" .")
                        flashcards.append(Flashcard(
                            question=f"What does {term} stand for?",
                            answer=meaning,
                            topic=current_topic_name
                        ))
                continue

            # Detect examples
            if lower_line.startswith("example:") or "for example" in lower_line:
                clean_ex = line.lstrip("*-• ").strip()
                current_examples.append(clean_ex)
                continue

            # Standard bullet point
            clean_point = line.lstrip("*-•0123456789. ").strip()
            if clean_point:
                current_points.append(clean_point)

        # Append final remaining topic
        if current_points or current_definitions:
            topics.append(TopicNote(
                topic=current_topic_name,
                summary=f"Key concepts regarding {current_topic_name}.",
                key_points=current_points,
                definitions=current_definitions,
                examples=current_examples
            ))

        # Default flashcards if none found
        if not flashcards and topics:
            for topic in topics:
                for point in topic.key_points[:2]:
                    flashcards.append(Flashcard(
                        question=f"What is a key point about {topic.topic}?",
                        answer=point,
                        topic=topic.topic
                    ))

        return StructuredNotes(
            title=title,
            topics=topics,
            flashcards=flashcards
        )

    def _digitize_with_azure(self, raw_text: str) -> StructuredNotes:
        """
        Azure OpenAI / Foundry integration:
        Sends raw text to GPT-4o-mini and requests a strict JSON response.
        """
        system_prompt = (
            "You are the Notes Digitizer Agent for an AI Study Assistant.\n"
            "Your job is to take raw, messy student notes and convert them into structured digital notes.\n"
            "Rules:\n"
            "1. Remove OCR noise and formatting glitches.\n"
            "2. Group content into logical topics with headings, bullet points, definitions, and examples.\n"
            "3. Generate concise, high-yield flashcards.\n"
            "4. NEVER invent facts that are not present in the student's source notes.\n"
            "5. Return ONLY a valid JSON object matching this schema:\n"
            "{\n"
            '  "title": "Document Title",\n'
            '  "topics": [\n'
            '    {\n'
            '      "topic": "Topic Name",\n'
            '      "summary": "Brief summary",\n'
            '      "key_points": ["point 1", "point 2"],\n'
            '      "definitions": ["definition 1"],\n'
            '      "examples": ["example 1"]\n'
            '    }\n'
            '  ],\n'
            '  "flashcards": [\n'
            '    {"question": "Q?", "answer": "A", "topic": "Topic Name"}\n'
            '  ]\n'
            "}"
        )

        response = self.client.chat.completions.create(
            model=self.model_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here are the student notes:\n\n{raw_text}"}
            ],
            temperature=0.2
        )

        data = json.loads(response.choices[0].message.content)
        
        topics = [
            TopicNote(
                topic=t.get("topic", "General"),
                summary=t.get("summary", ""),
                key_points=t.get("key_points", []),
                definitions=t.get("definitions", []),
                examples=t.get("examples", [])
            )
            for t in data.get("topics", [])
        ]
        
        flashcards = [
            Flashcard(
                question=f.get("question", ""),
                answer=f.get("answer", ""),
                topic=f.get("topic", "General")
            )
            for f in data.get("flashcards", [])
        ]

        return StructuredNotes(
            title=data.get("title", "Study Notes"),
            topics=topics,
            flashcards=flashcards
        )
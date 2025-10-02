"""
Language Teacher AI Agent for LiveKit
Handles real-time voice conversations with language learners
"""

import asyncio
import os
import logging
from typing import Optional
from dotenv import load_dotenv
import requests

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CerebrasLLM:
    """Custom LLM adapter for Cerebras API"""

    def __init__(self, api_key: str, api_url: str = "https://api.cerebras.ai/v1"):
        self.api_key = api_key
        self.api_url = api_url
        self.model = "llama3.3-70b"

    async def generate(
        self,
        messages: list,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """Generate response from Cerebras API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            # Make synchronous request (in production, use aiohttp for async)
            response = requests.post(
                f"{self.api_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            data = response.json()

            if data.get("choices") and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]

            return "I'm sorry, I couldn't generate a response."

        except Exception as e:
            logger.error(f"Cerebras API error: {e}")
            return "I'm having trouble connecting. Please try again."


def build_system_prompt(difficulty: str = "beginner", topic: Optional[str] = None) -> str:
    """Build system prompt for the AI teacher"""
    base = """You are a patient and encouraging language teacher. Your role is to:
- Help students practice speaking naturally
- Correct mistakes gently and constructively
- Ask follow-up questions to keep conversation flowing
- Provide clear explanations when needed
- Adjust your language to the student's level

Keep responses conversational, concise, and encouraging."""

    if difficulty == "beginner":
        base += "\n\nUse simple vocabulary and short sentences. Speak slowly and clearly."
    elif difficulty == "intermediate":
        base += "\n\nUse moderately complex language. Introduce new vocabulary in context."
    else:  # advanced
        base += "\n\nUse natural, complex language. Discuss nuanced topics."

    if topic:
        base += f"\n\nCurrent topic: {topic}"

    return base


async def entrypoint(ctx: JobContext):
    """Main entry point for the agent"""

    logger.info(f"Starting Language Teacher Agent for room: {ctx.room.name}")

    # Get participant metadata (difficulty, topic)
    difficulty = "beginner"
    topic = None

    # Wait for participant to join
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Get metadata from first participant
    async for participant in ctx.wait_for_participant():
        if participant.metadata:
            import json
            try:
                metadata = json.loads(participant.metadata)
                difficulty = metadata.get("difficulty", "beginner")
                topic = metadata.get("topic")
                logger.info(f"Participant metadata: difficulty={difficulty}, topic={topic}")
            except:
                pass
        break

    # Initialize Cerebras LLM
    cerebras_api_key = os.getenv("CEREBRAS_API_KEY")
    cerebras = CerebrasLLM(cerebras_api_key)

    # For now, we'll use OpenAI for STT/TTS (replace with Cartesia later)
    # This requires OPENAI_API_KEY in .env
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=build_system_prompt(difficulty, topic)
    )

    # Create voice assistant
    assistant = VoiceAssistant(
        vad=rtc.VAD.load(),  # Voice Activity Detection
        stt=openai.STT(),  # Speech-to-Text (temporary, replace with Cartesia)
        llm=openai.LLM(model="gpt-3.5-turbo"),  # We'll override this with Cerebras
        tts=openai.TTS(voice="alloy"),  # Text-to-Speech (temporary, replace with Cartesia)
        chat_ctx=initial_ctx,
    )

    # Custom message handler to use Cerebras
    original_handler = assistant._llm

    class CerebrasHandler:
        def __init__(self, cerebras_llm):
            self.cerebras = cerebras_llm
            self.messages = [{"role": "system", "content": build_system_prompt(difficulty, topic)}]

        async def chat(self, chat_ctx):
            # Convert chat context to messages
            user_message = chat_ctx.messages[-1].content if chat_ctx.messages else ""

            if user_message:
                self.messages.append({"role": "user", "content": user_message})

                # Get response from Cerebras
                response = await asyncio.to_thread(
                    self.cerebras.generate,
                    self.messages
                )

                self.messages.append({"role": "assistant", "content": response})

                # Return response in expected format
                return llm.ChatChunk(
                    choices=[
                        llm.Choice(
                            delta=llm.ChoiceDelta(
                                content=response,
                                role="assistant"
                            )
                        )
                    ]
                )

    # Override with Cerebras handler
    assistant._llm = CerebrasHandler(cerebras)

    # Start the assistant
    assistant.start(ctx.room)

    # Send initial greeting
    await assistant.say(
        "Hello! I'm your language teacher. I'm here to help you practice speaking. "
        "What would you like to talk about today?",
        allow_interruptions=True
    )

    logger.info("Assistant started and ready for conversation")


if __name__ == "__main__":
    # Run the agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="language-teacher"
        )
    )

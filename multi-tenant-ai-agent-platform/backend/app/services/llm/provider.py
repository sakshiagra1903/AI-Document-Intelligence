import os
from app.core.config import settings

class LLMProvider:
    async def generate(self, system: str, messages: list[dict], context: list[dict], temperature: float=0.2) -> str:
        if settings.groq_api_key:
            try:
                from groq import AsyncGroq
                client=AsyncGroq(api_key=settings.groq_api_key)
                ctx='\n\n'.join(f"SOURCE {i+1}: {x['content']}" for i,x in enumerate(context))
                prompt=system+"\n\nVERIFIED KNOWLEDGE:\n"+ctx+"\n\nUse only the verified knowledge. If it does not contain the answer, say you do not have enough information."
                r=await client.chat.completions.create(model='llama-3.3-70b-versatile',messages=[{'role':'system','content':prompt}]+messages,temperature=temperature)
                return r.choices[0].message.content
            except Exception: pass
        # Safe local fallback: extract the most relevant sentence instead of hallucinating.
        if not context: return ''
        q=messages[-1]['content'].lower(); terms=set(q.split())
        best=max(context,key=lambda x: len(terms & set(x['content'].lower().split())))
        if len(terms & set(best['content'].lower().split())) < 1: return ''
        return f"Based on the available business knowledge: {best['content'][:1200]}"

import json
import httpx
from typing import Dict, Any
from backend.config import settings
from backend.utils.logger import logger

DEMO_RESPONSES = {
    "security": {
        "low": {"pii_detected": False, "severity": "LOW", "findings": [], "reasoning": "No security issues", "confidence": 0.95, "evidence": ["Clean scan"], "recommendation": "Pass"},
        "medium": {"pii_detected": False, "severity": "LOW", "findings": ["Minor config note"], "reasoning": "Acceptable security posture", "confidence": 0.92, "evidence": ["Scan complete"], "recommendation": "Pass"},
        "high": {"pii_detected": False, "severity": "MEDIUM", "findings": ["Elevated access scope"], "reasoning": "Requires monitoring", "confidence": 0.88, "evidence": ["Deep scan"], "recommendation": "Review"},
    },
    "compliance": {
        "high": {"status": "PASS", "violations": [], "frameworks_checked": ["GDPR", "SOC2", "HIPAA"], "reasoning": "All frameworks satisfied", "confidence": 0.94, "evidence": ["Policy check"], "recommendation": "Proceed", "policy_refs": ["GDPR-Art6"]},
    },
    "risk": {
        "low": {"risk_score": 15, "severity": "LOW", "findings": [], "reasoning": "Minimal risk", "confidence": 0.96, "evidence": ["Low tier assessment"], "recommendation": "PROCEED", "rationale": "Low risk profile"},
        "medium": {"risk_score": 45, "severity": "MEDIUM", "findings": ["Moderate data exposure"], "reasoning": "Acceptable with monitoring", "confidence": 0.90, "evidence": ["Medium tier assessment"], "recommendation": "PROCEED", "rationale": "Medium risk within tolerance"},
        "high": {"risk_score": 85, "severity": "HIGH", "findings": ["High privilege access", "Sensitive data handling"], "reasoning": "Elevated risk requires escalation", "confidence": 0.87, "evidence": ["High tier assessment"], "recommendation": "REVIEW", "rationale": "High risk profile"},
    },
    "audit": {
        "low": {"governance_summary": "Low-tier workflow passed registry and audit checks.", "decision_chain": ["Registry validated", "Audit approved"], "participating_agents": ["MetaAgent", "RegistryAgent", "AuditAgent"], "final_outcome": "APPROVED", "reasoning": "Low risk agent approved", "confidence": 0.98, "evidence": ["Registry pass"], "recommendation": "Deploy"},
        "medium": {"governance_summary": "Medium-tier workflow completed security and risk review.", "decision_chain": ["Registry validated", "Security passed", "Risk acceptable", "Audit approved"], "participating_agents": ["MetaAgent", "RegistryAgent", "SecurityAgent", "RiskAgent", "AuditAgent"], "final_outcome": "APPROVED", "reasoning": "Medium risk within tolerance", "confidence": 0.95, "evidence": ["Risk score acceptable"], "recommendation": "Deploy with monitoring"},
        "high": {"governance_summary": "High-tier workflow completed full governance pipeline with escalation.", "decision_chain": ["Registry validated", "Security reviewed", "Compliance passed", "Risk elevated", "Escalation triggered", "Audit completed"], "participating_agents": ["MetaAgent", "RegistryAgent", "SecurityAgent", "ComplianceAgent", "RiskAgent", "EscalationAgent", "AuditAgent"], "final_outcome": "REVIEW_REQUIRED", "reasoning": "High risk requires human review", "confidence": 0.93, "evidence": ["Escalation triggered"], "recommendation": "Hold pending review"},
    },
}


class AIResponse(tuple):
    def __new__(cls, provider: str, data: Any):
        return super().__new__(cls, (provider, data))

    def __init__(self, provider: str, data: Any):
        self.provider = provider
        self.data = data

    def __getitem__(self, key):
        if isinstance(key, int):
            return super().__getitem__(key)
        if key == "provider":
            return self.provider
        if isinstance(self.data, dict) and key in self.data:
            return self.data[key]
        raise KeyError(key)

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default


class AIClient:
    def __init__(self):
        self.aiml_client = httpx.AsyncClient(
            base_url=settings.AIML_BASE_URL,
            headers={"Authorization": f"Bearer {settings.AIML_API_KEY}"},
            timeout=10.0
        )
        self.featherless_client = httpx.AsyncClient(
            base_url=settings.FEATHERLESS_BASE_URL,
            headers={
                "Authorization": f"Bearer {settings.FEATHERLESS_API_KEY}",
                "User-Agent": "AgentOS-Governance/1.0",
            },
            timeout=30.0
        )

    def _use_demo(self) -> bool:
        if settings.DEMO_MODE:
            return True
        placeholder_keys = ("your_", "placeholder", "changeme")
        keys = (settings.AIML_API_KEY, settings.FEATHERLESS_API_KEY)
        return any(k.lower().startswith(placeholder_keys) or "your" in k.lower() for k in keys)

    def _demo_response(self, prompt: str, tier: str = "medium", agent_type: str = None) -> Dict[str, Any]:
        if agent_type == "explanation":
            text = "Deterministic governance findings confirmed. LLM explanation provided for audit readability only."
            tokens = max(len(prompt) // 4, 20)
            return {
                "provider": "demo",
                "response_text": text,
                "latency_ms": 2.0,
                "tokens": tokens,
                "cost_usd": round(tokens * 0.000005, 6),
                "model": "demo-explanation",
            }
        # Legacy agent_type values return plain explanation text — never structured JSON.
        # Governance decisions are deterministic; demo LLM output is readability-only.
        if agent_type in ("security", "compliance", "risk", "audit") or (
            not agent_type
            and any(marker in prompt for marker in ("Security Agent", "Compliance Agent", "Risk Agent", "Audit Agent"))
        ):
            text = (
                "Deterministic governance findings confirmed. "
                "LLM explanation provided for audit readability only."
            )
        else:
            payload = {"status": "ok"}
            text = json.dumps(payload)
        tokens = max(len(prompt) // 4, 50)
        return {
            "provider": "demo",
            "response_text": text,
            "latency_ms": 5.0,
            "tokens": tokens,
            "cost_usd": round(tokens * 0.000005, 6),
            "model": "demo-mode",
        }

    async def generate_response(self, prompt: str, tier: str = "medium", agent_type: str = None) -> AIResponse:
        """Generate AI response with provider fallback.

        Returns an AIResponse object behaving as both tuple (provider_name, response_data) and dict.
        Raises Exception if both providers fail and demo mode is disabled.
        """
        logger.info("AI request started")

        if not self._use_demo():
            try:
                logger.info("Attempting AI/ML API")
                result = await self._call_provider(self.aiml_client, settings.AIML_MODEL, prompt)
                logger.info("AI request successful (AI/ML API)")
                return AIResponse("aiml", result)
            except Exception as e:
                logger.warning(f"AI/ML API failed: {e}. Fallback activated.")
                try:
                    logger.info("Attempting Featherless AI")
                    result = await self._call_provider(self.featherless_client, settings.FEATHERLESS_MODEL, prompt)
                    logger.info("AI request successful (Featherless AI)")
                    return AIResponse("featherless", result)
                except Exception as fallback_error:
                    logger.warning(f"Featherless failed: {fallback_error}. Using demo mode.")
                    raise Exception("Both AI providers failed")
        # Demo mode path
        logger.info(f"Using demo AI response (tier={tier}, agent={agent_type})")
        return AIResponse("demo", self._demo_response(prompt, tier, agent_type))

    async def _call_provider(self, client: httpx.AsyncClient, model: str, prompt: str) -> Dict[str, Any]:
        import time
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}]
        }

        start_time = time.time()
        response = await client.post("/chat/completions", json=payload)
        latency_ms = (time.time() - start_time) * 1000
        response.raise_for_status()
        data = response.json()
        response_text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        tokens = usage.get("total_tokens", len(prompt + response_text) // 4)
        cost_usd = tokens * 0.000005

        return {
            "response_text": response_text,
            "latency_ms": latency_ms,
            "tokens": tokens,
            "cost_usd": cost_usd,
            "model": model
        }

    async def get_status(self) -> Dict[str, Any]:
        """Probe configured AI providers and return connectivity status."""
        demo_mode = self._use_demo()
        aiml_ok = False
        featherless_ok = False

        if not demo_mode:
            try:
                await self._call_provider(self.aiml_client, settings.AIML_MODEL, "ping")
                aiml_ok = True
            except Exception:
                pass
            try:
                await self._call_provider(self.featherless_client, settings.FEATHERLESS_MODEL, "ping")
                featherless_ok = True
            except Exception:
                pass

        active_provider: str
        if demo_mode:
            active_provider = "demo"
        elif aiml_ok:
            active_provider = "aiml"
        elif featherless_ok:
            active_provider = "featherless"
        else:
            active_provider = "demo_fallback"

        return {
            "demo_mode": demo_mode,
            "active_provider": active_provider,
            "aiml": {
                "configured": bool(settings.AIML_API_KEY),
                "model": settings.AIML_MODEL,
                "reachable": aiml_ok,
            },
            "featherless": {
                "configured": bool(settings.FEATHERLESS_API_KEY),
                "model": settings.FEATHERLESS_MODEL,
                "reachable": featherless_ok,
            },
        }

    async def close(self):
        await self.aiml_client.aclose()
        await self.featherless_client.aclose()


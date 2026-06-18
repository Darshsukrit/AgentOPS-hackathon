import pytest
from backend.governance.tool_governance import evaluate_tool_governance


def test_delete_database_blocked():
    result = evaluate_tool_governance("Please use delete_database on prod")
    assert result.action == "BLOCK"
    assert "delete_database" in result.blocked_tools


def test_read_sensitive_escalates():
    result = evaluate_tool_governance("Need to read_sensitive_records from vault")
    assert result.action == "ESCALATE"


def test_internet_access_review():
    result = evaluate_tool_governance("Enable internet_access for research")
    assert result.action == "REVIEW"


def test_allowed_tools_pass():
    result = evaluate_tool_governance(
        "Run query_database report",
        allowed_tools=["query_database", "generate_report"],
    )
    assert result.action == "ALLOW"

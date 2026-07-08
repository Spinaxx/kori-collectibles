#!/usr/bin/env python3
"""Regenerate Shopify Flow .flow export for loyalty redemption."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

FORM_ID = "1063387"
META_DEFINITION_GID = f"gid://shopify/MetaobjectDefinition/{FORM_ID}"

SCRIPT_PATH = Path(__file__).with_name("redeem-loyalty-points.js")
SCRIPT = SCRIPT_PATH.read_text(encoding="utf-8").split("export default function main", 1)[1]
SCRIPT = "export default function main" + SCRIPT.split("// Next steps in Flow", 1)[0].rstrip()

INPUT_QUERY = """query {
  metaobject {
    formSubmittedBy {
      id
      email
      loyaltyPoints {
        value
      }
      loyaltyRedeemCode {
        value
      }
    }
  }
}"""

OUTPUT_SCHEMA = (
    '"The output of Run Code"\n'
    "type Output {\n"
    '  "Discount code to create (empty if not eligible)"\n'
    "  discountCode: String!\n"
    '  "Customer points balance after redemption"\n'
    "  newLoyaltyPoints: String!\n"
    '  "GBP value of the reward"\n'
    "  redeemValueGbp: String!\n"
    '  "true when customer already has an unused code"\n'
    "  reused: String!\n"
    "}"
)

CONDITION_CUSTOMER = {
    "uuid": "01KX2REDEEM000000000000001",
    "lhs": {
        "uuid": "01KX2REDEEM000000000000002",
        "parent_uuid": "01KX2REDEEM000000000000001",
        "lhs": {
            "uuid": "01KX2REDEEM000000000000003",
            "parent_uuid": "01KX2REDEEM000000000000002",
            "value": "metaobject.formSubmittedBy.id",
            "comparison_value_type": "EnvironmentValue",
            "full_environment_path": "metaobject.formSubmittedBy.id",
        },
        "rhs": {
            "uuid": "01KX2REDEEM000000000000004",
            "parent_uuid": "01KX2REDEEM000000000000002",
            "value": "",
            "comparison_value_type": "LiteralValue",
        },
        "value_type": "EnvironmentScalarDefinition:ID",
        "operator": "not_empty_and_not_nil?",
        "operation_type": "Comparison",
    },
    "operator": "AND",
    "operation_type": "LogicalExpression",
}

CONDITION_CODE = {
    "uuid": "01KX2REDEEM000000000000005",
    "lhs": {
        "uuid": "01KX2REDEEM000000000000006",
        "parent_uuid": "01KX2REDEEM000000000000005",
        "lhs": {
            "uuid": "01KX2REDEEM000000000000007",
            "parent_uuid": "01KX2REDEEM000000000000006",
            "value": "runCode.discountCode",
            "comparison_value_type": "EnvironmentValue",
            "full_environment_path": "runCode.discountCode",
        },
        "rhs": {
            "uuid": "01KX2REDEEM000000000000008",
            "parent_uuid": "01KX2REDEEM000000000000006",
            "value": "",
            "comparison_value_type": "LiteralValue",
        },
        "value_type": "EnvironmentScalarDefinition:String",
        "operator": "not_empty_and_not_nil?",
        "operation_type": "Comparison",
    },
    "operator": "AND",
    "operation_type": "LogicalExpression",
}

CONDITION_NOT_REUSED = {
    "uuid": "01KX2REDEEM000000000000009",
    "lhs": {
        "uuid": "01KX2REDEEM00000000000000A",
        "parent_uuid": "01KX2REDEEM000000000000009",
        "lhs": {
            "uuid": "01KX2REDEEM00000000000000B",
            "parent_uuid": "01KX2REDEEM00000000000000A",
            "value": "runCode.reused",
            "comparison_value_type": "EnvironmentValue",
            "full_environment_path": "runCode.reused",
        },
        "rhs": {
            "uuid": "01KX2REDEEM00000000000000C",
            "parent_uuid": "01KX2REDEEM00000000000000A",
            "value": "false",
            "comparison_value_type": "LiteralValue",
        },
        "value_type": "EnvironmentScalarDefinition:String",
        "operator": "==",
        "operation_type": "Comparison",
    },
    "operator": "AND",
    "operation_type": "LogicalExpression",
}

DISCOUNT_MUTATION_INPUTS = {
    "basicCodeDiscount": {
        "title": "Loyalty reward {{ runCode.discountCode }}",
        "code": "{{ runCode.discountCode }}",
        "startsAt": "{{ 'now' | date: '%Y-%m-%dT%H:%M:%SZ' }}",
        "endsAt": "{{ 'now' | date: '%s' | plus: 172800 | date: '%Y-%m-%dT%H:%M:%SZ' }}",
        "customerSelection": {
            "customers": {
                "add": ["{{ metaobject.formSubmittedBy.id }}"],
            },
        },
        "customerGets": {
            "value": {
                "discountAmount": {
                    "amount": "{{ runCode.redeemValueGbp }}",
                    "appliesOnEachItem": False,
                },
            },
            "items": {"all": True},
        },
        "usageLimit": 1,
        "appliesOncePerCustomer": True,
    },
}


def condition_step(step_id: str, y: int, condition: dict) -> dict:
    return {
        "step_id": step_id,
        "step_position": [0, y],
        "config_field_values": [
            {
                "config_field_id": "condition",
                "value": json.dumps(condition, separators=(",", ":")),
            }
        ],
        "task_id": "shopify::flow::condition",
        "task_version": "0.1",
        "task_type": "CONDITION",
        "description": None,
        "note": None,
        "name": None,
    }


def customer_metafield_step(
    step_id: str,
    y: int,
    key: str,
    field_type: str,
    value_template: str,
) -> dict:
    return {
        "step_id": step_id,
        "step_position": [0, y],
        "config_field_values": [
            {
                "config_field_id": "customer_id",
                "value": json.dumps(
                    {
                        "value": "{{ metaobject.formSubmittedBy.id }}",
                        "default_value": "metaobject.formSubmittedBy.id",
                    },
                    separators=(",", ":"),
                ),
            },
            {
                "config_field_id": "metafield",
                "value": json.dumps(
                    {
                        "namespace": "custom",
                        "key": key,
                        "type": field_type,
                    },
                    separators=(",", ":"),
                ),
            },
            {
                "config_field_id": "value",
                "value": value_template,
            },
        ],
        "task_id": "shopify::admin::add_customer_metafield",
        "task_version": "1.0",
        "task_type": "ACTION",
        "description": None,
        "note": None,
        "name": None,
    }


def build_workflow() -> dict:
    steps = [
        {
            "step_id": "01redeem-trigger-0001-0001-000000000001",
            "step_position": [0, 0],
            "config_field_values": [
                {
                    "config_field_id": "metaobject_definition_id",
                    "value": json.dumps(
                        {
                            "value": META_DEFINITION_GID,
                            "default_value": META_DEFINITION_GID,
                        },
                        separators=(",", ":"),
                    ),
                }
            ],
            "task_id": "shopify::admin::metaobject_created",
            "task_version": "0.1",
            "task_type": "TRIGGER",
            "description": None,
            "note": f"Shopify Form ID {FORM_ID}. Re-select the form in Flow if import does not bind it.",
            "name": None,
        },
        condition_step("01redeem-cond-00001-0001-000000000001", 120, CONDITION_CUSTOMER),
        {
            "step_id": "01redeem-runcode-001-0001-000000000001",
            "step_position": [0, 260],
            "config_field_values": [
                {"config_field_id": "input", "value": INPUT_QUERY},
                {"config_field_id": "script", "value": SCRIPT},
                {"config_field_id": "output_schema", "value": OUTPUT_SCHEMA},
            ],
            "task_id": "shopify::flow::run_code",
            "task_version": "0.1",
            "task_type": "ACTION",
            "description": None,
            "note": None,
            "name": "Run code",
        },
        condition_step("01redeem-cond-00002-0001-000000000001", 400, CONDITION_CODE),
        condition_step("01redeem-cond-00003-0001-000000000001", 540, CONDITION_NOT_REUSED),
        {
            "step_id": "01redeem-adminapi-01-0001-000000000001",
            "step_position": [0, 680],
            "config_field_values": [
                {
                    "config_field_id": "api_call",
                    "value": json.dumps(
                        {
                            "name": "discountCodeBasicCreate",
                            "blob": json.dumps(
                                DISCOUNT_MUTATION_INPUTS, separators=(",", ":")
                            ),
                        },
                        separators=(",", ":"),
                    ),
                }
            ],
            "task_id": "shopify::admin::admin_api_operation",
            "task_version": "0.1",
            "task_type": "ACTION",
            "description": None,
            "note": None,
            "name": None,
        },
        customer_metafield_step(
            "01redeem-points-0001-0001-000000000001",
            820,
            "loyalty_points",
            "number_integer",
            "{{ runCode.newLoyaltyPoints }}",
        ),
        customer_metafield_step(
            "01redeem-code-00001-0001-000000000001",
            960,
            "loyalty_redeem_code",
            "single_line_text_field",
            "{{ runCode.discountCode }}",
        ),
    ]

    links = [
        ("01redeem-trigger-0001-0001-000000000001", "output", "01redeem-cond-00001-0001-000000000001", "input"),
        ("01redeem-cond-00001-0001-000000000001", "true", "01redeem-runcode-001-0001-000000000001", "input"),
        ("01redeem-runcode-001-0001-000000000001", "output", "01redeem-cond-00002-0001-000000000001", "input"),
        ("01redeem-cond-00002-0001-000000000001", "true", "01redeem-cond-00003-0001-000000000001", "input"),
        ("01redeem-cond-00003-0001-000000000001", "true", "01redeem-adminapi-01-0001-000000000001", "input"),
        ("01redeem-adminapi-01-0001-000000000001", "output", "01redeem-points-0001-0001-000000000001", "input"),
        ("01redeem-points-0001-0001-000000000001", "output", "01redeem-code-00001-0001-000000000001", "input"),
    ]

    return {
        "__metadata": {"version": 0.1},
        "root": {
            "steps": steps,
            "links": [
                {
                    "from_step_id": from_id,
                    "from_port_id": from_port,
                    "to_step_id": to_id,
                    "to_port_id": to_port,
                }
                for from_id, from_port, to_id, to_port in links
            ],
            "patched_fields": [
                {
                    "id": "01redeem-patch-loyalty-points-00000001",
                    "handle": "loyaltyPoints",
                    "field": "metafield",
                    "patched_type": "Customer",
                    "arguments": json.dumps(
                        {"key": "loyalty_points", "namespace": "custom"},
                        separators=(",", ":"),
                    ),
                    "merchant_configured": True,
                },
                {
                    "id": "01redeem-patch-redeem-code-00000001",
                    "handle": "loyaltyRedeemCode",
                    "field": "metafield",
                    "patched_type": "Customer",
                    "arguments": json.dumps(
                        {"key": "loyalty_redeem_code", "namespace": "custom"},
                        separators=(",", ":"),
                    ),
                    "merchant_configured": True,
                },
            ],
            "variables": [],
            "note": None,
            "vertical_layout_enabled": True,
            "workflow_name": "Redeem loyalty points",
        },
    }


def export_flow(path: Path) -> None:
    body = json.dumps(build_workflow(), separators=(",", ":"), ensure_ascii=True)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    path.write_text(f"{digest}:{body}", encoding="utf-8")


if __name__ == "__main__":
    target = Path(__file__).with_name("Redeem loyalty points.flow")
    export_flow(target)
    print(f"Wrote {target}")

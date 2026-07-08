#!/usr/bin/env python3
"""Regenerate Shopify Flow .flow exports for loyalty redemption."""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from urllib.request import urlopen

FORM_ID = "1063387"
FORM_TYPE = f"app--6171699--shopify-forms{FORM_ID}"
TEMPLATE_URL = "https://ecommercepot.com/flows/customer-form-submission-email.flow"

SCRIPT = """const REDEEM_POINTS = 100;
const REDEEM_VALUE_GBP = 5;

export default function main(input) {
  const customer = input.customer ?? input.metaobject?.formSubmittedBy;

  if (!customer) {
    return {
      discountCode: '',
      newLoyaltyPoints: '0',
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'false',
    };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const existingCode = String(customer.loyaltyRedeemCode?.value ?? '').trim();

  if (existingCode) {
    return {
      discountCode: existingCode,
      newLoyaltyPoints: String(current),
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'true',
    };
  }

  if (current < REDEEM_POINTS) {
    return {
      discountCode: '',
      newLoyaltyPoints: String(current),
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'false',
    };
  }

  const customerId = String(customer.id ?? '').replace(/\\D/g, '') || '0';
  const code = `KORI-${customerId}-${Date.now().toString(36).toUpperCase()}`;
  const newBalance = Math.max(0, current - REDEEM_POINTS);

  return {
    discountCode: code,
    newLoyaltyPoints: String(newBalance),
    redeemValueGbp: String(REDEEM_VALUE_GBP),
    reused: 'false',
  };
}"""

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

DEDUCT_STYLE_CONDITION = {
    "uuid": "01KX1JZ3T55YPT7CFZQ3GNYTPE",
    "lhs": {
        "uuid": "01KX1JZ3T5ZQ0MQPMTQSX7NTKD",
        "parent_uuid": "01KX1JZ3T55YPT7CFZQ3GNYTPE",
        "lhs": {
            "uuid": "01KX1JZ3T5HP2PMCNKV2RH7FWW",
            "parent_uuid": "01KX1JZ3T5ZQ0MQPMTQSX7NTKD",
            "value": "metaobject.formSubmittedBy.id",
            "comparison_value_type": "EnvironmentValue",
            "full_environment_path": "metaobject.formSubmittedBy.id",
        },
        "rhs": {
            "uuid": "01KX1JZ3T53KTXFJGERK1WDYF3",
            "parent_uuid": "01KX1JZ3T5ZQ0MQPMTQSX7NTKD",
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

CUSTOMER_PATCHES = [
    {
        "id": "1aa7d135-1a57-4766-b6b7-017da2fba774",
        "handle": "loyaltyPoints",
        "field": "metafield",
        "patched_type": "Customer",
        "arguments": '{"key":"loyalty_points","namespace":"custom"}',
        "merchant_configured": True,
    },
    {
        "id": "2bb8e246-2b68-5877-c7c8-128eb3fcbb885",
        "handle": "loyaltyRedeemCode",
        "field": "metafield",
        "patched_type": "Customer",
        "arguments": '{"key":"loyalty_redeem_code","namespace":"custom"}',
        "merchant_configured": True,
    },
]


def load_template() -> dict:
    _, body = urlopen(TEMPLATE_URL).read().decode().split(":", 1)
    return json.loads(body)


def single_condition(
    env_path: str,
    *,
    value_type: str,
    operator: str,
    rhs_value: str = "",
) -> dict:
    root_uuid = str(uuid.uuid4())
    comp_uuid = str(uuid.uuid4())
    return {
        "uuid": root_uuid,
        "lhs": {
            "uuid": comp_uuid,
            "parent_uuid": root_uuid,
            "lhs": {
                "uuid": str(uuid.uuid4()),
                "parent_uuid": comp_uuid,
                "value": env_path,
                "comparison_value_type": "EnvironmentValue",
                "full_environment_path": env_path,
            },
            "rhs": {
                "uuid": str(uuid.uuid4()),
                "parent_uuid": comp_uuid,
                "value": rhs_value,
                "comparison_value_type": "LiteralValue",
            },
            "value_type": value_type,
            "operator": operator,
            "operation_type": "Comparison",
        },
        "operator": "AND",
        "operation_type": "LogicalExpression",
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


def run_code_step(step_id: str, y: int) -> dict:
    return {
        "step_id": step_id,
        "step_position": [0, y],
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
    }


def trigger_step(step_id: str) -> dict:
    return {
        "step_id": step_id,
        "step_position": [0, 0],
        "config_field_values": [{"config_field_id": "type", "value": FORM_TYPE}],
        "task_id": "shopify::admin::metaobject_created",
        "task_version": "0.1",
        "task_type": "TRIGGER",
        "description": None,
        "note": None,
        "name": None,
    }


def build_template_workflow() -> dict:
    """Clone Shopify's published Forms template patched_fields (import-safe)."""
    template = load_template()
    trigger_id = str(uuid.uuid4())
    cond_customer_id = str(uuid.uuid4())
    run_code_id = str(uuid.uuid4())
    cond_code_id = str(uuid.uuid4())
    cond_reused_id = str(uuid.uuid4())

    return {
        "__metadata": {"version": 0.1},
        "root": {
            "steps": [
                trigger_step(trigger_id),
                condition_step(
                    cond_customer_id,
                    120,
                    single_condition(
                        "metaobject.formSubmittedBy.id",
                        value_type="EnvironmentScalarDefinition:ID",
                        operator="not_empty_and_not_nil?",
                    ),
                ),
                run_code_step(run_code_id, 260),
                condition_step(
                    cond_code_id,
                    400,
                    single_condition(
                        "runCode.discountCode",
                        value_type="EnvironmentScalarDefinition:String",
                        operator="not_empty_and_not_nil?",
                    ),
                ),
                condition_step(
                    cond_reused_id,
                    540,
                    single_condition(
                        "runCode.reused",
                        value_type="EnvironmentScalarDefinition:String",
                        operator="==",
                        rhs_value="false",
                    ),
                ),
            ],
            "links": [
                {"from_step_id": trigger_id, "from_port_id": "output", "to_step_id": cond_customer_id, "to_port_id": "input"},
                {"from_step_id": cond_customer_id, "from_port_id": "true", "to_step_id": run_code_id, "to_port_id": "input"},
                {"from_step_id": run_code_id, "from_port_id": "output", "to_step_id": cond_code_id, "to_port_id": "input"},
                {"from_step_id": cond_code_id, "from_port_id": "true", "to_step_id": cond_reused_id, "to_port_id": "input"},
            ],
            "patched_fields": template["root"]["patched_fields"] + CUSTOMER_PATCHES,
            "workflow_name": "Redeem loyalty points",
        },
    }


def build_minimal_workflow() -> dict:
    """Mirror the deduct flow export shape (3 steps only)."""
    return {
        "__metadata": {"version": 0.1},
        "root": {
            "steps": [
                trigger_step("9f3fa5ad-69d6-4559-a583-a61dcc5c6084"),
                {
                    "step_id": "a6225e89-079f-4e72-b759-60bfe59f89c9",
                    "step_position": [0, 120],
                    "config_field_values": [
                        {
                            "config_field_id": "condition",
                            "value": json.dumps(DEDUCT_STYLE_CONDITION, separators=(",", ":")),
                        }
                    ],
                    "task_id": "shopify::flow::condition",
                    "task_version": "0.1",
                    "task_type": "CONDITION",
                    "description": None,
                    "note": None,
                    "name": None,
                },
                run_code_step("c5f93c43-9d0c-4ceb-a6d8-c3d7edb640d3", 260),
            ],
            "links": [
                {
                    "from_step_id": "9f3fa5ad-69d6-4559-a583-a61dcc5c6084",
                    "from_port_id": "output",
                    "to_step_id": "a6225e89-079f-4e72-b759-60bfe59f89c9",
                    "to_port_id": "input",
                },
                {
                    "from_step_id": "a6225e89-079f-4e72-b759-60bfe59f89c9",
                    "from_port_id": "true",
                    "to_step_id": "c5f93c43-9d0c-4ceb-a6d8-c3d7edb640d3",
                    "to_port_id": "input",
                },
            ],
            "patched_fields": CUSTOMER_PATCHES,
            "variables": [],
            "note": None,
            "vertical_layout_enabled": True,
            "workflow_name": "Redeem loyalty points",
        },
    }


def export_flow(path: Path, workflow: dict) -> None:
    body = json.dumps(workflow, separators=(",", ":"), ensure_ascii=True)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    path.write_text(f"{digest}:{body}", encoding="utf-8")


if __name__ == "__main__":
    base = Path(__file__).parent
    export_flow(base / "Redeem loyalty points.flow", build_template_workflow())
    export_flow(base / "Redeem loyalty points (minimal).flow", build_minimal_workflow())
    print(f"Wrote Redeem loyalty points.flow ({FORM_TYPE})")
    print("Wrote Redeem loyalty points (minimal).flow")
